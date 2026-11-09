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
  // FIGURE 4.2: Heatmap Matrix – Road User x Collision Counterparty
  // ═══════════════════════════════════════════════════════════════
  function renderCounterpartyHeatmap(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      const users = rawData.map(d => d['Road user']);
      const counterparties = ['Car/ute/van', 'No other vehicle', 'Fixed object', 'Truck/bus', 'Not specified', 'Other'];

      const matrix = [];
      rawData.forEach(d => {
        counterparties.forEach(cp => {
          matrix.push({
            user: d['Road user'],
            cp: cp,
            pct: (+d[cp] || 0) / 100,
          });
        });
      });

      const margin = { top: 30, right: 40, bottom: 65, left: 140 };
      const width = 850;
      const height = 360;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Heatmap matrix of road user and collision counterparty interaction');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .domain(counterparties)
        .range([0, innerWidth])
        .padding(0.08);

      const y = d3.scaleBand()
        .domain(users)
        .range([0, innerHeight])
        .padding(0.08);

      // Color Scale: Sequential Blues
      const color = d3.scaleSequential()
        .domain([0, 0.9])
        .interpolator(d3.interpolateBlues);

      // Cells
      const cells = g.selectAll('.heat-cell')
        .data(matrix)
        .enter()
        .append('rect')
        .attr('class', 'heat-cell')
        .attr('x', d => x(d.cp))
        .attr('y', d => y(d.user))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('rx', 4)
        .attr('fill', d => d.pct > 0 ? color(d.pct) : '#f1f5f9')
        .style('cursor', 'pointer');

      // Cell text labels
      g.selectAll('.cell-text')
        .data(matrix)
        .enter()
        .append('text')
        .attr('x', d => x(d.cp) + x.bandwidth() / 2)
        .attr('y', d => y(d.user) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', d => d.pct > 0.45 ? '#ffffff' : '#1d1d1f')
        .text(d => d.pct > 0 ? fmtPercent(d.pct) : '0%');

      // X-axis
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#1d1d1f')
        .attr('transform', 'rotate(-15)')
        .attr('text-anchor', 'end');

      // Y-axis
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0).tickPadding(10))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#1d1d1f');

      // Tooltip
      cells
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('stroke', '#0072B2').attr('stroke-width', 2);
          tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.user} &rarr; ${d.cp}</div>
              <div class="tooltip-row"><span>Share of Collisions:</span> <span class="tooltip-accent">${fmtPercent(d.pct)}</span></div>
            `);
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', `${event.pageX + 14}px`)
            .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('stroke', null);
          tooltip.classed('visible', false);
        });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZE ON DOM READY
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function () {
    renderStackedCounterpartyChart('#chart-collision-type', 'data/rq4_counterparty.csv');
    renderCounterpartyHeatmap('#chart-counterparty', 'data/rq4_counterparty.csv');
    // For crash scenario, re-render counterparty view
    renderStackedCounterpartyChart('#chart-crash-scenario', 'data/rq4_counterparty.csv');
  });

})();
