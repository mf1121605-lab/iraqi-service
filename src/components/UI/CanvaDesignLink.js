import { Palette } from 'lucide-react';
import { translate } from '../../utils/i18n';

// Canva's old embeddable "Design Button" (open the editor inline, get the
// export back via a callback) was sunset by Canva on 2025-12-30 for every
// partner outside China — no new API keys are issued, so that flow isn't
// buildable anymore. This just opens Canva in a new tab; the founder
// designs there, downloads the result, and uploads it through the
// ImageUploader next to this link like any other image.
export default function CanvaDesignLink({ locale, className = '' }) {
  const t = (path) => translate(locale, path);
  return (
    <a
      href="https://www.canva.com/"
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 rounded-xl2 border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5 ${className}`}
    >
      <Palette className="h-4 w-4" aria-hidden="true" />
      {t('common.designWithCanva')}
    </a>
  );
}
