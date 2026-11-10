/* ═══════════════════════════════════════════════════════════════
   charts-who-is-affected.js – Page Controller for Question 1
   COS30045 Data Visualisation Project
   Pattern: Object-Oriented Component Instantiation
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // ── Figure 1.1: Hospitalisations by Age Group ─────────────────
  d3.csv('data/rq1_age_group.csv').then(function (rawData) {
    new Vis.BarChart('#chart-age-group', rawData, {
      labelKey: 'Age group',
      valueKey: 'Sum(Hospitalisations)',
      accentKey: '40-64',
      accentColor: '#0072B2',
      baselineColor: '#888888',
      xLabel: 'Total Hospitalised Cases (2011–2021)',
    });
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
