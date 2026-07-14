create table if not exists public.categories (
  key text not null primary key,
  label_ar text not null,
  label_ckb text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table if exists public.categories enable row level security;

grant select on table public.categories to anon, authenticated;

create policy "Anyone can view active categories" on public.categories
  for select
  using (is_active = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'employee' or p.role = 'founder')
  ));
