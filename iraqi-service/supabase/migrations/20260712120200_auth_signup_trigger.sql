-- Creates the matching profiles row whenever a new auth.users row appears.
-- Covers both paths:
--   * Customer self-registration (phone or Facebook OAuth) -> role defaults
--     to 'customer'.
--   * Founder-created employee accounts -> the admin API call passes
--     user_metadata: { role: 'employee', ... } via supabaseAdmin, so the
--     same trigger creates the row with the right role in one step.
create function public.handle_new_auth_user() returns trigger
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
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
