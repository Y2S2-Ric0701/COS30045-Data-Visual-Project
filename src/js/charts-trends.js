/* ═══════════════════════════════════════════════════════════════
   charts-trends.js – Question 2: Is it getting better or worse?
   COS30045 Data Visualisation Project

   2.1 Did the total go up?                    (stacked area + total line)
   2.2 Which groups are rising, which falling? (one labelled line per road user)
   2.3 Who changed the most?                   (% change, first → last chosen year)
   Time charts always draw 2011–2021 and grey out the years outside the
   filter; Figure 2.3 measures the change between the chosen years.
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const fmt = d3.format(',');
  const highlightOf = state => (state.roadUser === 'all' ? null : state.roadUser);
  const keys = ROAD_USERS.map(r => r.key);

  // Plain-language notes for the two changes in how patients were counted
  const BREAKS = [
    { year: 2012, lines: ['2012: Victoria stopped counting', 'patients treated only in emergency'], short: ['2012: VIC', 'count change'] },
    { year: 2017, lines: ['2017: NSW made the', 'same change'], short: ['2017: NSW', 'same change'] },
  ];

  // Phone layout: the key under the line chart needs short names
  const SHORT_NAMES = {
    'Car passenger': 'Passengers', 'Truck occupant': 'In trucks', 'Ute or van occupant': 'In utes/vans',
    'Bus occupant': 'In buses', 'Other or not recorded': 'Other',
  };

  SiteData.trends().then(function (rows) {
    // year × road user table
    const sums = SiteData.sumBy(rows, d => `${d.year}|${d.road_user}`, ['hospitalisations']);
    const table = YEARS.map(year => {
      const row = { year };
      keys.forEach(k => { row[k] = (sums.get(`${year}|${k}`) || {}).hospitalisations || 0; });
      return row;
    });
    // Biggest group at the bottom of the stack
    const stackKeys = [...keys].sort((a, b) => d3.sum(table, d => d[b]) - d3.sum(table, d => d[a]));

    const initial = GlobalFilter.get();

    // ── Figure 2.1: Did the total go up? ─────────────────────────
    const totalChart = new Vis.StackedAreaChart('#chart-total', table, {
      linkChannel: 'roadUser',   // linked hover (js/highlight.js)
      keys: stackKeys,
      colorOf: roadUserColor,
      labelOf: roadUserPlural,
      highlight: highlightOf(initial),
      band: initial.years,
      onClick: k => GlobalFilter.toggleRoadUser(k),
      onBrush: years => GlobalFilter.set({ years }),
      notes: [{ year: 2020, lines: ['2020: COVID-19', 'fewer trips, fewer crashes'], short: ['2020:', 'COVID-19'],
        side: 'above', len: 62, anchor: 'end', dx: -26 }],
    });
    GlobalFilter.roadUserChips('#chips-total', stackKeys);

    // ── Figure 2.2: Which groups are rising, which are falling? ──
    const linesChart = new Vis.TrendLinesChart('#chart-by-group', table, {
      linkChannel: 'roadUser',   // linked hover (js/highlight.js)
      series: ROAD_USERS.map(r => ({ key: r.key, label: r.plural, short: SHORT_NAMES[r.key], color: r.color })),
      breaks: BREAKS,
      noteRiser: true,
      highlight: highlightOf(initial),
      band: initial.years,
      onClick: k => GlobalFilter.toggleRoadUser(k),
    });
    GlobalFilter.roadUserChips('#chips-by-group');

    // ── Figure 2.3: Who changed the most? ────────────────────────
    function changeData([y0, y1]) {
      const r0 = table.find(d => d.year === y0);
      const r1 = table.find(d => d.year === y1);
      return ROAD_USERS.map(r => ({
        key: r.key, label: r.plural, from: r0[r.key], to: r1[r.key], y0, y1,
        value: y0 === y1 || !r0[r.key] ? null : (r1[r.key] - r0[r.key]) / r0[r.key],
      }));
    }
    const fmtChange = v => `${v >= 0 ? '+' : '−'}${d3.format('.0%')(Math.abs(v))}`;
    const changeChart = new Vis.RankedBarChart('#chart-change', changeData(initial.years), {
      linkChannel: 'roadUser',   // linked hover (js/highlight.js)
      tickFormat: v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${d3.format('.0%')(Math.abs(v))}`,
      valueText: d => fmtChange(d.value),
      colorOf: d => (d.value >= 0 ? COLORS.diverging.increase : COLORS.diverging.decrease),
      labelColor: d => (d.value >= 0 ? 'var(--badge-orange-text)' : 'var(--badge-green-text)'),
      margin: { top: 24, right: 90, bottom: 54, left: 200 },
      rowHeight: 40,
      nullText: 'pick two or more years',
      emptyText: 'Pick two or more years in the filter bar to see a change',
      onClick: d => GlobalFilter.toggleRoadUser(d.key),
      tooltip: d => [d.label, [
        [`${d.y0}:`, fmt(d.from)],
        [`${d.y1}:`, fmt(d.to)],
        ['Change:', `${d.to - d.from >= 0 ? '+' : '−'}${fmt(Math.abs(d.to - d.from))} (${fmtChange(d.value)})`, true],
      ]],
    });

    GlobalFilter.subscribe(state => {
      const hl = highlightOf(state);
      totalChart.update({ highlight: hl, band: state.years });
      linesChart.update({ highlight: hl, band: state.years });
      changeChart.config.highlight = hl;
      changeChart.config.xLabel = state.years[0] === state.years[1]
        ? 'Change (pick two or more years in the filter bar)'
        : `Change in hospitalised injuries, ${state.years[0]} to ${state.years[1]}`;
      changeChart.wrangleData(changeData(state.years));
    });
  }).catch(err => console.error('Error loading data/q2_trends/:', err));
});
