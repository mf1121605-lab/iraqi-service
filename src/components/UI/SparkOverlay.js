// Small scattered "spark" dots drifting up and fading, layered over a
// still image standing in for a video (slow connection, or no video
// uploaded yet) so the card still reads as alive instead of static.
// Fixed positions/delays (not random per render) so server and client
// markup match — Math.random() here would mismatch on hydration.
const SPARKS = [
  { left: '18%', bottom: '20%', delay: '0s', duration: '1.6s' },
  { left: '32%', bottom: '10%', delay: '0.4s', duration: '2s' },
  { left: '50%', bottom: '25%', delay: '0.9s', duration: '1.7s' },
  { left: '65%', bottom: '12%', delay: '0.2s', duration: '2.2s' },
  { left: '78%', bottom: '22%', delay: '1.2s', duration: '1.9s' },
  { left: '42%', bottom: '35%', delay: '1.5s', duration: '1.8s' },
];

export default function SparkOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {SPARKS.map((spark, i) => (
        <span
          key={i}
          className="absolute h-1 w-1 animate-spark-rise rounded-full bg-gold-300 shadow-[0_0_6px_2px_rgba(230,171,44,0.7)]"
          style={{ left: spark.left, bottom: spark.bottom, animationDelay: spark.delay, animationDuration: spark.duration }}
        />
      ))}
    </div>
  );
}
