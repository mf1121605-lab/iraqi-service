/** MIME types accepted by the chat 📎 document-picker button — kept in sync
 *  with the 'site-assets' storage bucket's allowed_mime_types allowlist
 *  (see supabase/migrations/20260902120000_chat_file_attachments.sql). */
export const CHAT_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
];
