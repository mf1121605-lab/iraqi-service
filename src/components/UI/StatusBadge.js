import { translate } from '../../utils/i18n';

const STATUS_STYLES = {
  submitted: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  in_review: 'bg-gold-500/10 text-gold-700 dark:text-gold-300',
  needs_changes: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  approved: 'bg-brand-500/10 text-brand-700 dark:text-brand-300',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

export default function StatusBadge({ status, locale }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] ?? STATUS_STYLES.submitted
      }`}
    >
      {translate(locale, `requestStatus.${status}`)}
    </span>
  );
}
