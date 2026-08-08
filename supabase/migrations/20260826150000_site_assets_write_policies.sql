-- site-assets only ever got 4 narrow INSERT policies: founder/co_admin
-- (blanket), a user's own avatars/{uid}/ folder, a room moderator's
-- chat-audio/{room_id}/ folder, and staff posting to news-media/. Every
-- other upload path used across the mobile app was never covered by any
-- policy at all, so those uploads have always failed RLS silently
-- (uploadAttachment()/uploadMedia() helpers swallow the error and return
-- null, so nothing ever visibly errors — the image/video/voice note just
-- never appears):
--   chat/{userId}/...      — group chat, DMs, employee chat, request chat
--                             image + voice attachments
--   community/{userId}/... — community room attachments
--   social/{userId}/...    — news feed post images/video + comment images
--                             (social/{userId}/comments/... included, since
--                             only the first two path segments are checked)
-- All three mirror the already-working avatars/{uid}/ pattern: scoped to
-- the uploader's own user-id subfolder, nothing broader.
create policy site_assets_write_own_chat
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'site-assets'
    and (storage.foldername(name))[1] = 'chat'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy site_assets_write_own_community
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'site-assets'
    and (storage.foldername(name))[1] = 'community'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy site_assets_write_own_social
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'site-assets'
    and (storage.foldername(name))[1] = 'social'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
