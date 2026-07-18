import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, KeyRound, Lock } from 'lucide-react';
import { defaultLocale, getDirection, getStoredLocale, translate } from '../utils/i18n';
import { MotionLink, buttonTap } from '../components/UI/Motion';

const MIN_PASSWORD_LENGTH = 8;
const QUESTION_KEYS = { 1: 'authCustomer.recoveryQuestion1', 2: 'authCustomer.recoveryQuestion2' };

export default function ForgotPassword() {
  const [locale, setLocale] = useState(defaultLocale);
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [questionId, setQuestionId] = useState(null);
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) setLocale(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dir = getDirection(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (path) => translate(locale, path);

  async function handlePhoneSubmit(event) {
    event.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError(t('authCustomer.errorPhoneRequired'));
      return;
    }

    setSubmitting(true);
    const response = await fetch(`/api/customer/recovery-question?phone=${encodeURIComponent(phone.trim())}`);
    const { questionId: foundQuestionId } = await response.json().catch(() => ({ questionId: null }));
    setSubmitting(false);

    if (!foundQuestionId) {
      setError(t('forgotPassword.noRecoveryError'));
      return;
    }
    setQuestionId(foundQuestionId);
    setStep('answer');
  }

  async function handleResetSubmit(event) {
    event.preventDefault();
    setError('');

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t('authCustomer.errorPasswordTooShort'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t('authCustomer.errorPasswordMismatch'));
      return;
    }

    setSubmitting(true);
    const response = await fetch('/api/customer/recover-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), questionAnswer: answer, newPassword }),
    });
    setSubmitting(false);

    if (!response.ok) {
      setError(t('forgotPassword.errorAnswerWrong'));
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 text-white">
        <div className="cinematic-card relative z-10 w-full max-w-md animate-scale-in p-10 text-center">
          <span className="cinematic-emblem mx-auto h-16 w-16">
            <KeyRound className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
          </span>
          <p className="mt-5 text-white/85">{t('forgotPassword.successMessage')}</p>
          <MotionLink
            href="/login"
            whileTap={{ scale: 0.96 }}
            className="btn-cinematic-gold mt-6 inline-flex w-full items-center justify-center px-4 py-3.5"
          >
            {t('authEmployee.submitCta')}
          </MotionLink>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 animate-spotlight-sweep rounded-full bg-gold-400/10 blur-[100px]" />

      <div className="cinematic-card relative z-10 w-full max-w-md animate-scale-in p-10">
        <span className="cinematic-emblem mx-auto h-16 w-16">
          <KeyRound className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-center font-display text-3xl font-bold tracking-tight">{t('forgotPassword.title')}</h1>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm text-white/80">
                {t('forgotPassword.phoneLabel')}
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                dir="ltr"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t('forgotPassword.phonePlaceholder')}
                className="input-cinematic"
              />
            </div>
            {error && <p className="animate-slide-down text-sm text-red-300">{error}</p>}
            <motion.button
              type="submit"
              disabled={submitting}
              {...buttonTap}
              className="btn-cinematic-gold w-full px-4 py-3.5 disabled:opacity-50"
            >
              {t('forgotPassword.nextCta')}
            </motion.button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="mt-8 space-y-4">
            <p className="text-sm text-white/85">{t(QUESTION_KEYS[questionId])}</p>
            <div>
              <label htmlFor="answer" className="mb-1.5 block text-sm text-white/80">
                {t('forgotPassword.answerLabel')}
              </label>
              <input
                id="answer"
                type="text"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder={t('forgotPassword.answerPlaceholder')}
                className="input-cinematic"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="mb-1.5 flex items-center gap-1.5 text-sm text-white/80">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                {t('forgotPassword.newPasswordLabel')}
              </label>
              <input
                id="newPassword"
                type="password"
                dir="ltr"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={t('authCustomer.passwordPlaceholder')}
                className="input-cinematic"
              />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="mb-1.5 flex items-center gap-1.5 text-sm text-white/80">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                {t('forgotPassword.confirmNewPasswordLabel')}
              </label>
              <input
                id="confirmNewPassword"
                type="password"
                dir="ltr"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder={t('authCustomer.passwordPlaceholder')}
                className="input-cinematic"
              />
            </div>
            {error && <p className="animate-slide-down text-sm text-red-300">{error}</p>}
            <motion.button
              type="submit"
              disabled={submitting}
              {...buttonTap}
              className="btn-cinematic-gold w-full px-4 py-3.5 disabled:opacity-50"
            >
              {t('forgotPassword.submitCta')}
            </motion.button>
          </form>
        )}

        <MotionLink
          href="/login"
          whileTap={{ scale: 0.96 }}
          className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          {t('forgotPassword.backCta')}
        </MotionLink>
      </div>
    </main>
  );
}
