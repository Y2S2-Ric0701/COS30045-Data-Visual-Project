/* ═══════════════════════════════════════════════════════════════
   scrolly.js – "The story in one chart" (Overview page)
   COS30045 Data Visualisation Project

   One chart stays pinned while the five question steps scroll past.
   Each step swaps what the eight road-user bars measure (cases, change,
   share outside cities, crashes with no other vehicle, deaths per 1,000),
   re-sorts them and highlights that step's group. The step whose middle
   crosses the middle of the screen is the active one. Under reduced
   motion the bars change without moving.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const section = document.getElementById('story-in-one');
  const chartEl = document.getElementById('scrolly-chart');
  if (!section || !chartEl || typeof SiteData === 'undefined') return;

  const steps = [...section.querySelectorAll('.scrolly-step')];
  const qEl = document.getElementById('scrolly-q');
  const measureEl = document.getElementById('scrolly-caption');
  const USERS = ROAD_USERS.filter(r => r.key !== 'Other or not recorded');
  const SHORT = {
    'Truck occupant': 'Truck occ.', 'Ute or van occupant': 'Ute/van occ.', 'Bus occupant': 'Bus occ.',
    'Car passenger': 'Car passeng.',
  };
  const fmt = d3.format(',');
  const pct = d3.format('.0%');
  const signed = v => `${v >= 0 ? '+' : '−'}${pct(Math.abs(v))}`;
  const first = PERIOD.first, last = PERIOD.last, lastDeath = PERIOD.lastDeath;

  let STEPS = null;     // built once the data is in
  let active = 'who';
  let svg = null, drawnWidth = 0;

  Promise.all([SiteData.roadUsers(), SiteData.remoteness(), SiteData.crashes(), SiteData.severity()])
    .then(([users, areas, crashes, outcomes]) => {
      STEPS = buildSteps(users, areas, crashes, outcomes);
      draw(false);
      watchSteps();
      watchWheel();
      watchResize();
    })
    .catch(err => console.error('Error loading the scrollytelling data:', err));

  function buildSteps(users, areas, crashes, outcomes) {
    const sumOf = (rows, field, pick = () => true) => {
      const m = new Map(USERS.map(u => [u.key, 0]));
      rows.forEach(d => { if (m.has(d.road_user) && pick(d)) m.set(d.road_user, m.get(d.road_user) + (+d[field] || 0)); });
      return m;
    };
    const ratio = (a, b) => new Map(USERS.map(u => [u.key, b.get(u.key) ? a.get(u.key) / b.get(u.key) : 0]));
    // Reference lines cover every road user, "Other or not recorded" included,
    // so they match the totals quoted on the rest of the site
    const total = (rows, field, pick = () => true) => d3.sum(rows.filter(pick), d => +d[field] || 0);

    const cases = sumOf(users, 'hospitalisations');
    const y0 = sumOf(users, 'hospitalisations', d => d.year === first);
    const y1 = sumOf(users, 'hospitalisations', d => d.year === last);
    const change = new Map(USERS.map(u => [u.key, (y1.get(u.key) - y0.get(u.key)) / y0.get(u.key)]));

    const known = sumOf(areas, 'hospitalisations', d => d.remoteness !== 'Missing');
    const outside = sumOf(areas, 'hospitalisations', d => d.remoteness === 'Regional' || d.remoteness === 'Remote');

    const recorded = sumOf(crashes, 'cases', d => d.counterparty !== 'Not recorded');
    const alone = sumOf(crashes, 'cases', d => d.counterparty === 'No other vehicle');

    const deathRows = SiteData.inYears(outcomes, [first, lastDeath]);
    const dCases = sumOf(deathRows, 'cases');
    const deaths = sumOf(deathRows, 'deaths');
    const rate = new Map(USERS.map(u => [u.key, dCases.get(u.key) ? (deaths.get(u.key) / dCases.get(u.key)) * 1000 : 0]));

    return {
      who: {
        q: 'Q1', measure: `Hospitalised, ${rangeText([first, last])}`,
        values: cases, format: v => fmt(v), axis: d3.format('~s'), highlight: ['Car driver'],
      },
      trend: {
        q: 'Q2', measure: `Change in cases, ${first} to ${last}`,
        values: change, format: signed, axis: d3.format('+.0%'), highlight: ['Pedal cyclist'],
        ref: { value: total(users, 'hospitalisations', d => d.year === last) / total(users, 'hospitalisations', d => d.year === first) - 1, label: 'All road users' },
      },
      where: {
        q: 'Q3', measure: 'Share who live outside the major cities',
        values: ratio(outside, known), format: pct, axis: pct, highlight: ['Truck occupant'],
        ref: { value: total(areas, 'hospitalisations', d => d.remoteness === 'Regional' || d.remoteness === 'Remote') / total(areas, 'hospitalisations', d => d.remoteness !== 'Missing'), label: 'All road users' },
      },
      crash: {
        q: 'Q4', measure: 'Share hurt with no other vehicle involved',
        values: ratio(alone, recorded), format: pct, axis: pct, highlight: ['Pedal cyclist', 'Motorcyclist'],
        ref: { value: total(crashes, 'cases', d => d.counterparty === 'No other vehicle') / total(crashes, 'cases', d => d.counterparty !== 'Not recorded'), label: 'All road users' },
      },
      severity: {
        q: 'Q5', measure: `Deaths in hospital for every 1,000 patients, ${rangeText([first, lastDeath])}`,
        values: rate, format: d3.format('.1f'), axis: d3.format('~'), highlight: ['Pedestrian'],
        ref: { value: (total(deathRows, 'deaths') / total(deathRows, 'cases')) * 1000, label: 'All road users' },
      },
    };
  }

  function build() {
    chartEl.innerHTML = '';
    drawnWidth = Math.floor(chartEl.clientWidth) || 600;
    const compact = drawnWidth < 520;
    const m = { top: 30, right: compact ? 58 : 76, bottom: 30, left: compact ? 96 : 150 };
    const rowH = compact ? 30 : 42;
    const H = m.top + m.bottom + USERS.length * rowH;
    svg = d3.select(chartEl).append('svg')
      .attr('width', drawnWidth).attr('height', H).attr('viewBox', `0 0 ${drawnWidth} ${H}`)
      .attr('role', 'img').attr('class', 'scrolly-svg');
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const fig = section.querySelector('.scrolly-graphic');
    if (fig) section.style.setProperty('--scrolly-h', `${Math.ceil(fig.getBoundingClientRect().height)}px`);   // svg is already in place
    svg.node().__layout = { m, rowH, compact, g, innerW: drawnWidth - m.left - m.right, innerH: USERS.length * rowH };
    g.append('g').attr('class', 'scrolly-axis');
    g.append('g').attr('class', 'scrolly-rows');
    g.append('g').attr('class', 'scrolly-ref');
    g.append('line').attr('class', 'scrolly-zero');
  }

  function draw(animate = true) {
    if (!STEPS) return;
    if (!svg || Math.abs((Math.floor(chartEl.clientWidth) || 600) - drawnWidth) > 2) { build(); animate = false; }
    const s = STEPS[active];
    const L = svg.node().__layout;
    const { g, rowH, innerW, innerH, compact } = L;
    const ms = animate ? Motion.dur(800) : 0;
    const t = svg.transition().duration(ms).ease(d3.easeCubicInOut);

    qEl.textContent = s.q;
    measureEl.textContent = s.measure;

    const rows = USERS.map(u => ({ key: u.key, label: compact ? (SHORT[u.key] || u.plural) : u.plural, color: u.color, value: s.values.get(u.key) }))
      .sort((a, b) => b.value - a.value);
    const vals = rows.map(d => d.value).concat(s.ref ? [s.ref.value] : []);
    const lo = Math.min(0, d3.min(vals)), hi = Math.max(0, d3.max(vals));
    const x = d3.scaleLinear().domain([lo, hi]).range([0, innerW]).nice();
    const y = d3.scaleBand().domain(rows.map(d => d.key)).range([0, innerH]).padding(0.28);
    const on = d => s.highlight.includes(d.key);

    svg.attr('aria-label', `${s.q}. ${s.measure}: ` + rows.map(d => `${roadUserPlural(d.key)} ${s.format(d.value)}`).join(', ') + '.');

    // Axis (light grid with a few ticks)
    // Each step measures something different, so the axis fades out and
    // back in with the new numbers rather than sliding the old ones across
    const axisG = g.select('.scrolly-axis');
    const paintAxis = sel => {
      sel.call(d3.axisTop(x).ticks(compact ? 3 : 5).tickSize(-innerH).tickFormat(s.axis));
      sel.selectAll('.domain').remove();
      sel.selectAll('line').style('stroke', 'var(--c-grid)');
      sel.selectAll('text').style('fill', 'var(--c-ink-3)').style('font-size', '12px');
    };
    axisG.interrupt();
    if (!ms) paintAxis(axisG.style('opacity', 1));
    else {
      axisG.transition().duration(ms * 0.3).style('opacity', 0)
        .on('end', function () { paintAxis(d3.select(this)); d3.select(this).transition().duration(ms * 0.5).style('opacity', 1); });
    }

    g.select('.scrolly-zero').transition(t)
      .attr('x1', x(0)).attr('x2', x(0)).attr('y1', -4).attr('y2', innerH)
      .style('stroke', 'var(--c-ink-3)').attr('stroke-width', 1);

    const row = g.select('.scrolly-rows').selectAll('.scrolly-row').data(rows, d => d.key)
      .join(enter => {
        const r = enter.append('g').attr('class', 'scrolly-row').attr('transform', d => `translate(0,${y(d.key)})`);
        r.append('rect').attr('class', 'scrolly-bar').attr('rx', 4).attr('x', x(0)).attr('width', 0).attr('height', y.bandwidth());
        r.append('text').attr('class', 'scrolly-name').attr('x', -10).attr('dy', '0.35em').attr('text-anchor', 'end');
        r.append('text').attr('class', 'scrolly-val').attr('dy', '0.35em');
        return r;
      });

    row.transition(t).attr('transform', d => `translate(0,${y(d.key)})`);
    row.select('.scrolly-bar')
      .style('fill', d => d.color)
      .transition(t)
      .attr('height', y.bandwidth())
      .attr('x', d => x(Math.min(0, d.value)))
      .attr('width', d => Math.max(1, Math.abs(x(d.value) - x(0))))
      .style('opacity', d => (on(d) ? 1 : 0.28));
    row.select('.scrolly-name')
      .attr('y', y.bandwidth() / 2)
      .text(d => d.label)
      .style('fill', d => (on(d) ? 'var(--c-ink)' : 'var(--c-ink-3)'))
      .style('font-weight', d => (on(d) ? 700 : 500))
      .style('font-size', compact ? '12.5px' : '14px');
    // Value labels fade out, take their new number, and fade back in at the
    // end of their bar, so a number never sits beside the wrong bar mid-move
    const valText = row.select('.scrolly-val')
      .attr('y', y.bandwidth() / 2).attr('text-anchor', 'start')
      .style('font-size', compact ? '12.5px' : '14px');
    const paintVal = sel => sel
      .text(d => s.format(d.value))
      .attr('x', d => Math.max(x(0), x(d.value)) + 6)   // falls go left, so their label sits right of zero
      .style('fill', d => (on(d) ? 'var(--c-ink)' : 'var(--c-ink-3)'))
      .style('font-weight', d => (on(d) ? 700 : 500));
    valText.interrupt();
    if (!ms) paintVal(valText.style('opacity', 1));
    else {
      valText.transition().duration(ms * 0.25).style('opacity', 0)
        .transition().delay(ms * 0.35).duration(ms * 0.4)
        .on('start', function () { paintVal(d3.select(this)); })
        .style('opacity', 1);
    }   // falls go left, so their label sits right of zero

    // Reference line ("All road users")
    const ref = g.select('.scrolly-ref').selectAll('g').data(s.ref ? [s.ref] : [])
      .join(enter => {
        const r = enter.append('g').style('opacity', 0);
        r.append('line').attr('y1', -4).attr('y2', innerH).attr('stroke-dasharray', '4 3').attr('stroke-width', 1.5);
        r.append('text').attr('y', innerH + 18).attr('text-anchor', 'middle').style('font-size', '12px').style('font-weight', 600);
        return r;
      });
    ref.select('line').style('stroke', 'var(--c-ink)');
    ref.select('text').style('fill', 'var(--c-ink)').text(d => `${d.label}: ${s.format(d.value)}`);
    ref.transition(t).style('opacity', 1).attr('transform', d => `translate(${x(d.value)},0)`);
  }

  /** A 2px line across the middle of the visible area below the nav (the
   *  same middle the chart is pinned to and the page snaps steps to) */
  function middleLine() {
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const mid = Math.round(pad + (window.innerHeight - pad) / 2);
    return `-${mid - 1}px 0px -${Math.max(0, window.innerHeight - mid - 1)}px 0px`;
  }

  /** The step whose middle is nearest the middle of the screen is active */
  function watchSteps() {
    const setActive = key => {
      steps.forEach(el => el.classList.toggle('is-active', el.dataset.step === key));
      if (key === active) return;
      active = key;
      draw(true);
    };
    steps[0].classList.add('is-active');
    if (!('IntersectionObserver' in window)) return;
    // Wide screens: the trigger line is the middle of the screen. Phones pin
    // the chart at the top, so the line sits lower, where a card first shows
    // below the chart.
    const narrow = window.matchMedia('(max-width: 860px)');
    let io = null;
    const observe = () => {
      if (io) io.disconnect();
      io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.dataset.step); });
      }, { rootMargin: narrow.matches ? '-74% 0px -24% 0px' : middleLine() });
      steps.forEach(el => io.observe(el));
    };
    observe();
    if (narrow.addEventListener) narrow.addEventListener('change', observe);
    let rt = null;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(observe, 200); });
    // Keyboard users: focusing a step's link activates that step
    steps.forEach(el => el.addEventListener('focusin', () => setActive(el.dataset.step)));
  }

  /**
   * Mouse wheel on wide screens: two notches move one question, and the
   * new step glides to the middle, level with the chart. Only while the
   * chart is pinned: above the first question and below the last one the
   * page scrolls as usual. Trackpads (many small deltas) add up pixels
   * instead. Keyboard, scrollbar and touch scrolling are left alone.
   */
  function watchWheel() {
    const narrow = window.matchMedia('(max-width: 860px)');
    const NOTCHES = 2, TRACKPAD_PX = 220;
    let notches = 0, px = 0, lastDir = 0, idle = null, busyUntil = 0;
    const midY = () => {
      const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      return pad + (window.innerHeight - pad) / 2;
    };
    const offsets = () => steps.map(el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2 - midY(); });
    const glideTo = i => {
      const off = offsets()[i];
      window.scrollTo({ top: window.scrollY + off, behavior: Motion.REDUCED ? 'auto' : 'smooth' });
      busyUntil = performance.now() + (Motion.REDUCED ? 80 : 520);
    };
    window.addEventListener('wheel', e => {
      if (narrow.matches || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (!dy) return;
      const dir = Math.sign(dy);
      const off = offsets();
      const last = off.length - 1;
      // Only while a step can line up with the pinned chart
      if (off[0] > 2 || off[last] < -2) return;               // section not pinned yet / already past
      if (dir > 0 && Math.abs(off[last]) <= 2) return;        // at the last question: let the page go on
      if (dir < 0 && Math.abs(off[0]) <= 2) return;           // at the first question: let the page go back
      e.preventDefault();
      if (performance.now() < busyUntil) return;
      // Nearest step; if it is not lined up yet, line it up first
      let cur = 0;
      off.forEach((o, i) => { if (Math.abs(o) < Math.abs(off[cur])) cur = i; });
      if (Math.abs(off[cur]) > 24) { notches = 0; px = 0; glideTo(cur); return; }
      if (dir !== lastDir) { notches = 0; px = 0; lastDir = dir; }
      clearTimeout(idle);
      idle = setTimeout(() => { notches = 0; px = 0; }, 1500);
      if (Math.abs(dy) >= 40) notches += 1; else px += Math.abs(dy);
      if (notches >= NOTCHES || px >= TRACKPAD_PX) {
        notches = 0; px = 0;
        glideTo(Math.max(0, Math.min(last, cur + dir)));
      }
    }, { passive: false });
  }

  function watchResize() {
    if (typeof ResizeObserver === 'undefined') return;
    let timer = null;
    new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (Math.abs((Math.floor(chartEl.clientWidth) || 0) - drawnWidth) > 2) draw(false);
      }, 120);
    }).observe(chartEl);
  }

  document.addEventListener('themechange', () => draw(false));
})();
