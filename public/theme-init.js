// Apply the saved (or default dark) theme before first paint to avoid a light
// flash. A file rather than an inline <script> so the CSP can forbid inline JS.
(function () {
  try {
    var stored = localStorage.getItem("np-theme");
    if (stored ? stored === "dark" : true) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) { /* storage unavailable — stay with default */ }
})();
