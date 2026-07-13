create table public.requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  category service_category not null,
  title text not null,
  description text,
  status request_status not null default 'submitted',
  assigned_employee_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index requests_customer_idx on public.requests (customer_id);
create index requests_assigned_employee_idx on public.requests (assigned_employee_id);
create index requests_category_status_idx on public.requests (category, status);

create trigger trg_requests_updated_at
before update on public.requests
for each row execute function public.set_updated_at();

create table public.request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  file_path text not null,
  file_type text not null,
  file_size_bytes int not null,
  created_at timestamptz not null default now(),
  constraint request_documents_file_type check (file_type in ('pdf', 'png', 'jpg', 'jpeg')),
  constraint request_documents_max_size check (file_size_bytes <= 5 * 1024 * 1024)
);

create index request_documents_request_idx on public.request_documents (request_id);

create table public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text,
  attachment_url text,
  created_at timestamptz not null default now(),
  constraint request_messages_body_or_attachment check (body is not null or attachment_url is not null)
);

create index request_messages_request_created_idx on public.request_messages (request_id, created_at);

create table public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  old_status request_status,
  new_status request_status not null,
  changed_by uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create index request_status_history_request_idx on public.request_status_history (request_id, created_at);

-- Auto-logs every status change (cannot be bypassed, see the RLS migration:
-- no INSERT policy exists on request_status_history at all) and notifies
-- the customer. `changed_by` comes from auth.uid(), never a client-supplied
-- value, so it can't be spoofed.
create function public.fn_log_request_status_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and new.status is distinct from old.status then
    insert into public.request_status_history (request_id, old_status, new_status, changed_by, note)
    values (
      new.id,
      old.status,
      new.status,
      auth.uid(),
      nullif(current_setting('app.status_change_note', true), '')
    );

    insert into public.notifications (user_id, title, body, link)
    values (
      new.customer_id,
      'تحديث حالة الطلب',
      'تم تغيير حالة طلبك إلى: ' || new.status,
      '/customer/requests/' || new.id
    );
  end if;
  return new;
end;
$$;

create trigger trg_request_status_history
after update on public.requests
for each row execute function public.fn_log_request_status_change();

-- The app calls this single RPC to change status with an optional note,
-- rather than a raw table UPDATE. This matters, not just convenience: the
-- note is passed via a transaction-local GUC that the trigger above reads,
-- and set_config(..., true) only lives for the current transaction. A
-- separate "set the note" call followed by a separate "update the status"
-- call would be two different PostgREST requests (two different
-- transactions), so the note would already be gone by the time the
-- trigger fired. Folding both into one PL/pgSQL function call keeps them
-- in the same transaction. SECURITY INVOKER (the default) means the
-- UPDATE still runs as the calling user, so requests_update_staff RLS is
-- fully enforced — an unauthorized caller gets 0 rows updated, not a
-- bypass.
create function public.set_request_status(
  p_request_id uuid,
  p_new_status request_status,
  p_note text default null
) returns public.requests
language plpgsql as $$
declare
  v_result public.requests;
begin
  perform set_config('app.status_change_note', coalesce(p_note, ''), true);

  update public.requests
  set status = p_new_status
  where id = p_request_id
  returning * into v_result;

  if v_result.id is null then
    raise exception 'request not found or not permitted';
  end if;

  return v_result;
end;
$$;

-- Notifies the other participant whenever a message is sent on a request.
create function public.fn_notify_new_request_message() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_employee_id uuid;
begin
  select customer_id, assigned_employee_id into v_customer_id, v_employee_id
  from public.requests where id = new.request_id;

  if new.sender_id = v_customer_id then
    if v_employee_id is not null then
      insert into public.notifications (user_id, title, body, link)
      values (v_employee_id, 'رسالة جديدة من المواطن', left(coalesce(new.body, 'مرفق'), 140), '/employee/requests/' || new.request_id);
    end if;
  else
    insert into public.notifications (user_id, title, body, link)
    values (v_customer_id, 'رد جديد من الموظف', left(coalesce(new.body, 'مرفق'), 140), '/customer/requests/' || new.request_id);
  end if;

  return new;
end;
$$;

create trigger trg_notify_new_request_message
after insert on public.request_messages
for each row execute function public.fn_notify_new_request_message();
