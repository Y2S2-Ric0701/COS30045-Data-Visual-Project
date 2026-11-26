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

  // Phone layout: shorter names and a single-line column header
  const COL_SHORT = {
    'Car, ute or van': 'Car/ute/van', 'No other vehicle': 'No vehicle', 'Fixed object': 'Fixed object',
    'Not recorded': 'Not recorded', 'Something else': 'Other', 'Truck or bus': 'Truck/bus',
  };
  const USER_SHORT = {
    'Car driver': 'Drivers', 'Car passenger': 'Passengers', 'Motorcyclist': 'Motorcyclists',
    'Pedal cyclist': 'Cyclists', 'Pedestrian': 'Pedestrians', 'Truck occupant': 'In trucks',
    'Ute or van occupant': 'In utes/vans', 'Bus occupant': 'In buses', 'Other or not recorded': 'Other',
  };

  function drawHeatmap(containerId, crashes, state) {
    const container = d3.select(containerId);
    container.selectAll('*').remove();
    const cw = Vis.BaseChart.contentWidth(container.node());
    const compact = cw > 0 && cw < Vis.BaseChart.COMPACT_PX;

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

    const width = cw > 0 ? Math.min(850, Math.max(300, cw)) : 850;
    // Two-line headers need ~84px columns; narrower than that they are slanted
    const slant = compact || (width - 310) / COUNTERPARTIES.length < 84;
    const margin = compact
      ? { top: 92, right: 20, bottom: 74, left: 92 }   // right: room for the last slanted header
      : { top: slant ? 100 : 64, right: 110, bottom: 70, left: width < 760 ? 170 : 200 };
    const height = margin.top + margin.bottom + rows.length * (compact ? 38 : 42) + (width < 820 && !compact ? 26 : 0);
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
    // Dark mode: dim → bright blue (bigger share = brighter), so pale cells don't glare
    const dark = Vis.isDark();
    const color = d3.scaleSequential().domain([0, 0.9]).interpolator(dark
      ? d3.interpolateHcl('#22364D', '#B5DAFF')
      : t => d3.interpolateBlues(0.06 + t * 0.94));
    const textFill = d => (dark ? (d.pct >= 0.4 ? '#14171A' : '#E7EAEE') : (d.pct >= 0.4 ? '#ffffff' : '#1d1d1f'));
    const faded = key => hl && key !== hl;

    // Column headers
    COLS.forEach(cp => {
      if (slant) {
        // Slanted one-line header so six columns fit on a narrow screen
        const cx = x(cp) + x.bandwidth() / 2;
        g.append('text').attr('text-anchor', 'start')
          .attr('transform', `translate(${cx - 4},-10) rotate(-50)`)
          .style('font-size', '12px').style('font-weight', '600').style('fill', 'var(--c-ink)')
          .text(compact ? COL_SHORT[cp] || cp : cp);
        return;
      }
      const t = g.append('text').attr('text-anchor', 'middle')
        .attr('x', x(cp) + x.bandwidth() / 2).attr('y', -36)
        .style('font-size', '13px').style('font-weight', '600').style('fill', 'var(--c-ink)');
      COL_LINES[cp].forEach((line, i) => t.append('tspan')
        .attr('x', x(cp) + x.bandwidth() / 2).attr('dy', i ? 16 : 0).text(line));
    });

    // Row labels (left) and row totals (right)
    g.append('g').selectAll('text').data(rows).join('text')
      .attr('x', compact ? -8 : -12).attr('y', r => y(r.key) + y.bandwidth() / 2).attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .style('font-size', compact ? '12.5px' : '13.5px').style('font-weight', r => (r.key === hl ? 700 : 600))
      .style('fill', 'var(--c-ink)').style('opacity', r => (faded(r.key) ? 0.45 : 1))
      .text(r => (compact ? USER_SHORT[r.key] || r.user : r.user));
    if (!compact) {
    g.append('text').attr('x', innerWidth + 14).attr('y', -20)
      .style('font-size', '12px').style('font-weight', '600').style('fill', 'var(--c-ink-2)').text('Cases');
    g.append('g').selectAll('text').data(rows).join('text')
      .attr('x', innerWidth + 14).attr('y', r => y(r.key) + y.bandwidth() / 2).attr('dy', '0.35em')
      .style('font-size', '12.5px').style('fill', 'var(--c-ink-2)')
      .text(r => fmt(r.total));
    }

    // Cells
    const cellG = g.selectAll('.heat-cell-g').data(matrix).join('g')
      .attr('class', 'heat-cell-g')
      .attr('transform', d => `translate(${x(d.cp)},${y(d.key)})`)
      .attr('opacity', d => (faded(d.key) ? 0.25 : 1))
      .style('cursor', 'pointer');

    cellG.append('rect')
      .attr('class', 'heat-cell')
      .attr('width', x.bandwidth()).attr('height', y.bandwidth()).attr('rx', 6)
      .style('fill', d => (d.pct > 0 ? color(d.pct) : 'var(--c-empty)'))
      // Outline each row's largest share so the main pattern pops out
      .style('stroke', d => (d.pct > 0 && d.pct === rowMax.get(d.key) ? 'var(--c-ink)' : 'none'))
      .attr('stroke-width', 1.5);

    cellG.append('text')
      .attr('x', x.bandwidth() / 2).attr('y', y.bandwidth() / 2).attr('dy', '0.35em')
      .attr('text-anchor', 'middle').style('pointer-events', 'none')
      .style('font-size', d => (compact ? (d.pct >= 0.1 ? '12px' : '11px') : d.pct >= 0.1 ? '14px' : '12.5px'))
      .style('font-weight', d => (d.pct >= 0.1 ? '700' : '500'))
      .style('fill', d => (d.pct > 0 ? textFill(d) : 'var(--c-muted)'))
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
    const legend = g.append('g').attr('transform', `translate(${compact ? -margin.left + 4 : 0},${innerHeight + 30})`);
    const lw = compact ? Math.min(180, width - 100) : 220;
    const gradId = 'counterparty-heat-gradient';
    const grad = svg.append('defs').append('linearGradient').attr('id', gradId);
    d3.range(0, 1.01, 0.1).forEach(t => grad.append('stop')
      .attr('offset', `${t * 100}%`).attr('stop-color', color(t * 0.9)));
    legend.append('text').attr('y', 4).style('font-size', '12px').style('fill', 'var(--c-ink-2)').text('Share of row');
    legend.append('rect').attr('x', 82).attr('y', -6).attr('width', lw).attr('height', 12).attr('rx', 3)
      .attr('fill', `url(#${gradId})`);
    legend.append('text').attr('x', 82).attr('y', 24).style('font-size', '11px').style('fill', 'var(--c-ink-2)').text('0%');
    legend.append('text').attr('x', 82 + lw).attr('y', 24).attr('text-anchor', 'end')
      .style('font-size', '11px').style('fill', 'var(--c-ink-2)').text('90%');
    // On a phone the "outlined" note goes on its own line under the colour bar
    const stack = compact || width < 820;
    const ox = stack ? 0 : 340, oy = stack ? 40 : 0;
    legend.append('rect').attr('x', ox).attr('y', oy - 7).attr('width', 14).attr('height', 14).attr('rx', 3)
      .style('fill', 'var(--c-surface)').style('stroke', 'var(--c-ink)').attr('stroke-width', 1.5);
    legend.append('text').attr('x', ox + 22).attr('y', oy + 4).style('font-size', '12px').style('fill', 'var(--c-ink-2)')
      .text(compact ? 'Outlined = hit most often' : 'Outlined = what that road user hit most often');

    // "View as table" (js/data-table.js): each row adds up to 100%
    if (typeof DataTable !== 'undefined') {
      const pc = d3.format('.0%');
      DataTable.register(container.node(), () => ({
        columns: ['Road user', ...COLS, 'Patients'],
        rows: rows.map(r => [r.user,
          ...COLS.map(cp => pc((matrix.find(m => m.key === r.key && m.cp === cp) || {}).pct || 0)),
          d3.format(',')(r.total)]),
      }));
    }
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

      // The heatmap is drawn by hand, so redraw it when its width changes
      const heatNode = document.querySelector('#chart-counterparty');
      if (heatNode && typeof ResizeObserver !== 'undefined') {
        let lastW = Vis.BaseChart.contentWidth(heatNode), timer = null;
        new ResizeObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            const w = Vis.BaseChart.contentWidth(heatNode);
            if (!w || Math.abs(w - lastW) < 4) return;
            lastW = w;
            drawHeatmap('#chart-counterparty', crashes, GlobalFilter.get());
          }, 120);
        }).observe(heatNode);
      }

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
