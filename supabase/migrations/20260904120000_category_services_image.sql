-- Service-level images: category_services already has label_ar/label_ckb/
-- description/is_active/sort_order but no image column at all — the
-- founder could only attach media at the category level, never per
-- individual service.
alter table public.category_services add column if not exists image_url text;

notify pgrst, 'reload schema';
