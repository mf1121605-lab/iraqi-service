import { BookOpen, Calculator, FlaskConical, Languages, LayoutGrid, Moon, Sparkles } from 'lucide-react';
import { useLocale } from '../../../components/Layout/AppShell';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { MotionLink, cardLift } from '../../../components/UI/Motion';
import { useRequireRole } from '../../../utils/useSession';
import { translate } from '../../../utils/i18n';
import { TUTOR_SUBJECTS, tutorSubjectLabel } from '../../../lib/tutorSubjects';

const SUBJECT_ICONS = {
  arabic: BookOpen,
  english: Languages,
  math: Calculator,
  science: FlaskConical,
  social_studies: LayoutGrid,
  islamic_education: Moon,
};

export default function TutorSubjects() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['customer']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  if (loading || !profile) return null;

  return (
    <>
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-300" aria-hidden="true" />
        {t('aiTutor.pageTitle')}
      </h2>
      <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">{t('aiTutor.pageSubtitle')}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TUTOR_SUBJECTS.map((subject, index) => {
          const Icon = SUBJECT_ICONS[subject.key] ?? BookOpen;
          return (
            <MotionLink
              key={subject.key}
              href={`/customer/tutor/${subject.key}`}
              style={{ animationDelay: `${index * 60}ms` }}
              {...cardLift}
              className="metal-panel group flex animate-slide-up flex-col items-center gap-3 p-6 text-center font-semibold text-white"
            >
              <div className="icon-medallion h-20 w-20" style={{ '--medallion-glow': 'rgba(230,171,44,0.5)' }}>
                <Icon className="h-9 w-9" strokeWidth={2} aria-hidden="true" />
              </div>
              <span>{tutorSubjectLabel(subject.key, locale)}</span>
            </MotionLink>
          );
        })}
      </div>
    </>
  );
}
