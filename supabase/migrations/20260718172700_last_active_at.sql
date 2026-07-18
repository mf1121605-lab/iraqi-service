-- Lightweight presence tracking for the founder's "بيانات المستخدمين"
-- online/offline badge. Deliberately NOT added to the authenticated
-- role's SELECT or UPDATE grants — only src/pages/api/auth/heartbeat.js
-- (service role, after verifying the caller's own session token) ever
-- writes it, so a user can never self-report a fake activity time, and
-- it's only ever read by the founder's own service-role API route.
alter table public.profiles add column last_active_at timestamptz;
