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

// Single source of truth for page links – add/rename pages here only
const NAV_PAGES = [
  { key: 'home',      href: 'index.html',                  label: 'Overview' },
  { key: 'who',       href: 'who-is-affected.html',        label: 'Who' },
  { key: 'trends',    href: 'trends-over-time.html',       label: 'Trends' },
  { key: 'where',     href: 'geographic-distribution.html', label: 'Where' },
  { key: 'crash',     href: 'crash-characteristics.html',  label: 'Crash Factors' },
  { key: 'severity',  href: 'injury-severity.html',        label: 'Severity' },
];

function renderNav(activeKey) {
  const links = NAV_PAGES.map(p => {
    const isActive = p.key === activeKey;
    return `<a href="${p.href}"${isActive ? ' class="active" aria-current="page"' : ''}>${p.label}</a>`;
  }).join('');

  return `
  <nav class="apple-nav">
    <div class="apple-nav-inner">
      <a href="index.html" class="apple-nav-brand">
        <span class="apple-brand-badge">COS30045</span>
        <span class="apple-brand-title">Road Crash Analytics</span>
      </a>
      <button class="apple-nav-toggle" type="button" aria-label="Open menu"
              aria-expanded="false" aria-controls="site-nav-links">
        <span></span><span></span><span></span>
      </button>
      <div class="apple-nav-links" id="site-nav-links">${links}</div>
    </div>
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

// Runs immediately (script is placed after the placeholders), so no
// flash of missing nav while waiting for DOMContentLoaded
(function injectLayout() {
  const navSlot = document.getElementById('site-nav');
  const footerSlot = document.getElementById('site-footer');
  const activeKey = document.body.dataset.page;

  if (navSlot) navSlot.outerHTML = renderNav(activeKey);
  if (footerSlot) footerSlot.outerHTML = renderFooter();

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
