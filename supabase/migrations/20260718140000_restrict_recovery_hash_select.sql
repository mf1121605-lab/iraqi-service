-- recovery_answer_hash was selectable by any authenticated client (no
-- column-level SELECT restriction existed, only UPDATE had one) — since
-- profiles_select_staff_all lets every employee/co_admin read every
-- customer's row, this let staff bulk-read every customer's hashed
-- security answer. Recovery answers are typically low-entropy (a name),
-- so even bcrypt-hashed, broad read access is a real offline-cracking
-- exposure worth closing. Mirrors the existing UPDATE column-privilege
-- pattern in 20260712120800_rls_policies.sql.
revoke select on public.profiles from authenticated;
grant select (
  id, role, admin_level, account_status,
  phone, phone_verified, email,
  given_name, father_name, grandfather_name, family_name,
  avatar_key, specialization, active_services,
  created_at, updated_at, pinned_room_ids,
  username, recovery_question_id
) on public.profiles to authenticated;
