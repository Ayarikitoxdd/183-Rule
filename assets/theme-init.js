(() => {
  try {
    const stored = localStorage.getItem("regla183-theme");
    if (stored === "dark" || stored === "light") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
