import { useEffect, useRef, useState } from 'react';

// Full-bleed card/banner videos all autoplay at once on mount today, which
// is exactly what makes a weak connection struggle — half a dozen cards
// competing for bandwidth simultaneously. This defers the actual src (and
// therefore the download) until the element scrolls near the viewport, so
// only what's actually about to be seen ever starts loading.
export default function LazyVideo({ src, className }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={inView ? src : undefined}
      autoPlay={inView}
      loop
      muted
      playsInline
      preload="metadata"
      className={className}
    />
  );
}
