/* ═══════════════════════════════════════════════════════════════
   motion.js – Shared motion & micro-interactions (plan §4, §6.6, §6.7)
   COS30045 Data Visualisation Project

   - Chart entrances: each chart animates once, the first time it
     scrolls into view (bars grow, lines draw, map states fade in by
     rank). Works for every chart without touching the chart classes:
     it animates CSS transforms / clip-paths with the Web Animations
     API, so it never fights D3's own attribute transitions.
   - Count-up key numbers, reading-progress lane line, hint chips,
     sliding pill on segmented controls, tap-away tooltip dismissal.
   - prefers-reduced-motion: everything renders in its final state.
   - No JS / no IntersectionObserver: content is simply shown.
   ═══════════════════════════════════════════════════════════════ */

const Motion = (function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAN_HOVER = window.matchMedia('(hover: hover)').matches;
  const HAS_IO = 'IntersectionObserver' in window;
  const HAS_WAAPI = 'animate' in Element.prototype;
  const ANIMATE = !REDUCED && HAS_IO && HAS_WAAPI;
  const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

  /** Duration helper for D3 code: 0 under reduced motion */
  const dur = ms => (REDUCED ? 0 : ms);

  /** Run cb once, the first time el is at least `threshold` visible */
  function whenVisible(el, cb, threshold = 0.3) {
    if (!HAS_IO) { cb(); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); cb(); }
    }, { threshold });
    io.observe(el);
  }

  /** Call cb(svg) once the container holds a drawn <svg> */
  function whenDrawn(container, cb) {
    const find = () => {
      const svg = container.querySelector(':scope > svg');
      return svg && svg.childElementCount ? svg : null;
    };
    const now = find();
    if (now) { cb(now); return; }
    const mo = new MutationObserver(() => {
      const svg = find();
      if (svg) { mo.disconnect(); cb(svg); }
    });
    mo.observe(container, { childList: true, subtree: true });
  }

  // ── Chart entrances ────────────────────────────────────────────
  const fadeIn = (el, delay, duration = 400) => el.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration, delay, easing: 'ease-out', fill: 'backwards' });

  /** Light-to-dark order of a fill colour (darker = more cases = earlier) */
  function darkness(el) {
    const c = d3.color(el.getAttribute('fill'));
    return c ? 1 - d3.hsl(c).l : 0;
  }

  function animateMap(svg) {
    const states = [...svg.querySelectorAll('.map-states path')]
      .sort((a, b) => darkness(b) - darkness(a));
    states.forEach((p, i) => {
      p.style.transformBox = 'fill-box';
      p.style.transformOrigin = 'center';
      p.animate(
        [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 600, delay: i * 90, easing: EASE_OUT, fill: 'backwards' });
    });
    svg.querySelectorAll('.map-labels, .map-legend, .map-year-mark')
      .forEach(el => fadeIn(el, states.length * 90 + 250));
  }

  /** Charts built on Vis.BaseChart: wipe the plot layer left → right */
  function animatePlotLayer(svg) {
    const plot = svg.querySelector('.plot-layer');
    plot.animate(
      [{ clipPath: 'inset(-20px 100% -20px -20px)' }, { clipPath: 'inset(-20px -400px -20px -20px)' }],
      { duration: 1000, easing: EASE_OUT, fill: 'backwards' });
    svg.querySelectorAll('.annotations-layer, .legend-layer').forEach(el => fadeIn(el, 650));
  }

  /** Overview charts (main-narrative.js): bars rise, the line draws */
  function animateOverview(svg) {
    const bars = [...svg.querySelectorAll('.chart-bar')];
    bars.forEach((b, i) => {
      b.style.transformBox = 'fill-box';
      b.style.transformOrigin = '50% 100%';
      b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
        { duration: 750, delay: i * 70, easing: EASE_OUT, fill: 'backwards' });
    });
    svg.querySelectorAll('path').forEach(p => {
      if (p.closest('.tick, .grid') || p.getAttribute('fill') !== 'none' || !p.getAttribute('stroke')) return;
      const len = p.getTotalLength();
      if (len < 50) return;
      p.style.strokeDasharray = `${len}`;
      const a = p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: 1300, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'backwards' });
      a.onfinish = () => { p.style.strokeDasharray = ''; };
    });
    const dots = [...svg.querySelectorAll('.trend-dot')];
    dots.forEach((d, i) => fadeIn(d, 200 + (i / Math.max(1, dots.length - 1)) * 1100, 250));
    const lastMark = bars.length ? bars.length * 70 + 600 : 1300;
    svg.querySelectorAll('.annotation-text').forEach(t => fadeIn(t, lastMark));
  }

  /** Anything else (summary charts): wipe the whole SVG left → right */
  function animateWhole(svg) {
    svg.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      { duration: 900, easing: EASE_OUT, fill: 'backwards' });
  }

  function animateSvg(svg) {
    if (svg.querySelector('.map-states')) animateMap(svg);
    else if (svg.querySelector('.plot-layer')) animatePlotLayer(svg);
    else if (svg.querySelector('.chart-bar, .trend-dot')) animateOverview(svg);
    else animateWhole(svg);
  }

  function revealCharts(root = document) {
    if (!ANIMATE) return;
    root.querySelectorAll('.responsive-svg-container, .summary-chart-svg').forEach(container => {
      if (container.dataset.reveal === 'off' || container.dataset.revealBound) return;
      container.dataset.revealBound = '1';
      container.classList.add('reveal-wait');
      whenVisible(container, () => whenDrawn(container, svg => {
        container.classList.remove('reveal-wait');
        try { animateSvg(svg); } catch (e) { /* never leave a chart hidden */ }
      }), 0.25);
    });
  }

  // ── Count-up numbers ───────────────────────────────────────────
  const NUM_RE = /^(\D*?)([+\-−]?)(\d[\d,]*(?:\.\d+)?)(.*)$/s;

  function countUp(el, duration = 1200) {
    const text = el.textContent.trim();
    const m = text.match(NUM_RE);
    if (!m || REDUCED) return;
    const [, pre, sign, num, post] = m;
    const target = parseFloat(num.replace(/,/g, ''));
    const decimals = (num.split('.')[1] || '').length;
    const commas = num.includes(',');
    const fmt = v => {
      const s = v.toFixed(decimals);
      return commas ? Number(s).toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : s;
    };
    const t0 = performance.now();
    el.setAttribute('aria-label', text);         // screen readers get the final value at once
    (function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${pre}${sign}${fmt(target * eased)}${post}`;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = text;
    })(t0);
  }

  function countUpOnView(el) {
    if (!el || el.dataset.counted) return;
    el.dataset.counted = '1';
    whenVisible(el, () => countUp(el), 0.6);
  }

  // ── Reading progress (lane line under the nav) ─────────────────
  function initProgress() {
    const bar = document.querySelector('.read-progress span');
    if (!bar) return;
    let queued = false;
    const paint = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    paint();
  }

  // ── Hint chips: "Tap a state to zoom" instead of a paragraph ───
  const POINTER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-.8"/><path d="m6 12-1.9 2"/><path d="M7.2 2.2 8 5.1"/><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"/></svg>';

  function hintText(raw) {
    return raw
      .replace(/\{Hover\}/g, CAN_HOVER ? 'Hover' : 'Tap')
      .replace(/\{Click\}/g, CAN_HOVER ? 'Click' : 'Tap')
      .replace(/\{hover\}/g, CAN_HOVER ? 'hover' : 'tap');
  }

  function storageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function storageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  function initHints() {
    document.querySelectorAll('[data-hint]').forEach(target => {
      if (target.dataset.hintBound) return;
      target.dataset.hintBound = '1';
      const text = hintText(target.dataset.hint);
      const key = `hint-seen:${target.id || text}`;
      if (storageGet(key)) return;

      const row = document.createElement('div');
      row.className = 'hint-row';
      row.innerHTML = `<span class="hint-chip" role="note">${POINTER_ICON}<span>${text}</span></span>`;
      target.parentNode.insertBefore(row, target);
      const chip = row.firstElementChild;

      whenVisible(target, () => { if (!REDUCED) chip.classList.add('is-pulsing'); }, 0.5);

      let dwell;
      const done = () => {
        clearTimeout(dwell);
        chip.classList.add('is-done');
        storageSet(key, '1');
        target.removeEventListener('pointerdown', done);
        target.removeEventListener('keydown', done);
        target.removeEventListener('pointerenter', startDwell);
      };
      // Hovering a chart for a moment counts as "found it"
      const startDwell = () => {
        clearTimeout(dwell);
        dwell = setTimeout(done, 900);
        target.addEventListener('pointerleave', () => clearTimeout(dwell), { once: true });
      };
      target.addEventListener('pointerdown', done);
      target.addEventListener('keydown', done);
      target.addEventListener('pointerenter', startDwell);
    });
  }

  // ── Segmented controls: the selection pill slides ──────────────
  function initPills() {
    document.querySelectorAll('.apple-segmented-control').forEach(control => {
      if (control.querySelector('.seg-pill')) return;
      const pill = document.createElement('span');
      pill.className = 'seg-pill';
      pill.setAttribute('aria-hidden', 'true');
      control.prepend(pill);
      control.classList.add('has-pill');
      let first = true;
      const place = () => {
        const active = control.querySelector('.filter-btn.active');
        if (!active) { pill.style.opacity = '0'; return; }
        if (first) pill.style.transition = 'none';
        pill.style.opacity = '1';
        pill.style.width = `${active.offsetWidth}px`;
        pill.style.height = `${active.offsetHeight}px`;
        pill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
        if (first) { void pill.offsetWidth; pill.style.transition = ''; first = false; }
      };
      new MutationObserver(place).observe(control, { subtree: true, attributes: true, attributeFilter: ['class'] });
      if ('ResizeObserver' in window) new ResizeObserver(place).observe(control);
      place();
      document.fonts && document.fonts.ready.then(place);
    });
  }

  // ── Touch: tapping outside a chart closes its tooltip ─────────
  function initTooltipDismiss() {
    document.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || e.target.closest('svg')) return;
      document.querySelectorAll('.tooltip.visible').forEach(t => t.classList.remove('visible'));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    revealCharts();
    initHints();
    initPills();
    initProgress();
    initTooltipDismiss();
    document.querySelectorAll('[data-count-up]').forEach(countUpOnView);
  });

  return { REDUCED, CAN_HOVER, dur, whenVisible, countUp, countUpOnView, revealCharts, initHints, hintText };
})();
