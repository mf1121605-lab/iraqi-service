-- Append-only audit trail. No INSERT/UPDATE/DELETE policy is ever granted
-- to any client role (see the RLS migration) — the only writer is this
-- SECURITY DEFINER trigger function, so a sensitive change cannot be made
-- without being logged, and the log cannot be edited or deleted even by
-- the founder from the UI.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null, -- 'insert' | 'update' | 'delete'
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_table_record_idx on public.audit_log (table_name, record_id);

-- Generic logger reusable across founder_settings, service_links, and
-- chat_rooms, where every write is already founder/co_admin-only per RLS,
-- so every row here is inherently a "sensitive" change.
create function public.fn_audit_log_generic() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case when TG_OP = 'INSERT' then null else to_jsonb(old) end,
    case when TG_OP = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- profiles gets its own, narrower trigger: most profile edits (avatar,
-- specialization) are routine self-service, not "sensitive". Only log
-- role/account_status/admin_level changes and new employee accounts.
create function public.fn_audit_log_profile_sensitive() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' and new.role <> 'customer' then
    insert into public.audit_log (actor_id, action, table_name, record_id, new_data)
    values (auth.uid(), 'insert', 'profiles', new.id, to_jsonb(new));
  elsif TG_OP = 'UPDATE' and (
    old.role is distinct from new.role
    or old.account_status is distinct from new.account_status
    or old.admin_level is distinct from new.admin_level
  ) then
    insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    values (auth.uid(), 'update', 'profiles', new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger trg_audit_profiles
after insert or update on public.profiles
for each row execute function public.fn_audit_log_profile_sensitive();
