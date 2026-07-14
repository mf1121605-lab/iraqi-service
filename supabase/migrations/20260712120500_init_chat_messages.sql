create table if not exists public.chat_messages (
  id uuid not null default gen_random_uuid() primary key,
  room_id uuid not null references public.chat_rooms on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  content text not null,
  attachment_path text,
  is_hidden boolean not null default false,
  created_at timestamp with time zone not null default now()
);

alter table if exists public.chat_messages enable row level security;

grant select on table public.chat_messages to anon, authenticated;
grant insert on table public.chat_messages to authenticated;

create policy "Users can view messages in public rooms" on public.chat_messages
  for select
  using (
    exists (
      select 1 from public.chat_rooms r where r.id = room_id and r.is_public = true
    ) or
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'employee' or p.role = 'founder')
    )
  );

create policy "Users can insert messages" on public.chat_messages
  for insert
  with check (sender_id = auth.uid());

create policy "Employees can hide messages" on public.chat_messages
  for update
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'employee' or p.role = 'founder')
    )
  );
