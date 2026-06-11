import { useState, useEffect } from "react";

export default function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("np-theme");
    if (stored) return stored === "dark";
    // Dark is the house default; visitors can switch and their choice sticks.
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("np-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(prev => !prev) };
}
