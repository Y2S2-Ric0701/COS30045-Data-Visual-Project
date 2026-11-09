/* ═══════════════════════════════════════════════════════════════
   charts-trends.js – D3 Visualisations for Question 2 (Trends)
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

  const fmtComma = d3.format(',');
  const fmtPercent = d3.format('+.1%');

  // Key user series with Okabe-Ito color-blind safe palette
  const SERIES_CONFIG = [
    { key: 'Car driver',    color: '#0072B2', label: 'Car Driver' },
    { key: 'Motorcyclist',  color: '#E69F00', label: 'Motorcyclist' },
    { key: 'Pedal cyclist', color: '#009E73', label: 'Pedal Cyclist' },
    { key: 'Car passenger', color: '#56B4E9', label: 'Car Passenger' },
    { key: 'Pedestrian',    color: '#D55E00', label: 'Pedestrian' },
  ];

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 2.1: Multi-series Line Chart – 10-Year Trajectory
  // ═══════════════════════════════════════════════════════════════
  function renderTrajectoryLineChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      // Parse years and numeric values
      const parsed = rawData.map(d => {
        const row = { year: +d['Calendar year'] };
        SERIES_CONFIG.forEach(s => {
          row[s.key] = +d[s.key] || 0;
        });
        return row;
      }).sort((a, b) => a.year - b.year);

      const margin = { top: 50, right: 130, bottom: 45, left: 65 };
      const width = 850;
      const height = 440;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', '10-year multi-series line chart of road trauma trajectories 2011 to 2021');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const x = d3.scaleLinear()
        .domain(d3.extent(parsed, d => d.year))
        .range([0, innerWidth]);

      const maxVal = d3.max(parsed, d => d3.max(SERIES_CONFIG, s => d[s.key]));
      const y = d3.scaleLinear()
        .domain([0, maxVal * 1.08])
        .nice()
        .range([innerHeight, 0]);

      // Subtle horizontal guide grids
      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(''))
        .selectAll('line')
        .attr('stroke', 'rgba(0,0,0,0.06)')
        .attr('stroke-dasharray', '2 4');

      // ── Series Breaks & Context Annotations ───────────────────
      // Victoria 2012 ED exclusion
      g.append('line')
        .attr('x1', x(2012)).attr('x2', x(2012))
        .attr('y1', 0).attr('y2', innerHeight)
        .attr('stroke', '#94a3b8')
        .attr('stroke-dasharray', '3 3');

      g.append('text')
        .attr('x', x(2012) + 4).attr('y', 14)
        .style('font-size', '9.5px')
        .style('fill', '#64748b')
        .text('2012: Vic ED break');

      // NSW 2017 ED exclusion
      g.append('line')
        .attr('x1', x(2017)).attr('x2', x(2017))
        .attr('y1', 0).attr('y2', innerHeight)
        .attr('stroke', '#94a3b8')
        .attr('stroke-dasharray', '3 3');

      g.append('text')
        .attr('x', x(2017) + 4).attr('y', 14)
        .style('font-size', '9.5px')
        .style('fill', '#64748b')
        .text('2017: NSW ED break');

      // 2020 COVID shock highlight band
      g.append('rect')
        .attr('x', x(2019.8))
        .attr('y', 0)
        .attr('width', x(2020.2) - x(2019.8))
        .attr('height', innerHeight)
        .attr('fill', 'rgba(213, 94, 0, 0.08)');

      g.append('text')
        .attr('x', x(2020)).attr('y', innerHeight - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', '#D55E00')
        .text('2020 COVID Shock');

      // X-axis
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(11).tickFormat(d3.format('d')))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      // Y-axis
      g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).ticks(6).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '12px')
        .text('Annual Hospitalisations');

      // Line Generator
      const lineGen = (key) => d3.line()
        .x(d => x(d.year))
        .y(d => y(d[key]))
        .curve(d3.curveMonotoneX);

      // Draw Lines
      const lineGroup = g.append('g').attr('class', 'lines-group');

      SERIES_CONFIG.forEach(s => {
        const path = lineGroup.append('path')
          .datum(parsed)
          .attr('class', `line-path line-${s.key.replace(/\s+/g, '-')}`)
          .attr('fill', 'none')
          .attr('stroke', s.color)
          .attr('stroke-width', s.key === 'Pedal cyclist' ? 3.5 : 2.5)
          .attr('d', lineGen(s.key));

        // End Label
        const lastPt = parsed[parsed.length - 1];
        g.append('text')
          .attr('class', `end-label label-${s.key.replace(/\s+/g, '-')}`)
          .attr('x', x(lastPt.year) + 8)
          .attr('y', y(lastPt[s.key]) + 4)
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', s.color)
          .text(`${s.label} (${fmtComma(lastPt[s.key])})`);

        // Data dots
        g.selectAll(`.dot-${s.key.replace(/\s+/g, '-')}`)
          .data(parsed)
          .enter()
          .append('circle')
          .attr('class', 'data-dot')
          .attr('cx', d => x(d.year))
          .attr('cy', d => y(d[s.key]))
          .attr('r', 3.5)
          .attr('fill', s.color)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
          .on('mouseenter', function (event, d) {
            d3.select(this).attr('r', 6);
            tooltip.classed('visible', true)
              .html(`
                <div class="tooltip-title">${s.label} (${d.year})</div>
                <div class="tooltip-row"><span>Hospitalisations:</span> <span class="tooltip-val">${fmtComma(d[s.key])}</span></div>
                ${d.year === 2020 && s.key === 'Pedal cyclist' ? '<div style="color:#ff9f0a;font-size:10px;margin-top:2px;">Lockdown peak record!</div>' : ''}
              `);
          })
          .on('mousemove', function (event) {
            tooltip
              .style('left', `${event.pageX + 14}px`)
              .style('top', `${event.pageY - 28}px`);
          })
          .on('mouseleave', function () {
            d3.select(this).attr('r', 3.5);
            tooltip.classed('visible', false);
          });
      });

      // Top Interactive Legend
      const legend = svg.append('g')
        .attr('transform', `translate(${margin.left}, 15)`);

      SERIES_CONFIG.forEach((s, i) => {
        const item = legend.append('g')
          .attr('transform', `translate(${i * 135}, 0)`)
          .style('cursor', 'pointer')
          .on('mouseenter', function () {
            lineGroup.selectAll('.line-path')
              .attr('opacity', 0.2);
            lineGroup.select(`.line-${s.key.replace(/\s+/g, '-')}`)
              .attr('opacity', 1)
              .attr('stroke-width', 4);
          })
          .on('mouseleave', function () {
            lineGroup.selectAll('.line-path')
              .attr('opacity', 1)
              .attr('stroke-width', d => d ? 2.5 : 2.5);
          });

        item.append('line')
          .attr('x1', 0).attr('x2', 16).attr('y1', 6).attr('y2', 6)
          .attr('stroke', s.color).attr('stroke-width', 3);
        item.append('circle')
          .attr('cx', 8).attr('cy', 6).attr('r', 3.5).attr('fill', s.color);
        item.append('text')
          .attr('x', 22).attr('y', 10)
          .style('font-size', '11.5px')
          .style('font-weight', '500')
          .style('fill', '#1d1d1f')
          .text(s.label);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 2.2: Diverging Bar Chart – 10-Year Net Change (2011 vs 2021)
  // ═══════════════════════════════════════════════════════════════
  function renderSlopeNetChangeChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      const row2011 = rawData.find(d => +d['Calendar year'] === 2011);
      const row2021 = rawData.find(d => +d['Calendar year'] === 2021);

      if (!row2011 || !row2021) return;

      const changeData = SERIES_CONFIG.map(s => {
        const val11 = +row2011[s.key] || 0;
        const val21 = +row2021[s.key] || 0;
        const diff = val21 - val11;
        const pct = val11 > 0 ? diff / val11 : 0;
        return {
          key: s.key,
          label: s.label,
          color: s.color,
          val11,
          val21,
          diff,
          pct,
        };
      }).sort((a, b) => b.pct - a.pct); // Highest growth first

      const margin = { top: 25, right: 90, bottom: 40, left: 140 };
      const width = 850;
      const height = 300;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Diverging bar chart of 10-year percentage change by road user');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const y = d3.scaleBand()
        .domain(changeData.map(d => d.label))
        .range([0, innerHeight])
        .padding(0.32);

      const maxAbs = Math.max(Math.abs(d3.min(changeData, d => d.pct)), d3.max(changeData, d => d.pct));
      const x = d3.scaleLinear()
        .domain([-maxAbs * 1.25, maxAbs * 1.25])
        .range([0, innerWidth]);

      // Zero baseline
      g.append('line')
        .attr('x1', x(0)).attr('x2', x(0))
        .attr('y1', 0).attr('y2', innerHeight)
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1.5);

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
        .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('+.0%')))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      // Bars
      const bars = g.selectAll('.change-bar')
        .data(changeData)
        .enter()
        .append('rect')
        .attr('class', 'change-bar')
        .attr('y', d => y(d.label))
        .attr('x', d => d.pct >= 0 ? x(0) : x(d.pct))
        .attr('height', y.bandwidth())
        .attr('width', d => Math.abs(x(d.pct) - x(0)))
        .attr('rx', 3)
        .attr('fill', d => d.pct >= 0 ? '#009E73' : '#D55E00') // Green for growth, Vermillion for drop
        .attr('opacity', 0.9);

      // Value Labels
      g.selectAll('.change-label')
        .data(changeData)
        .enter()
        .append('text')
        .attr('y', d => y(d.label) + y.bandwidth() / 2 + 4)
        .attr('x', d => d.pct >= 0 ? x(d.pct) + 8 : x(d.pct) - 8)
        .attr('text-anchor', d => d.pct >= 0 ? 'start' : 'end')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', d => d.pct >= 0 ? '#009E73' : '#D55E00')
        .text(d => `${fmtPercent(d.pct)} (${d.diff >= 0 ? '+' : ''}${fmtComma(d.diff)})`);

      // Tooltip
      bars
        .on('mouseenter', function (event, d) {
          tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.label} (2011 vs 2021)</div>
              <div class="tooltip-row"><span>2011 Count:</span> <span class="tooltip-val">${fmtComma(d.val11)}</span></div>
              <div class="tooltip-row"><span>2021 Count:</span> <span class="tooltip-val">${fmtComma(d.val21)}</span></div>
              <div class="tooltip-row"><span>Net Shift:</span> <span class="tooltip-accent">${fmtPercent(d.pct)} (${d.diff >= 0 ? '+' : ''}${fmtComma(d.diff)} cases)</span></div>
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
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 2.3: Stacked Area / Proportion of Vulnerable Road Users
  // ═══════════════════════════════════════════════════════════════
  function renderCompositionChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      const keys = ['Car driver', 'Motorcyclist', 'Pedal cyclist', 'Car passenger', 'Pedestrian'];
      const parsed = rawData.map(d => {
        const row = { year: +d['Calendar year'] };
        let sum = 0;
        keys.forEach(k => {
          row[k] = +d[k] || 0;
          sum += row[k];
        });
        row.total = sum;
        return row;
      }).sort((a, b) => a.year - b.year);

      const margin = { top: 30, right: 120, bottom: 40, left: 65 };
      const width = 850;
      const height = 350;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Stacked area chart showing relative proportion of road users over time');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear()
        .domain(d3.extent(parsed, d => d.year))
        .range([0, innerWidth]);

      const y = d3.scaleLinear()
        .domain([0, 1])
        .range([innerHeight, 0]);

      const colorMap = {
        'Car driver': '#0072B2',
        'Motorcyclist': '#E69F00',
        'Pedal cyclist': '#009E73',
        'Car passenger': '#56B4E9',
        'Pedestrian': '#D55E00',
      };

      const stack = d3.stack()
        .keys(keys)
        .offset(d3.stackOffsetExpand);

      const stackedData = stack(parsed);

      const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveMonotoneX);

      g.selectAll('.area-layer')
        .data(stackedData)
        .enter()
        .append('path')
        .attr('class', 'area-layer')
        .attr('d', area)
        .attr('fill', d => colorMap[d.key])
        .attr('opacity', 0.82)
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('opacity', 1);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('opacity', 0.82);
        });

      // X-axis
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(11).tickFormat(d3.format('d')))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      // Y-axis (Percentage)
      g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      // End labels
      stackedData.forEach(layer => {
        const last = layer[layer.length - 1];
        const yPos = y((last[0] + last[1]) / 2);
        g.append('text')
          .attr('x', innerWidth + 8)
          .attr('y', yPos + 3)
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', colorMap[layer.key])
          .text(layer.key);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZE ON DOM READY
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function () {
    renderTrajectoryLineChart('#chart-year', 'data/rq2_trends.csv');
    renderSlopeNetChangeChart('#chart-injury-count', 'data/rq2_trends.csv');
    renderCompositionChart('#chart-demographic-trends', 'data/rq2_trends.csv');
  });

})();
