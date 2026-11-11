// Runs before first paint. External file because the CSP forbids inline scripts.
// Keep in sync with ThemeContext: only "dark" is honoured, anything else is light.
try {
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch (e) {}
