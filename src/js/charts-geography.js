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
  // Click a state to zoom to it; + / − / reset buttons, Ctrl + scroll or
  // pinch to zoom freely, drag to pan once zoomed. Keyboard: Tab to a
  // state, Enter zooms, + / − zoom, arrow keys pan, Esc resets.
  // ═══════════════════════════════════════════════════════════════
  const MAP_W = 850, MAP_H = 600, VIEW_H = 540;   // VIEW_H: map area above the legend
  // The zoom survives redraws (filter changes, Play), so it is kept here
  const mapZoom = { code: null, transform: d3.zoomIdentity };

  function drawMap(containerId, geo, cases, years) {
    const container = d3.select(containerId);
    container.selectAll('*').remove();

    const totalCases = d3.sum([...cases.values()]);
    const rank = new Map([...cases.entries()].sort((a, b) => b[1] - a[1]).map(([st], i) => [st, i + 1]));
    const yrs = rangeText(years);
    const mapBox = [[20, 20], [700, 530]];   // leaves room on the right for the ACT call-out

    // The map always draws at 850 wide and is scaled down to fit. On a phone that
    // would shrink the text to ~5px, so labels and the legend are drawn larger
    // (in map units) to keep them readable on screen.
    const cw = Vis.BaseChart.contentWidth(container.node());
    const toScreen = cw > 0 ? cw / MAP_W : 1;           // screen px per map unit
    const compact = cw > 0 && cw < 600;
    const ts = compact ? Math.min(2.2, 0.8 / toScreen) : 1;   // label text scale
    const ls = compact ? Math.min(2.4, 0.85 / toScreen) : 1;  // legend scale
    const mapH = VIEW_H + Math.round((MAP_H - VIEW_H) * ls);

    const svg = container.append('svg')
      .attr('viewBox', `0 0 ${MAP_W} ${mapH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'img')
      .attr('aria-label', `Map of Australia: hospitalised road injuries by state and territory, ${yrs}. ` +
        [...cases.entries()].sort((a, b) => b[1] - a[1])
          .map(([st, v]) => `${STATE_NAMES[st]} ${fmt(v)}`).join(', ') +
        '. Select a state and press Enter to zoom in; Escape zooms out.');

    const projection = d3.geoMercator().fitExtent(mapBox, geo);
    const path = d3.geoPath(projection);
    const featureOf = code => geo.features.find(f => f.properties.code === code);

    const [cMin, cMax] = d3.extent([...cases.values()]);
    const color = Vis.barGradient([cMin, cMax]);
    // White text on the darker half of the scale, dark text on the lighter half
    const textOn = v => ((v - cMin) / (cMax - cMin || 1)) > 0.45 ? '#ffffff' : '#1d1d1f';

    // Everything that zooms is clipped to the map area, so it never covers the legend
    const clipId = 'state-map-clip';
    svg.append('defs').append('clipPath').attr('id', clipId)
      .append('rect').attr('width', MAP_W).attr('height', VIEW_H);
    const viewport = svg.append('g').attr('clip-path', `url(#${clipId})`);
    viewport.append('rect').attr('class', 'map-bg')
      .attr('width', MAP_W).attr('height', VIEW_H).attr('fill', 'transparent')
      .on('click', () => zoomToState(null));

    // Big faint year in the corner, so Play reads like a flip-book
    const yearMark = viewport.append('text').attr('class', 'map-year-mark')
      .attr('x', 24).attr('y', VIEW_H - 16).attr('text-anchor', 'start')   // open sea south-west of the mainland
      .style('font-size', `${(years[0] === years[1] ? 84 : 56) * Math.min(ts, 1.5)}px`)
      .text(yrs);

    const zoomG = viewport.append('g').attr('class', 'map-zoom-layer');
    const statesG = zoomG.append('g').attr('class', 'map-states');
    const labelsG = viewport.append('g').attr('class', 'map-labels').style('pointer-events', 'none');
    const calloutsG = viewport.append('g').attr('class', 'map-callouts').style('pointer-events', 'none');

    const showTip = d => {
      const st = d.properties.code;
      const v = cases.get(st);
      tooltip.classed('visible', true).html(Vis.tipHtml(`${fullName(st)}, ${yrs}`, [
        ['Hospitalised:', fmt(v)],
        ['Share of all states:', fmtPct(v / totalCases), true],
        ['Rank:', `${rank.get(st)} of 8`],
        [mapZoom.code === st ? 'Click again to zoom out' : 'Click to zoom in', ''],
      ]));
    };

    const states = statesG.selectAll('path')
      .data(geo.features)
      .join('path')
      .attr('class', 'map-state')
      .attr('d', path)
      .attr('fill', d => color(cases.get(d.properties.code)))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.2)
      .attr('vector-effect', 'non-scaling-stroke')   // borders stay thin at any zoom
      .attr('stroke-linejoin', 'round')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', d => `${fullName(d.properties.code)}: ${fmt(cases.get(d.properties.code))} hospitalised, ${yrs}. Press Enter to zoom.`)
      .style('cursor', 'pointer')
      .on('mouseenter focus', function (event, d) {
        d3.select(this).raise().attr('stroke', '#1d1d1f').attr('stroke-width', 2);
        showTip(d);
        if (event.type === 'focus') {
          const [x, y] = mapZoom.transform.apply(path.centroid(d));
          const box = svg.node().getBoundingClientRect();
          const k = box.width / MAP_W;
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
      })
      .on('click', (event, d) => {
        const st = d.properties.code;
        zoomToState(mapZoom.code === st ? null : st);
        showTip(d);
      })
      .on('keydown', (event, d) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const st = d.properties.code;
        zoomToState(mapZoom.code === st ? null : st);
      });

    // ── Labels: abbreviation + count + share inside each state ──
    // Labels sit in their own layer and are moved (not scaled) by the zoom,
    // so the text stays the same size. ACT and VIC are too small to hold
    // the text at full view, so they get call-out lines into the open
    // space east of the coast; once zoomed in they are labelled inside.
    const nudge = { NSW: [-12, 8], QLD: [10, 25], WA: [0, 10], SA: [0, -15], NT: [0, 0] };
    const callouts = { ACT: -14 - 24 * (ts - 1), VIC: 40 + 24 * (ts - 1) };

    const twoLine = (sel, anchor, fill, st, v) => {
      // Halo in the opposite tone keeps the text readable over any neighbour
      const t = sel.append('text').attr('text-anchor', anchor).attr('fill', fill)
        .attr('stroke', fill === '#ffffff' ? 'rgba(8, 48, 107, 0.55)' : 'rgba(255, 255, 255, 0.9)')
        .attr('stroke-width', 3 * ts).attr('stroke-linejoin', 'round').attr('paint-order', 'stroke');
      t.append('tspan').attr('x', 0).attr('y', -4 * ts)
        .style('font-size', `${15 * ts}px`).style('font-weight', '700').text(st);
      // On a phone only the share fits; the count is in the tooltip and the bar view
      t.append('tspan').attr('x', 0).attr('dy', 17 * ts)
        .style('font-size', `${12.5 * ts}px`).style('font-weight', '600')
        .text(compact ? d3.format('.0%')(v / totalCases) : `${fmt(v)} · ${fmtPct(v / totalCases)}`);
    };

    const labelSpecs = [];
    geo.features.forEach(f => {
      const st = f.properties.code;
      const v = cases.get(st);
      const [cx, cy] = path.centroid(f);

      if (st in callouts) {
        const tx = 745, ty = cy + callouts[st];
        calloutsG.append('path')
          .attr('d', `M${cx},${cy} L${cx + 30},${ty} L${tx - 6},${ty}`)
          .attr('fill', 'none').attr('stroke', '#1d1d1f').attr('stroke-width', 1);
        calloutsG.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 3.5)
          .attr('fill', '#1d1d1f').attr('stroke', '#ffffff').attr('stroke-width', 1.5);
        twoLine(calloutsG.append('g').attr('transform', `translate(${tx},${ty + 1})`), 'start', '#1d1d1f', st, v);
        labelSpecs.push({ st, v, x: cx, y: cy, anchor: 'middle', fill: textOn(v), zoomOnly: true });
        return;
      }
      if (st === 'TAS') {
        const [[, y0], [x1, y1]] = path.bounds(f);
        labelSpecs.push({ st, v, x: x1 + 12 * ts, y: (y0 + y1) / 2, anchor: 'start', fill: '#1d1d1f' });
        return;
      }
      const [dx, dy] = nudge[st] || [0, 0];
      labelSpecs.push({ st, v, x: cx + dx, y: cy + dy, anchor: 'middle', fill: textOn(v) });
    });

    const labels = labelsG.selectAll('.map-label').data(labelSpecs).join('g').attr('class', 'map-label');
    labels.each(function (d) { twoLine(d3.select(this), d.anchor, d.fill, d.st, d.v); });

    // ── Zoom ───────────────────────────────────────────────────────
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .extent([[0, 0], [MAP_W, VIEW_H]])
      .translateExtent([[0, 0], [MAP_W, VIEW_H]])
      .filter(event => {
        if (event.type === 'wheel') return event.ctrlKey || event.metaKey;        // page scroll stays page scroll
        if (event.type === 'dblclick') return false;
        if (event.type.startsWith('touch')) return event.touches && event.touches.length >= 2;  // pinch only
        return !event.button && d3.zoomTransform(svg.node()).k > 1.01;             // drag to pan once zoomed
      })
      .on('zoom', event => applyTransform(event.transform));
    svg.call(zoom).on('dblclick.zoom', null).style('touch-action', 'pan-y');

    function applyTransform(t) {
      mapZoom.transform = t;
      zoomG.attr('transform', t);
      labels.attr('transform', d => `translate(${t.applyX(d.x)},${t.applyY(d.y)})`)
        .style('display', d => (d.zoomOnly && t.k < 1.6 ? 'none' : null));
      calloutsG.style('display', t.k > 1.05 ? 'none' : null);
      yearMark.style('display', t.k > 1.05 ? 'none' : null);
      zoomOutBtn.property('disabled', t.k <= 1.01);
      resetBtn.property('disabled', t.k <= 1.01 && !mapZoom.code);
    }

    function transformFor(code) {
      if (!code) return d3.zoomIdentity;
      const [[x0, y0], [x1, y1]] = path.bounds(featureOf(code));
      const k = Math.max(1, Math.min(8, 0.8 / Math.max((x1 - x0) / MAP_W, (y1 - y0) / VIEW_H)));
      return d3.zoomIdentity.translate(MAP_W / 2, VIEW_H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    }

    function paintFocus() {
      states.attr('opacity', d => (mapZoom.code && d.properties.code !== mapZoom.code ? 0.35 : 1));
      labels.attr('opacity', d => (mapZoom.code && d.st !== mapZoom.code ? 0.45 : 1));
      status.classed('is-on', !!mapZoom.code)
        .text(mapZoom.code ? `${STATE_NAMES[mapZoom.code]} · Esc or ⟲ to zoom out` : '');
    }

    function zoomTo(t, animate = true) {
      const ms = animate ? Motion.dur(750) : 0;
      if (ms) svg.transition().duration(ms).ease(d3.easeCubicInOut).call(zoom.transform, t);
      else svg.call(zoom.transform, t);
    }

    function zoomToState(code, animate = true) {
      mapZoom.code = code;
      paintFocus();
      zoomTo(transformFor(code), animate);
    }

    // Keyboard: + / − zoom, arrows pan, Esc resets (focus is on a state)
    svg.on('keydown.mapkeys', event => {
      const pan = 60 / mapZoom.transform.k;
      const moves = { ArrowLeft: [pan, 0], ArrowRight: [-pan, 0], ArrowUp: [0, pan], ArrowDown: [0, -pan] };
      if (event.key === '+' || event.key === '=') zoomBy(1.6);
      else if (event.key === '-' || event.key === '_') zoomBy(1 / 1.6);
      else if (event.key === 'Escape') zoomToState(null);
      else if (event.key in moves && mapZoom.transform.k > 1.01) {
        svg.call(zoom.translateBy, ...moves[event.key]);
      } else return;
      event.preventDefault();
    });

    function zoomBy(f) {
      mapZoom.code = null;
      paintFocus();
      const ms = Motion.dur(350);
      if (ms) svg.transition().duration(ms).call(zoom.scaleBy, f);
      else svg.call(zoom.scaleBy, f);
    }

    // On-screen buttons (44 × 44 px) for mouse and touch users
    const controls = container.append('div').attr('class', 'map-zoom-controls')
      .attr('role', 'group').attr('aria-label', 'Map zoom');
    controls.append('button').attr('type', 'button').attr('aria-label', 'Zoom in').text('+')
      .on('click', () => zoomBy(1.6));
    const zoomOutBtn = controls.append('button').attr('type', 'button').attr('aria-label', 'Zoom out').text('−')
      .on('click', () => zoomBy(1 / 1.6));
    const resetBtn = controls.append('button').attr('type', 'button').attr('aria-label', 'Show all of Australia')
      .html('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>')
      .on('click', () => zoomToState(null));
    const status = container.append('div').attr('class', 'map-zoom-status').attr('aria-live', 'polite');

    // Restore the zoom from before this redraw, without animating
    if (mapZoom.code) zoomToState(mapZoom.code, false);
    else { paintFocus(); zoomTo(mapZoom.transform, false); }

    // ── Legend: continuous gradient bar with tick values ──
    const legendW = 320;
    const legendX = compact ? MAP_W / 2 - (legendW * ls) / 2 : (mapBox[0][0] + mapBox[1][0]) / 2 - legendW / 2;
    const legendY = VIEW_H + 12 * ls;
    const gradId = 'state-heat-gradient';
    const grad = svg.append('defs').append('linearGradient').attr('id', gradId);
    d3.range(0, 1.01, 0.1).forEach(t => {
      grad.append('stop').attr('offset', `${t * 100}%`).attr('stop-color', color(cMin + t * (cMax - cMin)));
    });

    const legend = svg.append('g').attr('class', 'map-legend')
      .attr('transform', `translate(${legendX},${legendY}) scale(${ls})`);
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
        // The map is drawn by hand, so redraw it when its width changes
        const mapNode = document.getElementById('chart-state-territory');
        if (mapNode && typeof ResizeObserver !== 'undefined') {
          let lastW = Vis.BaseChart.contentWidth(mapNode), timer = null;
          new ResizeObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(() => {
              const w = Vis.BaseChart.contentWidth(mapNode);
              if (!w || Math.abs(w - lastW) < 4 || view !== 'map') return;
              lastW = w;
              drawStates(GlobalFilter.get().years);
            }, 120);
          }).observe(mapNode);
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
          series: STATES.map(st => ({ key: st, label: STATE_NAMES[st], short: st, color: STATE_COLORS[st] })),
          breaks: [
            { year: 2012, lines: ['2012: Victoria stopped counting', 'patients treated only in emergency'], short: ['2012: VIC', 'count change'] },
            { year: 2017, lines: ['2017: NSW made the', 'same change'], short: ['2017: NSW', 'same change'] },
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
