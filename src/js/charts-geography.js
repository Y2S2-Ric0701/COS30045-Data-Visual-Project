/* ═══════════════════════════════════════════════════════════════
   charts-geography.js – D3 Visualisations for Question 3 (Geography)
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
  const fmtPercent = d3.format('.1%');
  const fmtDec1 = d3.format('.1f');

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 3.1: State and Territory Comparison (2021 Volume)
  // ═══════════════════════════════════════════════════════════════
  function renderStateChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      const row2021 = rawData.find(d => +d.year === 2021);
      if (!row2021) return;

      const states = ['VIC', 'QLD', 'NSW', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
      const data = states.map(st => ({
        state: st,
        cases: +row2021[st] || 0,
      })).sort((a, b) => b.cases - a.cases);

      const totalCases = +row2021.Total || d3.sum(data, d => d.cases);

      const margin = { top: 25, right: 90, bottom: 45, left: 65 };
      const width = 850;
      const height = 360;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Bar chart of 2021 hospitalisations by Australian state and territory');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const y = d3.scaleBand()
        .domain(data.map(d => d.state))
        .range([0, innerHeight])
        .padding(0.28);

      const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.cases) * 1.15])
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
        .call(d3.axisLeft(y).tickSize(0).tickPadding(10))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', '#1d1d1f');

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
        .attr('y', innerHeight + 38)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '12px')
        .text('Hospitalised Injuries (2021)');

      // Bars
      const bars = g.selectAll('.bar-state')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar bar-state')
        .attr('y', d => y(d.state))
        .attr('x', 0)
        .attr('height', y.bandwidth())
        .attr('rx', 4)
        .attr('width', 0)
        .attr('fill', (d, i) => i === 0 ? '#0072B2' : (i < 3 ? '#56B4E9' : '#888888'))
        .attr('opacity', (d, i) => i < 3 ? 0.95 : 0.55);

      bars.transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('width', d => x(d.cases));

      // Labels
      g.selectAll('.label-state')
        .data(data)
        .enter()
        .append('text')
        .attr('y', d => y(d.state) + y.bandwidth() / 2 + 4)
        .attr('x', d => x(d.cases) + 8)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#1d1d1f')
        .text(d => `${fmtComma(d.cases)} (${fmtPercent(d.cases / totalCases)})`);

      // Tooltip
      bars
        .on('mouseenter', function (event, d) {
          tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.state} (2021)</div>
              <div class="tooltip-row"><span>Admissions:</span> <span class="tooltip-val">${fmtComma(d.cases)}</span></div>
              <div class="tooltip-row"><span>National Share:</span> <span class="tooltip-accent">${fmtPercent(d.cases / totalCases)}</span></div>
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
  // FIGURE 3.2: Remoteness Area (Metro vs Regional Paradox)
  // ═══════════════════════════════════════════════════════════════
  function renderRemotenessChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      const data = rawData.map(d => ({
        remoteness: d.remoteness,
        cases: +d.hospitalisations || 0,
        rate: +d.deaths_per_1000 || 0,
        avgBedDays: +d.avg_bed_days || 0,
      }));

      const totalCases = d3.sum(data, d => d.cases);

      const margin = { top: 25, right: 90, bottom: 45, left: 110 };
      const width = 850;
      const height = 280;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Bar chart comparing major cities vs regional and remote areas');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const y = d3.scaleBand()
        .domain(data.map(d => d.remoteness))
        .range([0, innerHeight])
        .padding(0.35);

      const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.cases) * 1.15])
        .nice()
        .range([0, innerWidth]);

      // Y-axis
      g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).tickSize(0).tickPadding(10))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#1d1d1f');

      // X-axis
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d))
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
        .text('Total Hospitalised Cases (2011–2021)');

      // Bars
      const bars = g.selectAll('.bar-rem')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar bar-rem')
        .attr('y', d => y(d.remoteness))
        .attr('x', 0)
        .attr('height', y.bandwidth())
        .attr('rx', 4)
        .attr('fill', d => d.remoteness === 'Major Cities' ? '#0072B2' : (d.remoteness === 'Regional' ? '#E69F00' : '#D55E00'))
        .attr('width', 0)
        .transition()
        .duration(800)
        .attr('width', d => x(d.cases));

      // Labels
      g.selectAll('.label-rem')
        .data(data)
        .enter()
        .append('text')
        .attr('y', d => y(d.remoteness) + y.bandwidth() / 2 + 4)
        .attr('x', d => x(d.cases) + 8)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#1d1d1f')
        .text(d => `${fmtComma(d.cases)} (${fmtPercent(d.cases / totalCases)})`);

      g.selectAll('.bar-rem')
        .on('mouseenter', function (event, d) {
          tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.remoteness}</div>
              <div class="tooltip-row"><span>Hospital Admissions:</span> <span class="tooltip-val">${fmtComma(d.cases)} (${fmtPercent(d.cases / totalCases)})</span></div>
              <div class="tooltip-row"><span>Avg Hospital Stay:</span> <span class="tooltip-accent">${fmtDec1(d.avgBedDays)} days</span></div>
              <div class="tooltip-row"><span>Mortality Rate:</span> <span class="tooltip-val">${fmtDec1(d.rate)} / 1,000</span></div>
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
  // FIGURE 3.3: 10-Year Regional Shifts (NSW, VIC, QLD Trajectory)
  // ═══════════════════════════════════════════════════════════════
  function renderStateTrendsChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      const topStates = [
        { key: 'NSW', color: '#0072B2' },
        { key: 'VIC', color: '#E69F00' },
        { key: 'QLD', color: '#009E73' },
        { key: 'WA',  color: '#56B4E9' },
      ];

      const parsed = rawData.map(d => {
        const row = { year: +d.year };
        topStates.forEach(s => { row[s.key] = +d[s.key] || 0; });
        return row;
      }).sort((a, b) => a.year - b.year);

      const margin = { top: 40, right: 80, bottom: 45, left: 65 };
      const width = 850;
      const height = 360;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', '10-year line chart of state hospitalisation trajectories');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear()
        .domain(d3.extent(parsed, d => d.year))
        .range([0, innerWidth]);

      const maxVal = d3.max(parsed, d => d3.max(topStates, s => d[s.key]));
      const y = d3.scaleLinear()
        .domain([0, maxVal * 1.1])
        .nice()
        .range([innerHeight, 0]);

      // Grid
      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(''))
        .selectAll('line')
        .attr('stroke', 'rgba(0,0,0,0.06)')
        .attr('stroke-dasharray', '2 4');

      // X-axis
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(11).tickFormat(d3.format('d')))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      // Y-axis
      g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      const lineGen = (key) => d3.line()
        .x(d => x(d.year))
        .y(d => y(d[key]))
        .curve(d3.curveMonotoneX);

      topStates.forEach(s => {
        g.append('path')
          .datum(parsed)
          .attr('fill', 'none')
          .attr('stroke', s.color)
          .attr('stroke-width', 2.5)
          .attr('d', lineGen(s.key));

        const last = parsed[parsed.length - 1];
        g.append('text')
          .attr('x', x(last.year) + 6)
          .attr('y', y(last[s.key]) + 4)
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', s.color)
          .text(s.key);
      });

      // Legend
      const legend = svg.append('g')
        .attr('transform', `translate(${margin.left}, 15)`);

      topStates.forEach((s, i) => {
        const item = legend.append('g').attr('transform', `translate(${i * 100}, 0)`);
        item.append('line').attr('x1', 0).attr('x2', 14).attr('y1', 5).attr('y2', 5).attr('stroke', s.color).attr('stroke-width', 3);
        item.append('text').attr('x', 20).attr('y', 9).style('font-size', '11px').style('fill', '#1d1d1f').text(s.key);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZE ON DOM READY
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function () {
    renderStateChart('#chart-state-territory', 'data/rq3_states.csv');
    renderRemotenessChart('#chart-metro-regional', 'data/rq3_remoteness.csv');
    renderStateTrendsChart('#chart-geographic-distribution', 'data/rq3_states.csv');
  });

})();
