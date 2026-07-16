-- Founder-editable site branding/content, driving the public site instead
-- of hardcoded copy/colors: background image or solid color, hero title,
-- footer contact + legal text, and an optional announcement bar. All live
-- on the existing founder_settings singleton row so they share its
-- public-read / founder-write RLS and audit trigger.
alter table public.founder_settings add column if not exists background_image_path text;
alter table public.founder_settings add column if not exists background_color text;
alter table public.founder_settings add column if not exists hero_title_ar text;
alter table public.founder_settings add column if not exists hero_title_ckb text;
alter table public.founder_settings add column if not exists hero_subtitle_ar text;
alter table public.founder_settings add column if not exists hero_subtitle_ckb text;
alter table public.founder_settings add column if not exists footer_phone text;
alter table public.founder_settings add column if not exists footer_email text;
alter table public.founder_settings add column if not exists footer_legal_ar text;
alter table public.founder_settings add column if not exists footer_legal_ckb text;
alter table public.founder_settings add column if not exists footer_facebook_url text;
alter table public.founder_settings add column if not exists footer_instagram_url text;
alter table public.founder_settings add column if not exists footer_twitter_url text;
alter table public.founder_settings add column if not exists announcement_enabled boolean not null default false;
alter table public.founder_settings add column if not exists announcement_text_ar text;
alter table public.founder_settings add column if not exists announcement_text_ckb text;

-- Custom per-category icon image, shown instead of the built-in 3D badge
-- shape once the founder uploads one.
alter table public.categories add column if not exists icon_path text;

-- Public bucket for site branding assets the founder uploads through the
-- admin dashboard (backgrounds, category icons, banner/product images) --
-- distinct from the private 'attachments' bucket used for chat/request
-- files, since these need to be readable by anonymous visitors on the
-- public landing page.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists site_assets_select_public on storage.objects;
create policy site_assets_select_public
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-assets');

drop policy if exists site_assets_write_founder on storage.objects;
create policy site_assets_write_founder
  on storage.objects for all
  to authenticated
  using (bucket_id = 'site-assets' and (public.is_founder() or public.is_co_admin()))
  with check (bucket_id = 'site-assets' and (public.is_founder() or public.is_co_admin()));
