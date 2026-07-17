import { useEffect, useState } from 'react';

const SLOW_EFFECTIVE_TYPES = ['slow-2g', '2g', '3g'];

// The Network Information API is Chromium-only (no Safari/Firefox support),
// so this degrades to "not slow" everywhere it's unavailable — a false
// negative there just means no auto-fallback, never a broken false positive.
export function useSlowConnection() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const connection =
      typeof navigator !== 'undefined' && (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
    if (!connection) return undefined;

    function update() {
      setSlow(Boolean(connection.saveData) || SLOW_EFFECTIVE_TYPES.includes(connection.effectiveType));
    }
    update();
    connection.addEventListener('change', update);
    return () => connection.removeEventListener('change', update);
  }, []);

  return slow;
}
