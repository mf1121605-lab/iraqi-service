create table if not exists public.push_subscriptions (
  endpoint text not null primary key,
  user_id uuid not null references public.profiles on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone not null default now()
);

alter table if exists public.push_subscriptions enable row level security;

creat policy "Users can view their own subscriptions" on public.push_subscriptions
  for select
  using (user_id = auth.uid());
