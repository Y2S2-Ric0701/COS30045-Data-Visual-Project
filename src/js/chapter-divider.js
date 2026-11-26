/* ═══════════════════════════════════════════════════════════════
   chapter-divider.js – asphalt chapter band with two waffles (plan §5.3)
   "Pedestrians are 7% of patients but a quarter of deaths in hospital."
   Two 10 × 10 waffles (1 square = 1%) show the same group's share of
   hospital cases and of deaths in hospital, 2011–2019 (the years with
   death data, PERIOD.lastDeath). Numbers come from
   data/q5_severity/5.1+5.2+5.3_outcomes.csv, so the sentence and the
   squares always match the charts in Question 5.

   Markup (index.html, injury-severity.html):
     <section class="chapter-band" data-chapter-waffle="Pedestrian"> …
       <span data-waffle-text="cases"></span> … <div data-waffle="deaths"></div>
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const bands = document.querySelectorAll('[data-chapter-waffle]');
  if (!bands.length || typeof SiteData === 'undefined') return;

  const SIDE = 10, CELL = 22, GAP = 4;          // 10 × 10 squares
  const SIZE = SIDE * CELL + (SIDE - 1) * GAP;  // 256 view units

  /** "a quarter" reads better than "26%" in a headline, when it is true */
  function plainShare(p) {
    if (p >= 0.23 && p <= 0.27) return 'a quarter';
    if (p >= 0.31 && p <= 0.35) return 'a third';
    if (p >= 0.47 && p <= 0.53) return 'half';
    return `${Math.round(p * 100)}%`;
  }

  function drawWaffle(el, share, label) {
    const n = Math.round(share * 100);
    const svg = d3.select(el).append('svg')
      .attr('viewBox', `0 0 ${SIZE} ${SIZE}`)
      .attr('role', 'img')
      .attr('aria-label', `${n} of 100 squares filled: ${label}`);
    // Fill in reading order (top-left first), like counting people in rows
    const cells = svg.selectAll('rect').data(d3.range(100)).join('rect')
      .attr('class', i => (i < n ? 'waffle-cell is-on' : 'waffle-cell'))
      .attr('x', i => (i % SIDE) * (CELL + GAP))
      .attr('y', i => Math.floor(i / SIDE) * (CELL + GAP))
      .attr('width', CELL).attr('height', CELL).attr('rx', 4);
    return { cells, n };
  }

  function animate(waffles) {
    if (Motion.REDUCED) return;
    waffles.forEach(({ cells, n }) => {
      cells.filter(i => i < n)
        .transition().delay(i => 250 + i * Math.min(45, 900 / n)).duration(Motion.dur(220))
        .on('start', function () { d3.select(this).classed('is-on', true); });
    });
  }

  SiteData.severity().then(rows => {
    const last = (typeof PERIOD !== 'undefined' && PERIOD.lastDeath) || 2019;
    const first = (typeof PERIOD !== 'undefined' && PERIOD.first) || 2011;
    const sel = rows.filter(d => d.year >= first && d.year <= last);
    const total = { cases: d3.sum(sel, d => +d.cases || 0), deaths: d3.sum(sel, d => +d.deaths || 0) };

    bands.forEach(band => {
      const who = band.dataset.chapterWaffle;
      const mine = sel.filter(d => d.road_user === who);
      const share = {
        cases: total.cases ? d3.sum(mine, d => +d.cases || 0) / total.cases : 0,
        deaths: total.deaths ? d3.sum(mine, d => +d.deaths || 0) / total.deaths : 0,
      };

      band.querySelectorAll('[data-waffle-text]').forEach(t => {
        const [kind, style] = t.dataset.waffleText.split(':');
        t.textContent = style === 'plain' ? plainShare(share[kind]) : `${Math.round(share[kind] * 100)}%`;
      });
      band.querySelectorAll('[data-waffle-years]').forEach(t => { t.textContent = `${first}–${last}`; });

      const waffles = [...band.querySelectorAll('[data-waffle]')].map(el => {
        const kind = el.dataset.waffle;
        const label = kind === 'deaths' ? 'share of all deaths in hospital' : 'share of all hospital cases';
        return drawWaffle(el, share[kind], label);
      });
      band.classList.add('is-ready');

      // Squares fill in when the band scrolls into view
      if (!Motion.REDUCED) {
        waffles.forEach(w => w.cells.classed('is-on', false));
        Motion.whenVisible(band, () => animate(waffles), 0.35);
      }
    });
  }).catch(err => console.error('[chapter-divider]', err));
})();
