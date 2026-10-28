// Apply the reader's theme before first paint to avoid a flash: their explicit
// choice if they made one (see src/hooks/useDarkMode.js), else the OS setting.
// A file rather than an inline <script> so the CSP can forbid inline JS.
(function () {
  try {
    var stored = localStorage.getItem("np-theme-v2");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch {
    // storage unavailable: light
  }
})();
