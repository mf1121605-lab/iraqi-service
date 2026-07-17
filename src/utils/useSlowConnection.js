import { useEffect, useState } from 'react';

// Chrome's effectiveType estimate ('slow-2g'/'2g'/'3g'/'4g') was tried
// here first and dropped entirely — real-world testing showed it
// reporting non-'4g' values on ordinary, fast connections often enough to
// hide video that should have played fine, which is worse than never
// auto-hiding at all. saveData is a different kind of signal: it's not a
// guess, it's the user explicitly turning on "Data Saver"/"Lite mode" in
// their own browser, so it's the only thing this reacts to now.
//
// The Network Information API is also Chromium-only (no Safari/Firefox
// support), so this degrades to "not slow" everywhere it's unavailable —
// a false negative there just means no auto-fallback, never a broken
// false positive.
export function useSlowConnection() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const connection =
      typeof navigator !== 'undefined' && (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
    if (!connection) return undefined;

    function update() {
      setSlow(Boolean(connection.saveData));
    }
    update();
    connection.addEventListener('change', update);
    return () => connection.removeEventListener('change', update);
  }, []);

  return slow;
}
