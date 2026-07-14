create table if not exists public.notifications (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles on delete cascade,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now()
);

alter table if exists public.notifications enable row level security;

grant select on table public.notifications to anon, authenticated;

create policy "Users can view their own notifications" on public.notifications
  for select
  using (user_id = auth.uid());
