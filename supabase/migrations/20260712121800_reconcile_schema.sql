-- This repo shipped two parallel, conflicting migration passes for the
-- same schema (a stray "init_" set and the real one the app code
-- targets). The stray set has been removed from this migrations folder.
-- This file repairs the two concrete gaps that were left in the
-- surviving schema, using only idempotent statements so it is safe to
-- run regardless of which of the two passes ended up live on the actual
-- database.

-- 1) Auth signup trigger: must read auth.users.raw_user_meta_data (the
--    real column) and insert into profiles' real columns
--    (phone/email/role). The stray set's version read a non-existent
--    "user_metadata" column and wrote to a "phone_number" column that
--    doesn't exist on the real profiles table, so if it ended up as the
--    live trigger, every signup (phone or OAuth) would fail.
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, email, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'phone',
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- 2) products / service_links: the founder Products & Banners admin
--    pages and the customer dashboard read/write bilingual Arabic/Kurdish
--    columns (title_ar/title_ckb/description_ar/description_ckb,
--    title_ar/title_ckb/subtitle_ar/subtitle_ckb) that were never added
--    to these two tables -- every create/read against them has been
--    failing. Add the columns and drop the old single-locale NOT NULL
--    constraint since the app never populates it.
alter table public.products add column if not exists title_ar text;
alter table public.products add column if not exists title_ckb text;
alter table public.products add column if not exists description_ar text;
alter table public.products add column if not exists description_ckb text;
update public.products set title_ar = title where title_ar is null;
alter table public.products alter column title drop not null;

alter table public.service_links add column if not exists title_ar text;
alter table public.service_links add column if not exists title_ckb text;
alter table public.service_links add column if not exists subtitle_ar text;
alter table public.service_links add column if not exists subtitle_ckb text;
update public.service_links set title_ar = title where title_ar is null;
alter table public.service_links alter column title drop not null;
