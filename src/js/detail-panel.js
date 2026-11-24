/* ═══════════════════════════════════════════════════════════════
   detail-panel.js – drill-down detail panel (plan §6.4)
   Click a state (Question 3) or a road user (Question 1) to open a panel
   with its 2011–2021 sparkline, total, share, rank and change compared
   with Australia. It slides in from the right on wide screens and rises
   as a bottom sheet on phones.

   DetailPanel.open({
     kicker, title,
     series: { years: [...], values: [...], color, band: [y0, y1] },
     stats:  [{ label, value, note }],
     note,                       // optional caveat under the stats
     returnFocus,                // element to focus again on close
     onClose,
   })
   DetailPanel.close()
   DetailPanel.isOpen()

   Keyboard: focus moves to the panel title; Esc closes it and focus
   returns to the mark that opened it. The panel is not modal: the
   charts stay usable, so the reader can click another state.
   ═══════════════════════════════════════════════════════════════ */
const DetailPanel = (function () {
  'use strict';

  let panel = null;
  let lastOpts = null;
  let closeTimer = null;
  const fmt = d3.format(',');

  function build() {
    panel = document.createElement('aside');
    panel.className = 'detail-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'detail-panel-title');
    panel.hidden = true;
    panel.innerHTML = `
      <div class="detail-head">
        <div>
          <p class="detail-kicker"></p>
          <h2 class="detail-title" id="detail-panel-title" tabindex="-1"></h2>
        </div>
        <button type="button" class="detail-close" aria-label="Close details">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="detail-chart"></div>
      <dl class="detail-stats"></dl>
      <p class="detail-note"></p>`;
    document.body.appendChild(panel);
    panel.querySelector('.detail-close').addEventListener('click', () => close());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen()) { e.stopPropagation(); close(); }
    }, true);
  }

  function isOpen() { return !!panel && !panel.hidden && panel.classList.contains('is-open'); }

  function drawSpark(el, s) {
    el.innerHTML = '';
    if (!s || !s.values || !s.values.length) return;
    const W = 320, H = 96, m = { t: 14, r: 12, b: 20, l: 12 };
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img')
      .attr('aria-label', `${s.years[0]} to ${s.years[s.years.length - 1]}: from ${fmt(s.values[0])} to ${fmt(s.values[s.values.length - 1])} per year`);
    const x = d3.scaleLinear().domain(d3.extent(s.years)).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, d3.max(s.values) * 1.1 || 1]).range([H - m.b, m.t]);
    if (s.band && s.band[0] < s.band[1]) {
      svg.append('rect').attr('x', x(s.band[0])).attr('width', x(s.band[1]) - x(s.band[0]))
        .attr('y', m.t - 6).attr('height', H - m.b - m.t + 6).attr('fill', 'rgba(10, 95, 194, 0.08)');
    }
    const pts = s.years.map((yr, i) => [x(yr), y(s.values[i])]);
    svg.append('path').attr('d', d3.area().x(d => d[0]).y0(H - m.b).y1(d => d[1]).curve(d3.curveMonotoneX)(pts))
      .attr('fill', s.color || '#0A5FC2').attr('opacity', 0.12);
    svg.append('path').attr('d', d3.line().curve(d3.curveMonotoneX)(pts))
      .attr('fill', 'none').attr('stroke', s.color || '#0A5FC2').attr('stroke-width', 2.5);
    [0, pts.length - 1].forEach(i => {
      svg.append('circle').attr('cx', pts[i][0]).attr('cy', pts[i][1]).attr('r', 3.5).attr('fill', s.color || '#0A5FC2');
      svg.append('text').attr('class', 'detail-spark-label')
        .attr('x', pts[i][0]).attr('y', H - 4).attr('text-anchor', i ? 'end' : 'start').text(s.years[i]);
    });
  }

  function open(opts) {
    if (!panel) build();
    clearTimeout(closeTimer);
    const wasOpen = isOpen();
    lastOpts = opts;

    panel.querySelector('.detail-kicker').textContent = opts.kicker || '';
    panel.querySelector('.detail-title').textContent = opts.title || '';
    drawSpark(panel.querySelector('.detail-chart'), opts.series);
    panel.querySelector('.detail-stats').innerHTML = (opts.stats || []).map(s => `
      <div class="detail-stat">
        <dt>${s.label}</dt>
        <dd>${s.value}${s.note ? `<span class="detail-stat-note">${s.note}</span>` : ''}</dd>
      </div>`).join('');
    const note = panel.querySelector('.detail-note');
    note.textContent = opts.note || '';
    note.hidden = !opts.note;

    // The chart tooltip would sit on top of the panel on a phone
    document.querySelectorAll('.tooltip.visible').forEach(t => t.classList.remove('visible'));
    panel.hidden = false;
    // next frame, so the slide-in transition runs
    requestAnimationFrame(() => {
      panel.classList.add('is-open');
      if (opts.focus !== false) panel.querySelector('.detail-title').focus({ preventScroll: true });
    });
  }

  function close() {
    if (!panel || panel.hidden) return;
    panel.classList.remove('is-open');
    const opts = lastOpts;
    closeTimer = setTimeout(() => { panel.hidden = true; }, Motion.dur(260));
    if (opts && opts.returnFocus && document.contains(opts.returnFocus)) {
      opts.returnFocus.focus({ preventScroll: true });
    }
    if (opts && opts.onClose) opts.onClose();
    lastOpts = null;
  }

  return { open, close, isOpen };
})();
