create function public.handle_new_auth_user() returns trigger as $$
begin
  insert into public.profiles (id, role, admin_level, phone_number, email)
  values (
    new.id,
    coalesce(new.user_metadata ->> 'role', 'customer'),
    'none',
    new.phone,
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

if not exists (
  select 1 from information_schema.triggers where trigger_name = 'on_auth_user_created'
) then
  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();
end if;
