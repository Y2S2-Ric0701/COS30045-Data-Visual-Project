/* ═══════════════════════════════════════════════════════════════
   theme.js – light / dark mode (doc/UI_UX_improvement_plan.md §7)
   Loaded in <head>, before the stylesheets, so the right theme is set
   before the first paint (no white flash in dark mode).

   - The reader's choice (sun / moon button in the nav) is saved in
     localStorage. Until they choose, the site follows the system setting.
   - Chart cards go dim slate in dark mode; the charts read their colours
     from the --c-* tokens and redraw on 'themechange' (css/story.css → "Dark mode").
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'rc-theme';
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function system() { return media && media.matches ? 'dark' : 'light'; }
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  }

  var choice = saved();
  apply(choice === 'light' || choice === 'dark' ? choice : system());

  // Follow the system setting until the reader picks a theme themselves
  if (media && media.addEventListener) {
    media.addEventListener('change', function () {
      var c = saved();
      if (c !== 'light' && c !== 'dark') apply(system());
    });
  }

  window.SiteTheme = {
    get: function () { return root.getAttribute('data-theme') || 'light'; },
    set: function (theme) {
      try { localStorage.setItem(KEY, theme); } catch (e) { /* private mode: still switch */ }
      apply(theme);
    },
    toggle: function () { this.set(this.get() === 'dark' ? 'light' : 'dark'); },
  };
})();
