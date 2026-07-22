// Reads the first 12 bytes of a File/Blob and checks them against known
// magic-byte signatures. This is the only reliable way to confirm a file's
// real type — the browser-reported file.type and the extension can both be
// trivially spoofed by renaming a file.
//
// Returns the confirmed MIME type, or null if the bytes don't match any
// allowed type.

const SIGNATURES = [
  // PNG — 8-byte signature
  { mime: 'image/png',  offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // JPEG — 3-byte SOI marker
  { mime: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  // WebP — 4 bytes at offset 8 ("WEBP"), after the RIFF header
  { mime: 'image/webp', offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  // GIF87a / GIF89a
  { mime: 'image/gif',  offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  // PDF
  { mime: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
  // OLE2 compound document (legacy .doc, .xls)
  { mime: 'application/msword', offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0] },
  // ZIP — DOCX / XLSX are ZIP archives (PK\x03\x04)
  { mime: 'application/zip', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
];

// Map confirmed 'application/zip' signatures back to their Office MIME type
// based on the declared MIME, since we can't distinguish DOCX from XLSX
// from magic bytes alone without parsing the ZIP entries.
const ZIP_OFFICE_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export async function validateFileMagicBytes(file, allowedMimes) {
  const headerSize = 12;
  const buffer = await file.slice(0, headerSize).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  for (const sig of SIGNATURES) {
    const end = sig.offset + sig.bytes.length;
    if (bytes.length < end) continue;

    const matches = sig.bytes.every((b, i) => bytes[sig.offset + i] === b);
    if (!matches) continue;

    // ZIP — accept if the declared MIME is one of the Office Open XML types
    if (sig.mime === 'application/zip') {
      const declared = file.type || '';
      if (ZIP_OFFICE_MIMES.has(declared) && allowedMimes.includes(declared)) {
        return declared;
      }
      return null;
    }

    // OLE2 — accept for legacy Word/Excel
    if (sig.mime === 'application/msword') {
      const declared = file.type || 'application/msword';
      const oleTypes = [
        'application/msword',
        'application/vnd.ms-excel',
      ];
      if (oleTypes.includes(declared) && allowedMimes.includes(declared)) {
        return declared;
      }
      // Still a valid OLE2 file — accept if any OLE type is allowed
      const firstAllowed = oleTypes.find((m) => allowedMimes.includes(m));
      return firstAllowed ?? null;
    }

    if (allowedMimes.includes(sig.mime)) return sig.mime;
    return null;
  }

  return null;
}
