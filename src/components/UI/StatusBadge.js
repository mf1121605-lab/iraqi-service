import { TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Clock, Loader as Loader2, Circle as XCircle } from 'lucide-react';
import { translate } from '../../utils/i18n';

const STATUS_STYLES = {
  submitted: 'bg-slate-500/10 text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:text-slate-300',
  in_review: 'bg-gold-500/10 text-gold-700 ring-1 ring-inset ring-gold-500/25 dark:text-gold-300',
  needs_changes: 'bg-orange-500/10 text-orange-700 ring-1 ring-inset ring-orange-500/25 dark:text-orange-300',
  approved: 'bg-brand-500/10 text-brand-700 ring-1 ring-inset ring-brand-500/25 dark:text-brand-300',
  rejected: 'bg-red-500/10 text-red-700 ring-1 ring-inset ring-red-500/25 dark:text-red-300',
};

const STATUS_ICONS = {
  submitted: Clock,
  in_review: Loader2,
  needs_changes: AlertTriangle,
  approved: CheckCircle2,
  rejected: XCircle,
};

export default function StatusBadge({ status, locale }) {
  const Icon = STATUS_ICONS[status] ?? Clock;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
        STATUS_STYLES[status] ?? STATUS_STYLES.submitted
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === 'in_review' ? 'animate-spin' : ''}`} strokeWidth={2.25} aria-hidden="true" />
      {translate(locale, `requestStatus.${status}`)}
    </span>
  );
}
