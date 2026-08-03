import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Founder-controlled on/off switch for the CinematicFrame overlay
// (founder_settings.frame_enabled) — realtime-subscribed like useFrameColor.
export function useFrameEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.from('founder_settings').select('frame_enabled').eq('id', 1).single().then(({ data }) => {
      if (active && data?.frame_enabled != null) setEnabled(data.frame_enabled);
    });

    const channel = supabase
      .channel('frame-enabled-settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'founder_settings' }, (payload) => {
        const next = (payload.new as { frame_enabled?: boolean | null })?.frame_enabled;
        setEnabled(next ?? true);
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  return enabled;
}
