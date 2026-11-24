/* ═══════════════════════════════════════════════════════════════
   main-narrative.js – Overview page: hero, key numbers, Figures 1 & 2
   COS30045 Data Visualisation Project
   ═══════════════════════════════════════════════════════════════ */

// Cached dataset across filters
let stateRows = [];   // data/q3_where/3.1+3.3_states.csv: year × state (+ national Total)
let activeFilter = 'all';

// Tooltip popover singleton
let tooltip;

/**
 * Initialize the Apple-style popover tooltip
 */
function initTooltip() {
  tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .attr('role', 'status')
    .attr('aria-live', 'polite');
}

/**
 * Show tooltip popover
 */
function showTooltip(event, title, rows) {
  let content = `<div class="tooltip-title">${title}</div>`;
  rows.forEach(r => {
    content += `
      <div class="tooltip-row">
        <span>${r.label}</span>
        <span class="${r.highlight ? 'tooltip-accent' : 'tooltip-val'}">${r.value}</span>
      </div>`;
  });

  tooltip
    .html(content)
    .attr('class', 'tooltip visible');

  positionTooltip(event);
}

/**
 * Position tooltip smoothly relative to pointer
 */
function positionTooltip(event) {
  const pad = 12;
  const node = tooltip.node();
  const tipW = node ? node.offsetWidth : 0;
  // Flip to the left of the pointer if it would overflow the screen edge
  const x = (event.clientX + pad + tipW > window.innerWidth - 8)
    ? Math.max(8, event.pageX - pad - tipW)
    : event.pageX + pad;
  // Flip above the pointer if it would run off the bottom of the screen
  const tipH = node ? node.offsetHeight : 0;
  const y = (event.clientY - 28 + tipH > window.innerHeight - 8)
    ? Math.max(window.scrollY + 8, event.pageY - tipH - pad)
    : event.pageY - 28;
  tooltip
    .style('left', `${x}px`)
    .style('top', `${y}px`);
}

/**
 * Hide tooltip
 */
function hideTooltip() {
  tooltip.attr('class', 'tooltip');
}

/**
 * Create a responsive SVG sized to its container's real pixel width.
 * Because the viewBox matches the on-screen width, CSS font sizes render
 * at their true size on phones, tablets and desktops (no shrinking).
 *
 * @param {string} selector
 * @returns {{g: d3.Selection, innerWidth: number, innerHeight: number, compact: boolean}}
 */
