/* ═══════════════════════════════════════════════════════════════
   layout.js – Shared navigation bar & footer
   COS30045 Data Visualisation Project

   Injects the same navbar and footer into every page so they are
   defined once. Each page needs:
     <body data-page="...">            (key from NAV_PAGES below)
     <div id="site-nav"></div>          (navbar placeholder)
     <div id="site-footer"></div>       (footer placeholder)
     <script src="js/layout.js"></script>
   ═══════════════════════════════════════════════════════════════ */

// Single source of truth for page links – add/rename pages here only.
// The order is the order of the story; Back / Next buttons follow it.
const NAV_PAGES = [
  { key: 'home',     href: 'index.html',                   label: 'Overview',
    step: 'Overview',   question: 'Who gets hurt, and who gets hurt worst?' },
  { key: 'who',      href: 'who-is-affected.html',         label: 'Who',
    step: 'Question 1', question: 'Who ends up in hospital?' },
  { key: 'trends',   href: 'trends-over-time.html',        label: 'Trends',
    step: 'Question 2', question: 'Is it getting better or worse?' },
  { key: 'where',    href: 'geographic-distribution.html', label: 'Where',
    step: 'Question 3', question: 'Where does it happen?' },
  { key: 'crash',    href: 'crash-characteristics.html',   label: 'Crash Factors',
    step: 'Question 4', question: 'What did they crash into?' },
  { key: 'severity', href: 'injury-severity.html',         label: 'Severity',
    step: 'Question 5', question: 'Who is hurt the worst?' },
];

