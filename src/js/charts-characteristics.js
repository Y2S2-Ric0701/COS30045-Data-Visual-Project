/* ═══════════════════════════════════════════════════════════════
   charts-characteristics.js – D3 Visualisations for Question 4
   COS30045 Data Visualisation Project
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let tooltip = d3.select('body').select('.tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .attr('role', 'status')
      .attr('aria-live', 'polite');
  }

  const fmtPercent = d3.format('.1%');
  const fmtComma = d3.format(',');
  const fmtDec1 = d3.format('.1f');

  const COUNTERPARTIES = [
    { key: 'Car/ute/van',       color: '#0072B2', label: 'Car / Ute / Van' },
    { key: 'No other vehicle',  color: '#D55E00', label: 'No Other Vehicle (Single)' },
    { key: 'Fixed object',      color: '#E69F00', label: 'Fixed Object' },
    { key: 'Truck/bus',         color: '#009E73', label: 'Truck / Bus' },
    { key: 'Other',             color: '#CC79A7', label: 'Other Transport' },
    { key: 'Not specified',     color: '#94a3b8', label: 'Not Specified' },
  ];

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 4.1: 100% Stacked Bar Chart – Counterparty Proportions
  // ═══════════════════════════════════════════════════════════════
  function renderStackedCounterpartyChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      const keys = COUNTERPARTIES.map(c => c.key);
      const data = rawData.map(d => {
        const row = {
          user: d['Road user'],
          sum: +d['Sum'] || 0,
        };
        keys.forEach(k => {
          row[k] = (+d[k] || 0) / 100; // convert percentage 0..100 to 0..1
        });
        return row;
      });

      const margin = { top: 45, right: 30, bottom: 40, left: 140 };
      const width = 850;
      const height = 350;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', '100 percent stacked bar chart of crash counterparties');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const y = d3.scaleBand()
        .domain(data.map(d => d.user))
        .range([0, innerHeight])
        .padding(0.32);

      const x = d3.scaleLinear()
        .domain([0, 1])
        .range([0, innerWidth]);

      const stack = d3.stack().keys(keys);
      const series = stack(data);

      const colorMap = {};
      COUNTERPARTIES.forEach(c => { colorMap[c.key] = c.color; });

      // Rows
      const layer = g.selectAll('.layer')
        .data(series)
        .enter()
        .append('g')
        .attr('class', 'layer')
        .attr('fill', d => colorMap[d.key]);

      layer.selectAll('rect')
        .data(d => d.map(item => ({ ...item, key: d.key, user: item.data.user, sum: item.data.sum })))
        .enter()
        .append('rect')
        .attr('y', d => y(d.user))
        .attr('x', d => x(d[0]))
        .attr('height', y.bandwidth())
        .attr('rx', 2)
        .attr('width', 0)
        .transition()
        .duration(800)
        .attr('width', d => Math.max(0, x(d[1]) - x(d[0])));

      // Hover
      layer.selectAll('rect')
        .on('mouseenter', function (event, d) {
          const share = d[1] - d[0];
          const matchedConfig = COUNTERPARTIES.find(c => c.key === d.key);
          const label = matchedConfig ? matchedConfig.label : d.key;
          const estCases = Math.round(share * d.sum);

          tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.user} vs ${label}</div>
              <div class="tooltip-row"><span>Proportion:</span> <span class="tooltip-accent">${fmtPercent(share)}</span></div>
              <div class="tooltip-row"><span>Estimated Cases:</span> <span class="tooltip-val">${fmtComma(estCases)}</span></div>
              ${d.key === 'No other vehicle' ? '<div style="color:#ff9f0a;font-size:10px;margin-top:2px;">Single-vehicle loss of control</div>' : ''}
            `);
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', `${event.pageX + 14}px`)
            .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseleave', function () {
          tooltip.classed('visible', false);
        });

      // Y-axis
      g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).tickSize(0).tickPadding(12))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#1d1d1f');

      // X-axis
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.0%')))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      // Top Legend
      const legend = svg.append('g')
        .attr('transform', `translate(${margin.left}, 12)`);

      COUNTERPARTIES.forEach((c, i) => {
        const item = legend.append('g')
          .attr('transform', `translate(${(i % 3) * 230}, ${Math.floor(i / 3) * 16})`);

        item.append('rect')
          .attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', c.color);
        item.append('text')
          .attr('x', 14).attr('y', 9)
          .style('font-size', '10.5px')
          .style('fill', '#1d1d1f')
          .text(c.label);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 4.2: Heatmap – What each road user collided with
  // Rows = injured road user, columns = the other party in the crash.
  // Each row adds to 100%; darker blue = bigger share of that row.
  // ═══════════════════════════════════════════════════════════════
  function renderCounterpartyHeatmap(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      // Plain-language column headers (two lines each), ordered by overall share
      const COLS = [
        { key: 'Car/ute/van',      lines: ['Car, ute', 'or van'] },
        { key: 'No other vehicle', lines: ['No other', 'vehicle'] },
        { key: 'Fixed object',     lines: ['Fixed object', '(tree, pole)'] },
        { key: 'Not specified',    lines: ['Not', 'recorded'] },
        { key: 'Truck/bus',        lines: ['Truck', 'or bus'] },
        { key: 'Other',            lines: ['', 'Other'] },
      ];
      const colName = k => COLS.find(c => c.key === k).lines.join(' ').trim();

      const rows = rawData.map(d => ({ user: d['Road user'], total: +d.Sum || 0 }));
      const matrix = [];
      rawData.forEach(d => COLS.forEach(c => matrix.push({
        user: d['Road user'],
        cp: c.key,
        pct: (+d[c.key] || 0) / 100,
        cases: Math.round((+d[c.key] || 0) / 100 * (+d.Sum || 0)),
      })));
      const rowMax = d3.rollup(matrix, v => d3.max(v, d => d.pct), d => d.user);

      const width = 850;
      const height = 430;
      const margin = { top: 64, right: 118, bottom: 70, left: 130 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Heatmap: share of each road user group\'s hospitalised injuries by the other party in the crash. ' +
          rows.map(r => {
            const top = matrix.filter(m => m.user === r.user).sort((a, b) => b.pct - a.pct)[0];
            return `${r.user}: ${fmtPercent(top.pct)} ${colName(top.cp).toLowerCase()}`;
          }).join('; '));

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand().domain(COLS.map(c => c.key)).range([0, innerWidth]).paddingInner(0.06);
      const y = d3.scaleBand().domain(rows.map(r => r.user)).range([0, innerHeight]).paddingInner(0.08);

      // Same blue family as the rest of the site; 0% gets a neutral tint
      const color = d3.scaleSequential().domain([0, 0.9]).interpolator(t => d3.interpolateBlues(0.06 + t * 0.94));
      const textFill = d => d.pct >= 0.4 ? '#ffffff' : '#1d1d1f';

      // Column headers (top, horizontal)
      const header = g.append('g').attr('class', 'heat-col-head');
      COLS.forEach(c => {
        const t = header.append('text').attr('text-anchor', 'middle')
          .attr('x', x(c.key) + x.bandwidth() / 2).attr('y', -36)
          .style('font-size', '13px').style('font-weight', '600').style('fill', '#1d1d1f');
        c.lines.forEach((line, i) => t.append('tspan')
          .attr('x', x(c.key) + x.bandwidth() / 2).attr('dy', i ? 16 : 0).text(line));
      });

      // Row labels (left) and row totals (right)
      g.append('g').selectAll('text').data(rows).join('text')
        .attr('x', -12).attr('y', r => y(r.user) + y.bandwidth() / 2).attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .style('font-size', '13.5px').style('font-weight', '600').style('fill', '#1d1d1f')
        .text(r => r.user);
      g.append('text').attr('x', innerWidth + 14).attr('y', -20)
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#55555a').text('Cases');
      g.append('g').selectAll('text').data(rows).join('text')
        .attr('x', innerWidth + 14).attr('y', r => y(r.user) + y.bandwidth() / 2).attr('dy', '0.35em')
        .style('font-size', '12.5px').style('fill', '#55555a')
        .text(r => fmtComma(r.total));

      // Cells
      const cellG = g.selectAll('.heat-cell-g').data(matrix).join('g')
        .attr('class', 'heat-cell-g')
        .attr('transform', d => `translate(${x(d.cp)},${y(d.user)})`)
        .style('cursor', 'pointer');

      cellG.append('rect')
        .attr('class', 'heat-cell')
        .attr('width', x.bandwidth()).attr('height', y.bandwidth()).attr('rx', 6)
        .attr('fill', d => d.pct > 0 ? color(d.pct) : '#f5f5f7')
        // Outline each row's largest share so the main pattern pops out
        .attr('stroke', d => d.pct === rowMax.get(d.user) ? '#1d1d1f' : 'none')
        .attr('stroke-width', 1.5);

      cellG.append('text')
        .attr('x', x.bandwidth() / 2).attr('y', y.bandwidth() / 2).attr('dy', '0.35em')
        .attr('text-anchor', 'middle').style('pointer-events', 'none')
        .style('font-size', d => d.pct >= 0.1 ? '14px' : '12.5px')
        .style('font-weight', d => d.pct >= 0.1 ? '700' : '500')
        .style('fill', d => d.pct > 0 ? textFill(d) : '#94a3b8')
        .text(d => d.pct > 0 ? fmtPercent(d.pct) : '–');

      // Crosshair hover: keep the row and column, fade the rest
      cellG
        .on('mouseenter', function (event, d) {
          cellG.attr('opacity', o => (o.user === d.user || o.cp === d.cp) ? 1 : 0.35);
          tooltip.classed('visible', true).html(`
            <div class="tooltip-title">${d.user} · ${colName(d.cp)}</div>
            <div class="tooltip-row"><span>Share of ${d.user.toLowerCase()} injuries:</span> <span class="tooltip-accent">${fmtPercent(d.pct)}</span></div>
            <div class="tooltip-row"><span>Approx. cases (2011–2021):</span> <span class="tooltip-val">${fmtComma(d.cases)}</span></div>
          `);
        })
        .on('mousemove', function (event) {
          tooltip.style('left', `${event.pageX + 14}px`).style('top', `${event.pageY - 28}px`);
        })
        .on('mouseleave', function () {
          cellG.attr('opacity', 1);
          tooltip.classed('visible', false);
        });

      // Legend: gradient bar + "outlined = largest share in the row"
      const legend = g.append('g').attr('transform', `translate(0,${innerHeight + 28})`);
      const lw = 220;
      const gradId = 'counterparty-heat-gradient';
      const grad = svg.append('defs').append('linearGradient').attr('id', gradId);
      d3.range(0, 1.01, 0.1).forEach(t => grad.append('stop')
        .attr('offset', `${t * 100}%`).attr('stop-color', color(t * 0.9)));
      legend.append('text').attr('y', 4).style('font-size', '12px').style('fill', '#55555a').text('Share of row');
      legend.append('rect').attr('x', 82).attr('y', -6).attr('width', lw).attr('height', 12).attr('rx', 3)
        .attr('fill', `url(#${gradId})`);
      legend.append('text').attr('x', 82).attr('y', 24).style('font-size', '11px').style('fill', '#55555a').text('0%');
      legend.append('text').attr('x', 82 + lw).attr('y', 24).attr('text-anchor', 'end')
        .style('font-size', '11px').style('fill', '#55555a').text('90%');
      legend.append('rect').attr('x', 340).attr('y', -7).attr('width', 14).attr('height', 14).attr('rx', 3)
        .attr('fill', '#ffffff').attr('stroke', '#1d1d1f').attr('stroke-width', 1.5);
      legend.append('text').attr('x', 362).attr('y', 4).style('font-size', '12px').style('fill', '#55555a')
        .text('Outlined = largest share for that road user');
    }).catch(err => console.error('Error loading rq4_counterparty.csv:', err));
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZE ON DOM READY
  // ═══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  // FIGURE 4.3: Donut – Crash Scenario (traffic vs non-traffic)
  // Source: AIHW raw sheet, "Cause of injury" (2011–2021). "Traffic" is
  // the public-road subset every other figure on this site is based on.
  // ═══════════════════════════════════════════════════════════════
  function renderCrashScenarioChart(containerId, dataPath) {
    d3.csv(dataPath).then(function (rawData) {
      new Vis.DonutChart(containerId, rawData, {
        labelKey: 'scenario',
        valueKey: 'hospitalisations',
        centerLabel: 'transport crash cases',
        colorMap: {
          'Traffic': '#0072B2',
          'Non-traffic': '#E69F00',
          'Unknown traffic': '#94a3b8',
          'Other transport': '#CC79A7',
        },
        descMap: {
          'Traffic': 'On a public road – used in all other figures',
          'Non-traffic': 'Road vehicle crash off a public road (e.g. private land)',
          'Unknown traffic': 'Road setting not recorded',
          'Other transport': 'Water, air and other transport (ICD V90–V99)',
        },
        extraRows: d => [
          ['Deaths per 1,000', fmtDec1(+d.died_cases / +d.cases * 1000)],
          ['Avg bed days', fmtDec1(+d.bed_days / +d.cases)],
        ],
      });
    }).catch(err => console.error('Error loading rq4_crash_scenario.csv:', err));
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderStackedCounterpartyChart('#chart-collision-type', 'data/rq4_counterparty.csv');
    renderCounterpartyHeatmap('#chart-counterparty', 'data/rq4_counterparty.csv');
    renderCrashScenarioChart('#chart-crash-scenario', 'data/rq4_crash_scenario.csv');
  });

})();

