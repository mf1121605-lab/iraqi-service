import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Volume2, X } from 'lucide-react';

const STORAGE_KEY = 'iraqi-services:permissions-asked';

export default function PermissionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const notifSupported = 'Notification' in window && Notification.permission === 'default';
    const audioSupported = 'AudioContext' in window || 'webkitAudioContext' in window;
    if (notifSupported || audioSupported) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  async function allow() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      try {
        const Ctx = window.AudioContext ?? window.webkitAudioContext;
        const ctx = new Ctx();
        await ctx.resume();
        ctx.close();
      } catch (_) {}
    }
    dismiss();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="fixed bottom-6 inset-x-4 z-50 mx-auto max-w-sm rounded-2xl border border-amber-500/30 bg-[#161b22]/90 p-4 shadow-2xl backdrop-blur-xl"
          style={{ boxShadow: '0 0 30px rgba(230,171,44,0.15)' }}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="إغلاق"
            className="absolute top-3 end-3 flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15">
              <Bell className="h-5 w-5 text-amber-300" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">تفعيل الإشعارات والصوت</p>
              <p className="mt-0.5 text-xs text-white/60">للحصول على تنبيهات فورية وتجربة صوتية كاملة</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={allow}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
            >
              <Volume2 className="h-3.5 w-3.5" />
              السماح
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/60 hover:text-white transition-colors"
            >
              لاحقاً
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
