import { useRef, useState } from 'react';

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_THRESHOLD_PX = 10;

// Returns `isPressing` so callers can animate the element while the user is
// holding — fires `onTrigger` after the full press, then clears the state.
export function useLongPress(onTrigger) {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0 });

  function clear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  }

  function onTouchStart(event) {
    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
    clear();
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      setIsPressing(false);
      onTrigger();
    }, LONG_PRESS_MS);
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

  return { onTouchStart, onTouchEnd: clear, onTouchMove, onContextMenu, isPressing };
}
