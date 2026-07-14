create table if not exists public.chat_rooms (
  id uuid not null default gen_random_uuid() primary key,
  name_ar text not null,
  name_ckb text not null,
  description_ar text,
  description_ckb text,
  is_public boolean not null default true,
  created_by uuid not null references public.profiles on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table if exists public.chat_rooms enable row level security;

grant select on table public.chat_rooms to anon, authenticated;

create policy "Anyone can view public chat rooms" on public.chat_rooms
  for select
  using (is_public = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'employee' or p.role = 'founder')
  ));
