/* ═══════════════════════════════════════════════════════════════
   charts-who-is-affected.js – Question 1: Who ends up in hospital?
   COS30045 Data Visualisation Project

   1.1 Which road users are hurt most?   (lollipop, click = filter)
   1.2 Are men and women hurt differently? (% men per road user)
   1.3 Which age is most at risk?         (per year of age / total)
   All three follow the filter bar (road user + years).
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const fmt = d3.format(',');
  const pct0 = d3.format('.0%');

  // AIHW age groups cover different numbers of years
  const AGE_ORDER = ['0-7', '8-16', '17-25', '26-39', '40-64', '65-74', '75+'];
  const AGE_WIDTH = { '0-7': 8, '8-16': 9, '17-25': 9, '26-39': 14, '40-64': 25, '65-74': 10, '75+': null };
  const ageLabel = a => a.replace('-', '–');
  let ageMode = 'perYear';

  const highlightOf = state => (state.roadUser === 'all' ? null : state.roadUser);
  const clickRoadUser = d => GlobalFilter.toggleRoadUser(d.key);

  Promise.all([SiteData.roadUsers(), SiteData.sexes(), SiteData.ages()]).then(function ([userRows, sexRows, ageRows]) {

    // ── Data for each figure ─────────────────────────────────────
    function roadUserData(years) {
      const sums = SiteData.sumBy(SiteData.inYears(userRows, years), d => d.road_user, ['hospitalisations']);
      return ROAD_USERS.map(r => ({
        key: r.key, label: r.plural, value: (sums.get(r.key) || {}).hospitalisations || 0,
      }));
    }

    function genderData(years) {
      const sel = SiteData.inYears(sexRows, years).filter(d => d.sex === 'Male' || d.sex === 'Female');
      const sums = SiteData.sumBy(sel, d => `${d.road_user}|${d.sex}`, ['hospitalisations']);
      const get = (ru, sex) => (sums.get(`${ru}|${sex}`) || {}).hospitalisations || 0;
      const data = ROAD_USERS.map(r => {
        const men = get(r.key, 'Male'), women = get(r.key, 'Female');
        return { key: r.key, label: r.plural, men, women, value: men + women ? men / (men + women) : null };
      });
      const allMen = d3.sum(data, d => d.men), all = allMen + d3.sum(data, d => d.women);
      return { data, overall: all ? allMen / all : 0 };
    }

    function ageData(years, roadUser) {
      const sel = SiteData.ofRoadUser(SiteData.inYears(ageRows, years), roadUser);
      const sums = SiteData.sumBy(sel, d => d.age_group, ['hospitalisations']);
      return AGE_ORDER.map(a => {
        const total = (sums.get(a) || {}).hospitalisations || 0;
        const width = AGE_WIDTH[a];
        return {
          key: a, label: ageLabel(a), total, width,
          value: ageMode === 'perYear' ? (width ? total / width : null) : total,
        };
      });
    }

    const initial = GlobalFilter.get();

    // ── Figure 1.1: Which road users are hurt most? ──────────────
    const roadChart = new Vis.LollipopChart('#chart-road-user-type', roadUserData(initial.years), {
      labelKey: 'label',
      valueKey: 'value',
      minValue: 0,
      showShare: true,
      height: 470,
      margin: { top: 25, right: 130, bottom: 50, left: 200 },
      gradient: true,          // one blue: darker = more cases
      xLabel: `Hospitalised, ${rangeText(initial.years)}`,
      onClick: clickRoadUser,
    });

    // ── Figure 1.2: Are men and women hurt differently? ──────────
    const g0 = genderData(initial.years);
    const genderChart = new Vis.RankedBarChart('#chart-gender', g0.data, {
      xMin: 0,
      xMax: 1,
      tickFormat: pct0,
      xLabel: 'Share of patients who are men',
      valueText: d => `${pct0(d.value)} men`,
      margin: { top: 40, right: 110, bottom: 54, left: 200 },
      rowHeight: 42,
      onClick: clickRoadUser,
      tooltip: d => [d.label, [
        ['Men:', fmt(d.men)],
        ['Women:', fmt(d.women)],
        ['Share who are men:', pct0(d.value), true],
      ]],
      ariaLabel: data => 'Share of patients who are men: ' +
        data.map(d => `${d.label} ${pct0(d.value)}`).join(', '),
    });

    // ── Figure 1.3: Which age is most at risk? ───────────────────
    const ageChart = new Vis.RankedBarChart('#chart-age-group', ageData(initial.years, initial.roadUser), {
      sort: 'none',
      margin: { top: 24, right: 230, bottom: 54, left: 90 },
      rowHeight: 46,
      nullText: 'n/a: no upper age, so it cannot be divided',
      tooltip: d => [`Age ${d.label}`, [
        ['Hospitalised:', fmt(d.total)],
        ['Ages in the group:', d.width ? `${d.width}` : 'open-ended'],
        ['Per year of age:', d.width ? fmt(Math.round(d.total / d.width)) : 'n/a', true],
      ]],
    });

    function renderAge(state) {
      const perYear = ageMode === 'perYear';
      ageChart.config.valueText = d => (perYear ? `${fmt(Math.round(d.value))} per year of age` : fmt(d.value));
      ageChart.config.xLabel = perYear
        ? `Hospitalised per year of age, ${rangeText(state.years)}`
        : `Total hospitalised, ${rangeText(state.years)}`;
      ageChart.config.emptyText = 'No cases for this selection';
      ageChart.wrangleData(ageData(state.years, state.roadUser));
    }

    const modeButtons = document.querySelectorAll('#age-mode-control .filter-btn');
    modeButtons.forEach(btn => btn.addEventListener('click', () => {
      modeButtons.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      ageMode = btn.dataset.mode;
      renderAge(GlobalFilter.get());
    }));

    // ── Every figure follows the filter bar ──────────────────────
    GlobalFilter.subscribe(state => {
      roadChart.config.highlight = highlightOf(state);
      roadChart.config.xLabel = `Hospitalised, ${rangeText(state.years)}`;
      roadChart.wrangleData(roadUserData(state.years));

      const g = genderData(state.years);
      genderChart.config.highlight = highlightOf(state);
      genderChart.config.refLines = [
        { value: 0.5, label: 'Even split', anchor: 'end' },
        { value: g.overall, label: `All road users: ${pct0(g.overall)}`, anchor: 'start' },
      ];
      genderChart.wrangleData(g.data);

      renderAge(state);
    });
  }).catch(err => console.error('Error loading the Q1 data (data/q1_who/):', err));
});
