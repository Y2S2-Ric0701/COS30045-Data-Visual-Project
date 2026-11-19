/* ═══════════════════════════════════════════════════════════════
   charts-severity.js – Page Controller for Question 5 (Severity)
   COS30045 Data Visualisation Project
   Pattern: Object-Oriented Component Instantiation
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  d3.csv('data/rq5_mortality_severity.csv').then(function (rawData) {
    const formatted = rawData.map(d => {
      const cases = +d['Sum(Count of cases)'] || 0;
      const deaths = +d['Sum(Died_cases)'] || 0;
      const bedDays = +d['Sum(Bed days)'] || 0;
      const rate = +d['Deaths_per_1000'] || (cases > 0 ? (deaths / cases) * 1000 : 0);
      const avgBedDays = cases > 0 ? Math.round((bedDays / cases) * 10) / 10 : 0;
      return {
        user: d['Road user'],
        cases,
        deaths,
        bedDays,
        rate: Math.round(rate * 100) / 100,
        avgBedDays,
      };
    }).filter(d => !d.user.toLowerCase().includes('unknown position') && d.cases > 1000);

    const userColors = {
      'Car driver': '#0072B2',
      'Motorcyclist': '#E69F00',
      'Pedal cyclist': '#009E73',
      'Car passenger': '#56B4E9',
      'Pedestrian': '#D55E00',
      'Heavy transport driver': '#64748b',
      'Pick-up truck or van occupant': '#94a3b8',
      'Bus occupant': '#94a3b8',
      'Other or unknown': '#94a3b8',
    };

    // ── Figure 5.1: In-Hospital Mortality Rate per 1,000 Cases ───
    new Vis.BarChart('#chart-mortality-risk', formatted, {
      labelKey: 'user',
      valueKey: 'rate',
      gradient: true,
      xLabel: 'Deaths per 1,000 Hospitalised Cases (2011–2019 Baseline)',
      valueLabel: 'Mortality Rate:',
      unit: ' deaths / 1k',
      valueFormatter: d => `${d.toFixed(1)} / 1k`,
      showProportion: false,
      margin: { top: 25, right: 90, bottom: 45, left: 235 },
      height: 420,
    });

    // ── Figure 5.2: Average Hospital Bed Days per Case ────────────
    new Vis.BarChart('#chart-length-of-stay', formatted, {
      labelKey: 'user',
      valueKey: 'avgBedDays',
      gradient: true,
      xLabel: 'Average Inpatient Bed Days per Hospitalised Case',
      valueLabel: 'Average Stay:',
      unit: ' days',
      valueFormatter: d => `${d.toFixed(1)} days`,
      showProportion: false,
      margin: { top: 25, right: 90, bottom: 45, left: 235 },
      height: 420,
    });

    // ── Figure 5.3: Volume vs. Severity Bubble Chart (Climax) ────
    const bubbleVis = new Vis.BubbleChart('#chart-injury-severity', formatted, {
      xKey: 'cases',
      yKey: 'rate',
      rKey: 'avgBedDays',
      labelKey: 'user',
      colorMap: userColors,
      height: 520,
      margin: { top: 45, right: 95, bottom: 55, left: 65 },
    });

    // ── Interactive Segmented Control Filtering ──────────────────
    // Chip appearance (hover / active) is defined in css/base.css.
    const filterBtns = document.querySelectorAll('#severity-filter-control .filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        // Reset any locked chip on cohort switch
        d3.selectAll('#bubble-interactive-legend .legend-chip').classed('active', false);
        bubbleVis.filterByCohort(this.getAttribute('data-filter'));
      });
    });

    // ── Interactive Road User Spotlight Legend Bar ──────────────
    const legendContainer = d3.select('#bubble-interactive-legend');
    if (!legendContainer.empty()) {
      legendContainer.selectAll('*').remove();

      legendContainer.append('div')
        .attr('class', 'interactive-legend-title')
        .html('Interactive Cohort Spotlight &bull; Hover or Click to Lock Crosshairs');

      const chipsWrapper = legendContainer.append('div')
        .attr('class', 'interactive-legend-chips');

      // Sort road users by clinical mortality rate descending (matching Fig 5.1 order)
      const sortedUsers = [...formatted].sort((a, b) => b.rate - a.rate);

      const chips = chipsWrapper.selectAll('.legend-chip')
        .data(sortedUsers)
        .join('button')
        .attr('class', 'legend-chip')
        .attr('type', 'button')
        .attr('aria-label', d => `Spotlight ${d.user}`);

      chips.append('span')
        .attr('class', 'legend-chip-dot')
        .style('background-color', d => userColors[d.user] || '#0072B2');

      chips.append('span')
        .attr('class', 'legend-chip-label')
        .text(d => d.user);

      chips
        .on('mouseenter', (event, d) => bubbleVis.spotlight(d.user))
        .on('mouseleave', () => {
          const locked = chipsWrapper.select('.legend-chip.active');
          if (!locked.empty()) bubbleVis.spotlight(locked.datum().user);
          else bubbleVis.resetSpotlight();
        })
        .on('click', function (event, d) {
          const wasActive = this.classList.contains('active');
          chips.classed('active', false);
          if (!wasActive) {
            d3.select(this).classed('active', true);
            bubbleVis.spotlight(d.user);
          } else {
            bubbleVis.resetSpotlight();
          }
        });
    }

  }).catch(err => console.error('Error loading rq5_mortality_severity.csv:', err));

});
