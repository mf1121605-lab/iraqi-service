alter table public.orders add column payment_method text;
alter table public.orders add constraint orders_payment_method_valid
  check (payment_method is null or payment_method in ('zaincash', 'rafidain_mastercard'));
alter table public.orders add column paid_at timestamptz;

-- Full audit trail per payment attempt, separate from orders.payment_status
-- (which only reflects the *current* state) — same "append-only history
-- next to current state" pattern already used for
-- requests/request_status_history.
create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  provider text not null check (provider in ('zaincash', 'rafidain_mastercard')),
  provider_transaction_id text,
  status text not null check (status in ('initiated', 'success', 'failed', 'cancelled')),
  amount numeric(12, 2) not null,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index payment_transactions_order_idx on public.payment_transactions (order_id);
-- Enforces idempotency at the database level: a given gateway transaction
-- id can only ever be recorded once per provider, so a retried/duplicated
-- webhook call can't double-process a payment even if the API route's own
-- idempotency check were ever bypassed or buggy.
create unique index payment_transactions_provider_txn_idx
  on public.payment_transactions (provider, provider_transaction_id)
  where provider_transaction_id is not null;

alter table public.payment_transactions enable row level security;

create policy payment_transactions_select_participants
  on public.payment_transactions for select
  to authenticated
  using (
    public.is_founder()
    or public.is_co_admin()
    or exists (
      select 1 from public.orders o
      where o.id = payment_transactions.order_id and o.customer_id = auth.uid()
    )
  );

-- No insert/update/delete policy for any client role: every row here is
-- written by the payment API routes using the service-role key (they must
-- recompute the charge amount from the order server-side and independently
-- verify the gateway's signature/response — never trust a client-supplied
-- amount or a client's claim that a payment succeeded).
