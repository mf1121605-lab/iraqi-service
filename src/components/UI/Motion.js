import { motion } from 'framer-motion';
import Link from 'next/link';

// Shared hover/tap physics so every clickable button/card site-wide feels
// consistent rather than each page inventing its own timing. whileTap
// gives real touch feedback on mobile, not just desktop :hover.
export const buttonTap = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.96 },
  transition: { type: 'spring', stiffness: 420, damping: 28 },
};

export const cardLift = {
  whileHover: { y: -4 },
  whileTap: { scale: 0.98 },
  transition: { type: 'spring', stiffness: 300, damping: 24 },
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
