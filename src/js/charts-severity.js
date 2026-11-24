/* ═══════════════════════════════════════════════════════════════
   charts-severity.js – Question 5: Who is hurt the worst?
   COS30045 Data Visualisation Project

   5.1 Who is most likely to die?          (deaths per 1,000 cases)
   5.2 Who stays in hospital longest?      (average bed days per case)
   5.3 Is the biggest group the worst hurt? (share of cases vs share of deaths)
   All use 2011–2019: deaths after mid-2020 are not recorded yet.
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const fmt = d3.format(',');
  const pct0 = d3.format('.0%');
  const fmtPct = d3.format('.1%');
  const fmtDec1 = d3.format('.1f');
  const highlightOf = state => (state.roadUser === 'all' ? null : state.roadUser);
  const clickRoadUser = d => GlobalFilter.toggleRoadUser(d.key);
  const NO_DEATHS = 'No death records for 2020–2021: choose earlier years';

  SiteData.severity().then(function (severityRows) {

    /** One row per road user with cases, deaths, rate and stay for the chosen years (to 2019) */
    function byRoadUser(state) {
      const dy = SiteData.deathYears(state.years);
      if (!dy) return [];
      const sums = SiteData.sumBy(SiteData.inYears(severityRows, dy), d => d.road_user, ['cases', 'deaths', 'bed_days']);
      const rows = ROAD_USERS.map(r => Object.assign(
        { key: r.key, label: r.plural },
        SiteData.outcomes(sums.get(r.key) || { cases: 0, deaths: 0, bed_days: 0 })));
      const allCases = d3.sum(rows, d => d.cases);
      const allDeaths = d3.sum(rows, d => d.deaths);
      rows.forEach(d => { d.a = allCases ? d.cases / allCases : 0; d.b = allDeaths ? d.deaths / allDeaths : 0; });
      return rows;
    }

    const initial = GlobalFilter.get();
    const data0 = byRoadUser(initial);
    const tipRows = d => [
      ['Hospital cases:', fmt(d.cases)],
      ['Died in hospital:', fmt(d.deaths)],
      ['Deaths per 1,000 cases:', fmtDec1(d.rate)],
      ['Average stay:', `${fmtDec1(d.stay)} days`],
    ];

    // ── Figure 5.1: Who is most likely to die? ───────────────────
    const deathChart = new Vis.RankedBarChart('#chart-mortality-risk', data0.map(d => ({ ...d, value: d.rate })), {
      linkChannel: 'roadUser',   // linked hover (js/highlight.js)
      valueText: d => `${fmtDec1(d.value)} per 1,000`,
      tickFormat: d3.format('~'),
      margin: { top: 24, right: 130, bottom: 54, left: 200 },
      rowHeight: 42,
      emptyText: NO_DEATHS,
      onClick: clickRoadUser,
      tooltip: d => [d.label, tipRows(d).map((r, i) => (i === 2 ? [...r, true] : r))],
    });

    // ── Figure 5.2: Who stays in hospital longest? ───────────────
    const stayChart = new Vis.RankedBarChart('#chart-length-of-stay', data0.map(d => ({ ...d, value: d.stay })), {
      linkChannel: 'roadUser',   // linked hover (js/highlight.js)
      valueText: d => `${fmtDec1(d.value)} days`,
      tickFormat: d3.format('~'),
      margin: { top: 24, right: 110, bottom: 54, left: 200 },
      rowHeight: 42,
      emptyText: NO_DEATHS,
      onClick: clickRoadUser,
      tooltip: d => [d.label, tipRows(d).map((r, i) => (i === 3 ? [...r, true] : r))],
    });

    // ── Figure 5.3: Is the biggest group also the worst hurt? ────
    const pairChart = new Vis.PairedBarChart('#chart-injury-severity', data0, {
      linkChannel: 'roadUser',   // linked hover (js/highlight.js)
      onClick: clickRoadUser,
      tooltip: d => [d.label, [
        ['Share of all hospital cases:', fmtPct(d.a)],
        ['Share of all deaths in hospital:', fmtPct(d.b), true],
        ['Deaths ÷ cases:', `${fmtDec1(d.b / d.a)}× ${d.b / d.a >= 1.25 ? '(dies more often than its size suggests)' : d.b / d.a <= 0.8 ? '(dies less often than its size suggests)' : '(about as expected)'}`],
        ['Cases / deaths:', `${fmt(d.cases)} / ${fmt(d.deaths)}`],
      ]],
    });

    GlobalFilter.subscribe(state => {
      const rows = byRoadUser(state);
      const dy = SiteData.deathYears(state.years);
      const hl = highlightOf(state);

      deathChart.config.highlight = hl;
      deathChart.config.xLabel = dy ? `Deaths in hospital per 1,000 cases, ${rangeText(dy)}` : '';
      deathChart.wrangleData(rows.map(d => ({ ...d, value: d.rate })));

      stayChart.config.highlight = hl;
      stayChart.config.xLabel = dy ? `Average days in hospital per case, ${rangeText(dy)}` : '';
      stayChart.wrangleData(rows.map(d => ({ ...d, value: d.stay })));

      pairChart.config.highlight = hl;
      pairChart.wrangleData(rows);
    });
  }).catch(err => console.error('Error loading data/q5_severity/:', err));
});
