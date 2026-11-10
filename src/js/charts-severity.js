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
      accentKey: 'Pedestrian',
      accentColor: '#D55E00',
      baselineColor: '#888888',
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
      accentKey: 'Pedestrian',
      accentColor: '#D55E00',
      baselineColor: '#888888',
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
    const filterBtns = document.querySelectorAll('#severity-filter-control .filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const filter = this.getAttribute('data-filter');

        // Reset active chips on cohort switch
        const chips = d3.selectAll('#bubble-interactive-legend .legend-chip');
        chips.classed('active', false)
          .style('background', '#ffffff')
          .style('color', '#1d1d1f')
          .style('border-color', '#e2e8f0')
          .style('box-shadow', '0 1px 3px rgba(0, 0, 0, 0.05)');

        bubbleVis.filterByCohort(filter);
      });
    });

    // ── Interactive Road User Spotlight Legend Bar ──────────────
    const legendContainer = d3.select('#bubble-interactive-legend');
    if (!legendContainer.empty()) {
      legendContainer.selectAll('*').remove();

      // Legend Header Label
      legendContainer.append('div')
        .attr('class', 'interactive-legend-title')
        .html('Interactive Cohort Spotlight &bull; Hover or Click to Lock Crosshairs');

      const chipsWrapper = legendContainer.append('div')
        .attr('class', 'interactive-legend-chips')
        .style('display', 'flex')
        .style('flex-wrap', 'wrap')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('gap', '8px 12px');

      // Sort road users by clinical mortality rate descending (matching Fig 5.1 order)
      const sortedUsers = [...formatted].sort((a, b) => b.rate - a.rate);

      sortedUsers.forEach(d => {
        const color = userColors[d.user] || '#0072B2';
        const chip = chipsWrapper.append('button')
          .datum(d)
          .attr('class', 'legend-chip')
          .attr('type', 'button')
          .attr('aria-label', `Spotlight ${d.user}`)
          .style('all', 'unset')
          .style('box-sizing', 'border-box')
          .style('cursor', 'pointer')
          .style('display', 'inline-flex')
          .style('align-items', 'center')
          .style('gap', '8px')
          .style('padding', '6px 14px')
          .style('border-radius', '999px')
          .style('background', '#ffffff')
          .style('border', '1px solid #e2e8f0')
          .style('box-shadow', '0 1px 3px rgba(0, 0, 0, 0.05)')
          .style('font-family', '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif')
          .style('font-size', '12px')
          .style('font-weight', '500')
          .style('color', '#1d1d1f')
          .style('line-height', '1.2')
          .style('transition', 'all 0.18s cubic-bezier(0.25, 0.1, 0.25, 1)');

        chip.append('span')
          .attr('class', 'legend-chip-dot')
          .style('display', 'inline-block')
          .style('width', '10px')
          .style('height', '10px')
          .style('border-radius', '50%')
          .style('background-color', color)
          .style('box-shadow', '0 0 0 1px rgba(0, 0, 0, 0.08)')
          .style('flex-shrink', '0');

        chip.append('span')
          .attr('class', 'legend-chip-label')
          .text(d.user);

        chip
          .on('mouseenter', function () {
            if (!d3.select(this).classed('active')) {
              d3.select(this)
                .style('transform', 'translateY(-1px)')
                .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.08)')
                .style('border-color', '#cbd5e1');
            }
            bubbleVis.spotlight(d.user);
          })
          .on('mouseleave', function () {
            if (!d3.select(this).classed('active')) {
              d3.select(this)
                .style('transform', 'none')
                .style('box-shadow', '0 1px 3px rgba(0, 0, 0, 0.05)')
                .style('border-color', '#e2e8f0');
            }
            const activeChip = chipsWrapper.select('.legend-chip.active');
            if (!activeChip.empty()) {
              bubbleVis.spotlight(activeChip.datum().user);
            } else {
              bubbleVis.resetSpotlight();
            }
          })
          .on('click', function () {
            const isCurrentlyActive = d3.select(this).classed('active');
            chipsWrapper.selectAll('.legend-chip')
              .classed('active', false)
              .style('background', '#ffffff')
              .style('color', '#1d1d1f')
              .style('border-color', '#e2e8f0')
              .style('box-shadow', '0 1px 3px rgba(0, 0, 0, 0.05)');

            if (!isCurrentlyActive) {
              d3.select(this)
                .classed('active', true)
                .style('background', '#1d1d1f')
                .style('color', '#ffffff')
                .style('border-color', '#1d1d1f')
                .style('box-shadow', '0 2px 8px rgba(0, 0, 0, 0.2)');
              bubbleVis.spotlight(d.user);
            } else {
              bubbleVis.resetSpotlight();
            }
          });
      });
    }

  }).catch(err => console.error('Error loading rq5_mortality_severity.csv:', err));

});
