-- 20260723120000_employee_verification.sql added profiles.is_verified but
-- missed two grants that only matter against a real database (not caught
-- by a local build/test since those never hit a real Postgres instance):
--
-- 1. profiles' SELECT privilege is an explicit column allowlist for the
--    `authenticated` role (see 20260718140000_restrict_recovery_hash_select.sql),
--    predating is_verified. Any client-side select() naming that column
--    (src/pages/founder/employees.js) was rejected outright by Postgres
--    with "permission denied for column is_verified".
-- 2. Dropping + recreating get_active_employee_candidates() (required
--    because its return columns changed) also drops its EXECUTE grant —
--    unlike CREATE OR REPLACE, a DROP+CREATE does not carry privileges
--    over, so customers calling this RPC during request matching would
--    get "permission denied for function get_active_employee_candidates".
revoke select on public.profiles from authenticated;
grant select (
  id, role, admin_level, account_status,
  phone, phone_verified, email,
  given_name, father_name, grandfather_name, family_name,
  avatar_key, specialization, active_services,
  created_at, updated_at, pinned_room_ids,
  username, recovery_question_id, is_verified
) on public.profiles to authenticated;

grant execute on function public.get_active_employee_candidates(text) to authenticated;