function createResponsiveSVG(selector) {
  const container = d3.select(selector);
  container.selectAll('*').remove(); // clear prior renders

  const node = container.node();
  const width = Math.max(300, Math.round(node.getBoundingClientRect().width || WIDTH));
  const compact = width < 600;                       // phones / narrow tablets
  const height = Math.round(Math.min(HEIGHT, Math.max(340, width * 0.6)));
  const margin = compact
    ? { top: 40, right: 8, bottom: 64, left: 56 }
    : { top: 44, right: 24, bottom: 64, left: 84 };

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('role', 'img');

  return {
    g: svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`),
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom,
    margin,
    compact,
  };
}

/**
 * Shared bar gradient (light = fewer, dark = more) – same range as
 * Vis.barGradient in vis-components.js so all pages match.
 */
function barGradient(domain) {
  return d3.scaleSequential()
    .domain(domain)
    .interpolator(t => d3.interpolateBlues(0.3 + t * 0.7));
}

/** Figure 1 legend: gradient key normally, accent key when a state is selected */
function updateRegionalLegend(filterState) {
  const box = document.getElementById('chart-1-legend');
  if (!box) return;
  box.innerHTML = filterState === 'all'
    ? `<span class="legend-chip">Fewer <span class="swatch swatch-gradient"></span> More hospitalisations</span>`
    : `<span class="legend-chip"><span class="swatch swatch-accent"></span> Selected: ${stateLabel(filterState)}</span>
       <span class="legend-chip"><span class="swatch swatch-gradient swatch-faded"></span> Other jurisdictions</span>`;
}


const STATE_CODES = Object.keys(STATE_NAMES);

/**
 * Key numbers, calculated from the data so they always match the charts:
 * latest-year total and change since 2011, the three big states' share,
 * and the fastest-rising road user.
 */
function updateKeyNumbers(states, people) {
  const first = states.find(d => d.year === PERIOD.first);
  const last = states.find(d => d.year === PERIOD.last);
  const fmtPct0 = d3.format('.0%');
  const signed = v => `${v >= 0 ? '+' : '−'}${fmtPct0(Math.abs(v))}`;
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setText('callout-year', String(last.year));
  setText('callout-total', last.Total.toLocaleString());
  setText('callout-change', signed((last.Total - first.Total) / first.Total));
  setText('callout-change-label', `since ${first.year} (Figure 2.1)`);

  const sumOf = st => d3.sum(states, d => d[st]);
  const allStates = d3.sum(STATE_CODES, sumOf);
  setText('callout-states', fmtPct0((sumOf('NSW') + sumOf('VIC') + sumOf('QLD')) / allStates));

  const byUserYear = SiteData.sumBy(people, d => `${d.road_user}|${d.year}`, ['hospitalisations']);
  const val = (ru, y) => (byUserYear.get(`${ru}|${y}`) || {}).hospitalisations || 0;
  const riser = d3.greatest(ROAD_USERS, r => (val(r.key, last.year) - val(r.key, first.year)) / val(r.key, first.year));
  const change = (val(riser.key, last.year) - val(riser.key, first.year)) / val(riser.key, first.year);
  setText('callout-riser', riser.plural);
  setText('callout-riser-change', signed(change));

  // Sparklines under each number: the same measure, every year 2011–2021
  const big3 = d => (d.NSW + d.VIC + d.QLD) / d3.sum(STATE_CODES, st => d[st]);
  drawSpark('#spark-total', states.map(d => ({ year: d.year, value: d.Total })), '#0072B2');
  drawSpark('#spark-states', states.map(d => ({ year: d.year, value: big3(d) })), '#0072B2');
  drawSpark('#spark-riser', YEARS.map(y => ({ year: y, value: val(riser.key, y) })), riser.color);

  ['callout-total', 'callout-states'].forEach(id => Motion.countUpOnView(document.getElementById(id)));
}

/**
 * Tiny line chart (2011–2021) under a key number. Start and end values
 * are labelled so the trend can be read without hovering.
 */
function drawSpark(selector, series, color) {
  const box = d3.select(selector);
  if (box.empty()) return;
  box.selectAll('*').remove();
  const W = 260, H = 40, padL = 2, padR = 2;
  const x = d3.scaleLinear().domain(d3.extent(series, d => d.year)).range([padL, W - padR]);
  const ext = d3.extent(series, d => d.value);
  const pad = (ext[1] - ext[0]) * 0.25 || 1;
  const y = d3.scaleLinear().domain([ext[0] - pad, ext[1] + pad]).range([H - 14, 4]);
  const svg = box.append('svg').attr('viewBox', `0 0 ${W} ${H}`);
  const area = d3.area().x(d => x(d.year)).y0(H - 14).y1(d => y(d.value)).curve(d3.curveMonotoneX);
  const line = d3.line().x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX);
  svg.append('path').datum(series).attr('d', area).attr('fill', color).attr('opacity', 0.1);
  const path = svg.append('path').datum(series).attr('d', line)
    .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('vector-effect', 'non-scaling-stroke');
  const end = series[series.length - 1];
  svg.append('circle').attr('cx', x(end.year)).attr('cy', y(end.value)).attr('r', 3.5).attr('fill', color);
  svg.append('text').attr('class', 'spark-cap').attr('x', padL).attr('y', H - 1).text(series[0].year);
  svg.append('text').attr('class', 'spark-cap').attr('x', W - padR).attr('y', H - 1)
    .attr('text-anchor', 'end').text(end.year);

  // Draw the line when the card scrolls into view
  if (!Motion.REDUCED && path.node().animate) {
    const len = path.node().getTotalLength();
    path.attr('stroke-dasharray', len).attr('stroke-dashoffset', len);
    Motion.whenVisible(box.node(), () => {
      path.transition().duration(1200).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0)
        .on('end', () => path.attr('stroke-dasharray', null));
    }, 0.6);
  }
}

/* ═══════════════════════════════════════════════════════════════
   HERO: "Every 13 minutes" + one day as 108 dots + live clock
   All three numbers come from the data (latest year), not hard-coded.
   ═══════════════════════════════════════════════════════════════ */
function renderHero(states, people) {
  const last = states.find(d => d.year === PERIOD.last);
  const perDay = last.Total / 365;
  const dots = Math.round(perDay);
  const minutes = (24 * 60) / perDay;
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  setText('hero-minutes', `${Math.round(minutes)} minutes`);
  setText('hero-per-day-text', `${dots} people a day`);

  // Road-user mix of the latest year, rounded to whole dots (largest remainder)
  const byUser = d3.rollup(people.filter(d => d.year === last.year), v => d3.sum(v, d => d.hospitalisations), d => d.road_user);
  const yearTotal = d3.sum([...byUser.values()]);
  const groups = ROAD_USERS.map(r => {
    const raw = ((byUser.get(r.key) || 0) / yearTotal) * dots;
    return Object.assign({}, r, { cases: byUser.get(r.key) || 0, raw, n: Math.floor(raw) });
  });
  const missing = dots - d3.sum(groups, g => g.n);
  [...groups].sort((a, b) => (b.raw - b.n) - (a.raw - a.n)).slice(0, missing).forEach(g => { g.n += 1; });
  groups.sort((a, b) => (a.key === 'Other or not recorded') - (b.key === 'Other or not recorded') || b.n - a.n);
  const units = groups.flatMap(g => d3.range(g.n).map(() => g));

  const host = d3.select('#hero-unit-chart');
  if (host.empty()) return;
  host.selectAll('*').remove();
  const cols = 12, step = 28, r = 10.5;
  const rows = Math.ceil(units.length / cols);
  const svg = host.append('svg')
    .attr('viewBox', `0 0 ${cols * step} ${rows * step}`)
    .attr('role', 'img')
    .attr('aria-label', `${dots} dots, one per person admitted on an average day in ${last.year}: ` +
      groups.filter(g => g.n).map(g => `${g.plural} ${g.n}`).join(', '));

  const circles = svg.selectAll('.unit').data(units).join('circle')
    .attr('class', 'unit')
    .attr('cx', (d, i) => (i % cols) * step + step / 2)
    .attr('cy', (d, i) => Math.floor(i / cols) * step + step / 2)
    .attr('r', r)
    .attr('fill', d => d.color);

  const pct = d3.format('.0%');
  const setFocus = key => {
    host.classed('is-hovering', !!key);
    circles.classed('is-on', d => d.key === key);
    legend.classed('is-on', d => d.key === key);
  };
  let pinned = null;
  circles
    .on('mouseenter', (event, d) => {
      setFocus(d.key);
      showTooltip(event, d.plural, [
        { label: 'On an average day', value: `${d.n} of ${dots} people`, highlight: true },
        { label: `Share of ${last.year}`, value: pct(d.cases / yearTotal) },
        { label: `Hospitalised in ${last.year}`, value: d.cases.toLocaleString() },
      ]);
    })
    .on('mousemove', positionTooltip)
    .on('mouseleave', () => { setFocus(pinned); hideTooltip(); });

  // Legend = filter: hover previews, click pins a group
  const legend = d3.select('#hero-unit-legend').selectAll('li').data(groups.filter(g => g.n))
    .join('li').append('button').attr('type', 'button')
    .attr('aria-pressed', 'false')
    .html(d => `<span class="dot" style="background:${d.color}"></span>${d.plural} <span class="n">${d.n}</span>`)
    .on('mouseenter focus', (event, d) => setFocus(d.key))
    .on('mouseleave blur', () => setFocus(pinned))
    .on('click', (event, d) => {
      pinned = pinned === d.key ? null : d.key;
      legend.attr('aria-pressed', g => String(g.key === pinned));
      setFocus(pinned);
    });

  // Dots arrive one by one (≈1.5 s), the first time the chart is on screen
  // (on phones it sits below the fold, so this waits until it is scrolled to)
  if (!Motion.REDUCED && svg.node().animate) {
    circles.style('opacity', 0);
    Motion.whenVisible(host.node(), () => {
      circles.each(function (d, i) {
        this.style.transformBox = 'fill-box';
        this.style.transformOrigin = 'center';
        this.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
          { duration: 420, delay: 150 + i * 12, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)', fill: 'backwards' });
      });
      circles.style('opacity', null);
    }, 0.3);
  }

  startHeroClock(minutes);
}

/** "Since you opened this page: N people admitted" – one every `minutes` on average */
function startHeroClock(minutes) {
  const box = document.getElementById('hero-clock');
  if (!box) return;
  const intervalMs = minutes * 60000;
  const whole = Math.floor(minutes);
  const secs = Math.round((minutes - whole) * 60);
  document.getElementById('hero-clock-interval').textContent = `${whole} min ${secs} s`;
  const count = document.getElementById('hero-clock-count');
  const unit = document.getElementById('hero-clock-unit');
  const fill = document.getElementById('hero-clock-fill');
  const t0 = Date.now();
  if (!Motion.REDUCED) fill.style.transition = 'transform 1s linear';
  const tick = () => {
    const elapsed = Date.now() - t0;
    const n = Math.floor(elapsed / intervalMs);
    count.textContent = n;
    unit.textContent = n === 1 ? 'person admitted' : 'people admitted';
    fill.style.transform = `scaleX(${(elapsed % intervalMs) / intervalMs})`;
  };
  box.hidden = false;
  tick();
  setInterval(tick, 1000);
}

/**
 * Figure 1: Which states have the most injuries? (2011–2021 added up)
 * Sequential blue by volume; a selected jurisdiction turns orange and the
 * others fade (Knaflic 2015 "muted baseline + bold accent").
 */
function renderRegionalChart(filterState = 'all') {
  const { g, innerWidth: INNER_WIDTH, innerHeight: INNER_HEIGHT, margin, compact } =
    createResponsiveSVG('#chart-1');

  const stateData = STATE_CODES
    .map(state => ({ state, total: d3.sum(stateRows, d => d[state]) }))
    .sort((a, b) => b.total - a.total);
  const grandTotal = d3.sum(stateData, d => d.total);

  const x = d3.scaleBand().domain(stateData.map(d => d.state)).range([0, INNER_WIDTH]).padding(0.32);
  const y = d3.scaleLinear().domain([0, d3.max(stateData, d => d.total) * 1.15]).nice().range([INNER_HEIGHT, 0]);

  g.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(5).tickSize(-INNER_WIDTH).tickFormat(''));
  g.append('g').attr('transform', `translate(0,${INNER_HEIGHT})`).call(d3.axisBottom(x)).attr('class', 'tick');
  g.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d))
    .attr('class', 'tick');

  g.append('text').attr('class', 'axis-label')
    .attr('x', INNER_WIDTH / 2).attr('y', INNER_HEIGHT + margin.bottom - 8)
    .text('State or territory');
  g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
    .attr('x', -INNER_HEIGHT / 2).attr('y', -margin.left + 18)
    .text(compact ? 'Hospitalised' : 'Hospitalised, 2011–2021');

  const gradient = barGradient(d3.extent(stateData, d => d.total));
  const isSelected = d => filterState !== 'all' && d.state === filterState;

  g.selectAll('.chart-bar').data(stateData).join('rect')
    .attr('class', d => `chart-bar bar ${filterState !== 'all' && d.state !== filterState ? 'mark-dimmed' : ''}`)
    .style('fill', d => (isSelected(d) ? COLORS.storytelling.accent : gradient(d.total)))
    .attr('x', d => x(d.state)).attr('y', d => y(d.total))
    .attr('width', x.bandwidth()).attr('height', d => INNER_HEIGHT - y(d.total)).attr('rx', 4)
    .on('mouseenter', function (event, d) {
      showTooltip(event, stateLabel(d.state), [
        { label: 'Hospitalised, 2011–2021', value: d.total.toLocaleString(), highlight: true },
        { label: 'Share of all states', value: `${((d.total / grandTotal) * 100).toFixed(1)}%` },
      ]);
    })
    .on('mousemove', positionTooltip)
    .on('mouseleave', hideTooltip);

  const focalItem = filterState === 'all' ? stateData[0] : stateData.find(d => d.state === filterState);
  updateRegionalLegend(filterState);
  if (focalItem) {
    g.append('text').attr('class', 'annotation-text')
      .style('fill', filterState === 'all' ? gradient(focalItem.total) : COLORS.storytelling.accent)
      .attr('x', x(focalItem.state) + x.bandwidth() / 2).attr('y', y(focalItem.total) - 8)
      .attr('text-anchor', 'middle')
      .text(compact ? focalItem.total.toLocaleString() : `${focalItem.state}: ${focalItem.total.toLocaleString()}`);
  }
}

/**
 * Figure 2: Is it going up? One line, 2011–2021, for Australia or the
 * selected jurisdiction. Eleven years, so a line shows the trend best.
 */
function renderTrendChart(filterState = 'all') {
  const { g, innerWidth: INNER_WIDTH, innerHeight: INNER_HEIGHT, margin, compact } =
    createResponsiveSVG('#chart-2');

  const key = filterState === 'all' ? 'Total' : filterState;
  const place = filterState === 'all' ? 'Australia' : STATE_NAMES[filterState];
  const series = stateRows.map(d => ({ year: d.year, value: d[key] }));
  const color = filterState === 'all' ? '#0072B2' : COLORS.storytelling.accent;

  const x = d3.scaleLinear().domain(d3.extent(series, d => d.year)).range([0, INNER_WIDTH]);
  const y = d3.scaleLinear().domain([0, d3.max(series, d => d.value) * 1.18]).nice().range([INNER_HEIGHT, 0]);

  g.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(5).tickSize(-INNER_WIDTH).tickFormat(''));
  g.append('g').attr('transform', `translate(0,${INNER_HEIGHT})`)
    .call(d3.axisBottom(x).ticks(compact ? 6 : 11).tickFormat(d3.format('d'))).attr('class', 'tick');
  g.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d))
    .attr('class', 'tick');
  g.append('text').attr('class', 'axis-label')
    .attr('x', INNER_WIDTH / 2).attr('y', INNER_HEIGHT + 48).text(`Year (${place})`);
  g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
    .attr('x', -INNER_HEIGHT / 2).attr('y', -margin.left + 18)
    .text(compact ? 'Hospitalised' : 'Hospitalised per year');

  // Counting changes (Victoria 2012, NSW 2017)
  [[2012, 'VIC'], [2017, 'NSW']].forEach(([yr, st]) => {
    const on = filterState === 'all' || filterState === st;
    g.append('line').attr('x1', x(yr)).attr('x2', x(yr)).attr('y1', 0).attr('y2', INNER_HEIGHT)
      .attr('stroke', '#94a3b8').attr('stroke-dasharray', '3 3').attr('opacity', on ? 1 : 0.35);
    if (!compact) {
      g.append('text').attr('class', 'tick').attr('x', x(yr) + 5).attr('y', 12)
        .style('font-size', '13px').style('fill', '#55555a').attr('opacity', on ? 1 : 0.5)
        .text(`${yr}: ${st} counting change`);
    }
  });

  g.append('path').datum(series)
    .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 3)
    .attr('d', d3.line().x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX));

  g.selectAll('.trend-dot').data(series).join('circle').attr('class', 'trend-dot')
    .attr('cx', d => x(d.year)).attr('cy', d => y(d.value)).attr('r', 5)
    .attr('fill', color).attr('stroke', '#ffffff').attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('mouseenter', function (event, d) {
      d3.select(this).attr('r', 7);
      const prev = series.find(p => p.year === d.year - 1);
      showTooltip(event, `${place}, ${d.year}`, [
        { label: 'Hospitalised', value: d.value.toLocaleString(), highlight: true },
        ...(prev ? [{ label: 'vs year before', value: `${d.value >= prev.value ? '+' : '−'}${Math.abs(d.value - prev.value).toLocaleString()}` }] : []),
      ]);
    })
    .on('mousemove', positionTooltip)
    .on('mouseleave', function () { d3.select(this).attr('r', 5); hideTooltip(); });

  // Start and end labels with the change between them
  const a = series[0], b = series[series.length - 1];
  const change = (b.value - a.value) / a.value;
  g.append('text').attr('class', 'annotation-text').style('fill', color)
    .attr('x', x(a.year)).attr('y', y(a.value) - 14).attr('text-anchor', 'start')
    .text(a.value.toLocaleString());
  g.append('text').attr('class', 'annotation-text').style('fill', color)
    .attr('x', x(b.year)).attr('y', y(b.value) - 14).attr('text-anchor', 'end')
    .text(`${b.value.toLocaleString()} (${change >= 0 ? '+' : '−'}${Math.abs(change * 100).toFixed(0)}%)`);

  const answer = document.getElementById('chart-2-answer');
  if (answer) {
    const dir = change > 0.02 ? 'Yes.' : change < -0.02 ? 'No, it went down.' : 'It stayed about the same.';
    answer.textContent = `${dir} ${place} went from ${a.value.toLocaleString()} cases in ${a.year} to ` +
      `${b.value.toLocaleString()} in ${b.year} (${change >= 0 ? '+' : '−'}${Math.abs(change * 100).toFixed(0)}%).` +
      (filterState === 'NSW' ? ' Much of the fall comes after NSW changed how it counts patients in 2017.' : '');
  }
}

/**
 * "Showing: …" badges on Figure 1 and Figure 2 so readers can see that the
 * jurisdiction filter drives both charts.
 */
function updateFilterScope(filterState) {
  const text = filterState === 'all' ? 'All of Australia' : stateLabel(filterState);
  document.querySelectorAll('[data-filter-scope]').forEach(el => {
    el.querySelector('.filter-scope-value').textContent = text;
    el.classList.toggle('is-filtered', filterState !== 'all');
  });
}

function renderOverviewCharts() {
  renderRegionalChart(activeFilter);
  renderTrendChart(activeFilter);
}

/** Wire up the jurisdiction filter buttons */
function initFilterControls() {
  const buttons = document.querySelectorAll('#filters-container .filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', function () {
      buttons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      updateFilterScope(activeFilter);
      renderOverviewCharts();
    });
  });
}

/* ── DOM Initialisation ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  initTooltip();
  initFilterControls();

  Promise.all([SiteData.states(), SiteData.trends()])
    .then(([states, people]) => {
      stateRows = [...states].sort((a, b) => a.year - b.year);
      renderHero(stateRows, people);
      updateKeyNumbers(stateRows, people);
      renderOverviewCharts();
    })
    .catch(err => console.error('[main] Data initialization failed:', err));

  // Re-draw charts when the viewport width changes (rotate phone, resize window)
  let lastWidth = window.innerWidth;
  let resizeTimer;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth || !stateRows.length) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderOverviewCharts, 150);
  });
});
