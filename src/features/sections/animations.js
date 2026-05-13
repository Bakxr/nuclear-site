// Spec-recommended easing: smooth deceleration, no bounce
export const EASE = [0.22, 1, 0.36, 1];

export const fadeUp = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: EASE } },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

// Word-by-word stagger (hero heading) — 400–700ms range
export const wordReveal = {
  hidden: { opacity: 0, y: 28, skewY: 1 },
  visible: { opacity: 1, y: 0, skewY: 0, transition: { duration: 0.6, ease: EASE } },
};

// Draws a line left-to-right (section labels) — micro timing 300ms
export const lineGrow = {
  hidden: { scaleX: 0, originX: 0 },
  visible: { scaleX: 1, originX: 0, transition: { duration: 0.5, ease: EASE, delay: 0.05 } },
};
