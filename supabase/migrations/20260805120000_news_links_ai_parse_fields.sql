-- Structured fields for the AI announcement-parsing admin tool. `provider`
-- (responsible ministry/authority) already maps onto the existing `source`
-- column, so only these two are genuinely new.
alter table public.news_links add column if not exists deadline text;
alter table public.news_links add column if not exists requirements text;
