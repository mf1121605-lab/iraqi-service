-- Grant customers permission to update onboarding_complete on their own profile.
-- The column was added in 20260824170000_onboarding_required.sql but was not
-- included in the column-level UPDATE grant in 20260712120800_rls_policies.sql.
GRANT UPDATE (onboarding_complete) ON public.profiles TO authenticated;
