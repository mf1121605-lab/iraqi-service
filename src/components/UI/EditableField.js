import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';

/**
 * Inline editable text field.
 * Shows value as styled text; pencil button activates an input/textarea.
 * Saves directly to the `founder_settings` table row with the given field name.
 *
 * Props:
 *   field        — column name in founder_settings
 *   value        — current value (string | null)
 *   settingsId   — the row id (required to build the .eq('id', ...) filter)
 *   placeholder  — displayed when empty
 *   multiline    — true → textarea, false (default) → input
 *   className    — applied to the read-mode text span
 *   onSaved      — optional callback after a successful save
 */
export default function EditableField({
  field,
  value,
  settingsId,
  placeholder = '—',
  multiline = false,
  className = '',
  onSaved,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Keep draft in sync if parent value changes (e.g. realtime update)
  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSave() {
    setError('');
    setSaving(true);
    const { error: err } = await supabaseClient
      .from('founder_settings')
      .update({ [field]: draft.trim() || null })
      .eq('id', settingsId)
      .select()
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    setEditing(false);
    onSaved?.();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
  }

  const sharedInputClass =
    'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent,#f59e0b)]';

  if (editing) {
    return (
      <div className="space-y-1.5">
        {multiline ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className={`${sharedInputClass} resize-none`}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className={sharedInputClass}
          />
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-1 rounded-lg bg-[color:var(--color-accent,#f59e0b)] px-3 py-1.5 text-xs font-bold text-black disabled:opacity-50"
          >
            <Check className="h-3 w-3" />
            {saving ? '...' : 'حفظ'}
          </button>
          <button
            type="button"
            onClick={() => { setDraft(value ?? ''); setEditing(false); }}
            className="flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:text-white"
          >
            <X className="h-3 w-3" />
            إلغاء
          </button>
        </div>
      </div>
    );
  }

  return (
    <span className={`group inline-flex items-start gap-1.5 ${className}`}>
      <span className={!value ? 'italic text-white/30' : ''}>
        {value || placeholder}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-0.5 shrink-0 rounded p-0.5 text-white/0 transition-all group-hover:text-[color:var(--color-accent,#f59e0b)] focus:text-[color:var(--color-accent,#f59e0b)]"
        aria-label="تعديل"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </span>
  );
}
