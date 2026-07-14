create function public.log_audit() returns trigger as $$
begin
  insert into public.audit_log (actor_id, action, table_name, record_id, old_values, new_values)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    case
      when tg_op = 'DELETE' then old.id::text
      when tg_op = 'UPDATE' then new.id::text
      else new.id::text
    end,
    case when tg_op = 'DELETE' or tg_op = 'UPDATE' then row_to_json(old) else null end,
    case when tg_op = 'INSERT' or tg_op = 'UPDATE' then row_to_json(new) else null end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$ language plpgsql security definer;

if not exists (
  select 1 from information_schema.triggers where trigger_name = 'audit_categories_changes'
) then
  create trigger audit_categories_changes
  after insert or update or delete on public.categories
  for each row execute procedure public.log_audit();
end if;

if not exists (
  select 1 from information_schema.triggers where trigger_name = 'audit_profiles_changes'
) then
  create trigger audit_profiles_changes
  after insert or update or delete on public.profiles
  for each row execute procedure public.log_audit();
end if;

if not exists (
  select 1 from information_schema.triggers where trigger_name = 'audit_requests_changes'
) then
  create trigger audit_requests_changes
  after insert or update or delete on public.requests
  for each row execute procedure public.log_audit();
end if;
