import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface UiOverride {
  font_color: string | null;
  font_size: number | null;
  font_family: string | null;
  bg_color: string | null;
}

export type EditorKind = 'text' | 'box';

export interface EditorHint {
  color?: string;
  fontSize?: number;
  bgColor?: string;
}

interface EditorTarget {
  id: string;
  kind: EditorKind;
  label: string;
  hint: EditorHint;
}

interface UiOverridesState {
  overrides: Record<string, UiOverride>;
  designMode: boolean;
  setDesignMode: (on: boolean) => void;
  editorTarget: EditorTarget | null;
  openEditor: (id: string, kind: EditorKind, label: string, hint?: EditorHint) => void;
  closeEditor: () => void;
  saveOverride: (id: string, patch: Partial<UiOverride>) => Promise<void>;
  resetOverride: (id: string) => Promise<void>;
}

const UiOverridesContext = createContext<UiOverridesState | null>(null);

// Loaded once at app boot (small table, one row per customized element) and
// kept fresh via realtime — the founder's design-mode editor writes to this
// same table, so every screen picks up a change immediately without needing
// a fresh app launch.
export function UiOverridesProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, UiOverride>>({});
  const [designMode, setDesignMode] = useState(false);
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase.from('ui_style_overrides').select('*');
      if (!active || error || !data) return;
      const map: Record<string, UiOverride> = {};
      for (const row of data) {
        map[row.element_id] = {
          font_color: row.font_color,
          font_size: row.font_size,
          font_family: row.font_family,
          bg_color: row.bg_color,
        };
      }
      setOverrides(map);
    }

    load();

    const channel = supabase
      .channel('ui-style-overrides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ui_style_overrides' }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  function openEditor(id: string, kind: EditorKind, label: string, hint: EditorHint = {}) {
    setEditorTarget({ id, kind, label, hint });
  }

  function closeEditor() {
    setEditorTarget(null);
  }

  async function saveOverride(id: string, patch: Partial<UiOverride>) {
    const current = overrides[id] ?? { font_color: null, font_size: null, font_family: null, bg_color: null };
    const next = { ...current, ...patch };
    setOverrides((prev) => ({ ...prev, [id]: next }));
    await supabase.from('ui_style_overrides').upsert({ element_id: id, ...next });
  }

  async function resetOverride(id: string) {
    setOverrides((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    await supabase.from('ui_style_overrides').delete().eq('element_id', id);
  }

  // openEditor/closeEditor/saveOverride/resetOverride close over `overrides`
  // via state setters only (no stale-closure risk) and are recreated each
  // render — including them here would defeat the memo, so they're
  // intentionally omitted.
  const value = useMemo<UiOverridesState>(() => ({
    overrides,
    designMode,
    setDesignMode,
    editorTarget,
    openEditor,
    closeEditor,
    saveOverride,
    resetOverride,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [overrides, designMode, editorTarget]);

  return <UiOverridesContext.Provider value={value}>{children}</UiOverridesContext.Provider>;
}

export function useUiOverrides(): UiOverridesState {
  const ctx = useContext(UiOverridesContext);
  if (!ctx) throw new Error('useUiOverrides must be used within UiOverridesProvider');
  return ctx;
}

export function useElementOverride(id: string): UiOverride | undefined {
  const { overrides } = useUiOverrides();
  return overrides[id];
}
