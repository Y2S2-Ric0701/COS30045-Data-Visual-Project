/* ═══════════════════════════════════════════════════════════════
   charts-severity.js – D3 Visualisations for Question 5 (Severity)
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
  const fmtDec1 = d3.format('.1f');
  const fmtDec2 = d3.format('.2f');

  // Color mapping
  const USER_COLORS = {
    'Pedestrian': '#D55E00',       // High severity / alert
    'Bus occupant': '#E69F00',
    'Car passenger': '#56B4E9',
    'Car driver': '#0072B2',
    'Motorcyclist': '#CC79A7',
    'Pedal cyclist': '#009E73',     // Low mortality / teal
    'Heavy transport driver': '#64748b',
    'Pick-up truck or van occupant': '#94a3b8',
  };

  function parseSeverityData(rawData) {
    return rawData
      .map(d => {
        const cases = +d['Sum(Count of cases)'] || 0;
        const deaths = +d['Sum(Died_cases)'] || 0;
        const bedDays = +d['Sum(Bed days)'] || 0;
        const rate = +d['Deaths_per_1000'] || (cases > 0 ? (deaths / cases) * 1000 : 0);
        const avgBedDays = cases > 0 ? bedDays / cases : 0;
        return {
          user: d['Road user'],
          cases,
          deaths,
          bedDays,
          rate,
          avgBedDays,
        };
      })
      .filter(d => !d.user.toLowerCase().includes('unknown position') && d.cases > 1000)
      .sort((a, b) => b.rate - a.rate);
  }

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 5.1: Ranked Bar Chart – Mortality Risk per 1,000 Cases
  // ═══════════════════════════════════════════════════════════════
  function renderMortalityChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      const data = parseSeverityData(rawData);

      const margin = { top: 25, right: 90, bottom: 45, left: 160 };
      const width = 850;
      const height = 360;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Ranked bar chart of in-hospital mortality rate per 1,000 cases');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const y = d3.scaleBand()
        .domain(data.map(d => d.user))
        .range([0, innerHeight])
        .padding(0.3);

      const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.rate) * 1.15])
        .nice()
        .range([0, innerWidth]);

      // Grid
      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisBottom(x).ticks(6).tickSize(innerHeight).tickFormat(''))
        .selectAll('line')
        .attr('stroke', 'rgba(0,0,0,0.06)')
        .attr('stroke-dasharray', '2 4');

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
        .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d}`))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      g.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 38)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '12px')
        .text('In-Hospital Deaths per 1,000 Hospitalised Cases (2011–2019 Baseline)');

      // Bars
      const bars = g.selectAll('.bar-mortality')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar bar-mortality')
        .attr('y', d => y(d.user))
        .attr('x', 0)
        .attr('height', y.bandwidth())
        .attr('rx', 4)
        .attr('width', 0)
        .attr('fill', d => d.user === 'Pedestrian' ? '#D55E00' : (d.user === 'Pedal cyclist' ? '#009E73' : '#888888'))
        .attr('opacity', d => d.user === 'Pedestrian' || d.user === 'Pedal cyclist' ? 0.95 : 0.55);

      bars.transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('width', d => x(d.rate));

      // Labels
      g.selectAll('.label-mort')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'label-mort')
        .attr('y', d => y(d.user) + y.bandwidth() / 2 + 4)
        .attr('x', d => x(d.rate) + 8)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#1d1d1f')
        .text(d => `${fmtDec1(d.rate)} / 1,000`);

      // Tooltip
      bars
        .on('mouseenter', function (event, d) {
          tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.user}</div>
              <div class="tooltip-row"><span>Mortality Risk:</span> <span class="tooltip-accent">${fmtDec2(d.rate)} per 1,000</span></div>
              <div class="tooltip-row"><span>Total Hospital Deaths:</span> <span class="tooltip-val">${fmtComma(d.deaths)}</span></div>
              <div class="tooltip-row"><span>Baseline Cases:</span> <span class="tooltip-val">${fmtComma(d.cases)}</span></div>
              ${d.user === 'Pedestrian' ? '<div style="color:#ff9f0a;font-size:10px;margin-top:2px;">~11x higher mortality than cyclists!</div>' : ''}
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
  // FIGURE 5.2: Average Length of Stay (Bed Days per Case)
  // ═══════════════════════════════════════════════════════════════
  function renderLengthOfStayChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      const data = parseSeverityData(rawData).sort((a, b) => b.avgBedDays - a.avgBedDays);

      const margin = { top: 25, right: 80, bottom: 45, left: 160 };
      const width = 850;
      const height = 350;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Bar chart showing average hospital bed days per crash case');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const y = d3.scaleBand()
        .domain(data.map(d => d.user))
        .range([0, innerHeight])
        .padding(0.32);

      const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.avgBedDays) * 1.15])
        .range([0, innerWidth]);

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
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d} d`))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      g.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 38)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '12px')
        .text('Average Inpatient Bed Days per Hospitalised Case');

      // Bars
      const bars = g.selectAll('.bar-stay')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar bar-stay')
        .attr('y', d => y(d.user))
        .attr('x', 0)
        .attr('height', y.bandwidth())
        .attr('rx', 4)
        .attr('fill', d => d.user === 'Pedestrian' ? '#E69F00' : '#60a5fa')
        .attr('width', 0)
        .transition()
        .duration(800)
        .attr('width', d => x(d.avgBedDays));

      // Labels
      g.selectAll('.label-stay')
        .data(data)
        .enter()
        .append('text')
        .attr('y', d => y(d.user) + y.bandwidth() / 2 + 4)
        .attr('x', d => x(d.avgBedDays) + 8)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#1d1d1f')
        .text(d => `${fmtDec1(d.avgBedDays)} days`);

      g.selectAll('.bar-stay')
        .on('mouseenter', function (event, d) {
          tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.user}</div>
              <div class="tooltip-row"><span>Avg Hospital Stay:</span> <span class="tooltip-val">${fmtDec1(d.avgBedDays)} days</span></div>
              <div class="tooltip-row"><span>Total Bed Days:</span> <span class="tooltip-val">${fmtComma(d.bedDays)}</span></div>
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
  // FIGURE 5.3: The Volume vs Severity Bubble Chart (Narrative Climax)
  // ═══════════════════════════════════════════════════════════════
  function renderVolumeVsSeverityBubble(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      const data = parseSeverityData(rawData);

      const margin = { top: 40, right: 60, bottom: 55, left: 75 };
      const width = 850;
      const height = 480;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Volume versus severity bubble scatter plot');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.cases) * 1.12])
        .range([0, innerWidth]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.rate) * 1.15])
        .nice()
        .range([innerHeight, 0]);

      // Bubble size scale based on average bed days
      const r = d3.scaleSqrt()
        .domain([0, d3.max(data, d => d.avgBedDays)])
        .range([4, 26]);

      // Grid
      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(''))
        .selectAll('line')
        .attr('stroke', 'rgba(0,0,0,0.06)')
        .attr('stroke-dasharray', '2 4');

      // Quadrant partition lines (Median volume and severity)
      const medianCases = 50000;
      const medianMortality = 6.0;

      g.append('line')
        .attr('x1', x(medianCases)).attr('x2', x(medianCases))
        .attr('y1', 0).attr('y2', innerHeight)
        .attr('stroke', 'rgba(0,0,0,0.12)')
        .attr('stroke-dasharray', '4 4');

      g.append('line')
        .attr('x1', 0).attr('x2', innerWidth)
        .attr('y1', y(medianMortality)).attr('y2', y(medianMortality))
        .attr('stroke', 'rgba(0,0,0,0.12)')
        .attr('stroke-dasharray', '4 4');

      // Quadrant labels
      g.append('text')
        .attr('x', 15).attr('y', 20)
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', '#D55E00')
        .text('High Lethality, Low Volume (Pedestrians)');

      g.append('text')
        .attr('x', innerWidth - 15).attr('y', innerHeight - 15)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', '#0072B2')
        .text('High Volume, Lower Lethality (Car Drivers)');

      // X-axis
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      g.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 42)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '12px')
        .text('Hospitalised Injury Volume (Total Cases)');

      // Y-axis
      g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).ticks(6))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -48)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '12px')
        .text('In-Hospital Mortality Rate (Deaths per 1,000 Cases)');

      // Draw Bubbles
      const bubbles = g.selectAll('.bubble')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'bubble')
        .attr('cx', d => x(d.cases))
        .attr('cy', d => y(d.rate))
        .attr('r', 0)
        .attr('fill', d => USER_COLORS[d.user] || '#888888')
        .attr('fill-opacity', 0.72)
        .attr('stroke', d => USER_COLORS[d.user] || '#888888')
        .attr('stroke-width', 2);

      bubbles.transition()
        .duration(900)
        .ease(d3.easeElasticOut.amplitude(1).period(0.6))
        .attr('r', d => r(d.avgBedDays));

      // Labels on bubbles
      g.selectAll('.bubble-text')
        .data(data)
        .enter()
        .append('text')
        .attr('x', d => x(d.cases))
        .attr('y', d => y(d.rate) - r(d.avgBedDays) - 6)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', d => USER_COLORS[d.user] || '#1d1d1f')
        .text(d => d.user);

      // Tooltip
      bubbles
        .on('mouseenter', function (event, d) {
          d3.select(this)
            .attr('fill-opacity', 0.95)
            .attr('stroke-width', 3);

          tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.user}</div>
              <div class="tooltip-row"><span>Total Cases (x):</span> <span class="tooltip-val">${fmtComma(d.cases)}</span></div>
              <div class="tooltip-row"><span>Deaths / 1,000 (y):</span> <span class="tooltip-accent">${fmtDec2(d.rate)}</span></div>
              <div class="tooltip-row"><span>Avg Stay (size):</span> <span class="tooltip-val">${fmtDec1(d.avgBedDays)} days</span></div>
              <div class="tooltip-row"><span>Total Hospital Deaths:</span> <span class="tooltip-val">${fmtComma(d.deaths)}</span></div>
            `);
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', `${event.pageX + 16}px`)
            .style('top', `${event.pageY - 30}px`);
        })
        .on('mouseleave', function () {
          d3.select(this)
            .attr('fill-opacity', 0.72)
            .attr('stroke-width', 2);
          tooltip.classed('visible', false);
        });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZE ON DOM READY
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function () {
    renderMortalityChart('#chart-mortality-risk', 'data/rq5_mortality_severity.csv');
    renderLengthOfStayChart('#chart-length-of-stay', 'data/rq5_mortality_severity.csv');
    renderVolumeVsSeverityBubble('#chart-injury-severity', 'data/rq5_mortality_severity.csv');
  });

})();
