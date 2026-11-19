/* ═══════════════════════════════════════════════════════════════
   main-narrative.js – Apple UI Narrative Orchestration & D3 Charts
   COS20031 Database Design Project / COS30045 Data Visualisation
   ═══════════════════════════════════════════════════════════════ */

// Cached dataset across filters
let rawDataset = [];
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
 * Update Key Summary Cards (Apple Health / Watch style metrics)
 */
function updateSummaryCards(data) {
  // 1. Total latest year (2023)
  const data2023 = data.filter(d => d.year === 2023);
  const total2023 = d3.sum(data2023, d => d.hospitalisations);

  // 2. Total previous period (2019)
  const data2019 = data.filter(d => d.year === 2019);
  const total2019 = d3.sum(data2019, d => d.hospitalisations);

  // YoY % change
  const pctChange = total2019 > 0
    ? (((total2023 - total2019) / total2019) * 100).toFixed(1)
    : 0;

  // 3. Serious & Critical share in 2023
  const seriousCritical2023 = d3.sum(
    data2023.filter(d => d.injurySeverity === 'serious' || d.injurySeverity === 'critical'),
    d => d.hospitalisations
  );
  const severityShare = total2023 > 0
    ? ((seriousCritical2023 / total2023) * 100).toFixed(1)
    : 0;

  const totalEl = document.getElementById('callout-total');
  const changeEl = document.getElementById('callout-change');
  const severityEl = document.getElementById('callout-severity');

  if (totalEl) totalEl.textContent = total2023.toLocaleString();
  // % change belongs on the admissions card's badge (the region card keeps "NSW & VIC")
  if (changeEl) changeEl.textContent = `${pctChange > 0 ? '+' : ''}${pctChange}%`;
  if (severityEl) severityEl.textContent = `${severityShare}%`;
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

/**
 * Figure 1: Regional Distribution
 * Follows Knaflic (2015) & Tufte (2001) "Muted Baseline + Bold Accent" rule
 */
function renderRegionalChart(data, filterState = 'all') {
  const { g, innerWidth: INNER_WIDTH, innerHeight: INNER_HEIGHT, margin, compact } =
    createResponsiveSVG('#chart-1');

  // Aggregate by state for the latest year (2023)
  const stateData = d3.rollups(
    data.filter(d => d.year === 2023),
    v => d3.sum(v, d => d.hospitalisations),
    d => d.state
  ).map(([state, total]) => ({ state, total }))
   .sort((a, b) => b.total - a.total);

  const grandTotal = d3.sum(stateData, d => d.total);

  const x = d3.scaleBand()
    .domain(stateData.map(d => d.state))
    .range([0, INNER_WIDTH])
    .padding(0.32);

  const y = d3.scaleLinear()
    .domain([0, d3.max(stateData, d => d.total) * 1.15])
    .nice()
    .range([INNER_HEIGHT, 0]);

  // Subtle guidelines (Apple / Tufte High Data-Ink)
  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(5).tickSize(-INNER_WIDTH).tickFormat(''));

  // X Axis – state codes only (full names are spelled out in the filter above)
  g.append('g')
    .attr('transform', `translate(0,${INNER_HEIGHT})`)
    .call(d3.axisBottom(x))
    .attr('class', 'tick');

  // Y Axis
  g.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d))
    .attr('class', 'tick');

  // Axis Labels
  g.append('text')
    .attr('class', 'axis-label')
    .attr('x', INNER_WIDTH / 2)
    .attr('y', INNER_HEIGHT + margin.bottom - 8)
    .text(compact ? 'State / Territory (2023)' : 'State / Territory Jurisdiction (2023)');

  g.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -INNER_HEIGHT / 2)
    .attr('y', -margin.left + 18)
    .text(compact ? 'Hospitalisations' : 'Annual Inpatient Hospitalisations');

  // Bars: sequential blue gradient by volume (light = fewer, dark = more).
  // When a jurisdiction is selected in the filter, that bar switches to one
  // solid accent colour and every other bar fades into the background.
  const gradient = barGradient(d3.extent(stateData, d => d.total));
  const isSelected = d => filterState !== 'all' && d.state === filterState;

  const bars = g.selectAll('.chart-bar')
    .data(stateData)
    .join('rect')
    .attr('class', d => {
      const isDimmed = filterState !== 'all' && d.state !== filterState;
      return `chart-bar bar ${isDimmed ? 'mark-dimmed' : ''}`;
    })
    .style('fill', d => isSelected(d) ? COLORS.storytelling.accent : gradient(d.total))
    .attr('x', d => x(d.state))
    .attr('y', d => y(d.total))
    .attr('width', x.bandwidth())
    .attr('height', d => INNER_HEIGHT - y(d.total))
    .attr('rx', 4)
    .on('mouseenter', function (event, d) {
      const share = ((d.total / grandTotal) * 100).toFixed(1);
      showTooltip(event, stateLabel(d.state), [
        { label: 'Hospitalisations', value: d.total.toLocaleString(), highlight: true },
        { label: 'National Share', value: `${share}%` },
        { label: 'Reporting Year', value: '2023' },
      ]);
    })
    .on('mousemove', positionTooltip)
    .on('mouseleave', hideTooltip);

  // Storytelling focal callout annotation (Knaflic 2015)
  const focalItem = filterState === 'all'
    ? stateData[0]
    : stateData.find(d => d.state === filterState);

  updateRegionalLegend(filterState);

  if (focalItem) {
    g.append('text')
      .attr('class', 'annotation-text')
      .style('fill', filterState === 'all' ? gradient(focalItem.total) : COLORS.storytelling.accent)
      .attr('x', x(focalItem.state) + x.bandwidth() / 2)
      .attr('y', y(focalItem.total) - 8)
      .attr('text-anchor', 'middle')
      .text(compact ? focalItem.total.toLocaleString() : `${focalItem.state}: ${focalItem.total.toLocaleString()}`);
  }
}