/** Back / Next buttons at the bottom of every page, in story order */
function renderStepper(activeKey) {
  const i = NAV_PAGES.findIndex(p => p.key === activeKey);
  if (i < 0) return '';
  const prev = NAV_PAGES[i - 1];
  // After the last question, "Next" returns to the Overview's summary
  const next = NAV_PAGES[i + 1] ||
    { href: 'index.html#conclusion', step: 'Summary', question: 'What should change? Back to the Overview' };
  const link = (p, dir) => {
    const arrow = `<span class="stepper-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${dir === 'prev'
      ? 'M19 12H5.5M11 5.5 4.5 12l6.5 6.5' : 'M5 12h13.5M13 5.5l6.5 6.5-6.5 6.5'}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
    const text = `
        <span class="stepper-text">
          <span class="stepper-step"><span class="stepper-word">${dir === 'prev' ? 'Back' : 'Next'} &middot; </span>${p.step}</span>
          <span class="stepper-question">${p.question}</span>
        </span>`;
    return `
      <a class="stepper-link stepper-${dir}" href="${p.href}"
         aria-label="${dir === 'prev' ? 'Back' : 'Next'}: ${p.step}, ${p.question}">
        ${dir === 'prev' ? arrow + text : text + arrow}
      </a>`;
  };
  return `
  <div class="page-stepper-wrap container">
    ${renderRoute(i)}
    <nav class="page-stepper" aria-label="Previous and next page">
      ${prev ? link(prev, 'prev') : '<span class="stepper-spacer"></span>'}
      ${link(next, 'next')}
    </nav>
  </div>`;
}

/** Short marker for a page: "Q3" for questions, a dot for the Overview */
const kmLabel = (p, i) => (i === 0 ? '&#9670;' : `Q${i}`);

/**
 * Road strip above Back / Next: one stop per page, a car at the current
 * stop. Hovering Back or Next slides the car towards that stop (css/story.css).
 */
function renderRoute(current) {
  const n = NAV_PAGES.length;
  const at = i => `calc(18px + (100% - 36px) * ${i / (n - 1)})`;
  const stops = NAV_PAGES.map((p, i) => {
    const cls = i === current ? 'is-here' : i < current ? 'is-done' : '';
    return `<a class="route-stop ${cls}" href="${p.href}" style="left:${at(i)}"
               aria-label="${p.step}: ${p.question}"${i === current ? ' aria-current="page"' : ''}
               title="${p.step}: ${p.question}">${i === 0 ? '' : i}</a>`;
  }).join('');
  const nextI = Math.min(n - 1, current + 1);
  const prevI = Math.max(0, current - 1);
  return `
    <div class="route" style="--car-next:${at(nextI)};--car-prev:${at(prevI)}">
      <div class="route-road" aria-hidden="true"></div>
      ${stops}
      <svg class="route-car" style="left:${at(current)}" viewBox="0 0 41.5 22" aria-hidden="true">
        <!-- Side-view hatchback facing right (the way it drives); colours from --car-* in css/story.css -->
        <g transform="matrix(-1 0 0 1 41.5 0)">
          <path style="fill:var(--car-body)" d="M3 15.5V12.2c0-1.3.8-2.4 2-2.8l5.2-1.6 4.6-4.4A4 4 0 0 1 17.6 2.3h9.1a4 4 0 0 1 3 1.4l3.9 4.6 2.6.7A3 3 0 0 1 38.5 12v3.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 15.5z"/>
          <path style="fill:var(--car-window)" d="M13.2 8.4 16.6 5a2 2 0 0 1 1.4-.6h3.8v4z"/>
          <path style="fill:var(--car-window)" d="M23.6 4.4h3.1a2 2 0 0 1 1.5.7l2.7 3.3h-7.3z"/>
          <path style="fill:none;stroke:var(--car-trim)" stroke-width="1" stroke-linecap="round" d="M22.7 9.6v5.2M5 12.4h32"/>
          <circle cx="11" cy="17" r="3.8" style="fill:var(--car-wheel)"/><circle cx="11" cy="17" r="1.5" style="fill:var(--car-hub)"/>
          <circle cx="30" cy="17" r="3.8" style="fill:var(--car-wheel)"/><circle cx="30" cy="17" r="1.5" style="fill:var(--car-hub)"/>
        </g>
        <rect x="35.4" y="10.4" width="2.6" height="1.7" rx=".85" style="fill:var(--car-light)"/>
        <rect x="3.3" y="10" width="1.6" height="2.4" rx=".8" style="fill:var(--car-tail)"/>
      </svg>
    </div>`;
}

function renderNav(activeKey) {
  const links = NAV_PAGES.map((p, i) => {
    const isActive = p.key === activeKey;
    return `<a href="${p.href}"${isActive ? ' class="active" aria-current="page"' : ''}>` +
      `${i === 0 ? '' : `<span class="km" aria-hidden="true">${kmLabel(p, i)}</span>`}${p.label}</a>`;
  }).join('');

  return `
  <nav class="apple-nav">
    <div class="apple-nav-inner">
      <a href="index.html" class="apple-nav-brand">
        <span class="apple-brand-badge">COS30045</span>
        <span class="apple-brand-title">Road Crash Analytics</span>
      </a>
      <div class="apple-nav-links" id="site-nav-links">${links}</div>
      <div class="nav-actions">
        <button class="theme-toggle" type="button" aria-pressed="false" aria-label="Dark mode">
          <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z"/></svg>
          <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g></svg>
        </button>
        <button class="apple-nav-toggle" type="button" aria-label="Open menu"
                aria-expanded="false" aria-controls="site-nav-links">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
    <div class="read-progress" aria-hidden="true"><span></span></div>
  </nav>`;
}

function renderFooter() {
  return `
  <footer class="site-footer" id="citations">
    <div class="container footer-container">
      <div class="footer-references">
        <p class="footer-references-title">Data Sources &amp; Course References</p>
        <ol class="footer-ordered-list">
          <li>
            <strong>Australian Institute of Health and Welfare (AIHW):</strong>
            <em>Hospitalised injury due to land transport crashes, Australia</em>.
            <a href="https://www.aihw.gov.au/reports/injury/hospitalised-injury-due-to-land-transport-crashes" target="_blank" rel="noopener noreferrer">
              View official AIHW reports &nearr;
            </a>
          </li>
          <li>
            <strong>Bureau of Infrastructure and Transport Research Economics (BITRE):</strong>
            <em>Road Deaths Australia &amp; Crash Inpatient Summaries</em>.
            <a href="https://www.bitre.gov.au/publications/ongoing/road_deaths_australia_annual_summaries" target="_blank" rel="noopener noreferrer">
              Access BITRE data portal &nearr;
            </a>
          </li>
          <li>
            <strong>Theoretical Foundations:</strong>
            Munzner, T. (2014). <em>Visualization Analysis and Design</em>. CRC Press;
            Tufte, E. R. (2001). <em>The Visual Display of Quantitative Information</em>;
            Knaflic, C. N. (2015). <em>Storytelling with Data</em>.
          </li>
        </ol>
      </div>

      <div class="footer-divider"></div>

      <div class="footer-bottom">
        <div class="footer-meta">
          <span>&copy; 2026 Data Vis Project (2026 S2)_Group 9</span>
          <span class="meta-dot">&bull;</span>
          <span>COS30045 Data Visualisation</span>
          <span class="meta-dot">&bull;</span>
          <span>Swinburne University of Technology Sarawak Campus</span>
        </div>
        <div class="footer-deployment-link">
          <a href="https://data-vis-project-2026-s2-group-9.vercel.app" target="_blank" rel="noopener noreferrer">
            Live on Vercel &nearr;
          </a>
        </div>
      </div>
    </div>
  </footer>`;
}

/* ── Photo credits (Wikimedia Commons, CC licences – see asset/CREDITS.md) ── */
const PHOTO_CREDITS = [
  { use: 'Overview', title: 'Queensland, Australia', author: 'Steven Penton', licence: 'CC BY 2.0',
    url: 'https://commons.wikimedia.org/wiki/File:Queensland,_Australia._(51267382436).jpg',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0' },
  { use: 'Question 1', title: 'Bike underpass at Hanlon Park, Brisbane', author: 'Gregwadley', licence: 'CC BY 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Bike_underpass_at_Hanlon_Park,_Brisbane.jpg',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0' },
  { use: 'Question 2', title: 'Hume Freeway at Albury', author: 'Thennicke', licence: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Hume_Freeway_at_Albury_1.JPG',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  { use: 'Question 3', title: 'The Road To Coral Bay', author: 'Ben Cordia', licence: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Endless_Stations_100_-_The_Road_To_Coral_Bay.jpg',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  { use: 'Question 4', title: 'Tram stuck in traffic on Toorak Road', author: 'Philip Mallis', licence: 'CC BY-SA 2.0',
    url: 'https://commons.wikimedia.org/wiki/File:Tram_stuck_in_traffic_on_Toorak_Road,_South_Yarra_(49226245423).jpg',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/2.0' },
  { use: 'Question 5', title: 'Ambulance outside Emergency Entrance, Caloundra Hospital', author: 'Chris Olszewski', licence: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Ambulance_outside_Emergency_Entrance,_Caloundra_Hospital,_2025.jpg',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
];

function renderPhotoCredits() {
  return `
      <div class="photo-credits">
        <p class="footer-references-title">Photo credits</p>
        <p>${PHOTO_CREDITS.map(p =>
          `${p.use}: <a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.title}</a> by ${p.author},
           <a href="${p.licenceUrl}" target="_blank" rel="noopener noreferrer">${p.licence}</a>`).join(' &middot; ')}.
           Photos resized from Wikimedia Commons.</p>
      </div>`;
}

// Runs immediately (script is placed after the placeholders), so no
// flash of missing nav while waiting for DOMContentLoaded
(function injectLayout() {
  const navSlot = document.getElementById('site-nav');
  const footerSlot = document.getElementById('site-footer');
  const activeKey = document.body.dataset.page;

  if (navSlot) navSlot.outerHTML = renderNav(activeKey);
  if (footerSlot) footerSlot.outerHTML = renderFooter();

  // Photo credits in every footer (the Overview has its own footer markup)
  const divider = document.querySelector('.site-footer .footer-divider');
  if (divider && !document.querySelector('.photo-credits')) divider.insertAdjacentHTML('beforebegin', renderPhotoCredits());

  const main = document.querySelector('main');
  if (main) main.insertAdjacentHTML('afterend', renderStepper(activeKey));

  // Question pages: put a km marker ("Q3") in front of "Question 3 of 5"
  const idx = NAV_PAGES.findIndex(p => p.key === activeKey);
  const eyebrow = document.querySelector('.apple-hero .hero-eyebrow');
  if (idx > 0 && eyebrow && !eyebrow.querySelector('.km')) {
    eyebrow.insertAdjacentHTML('afterbegin', `<span class="km" aria-hidden="true">Q${idx}</span>`);
  }

  // Mobile / tablet menu toggle
  const nav = document.querySelector('.apple-nav');
  const toggle = nav && nav.querySelector('.apple-nav-toggle');
  if (toggle) {
    const setOpen = open => {
      nav.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('nav-open')));
    nav.querySelectorAll('.apple-nav-links a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  // Light / dark switch (js/theme.js keeps the choice)
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn && window.SiteTheme) {
    const paintTheme = () => {
      const dark = SiteTheme.get() === 'dark';
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    };
    paintTheme();
    themeBtn.addEventListener('click', () => switchThemeWithHeadlights(themeBtn));
    document.addEventListener('themechange', paintTheme);
  }

  initJumpHighlight();
})();

/* ── Jump highlight ──────────────────────────────────────────────
   When a link scrolls the page to a section (#key-statistics, #filters,
   #age-group, …) the destination glows blue for 1 second once the scroll
   has finished, so the reader knows exactly where to look. Also runs when
   arriving from another page with a #hash in the URL. */
const JUMP_HIGHLIGHT_MS = 1000;

/** Prefer the visible card inside a section (sections themselves have no box). */
function jumpHighlightTarget(el) {
  if (el.classList.contains('apple-section')) {
    const card = el.querySelector(':scope > .apple-card, :scope > .apple-chart-card, :scope > .filter-wrapper');
    if (card) return card;
  }
  return el;
}

/** Wait until the (smooth) scroll stops moving, then call done(). */
function afterScrollSettles(done) {
  let lastY = window.scrollY;
  let still = 0;
  const started = performance.now();
  (function check() {
    const y = window.scrollY;
    still = Math.abs(y - lastY) < 1 ? still + 1 : 0;
    lastY = y;
    // ~5 still frames ≈ scroll finished; give up waiting after 2.5 s
    if (still >= 5 || performance.now() - started > 2500) done();
    else requestAnimationFrame(check);
  })();
}

function flashElement(el) {
  const target = jumpHighlightTarget(el);
  target.classList.remove('jump-highlight');
  void target.offsetWidth;               // restart the animation if clicked twice
  target.classList.add('jump-highlight');
  clearTimeout(target._jumpTimer);
  target._jumpTimer = setTimeout(() => target.classList.remove('jump-highlight'), JUMP_HIGHLIGHT_MS);
}

function highlightHash(hash) {
  if (!hash || hash.length < 2) return;
  let el;
  try { el = document.querySelector(decodeURIComponent(hash)); } catch (e) { return; }
  if (el) afterScrollSettles(() => flashElement(el));
}

function initJumpHighlight() {
  // Same-page links: <a href="#section">
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    highlightHash(link.getAttribute('href'));
  });

  // Arriving from another page (e.g. injury-severity.html#mortality-risk).
  // Charts load asynchronously and change the page height, so wait for load.
  if (location.hash) {
    window.addEventListener('load', () => highlightHash(location.hash), { once: true });
  }
}

/**
 * Theme switch as headlights: the new theme spreads out from the sun / moon
 * button in a widening circle, with a warm flash of light at the button.
 * Uses the browser's View Transitions; without them (or with reduced
 * motion) the theme simply switches.
 */
function switchThemeWithHeadlights(btn) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduced) { SiteTheme.toggle(); return; }

  const r = btn.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const root = document.documentElement;
  // The page is captured as flat pictures during the sweep, and a picture
  // cannot keep the nav's live background blur (it would turn see-through).
  // So for those 0.7 s the nav gets a near-solid fill that looks the same.
  root.classList.add('theme-sweeping');

  const flash = document.createElement('div');
  flash.className = 'headlight-flash';
  flash.style.setProperty('--hx', `${x}px`);
  flash.style.setProperty('--hy', `${y}px`);

  const t = document.startViewTransition(() => SiteTheme.toggle());
  t.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 720, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' });
    document.body.appendChild(flash);
    flash.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' })
      .finished.then(() => flash.remove(), () => flash.remove());
  }).catch(() => {});
  t.finished.finally(() => root.classList.remove('theme-sweeping'));
}

/**
 * Lane-line parallax (plan §10): the yellow dashes in the hero and the
 * chapter band slide left as the page scrolls down, like road markings
 * passing under a car. Decorative only; off under reduced motion.
 */
(function laneParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const run = () => {
    const els = [...document.querySelectorAll('.apple-hero, .chapter-band')];
    if (!els.length) return;
    let queued = false;
    const paint = () => {
      queued = false;
      const vh = innerHeight;
      els.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;            // off screen: leave it
        // Distance the band has travelled through the viewport, in px
        el.style.setProperty('--lane-shift', `${Math.round(-(vh - r.top) * 0.45)}px`);
      });
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(paint); } }, { passive: true });
    addEventListener('resize', paint, { passive: true });
    paint();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
