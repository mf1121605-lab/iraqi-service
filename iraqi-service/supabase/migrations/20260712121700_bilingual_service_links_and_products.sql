-- service_links and products were the only founder-authored-content tables
-- still holding a single language of text (unlike categories/chat_rooms,
-- which already split "_ar"/"_ckb") — so switching the UI to Kurdish never
-- translated banners or deals. Bring them in line with that same pattern.
alter table public.service_links
  add column title_ar text,
  add column title_ckb text,
  add column subtitle_ar text,
  add column subtitle_ckb text;

update public.service_links set title_ar = title, subtitle_ar = subtitle;

alter table public.service_links
  alter column title_ar set not null,
  drop column title,
  drop column subtitle;

alter table public.products
  add column title_ar text,
  add column title_ckb text,
  add column description_ar text,
  add column description_ckb text;

update public.products set title_ar = title, description_ar = description;

alter table public.products
  alter column title_ar set not null,
  drop column title,
  drop column description;
