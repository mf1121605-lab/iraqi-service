-- Extend request_messages.message_type to include 'payment_proposal'
ALTER TABLE public.request_messages
  DROP CONSTRAINT IF EXISTS request_messages_message_type_check;
ALTER TABLE public.request_messages
  ADD CONSTRAINT request_messages_message_type_check
  CHECK (message_type IN ('text', 'sticker', 'payment_proposal'));

-- New table for payment agreements logged by employees
CREATE TABLE public.request_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  method      text NOT NULL CHECK (method IN ('zaincash', 'qi_card')),
  amount      numeric(12, 2) NOT NULL CHECK (amount > 0),
  notes       text,
  logged_by   uuid NOT NULL REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX request_payments_created_at_idx ON public.request_payments(created_at DESC);
CREATE INDEX request_payments_request_id_idx ON public.request_payments(request_id);

ALTER TABLE public.request_payments ENABLE ROW LEVEL SECURITY;

-- Employees can insert payments they log
CREATE POLICY request_payments_insert_employee ON public.request_payments
  FOR INSERT TO authenticated
  WITH CHECK (logged_by = auth.uid());

-- Founder/co_admin see all payments
CREATE POLICY request_payments_select_staff ON public.request_payments
  FOR SELECT TO authenticated
  USING (public.is_founder() OR public.is_co_admin());

-- Employees see their own logged payments
CREATE POLICY request_payments_select_employee ON public.request_payments
  FOR SELECT TO authenticated
  USING (logged_by = auth.uid());
