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
      // A rate, not a count: deaths per 1,000 patients, also shown as a percentage
      valueText: d => `${fmtDec1(d.value)} per 1,000 (${d3.format('.1%')(d.value / 1000)})`,
      tickFormat: d3.format('~'),
      margin: { top: 24, right: 200, bottom: 54, left: 200 },
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
      deathChart.config.xLabel = dy ? `Deaths in hospital for every 1,000 patients admitted, ${rangeText(dy)}` : '';
      deathChart.wrangleData(rows.map(d => ({ ...d, value: d.rate })));

      stayChart.config.highlight = hl;
      stayChart.config.xLabel = dy ? `Average days in hospital per case, ${rangeText(dy)}` : '';
      stayChart.wrangleData(rows.map(d => ({ ...d, value: d.stay })));

      pairChart.config.highlight = hl;
      pairChart.wrangleData(rows);

      drawStayCalendars(rows, hl, dy);
    });

    // ── Figure 5.2, as days: the stay drawn on a two-week calendar ──
    // One square = one day in hospital; the last day is filled in part
    // (8.8 days = 8 full squares and most of the 9th). Shows the longest
    // stay, the chosen road user (or car drivers, the biggest group) and
    // the shortest, so "three times as long" can be counted.
    function drawStayCalendars(rows, hl, dy) {
      const calBox = document.getElementById('stay-calendars');
      if (!calBox) return;
      const valid = rows.filter(d => d.stay != null && d.cases > 0);
      if (!dy || !valid.length) { calBox.innerHTML = ''; calBox.hidden = true; return; }
      calBox.hidden = false;
      const sorted = [...valid].sort((a, b) => b.stay - a.stay);
      const longest = sorted[0], shortest = sorted[sorted.length - 1];
      const middle = valid.find(d => d.key === hl) || valid.find(d => d.key === 'Car driver');
      const picks = [longest, middle, shortest].filter((d, i, a) => d && a.indexOf(d) === i);
      const tag = d => (d === longest ? 'Longest stay' : d === shortest ? 'Shortest stay'
        : d.key === hl ? 'Your road user' : 'Biggest group');
      const DAYS = Math.max(14, Math.ceil(longest.stay / 7) * 7);   // whole weeks
      calBox.innerHTML = `
        <p class="stay-cal-title">The same stays, one square per day in hospital <span>(${rangeText(dy)})</span></p>
        <div class="stay-cal-row">${picks.map(d => {
          const ru = ROAD_USER_BY_KEY.get(d.key);
          const cells = d3.range(DAYS).map(i => {
            const f = Math.max(0, Math.min(1, d.stay - i));
            return `<span class="stay-day${f > 0 ? ' is-on' : ''}" style="--f:${f.toFixed(2)};--i:${i}"></span>`;
          }).join('');
          return `
          <figure class="stay-cal${d.key === hl ? ' is-chosen' : ''}" style="--ru:${ru ? ru.color : '#0072B2'}"
                  role="img" aria-label="${d.label}: ${fmtDec1(d.stay)} days in hospital on average">
            <figcaption><span class="stay-cal-tag">${tag(d)}</span>
              <strong>${d.label}</strong><span class="stay-cal-days">${fmtDec1(d.stay)} days</span></figcaption>
            <div class="stay-cal-head" aria-hidden="true"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
            <div class="stay-cal-grid" aria-hidden="true">${cells}</div>
          </figure>`;
        }).join('')}</div>`;
      // Days fill in one after another the first time the calendars are seen
      if (!drawStayCalendars.shown && !Motion.REDUCED) {
        calBox.classList.add('is-waiting');
        Motion.whenVisible(calBox, () => { drawStayCalendars.shown = true; calBox.classList.remove('is-waiting'); }, 0.4);
      }
    }
  }).catch(err => console.error('Error loading data/q5_severity/:', err));
});
