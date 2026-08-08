import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/theme';

export interface FrameStyle {
  color: string;
  enabled: boolean;
  /** Stroke thickness of the frame line and its corner accents, in px. */
  width: number;
  /** Corner-accent rounding, in px. */
  radius: number;
}

export const FRAME_DEFAULTS: FrameStyle = {
  color: COLORS.gold,
  enabled: true,
  width: 2,
  radius: 1,
};

// Clamped app-side as well as in the DB CHECK constraint: a stroke thick
// enough to cover the status bar, or a radius larger than the accent itself,
// would look broken rather than styled.
const WIDTH_MIN = 1, WIDTH_MAX = 6;
const RADIUS_MIN = 0, RADIUS_MAX = 14;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Founder-controlled frame appearance, read live from founder_settings.
 *
 * Replaces the separate useFrameColor / useFrameEnabled hooks, which each
 * opened their own realtime channel on the same table for a single column.
 * One subscription now carries all four values.
 *
 * frame_width / frame_radius are added by a migration the founder runs
 * manually; until then the select errors and the defaults stand, which is the
 * correct behaviour rather than a crash.
 */
export function useFrameStyle(): FrameStyle {
  const [style, setStyle] = useState<FrameStyle>(FRAME_DEFAULTS);

  useEffect(() => {
    let active = true;

    function apply(row: {
      frame_color?: string | null;
      frame_enabled?: boolean | null;
      frame_width?: number | null;
      frame_radius?: number | null;
    }) {
      setStyle({
        color: row.frame_color || FRAME_DEFAULTS.color,
        enabled: row.frame_enabled ?? FRAME_DEFAULTS.enabled,
        width: clamp(row.frame_width ?? FRAME_DEFAULTS.width, WIDTH_MIN, WIDTH_MAX),
        radius: clamp(row.frame_radius ?? FRAME_DEFAULTS.radius, RADIUS_MIN, RADIUS_MAX),
      });
    }

    supabase
      .from('founder_settings')
      .select('frame_color, frame_enabled, frame_width, frame_radius')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.warn('frame style columns unavailable, using defaults:', error.message);
          return;
        }
        if (data) apply(data);
      });

    const channel = supabase
      .channel('frame-style-settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'founder_settings' }, (payload) => {
        if (active) apply(payload.new as never);
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  return style;
}
