import { useState, useEffect, useRef } from "react";

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────
export default function CountUp({ target, decimals = 0, prefix = "", suffix = "", active, delay = 0 }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const duration = 1800; // ms

  useEffect(() => {
    if (!active) return undefined;
    const delayTimer = setTimeout(() => {
      startRef.current = performance.now();
      const animate = (now) => {
        const elapsed = now - startRef.current;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(eased * target);
        if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);
    return () => { clearTimeout(delayTimer); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, target, delay]);

  const visibleValue = active ? value : 0;
  const display = decimals > 0 ? visibleValue.toFixed(decimals) : Math.round(visibleValue).toString();
  return <>{prefix}{display}{suffix}</>;
}
