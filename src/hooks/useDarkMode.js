import { useEffect, useState } from "react";

// Only an explicit toggle is stored. The old "np-theme" key was written on
// every visit while dark was the house default, so it says nothing about what
// a reader chose; the broadsheet redesign starts everyone from their OS setting.
const STORAGE_KEY = "np-theme-v2";

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function prefersDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export default function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const stored = readStored();
    return stored ? stored === "dark" : Boolean(prefersDark());
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      } catch {
        // storage unavailable: the choice lasts for this visit
      }
      return next;
    });
  };

  return { isDark, toggle };
}
