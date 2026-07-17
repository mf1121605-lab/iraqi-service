import { useEffect, useState } from 'react';

// '3g' is deliberately excluded: Chrome's effectiveType estimate weighs
// round-trip latency heavily, and ordinary 4G/LTE connections (higher
// latency than WiFi even with plenty of bandwidth) commonly get
// classified as '3g' — treating that as "slow" was hiding video for a
// lot of genuinely fine connections. These clips are short (≤15s) and
// small; only the connections actually too weak to load them at all
// should skip video.
const SLOW_EFFECTIVE_TYPES = ['slow-2g', '2g'];

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
