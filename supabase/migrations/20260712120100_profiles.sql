-- profiles.id mirrors auth.users.id 1:1 (standard Supabase pattern).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'customer',
  -- 'founder' | 'co_admin' | null. Kept as text (not an enum) so a future
  -- admin tier can be added without an ALTER TYPE migration.
  admin_level text,
  account_status account_status not null default 'active',

  -- Critical '077' fix: phone is validated for *shape* only (any Iraqi 07x
  -- mobile), never used to infer or restrict role. Role is decided solely
  -- by the `role` column above, checked via RLS/functions, never by prefix.
  phone text unique,
  phone_verified boolean not null default false,
  email text unique,

  -- Iraqi four-part name (الاسم الرباعي), shown in full on the employee
  -- profile card.
  given_name text,
  father_name text,
  grandfather_name text,
  family_name text,

  avatar_key text,
  specialization text,
  active_services service_category[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_phone_format check (phone is null or phone ~ '^07[0-9]{9}$'),
  constraint profiles_admin_level_valid check (admin_level is null or admin_level in ('founder', 'co_admin'))
);

create index profiles_role_idx on public.profiles (role);
create index profiles_phone_idx on public.profiles (phone);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
