-- Media attachments (image or video) for a news_links row.
alter table public.news_links add column if not exists image_url text;
alter table public.news_links add column if not exists video_url text;

-- Rename requirements -> requirements_ar for bilingual naming consistency
-- with title_ar/title_ckb, then add its Kurdish counterpart and a distinct
-- "required documents" checklist field (separate from eligibility
-- requirements — Iraqi bureaucracy treats these as two different things).
alter table public.news_links rename column requirements to requirements_ar;
alter table public.news_links add column if not exists requirements_ckb text;
alter table public.news_links add column if not exists required_documents text;

-- Any staff member (not just founder/co-admin) can post a news item, so
-- any staff member needs to be able to upload its media too — mirrors the
-- existing room-moderator path-scoped insert policy on this same bucket.
create policy site_assets_write_news_media
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'site-assets'
    and (storage.foldername(name))[1] = 'news-media'
    and (public.is_staff() or public.is_co_admin())
  );
