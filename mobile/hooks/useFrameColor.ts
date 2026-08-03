import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/theme';

// Founder-controlled frame color (founder_settings.frame_color) — falls
// back to the app's default gold. Realtime-subscribed so a change from
// the founder's settings screen applies immediately without a restart.
export function useFrameColor(): string {
  const [color, setColor] = useState(COLORS.gold);

  useEffect(() => {
    let active = true;

    supabase.from('founder_settings').select('frame_color').eq('id', 1).single().then(({ data }) => {
      if (active && data?.frame_color) setColor(data.frame_color);
    });

    const channel = supabase
      .channel('frame-color-settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'founder_settings' }, (payload) => {
        const next = (payload.new as { frame_color?: string | null })?.frame_color;
        setColor(next || COLORS.gold);
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  return color;
}
