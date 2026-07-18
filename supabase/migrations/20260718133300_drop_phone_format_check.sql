-- Customer identity moves off native phone auth to a username→internal-email
-- alias; phone becomes plain, unvalidated display metadata, so the strict
-- Iraqi-format check no longer applies to it.
alter table public.profiles drop constraint profiles_phone_format;
