/* ═══════════════════════════════════════════════════════════════
   main-narrative.js – Apple UI Narrative Orchestration & D3 Charts
   COS20031 Database Design Project / COS30045 Data Visualisation
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
    .style('opacity', 0);
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
    .style('opacity', 1)
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
  const y = event.pageY - 28;
  tooltip
    .style('left', `${x}px`)
    .style('top', `${y}px`);
}

/**
 * Hide tooltip
 */
function hideTooltip() {
  tooltip
    .style('opacity', 0)
    .attr('class', 'tooltip');
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
