-- The site-assets bucket's allowed_mime_types allowlist (set by
-- 20260716160000) only covered web-recorded audio/video formats
-- (audio/mpeg, video/mp4, video/webm). Mobile actually uploads
-- audio/m4a voice notes (expo-av HIGH_QUALITY preset) and, on iOS,
-- video/quicktime (.mov) picked from the library or camera roll —
-- neither was in the allowlist, so Postgres storage silently rejected
-- every such upload at the bucket-constraint level regardless of any
-- client-side try/catch.
update storage.buckets
set allowed_mime_types = array[
  'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/m4a', 'audio/x-m4a', 'audio/aac'
]
where id = 'site-assets';
