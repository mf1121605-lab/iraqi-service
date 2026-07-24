import { Plus } from 'lucide-react';

/**
 * Consistent section header for founder dashboard panels.
 * Shows an icon + title on the left and optional action buttons (e.g. Add) on the right.
 *
 * Props:
 *   icon       — lucide icon component
 *   title      — section heading string
 *   onAdd      — if provided, renders an animated "+" button
 *   addLabel   — aria-label for the add button (default: 'إضافة')
 *   actions    — any additional JSX buttons/elements to render on the right
 */
export default function PanelHeader({ icon: Icon, title, onAdd, addLabel = 'إضافة', actions }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-2 font-display font-semibold text-[color:var(--color-accent,#f59e0b)]">
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
        {title}
      </h3>
      <div className="flex items-center gap-1.5">
        {actions}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={addLabel}
            className="group flex h-7 w-7 items-center justify-center rounded-full
              border border-[color:var(--color-accent,#f59e0b)]/40
              bg-[color:var(--color-accent,#f59e0b)]/8
              text-[color:var(--color-accent,#f59e0b)]
              transition-all duration-200
              hover:bg-[color:var(--color-accent,#f59e0b)]/20
              hover:border-[color:var(--color-accent,#f59e0b)]/70
              hover:shadow-[0_0_12px_-4px_var(--color-accent,#f59e0b)]
              active:scale-90 focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent,#f59e0b)]/50"
          >
            <Plus className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
