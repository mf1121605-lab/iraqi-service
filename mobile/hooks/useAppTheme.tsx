import { createContext, Fragment, useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { supabase } from '@/lib/supabase';

export interface AppTheme {
  /** Base family key; null means "leave every screen's own font alone". */
  fontFamily: FontFamilyKey | null;
  /** Global text colour override; null means per-screen colours stand. */
  textColor: string | null;
  /** Multiplier applied to every fontSize. 1 = untouched. */
  fontScale: number;
}

export type FontFamilyKey = 'Cairo' | 'Tajawal' | 'Almarai' | 'IBMPlexSansArabic' | 'NotoKufiArabic';

// Every one of these is already loaded in app/_layout.tsx, so switching is
// instant and needs no new asset.
export const FONT_FAMILIES: { key: FontFamilyKey; label: string }[] = [
  { key: 'Cairo',              label: 'القاهرة (الافتراضي)' },
  { key: 'Tajawal',            label: 'تجوّل' },
  { key: 'Almarai',            label: 'المراعي' },
  { key: 'IBMPlexSansArabic',  label: 'IBM Plex عربي' },
  { key: 'NotoKufiArabic',     label: 'نوتو كوفي' },
];

const DEFAULT_THEME: AppTheme = { fontFamily: null, textColor: null, fontScale: 1 };

/**
 * Module-level mirror of the active theme, read by the patched <Text>.
 *
 * A React context can't be read from inside the render patch below (it isn't a
 * component), so the provider mirrors its state here. This is only ever
 * written by the provider.
 */
let activeTheme: AppTheme = DEFAULT_THEME;

/** True when nothing is overridden — lets the patch bail out for free. */
function isPassthrough(t: AppTheme) {
  return t.fontFamily === null && t.textColor === null && t.fontScale === 1;
}

/**
 * Resolves an existing fontFamily string to the same weight in the chosen
 * family: 'Cairo_700Bold' + Tajawal -> 'Tajawal_700Bold'. Screens declare
 * their own weights, and those must survive a family swap.
 */
function retargetFamily(existing: unknown, family: FontFamilyKey): string {
  const isBold = typeof existing === 'string' && /_700Bold$/.test(existing);
  return `${family}_${isBold ? '700Bold' : '400Regular'}`;
}

/**
 * Installs a one-time patch on React Native's <Text> so a founder-selected
 * font/colour/scale reaches screens that hardcode FONTS.regular in their own
 * StyleSheet — which is essentially all of them. Rewriting ~50 screens to read
 * from a hook instead was the alternative; this is the far smaller blast
 * radius.
 *
 * Safety: while nothing is overridden (the default for every install) the
 * patch returns the original render untouched, so it cannot change behaviour
 * until the founder deliberately picks a value. StyleSheet.flatten only runs
 * once an override is actually active.
 */
let patched = false;
function installTextPatch() {
  if (patched) return;
  patched = true;

  const TextAny = Text as unknown as {
    render?: (...args: unknown[]) => unknown;
  };
  const original = TextAny.render;
  if (typeof original !== 'function') return; // RN internals changed — skip rather than crash.

  TextAny.render = function patchedRender(...args: unknown[]) {
    const theme = activeTheme;
    const props = args[0] as { style?: unknown } | undefined;

    if (isPassthrough(theme) || !props) {
      return original.apply(this, args);
    }

    const flat = (StyleSheet.flatten(props.style as never) ?? {}) as TextStyle;
    const override: TextStyle = {};

    if (theme.fontFamily) override.fontFamily = retargetFamily(flat.fontFamily, theme.fontFamily);
    if (theme.textColor) override.color = theme.textColor;
    if (theme.fontScale !== 1 && typeof flat.fontSize === 'number') {
      override.fontSize = Math.round(flat.fontSize * theme.fontScale);
      if (typeof flat.lineHeight === 'number') {
        override.lineHeight = Math.round(flat.lineHeight * theme.fontScale);
      }
    }

    const next = { ...props, style: [props.style, override] };
    return original.apply(this, [next, ...args.slice(1)]);
  };
}

const AppThemeContext = createContext<AppTheme>(DEFAULT_THEME);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(DEFAULT_THEME);
  // Remounting the subtree is what makes a change visible immediately: the
  // patch is consulted during render, so already-rendered Text nodes keep
  // their old styles until something forces them to re-render.
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    installTextPatch();

    function apply(row: {
      app_font_family?: string | null;
      app_text_color?: string | null;
      app_font_scale?: number | null;
    }) {
      const key = FONT_FAMILIES.find((f) => f.key === row.app_font_family)?.key ?? null;
      const next: AppTheme = {
        fontFamily: key,
        textColor: row.app_text_color || null,
        // Clamped so a bad value can't render the app unusable.
        fontScale: Math.min(1.4, Math.max(0.85, row.app_font_scale ?? 1)),
      };

      const unchanged =
        next.fontFamily === activeTheme.fontFamily &&
        next.textColor === activeTheme.textColor &&
        next.fontScale === activeTheme.fontScale;
      // Remounting resets navigation state, so it must only happen on a real
      // change — never on the initial fetch of an install that has no
      // overrides set, which is the common case.
      if (unchanged) return;

      activeTheme = next;
      setTheme(next);
      setEpoch((e) => e + 1);
    }

    supabase
      .from('founder_settings')
      .select('app_font_family, app_text_color, app_font_scale')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        // The columns are added by a migration the founder runs manually. Until
        // then this errors, and staying on the defaults is the correct
        // behaviour — not a crash.
        if (error) {
          console.warn('app theme columns unavailable, using defaults:', error.message);
          return;
        }
        if (data) apply(data);
      });

    const channel = supabase
      .channel('app-theme-settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'founder_settings' }, (payload) => {
        apply(payload.new as never);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <AppThemeContext.Provider value={theme}>
      <Fragment key={epoch}>{children}</Fragment>
    </AppThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(AppThemeContext);
