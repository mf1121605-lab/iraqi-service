import { useRef } from 'react';

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_THRESHOLD_PX = 10;

// Fires `onTrigger` after a sustained touch (mobile) or immediately on
// right-click (desktop) — shared by every chat surface's unsend menu so the
// timer/threshold logic only lives in one place.
export function useLongPress(onTrigger) {
  const timerRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0 });

  function clear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function onTouchStart(event) {
    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
    clear();
    timerRef.current = setTimeout(onTrigger, LONG_PRESS_MS);
  }

  function onTouchMove(event) {
    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - startRef.current.x);
    const dy = Math.abs(touch.clientY - startRef.current.y);
    if (dx > MOVE_CANCEL_THRESHOLD_PX || dy > MOVE_CANCEL_THRESHOLD_PX) clear();
  }

  function onContextMenu(event) {
    event.preventDefault();
    onTrigger();
  }

  return { onTouchStart, onTouchEnd: clear, onTouchMove, onContextMenu };
}
