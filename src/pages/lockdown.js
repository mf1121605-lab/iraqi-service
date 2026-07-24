import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useSession } from '../utils/useSession';

export default function LockdownPage() {
  const { session } = useSession();
  const [showRestore, setShowRestore] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleRestore(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = session?.access_token;
      const res = await fetch('/api/founder/nuclear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'deactivate', passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'خطأ');
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => window.location.replace('/'), 1500);
    } catch {
      setError('خطأ في الاتصال');
      setLoading(false);
    }
  }

  return (
    <main className="dark flex min-h-screen flex-col items-center justify-center bg-[#000] px-6 text-white">
      <div className="text-center">
        <Lock className="mx-auto mb-4 h-16 w-16 text-red-500" />
        <h1 className="mb-3 text-3xl font-bold text-red-400">الموقع في وضع الصيانة</h1>
        <p className="mx-auto max-w-sm text-white/60">المنصة مغلقة مؤقتاً. يرجى المحاولة لاحقاً.</p>
      </div>

      {/* Hidden restore trigger — tiny dot, not obvious to visitors */}
      <button
        type="button"
        onClick={() => setShowRestore((v) => !v)}
        className="mt-16 text-[10px] text-white/10 transition-colors hover:text-white/30"
        aria-label="restore"
      >
        ●
      </button>

      {showRestore && (
        <form onSubmit={handleRestore} className="mt-4 w-full max-w-xs space-y-3">
          <h2 className="text-center text-sm font-semibold text-amber-400">رفع الإغلاق</h2>
          <div className="relative">
            <input
              type={revealed ? 'text' : 'password'}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="كلمة المرور"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="absolute end-2 top-2 text-white/40 hover:text-white/70"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-center text-xs text-red-400">{error}</p>}
          {success && <p className="text-center text-xs text-emerald-400">تم رفع الإغلاق</p>}
          <button
            type="submit"
            disabled={loading || !passcode}
            className="w-full rounded-lg bg-amber-500 py-2 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? '...' : 'رفع الإغلاق'}
          </button>
        </form>
      )}
    </main>
  );
}
