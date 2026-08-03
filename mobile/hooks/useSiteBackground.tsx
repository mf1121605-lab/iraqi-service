import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SiteBackground {
  imageUrl: string | null;
  color: string | null;
  particlesEnabled: boolean;
}

const SiteBackgroundContext = createContext<SiteBackground>({
  imageUrl: null,
  color: null,
  particlesEnabled: true,
});

// Fetched once at the root (not per-screen) and realtime-subscribed, then
// read by every ScreenBg via context — matches the web's SiteBackground:
// a founder-uploaded image/color sits as a dim layer above the app's
// default gradient, and the particle effect is a separate layer on top
// of that, independent of whichever background is active.
export function SiteBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [bg, setBg] = useState<SiteBackground>({ imageUrl: null, color: null, particlesEnabled: true });

  useEffect(() => {
    function apply(row: { background_image_path?: string | null; background_color?: string | null; particles_enabled?: boolean | null }) {
      setBg({
        imageUrl: row.background_image_path || null,
        color: row.background_color || null,
        particlesEnabled: row.particles_enabled ?? true,
      });
    }

    supabase
      .from('founder_settings')
      .select('background_image_path, background_color, particles_enabled')
      .eq('id', 1)
      .single()
      .then(({ data }) => { if (data) apply(data); });

    const channel = supabase
      .channel('site-background-settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'founder_settings' }, (payload) => {
        apply(payload.new as never);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return <SiteBackgroundContext.Provider value={bg}>{children}</SiteBackgroundContext.Provider>;
}

export const useSiteBackground = () => useContext(SiteBackgroundContext);
