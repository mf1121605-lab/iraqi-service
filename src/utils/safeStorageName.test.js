import { safeExtension, safeSlug } from './safeStorageName';

describe('safeExtension', () => {
  it('lowercases a simple extension', () => {
    expect(safeExtension('photo.JPG')).toBe('.jpg');
  });

  it('uses only the final segment for a multi-dot filename', () => {
    expect(safeExtension('archive.tar.gz')).toBe('.gz');
  });

  it('returns an empty string when there is no extension', () => {
    expect(safeExtension('noextension')).toBe('');
  });

  it('returns an empty string for a trailing dot with nothing after it', () => {
    expect(safeExtension('trailing.')).toBe('');
  });
});

describe('safeSlug', () => {
  it('keeps a clean ASCII filename unchanged', () => {
    expect(safeSlug('report.pdf')).toBe('report.pdf');
  });

  it('collapses spaces and punctuation into single dashes', () => {
    expect(safeSlug('My Photo (1).png')).toBe('My-Photo-1.png');
  });

  it('falls back to "file" when the name is entirely non-ASCII (e.g. Arabic)', () => {
    // This is the exact case the module exists for — Supabase Storage
    // rejects non-ASCII object keys, and Arabic file names are the norm
    // for this app's users.
    expect(safeSlug('صورة العائلة.jpg')).toBe('file.jpg');
  });

  it('preserves a filename with no extension', () => {
    expect(safeSlug('report')).toBe('report');
  });

  it('strips a leading dash left over from the original name', () => {
    expect(safeSlug('-weird-.name.txt')).toBe('weird-.name.txt');
  });
});
