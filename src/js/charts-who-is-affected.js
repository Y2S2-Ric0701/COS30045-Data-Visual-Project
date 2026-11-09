/* ═══════════════════════════════════════════════════════════════
   charts-who-is-affected.js – D3 Visualisations for Question 1
   COS30045 Data Visualisation Project
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Global tooltip singleton ─────────────────────────────────
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

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 1.1: Horizontal Bar Chart – Hospitalisations by Age Group
  // ═══════════════════════════════════════════════════════════════
  function renderAgeGroupChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      // Clean and parse data (filter out 'Missing')
      const data = rawData
        .map(d => ({
          age: d['Age group'],
          cases: +d['Sum(Hospitalisations)'],
        }))
        .filter(d => d.age && d.age.toLowerCase() !== 'missing' && !isNaN(d.cases));

      const totalCases = d3.sum(data, d => d.cases);

      const margin = { top: 20, right: 90, bottom: 45, left: 75 };
      const width = 850;
      const height = 380;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Horizontal bar chart of hospitalised injuries by age group');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const y = d3.scaleBand()
        .domain(data.map(d => d.age))
        .range([0, innerHeight])
        .padding(0.28);

      const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.cases) * 1.12])
        .nice()
        .range([0, innerWidth]);

      // Subtle horizontal background guide grids
      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisBottom(x).ticks(6).tickSize(innerHeight).tickFormat(''))
        .selectAll('line')
        .attr('stroke', 'rgba(0,0,0,0.06)')
        .attr('stroke-dasharray', '2 4');

      // Y-axis (Age Groups)
      g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).tickSize(0).tickPadding(10))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#1d1d1f');

      // X-axis (Hospitalisations)
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      // Axis label
      g.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 38)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '12px')
        .text('Total Hospitalised Cases (2011–2021)');

      // Bars
      const bars = g.selectAll('.bar-age')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar bar-age')
        .attr('y', d => y(d.age))
        .attr('x', 0)
        .attr('height', y.bandwidth())
        .attr('rx', 4)
        .attr('width', 0) // start at 0 for transition
        .attr('fill', d => d.age === '40-64' ? '#0072B2' : (d.age === '17-25' ? '#D55E00' : '#888888'))
        .attr('opacity', d => d.age === '40-64' || d.age === '17-25' ? 0.95 : 0.45);

      // Transition width
      bars.transition()
        .duration(750)
        .ease(d3.easeCubicOut)
        .attr('width', d => x(d.cases));

      // Value labels at end of bars
      g.selectAll('.label-val')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'label-val')
        .attr('y', d => y(d.age) + y.bandwidth() / 2 + 4)
        .attr('x', d => x(d.cases) + 8)
        .style('font-family', 'var(--apple-font, sans-serif)')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#1d1d1f')
        .text(d => fmtComma(d.cases));

      // Hover interactions & tooltip
      bars
        .on('mouseenter', function (event, d) {
          d3.select(this)
            .attr('opacity', 1)
            .attr('filter', 'brightness(0.92)');

          tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">Age Group: ${d.age}</div>
              <div class="tooltip-row"><span>Total Hospitalised:</span> <span class="tooltip-val">${fmtComma(d.cases)}</span></div>
              <div class="tooltip-row"><span>Share of Trauma:</span> <span class="tooltip-accent">${fmtPercent(d.cases / totalCases)}</span></div>
              ${d.age === '40-64' ? '<div style="margin-top:4px;font-size:10px;color:#ff9f0a;">Highest absolute volume (spans 25 yrs)</div>' : ''}
              ${d.age === '17-25' ? '<div style="margin-top:4px;font-size:10px;color:#ff9f0a;">Highest per-year density (~9,900/yr)</div>' : ''}
            `);
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', `${event.pageX + 14}px`)
            .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseleave', function (event, d) {
          d3.select(this)
            .attr('opacity', d.age === '40-64' || d.age === '17-25' ? 0.95 : 0.45)
            .attr('filter', null);
          tooltip.classed('visible', false);
        });

      // Context note at bottom right
      svg.append('text')
        .attr('x', width - margin.right)
        .attr('y', height - 8)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', '#86868b')
        .text('Note: 40–64 covers 25 years. Per-year rate peaks at age 17–25 (~9,900 cases/year).');
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 1.2: Gender Disparity by Road User (Grouped / Split Bar)
  // ═══════════════════════════════════════════════════════════════
  function renderGenderChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      // Pick top 7 primary road users for clean presentation
      const targetUsers = [
        'Motorcyclist',
        'Car driver',
        'Pedal cyclist',
        'Car passenger',
        'Pedestrian',
        'Heavy transport driver',
        'Bus occupant'
      ];

      const data = rawData
        .filter(d => targetUsers.includes(d['Road user']))
        .map(d => {
          const female = +d['Female+Mean(Sum(Hospitalisations))'] || 0;
          const male = +d['Male+Mean(Sum(Hospitalisations))'] || 0;
          const total = female + male;
          return {
            user: d['Road user'],
            female,
            male,
            total,
            malePct: total > 0 ? male / total : 0,
            femalePct: total > 0 ? female / total : 0,
          };
        })
        .sort((a, b) => b.malePct - a.malePct); // Sort by male dominance

      const margin = { top: 40, right: 40, bottom: 40, left: 160 };
      const width = 850;
      const height = 400;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Stacked 100 percent bar chart showing male vs female road user injuries');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const y = d3.scaleBand()
        .domain(data.map(d => d.user))
        .range([0, innerHeight])
        .padding(0.32);

      const x = d3.scaleLinear()
        .domain([0, 1])
        .range([0, innerWidth]);

      // Y-axis
      g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).tickSize(0).tickPadding(12))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#1d1d1f');

      // X-axis (0% to 100%)
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.0%')))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      // Neutral 50% midpoint line
      g.append('line')
        .attr('x1', x(0.5))
        .attr('x2', x(0.5))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', 'rgba(0,0,0,0.2)')
        .attr('stroke-dasharray', '3 3');

      // Rows
      const row = g.selectAll('.gender-row')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'gender-row')
        .attr('transform', d => `translate(0, ${y(d.user)})`);

      // Male segment (Left -> Right: Blue #0072B2)
      row.append('rect')
        .attr('class', 'bar male-bar')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', y.bandwidth())
        .attr('fill', '#0072B2')
        .attr('rx', 3)
        .attr('width', 0)
        .transition()
        .duration(800)
        .attr('width', d => x(d.malePct));

      // Female segment (Orange/Purple #E69F00)
      row.append('rect')
        .attr('class', 'bar female-bar')
        .attr('x', d => x(d.malePct))
        .attr('y', 0)
        .attr('height', y.bandwidth())
        .attr('fill', '#CC79A7')
        .attr('rx', 3)
        .attr('width', 0)
        .transition()
        .duration(800)
        .attr('width', d => x(d.femalePct));

      // Inline labels inside bars
      row.append('text')
        .attr('x', d => Math.max(8, x(d.malePct) / 2))
        .attr('y', y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'middle')
        .style('fill', '#ffffff')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('pointer-events', 'none')
        .text(d => d.malePct >= 0.15 ? fmtPercent(d.malePct) : '');

      row.append('text')
        .attr('x', d => x(d.malePct) + (innerWidth - x(d.malePct)) / 2)
        .attr('y', y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'middle')
        .style('fill', '#ffffff')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('pointer-events', 'none')
        .text(d => d.femalePct >= 0.15 ? fmtPercent(d.femalePct) : '');

      // Tooltip triggers
      row.selectAll('rect')
        .on('mouseenter', function (event, d) {
          tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.user}</div>
              <div class="tooltip-row"><span>Male cases:</span> <span class="tooltip-val" style="color:#56B4E9;">${fmtComma(d.male)} (${fmtPercent(d.malePct)})</span></div>
              <div class="tooltip-row"><span>Female cases:</span> <span class="tooltip-val" style="color:#CC79A7;">${fmtComma(d.female)} (${fmtPercent(d.femalePct)})</span></div>
              <div class="tooltip-row"><span>Total cases:</span> <span class="tooltip-val">${fmtComma(d.total)}</span></div>
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

      // Top Legend
      const legend = svg.append('g')
        .attr('transform', `translate(${margin.left}, 15)`);

      legend.append('rect')
        .attr('x', 0).attr('y', 0).attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', '#0072B2');
      legend.append('text')
        .attr('x', 18).attr('y', 10).style('font-size', '12px').style('fill', '#1d1d1f').text('Male Hospitalisations');

      legend.append('rect')
        .attr('x', 180).attr('y', 0).attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', '#CC79A7');
      legend.append('text')
        .attr('x', 198).attr('y', 10).style('font-size', '12px').style('fill', '#1d1d1f').text('Female Hospitalisations');
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 1.3: Lollipop Chart – Hospitalisations by Road User Type
  // ═══════════════════════════════════════════════════════════════
  function renderRoadUserChart(containerId, dataPath) {
    const container = d3.select(containerId);
    if (container.empty()) return;
    container.selectAll('*').remove();

    d3.csv(dataPath).then(function (rawData) {
      // Filter out low/negligible categories for high data-ink ratio
      const data = rawData
        .map(d => ({
          user: d['Road user'],
          cases: +d['Sum(Hospitalisations)'],
        }))
        .filter(d => !d.user.toLowerCase().includes('unknown position') && d.cases > 2000)
        .sort((a, b) => b.cases - a.cases);

      const totalCases = d3.sum(data, d => d.cases);

      const margin = { top: 25, right: 90, bottom: 45, left: 160 };
      const width = 850;
      const height = 400;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('role', 'img')
        .attr('aria-label', 'Lollipop chart of hospitalised road user types');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const y = d3.scaleBand()
        .domain(data.map(d => d.user))
        .range([0, innerHeight])
        .padding(0.4);

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
        .call(d3.axisLeft(y).tickSize(0).tickPadding(12))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#1d1d1f');

      // X-axis
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      // Axis label
      g.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 38)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '12px')
        .text('Total Hospitalised Cases (2011–2021)');

      // Lollipop Stems (lines)
      const stems = g.selectAll('.lollipop-line')
        .data(data)
        .enter()
        .append('line')
        .attr('class', 'lollipop-line')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', d => y(d.user) + y.bandwidth() / 2)
        .attr('y2', d => y(d.user) + y.bandwidth() / 2)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 2.5);

      stems.transition()
        .duration(750)
        .ease(d3.easeCubicOut)
        .attr('x2', d => x(d.cases));

      // Lollipop Heads (circles)
      const heads = g.selectAll('.lollipop-dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'lollipop-dot')
        .attr('cx', 0)
        .attr('cy', d => y(d.user) + y.bandwidth() / 2)
        .attr('r', 6.5)
        .attr('fill', (d, i) => i === 0 ? '#0072B2' : (i === 1 ? '#E69F00' : (i === 2 ? '#009E73' : '#888888')))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);

      heads.transition()
        .duration(750)
        .ease(d3.easeCubicOut)
        .attr('cx', d => x(d.cases));

      // Value text labels
      g.selectAll('.lollipop-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'lollipop-label')
        .attr('x', d => x(d.cases) + 12)
        .attr('y', d => y(d.user) + y.bandwidth() / 2 + 4)
        .style('font-family', 'var(--apple-font, sans-serif)')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#1d1d1f')
        .text(d => fmtComma(d.cases));

      // Hover interactions
      g.selectAll('.lollipop-target')
        .data(data)
        .enter()
        .append('rect')
        .attr('y', d => y(d.user))
        .attr('x', 0)
        .attr('width', innerWidth)
        .attr('height', y.bandwidth())
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseenter', function (event, d) {
          tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.user}</div>
              <div class="tooltip-row"><span>Total Hospitalised:</span> <span class="tooltip-val">${fmtComma(d.cases)}</span></div>
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
  // INITIALIZE ON DOM READY
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function () {
    renderAgeGroupChart('#chart-age-group', 'data/rq1_age_group.csv');
    renderGenderChart('#chart-gender', 'data/rq1_gender_male.csv');
    renderRoadUserChart('#chart-road-user-type', 'data/rq1_road_user.csv');
  });

})();
