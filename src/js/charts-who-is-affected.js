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

    // ── Detail panel (plan §6.4): click a road user in Figure 1.1 ──
    let panelKey = null;
    const fmtChange = v => (v == null ? '–' : `${v >= 0 ? '+' : '−'}${pct0(Math.abs(v))}`);
    function openRoadUserPanel(key, years, returnEl, focus = true) {
      panelKey = key;
      const r = ROAD_USER_BY_KEY.get(key);
      const perYear = ru => YEARS.map(yr => d3.sum(userRows, d => (d.year === yr && (!ru || d.road_user === ru) ? d.hospitalisations : 0)));
      const mine = perYear(key), all = perYear(null);
      const rows = roadUserData(years).sort((a, b) => b.value - a.value);
      const total = rows.find(d => d.key === key).value;
      const sum = d3.sum(rows, d => d.value);
      const [y0, y1] = years;
      const at = (arr, yr) => arr[YEARS.indexOf(yr)];
      const change = arr => (at(arr, y0) ? (at(arr, y1) - at(arr, y0)) / at(arr, y0) : null);
      DetailPanel.open({
        kicker: 'Road user · followed on every page',
        title: r.plural,
        series: { years: YEARS, values: mine, color: r.color, band: years },
        stats: [
          { label: `Hospitalised, ${rangeText(years)}`, value: fmt(total) },
          { label: 'Share of all patients', value: pct0(total / sum) },
          { label: 'Rank by cases', value: `${rows.findIndex(d => d.key === key) + 1} of ${rows.length}` },
          y0 === y1
            ? { label: 'Change', value: '–', note: 'Choose two or more years' }
            : { label: `Change ${y0}–${y1}`, value: fmtChange(change(mine)), note: `All road users: ${fmtChange(change(all))}` },
        ],
        note: 'Every chart on the site now follows this road user. Click it again, or press Reset in the filter bar, to show everyone.',
        returnFocus: returnEl || document.activeElement,
        focus,
        onClose: () => { panelKey = null; },
      });
    }
    function clickRoadUserWithPanel(d) {
      const returnEl = document.activeElement;
      clickRoadUser(d);
      if (GlobalFilter.get().roadUser === d.key) openRoadUserPanel(d.key, GlobalFilter.get().years, returnEl);
      else DetailPanel.close();
    }

    // ── Figure 1.1: Which road users are hurt most? ──────────────
    const roadChart = new Vis.LollipopChart('#chart-road-user-type', roadUserData(initial.years), {
      linkChannel: 'roadUser',   // linked hover (js/highlight.js)
      labelKey: 'label',
      valueKey: 'value',
      minValue: 0,
      showShare: true,
      height: 470,
      margin: { top: 25, right: 130, bottom: 50, left: 200 },
      gradient: true,          // one blue: darker = more cases
      xLabel: `Hospitalised, ${rangeText(initial.years)}`,
      onClick: clickRoadUserWithPanel,
    });

    // ── Figure 1.2: Are men and women hurt differently? ──────────
    const g0 = genderData(initial.years);
    const genderChart = new Vis.RankedBarChart('#chart-gender', g0.data, {
      linkChannel: 'roadUser',   // linked hover (js/highlight.js)
      xMin: 0,
      xMax: 1,
      tickFormat: pct0,
      xLabel: 'Share of patients: men (left) and women (right)',
      valueText: d => `${pct0(d.value)} men · ${pct0(1 - d.value)} women`,
      margin: { top: 40, right: 190, bottom: 54, left: 200 },
      // Each bar is split: men from the left, women filling the rest to 100%
      colorOf: () => (Vis.isDark() ? '#5AA9E6' : '#0072B2'),
      rest: { colorOf: () => (Vis.isDark() ? '#D99BC6' : '#CC79A7') },
      rowHeight: 42,
      onClick: clickRoadUser,
      tooltip: d => [d.label, [
        ['Men:', fmt(d.men)],
        ['Women:', fmt(d.women)],
        ['Share who are men:', pct0(d.value), true],
        ['Share who are women:', pct0(1 - d.value)],
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

    // Highlight the reader's own age group (shared with "Where do you fit?")
    const AGE_KEYS = ['0-7', '8-16', '17-25', '26-39', '40-64', '65-74', '75+'];
    const fitAge = v => (AGE_KEYS.includes(v) ? v : null);
    ageChart.config.highlight = fitAge(GlobalFilter.profile().age);
    GlobalFilter.profileChooser(document.getElementById('chart-age-group'), {
      field: 'age', label: 'Highlight your age group',
      options: AGE_KEYS.map(k => ({ key: k, label: ageLabel(k) })),
      onChange: v => { ageChart.config.highlight = fitAge(v); ageChart.renderVis(); },
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
        { value: 0.5, label: 'Half men, half women', anchor: 'end' },
        { value: g.overall, label: `All patients together: ${pct0(g.overall)} men`, anchor: 'start' },
      ];
      genderChart.wrangleData(g.data);

      renderAge(state);

      // Keep an open panel in step with the filter
      if (panelKey && DetailPanel.isOpen()) {
        if (state.roadUser !== panelKey) DetailPanel.close();
        else openRoadUserPanel(panelKey, state.years, null, false);
      }
    });
  }).catch(err => console.error('Error loading the Q1 data (data/q1_who/):', err));
});
