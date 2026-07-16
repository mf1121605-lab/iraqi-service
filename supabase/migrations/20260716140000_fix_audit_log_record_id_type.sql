-- founder_settings.id is smallint (a singleton row, always 1) — unlike
-- every other table the generic audit trigger covers (categories,
-- service_links, chat_rooms), which all use a uuid id. The trigger's
-- `coalesce(new.id, old.id)` assumed uuid-compatibility, so inserting
-- into audit_log.record_id (uuid) failed outright on that mismatch,
-- which meant every single save to founder_settings — the site
-- background, hero text, footer, announcement bar, and even the
-- original chat audio/background fields — has always failed at the
-- database level with "column record_id is of type uuid but expression
-- is of type smallint".
--
-- record_id is only ever displayed as a plain value in founder/audit-log.js,
-- never compared or joined as a uuid, so widening it to text is safe.
alter table public.audit_log alter column record_id type text using record_id::text;

create or replace function public.fn_audit_log_generic() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(new.id, old.id)::text,
    case when TG_OP = 'INSERT' then null else to_jsonb(old) end,
    case when TG_OP = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;
