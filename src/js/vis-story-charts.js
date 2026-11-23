/* ═══════════════════════════════════════════════════════════════
   vis-story-charts.js – Chart types used by the question pages
   COS30045 Data Visualisation Project

   Builds on Vis.BaseChart (vis-components.js). Every chart here:
   - can highlight one category (the road user chosen in the filter);
   - can report a click on a category (so a click sets the filter);
   - is keyboard-reachable (Tab to a row, Enter to select it).

   - RankedBarChart:   horizontal bars, also negative values (% change)
   - StackedAreaChart: total over time, split into layers
   - TrendLinesChart:  one labelled line per category over time
   - PairedBarChart:   two bars per category ("share of cases" vs "share of deaths")
   ═══════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const Vis = global.Vis;
  const fmtComma = d3.format(',');
  const fmtK = d => (Math.abs(d) >= 1000 ? `${d3.format('~s')(d).replace('G', 'B')}` : d3.format('~')(d));
  const keyOf = d => d.key ?? d.label;

  // ── Shared helpers ───────────────────────────────────────────
  function tipHtml(title, rows) {
    return `<div class="tooltip-title">${title}</div>` + rows.map(([k, v, accent]) =>
      `<div class="tooltip-row"><span>${k}</span> <span class="${accent ? 'tooltip-accent' : 'tooltip-val'}">${v}</span></div>`
    ).join('');
  }

  function placeTip(tooltip, event) {
    const node = tooltip.node();
    const w = node ? node.offsetWidth : 0;
    const left = (event.clientX + 16 + w > window.innerWidth - 8) ? event.pageX - 16 - w : event.pageX + 14;
    tooltip.style('left', `${Math.max(8, left)}px`).style('top', `${event.pageY - 28}px`);
  }

  /** Enter / Space on a focused element acts like a click */
  function keyClick(selection, handler) {
    selection.on('keydown', function (event, d) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handler(event, d); }
    });
  }

  /** Grey wash over the years outside the chosen range (time charts) */
  function drawYearBand(vis, x, band, firstYear, lastYear) {
    const g = vis.annotationsG.selectAll('.year-band').data([0]).join('g').attr('class', 'year-band')
      .style('pointer-events', 'none');
    g.selectAll('*').remove();
    if (!band || (band[0] <= firstYear && band[1] >= lastYear)) return;
    const half = (x(firstYear + 1) - x(firstYear)) / 2;
    const left = band[0] === band[1] ? x(band[0]) - half : x(band[0]);
    const right = band[0] === band[1] ? x(band[1]) + half : x(band[1]);
    const dim = (x0, x1) => {
      if (x1 - x0 <= 0) return;
      g.append('rect').attr('x', x0).attr('width', x1 - x0).attr('y', 0).attr('height', vis.innerHeight)
        .attr('fill', '#ffffff').attr('opacity', 0.72);
    };
    dim(0, Math.max(0, left));
    dim(Math.min(vis.innerWidth, right), vis.innerWidth);
    g.append('text').attr('class', 'year-band-label')
      .attr('x', (Math.max(0, left) + Math.min(vis.innerWidth, right)) / 2).attr('y', vis.innerHeight - 8)
      .attr('text-anchor', 'middle')
      .text(band[0] === band[1] ? `${band[0]}` : `${band[0]}–${band[1]} selected`);
  }

  /** Spread end-of-line labels apart so they never overlap */
  function dodge(items, minGap, lo, hi) {
    items.sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) {
      if (items[i].y - items[i - 1].y < minGap) items[i].y = items[i - 1].y + minGap;
    }
    if (items.length && items[items.length - 1].y > hi) {
      items[items.length - 1].y = hi;
      for (let i = items.length - 2; i >= 0; i--) {
        if (items[i + 1].y - items[i].y < minGap) items[i].y = items[i + 1].y - minGap;
      }
    }
    items.forEach(d => { d.y = Math.max(lo, d.y); });
    return items;
  }

  function setViewHeight(vis, height) {
    vis.config.height = height;
    vis.innerHeight = height - vis.config.margin.top - vis.config.margin.bottom;
    vis.svg.attr('viewBox', `0 0 ${vis.config.width} ${height}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // RankedBarChart – one horizontal bar per category
  // data: [{ key, label, value, …any extra fields for the tooltip }]
  // ═══════════════════════════════════════════════════════════════
  class RankedBarChart extends Vis.BaseChart {
    constructor(parentElement, data, config = {}) {
      super(parentElement, data, Object.assign({
        labelKey: 'label',
        autoFitLabels: true,
        rowHeight: 46,
        sort: 'desc',            // 'desc' = biggest first, 'none' = keep the given order
        xMin: null,
        xMax: null,
        xLabel: '',
        tickFormat: fmtK,
        valueText: d => fmtComma(d.value),
        colorOf: null,           // d => colour; otherwise the site's blue gradient
        highlight: null,         // key of the category to highlight
        onClick: null,           // d => …
        refLines: [],            // [{ value, label }]
        tooltip: null,           // d => [title, [[label, value, accent?], …]]
        nullText: 'n/a',
        emptyText: 'No data for this selection',
        ariaLabel: null,         // rows => text
      }, config, {
        margin: Object.assign({ top: 34, right: 130, bottom: 54, left: 160 }, config.margin || {}),
      }));
    }

    wrangleData(newData) {
      if (newData) this.rawData = newData;
      const rows = this.rawData.map(d => Object.assign({}, d, {
        value: d.value == null || Number.isNaN(+d.value) ? null : +d.value,
      }));
      if (this.config.sort === 'desc') rows.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
      this.displayData = rows;
      this.renderVis();
    }

    setHighlight(key) {
      this.config.highlight = key && key !== 'all' ? key : null;
      this.renderVis();
    }

    renderVis() {
      const vis = this;
      const c = vis.config;
      const rows = vis.displayData;
      setViewHeight(vis, c.margin.top + c.margin.bottom + Math.max(1, rows.length) * c.rowHeight);
      if (c.ariaLabel) vis.svg.attr('aria-label', c.ariaLabel(rows));

      const valid = rows.filter(d => d.value != null);
      vis.svg.selectAll('.empty-msg').remove();
      if (!valid.length) {
        [vis.plotG, vis.gridG, vis.xAxisG, vis.yAxisG, vis.annotationsG].forEach(g => g.selectAll('*').remove());
        vis.svg.append('text').attr('class', 'empty-msg')
          .attr('x', c.width / 2).attr('y', c.height / 2).attr('text-anchor', 'middle').text(c.emptyText);
        return;
      }

      const vals = valid.map(d => d.value);
      const lo = c.xMin ?? Math.min(0, d3.min(vals) * 1.3);
      const hi = c.xMax ?? Math.max(0, d3.max(vals)) * 1.12;
      const x = d3.scaleLinear().domain([lo, hi || 1]).range([0, vis.innerWidth]);
      if (c.xMin == null || c.xMax == null) x.nice();
      const y = d3.scaleBand().domain(rows.map(d => d.label)).range([0, vis.innerHeight]).padding(0.28);
      const grad = Vis.barGradient(d3.extent(vals));
      const fill = d => (c.colorOf ? c.colorOf(d) : grad(d.value));
      const faded = d => c.highlight && keyOf(d) !== c.highlight;

      vis.gridG.call(d3.axisBottom(x).ticks(6).tickSize(vis.innerHeight).tickFormat(''))
        .call(g => g.select('.domain').remove())
        .selectAll('line').attr('stroke', 'rgba(0,0,0,0.06)').attr('stroke-dasharray', '2 4');

      vis.yAxisG.classed('axis-category', true)
        .call(d3.axisLeft(y).tickSize(0).tickPadding(12))
        .call(g => g.select('.domain').remove());
      vis.yAxisG.selectAll('.tick text')
        .style('opacity', label => (faded(rows.find(r => r.label === label)) ? 0.45 : 1))
        .style('font-weight', label => (c.highlight && keyOf(rows.find(r => r.label === label)) === c.highlight ? 700 : null));

      vis.xAxisG.attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(c.tickFormat));
      vis.xAxisG.selectAll('.axis-label').data([c.xLabel]).join('text')
        .attr('class', 'axis-label').attr('x', vis.innerWidth / 2).attr('y', 44)
        .attr('text-anchor', 'middle').text(d => d);

      // Zero line when some values are negative (e.g. % change)
      vis.annotationsG.selectAll('.zero-line').data(lo < 0 ? [0] : []).join('line')
        .attr('class', 'zero-line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', -6).attr('y2', vis.innerHeight)
        .attr('stroke', '#1d1d1f').attr('stroke-width', 1);

      // Reference lines (e.g. "all road users: 65%")
      const refs = vis.annotationsG.selectAll('.ref-line').data(c.refLines).join('g').attr('class', 'ref-line');
      refs.selectAll('*').remove();
      refs.append('line').attr('x1', d => x(d.value)).attr('x2', d => x(d.value))
        .attr('y1', -8).attr('y2', vis.innerHeight)
        .attr('stroke', '#1d1d1f').attr('stroke-dasharray', '4 3').attr('stroke-width', 1.2);
      refs.append('text').attr('class', 'ref-label')
        .attr('x', d => x(d.value) + (d.anchor === 'start' ? 4 : d.anchor === 'end' ? -4 : 0)).attr('y', -14)
        .attr('text-anchor', d => d.anchor || 'middle').text(d => d.label);

      const t = vis.svg.transition().duration(c.duration).ease(c.ease);
      vis.plotG.selectAll('.rbar').data(valid, keyOf).join(
        enter => enter.append('rect').attr('class', 'rbar').attr('rx', 4)
          .attr('x', x(0)).attr('width', 0)
          .attr('y', d => y(d.label)).attr('height', y.bandwidth()),
        update => update,
        exit => exit.remove())
        .attr('fill', fill)
        .transition(t)
        .attr('y', d => y(d.label)).attr('height', y.bandwidth())
        .attr('x', d => x(Math.min(0, d.value))).attr('width', d => Math.abs(x(d.value) - x(0)))
        .attr('opacity', d => (faded(d) ? 0.2 : 1));

      vis.plotG.selectAll('.rbar-label').data(rows, keyOf).join('text')
        .attr('class', 'bar-label rbar-label')
        .attr('y', d => y(d.label) + y.bandwidth() / 2).attr('dy', '0.35em')
        .attr('x', d => (d.value == null ? x(0) + 8 : d.value >= 0 ? x(d.value) + 8 : x(d.value) - 8))
        .attr('text-anchor', d => (d.value != null && d.value < 0 ? 'end' : 'start'))
        .style('fill', d => (d.value == null ? '#64748b' : (c.labelColor ? c.labelColor(d) : '#1d1d1f')))
        .attr('opacity', d => (faded(d) ? 0.45 : 1))
        .text(d => (d.value == null ? c.nullText : c.valueText(d)));

      // Full-width hit area per row: hover for details, click to select
      const hits = vis.plotG.selectAll('.rbar-hit').data(rows, keyOf).join('rect')
        .attr('class', 'rbar-hit')
        .attr('x', -c.margin.left).attr('width', vis.innerWidth + c.margin.left + c.margin.right - 10)
        .attr('y', d => y(d.label) - (y.step() * y.paddingInner()) / 2).attr('height', y.step())
        .attr('fill', 'transparent')
        .style('cursor', c.onClick ? 'pointer' : 'default')
        .attr('tabindex', c.onClick ? 0 : null)
        .attr('role', c.onClick ? 'button' : null)
        .attr('aria-label', d => `${d.label}: ${d.value == null ? c.nullText : c.valueText(d)}`)
        .on('mouseenter', function (event, d) {
          vis.plotG.selectAll('.rbar').filter(b => keyOf(b) === keyOf(d)).attr('filter', 'brightness(0.9)');
          if (!c.tooltip) return;
          const [title, tipRows] = c.tooltip(d);
          vis.tooltip.classed('visible', true).html(tipHtml(title, tipRows));
          placeTip(vis.tooltip, event);
        })
        .on('mousemove', event => placeTip(vis.tooltip, event))
        .on('mouseleave', function () {
          vis.plotG.selectAll('.rbar').attr('filter', null);
          vis.tooltip.classed('visible', false);
        });
      if (c.onClick) {
        hits.on('click', (event, d) => c.onClick(d));
        keyClick(hits, (event, d) => c.onClick(d));
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // StackedAreaChart – the total per year, split into layers
  // data: [{ year, [key]: value, … }]
  // ═══════════════════════════════════════════════════════════════
  class StackedAreaChart extends Vis.BaseChart {
    constructor(parentElement, data, config = {}) {
      super(parentElement, data, Object.assign({
        keys: [],
        colorOf: () => '#888888',
        labelOf: k => k,
        highlight: null,
        band: null,
        onClick: null,
        yLabel: 'Hospitalised per year',
        height: 470,
        minLabelPx: 17,
      }, config, {
        margin: Object.assign({ top: 44, right: 170, bottom: 48, left: 72 }, config.margin || {}),
      }));
    }

    wrangleData(newData) {
      if (newData) this.rawData = newData;
      this.displayData = [...this.rawData].sort((a, b) => a.year - b.year);
      this.renderVis();
    }

    update(opts) { Object.assign(this.config, opts); this.renderVis(); }

    renderVis() {
      const vis = this;
      const c = vis.config;
      const data = vis.displayData;
      const first = data[0].year, last = data[data.length - 1].year;
      const x = d3.scaleLinear().domain([first, last]).range([0, vis.innerWidth]);
      const series = d3.stack().keys(c.keys)(data);
      const totals = data.map(d => ({ year: d.year, total: d3.sum(c.keys, k => d[k]) }));
      const y = d3.scaleLinear().domain([0, d3.max(totals, d => d.total) * 1.14]).nice().range([vis.innerHeight, 0]);

      vis.gridG.call(d3.axisLeft(y).ticks(6).tickSize(-vis.innerWidth).tickFormat(''))
        .call(g => g.select('.domain').remove())
        .selectAll('line').attr('stroke', 'rgba(0,0,0,0.06)').attr('stroke-dasharray', '2 4');
      vis.xAxisG.attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(x).ticks(data.length).tickFormat(d3.format('d')));
      vis.yAxisG.call(d3.axisLeft(y).ticks(6).tickFormat(fmtK));
      vis.yAxisG.selectAll('.axis-label').data([c.yLabel]).join('text').attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)').attr('x', -vis.innerHeight / 2).attr('y', -54)
        .attr('text-anchor', 'middle').text(d => d);

      const area = d3.area().x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveMonotoneX);
      const faded = k => c.highlight && k !== c.highlight;
      const yearAt = event => Math.round(x.invert(d3.pointer(event, vis.plotG.node())[0]));

      vis.plotG.selectAll('.area-layer').data(series, s => s.key).join('path')
        .attr('class', 'area-layer')
        .attr('fill', s => c.colorOf(s.key)).attr('stroke', '#ffffff').attr('stroke-width', 0.8)
        .style('cursor', c.onClick ? 'pointer' : null)
        .on('pointermove', function (event, s) {
          const yr = Math.max(first, Math.min(last, yearAt(event)));
          const row = data.find(d => d.year === yr);
          const tot = d3.sum(c.keys, k => row[k]);
          vis.tooltip.classed('visible', true).html(tipHtml(`${c.labelOf(s.key)}, ${yr}`, [
            ['Hospitalised:', fmtComma(row[s.key]), true],
            ['Share of that year:', d3.format('.0%')(row[s.key] / tot)],
            ['All road users:', fmtComma(tot)],
          ]));
          placeTip(vis.tooltip, event);
          d3.select(this).attr('filter', 'brightness(0.92)');
        })
        .on('pointerleave', function () {
          d3.select(this).attr('filter', null);
          vis.tooltip.classed('visible', false);
        })
        .on('click', (event, s) => c.onClick && c.onClick(s.key))
        .transition().duration(c.duration)
        .attr('d', area)
        .attr('opacity', s => (faded(s.key) ? 0.18 : 0.92));

      // Total line on top
      const line = d3.line().x(d => x(d.year)).y(d => y(d.total)).curve(d3.curveMonotoneX);
      vis.plotG.selectAll('.total-line').data([totals]).join('path').attr('class', 'total-line')
        .attr('fill', 'none').attr('stroke', '#1d1d1f').attr('stroke-width', 2)
        .style('pointer-events', 'none').attr('d', line);

      // "34,033 → 39,505 (+16%)" at the ends of the chosen range
      const range = c.band && c.band[0] < c.band[1] ? c.band : [first, last];
      const t0 = totals.find(d => d.year === range[0]);
      const t1 = totals.find(d => d.year === range[1]);
      const change = (t1.total - t0.total) / t0.total;
      const endpoints = [
        { d: t0, text: `${fmtComma(t0.total)} in ${t0.year}`, anchor: 'start' },
        { d: t1, text: `${fmtComma(t1.total)} in ${t1.year} (${change >= 0 ? '+' : '−'}${d3.format('.0%')(Math.abs(change))})`, anchor: 'end' },
      ];
      const ep = vis.annotationsG.selectAll('.total-point').data(endpoints).join('g').attr('class', 'total-point');
      ep.selectAll('*').remove();
      ep.append('circle').attr('cx', p => x(p.d.year)).attr('cy', p => y(p.d.total)).attr('r', 5)
        .attr('fill', '#1d1d1f').attr('stroke', '#ffffff').attr('stroke-width', 2);
      ep.append('text').attr('class', 'total-label')
        .attr('x', p => x(p.d.year) + (p.d.year === first ? 0 : p.d.year === last ? 0 : p.anchor === 'start' ? -6 : 6))
        .attr('y', p => y(p.d.total) - 14)
        .attr('text-anchor', p => (p.d.year === first ? 'start' : p.d.year === last ? 'end' : 'middle'))
        .text(p => p.text);

      // Name each layer at the right edge when it is thick enough to hold a label
      const lastRow = series.map(s => {
        const p = s[s.length - 1];
        return { key: s.key, y: (y(p[0]) + y(p[1])) / 2, h: y(p[0]) - y(p[1]) };
      }).filter(d => d.h >= c.minLabelPx || d.key === c.highlight);
      vis.annotationsG.selectAll('.area-end-label').data(lastRow, d => d.key).join('text')
        .attr('class', 'area-end-label')
        .attr('x', vis.innerWidth + 10).attr('y', d => d.y).attr('dy', '0.35em')
        .style('fill', d => c.colorOf(d.key))
        .attr('opacity', d => (faded(d.key) ? 0.4 : 1))
        .text(d => c.labelOf(d.key));

      drawYearBand(vis, x, c.band, first, last);
      // Keep the total labels and layer names readable above the grey wash
      vis.annotationsG.selectAll('.total-point, .area-end-label').raise();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TrendLinesChart – one line per category, named at its end
  // with its change over the chosen years ("Cyclists +51%")
  // data: [{ year, [key]: value, … }]; series: [{ key, label, color }]
  // ═══════════════════════════════════════════════════════════════
  class TrendLinesChart extends Vis.BaseChart {
    constructor(parentElement, data, config = {}) {
      super(parentElement, data, Object.assign({
        series: [],
        highlight: null,
        band: null,
        breaks: [],              // [{ year, lines: ['…', '…'] }]
        onClick: null,
        yLabel: 'Hospitalised per year',
        height: 500,
      }, config, {
        margin: Object.assign({ top: 64, right: 220, bottom: 48, left: 72 }, config.margin || {}),
      }));
    }

    wrangleData(newData) {
      if (newData) this.rawData = newData;
      this.displayData = [...this.rawData].sort((a, b) => a.year - b.year);
      this.renderVis();
    }

    update(opts) { Object.assign(this.config, opts); this.renderVis(); }

    renderVis() {
      const vis = this;
      const c = vis.config;
      const data = vis.displayData;
      const first = data[0].year, last = data[data.length - 1].year;
      const x = d3.scaleLinear().domain([first, last]).range([0, vis.innerWidth]);
      const yMax = d3.max(data, d => d3.max(c.series, s => d[s.key]));
      const y = d3.scaleLinear().domain([0, yMax * 1.08]).nice().range([vis.innerHeight, 0]);

      vis.gridG.call(d3.axisLeft(y).ticks(6).tickSize(-vis.innerWidth).tickFormat(''))
        .call(g => g.select('.domain').remove())
        .selectAll('line').attr('stroke', 'rgba(0,0,0,0.06)').attr('stroke-dasharray', '2 4');
      vis.xAxisG.attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(x).ticks(data.length).tickFormat(d3.format('d')));
      vis.yAxisG.call(d3.axisLeft(y).ticks(6).tickFormat(fmtK));
      vis.yAxisG.selectAll('.axis-label').data([c.yLabel]).join('text').attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)').attr('x', -vis.innerHeight / 2).attr('y', -54)
        .attr('text-anchor', 'middle').text(d => d);

      // Counting changes, in plain words, so a dip is not mistaken for a safety gain
      const br = vis.annotationsG.selectAll('.break-group').data(c.breaks).join('g').attr('class', 'break-group');
      br.selectAll('*').remove();
      br.append('line').attr('x1', b => x(b.year)).attr('x2', b => x(b.year))
        .attr('y1', -34).attr('y2', vis.innerHeight)
        .attr('stroke', '#94a3b8').attr('stroke-dasharray', '3 3');
      br.append('text').attr('class', 'break-label').attr('x', b => x(b.year) + 5).attr('y', -40)
        .each(function (b) {
          d3.select(this).selectAll('tspan').data(b.lines).join('tspan')
            .attr('x', x(b.year) + 5).attr('dy', (l, i) => (i ? 14 : 0)).text(l => l);
        });

      // Change over the chosen years (or the whole period)
      const range = c.band && c.band[0] < c.band[1] ? c.band : [first, last];
      const r0 = data.find(d => d.year === range[0]);
      const r1 = data.find(d => d.year === range[1]);
      const changeOf = s => (r0[s.key] ? (r1[s.key] - r0[s.key]) / r0[s.key] : 0);
      const fmtChange = v => `${v >= 0 ? '+' : '−'}${d3.format('.0%')(Math.abs(v))}`;

      const line = key => d3.line().x(d => x(d.year)).y(d => y(d[key])).curve(d3.curveMonotoneX);
      const paths = vis.plotG.selectAll('.trend-line').data(c.series, s => s.key).join('path')
        .attr('class', 'trend-line').attr('fill', 'none').attr('stroke', s => s.color)
        .attr('stroke-linecap', 'round').style('pointer-events', 'none')
        .attr('d', s => line(s.key)(data));

      // End labels, pushed apart so none overlap
      const ends = dodge(c.series.map(s => ({
        s, y0: y(data[data.length - 1][s.key]), y: y(data[data.length - 1][s.key]),
      })), 17, 0, vis.innerHeight);
      const labels = vis.annotationsG.selectAll('.trend-end').data(ends, d => d.s.key).join('g')
        .attr('class', 'trend-end');
      labels.selectAll('*').remove();
      labels.append('path')
        .attr('d', d => `M${vis.innerWidth + 3},${d.y0} L${vis.innerWidth + 12},${d.y}`)
        .attr('stroke', d => d.s.color).attr('fill', 'none').attr('stroke-width', 1);
      const lt = labels.append('text').attr('class', 'trend-end-label')
        .attr('x', vis.innerWidth + 15).attr('y', d => d.y).attr('dy', '0.35em')
        .style('fill', d => d.s.color)
        .style('cursor', c.onClick ? 'pointer' : null)
        .on('click', (event, d) => c.onClick && c.onClick(d.s.key));
      lt.append('tspan').text(d => d.s.label);
      lt.append('tspan').attr('class', 'trend-end-change').attr('dx', 6)
        .text(d => fmtChange(changeOf(d.s)));

      function paint(activeKey) {
        paths.attr('stroke-width', s => (s.key === activeKey ? 4 : 2.4))
          .attr('opacity', s => (activeKey && s.key !== activeKey ? 0.14 : 1));
        if (activeKey) paths.filter(s => s.key === activeKey).raise();
        labels.attr('opacity', d => (activeKey && d.s.key !== activeKey ? 0.3 : 1))
          .style('font-weight', d => (d.s.key === activeKey ? 700 : null));
      }
      paint(c.highlight);

      // Hover: the nearest line lights up and the tooltip lists that year
      const focus = vis.annotationsG.selectAll('.trend-focus').data([0]).join('g')
        .attr('class', 'trend-focus').style('pointer-events', 'none').style('display', 'none');
      focus.selectAll('*').remove();
      const guide = focus.append('line').attr('y1', 0).attr('y2', vis.innerHeight)
        .attr('stroke', '#475569').attr('stroke-dasharray', '3 3');
      const dot = focus.append('circle').attr('r', 6).attr('stroke', '#ffffff').attr('stroke-width', 2);
      let hoverKey = null;

      vis.plotG.selectAll('.trend-overlay').data([0]).join('rect').attr('class', 'trend-overlay')
        .attr('width', vis.innerWidth).attr('height', vis.innerHeight).attr('fill', 'transparent')
        .style('cursor', c.onClick ? 'pointer' : 'crosshair')
        .on('pointermove', function (event) {
          const [mx, my] = d3.pointer(event, this);
          const yr = Math.max(first, Math.min(last, Math.round(x.invert(mx))));
          const row = data.find(d => d.year === yr);
          const near = d3.least(c.series, s => Math.abs(y(row[s.key]) - my));
          hoverKey = near.key;
          paint(c.highlight || hoverKey);
          focus.style('display', null);
          guide.attr('x1', x(yr)).attr('x2', x(yr));
          dot.attr('cx', x(yr)).attr('cy', y(row[near.key])).attr('fill', near.color);
          const list = [...c.series].sort((a, b) => row[b.key] - row[a.key]).map(s =>
            [`<span class="tip-swatch" style="background:${s.color}"></span>${s.label}`, fmtComma(row[s.key]), s.key === near.key]);
          vis.tooltip.classed('visible', true).html(tipHtml(`${yr}${c.onClick ? ' · click to select a line' : ''}`, list));
          placeTip(vis.tooltip, event);
        })
        .on('pointerleave', () => {
          hoverKey = null;
          paint(c.highlight);
          focus.style('display', 'none');
          vis.tooltip.classed('visible', false);
        })
        .on('click', () => { if (c.onClick && hoverKey) c.onClick(hoverKey); });

      drawYearBand(vis, x, c.band, first, last);
      vis.annotationsG.select('.year-band').lower();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PairedBarChart – two bars per category, e.g. share of all hospital
  // cases (grey) next to share of all deaths (colour). When the coloured
  // bar is much longer, that group dies far more often than its size.
  // data: [{ key, label, a, b }] with a and b as fractions (0–1)
  // ═══════════════════════════════════════════════════════════════
  class PairedBarChart extends Vis.BaseChart {
    constructor(parentElement, data, config = {}) {
      super(parentElement, data, Object.assign({
        labelKey: 'label',
        autoFitLabels: true,
        aLabel: 'Share of all hospital cases',
        bLabel: 'Share of all deaths in hospital',
        aColor: '#cbd5e1',
        bColorOf: () => '#1e3a8a',
        highlight: null,
        onClick: null,
        rowHeight: 60,
        tooltip: null,
      }, config, {
        margin: Object.assign({ top: 90, right: 170, bottom: 44, left: 170 }, config.margin || {}),
      }));
    }

    wrangleData(newData) {
      if (newData) this.rawData = newData;
      this.displayData = [...this.rawData].sort((a, b) => b.a - a.a);
      this.renderVis();
    }

    setHighlight(key) { this.config.highlight = key && key !== 'all' ? key : null; this.renderVis(); }

    renderVis() {
      const vis = this;
      const c = vis.config;
      const rows = vis.displayData;
      setViewHeight(vis, c.margin.top + c.margin.bottom + rows.length * c.rowHeight);
      vis.svg.selectAll('.empty-msg').remove();
      if (!rows.length) {
        [vis.plotG, vis.gridG, vis.xAxisG, vis.yAxisG, vis.annotationsG, vis.legendG].forEach(g => g.selectAll('*').remove());
        vis.svg.append('text').attr('class', 'empty-msg').attr('x', c.width / 2).attr('y', 120)
          .attr('text-anchor', 'middle').text('No death records for these years');
        return;
      }

      const x = d3.scaleLinear().domain([0, d3.max(rows, d => Math.max(d.a, d.b)) * 1.1]).nice()
        .range([0, vis.innerWidth]);
      const y = d3.scaleBand().domain(rows.map(d => d.label)).range([0, vis.innerHeight]).padding(0.22);
      const half = y.bandwidth() / 2;
      const faded = d => c.highlight && keyOf(d) !== c.highlight;
      const pct = d3.format('.0%');

      vis.gridG.call(d3.axisBottom(x).ticks(5).tickSize(vis.innerHeight).tickFormat(''))
        .call(g => g.select('.domain').remove())
        .selectAll('line').attr('stroke', 'rgba(0,0,0,0.06)').attr('stroke-dasharray', '2 4');
      vis.xAxisG.attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(pct));
      vis.yAxisG.classed('axis-category', true).call(d3.axisLeft(y).tickSize(0).tickPadding(12))
        .call(g => g.select('.domain').remove());
      vis.yAxisG.selectAll('.tick text')
        .style('opacity', label => (faded(rows.find(r => r.label === label)) ? 0.45 : 1));

      const g = vis.plotG.selectAll('.pair-row').data(rows, keyOf).join('g').attr('class', 'pair-row')
        .attr('transform', d => `translate(0,${y(d.label)})`)
        .attr('opacity', d => (faded(d) ? 0.25 : 1));
      g.selectAll('*').remove();
      g.append('rect').attr('y', 1).attr('height', half - 3).attr('rx', 3).attr('fill', c.aColor)
        .attr('width', d => x(d.a));
      g.append('rect').attr('y', half + 1).attr('height', half - 3).attr('rx', 3).attr('fill', d => c.bColorOf(d))
        .attr('width', d => x(d.b));
      g.append('text').attr('class', 'pair-value pair-value-a').attr('x', d => x(d.a) + 6).attr('y', half / 2 + 1)
        .attr('dy', '0.35em').text(d => pct(d.a));
      g.append('text').attr('class', 'pair-value pair-value-b').attr('x', d => x(d.b) + 6).attr('y', half * 1.5)
        .attr('dy', '0.35em').style('fill', d => c.bColorOf(d)).text(d => pct(d.b));

      // Right-hand column: how many times more (or less) deadly than its size suggests
      const ratioText = d => (d.a ? `${d3.format('.1f')(d.b / d.a)}×` : '');
      // One accent only: groups that die far more often than their size suggests
      const ratioColor = d => (d.b / d.a >= 1.25 ? '#D55E00' : '#55555a');
      g.append('text').attr('class', 'pair-ratio').attr('x', vis.innerWidth + 70).attr('y', half)
        .attr('dy', '0.35em').attr('text-anchor', 'middle').style('fill', ratioColor).text(ratioText);

      vis.annotationsG.selectAll('.pair-ratio-head').data([0]).join('text').attr('class', 'pair-ratio-head')
        .attr('x', vis.innerWidth + 70).attr('y', -14).attr('text-anchor', 'middle')
        .selectAll('tspan').data(['Deaths ÷ cases', '(1× = as expected)']).join('tspan')
        .attr('x', vis.innerWidth + 70).attr('dy', (l, i) => (i ? 15 : -8)).text(l => l);

      const hits = g.append('rect').attr('class', 'pair-hit')
        .attr('x', -c.margin.left).attr('width', c.width - 10).attr('y', -4).attr('height', y.step())
        .attr('fill', 'transparent').style('cursor', c.onClick ? 'pointer' : 'default')
        .attr('tabindex', c.onClick ? 0 : null).attr('role', c.onClick ? 'button' : null)
        .attr('aria-label', d => `${d.label}: ${pct(d.a)} of cases, ${pct(d.b)} of deaths`)
        .on('mouseenter', (event, d) => {
          if (!c.tooltip) return;
          const [title, tipRows] = c.tooltip(d);
          vis.tooltip.classed('visible', true).html(tipHtml(title, tipRows));
          placeTip(vis.tooltip, event);
        })
        .on('mousemove', event => placeTip(vis.tooltip, event))
        .on('mouseleave', () => vis.tooltip.classed('visible', false));
      if (c.onClick) {
        hits.on('click', (event, d) => c.onClick(d));
        keyClick(hits, (event, d) => c.onClick(d));
      }

      // Legend (top-left)
      vis.legendG.attr('transform', `translate(${c.margin.left}, 18)`).selectAll('*').remove();
      [[c.aLabel, c.aColor], [c.bLabel, c.bColorOf({})]].forEach(([label, color], i) => {
        const item = vis.legendG.append('g').attr('transform', `translate(0, ${i * 22})`);
        item.append('rect').attr('width', 22).attr('height', 11).attr('y', -1).attr('rx', 2).attr('fill', color);
        item.append('text').attr('x', 30).attr('y', 9).attr('class', 'pair-legend-text').text(label);
      });
    }
  }

  Object.assign(Vis, { RankedBarChart, StackedAreaChart, TrendLinesChart, PairedBarChart, tipHtml, placeTip });
})(typeof window !== 'undefined' ? window : this);
