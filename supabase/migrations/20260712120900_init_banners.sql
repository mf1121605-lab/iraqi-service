create table if not exists public.banners (
  id uuid not null default gen_random_uuid() primary key,
  title_ar text not null,
  title_ckb text not null,
  subtitle_ar text,
  subtitle_ckb text,
  url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table if exists public.banners enable row level security;

grant select on table public.banners to anon, authenticated;

create policy "Anyone can view active banners" on public.banners
  for select
  using (is_active = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'employee' or p.role = 'founder')
  ));
