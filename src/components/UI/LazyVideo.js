import { useEffect, useRef, useState } from 'react';

// SOURCE PREP GUIDANCE (for whoever exports these icon videos): these clips
// render inside small UI icons, so full resolution is wasted bandwidth on
// Iraqi mobile networks. Before uploading, compress with ffmpeg to max
// 240p-360p, ~200-300kbps, no audio track, so the file lands under 1MB:
//   ffmpeg -i source.mov -vf scale=-2:360 -an -c:v libvpx-vp9 -b:v 250k out.webm
//   ffmpeg -i source.mov -vf scale=-2:360 -an -c:v libx264 -b:v 250k -profile:v baseline out.mp4
// webm/VP9 compresses noticeably smaller than mp4/H.264 at the same visual
// quality, but isn't supported on Safari/iOS — hence serving both below,
// webm first so Chrome/Android prefer the lighter file, mp4 as the
// universal fallback.

function guessMimeType(url) {
  if (!url) return undefined;
  return url.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
}

// Full-bleed card/banner videos all autoplayed at once on mount before this
// existed, which is exactly what makes a weak connection struggle — half a
// dozen cards competing for bandwidth simultaneously. This defers the
// actual src (and therefore the download) until the element scrolls near
// the viewport, AND keeps observing afterward so playback pauses again
// (freeing the decoder/network) once the icon scrolls back out of view,
// rather than only triggering once.
export default function LazyVideo({ src, webmSrc, className }) {
  const ref = useRef(null);
  const [everSeen, setEverSeen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setEverSeen(true);
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setEverSeen(true);
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !everSeen) return;
    if (visible) {
      // <source> children were just inserted (conditional on everSeen) —
      // the browser doesn't auto-detect sources added after mount, so
      // load() is required once before the first play() actually works.
      if (el.readyState === 0) el.load();
      el.play?.().catch(() => {});
    } else {
      el.pause?.();
    }
  }, [visible, everSeen]);

  return (
    <video ref={ref} loop muted playsInline preload="metadata" className={className}>
      {everSeen && webmSrc && <source src={webmSrc} type="video/webm" />}
      {everSeen && src && <source src={src} type={guessMimeType(src)} />}
    </video>
  );
}
