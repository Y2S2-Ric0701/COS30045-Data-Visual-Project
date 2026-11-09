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
      'Pedestrian': '#D55E00',
      'Bus occupant': '#E69F00',
      'Car passenger': '#56B4E9',
      'Car driver': '#0072B2',
      'Motorcyclist': '#CC79A7',
      'Pedal cyclist': '#009E73',
      'Heavy transport driver': '#64748b',
      'Pick-up truck or van occupant': '#94a3b8',
    };

    // ── Figure 5.1: In-Hospital Mortality Rate per 1,000 Cases ───
    new Vis.BarChart('#chart-mortality-risk', formatted, {
      labelKey: 'user',
      valueKey: 'rate',
      accentKey: 'Pedestrian',
      accentColor: '#D55E00',
      baselineColor: '#888888',
      xLabel: 'Deaths per 1,000 Hospitalised Cases (2011–2019 Baseline)',
    });

    // ── Figure 5.2: Average Hospital Bed Days per Case ────────────
    new Vis.BarChart('#chart-length-of-stay', formatted, {
      labelKey: 'user',
      valueKey: 'avgBedDays',
      accentKey: 'Pedestrian',
      accentColor: '#E69F00',
      baselineColor: '#60a5fa',
      xLabel: 'Average Inpatient Bed Days per Case',
    });

    // ── Figure 5.3: Volume vs. Severity Bubble Chart (Climax) ────
    new Vis.BubbleChart('#chart-injury-severity', formatted, {
      xKey: 'cases',
      yKey: 'rate',
      rKey: 'avgBedDays',
      labelKey: 'user',
      colorMap: userColors,
    });

  }).catch(err => console.error('Error loading rq5_mortality_severity.csv:', err));

});
