-- Lets staff assign a news item to one of the platform's existing service
-- categories (the same ones managed at /founder/categories, already used
-- for requests.category) so the customer dashboard can group announcements
-- under the section the founder actually chose, instead of inventing a
-- separate "dashboard slot" concept.
alter table public.news_links add column if not exists category text references public.categories (key);
