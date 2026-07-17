import { motion } from 'framer-motion';
import Link from 'next/link';

// Shared hover/tap physics so every clickable button/card site-wide feels
// consistent rather than each page inventing its own timing. whileHover
// never fires on touch devices (there's no cursor to hover with), so
// whileTap carries the entire felt effect on mobile — it needs to be
// pronounced on its own, not just a scaled-down echo of the hover state.
export const buttonTap = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.92 },
  transition: { type: 'spring', stiffness: 420, damping: 22 },
};

export const cardLift = {
  whileHover: { y: -4 },
  whileTap: { y: -3, scale: 0.96 },
  transition: { type: 'spring', stiffness: 340, damping: 20 },
};

// Same lift, no whileTap — for cards that aren't themselves clickable
// (e.g. a stat tile), so hovering doesn't imply an action that isn't there.
export const hoverLift = {
  whileHover: { y: -4 },
  transition: { type: 'spring', stiffness: 300, damping: 24 },
};

// A plain <Link> wrapped as a motion component: next/link forwards its
// props/ref onto the underlying <a>, which is all Framer Motion needs to
// attach the gesture handlers — navigation still goes through Next's
// router exactly as before, this only adds the hover/tap physics.
export const MotionLink = motion(Link);
