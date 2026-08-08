-- Third-level interactive fields only supported 6 text-based types
-- (text/textarea/number/select/checkbox/date) — the founder wants to be
-- able to require a photo upload as one of those sub-fields (e.g. "ارفق
-- صورة الهوية"), which needs a new field_type the request form can render
-- as an image picker instead of a text input.
alter table public.service_dynamic_fields drop constraint if exists service_dynamic_fields_field_type_check;
alter table public.service_dynamic_fields add constraint service_dynamic_fields_field_type_check
  check (field_type in ('text', 'textarea', 'number', 'select', 'checkbox', 'date', 'image'));

notify pgrst, 'reload schema';
