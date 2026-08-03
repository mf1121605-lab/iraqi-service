import { createContext, useContext, useEffect, useState } from 'react';

// CinematicFrame is rendered once, globally, in the root layout — it has
// no idea whether the screen currently on top has its own bottom tab bar
// (only the customer group's Tabs navigator does). Screens that do can
// call useReserveFrameBottomInset(height) so the frame's bottom edge
// stops above the tab bar instead of drawing through it.
const FrameInsetContext = createContext<{
  bottomInset: number;
  setBottomInset: (v: number) => void;
}>({ bottomInset: 0, setBottomInset: () => {} });

export function FrameInsetProvider({ children }: { children: React.ReactNode }) {
  const [bottomInset, setBottomInset] = useState(0);
  return (
    <FrameInsetContext.Provider value={{ bottomInset, setBottomInset }}>
      {children}
    </FrameInsetContext.Provider>
  );
}

export function useFrameBottomInset(): number {
  return useContext(FrameInsetContext).bottomInset;
}

// Call from a screen/layout that has its own bottom tab bar. Reserves
// `height` while mounted, clears back to 0 on unmount.
export function useReserveFrameBottomInset(height: number) {
  const { setBottomInset } = useContext(FrameInsetContext);
  useEffect(() => {
    setBottomInset(height);
    return () => setBottomInset(0);
  }, [height, setBottomInset]);
}
