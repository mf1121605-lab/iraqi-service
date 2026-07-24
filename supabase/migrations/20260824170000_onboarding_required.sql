-- Add onboarding_complete flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Mark existing customers who already have avatar + name as onboarded
UPDATE public.profiles
SET onboarding_complete = true
WHERE role = 'customer'
  AND avatar_key IS NOT NULL
  AND given_name IS NOT NULL AND given_name <> '';

-- Employees and founders are always considered onboarded
UPDATE public.profiles
SET onboarding_complete = true
WHERE role IN ('employee', 'founder');
