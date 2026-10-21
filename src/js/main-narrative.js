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
  const x = event.pageX + pad;
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
 * Create a responsive SVG container with standard viewBox
 *
 * @param {string} selector
 * @returns {d3.Selection} margin-offset group
 */
function createResponsiveSVG(selector) {
  const container = d3.select(selector);
  container.selectAll('*').remove(); // clear prior renders

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('role', 'img');

  return svg.append('g')
    .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
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
  const trendEl = document.getElementById('callout-trend');
  const severityEl = document.getElementById('callout-severity');

  if (totalEl) totalEl.textContent = total2023.toLocaleString();
  if (trendEl) trendEl.textContent = `${pctChange > 0 ? '+' : ''}${pctChange}%`;
  if (severityEl) severityEl.textContent = `${severityShare}%`;
}

/**
 * Figure 1: Regional Distribution
 * Follows Knaflic (2015) & Tufte (2001) "Muted Baseline + Bold Accent" rule
 */
function renderRegionalChart(data, filterState = 'all') {
  const g = createResponsiveSVG('#chart-1');

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

  // X Axis
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
    .attr('y', INNER_HEIGHT + 40)
    .text('State / Territory Jurisdiction (2023)');

  g.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -INNER_HEIGHT / 2)
    .attr('y', -42)
    .text('Annual Inpatient Hospitalisations');

  // Bars: "Muted Baseline + Bold Accent"
  // If filterState is 'all', NSW (top volume) gets the bold accent.
  // If specific state selected, that state gets the bold accent and others dim.
  const bars = g.selectAll('.chart-bar')
    .data(stateData)
    .join('rect')
    .attr('class', d => {
      const isFocal = filterState === 'all'
        ? d.state === stateData[0].state
        : d.state === filterState;
      const isDimmed = filterState !== 'all' && d.state !== filterState;
      return `chart-bar bar ${isFocal ? 'bar-accent' : 'bar-baseline'} ${isDimmed ? 'mark-dimmed' : ''}`;
    })
    .attr('x', d => x(d.state))
    .attr('y', d => y(d.total))
    .attr('width', x.bandwidth())
    .attr('height', d => INNER_HEIGHT - y(d.total))
    .attr('rx', 4)
    .on('mouseenter', function (event, d) {
      const share = ((d.total / grandTotal) * 100).toFixed(1);
      showTooltip(event, `State: ${d.state}`, [
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

  if (focalItem) {
    g.append('text')
      .attr('class', 'annotation-text')
      .attr('x', x(focalItem.state) + x.bandwidth() / 2)
      .attr('y', y(focalItem.total) - 8)
      .attr('text-anchor', 'middle')
      .text(`${focalItem.state}: ${focalItem.total.toLocaleString()}`);
  }
}

/**
 * Figure 2: Injury Severity Breakdown (Grouped Bar Chart)
 * Encoded with Color-Blind Safe Palette (Munzner 2014 & Bertin 1967)
 */
function renderSeverityChart(data, filterState = 'all') {
  const g = createResponsiveSVG('#chart-2');

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
    .attr('y', INNER_HEIGHT + 40)
    .text(`Reporting Year ${filterState === 'all' ? '(National Total)' : `(${filterState})`}`);

  g.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -INNER_HEIGHT / 2)
    .attr('y', -42)
    .text('Hospitalisations by Severity Tier');

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
        { label: 'Scope', value: filterState === 'all' ? 'All Australia' : filterState },
      ]);
    })
    .on('mousemove', positionTooltip)
    .on('mouseleave', hideTooltip);
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
      console.log(`[filters] Activated jurisdiction: ${activeFilter}`);

      // Re-render both charts dynamically with the new filter
      renderRegionalChart(rawDataset, activeFilter);
      renderSeverityChart(rawDataset, activeFilter);
    });
  });
}

/* ── DOM Initialisation ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[main] Initialising Apple Design System Data Visualisation…');

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
});
