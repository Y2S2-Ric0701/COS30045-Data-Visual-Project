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

  /** Year-by-year table for the line and area charts (band = chosen years) */
  function yearTable(data, cols, band, withTotal, what) {
    const rows = data.filter(d => !band || (d.year >= band[0] && d.year <= band[1]));
    const total = d => d3.sum(cols, s => +d[s.key] || 0);
    const first = rows[0], last = rows[rows.length - 1];
    const range = first && last ? `${first.year}–${last.year}` : '';
    return {
      columns: ['Year', ...cols.map(s => s.label), ...(withTotal ? ['Total'] : [])],
      rows: rows.map(d => [d.year, ...cols.map(s => fmtComma(d[s.key] ?? 0)), ...(withTotal ? [fmtComma(total(d))] : [])]),
      summary: first ? `${what}, ${range}. ${cols.map(s => `${s.label}: ${fmtComma(first[s.key] ?? 0)} to ${fmtComma(last[s.key] ?? 0)}`).join('; ')}.` : null,
    };
  }

  // ── Shared helpers ───────────────────────────────────────────
  function tipHtml(title, rows) {
    return `<div class="tooltip-title">${title}</div>` + rows.map(([k, v, accent]) =>
      `<div class="tooltip-row"><span>${k}</span> <span class="${accent ? 'tooltip-accent' : 'tooltip-val'}">${v}</span></div>`
    ).join('');
  }

  function placeTip(tooltip, event) {
    const node = tooltip.node();
    const w = node ? node.offsetWidth : 0;
    const h = node ? node.offsetHeight : 0;
    const left = (event.clientX + 16 + w > window.innerWidth - 8) ? event.pageX - 16 - w : event.pageX + 14;
    // Flip above the pointer when the tooltip would run off the bottom of the screen
    const top = (event.clientY - 28 + h > window.innerHeight - 8)
      ? Math.max(window.scrollY + 8, event.pageY - h - 14)
      : event.pageY - 28;
    tooltip.style('left', `${Math.max(8, left)}px`).style('top', `${top}px`);
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
        .style('fill', 'var(--c-surface)').attr('opacity', 0.72);
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

  /**
   * Phone layout: a two-column key under the chart, used instead of the
   * labels at the right edge (there is no room for them on a phone).
   * items: [{ key, label, color, extra? }]; returns the height it needs.
   */
  const LEGEND_ROW = 24;
  function legendHeight(n) { return n ? Math.ceil(n / 2) * LEGEND_ROW + 8 : 0; }
  function drawCompactLegend(vis, items, { onClick, faded, active } = {}) {
    const c = vis.config;
    const top = vis.innerHeight + 40;
    const colW = vis.innerWidth / 2;
    const g = vis.annotationsG.selectAll('.compact-key').data([0]).join('g').attr('class', 'compact-key');
    g.selectAll('*').remove();
    items.forEach((it, i) => {
      const row = g.append('g')
        .attr('class', 'compact-key-item')
        .attr('transform', `translate(${(i % 2) * colW},${top + Math.floor(i / 2) * LEGEND_ROW})`)
        .attr('opacity', faded && faded(it.key) ? 0.4 : 1)
        .style('cursor', onClick ? 'pointer' : null)
        .attr('tabindex', onClick ? 0 : null)
        .attr('role', onClick ? 'button' : null)
        .attr('aria-label', `${it.label}${it.extra ? ` ${it.extra}` : ''}`);
      row.append('rect').attr('width', colW - 4).attr('height', LEGEND_ROW).attr('y', -LEGEND_ROW / 2).attr('fill', 'transparent');
      row.append('rect').attr('width', 12).attr('height', 12).attr('y', -6).attr('rx', 2).attr('fill', it.color);
      const t = row.append('text').attr('class', 'compact-key-text').attr('x', 18).attr('dy', '0.35em')
        .style('font-weight', active === it.key ? 700 : null);
      t.append('tspan').text(it.label);
      if (it.extra) t.append('tspan').attr('class', 'trend-end-change').attr('dx', 5).style('fill', it.color).text(it.extra);
      // Shrink an entry that would run into the next column
      const room = colW - 26, w = t.node().getComputedTextLength();
      if (w > room) t.style('font-size', `${Math.max(10, 13 * room / w).toFixed(1)}px`);
      if (onClick) {
        row.on('click', () => onClick(it.key));
        keyClick(row, () => onClick(it.key));
      }
    });
  }

  /**
   * On-chart note with a short leader line (plan §6.8).
   * at: [x, y] point on the data; lines: text lines; side: 'above' | 'below'
   */
  function drawNote(g, at, lines, { side = 'above', dx = 0, len = 34, anchor = 'middle', color = 'var(--c-ink)' } = {}) {
    const [px, py] = at;
    const ty = side === 'above' ? py - len : py + len;
    const note = g.append('g').attr('class', 'chart-annotation').style('pointer-events', 'none');
    note.append('line').attr('x1', px).attr('y1', py + (side === 'above' ? -7 : 7))
      .attr('x2', px + dx).attr('y2', ty + (side === 'above' ? 4 : -4))
      .style('stroke', color).attr('stroke-width', 1);
    const t = note.append('text').attr('class', 'note-label').attr('text-anchor', anchor).style('fill', color);
    const first = side === 'above' ? ty - (lines.length - 1) * 14 : ty + 10;
    lines.forEach((l, i) => t.append('tspan').attr('x', px + dx).attr('y', first + i * 14)
      .style('font-weight', i === 0 ? 700 : null).text(l));
    return note;
  }

  /** Year axis + value axis for the time charts; fewer ticks on a phone */
  function drawTimeAxes(vis, x, y, nYears, yLabel) {
    const compact = vis.compact;
    // One tick per year needs ~40px per year; otherwise let d3 pick fewer
    const yearTicks = vis.innerWidth / nYears >= 40 ? nYears : Math.max(4, Math.floor(vis.innerWidth / 70));
    vis.gridG.call(d3.axisLeft(y).ticks(compact ? 5 : 6).tickSize(-vis.innerWidth).tickFormat(''))
      .call(g => g.select('.domain').remove())
      .selectAll('line').style('stroke', 'var(--c-grid)').attr('stroke-dasharray', '2 4');
    vis.xAxisG.attr('transform', `translate(0,${vis.innerHeight})`)
      .call(d3.axisBottom(x).ticks(yearTicks).tickFormat(d3.format('d')));
    vis.yAxisG.call(d3.axisLeft(y).ticks(compact ? 5 : 6).tickFormat(fmtK));
    // On a phone the axis title goes above the axis instead of rotated beside it
    vis.yAxisG.selectAll('.axis-label').data([yLabel]).join('text').attr('class', 'axis-label')
      .attr('transform', compact ? null : 'rotate(-90)')
      .attr('x', compact ? -vis.config.margin.left + 2 : -vis.innerHeight / 2)
      .attr('y', compact ? -vis.config.margin.top + 14 : -54)
      .style('text-anchor', compact ? 'start' : 'middle').text(d => d);
  }

  /** Split an SVG <text> into word-wrapped <tspan> lines no wider than maxW; returns the line count */
  function wrapText(text, maxW, lineH = 16) {
    let most = 1;
    text.each(function () {
      const el = d3.select(this);
      const words = String(el.text()).split(/\s+/).filter(Boolean);
      const x = el.attr('x');
      el.text(null);
      let line = [];
      let lines = 1;
      let ts = el.append('tspan').attr('x', x).attr('dy', 0);
      words.forEach(w => {
        line.push(w);
        ts.text(line.join(' '));
        if (line.length > 1 && ts.node().getComputedTextLength() > maxW) {
          line.pop();
          ts.text(line.join(' '));
          line = [w];
          ts = el.append('tspan').attr('x', x).attr('dy', lineH).text(w);
          lines += 1;
        }
      });
      most = Math.max(most, lines);
    });
    return most;
  }

  /** Phones: keep the first and last x-axis tick labels inside the chart's edges */
  function pinEdgeTicks(axisG, innerW, roomL, roomR) {
    axisG.selectAll('.tick').each(function () {
      const m = /translate\(([-\d.]+)/.exec(this.getAttribute('transform') || '');
      const tx = m ? +m[1] : 0;
      const t = d3.select(this).select('text');
      if (!t.node()) return;
      const half = t.node().getComputedTextLength() / 2;
      t.attr('text-anchor', tx - half < -roomL ? 'start' : tx + half > innerW + roomR ? 'end' : 'middle');
    });
  }

  /** Text layer drawn above the zero and reference lines, so a line never
   *  runs through a name or value (their halo hides it). Clicks pass
   *  through to the row hit areas underneath. */
  function labelLayer(vis) {
    if (!vis.labelG || vis.labelG.node().parentNode !== vis.g.node()) {
      vis.labelG = vis.g.insert('g', '.x-axis').attr('class', 'label-layer').style('pointer-events', 'none');
    }
    return vis.labelG;
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
        rest: null,              // { colorOf: d => colour }: fill from the bar's end to xMax (a split bar, e.g. men | women)
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

    // Phone layout: names sit above the bars, values at the right
    compactMargin() { return { left: 6, right: 10 }; }

    renderVis() {
      const vis = this;
      const c = vis.config;
      const rows = vis.displayData;
      const compact = vis.compact;
      // Phones: two reference labels may need a second row above the chart
      if (vis._baseTop == null) vis._baseTop = c.margin.top;
      c.margin.top = vis._baseTop + (compact && c.refLines.length > 1 ? 20 : 0);
      vis.g.attr('transform', `translate(${c.margin.left},${c.margin.top})`);
      setViewHeight(vis, c.margin.top + c.margin.bottom + Math.max(1, rows.length) * (compact ? 62 : c.rowHeight));
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
      // Phones, with negative values (e.g. % change): names sit above the
      // bars from the left edge, so push the zero line right of the longest
      // name. Done by widening the negative side of the same scale, so bar
      // lengths stay comparable on both sides of zero.
      if (compact && lo < 0 && c.xMin == null) {
        const probe = labelLayer(vis).append('text').attr('class', 'rbar-name');
        const nameW = d3.max(rows, d => probe.text(d.label).node().getComputedTextLength()) || 0;
        probe.remove();
        const [d0, d1] = x.domain();
        const z = Math.min(vis.innerWidth * 0.6, nameW + 12);       // where zero should sit, px from the left
        if (z > x(0) && d1 > 0) x.domain([-d1 * z / (vis.innerWidth - z), d1]);
        if (x.domain()[0] > d0) x.domain([d0, d1]);                 // never cut off a bar
      }
      const y = d3.scaleBand().domain(rows.map(d => d.label)).range([0, vis.innerHeight]).padding(compact ? 0 : 0.28);
      // Phones: name on its own line, a clear gap, then the bar
      const barY = d => (compact ? y(d.label) + 26 : y(d.label));
      const barH = compact ? y.step() - 36 : y.bandwidth();
      const nameY = d => y(d.label) + 13;
      const ticks = compact ? 4 : 6;
      const grad = Vis.barGradient(d3.extent(vals));
      const fill = d => (c.colorOf ? c.colorOf(d) : grad(d.value));
      const faded = d => c.highlight && keyOf(d) !== c.highlight;

      vis.gridG.call(d3.axisBottom(x).ticks(ticks).tickSize(vis.innerHeight).tickFormat(''))
        .call(g => g.select('.domain').remove())
        .selectAll('line').style('stroke', 'var(--c-grid)').attr('stroke-dasharray', '2 4');

      if (compact) {
        vis.yAxisG.selectAll('*').remove();
        labelLayer(vis).selectAll('.rbar-name').data(rows, keyOf).join('text')
          .attr('class', 'rbar-name').attr('x', 0).attr('y', nameY).attr('dy', '0.35em')
          .attr('opacity', d => (faded(d) ? 0.45 : 1))
          .style('font-weight', d => (c.highlight && keyOf(d) === c.highlight ? 700 : null))
          .text(d => d.label);
      } else {
        labelLayer(vis).selectAll('.rbar-name').remove();
        vis.yAxisG.classed('axis-category', true)
          .call(d3.axisLeft(y).tickSize(0).tickPadding(12))
          .call(g => g.select('.domain').remove());
        vis.yAxisG.selectAll('.tick text')
          .style('opacity', label => (faded(rows.find(r => r.label === label)) ? 0.45 : 1))
          .style('font-weight', label => (c.highlight && keyOf(rows.find(r => r.label === label)) === c.highlight ? 700 : null));
      }

      vis.xAxisG.attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(x).ticks(ticks).tickFormat(c.tickFormat));
      if (compact) pinEdgeTicks(vis.xAxisG, vis.innerWidth, c.margin.left, c.margin.right);
      const axisLabel = vis.xAxisG.selectAll('.axis-label').data([c.xLabel]).join('text')
        .attr('class', 'axis-label').attr('x', vis.innerWidth / 2).attr('y', 44)
        .attr('text-anchor', 'middle').text(d => d);
      // A long title wraps onto a second line instead of running off the screen
      const titleLines = wrapText(axisLabel, c.width - 16);
      if (titleLines > 1) vis.svg.attr('viewBox', `0 0 ${c.width} ${c.height + 16 * (titleLines - 1)}`);

      // Zero line when some values are negative (e.g. % change)
      vis.annotationsG.selectAll('.zero-line').data(lo < 0 ? [0] : []).join('line')
        .attr('class', 'zero-line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', -6).attr('y2', vis.innerHeight)
        .style('stroke', 'var(--c-ink)').attr('stroke-width', 1);

      // Reference lines (e.g. "all road users: 65%")
      const refs = vis.annotationsG.selectAll('.ref-line').data(c.refLines).join('g').attr('class', 'ref-line');
      refs.selectAll('*').remove();
      refs.append('line').attr('x1', d => x(d.value)).attr('x2', d => x(d.value))
        .attr('y1', -8).attr('y2', vis.innerHeight)
        .style('stroke', 'var(--c-ink)').attr('stroke-dasharray', '4 3').attr('stroke-width', 1.2);
      refs.append('text').attr('class', 'ref-label')
        .attr('x', d => x(d.value) + (d.anchor === 'start' ? 4 : d.anchor === 'end' ? -4 : 0)).attr('y', -14)
        .attr('text-anchor', d => d.anchor || 'middle').text(d => d.label);
      // Phones: a label that would run off the edge flips to the other side of
      // its line; one that would then overlap another moves up a row
      if (compact) {
        const minX = -c.margin.left + 2;
        const maxX = vis.innerWidth + c.margin.right - 2;
        const placed = [];
        refs.select('text').each(function (d) {
          const el = d3.select(this);
          let b = this.getBBox();
          if (!b.width) return;
          if (b.x + b.width > maxX) { el.attr('text-anchor', 'end').attr('x', x(d.value) - 4); b = this.getBBox(); }
          if (b.x < minX) { el.attr('text-anchor', 'start').attr('x', x(d.value) + 4); b = this.getBBox(); }
          if (b.x + b.width > maxX) { el.attr('text-anchor', 'end').attr('x', maxX); b = this.getBBox(); }
          let row = 0;
          while (placed.some(p => p.row === row && b.x < p.r + 8 && b.x + b.width > p.l - 8)) row += 1;
          placed.push({ row, l: b.x, r: b.x + b.width });
          el.attr('y', -14 - row * 20);
          d3.select(this.parentNode).select('line').attr('y1', -8 - row * 20);
        });
      }

      const t = vis.svg.transition().duration(c.duration).ease(c.ease);
      vis.plotG.selectAll('.rbar').data(valid, keyOf).join(
        enter => enter.append('rect').attr('class', 'rbar').attr('rx', 4)
          .attr('x', x(0)).attr('width', 0)
          .attr('y', barY).attr('height', barH),
        update => update,
        exit => exit.remove())
        .attr('fill', fill)
        .transition(t)
        .attr('y', barY).attr('height', barH)
        .attr('x', d => x(Math.min(0, d.value))).attr('width', d => Math.abs(x(d.value) - x(0)))
        .attr('opacity', d => (faded(d) ? 0.2 : 1));

      // Split bars: the rest of the 100% (e.g. women, when the bar is men)
      vis.plotG.selectAll('.rbar-rest').data(c.rest ? valid : [], keyOf).join(
        enter => enter.insert('rect', '.rbar').attr('class', 'rbar-rest').attr('rx', 4)
          .attr('x', x(c.xMax ?? hi)).attr('width', 0).attr('y', barY).attr('height', barH),
        update => update,
        exit => exit.remove())
        .attr('fill', d => c.rest.colorOf(d))
        .style('pointer-events', 'none')
        .transition(t)
        .attr('y', barY).attr('height', barH)
        .attr('x', d => x(d.value)).attr('width', d => Math.max(0, x(c.xMax ?? hi) - x(d.value)))
        .attr('opacity', d => (faded(d) ? 0.2 : 1));

      labelLayer(vis).selectAll('.rbar-label').data(rows, keyOf).join('text')
        .attr('class', 'bar-label rbar-label')
        .attr('y', d => (compact ? nameY(d) : y(d.label) + y.bandwidth() / 2)).attr('dy', '0.35em')
        .attr('x', d => (compact ? vis.innerWidth
          : c.rest ? x(c.xMax ?? hi) + 8
            : d.value == null ? x(0) + 8 : d.value >= 0 ? x(d.value) + 8 : x(d.value) - 8))
        .attr('text-anchor', d => (compact || (d.value != null && d.value < 0) ? 'end' : 'start'))
        .style('fill', d => (d.value == null ? 'var(--c-ink-3)' : (c.labelColor ? c.labelColor(d) : 'var(--c-ink)')))
        .attr('opacity', d => (faded(d) ? 0.45 : 1))
        .text(d => (d.value == null ? c.nullText : c.valueText(d)));

      // Full-width hit area per row: hover for details, click to select
      const hits = vis.plotG.selectAll('.rbar-hit').data(rows, keyOf).join('rect')
        .attr('class', 'rbar-hit')
        .attr('x', -c.margin.left).attr('width', vis.innerWidth + c.margin.left + c.margin.right - 10)
        .attr('y', d => (compact ? y(d.label) : y(d.label) - (y.step() * y.paddingInner()) / 2)).attr('height', y.step())
        .attr('fill', 'transparent')
        .style('cursor', c.onClick ? 'pointer' : 'default')
        .attr('tabindex', c.onClick ? 0 : null)
        .attr('role', c.onClick ? 'button' : null)
        .attr('aria-label', d => `${d.label}: ${d.value == null ? c.nullText : c.valueText(d)}`)
        .on('mouseenter', function (event, d) {
          vis.plotG.selectAll('.rbar, .rbar-rest').filter(b => keyOf(b) === keyOf(d)).attr('filter', 'brightness(0.9)');
          vis.emitHover(keyOf(d));
          if (!c.tooltip) return;
          const [title, tipRows] = c.tooltip(d);
          vis.tooltip.classed('visible', true).html(tipHtml(title, tipRows));
          placeTip(vis.tooltip, event);
        })
        .on('mousemove', event => placeTip(vis.tooltip, event))
        .on('mouseleave', function () {
          vis.plotG.selectAll('.rbar, .rbar-rest').attr('filter', null);
          vis.emitHover(null);
          vis.tooltip.classed('visible', false);
        });
      if (c.onClick) {
        hits.on('click', (event, d) => c.onClick(d));
        keyClick(hits, (event, d) => c.onClick(d));
      }
    }

    /** Linked hover: dim every bar except `key` (falls back to the filter's choice) */
    preview(key) {
      const vis = this;
      const k = key || vis.config.highlight;
      const faded = d => k && keyOf(d) !== k;
      vis.plotG.selectAll('.rbar, .rbar-rest').interrupt().attr('opacity', d => (faded(d) ? 0.2 : 1));
      labelLayer(vis).selectAll('.rbar-label, .rbar-name').attr('opacity', d => (faded(d) ? 0.45 : 1));
      vis.yAxisG.selectAll('.tick text')
        .style('opacity', label => (faded(vis.displayData.find(r => r.label === label) || {}) ? 0.45 : 1));
    }

    /** Numbers for "View as table" (js/data-table.js) */
    tableData() {
      const c = this.config;
      const rows = this.displayData.map(d => [d.label, d.value == null ? c.nullText : c.valueText(d)]);
      return {
        columns: [c.tableLabel || 'Category', c.xLabel || 'Value'],
        rows,
        summary: c.ariaLabel ? null : `${c.xLabel || 'Values'}: ${rows.map(r => `${r[0]} ${r[1]}`).join('; ')}.`,
      };
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
        notes: [],               // [{ year, lines: ['…'], side, dx }] pinned to the total line
        onBrush: null,           // [y0, y1] => … ; adds a drag strip over the year axis
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

    // Phone layout: no names at the right edge; a key goes under the chart
    compactMargin() { return { left: 44, right: 14, top: 40, bottom: 44 + legendHeight(this.config.keys.length) }; }
    compactHeight() { return 300 + this.compactMargin().top + this.compactMargin().bottom; }

    /** Linked hover: dim every layer except `key` */
    preview(key) {
      const k = key || this.config.highlight;
      this.plotG.selectAll('.area-layer').interrupt().attr('opacity', s => (k && s.key !== k ? 0.18 : 0.92));
      this.annotationsG.selectAll('.area-end-label').attr('opacity', d => (k && d.key !== k ? 0.4 : 1));
    }

    /** Numbers for "View as table": one row per year in the chosen range */
    tableData() {
      const c = this.config;
      return yearTable(this.displayData, c.keys.map(k => ({ key: k, label: c.labelOf(k) })), c.band, true,
        c.yLabel);
    }

    renderVis() {
      const vis = this;
      const c = vis.config;
      const compact = vis.compact;
      const data = vis.displayData;
      const first = data[0].year, last = data[data.length - 1].year;
      const x = d3.scaleLinear().domain([first, last]).range([0, vis.innerWidth]);
      const series = d3.stack().keys(c.keys)(data);
      const totals = data.map(d => ({ year: d.year, total: d3.sum(c.keys, k => d[k]) }));
      // Extra room above the total line when there is a note to write there
      const headroom = c.notes.length ? 1.34 : 1.14;
      const y = d3.scaleLinear().domain([0, d3.max(totals, d => d.total) * headroom]).nice().range([vis.innerHeight, 0]);

      drawTimeAxes(vis, x, y, data.length, c.yLabel);

      const area = d3.area().x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveMonotoneX);
      const faded = k => c.highlight && k !== c.highlight;
      const yearAt = event => Math.round(x.invert(d3.pointer(event, vis.plotG.node())[0]));

      vis.plotG.selectAll('.area-layer').data(series, s => s.key).join('path')
        .attr('class', 'area-layer')
        .attr('fill', s => c.colorOf(s.key)).style('stroke', 'var(--c-surface)').attr('stroke-width', 0.8)
        .style('cursor', c.onClick ? 'pointer' : null)
        .on('pointermove', function (event, s) {
          vis.emitHover(s.key);
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
          vis.emitHover(null);
          vis.tooltip.classed('visible', false);
        })
        .on('click', (event, s) => c.onClick && c.onClick(s.key))
        .transition().duration(c.duration)
        .attr('d', area)
        .attr('opacity', s => (faded(s.key) ? 0.18 : 0.92));

      // Total line on top
      const line = d3.line().x(d => x(d.year)).y(d => y(d.total)).curve(d3.curveMonotoneX);
      vis.plotG.selectAll('.total-line').data([totals]).join('path').attr('class', 'total-line')
        .attr('fill', 'none').style('stroke', 'var(--c-ink)').attr('stroke-width', 2)
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
        .style('fill', 'var(--c-ink)').style('stroke', 'var(--c-surface)').attr('stroke-width', 2);
      // On a wide screen the end label sits in the right margin beside its dot
      // (two lines), so notes on the last years (e.g. the 2020 dip) have
      // clear space above the line
      const inMargin = p => !compact && p.anchor === 'end' && p.d.year === last;
      ep.append('text').attr('class', 'total-label')
        .attr('x', p => (inMargin(p) ? x(p.d.year) + 12
          : x(p.d.year) + (p.d.year === first ? 0 : p.d.year === last ? 0 : p.anchor === 'start' ? -6 : 6)))
        .attr('y', p => y(p.d.total) - (inMargin(p) ? 4 : 14))
        .attr('text-anchor', p => (inMargin(p) ? 'start' : p.d.year === first ? 'start' : p.d.year === last ? 'end' : 'middle'))
        .each(function (p) {
          const el = d3.select(this);
          if (inMargin(p)) {
            el.append('tspan').attr('x', x(p.d.year) + 12).text(`${fmtComma(p.d.total)} in ${p.d.year}`);
            el.append('tspan').attr('x', x(p.d.year) + 12).attr('dy', '1.25em').style('font-weight', 500)
              .text(`${change >= 0 ? '+' : '−'}${d3.format('.0%')(Math.abs(change))} since ${range[0]}`);
          } else {
            el.text(compact ? p.text.replace(/ in (\d{4})/, ' ($1)').replace(') (', ', ') : p.text);
          }
        });

      // Name each layer at the right edge when it is thick enough to hold a label
      const lastRow = compact ? [] : series.map(s => {
        const p = s[s.length - 1];
        return { key: s.key, y: (y(p[0]) + y(p[1])) / 2, h: y(p[0]) - y(p[1]) };
      }).filter(d => d.h >= c.minLabelPx || d.key === c.highlight);
      // Layer names start below the two-line total label in the margin
      if (!compact && range[1] === last) {
        let floor = y(t1.total) + 26;
        [...lastRow].sort((p, q) => p.y - q.y).forEach(d => { if (d.y < floor) d.y = floor; floor = d.y + 18; });
      }
      if (compact) {
        drawCompactLegend(vis, [...c.keys].reverse().map(k => ({ key: k, label: c.labelOf(k), color: c.colorOf(k) })),
          { onClick: c.onClick, faded, active: c.highlight });
      } else {
        vis.annotationsG.selectAll('.compact-key').remove();
      }
      vis.annotationsG.selectAll('.area-end-label').data(lastRow, d => d.key).join('text')
        .attr('class', 'area-end-label')
        .attr('x', vis.innerWidth + 10).attr('y', d => d.y).attr('dy', '0.35em')
        .style('fill', d => c.colorOf(d.key))
        .attr('opacity', d => (faded(d.key) ? 0.4 : 1))
        .text(d => c.labelOf(d.key));

      drawYearBand(vis, x, c.band, first, last);
      // Notes on the total line (e.g. the 2020 COVID-19 dip)
      vis.annotationsG.selectAll('.chart-annotation').remove();
      c.notes.filter(n => n.year >= first && n.year <= last && !(compact && n.wideOnly)).forEach(n => {
        const tot = totals.find(d => d.year === n.year);
        drawNote(vis.annotationsG, [x(n.year), y(tot.total)], compact && n.short ? n.short : n.lines,
          { side: n.side || 'below', dx: n.dx || 0, len: n.len || 40, anchor: n.anchor || 'middle' });
      });
      // Keep the total labels and layer names readable above the grey wash
      vis.annotationsG.selectAll('.total-point, .area-end-label, .chart-annotation').raise();

      // Brush: drag along the year axis to choose the years (plan §6.3).
      // It sits on the axis strip so it never blocks the hover on the layers.
      if (c.onBrush) {
        const top = vis.innerHeight + 2, h = 30;
        const brushG = vis.g.selectAll('.year-brush').data([0]).join('g').attr('class', 'year-brush');
        const brush = d3.brushX().extent([[0, top], [vis.innerWidth, top + h]])
          .on('end', event => {
            if (!event.sourceEvent) return;               // moved by code, not by the reader
            if (!event.selection) { c.onBrush([first, last]); return; }
            const [a, b] = event.selection.map(px => Math.round(x.invert(px)));
            c.onBrush([Math.max(first, Math.min(a, b)), Math.min(last, Math.max(a, b))]);
          });
        brushG.call(brush);
        // selectAll, not select: select() would copy the group's data onto the
        // overlay and break the brush
        brushG.selectAll('.overlay').attr('aria-hidden', 'true');
        const r = c.band && !(c.band[0] <= first && c.band[1] >= last) ? c.band : null;
        const pad = r && r[0] === r[1] ? 8 : 0;
        brushG.call(brush.move, r ? [Math.max(0, x(r[0]) - pad), Math.min(vis.innerWidth, x(r[1]) + pad)] : null);
      }
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
        noteRiser: false,        // tag the end labels of the lines that rose and fell the most (chosen years)
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

    // Phone layout: short break notes, and a key with each line's change under the chart
    compactMargin() { return { left: 44, right: 14, top: 74, bottom: 44 + legendHeight(this.config.series.length) }; }
    compactHeight() { return 300 + this.compactMargin().top + this.compactMargin().bottom; }

    /** Linked hover: thicken the line for `key`, fade the rest */
    preview(key) { if (this._paint) this._paint(key || this.config.highlight); }

    /** Numbers for "View as table": one row per year in the chosen range */
    tableData() {
      const c = this.config;
      return yearTable(this.displayData, c.series.map(s => ({ key: s.key, label: s.short || s.label })), c.band, false,
        c.yLabel);
    }

    renderVis() {
      const vis = this;
      const c = vis.config;
      const compact = vis.compact;
      const data = vis.displayData;
      const first = data[0].year, last = data[data.length - 1].year;
      const x = d3.scaleLinear().domain([first, last]).range([0, vis.innerWidth]);
      const yMax = d3.max(data, d => d3.max(c.series, s => d[s.key]));
      const y = d3.scaleLinear().domain([0, yMax * 1.08]).nice().range([vis.innerHeight, 0]);

      drawTimeAxes(vis, x, y, data.length, c.yLabel);

      // Counting changes, in plain words, so a dip is not mistaken for a safety gain
      const br = vis.annotationsG.selectAll('.break-group').data(c.breaks).join('g').attr('class', 'break-group');
      br.selectAll('*').remove();
      br.append('line').attr('x1', b => x(b.year)).attr('x2', b => x(b.year))
        .attr('y1', -34).attr('y2', vis.innerHeight)
        .style('stroke', 'var(--c-muted)').attr('stroke-dasharray', '3 3');
      // On a phone a note near the right edge is written leftwards so it stays on screen
      const flip = b => compact && x(b.year) > vis.innerWidth * 0.72;
      br.append('text').attr('class', 'break-label').attr('y', -40)
        .attr('text-anchor', b => (flip(b) ? 'end' : 'start'))
        .each(function (b) {
          const lines = (compact || vis.innerWidth < 520) && b.short ? b.short : b.lines;
          const bx = x(b.year) + (flip(b) ? -5 : 5);
          d3.select(this).selectAll('tspan').data(lines).join('tspan')
            .attr('x', bx).attr('dy', (l, i) => (i ? 14 : 0)).text(l => l);
        });

      // Change over the chosen years (or the whole period)
      const range = c.band && c.band[0] < c.band[1] ? c.band : [first, last];
      const r0 = data.find(d => d.year === range[0]);
      const r1 = data.find(d => d.year === range[1]);
      const changeOf = s => (r0[s.key] ? (r1[s.key] - r0[s.key]) / r0[s.key] : 0);
      const fmtChange = v => `${v >= 0 ? '+' : '−'}${d3.format('.0%')(Math.abs(v))}`;
      // Which lines rose and fell the most over the chosen years (tagged on their end labels)
      const tagOf = (() => {
        if (!c.noteRiser || r0 === r1) return () => '';
        const top = d3.greatest(c.series, changeOf), low = d3.least(c.series, changeOf);
        return s => (top && s.key === top.key && changeOf(top) > 0 ? '▲ rose most'
          : low && s.key === low.key && changeOf(low) < 0 ? '▼ fell most' : '');
      })();

      const line = key => d3.line().x(d => x(d.year)).y(d => y(d[key])).curve(d3.curveMonotoneX);
      const paths = vis.plotG.selectAll('.trend-line').data(c.series, s => s.key).join('path')
        .attr('class', 'trend-line').attr('fill', 'none').attr('stroke', s => s.color)
        .attr('stroke-linecap', 'round').style('pointer-events', 'none')
        .attr('d', s => line(s.key)(data));

      // End labels, pushed apart so none overlap (a key under the chart on a phone)
      if (compact) {
        drawCompactLegend(vis, [...c.series]
          .sort((a, b) => data[data.length - 1][b.key] - data[data.length - 1][a.key])
          .map(s => ({ key: s.key, label: s.short || s.label, color: s.color, extra: `${fmtChange(changeOf(s))}${tagOf(s) ? ` ${tagOf(s).slice(0, 1)}` : ''}` })),   // phone: just ▲ / ▼
        { onClick: c.onClick, faded: k => c.highlight && k !== c.highlight, active: c.highlight });
      } else {
        vis.annotationsG.selectAll('.compact-key').remove();
      }
      const ends = compact ? [] : dodge(c.series.map(s => ({
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
      lt.filter(d => tagOf(d.s)).append('tspan').attr('class', 'trend-end-tag').attr('dx', 8)
        .style('fill', 'var(--c-ink)')
        .text(d => tagOf(d.s));

      function paint(activeKey) {
        paths.attr('stroke-width', s => (s.key === activeKey ? 4 : 2.4))
          .attr('opacity', s => (activeKey && s.key !== activeKey ? 0.14 : 1));
        if (activeKey) paths.filter(s => s.key === activeKey).raise();
        labels.attr('opacity', d => (activeKey && d.s.key !== activeKey ? 0.3 : 1))
          .style('font-weight', d => (d.s.key === activeKey ? 700 : null));
      }
      paint(c.highlight);
      vis._paint = paint;

      // Hover: the nearest line lights up and the tooltip lists that year
      const focus = vis.annotationsG.selectAll('.trend-focus').data([0]).join('g')
        .attr('class', 'trend-focus').style('pointer-events', 'none').style('display', 'none');
      focus.selectAll('*').remove();
      const guide = focus.append('line').attr('y1', 0).attr('y2', vis.innerHeight)
        .style('stroke', 'var(--c-ink-3)').attr('stroke-dasharray', '3 3');
      const dot = focus.append('circle').attr('r', 6).style('stroke', 'var(--c-surface)').attr('stroke-width', 2);
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
          vis.emitHover(hoverKey);
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
          vis.emitHover(null);
          paint(c.highlight);
          focus.style('display', 'none');
          vis.tooltip.classed('visible', false);
        })
        .on('click', () => { if (c.onClick && hoverKey) c.onClick(hoverKey); });

      // (The rose-most / fell-most call-outs are tags on the end labels
      // above, outside the plot, so nothing crosses a line.)
      vis.annotationsG.selectAll('.chart-annotation, .riser-dot').remove();

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
        aColor: 'var(--c-pair-a)',
        bColorOf: () => 'var(--c-pair-b)',
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

    // Phone layout: names above each pair, the ratio column narrower
    compactMargin() { return { left: 6, right: 58, top: 96 }; }

    /** Linked hover: dim every pair except `key` */
    preview(key) {
      const k = key || this.config.highlight;
      this.plotG.selectAll('.pair-row').attr('opacity', d => (k && keyOf(d) !== k ? 0.25 : 1));
    }

    /** Numbers for "View as table" */
    tableData() {
      const c = this.config, pc = d3.format('.1%');
      const rows = this.displayData.map(d => [d.label, pc(d.a), pc(d.b), d.a ? `${d3.format('.1f')(d.b / d.a)}×` : '']);
      return {
        columns: [c.tableLabel || 'Road user', c.aLabel, c.bLabel, 'Ratio'],
        rows,
        summary: `${c.aLabel} compared with ${c.bLabel.toLowerCase()}: ${rows.map(r => `${r[0]} ${r[1]} and ${r[2]}`).join('; ')}.`,
      };
    }

    renderVis() {
      const vis = this;
      const c = vis.config;
      const rows = vis.displayData;
      const compact = vis.compact;
      setViewHeight(vis, c.margin.top + c.margin.bottom + rows.length * (compact ? 76 : c.rowHeight));
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
      const off = compact ? 20 : 0;        // room for the name above the bars
      const half = (y.bandwidth() - off) / 2;
      const faded = d => c.highlight && keyOf(d) !== c.highlight;
      const pct = d3.format('.0%');
      const ratioX = compact ? vis.innerWidth + c.margin.right - 4 : vis.innerWidth + 70;
      const ratioAnchor = compact ? 'end' : 'middle';

      vis.gridG.call(d3.axisBottom(x).ticks(5).tickSize(vis.innerHeight).tickFormat(''))
        .call(g => g.select('.domain').remove())
        .selectAll('line').style('stroke', 'var(--c-grid)').attr('stroke-dasharray', '2 4');
      vis.xAxisG.attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(pct));
      if (compact) pinEdgeTicks(vis.xAxisG, vis.innerWidth, c.margin.left, c.margin.right);
      if (compact) {
        vis.yAxisG.selectAll('*').remove();
      } else {
        vis.yAxisG.classed('axis-category', true).call(d3.axisLeft(y).tickSize(0).tickPadding(12))
          .call(g => g.select('.domain').remove());
        vis.yAxisG.selectAll('.tick text')
          .style('opacity', label => (faded(rows.find(r => r.label === label)) ? 0.45 : 1));
      }

      const g = vis.plotG.selectAll('.pair-row').data(rows, keyOf).join('g').attr('class', 'pair-row')
        .attr('transform', d => `translate(0,${y(d.label)})`)
        .attr('opacity', d => (faded(d) ? 0.25 : 1));
      g.selectAll('*').remove();
      if (compact) g.append('text').attr('class', 'rbar-name').attr('y', 8).attr('dy', '0.35em').text(d => d.label);
      g.append('rect').attr('y', off + 1).attr('height', half - 3).attr('rx', 3).style('fill', c.aColor)
        .attr('width', d => x(d.a));
      g.append('rect').attr('y', off + half + 1).attr('height', half - 3).attr('rx', 3).style('fill', d => c.bColorOf(d))
        .attr('width', d => x(d.b));
      g.append('text').attr('class', 'pair-value pair-value-a').attr('x', d => x(d.a) + 6).attr('y', off + half / 2 + 1)
        .attr('dy', '0.35em').text(d => pct(d.a));
      g.append('text').attr('class', 'pair-value pair-value-b').attr('x', d => x(d.b) + 6).attr('y', off + half * 1.5)
        .attr('dy', '0.35em').style('fill', d => c.bColorOf(d)).text(d => pct(d.b));

      // Right-hand column: how many times more (or less) deadly than its size suggests
      const ratioText = d => (d.a ? `${d3.format('.1f')(d.b / d.a)}×` : '');
      // One accent only: groups that die far more often than their size suggests
      const ratioColor = d => (d.b / d.a >= 1.25 ? 'var(--c-accent)' : 'var(--c-ink-2)');
      g.append('text').attr('class', 'pair-ratio').attr('x', ratioX).attr('y', off + half)
        .attr('dy', '0.35em').attr('text-anchor', ratioAnchor).style('fill', ratioColor).text(ratioText);

      vis.annotationsG.selectAll('.pair-ratio-head').data([0]).join('text').attr('class', 'pair-ratio-head')
        .attr('x', ratioX).attr('y', -14).attr('text-anchor', ratioAnchor)
        .selectAll('tspan').data(compact ? ['Deaths ÷', 'cases'] : ['Deaths ÷ cases', '(1× = as expected)']).join('tspan')
        .attr('x', ratioX).attr('dy', (l, i) => (i ? 15 : -8)).text(l => l);

      const hits = g.append('rect').attr('class', 'pair-hit')
        .attr('x', -c.margin.left).attr('width', c.width - 10).attr('y', -4).attr('height', y.step())
        .attr('fill', 'transparent').style('cursor', c.onClick ? 'pointer' : 'default')
        .attr('tabindex', c.onClick ? 0 : null).attr('role', c.onClick ? 'button' : null)
        .attr('aria-label', d => `${d.label}: ${pct(d.a)} of cases, ${pct(d.b)} of deaths`)
        .on('mouseenter', (event, d) => {
          vis.emitHover(keyOf(d));
          if (!c.tooltip) return;
          const [title, tipRows] = c.tooltip(d);
          vis.tooltip.classed('visible', true).html(tipHtml(title, tipRows));
          placeTip(vis.tooltip, event);
        })
        .on('mousemove', event => placeTip(vis.tooltip, event))
        .on('mouseleave', () => { vis.emitHover(null); vis.tooltip.classed('visible', false); });
      if (c.onClick) {
        hits.on('click', (event, d) => c.onClick(d));
        keyClick(hits, (event, d) => c.onClick(d));
      }

      // Legend (top-left)
      vis.legendG.attr('transform', `translate(${c.margin.left}, 18)`).selectAll('*').remove();
      [[c.aLabel, c.aColor], [c.bLabel, c.bColorOf({})]].forEach(([label, color], i) => {
        const item = vis.legendG.append('g').attr('transform', `translate(0, ${i * 22})`);
        item.append('rect').attr('width', 22).attr('height', 11).attr('y', -1).attr('rx', 2).style('fill', color);
        item.append('text').attr('x', 30).attr('y', 9).attr('class', 'pair-legend-text').text(label);
      });
    }
  }

  Object.assign(Vis, { RankedBarChart, StackedAreaChart, TrendLinesChart, PairedBarChart, tipHtml, placeTip });
})(typeof window !== 'undefined' ? window : this);
