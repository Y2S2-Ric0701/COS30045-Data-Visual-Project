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
      margin: { top: 25, right: 90, bottom: 45, left: 210 },
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
      margin: { top: 25, right: 90, bottom: 45, left: 210 },
      height: 420,
    });

    // ── Figure 5.3: Volume vs. Severity Bubble Chart (Climax) ────
    new Vis.BubbleChart('#chart-injury-severity', formatted, {
      xKey: 'cases',
      yKey: 'rate',
      rKey: 'avgBedDays',
      labelKey: 'user',
      colorMap: userColors,
      height: 480,
      margin: { top: 35, right: 90, bottom: 55, left: 80 },
    });

  }).catch(err => console.error('Error loading rq5_mortality_severity.csv:', err));

});
