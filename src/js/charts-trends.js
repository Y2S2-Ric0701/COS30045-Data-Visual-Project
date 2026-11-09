/* ═══════════════════════════════════════════════════════════════
   charts-trends.js – Page Controller for Question 2 (Trends)
   COS30045 Data Visualisation Project
   Pattern: Object-Oriented Component Instantiation
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  d3.csv('data/rq2_trends.csv').then(function (rawData) {

    // ── Figure 2.1: Multi-series 10-Year Line Trajectory ──────────
    new Vis.LineChart('#chart-year', rawData, {
      xKey: 'Calendar year',
      series: [
        { key: 'Car driver',    color: '#0072B2', label: 'Car Driver' },
        { key: 'Motorcyclist',  color: '#E69F00', label: 'Motorcyclist' },
        { key: 'Pedal cyclist', color: '#009E73', label: 'Pedal Cyclist', highlight: true },
        { key: 'Car passenger', color: '#56B4E9', label: 'Car Passenger' },
        { key: 'Pedestrian',    color: '#D55E00', label: 'Pedestrian' },
      ],
      breaks: [
        { year: 2012, label: '2012: Vic ED break' },
        { year: 2017, label: '2017: NSW ED break' },
      ],
      yLabel: 'Annual Hospitalisations',
    });

    // ── Figure 2.2: 10-Year Net Change (2011 vs 2021) ─────────────
    const row2011 = rawData.find(d => +d['Calendar year'] === 2011);
    const row2021 = rawData.find(d => +d['Calendar year'] === 2021);

    if (row2011 && row2021) {
      const targetKeys = [
        { key: 'Pedal cyclist', label: 'Pedal Cyclist' },
        { key: 'Car driver',    label: 'Car Driver' },
        { key: 'Motorcyclist',  label: 'Motorcyclist' },
        { key: 'Car passenger', label: 'Car Passenger' },
        { key: 'Pedestrian',    label: 'Pedestrian' },
      ];

      const changeData = targetKeys.map(k => {
        const val11 = +row2011[k.key] || 0;
        const val21 = +row2021[k.key] || 0;
        const diff = val21 - val11;
        return {
          user: k.label,
          shift: val11 > 0 ? Math.round((diff / val11) * 1000) / 10 : 0, // e.g. +51.4%
          val2021: val21,
        };
      });

      new Vis.BarChart('#chart-injury-count', changeData, {
        labelKey: 'user',
        valueKey: 'val2021',
        accentKey: 'Pedal Cyclist',
        accentColor: '#009E73',
        xLabel: '2021 Final Counts (Ranked)',
      });
    }

    // ── Figure 2.3: Demographic Composition over Time ─────────────
    new Vis.StackedBarChart('#chart-demographic-trends', rawData, {
      categoryKey: 'Calendar year',
      seriesKeys: ['Car driver', 'Motorcyclist', 'Pedal cyclist', 'Car passenger', 'Pedestrian'],
      colorMap: {
        'Car driver': '#0072B2',
        'Motorcyclist': '#E69F00',
        'Pedal cyclist': '#009E73',
        'Car passenger': '#56B4E9',
        'Pedestrian': '#D55E00',
      },
      legendItems: [
        { label: 'Car Driver', color: '#0072B2' },
        { label: 'Motorcyclist', color: '#E69F00' },
        { label: 'Pedal Cyclist', color: '#009E73' },
        { label: 'Car Passenger', color: '#56B4E9' },
        { label: 'Pedestrian', color: '#D55E00' },
      ],
    });

  }).catch(err => console.error('Error loading rq2_trends.csv:', err));

});
