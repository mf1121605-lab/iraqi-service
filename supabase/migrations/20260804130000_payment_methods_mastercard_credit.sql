-- Adds mastercard and credit (top-up card, "رصيد") as payment methods
-- alongside the existing zaincash/qi_card. Credit purchases carry a 40%
-- resale/cash-out commission — base_amount + commission_rate are kept
-- alongside the already-marked-up `amount` so the founder's payments
-- dashboard can show both the original price and what was actually
-- charged, instead of only a single opaque total.
ALTER TABLE public.request_payments
  DROP CONSTRAINT IF EXISTS request_payments_method_check;
ALTER TABLE public.request_payments
  ADD CONSTRAINT request_payments_method_check
  CHECK (method IN ('zaincash', 'qi_card', 'mastercard', 'credit'));

ALTER TABLE public.request_payments
  ADD COLUMN IF NOT EXISTS base_amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5, 2);
