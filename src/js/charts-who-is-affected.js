/* ═══════════════════════════════════════════════════════════════
   charts-who-is-affected.js – Page Controller for Question 1
   COS30045 Data Visualisation Project
   Pattern: Object-Oriented Component Instantiation
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // ── Figure 1.1: Hospitalisations by Age Group (drag to filter years) ──
  // Source: AIHW publication, Table 3 (age group by calendar year).
  // A range slider with two draggable buttons (start / end year) sits above
  // the chart; the chart sums only the years between the buttons.
  d3.csv('data/rq1_age_group_by_year.csv').then(function (rawData) {
    const ageOrder = [];
    rawData.forEach(d => { if (!ageOrder.includes(d['Age group'])) ageOrder.push(d['Age group']); });
    const years = [...new Set(rawData.map(d => +d.year))].sort((a, b) => a - b);
    const firstYear = years[0];
    const lastYear = years[years.length - 1];

    function ageDataFor([y0, y1]) {
      const rows = rawData.filter(d => +d.year >= y0 && +d.year <= y1);
      const totals = d3.rollup(rows, v => d3.sum(v, d => +d.Hospitalisations), d => d['Age group']);
      return ageOrder.map(age => ({ 'Age group': age, Hospitalisations: totals.get(age) || 0 }));
    }
    const rangeText = ([y0, y1]) => (y0 === y1 ? `${y0}` : `${y0}–${y1}`);

    const ageChart = new Vis.BarChart('#chart-age-group', ageDataFor([firstYear, lastYear]), {
      sortDescending: false,   // start in natural age order (youngest → oldest)
      labelKey: 'Age group',
      valueKey: 'Hospitalisations',
      // Sequential light→dark blue by volume: every bar gets its own clearly
      // distinguishable shade, and the darkest bar (40–64) is still the focus.
      gradient: true,
      xLabel: `Total Hospitalised Cases (${firstYear}–${lastYear})`,
    });

    // ── Year range slider: two draggable buttons on a track ──
    // • Drag a button to move that end of the range.
    // • When both buttons sit on the same year they act as one button, so a
    //   single drag moves the one-year view (2011 → 2013 in one go).
    // • Click the track or a year label to move the nearer button there
    //   (from 2013 only, clicking 2016 widens it to 2013–2016).
    const W = 760, H = 66;
    const m = { top: 4, right: 22, bottom: 4, left: 22 };
    const iw = W - m.left - m.right;
    const trackY = 20;
    const KNOB_R = 14;          // Apple-style thumb: 28px white circle

    const svg = d3.select('#age-year-slider').append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const x = d3.scalePoint().domain(years).range([0, iw]);
    const yearAt = px => years.reduce((best, y) => Math.abs(x(y) - px) < Math.abs(x(best) - px) ? y : best, firstYear);
    const inRange = (yr, r) => yr >= r[0] && yr <= r[1];

    // Track + click target (track and labels)
    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', trackY).attr('y2', trackY)
      .attr('stroke', '#e5e5ea').attr('stroke-width', 4).attr('stroke-linecap', 'round');
    const fill = g.append('line').attr('y1', trackY).attr('y2', trackY)
      .attr('stroke', '#0071e3').attr('stroke-width', 4).attr('stroke-linecap', 'round');
    const tickLabels = g.selectAll('.year-tick').data(years).join('text')
      .attr('class', 'year-tick')
      .attr('x', d => x(d)).attr('y', trackY + 38)
      .attr('text-anchor', 'middle').style('font-size', '13px')
      .text(d => d);
    g.append('rect')
      .attr('x', -m.left).attr('y', 0).attr('width', W).attr('height', H - m.top)
      .attr('fill', 'transparent').style('cursor', 'pointer')
      .on('click', function (event) {
        const yr = yearAt(d3.pointer(event, g.node())[0]);
        // Move whichever button is nearer; on a tie (stacked) pick by side
        const [a, b] = current;
        const useStart = yr < a || (yr <= b && Math.abs(yr - a) < Math.abs(yr - b));
        apply(useStart ? [yr, b] : [a, yr]);
      });

    // The two buttons (drawn after the click target so they sit on top)
    const knobs = g.selectAll('.year-knob').data([0, 1]).join('g')
      .attr('class', 'year-knob')
      .attr('tabindex', 0)
      .attr('role', 'slider')
      .attr('aria-valuemin', firstYear)
      .attr('aria-valuemax', lastYear)
      .attr('aria-label', i => i === 0 ? 'Start year for Figure 1.1' : 'End year for Figure 1.1')
      .style('cursor', 'grab');
    knobs.append('circle').attr('class', 'year-knob-ring').attr('r', KNOB_R + 4).attr('fill', 'transparent');
    knobs.append('circle').attr('class', 'year-knob-thumb').attr('r', KNOB_R)
      .attr('fill', '#ffffff')
      .attr('stroke', 'rgba(0,0,0,0.04)').attr('stroke-width', 0.5);

    let current = [firstYear, lastYear];

    function paint(range) {
      fill.attr('x1', x(range[0])).attr('x2', x(range[1]));
      tickLabels.style('fill', d => inRange(d, range) ? '#1d1d1f' : '#94a3b8')
        .style('font-weight', d => (d === range[0] || d === range[1]) ? '700' : '400');
      knobs.attr('transform', i => `translate(${x(range[i])},${trackY})`)
        .attr('aria-valuenow', i => range[i])
        .attr('aria-valuetext', i => String(range[i]));
    }

    function apply(range) {
      paint(range);
      if (range[0] === current[0] && range[1] === current[1]) return;
      current = range;
      const n = range[1] - range[0] + 1;
      document.getElementById('age-year-readout').textContent = rangeText(range);
      ageChart.config.xLabel = `${n > 1 ? 'Total ' : ''}Hospitalised Cases (${rangeText(range)})`;
      ageChart.wrangleData(ageDataFor(range));
    }

    // Drag: stacked buttons move together; otherwise each moves its own end
    let together = false;
    knobs.call(d3.drag()
      .container(g.node())
      .on('start', function () {
        together = current[0] === current[1];
        d3.select(this).raise().style('cursor', 'grabbing');
      })
      .on('drag', function (event, i) {
        const yr = yearAt(event.x);
        if (together) return apply([yr, yr]);
        const r = [...current];
        r[i] = i === 0 ? Math.min(yr, current[1]) : Math.max(yr, current[0]);
        apply(r);
      })
      .on('end', function () { d3.select(this).style('cursor', 'grab'); }));

    // Keyboard: ←/→ moves the focused button one year; Home/End jump to the ends.
    // If the move would cross the other button (e.g. both on one year), both move.
    knobs.on('keydown', function (event, i) {
      const keys = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
      let yr;
      if (event.key in keys) yr = current[i] + keys[event.key];
      else if (event.key === 'Home') yr = firstYear;
      else if (event.key === 'End') yr = lastYear;
      else return;
      event.preventDefault();
      yr = Math.max(firstYear, Math.min(lastYear, yr));
      const crosses = i === 0 ? yr > current[1] : yr < current[0];
      if (crosses) return apply([yr, yr]);
      apply(i === 0 ? [yr, current[1]] : [current[0], yr]);
    });

    paint(current);

    // Sort toggle: "Age group" (youngest → oldest) or "Total number" (most → fewest)
    const sortButtons = document.querySelectorAll('#age-sort-control .filter-btn');
    sortButtons.forEach(btn => btn.addEventListener('click', () => {
      sortButtons.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      ageChart.config.sortDescending = btn.dataset.sort === 'total';
      ageChart.wrangleData();
    }));
  }).catch(err => console.error('Error loading rq1_age_group.csv:', err));

  // ── Figure 1.2: Gender Disparity by Road User Type ─────────────
  d3.csv('data/rq1_gender_male.csv').then(function (rawData) {
    const targetUsers = [
      'Motorcyclist',
      'Car driver',
      'Pedal cyclist',
      'Car passenger',
      'Pedestrian',
      'Heavy transport driver',
      'Bus occupant'
    ];

    const formattedData = rawData
      .filter(d => targetUsers.includes(d['Road user']))
      .map(d => ({
        user: d['Road user'],
        Male: +d['Male+Mean(Sum(Hospitalisations))'] || 0,
        Female: +d['Female+Mean(Sum(Hospitalisations))'] || 0,
      }));

    new Vis.StackedBarChart('#chart-gender', formattedData, {
      categoryKey: 'user',
      seriesKeys: ['Male', 'Female'],
      colorMap: {
        Male: '#0072B2',
        Female: '#CC79A7',
      },
      legendItems: [
        { label: 'Male Hospitalisations', color: '#0072B2' },
        { label: 'Female Hospitalisations', color: '#CC79A7' },
      ],
    });
  }).catch(err => console.error('Error loading rq1_gender_male.csv:', err));

  // ── Figure 1.3: Hospitalisations by Road User Type ─────────────
  d3.csv('data/rq1_road_user.csv').then(function (rawData) {
    new Vis.LollipopChart('#chart-road-user-type', rawData, {
      labelKey: 'Road user',
      valueKey: 'Sum(Hospitalisations)',
      xLabel: 'Total Hospitalised Cases (2011–2021)',
      height: 440,
      margin: { top: 25, right: 90, bottom: 45, left: 210 },
      colorMap: {
        'Car driver': '#0072B2',
        'Motorcyclist': '#E69F00',
        'Pedal cyclist': '#009E73',
        'Car passenger': '#56B4E9',
        'Pedestrian': '#D55E00',
        'Other or unknown': '#94a3b8',
        'Heavy transport driver': '#64748b',
        'Pick-up truck or van occupant': '#94a3b8',
        'Bus occupant': '#94a3b8',
      },
    });
  }).catch(err => console.error('Error loading rq1_road_user.csv:', err));

});
