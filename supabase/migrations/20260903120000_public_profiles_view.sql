-- Fixes a real gap: news-feed post/comment authors and follower/following
-- lists silently showed "مجهول" (or in PublicProfileView's case, spun
-- forever) for any authenticated user viewing someone OTHER than
-- themselves — profiles RLS only ever allowed self / staff / your-own-
-- assigned-employee to see a row, so a plain customer viewing another
-- customer's post got author: null every time.
--
-- Fix: a narrow, safe "public directory" view — NOT a widened RLS policy
-- on public.profiles itself. profiles' existing self/staff/assigned-
-- employee policies, and its unrestricted-but-row-gated column grants,
-- are left completely untouched — nothing about phone/email/
-- specialization/account_status visibility changes for any existing flow
-- (registration, login, employee matching, founder panels, etc).
--
-- This view is owned by the migration role and carries no RLS of its own
-- (a plain view runs with its owner's privileges by default, bypassing
-- the base table's RLS) — that bypass is deliberate and safe here purely
-- because the view's own column list is the actual boundary: it only
-- ever selects the columns below, so nothing else is reachable through
-- it no matter who queries it.
create or replace view public.public_profiles as
select id, given_name, family_name, avatar_key, bio, role, admin_level, is_verified
from public.profiles;

grant select on public.public_profiles to authenticated;

notify pgrst, 'reload schema';
