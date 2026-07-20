-- SLA lazy-expiry: no cron/background worker exists on this hosting, so
-- instead of a continuously-running timer, a claim's SLA is only ever
-- checked at the moment someone actually reads the queue/request
-- (employee dashboard queue load, customer request/matching page load) —
-- see expire_stale_claims() below, called from those pages.
alter table public.requests add column claimed_at timestamptz;

create function public.fn_set_claimed_at() returns trigger
language plpgsql as $$
begin
  if new.assigned_employee_id is not null and old.assigned_employee_id is null then
    new.claimed_at = now();
  elsif new.assigned_employee_id is null then
    new.claimed_at = null;
  end if;
  return new;
end;
$$;

create trigger trg_set_claimed_at
before update of assigned_employee_id on public.requests
for each row execute function public.fn_set_claimed_at();

-- Frees a claim if the assigned employee hasn't sent an actual chat
-- message within 3 minutes of claiming. Security definer because the
-- caller (any signed-in employee/customer, via the pages that call this)
-- has no RLS path to update a request claimed by someone else.
create function public.expire_stale_claims() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.requests r
  set assigned_employee_id = null, status = 'submitted'
  where r.assigned_employee_id is not null
    and r.claimed_at < now() - interval '3 minutes'
    and not exists (
      select 1 from public.request_messages m
      where m.request_id = r.id and m.sender_id = r.assigned_employee_id
    );
end;
$$;

grant execute on function public.expire_stale_claims() to authenticated;
