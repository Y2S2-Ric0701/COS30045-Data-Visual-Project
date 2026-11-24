/* ═══════════════════════════════════════════════════════════════
   charts-characteristics.js – Question 4: What did they crash into?
   COS30045 Data Visualisation Project

   4.1 What do people crash into most?  (share of cases, chosen road user)
   4.2 Is it different for each road user? (heatmap, rows add to 100%)
   4.3 Which crashes are deadliest?     (deaths per 1,000, to 2019)
   "What they crashed into" is the AIHW counterparty, grouped into six
   plain-language types (shared-constants.js → COUNTERPARTIES).
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const tooltip = Vis.BaseChart.getTooltip();
  const fmt = d3.format(',');
  const pct0 = d3.format('.0%');
  const fmtPct = d3.format('.1%');
  const fmtDec1 = d3.format('.1f');
  const cpDesc = key => COUNTERPARTY_BY_KEY.get(key).desc;

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 4.2: Heatmap – what each road user collided with
  // Rows = injured road user, columns = what they hit.
  // Each row adds to 100%; darker blue = bigger share of that row.
  // ═══════════════════════════════════════════════════════════════
  const COL_LINES = {
    'Car, ute or van':  ['Car, ute', 'or van'],
    'No other vehicle': ['No other', 'vehicle'],
    'Fixed object':     ['Fixed object', '(tree, pole)'],
    'Not recorded':     ['Not', 'recorded'],
    'Something else':   ['Something', 'else'],
    'Truck or bus':     ['Truck', 'or bus'],
  };

  function drawHeatmap(containerId, crashes, state) {
    const container = d3.select(containerId);
    container.selectAll('*').remove();

    const sel = SiteData.inYears(crashes, state.years);
    const sums = SiteData.sumBy(sel, d => `${d.road_user}|${d.counterparty}`, ['hospitalisations']);
    const rowTotals = SiteData.sumBy(sel, d => d.road_user, ['hospitalisations']);
    const rows = ROAD_USERS
      .map(r => ({ key: r.key, user: r.plural, total: (rowTotals.get(r.key) || {}).hospitalisations || 0 }))
      .sort((a, b) => b.total - a.total);
    const COLS = COUNTERPARTIES.map(c => c.key);
    const matrix = [];
    rows.forEach(r => COLS.forEach(cp => {
      const cases = (sums.get(`${r.key}|${cp}`) || {}).hospitalisations || 0;
      matrix.push({ key: r.key, user: r.user, cp, cases, pct: r.total ? cases / r.total : 0 });
    }));
    const rowMax = d3.rollup(matrix, v => d3.max(v, d => d.pct), d => d.key);
    const hl = state.roadUser === 'all' ? null : state.roadUser;

    const width = 850;
    const margin = { top: 64, right: 110, bottom: 70, left: 200 };
    const height = margin.top + margin.bottom + rows.length * 42;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('class', 'vis-chart')
      .attr('role', 'img')
      .attr('aria-label', `Heatmap: what each road user collided with, ${rangeText(state.years)}. ` +
        rows.map(r => {
          const top = matrix.filter(m => m.key === r.key).sort((a, b) => b.pct - a.pct)[0];
          return `${r.user}: ${pct0(top.pct)} ${top.cp.toLowerCase()}`;
        }).join('; '));

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand().domain(COLS).range([0, innerWidth]).paddingInner(0.06);
    const y = d3.scaleBand().domain(rows.map(r => r.key)).range([0, innerHeight]).paddingInner(0.08);

    // Same blue family as the rest of the site; 0% gets a neutral tint
    const color = d3.scaleSequential().domain([0, 0.9]).interpolator(t => d3.interpolateBlues(0.06 + t * 0.94));
    const textFill = d => (d.pct >= 0.4 ? '#ffffff' : '#1d1d1f');
    const faded = key => hl && key !== hl;

    // Column headers
    COLS.forEach(cp => {
      const t = g.append('text').attr('text-anchor', 'middle')
        .attr('x', x(cp) + x.bandwidth() / 2).attr('y', -36)
        .style('font-size', '13px').style('font-weight', '600').style('fill', '#1d1d1f');
      COL_LINES[cp].forEach((line, i) => t.append('tspan')
        .attr('x', x(cp) + x.bandwidth() / 2).attr('dy', i ? 16 : 0).text(line));
    });

    // Row labels (left) and row totals (right)
    g.append('g').selectAll('text').data(rows).join('text')
      .attr('x', -12).attr('y', r => y(r.key) + y.bandwidth() / 2).attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .style('font-size', '13.5px').style('font-weight', r => (r.key === hl ? 700 : 600))
      .style('fill', '#1d1d1f').style('opacity', r => (faded(r.key) ? 0.45 : 1))
      .text(r => r.user);
    g.append('text').attr('x', innerWidth + 14).attr('y', -20)
      .style('font-size', '12px').style('font-weight', '600').style('fill', '#55555a').text('Cases');
    g.append('g').selectAll('text').data(rows).join('text')
      .attr('x', innerWidth + 14).attr('y', r => y(r.key) + y.bandwidth() / 2).attr('dy', '0.35em')
      .style('font-size', '12.5px').style('fill', '#55555a')
      .text(r => fmt(r.total));

    // Cells
    const cellG = g.selectAll('.heat-cell-g').data(matrix).join('g')
      .attr('class', 'heat-cell-g')
      .attr('transform', d => `translate(${x(d.cp)},${y(d.key)})`)
      .attr('opacity', d => (faded(d.key) ? 0.25 : 1))
      .style('cursor', 'pointer');

    cellG.append('rect')
      .attr('class', 'heat-cell')
      .attr('width', x.bandwidth()).attr('height', y.bandwidth()).attr('rx', 6)
      .attr('fill', d => (d.pct > 0 ? color(d.pct) : '#f5f5f7'))
      // Outline each row's largest share so the main pattern pops out
      .attr('stroke', d => (d.pct > 0 && d.pct === rowMax.get(d.key) ? '#1d1d1f' : 'none'))
      .attr('stroke-width', 1.5);

    cellG.append('text')
      .attr('x', x.bandwidth() / 2).attr('y', y.bandwidth() / 2).attr('dy', '0.35em')
      .attr('text-anchor', 'middle').style('pointer-events', 'none')
      .style('font-size', d => (d.pct >= 0.1 ? '14px' : '12.5px'))
      .style('font-weight', d => (d.pct >= 0.1 ? '700' : '500'))
      .style('fill', d => (d.pct > 0 ? textFill(d) : '#94a3b8'))
      .text(d => (d.pct >= 0.005 ? pct0(d.pct) : d.pct > 0 ? '<1%' : '–'));

    // Crosshair hover; click a row to follow that road user
    cellG
      .on('mouseenter', function (event, d) {
        cellG.attr('opacity', o => (o.key === d.key || o.cp === d.cp ? 1 : 0.3));
        tooltip.classed('visible', true).html(Vis.tipHtml(`${d.user} · ${d.cp}`, [
          [`Share of ${d.user.toLowerCase()} injuries:`, fmtPct(d.pct), true],
          [`Cases (${rangeText(state.years)}):`, fmt(d.cases)],
          [cpDesc(d.cp), ''],
        ]));
        Vis.placeTip(tooltip, event);
      })
      .on('mousemove', event => Vis.placeTip(tooltip, event))
      .on('mouseleave', function () {
        cellG.attr('opacity', d => (faded(d.key) ? 0.25 : 1));
        tooltip.classed('visible', false);
      })
      .on('click', (event, d) => GlobalFilter.toggleRoadUser(d.key));

    // Legend: gradient bar + "outlined = largest share in the row"
    const legend = g.append('g').attr('transform', `translate(0,${innerHeight + 30})`);
    const lw = 220;
    const gradId = 'counterparty-heat-gradient';
    const grad = svg.append('defs').append('linearGradient').attr('id', gradId);
    d3.range(0, 1.01, 0.1).forEach(t => grad.append('stop')
      .attr('offset', `${t * 100}%`).attr('stop-color', color(t * 0.9)));
    legend.append('text').attr('y', 4).style('font-size', '12px').style('fill', '#55555a').text('Share of row');
    legend.append('rect').attr('x', 82).attr('y', -6).attr('width', lw).attr('height', 12).attr('rx', 3)
      .attr('fill', `url(#${gradId})`);
    legend.append('text').attr('x', 82).attr('y', 24).style('font-size', '11px').style('fill', '#55555a').text('0%');
    legend.append('text').attr('x', 82 + lw).attr('y', 24).attr('text-anchor', 'end')
      .style('font-size', '11px').style('fill', '#55555a').text('90%');
    legend.append('rect').attr('x', 340).attr('y', -7).attr('width', 14).attr('height', 14).attr('rx', 3)
      .attr('fill', '#ffffff').attr('stroke', '#1d1d1f').attr('stroke-width', 1.5);
    legend.append('text').attr('x', 362).attr('y', 4).style('font-size', '12px').style('fill', '#55555a')
      .text('Outlined = what that road user hit most often');
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALISE
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function () {
    SiteData.crashes().then(function (crashes) {
      const initial = GlobalFilter.get();

      // ── Figure 4.1: what do people crash into most? ─────────────
      function hitData(state) {
        const sel = SiteData.ofRoadUser(SiteData.inYears(crashes, state.years), state.roadUser);
        const sums = SiteData.sumBy(sel, d => d.counterparty, ['hospitalisations']);
        const total = d3.sum([...sums.values()], o => o.hospitalisations);
        return COUNTERPARTIES.map(c => {
          const cases = (sums.get(c.key) || {}).hospitalisations || 0;
          return { key: c.key, label: c.key, cases, value: total ? cases / total : null };
        });
      }
      const hitChart = new Vis.RankedBarChart('#chart-collision-type', hitData(initial), {
        tickFormat: pct0,
        valueText: d => `${pct0(d.value)} · ${fmt(d.cases)} cases`,
        margin: { top: 24, right: 190, bottom: 54, left: 160 },
        rowHeight: 46,
        tooltip: d => [d.label, [['Share of cases:', fmtPct(d.value), true], ['Cases:', fmt(d.cases)], [cpDesc(d.key), '']]],
      });

      // ── Figure 4.3: which crashes are deadliest? ────────────────
      function deadlyData(state) {
        const dy = SiteData.deathYears(state.years);
        if (!dy) return [];
        const sel = SiteData.ofRoadUser(SiteData.inYears(crashes, dy), state.roadUser);
        const sums = SiteData.sumBy(sel, d => d.counterparty, ['cases', 'deaths', 'bed_days']);
        const allCases = d3.sum([...sums.values()], o => o.cases);
        return COUNTERPARTIES.map(c => {
          const o = SiteData.outcomes(sums.get(c.key) || { cases: 0, deaths: 0, bed_days: 0 });
          return { key: c.key, label: c.key, value: o.rate, share: allCases ? o.cases / allCases : 0, ...o };
        });
      }
      const deadlyChart = new Vis.RankedBarChart('#chart-deadliest', deadlyData(initial), {
        tickFormat: d3.format('~'),
        valueText: d => `${fmtDec1(d.value)} per 1,000 · ${pct0(d.share)} of cases`,
        margin: { top: 24, right: 230, bottom: 54, left: 160 },
        rowHeight: 46,
        nullText: 'no cases',
        emptyText: 'No death records for 2020–2021: choose earlier years',
        tooltip: d => [d.label, [
          ['Deaths per 1,000 cases:', fmtDec1(d.value), true],
          ['Died in hospital:', fmt(d.deaths)],
          ['Hospital cases:', `${fmt(d.cases)} (${pct0(d.share)} of all)`],
          ['Average stay:', `${fmtDec1(d.stay)} days`],
        ]],
      });

      GlobalFilter.subscribe(state => {
        hitChart.config.xLabel = `Share of hospitalised cases, ${rangeText(state.years)}`;
        hitChart.wrangleData(hitData(state));
        drawHeatmap('#chart-counterparty', crashes, state);
        const dy = SiteData.deathYears(state.years);
        deadlyChart.config.xLabel = dy ? `Deaths in hospital per 1,000 cases, ${rangeText(dy)}` : '';
        deadlyChart.wrangleData(deadlyData(state));
      });
    }).catch(err => console.error('Error loading data/q4_crashes/:', err));
  });
})();
