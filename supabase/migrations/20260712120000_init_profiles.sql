create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  created_at timestamp with time zone not null default now(),
  role text not null default 'customer'::text check (role = any(array['founder'::text, 'employee'::text, 'customer'::text])),
  admin_level text not null default 'none'::text check (admin_level = any(array['none'::text, 'co_admin'::text])),
  given_name text,
  father_name text,
  grandfather_name text,
  family_name text,
  avatar_key text check (avatar_key = any(array['avatar-male-1'::text, 'avatar-male-2'::text, 'avatar-male-3'::text, 'avatar-female-1'::text, 'avatar-female-2'::text, 'avatar-female-3'::text])),
  phone_number text,
  email text,
  specialization text,
  updated_at timestamp with time zone not null default now()
);

alter table if exists public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from information_schema.role_table_grants where grantee = 'anon' and table_name = 'profiles'
  ) then
    grant select (id, given_name, father_name, grandfather_name, family_name, avatar_key) on table public.profiles to anon, authenticated;
    grant select on table public.profiles to anon, authenticated;
  end if;
end
$$;

create policy "Customers can view their own profile" on public.profiles
  for select
  using (auth.uid() = id);

create policy "Employees and founders can view all profiles" on public.profiles
  for select
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'employee' or p.role = 'founder')
    )
  );

create policy "Users can update their own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
