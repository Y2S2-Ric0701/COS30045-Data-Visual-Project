/* ═══════════════════════════════════════════════════════════════
   charts-geography.js – Question 3: Where does it happen?
   COS30045 Data Visualisation Project

   3.1 Which states have the most injuries?  (map ⇄ bar chart, chosen years)
   3.2 Is it more dangerous outside cities?  (deaths per 1,000 by remoteness)
   3.3 Is every state following the trend?   (one labelled line per state)
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const tooltip = Vis.BaseChart.getTooltip();
  const fmt = d3.format(',');
  const fmtPct = d3.format('.1%');
  const fmtDec1 = d3.format('.1f');
  const STATES = Object.keys(STATE_NAMES);
  const fullName = code => `${STATE_NAMES[code]} (${code})`;

  /** Cases per state, added up over the chosen years */
  function stateTotals(rows, [y0, y1]) {
    const sel = rows.filter(d => d.year >= y0 && d.year <= y1);
    return new Map(STATES.map(st => [st, d3.sum(sel, d => +d[st] || 0)]));
  }

  // ═══════════════════════════════════════════════════════════════
  // FIGURE 3.1 (map view): each state shaded by its cases
  // (light blue = fewer, dark blue = more), using the site-wide gradient.
  // ═══════════════════════════════════════════════════════════════
  function drawMap(containerId, geo, cases, years) {
    const container = d3.select(containerId);
    container.selectAll('*').remove();

    const totalCases = d3.sum([...cases.values()]);
    const rank = new Map([...cases.entries()].sort((a, b) => b[1] - a[1]).map(([st], i) => [st, i + 1]));
    const yrs = rangeText(years);

    const width = 850;
    const height = 600;
    const mapBox = [[20, 20], [700, 530]];   // leaves room on the right for the ACT call-out

    const svg = container.append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'img')
      .attr('aria-label', `Map of Australia: hospitalised road injuries by state and territory, ${yrs}. ` +
        [...cases.entries()].sort((a, b) => b[1] - a[1])
          .map(([st, v]) => `${STATE_NAMES[st]} ${fmt(v)}`).join(', '));

    const projection = d3.geoMercator().fitExtent(mapBox, geo);
    const path = d3.geoPath(projection);

    const [cMin, cMax] = d3.extent([...cases.values()]);
    const color = Vis.barGradient([cMin, cMax]);
    // White text on the darker half of the scale, dark text on the lighter half
    const textOn = v => ((v - cMin) / (cMax - cMin || 1)) > 0.45 ? '#ffffff' : '#1d1d1f';

    const statesG = svg.append('g').attr('class', 'map-states');
    const labelsG = svg.append('g').attr('class', 'map-labels').style('pointer-events', 'none');

    const showTip = d => {
      const st = d.properties.code;
      const v = cases.get(st);
      tooltip.classed('visible', true).html(Vis.tipHtml(`${fullName(st)}, ${yrs}`, [
        ['Hospitalised:', fmt(v)],
        ['Share of all states:', fmtPct(v / totalCases), true],
        ['Rank:', `${rank.get(st)} of 8`],
      ]));
    };

    statesG.selectAll('path')
      .data(geo.features)
      .join('path')
      .attr('class', 'map-state')
      .attr('d', path)
      .attr('fill', d => color(cases.get(d.properties.code)))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.2)
      .attr('stroke-linejoin', 'round')
      .attr('tabindex', 0)
      .attr('aria-label', d => `${fullName(d.properties.code)}: ${fmt(cases.get(d.properties.code))} hospitalised, ${yrs}`)
      .style('cursor', 'pointer')
      .on('mouseenter focus', function (event, d) {
        d3.select(this).raise().attr('stroke', '#1d1d1f').attr('stroke-width', 2);
        labelsG.raise();
        showTip(d);
        if (event.type === 'focus') {
          const [x, y] = path.centroid(d);
          const box = svg.node().getBoundingClientRect();
          const k = box.width / width;
          tooltip.style('left', `${box.left + window.scrollX + x * k + 14}px`)
            .style('top', `${box.top + window.scrollY + y * k - 28}px`);
        } else {
          Vis.placeTip(tooltip, event);
        }
      })
      .on('mousemove', event => Vis.placeTip(tooltip, event))
      .on('mouseleave blur', function () {
        d3.select(this).attr('stroke', '#ffffff').attr('stroke-width', 1.2);
        tooltip.classed('visible', false);
      });

    // ── Labels: abbreviation + count + share inside each state ──
    // Mainland centroids land off-centre for a few states, so nudge them.
    // ACT and VIC are too small to hold the text, so they get call-out
    // lines into the open space east of the coast; TAS is labelled beside the island.
    const nudge = { NSW: [-12, 8], QLD: [10, 25], WA: [0, 10], SA: [0, -15], NT: [0, 0] };
    const callouts = { ACT: -14, VIC: 40 };

    const twoLineLabel = (x, y, anchor, fill, st, v) => {
      const t = labelsG.append('text').attr('text-anchor', anchor).attr('fill', fill);
      t.append('tspan').attr('x', x).attr('y', y - 4)
        .style('font-size', '15px').style('font-weight', '700').text(st);
      t.append('tspan').attr('x', x).attr('dy', 17)
        .style('font-size', '12.5px').style('font-weight', '600')
        .text(`${fmt(v)} · ${fmtPct(v / totalCases)}`);
    };

    geo.features.forEach(f => {
      const st = f.properties.code;
      const v = cases.get(st);
      const [cx, cy] = path.centroid(f);

      if (st in callouts) {
        const tx = 745, ty = cy + callouts[st];
        labelsG.append('path')
          .attr('d', `M${cx},${cy} L${cx + 30},${ty} L${tx - 6},${ty}`)
          .attr('fill', 'none').attr('stroke', '#1d1d1f').attr('stroke-width', 1);
        labelsG.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 3.5)
          .attr('fill', '#1d1d1f').attr('stroke', '#ffffff').attr('stroke-width', 1.5);
        twoLineLabel(tx, ty + 1, 'start', '#1d1d1f', st, v);
        return;
      }
      if (st === 'TAS') {
        const [[, y0], [x1, y1]] = path.bounds(f);
        twoLineLabel(x1 + 12, (y0 + y1) / 2, 'start', '#1d1d1f', st, v);
        return;
      }
      const [dx, dy] = nudge[st] || [0, 0];
      twoLineLabel(cx + dx, cy + dy, 'middle', textOn(v), st, v);
    });

    // ── Legend: continuous gradient bar with tick values ──
    const legendW = 320;
    const legendX = (mapBox[0][0] + mapBox[1][0]) / 2 - legendW / 2;
    const legendY = 552;
    const gradId = 'state-heat-gradient';
    const grad = svg.append('defs').append('linearGradient').attr('id', gradId);
    d3.range(0, 1.01, 0.1).forEach(t => {
      grad.append('stop').attr('offset', `${t * 100}%`).attr('stop-color', color(cMin + t * (cMax - cMin)));
    });

    const legend = svg.append('g').attr('class', 'map-legend').attr('transform', `translate(${legendX},${legendY})`);
    legend.append('text').attr('x', legendW / 2).attr('y', -8).attr('text-anchor', 'middle')
      .style('font-size', '12px').style('fill', '#55555a')
      .text(`Hospitalised injuries, ${yrs} (darker = more)`);
    legend.append('rect').attr('width', legendW).attr('height', 12).attr('rx', 3).attr('fill', `url(#${gradId})`);
    const lx = d3.scaleLinear().domain([cMin, cMax]).range([0, legendW]);
    legend.append('g').attr('transform', 'translate(0,12)')
      .call(d3.axisBottom(lx).tickValues([cMin, (cMin + cMax) / 2, cMax]).tickSize(5)
        .tickFormat(d => fmt(Math.round(d))))
      .call(g => g.select('.domain').remove())
      .selectAll('text').style('font-size', '11px').style('fill', '#55555a');
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALISE
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function () {
    Promise.all([SiteData.states(), d3.json('data/australia_states.geojson'), SiteData.remoteness()])
      .then(function ([stateRows, geo, remRows]) {
        const initial = GlobalFilter.get();

        // ── Figure 3.1: map ⇄ bar chart ─────────────────────────────
        let view = 'map';
        const barData = cases => {
          const total = d3.sum([...cases.values()]);
          return STATES.map(st => ({ key: st, label: fullName(st), value: cases.get(st), share: cases.get(st) / total }));
        };
        const stateBars = new Vis.RankedBarChart('#chart-state-bars', barData(stateTotals(stateRows, initial.years)), {
          valueText: d => `${fmt(d.value)} · ${d3.format('.0%')(d.share)}`,
          margin: { top: 24, right: 140, bottom: 54, left: 250 },
          rowHeight: 44,
          tooltip: d => [d.label, [['Hospitalised:', fmt(d.value)], ['Share of all states:', fmtPct(d.share), true]]],
        });
        function drawStates(years) {
          const cases = stateTotals(stateRows, years);
          if (view === 'map') {
            drawMap('#chart-state-territory', geo, cases, years);
          } else {
            stateBars.config.xLabel = `Hospitalised, ${rangeText(years)}`;
            stateBars.wrangleData(barData(cases));
          }
        }
        const viewButtons = document.querySelectorAll('#state-view-control .filter-btn');
        viewButtons.forEach(btn => btn.addEventListener('click', () => {
          viewButtons.forEach(b => {
            b.classList.toggle('active', b === btn);
            b.setAttribute('aria-pressed', String(b === btn));
          });
          view = btn.dataset.view;
          document.getElementById('chart-state-territory').hidden = view !== 'map';
          document.getElementById('chart-state-bars').hidden = view !== 'bar';
          drawStates(GlobalFilter.get().years);
        }));

        // ── Figure 3.2: deaths per 1,000 cases, city vs country ─────
        const AREAS = ['Major Cities', 'Regional', 'Remote'];
        function remotenessData(state) {
          const dy = SiteData.deathYears(state.years);
          if (!dy) return [];
          const sel = SiteData.ofRoadUser(SiteData.inYears(remRows, dy), state.roadUser);
          const sums = SiteData.sumBy(sel, d => d.remoteness, ['cases', 'deaths', 'bed_days']);
          return AREAS.map(a => {
            const o = SiteData.outcomes(sums.get(a) || { cases: 0, deaths: 0, bed_days: 0 });
            return { key: a, label: a === 'Major Cities' ? 'Major cities' : a, value: o.rate, ...o };
          });
        }
        const remChart = new Vis.RankedBarChart('#chart-metro-regional', remotenessData(initial), {
          sort: 'none',
          margin: { top: 24, right: 200, bottom: 54, left: 130 },
          rowHeight: 62,
          valueText: d => `${fmtDec1(d.value)} deaths per 1,000 cases`,
          tickFormat: d3.format('~'),
          emptyText: 'No death records for 2020–2021: choose earlier years',
          tooltip: d => [d.label, [
            ['Hospital cases:', fmt(d.cases)],
            ['Died in hospital:', fmt(d.deaths)],
            ['Deaths per 1,000 cases:', fmtDec1(d.value), true],
            ['Average stay:', `${fmtDec1(d.stay)} days`],
          ]],
        });

        // ── Figure 3.3: every state over time ───────────────────────
        const stateTable = YEARS.map(year => {
          const r = stateRows.find(d => d.year === year);
          return Object.assign({ year }, Object.fromEntries(STATES.map(st => [st, +r[st] || 0])));
        });
        const trendChart = new Vis.TrendLinesChart('#chart-state-trends', stateTable, {
          series: STATES.map(st => ({ key: st, label: STATE_NAMES[st], color: STATE_COLORS[st] })),
          breaks: [
            { year: 2012, lines: ['2012: Victoria stopped counting', 'patients treated only in emergency'] },
            { year: 2017, lines: ['2017: NSW made the', 'same change'] },
          ],
          band: initial.years,
          margin: { right: 260 },
        });

        GlobalFilter.subscribe(state => {
          drawStates(state.years);
          const dy = SiteData.deathYears(state.years);
          remChart.config.xLabel = dy ? `Deaths in hospital per 1,000 cases, ${rangeText(dy)}` : '';
          remChart.wrangleData(remotenessData(state));
          trendChart.update({ band: state.years });
        });
      })
      .catch(err => console.error('Error loading Question 3 data:', err));
  });
})();
