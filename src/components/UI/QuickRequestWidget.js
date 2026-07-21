import { useState } from 'react';
import { Zap } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';

export default function QuickRequestWidget({ sectionName, locale, profile }) {
  const t = (path) => translate(locale, path);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!profile || profile.role !== 'customer') return null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    await supabaseClient.from('quick_requests').insert({
      customer_id: profile.id,
      section_name: sectionName,
      content: content.trim(),
    });
    setSubmitting(false);
    setDone(true);
    setContent('');
  }

  return (
    <div className="gold-border-spin cinematic-card relative overflow-hidden rounded-2xl p-5 text-white dark:text-white">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
          <Zap className="h-4 w-4 text-amber-400" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold text-amber-300">{t('quickRequest.widgetTitle')}</p>
          <p className="text-xs text-white/60">{t('quickRequest.widgetSubtitle')}</p>
        </div>
      </div>

      {done ? (
        <p className="rounded-xl bg-emerald-500/15 px-4 py-3 text-center text-sm font-semibold text-emerald-300">
          {t('quickRequest.successMessage')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t('quickRequest.placeholder')}
            rows={3}
            className="input-cinematic w-full resize-none text-sm"
          />
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="btn-cinematic-gold w-full py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {submitting ? t('common.loading') : t('quickRequest.sendCta')}
          </button>
        </form>
      )}
    </div>
  );
}
