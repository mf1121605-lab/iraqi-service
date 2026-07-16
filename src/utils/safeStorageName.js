// Supabase Storage rejects non-ASCII characters in the object key itself
// ("Invalid key") — and Arabic/Kurdish file names are the norm for this
// app's users, not an edge case (see the chat attachment upload fix).
// Shared here so every upload path (chat attachments, Media Studio) gets
// the same treatment instead of re-solving it per call site.
export function safeExtension(fileName) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return match ? `.${match[1].toLowerCase()}` : '';
}

export function safeSlug(fileName) {
  const ext = safeExtension(fileName);
  const base = fileName.slice(0, fileName.length - ext.length);
  const asciiBase = base
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${asciiBase || 'file'}${ext}`;
}
