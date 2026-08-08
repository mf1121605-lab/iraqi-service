-- Chat "file" attachments: lets the document-picker button (📎) send PDFs,
-- Word/Excel/PowerPoint documents and ZIP archives as a message, the same
-- way an image or voice note already works.

alter table public.chat_messages drop constraint if exists chat_messages_message_type_check;
alter table public.chat_messages add constraint chat_messages_message_type_check
  check (message_type in ('text', 'sticker', 'image', 'voice', 'video', 'order_alert', 'file'));

alter table public.request_messages drop constraint if exists request_messages_message_type_check;
alter table public.request_messages add constraint request_messages_message_type_check
  check (message_type in ('text', 'sticker', 'payment_proposal', 'image', 'voice', 'video', 'file'));

alter table public.direct_messages drop constraint if exists direct_messages_message_type_check;
alter table public.direct_messages add constraint direct_messages_message_type_check
  check (message_type in ('text', 'sticker', 'image', 'voice', 'video', 'file'));

-- All 4 chat screens upload every attachment (image/voice/video) through the
-- 'site-assets' bucket — widen its allowlist rather than introduce a second
-- bucket/pathway the mobile client has never used for chat.
update storage.buckets
set allowed_mime_types = array[
  'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/m4a', 'audio/x-m4a', 'audio/aac',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed'
]
where id = 'site-assets';

notify pgrst, 'reload schema';
