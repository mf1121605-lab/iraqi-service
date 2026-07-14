create table if not exists public.audit_log (
  id uuid not null default gen_random_uuid() primary key,
  actor_id uuid references public.profiles on delete set null,
  action text not null,
  table_name text not null,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone not null default now()
);

alter table if exists public.audit_log enable row level security;

grant select on table public.audit_log to authenticated;

create policy "Founders can view audit log" on public.audit_log
  for select
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder'
    )
  );
