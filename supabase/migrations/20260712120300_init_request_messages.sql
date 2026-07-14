create table if not exists public.request_messages (
  id uuid not null default gen_random_uuid() primary key,
  request_id uuid not null references public.requests on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  content text not null,
  attachment_path text,
  is_hidden boolean not null default false,
  hidden_reason text,
  created_at timestamp with time zone not null default now()
);

alter table if exists public.request_messages enable row level security;

grant select on table public.request_messages to anon, authenticated;
grant insert on table public.request_messages to authenticated;

create policy "Users can view messages for their requests" on public.request_messages
  for select
  using (
    exists (
      select 1 from public.requests r where r.id = request_id and (r.user_id = auth.uid() or r.assigned_to = auth.uid())
    ) or
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder'
    )
  );

create policy "Users can insert messages" on public.request_messages
  for insert
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.requests r where r.id = request_id and (r.user_id = auth.uid() or r.assigned_to = auth.uid())
    )
  );

create policy "Employees can hide messages" on public.request_messages
  for update
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'employee'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'employee'
    )
  );