/**
 * Figure 2: Injury Severity Breakdown (Grouped Bar Chart)
 * Encoded with Color-Blind Safe Palette (Munzner 2014 & Bertin 1967)
 */
function renderSeverityChart(data, filterState = 'all') {
  const { g, innerWidth: INNER_WIDTH, innerHeight: INNER_HEIGHT, margin, compact } =
    createResponsiveSVG('#chart-2');

  const filtered = filterState === 'all'
    ? data
    : data.filter(d => d.state === filterState);

  // Group by Year and Severity
  const years = [2015, 2019, 2023];
  const severities = ['minor', 'serious', 'critical'];

  const severityData = years.map(yr => {
    const row = { year: `${yr}` };
    severities.forEach(sev => {
      row[sev] = d3.sum(
        filtered.filter(d => d.year === yr && d.injurySeverity === sev),
        d => d.hospitalisations
      );
    });
    return row;
  });

  const x0 = d3.scaleBand()
    .domain(years.map(y => `${y}`))
    .range([0, INNER_WIDTH])
    .padding(0.28);

  const x1 = d3.scaleBand()
    .domain(severities)
    .range([0, x0.bandwidth()])
    .padding(0.08);

  const maxVal = d3.max(severityData, d => Math.max(d.minor, d.serious, d.critical)) || 1000;

  const y = d3.scaleLinear()
    .domain([0, maxVal * 1.15])
    .nice()
    .range([INNER_HEIGHT, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(severities)
    .range([
      COLORS.severity.minor,    // #F0E442
      COLORS.severity.serious,  // #E69F00
      COLORS.severity.critical, // #D55E00
    ]);

  // Guidelines
  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(5).tickSize(-INNER_WIDTH).tickFormat(''));

  // X Axis
  g.append('g')
    .attr('transform', `translate(0,${INNER_HEIGHT})`)
    .call(d3.axisBottom(x0))
    .attr('class', 'tick');

  // Y Axis
  g.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d))
    .attr('class', 'tick');

  // Axis Labels
  g.append('text')
    .attr('class', 'axis-label')
    .attr('x', INNER_WIDTH / 2)
    .attr('y', INNER_HEIGHT + 48)
    .text(`Reporting Year ${filterState === 'all' ? '(All of Australia)' : `(${compact ? filterState : stateLabel(filterState)})`}`);

  g.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -INNER_HEIGHT / 2)
    .attr('y', -margin.left + 18)
    .text(compact ? 'Hospitalisations' : 'Hospitalisations by Severity Tier');

  // Render grouped bars
  const yearGroups = g.selectAll('.year-group')
    .data(severityData)
    .join('g')
    .attr('class', 'year-group')
    .attr('transform', d => `translate(${x0(d.year)},0)`);

  yearGroups.selectAll('rect')
    .data(d => severities.map(sev => ({ year: d.year, severity: sev, value: d[sev] })))
    .join('rect')
    .attr('class', 'bar')
    .attr('x', d => x1(d.severity))
    .attr('y', d => y(d.value))
    .attr('width', x1.bandwidth())
    .attr('height', d => INNER_HEIGHT - y(d.value))
    .attr('fill', d => colorScale(d.severity))
    .attr('rx', 4)
    .on('mouseenter', function (event, d) {
      const sevLabel = d.severity.charAt(0).toUpperCase() + d.severity.slice(1);
      showTooltip(event, `${sevLabel} Injury Tier`, [
        { label: 'Year', value: d.year },
        { label: 'Admissions', value: d.value.toLocaleString(), highlight: true },
        { label: 'Scope', value: filterState === 'all' ? 'All of Australia' : stateLabel(filterState) },
      ]);
    })
    .on('mousemove', positionTooltip)
    .on('mouseleave', hideTooltip);
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

/**
 * Wire up the Apple Segmented Control filter buttons
 */
function initFilterControls() {
  const buttons = document.querySelectorAll('.apple-segmented-control .filter-btn');

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

      // Re-render both charts dynamically with the new filter
      renderRegionalChart(rawDataset, activeFilter);
      renderSeverityChart(rawDataset, activeFilter);
    });
  });
}

/* ── DOM Initialisation ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  initTooltip();
  initFilterControls();

  loadHospitalisationData()
    .then(data => {
      rawDataset = data;
      updateSummaryCards(data);
      renderRegionalChart(data, 'all');
      renderSeverityChart(data, 'all');
    })
    .catch(err => {
      console.error('[main] Data initialization failed:', err);
    });

  // Re-draw charts when the viewport width changes (rotate phone, resize window)
  let lastWidth = window.innerWidth;
  let resizeTimer;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth || !rawDataset.length) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderRegionalChart(rawDataset, activeFilter);
      renderSeverityChart(rawDataset, activeFilter);
    }, 150);
  });
});
