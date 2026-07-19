import { Component } from 'react';

// Next.js's production fallback ("Application error: a client-side
// exception has occurred") deliberately hides the real error — useless
// when the only person who can see it is a non-technical founder testing
// on a phone with no devtools access. This catches render errors instead
// and shows the actual message/stack directly on screen, so a screenshot
// of the crash is enough to diagnose it.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto bg-[#0d1117] p-6 text-white" dir="ltr">
        <div className="w-full max-w-lg space-y-3 rounded-2xl border border-red-400/30 bg-red-500/5 p-6 text-sm">
          <p className="font-bold text-red-300">حدث خطأ غير متوقع — technical details below</p>
          <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-3 text-xs text-red-200">
            {error?.message || String(error)}
            {error?.stack ? `\n\n${error.stack}` : ''}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/30"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      </div>
    );
  }
}
