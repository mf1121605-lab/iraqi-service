-- Voice messages reuse the existing private "attachments" bucket/paths —
-- only the bucket-level MIME allowlist needs widening (a hard storage
-- constraint, not just client-side validation) to accept whatever format
-- the browser's MediaRecorder produces. Chrome/Firefox default to
-- audio/webm, Safari/iOS to audio/mp4 — allow both plus common fallbacks.
update storage.buckets
set allowed_mime_types = array[
  'image/png', 'image/jpeg', 'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac'
]
where id = 'attachments';
