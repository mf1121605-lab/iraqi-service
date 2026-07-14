create table if not exists public.stored_procedures (
  id uuid not null default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  created_at timestamp with time zone not null default now()
);

alter table if exists public.stored_procedures enable row level security;

create or replace function public.dispatch_push_notifications(dispatch_secret text)
returns table(count bigint) as $$
declare
  expected_secret text;
begin
  select value into expected_secret from public.app_config where key = 'push_dispatch_secret';
  if expected_secret is null or dispatch_secret != expected_secret then
    raise exception 'Invalid dispatch secret';
  end if;

  with pending as (
    select n.id
    from public.notifications n
    where n.is_read = false
    limit 100
  )
  delete from public.notifications where id in (select id from pending);

  return query select count(*) from pending;
end;
$$ language plpgsql security definer;
