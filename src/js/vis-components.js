/* ═══════════════════════════════════════════════════════════════
   vis-components.js – Industry-Standard OOP D3 Visualisation Library
   COS30045 Data Visualisation Project
   Author: Kah Seng CHAI (Web Engineering & D3 Interactive Lead)

   Architecture:
   - BaseChart: Abstract parent class handling SVG lifecycle,
                responsive viewBox scaling, margins & tooltip singleton.
   - BarChart: Reusable horizontal/vertical ranked bar component.
   - LollipopChart: High data-ink alternative for category ranking.
   - StackedBarChart: 100% normalized or absolute composition bars.
   - LineChart: Multi-series trajectories with break annotations.
   - BubbleChart: Multi-dimensional scatter/bubble component.
   - HeatmapChart: 2D correlation matrix with sequential luminance.
   ═══════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  // ── Global Number Formatters ─────────────────────────────────
  const fmtComma   = d3.format(',');
  const fmtPercent = d3.format('.1%');
  const fmtDec1    = d3.format('.1f');
  const fmtDec2    = d3.format('.2f');

  // ── Shared bar gradient (light = fewer, dark = more) ─────────
  // Every single-series bar chart uses this so the colour story is
  // consistent site-wide. The range is clamped so the smallest bar is
  // still clearly visible on the white card.
  const BAR_GRADIENT_RANGE = [0.3, 1.0];
  function barGradient(domain, range = BAR_GRADIENT_RANGE) {
    const [lo, hi] = range;
    return d3.scaleSequential()
      .domain(domain)
      .interpolator(t => d3.interpolateBlues(lo + t * (hi - lo)));
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. BASE CLASS: BaseChart (Lifecycle & SVG Container Manager)
  // ═══════════════════════════════════════════════════════════════
  class BaseChart {
    constructor(parentElement, data = [], config = {}) {
      if (new.target === BaseChart) {
        throw new TypeError('Cannot construct BaseChart instances directly; extend it instead.');
      }

      this.parentElement = parentElement;
      this.rawData = data;
      this.displayData = [];

      // Merge user config with conservative Apple/Tufte defaults (deep margin merge)
      const defaultMargin = { top: 30, right: 90, bottom: 45, left: 120 };
      const mergedMargin = Object.assign({}, defaultMargin, config.margin || {});
      this.config = Object.assign({
        width: 850,
        height: 380,
        duration: 750,
        ease: d3.easeCubicOut,
      }, config, { margin: mergedMargin });

      this.tooltip = BaseChart.getTooltip();
      this.initVis();

      if (this.rawData && this.rawData.length > 0) {
        this.wrangleData();
      }
    }

    /**
     * Singleton Tooltip Provider (prevents duplicate DOM popovers)
     */
    static getTooltip() {
      let tip = d3.select('body').select('.tooltip');
      if (tip.empty()) {
        tip = d3.select('body')
          .append('div')
          .attr('class', 'tooltip')
          .attr('role', 'status')
          .attr('aria-live', 'polite');
      }
      return tip;
    }

    /**
     * Lifecycle Phase 1: Build static SVG skeleton and groups (runs ONCE)
     */
    initVis() {
      const vis = this;
      const container = d3.select(vis.parentElement);
      if (container.empty()) {
        console.warn(`[BaseChart] Target container "${vis.parentElement}" not found in DOM.`);
        return;
      }
      container.selectAll('*').remove();

      vis.fitLeftMargin();

      vis.innerWidth  = Math.max(0, vis.config.width - vis.config.margin.left - vis.config.margin.right);
      vis.innerHeight = Math.max(0, vis.config.height - vis.config.margin.top - vis.config.margin.bottom);

      vis.svg = container.append('svg')
        .attr('viewBox', `0 0 ${vis.config.width} ${vis.config.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('class', 'vis-chart')   // scopes chart typography in css/visualisations.css
        .attr('role', 'img');

      vis.g = vis.svg.append('g')
        .attr('class', 'chart-inner')
        .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

      // Layered Groups to ensure proper SVG z-index ordering
      vis.gridG        = vis.g.append('g').attr('class', 'grid-layer');
      vis.plotG        = vis.g.append('g').attr('class', 'plot-layer');
      vis.annotationsG = vis.g.append('g').attr('class', 'annotations-layer');
      vis.xAxisG       = vis.g.append('g').attr('class', 'x-axis');
      vis.yAxisG       = vis.g.append('g').attr('class', 'y-axis');
      vis.legendG      = vis.svg.append('g').attr('class', 'legend-layer');
    }

    /**
     * Widen the left margin when the longest category label (e.g. "Heavy
     * transport driver") would otherwise be cut off at the edge of the SVG.
     * Only applies to charts with category labels on the y-axis.
     */
    fitLeftMargin() {
      const vis = this;
      const key = vis.config.labelKey || vis.config.categoryKey;
      if (!vis.config.autoFitLabels || !key || !Array.isArray(vis.rawData) || !vis.rawData.length) return;

      // Measure with the same CSS as the real axis labels (.vis-chart .axis-category text)
      const probe = d3.select('body').append('svg')
        .attr('class', 'vis-chart')
        .style('position', 'absolute').style('visibility', 'hidden').style('left', '-9999px');
      const tick = probe.append('g').attr('class', 'axis-category').append('g').attr('class', 'tick');
      let maxW = 0;
      vis.rawData.forEach(d => {
        const t = tick.append('text').text(String(d[key] ?? ''));
        maxW = Math.max(maxW, t.node().getComputedTextLength());
      });
      probe.remove();

      // tick padding (12) + breathing room; slack covers the web font loading late
      const needed = Math.ceil(maxW) + 28;
      if (needed > vis.config.margin.left) {
        vis.config.margin = Object.assign({}, vis.config.margin, { left: needed });
      }
    }

    /**
     * Lifecycle Phase 2: Data Wrangling & Filtering
     */
    wrangleData(newData) {
      if (newData) this.rawData = newData;
      this.displayData = Array.isArray(this.rawData) ? [...this.rawData] : [];
      this.renderVis();
    }

    /**
     * Lifecycle Phase 3: Abstract visual encoding (must be overridden)
     */
    renderVis() {
      throw new Error('[BaseChart] renderVis() must be implemented by subclass.');
    }

    /**
     * Public update method for dynamic filtering
     */
    update(newData) {
      this.wrangleData(newData);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. SUBCLASS: BarChart (Ranked Horizontal / Vertical Bars)
  // ═══════════════════════════════════════════════════════════════
  class BarChart extends BaseChart {
    constructor(parentElement, data, config = {}) {
      super(parentElement, data, Object.assign({
        labelKey: 'label',
        valueKey: 'value',
        accentKey: null,
        accentColor: '#0072B2',
        baselineColor: '#888888',
        xLabel: 'Cases',
        showLabels: true,
        showProportion: true,
        valueLabel: 'Hospitalised:',
        unit: '',
        valueFormatter: null,
        autoFitLabels: true,
        gradient: false,        // true = sequential colour by value (no single focal bar)
        gradientRange: BAR_GRADIENT_RANGE, // portion of d3.interpolateBlues used (wider = more contrast)
      }, config));
    }

    /** Fill colour for a bar: colorMap > gradient > accent/baseline */
    barFill(d) {
      const vis = this;
      if (vis.config.colorMap && vis.config.colorMap[d.label]) return vis.config.colorMap[d.label];
      if (vis.config.gradient) return vis.gradientScale(d.value);
      return d.label === vis.config.accentKey ? vis.config.accentColor : vis.config.baselineColor;
    }

    barOpacity(d) {
      const vis = this;
      if (vis.config.gradient) return 1;
      return vis.config.accentKey ? (d.label === vis.config.accentKey ? 0.95 : 0.5) : 0.85;
    }

    wrangleData(newData) {
      if (newData) this.rawData = newData;
      const vis = this;

      vis.displayData = vis.rawData
        .map(d => ({
          label: String(d[vis.config.labelKey]),
          value: +d[vis.config.valueKey] || 0,
          raw: d,
        }))
        .filter(d => d.label && d.label.toLowerCase() !== 'missing' && !isNaN(d.value));

      if (vis.config.sortDescending !== false) {
        vis.displayData.sort((a, b) => b.value - a.value);
      }
      // sortDescending === false keeps the data's own order (e.g. youngest → oldest age group)

      vis.totalSum = d3.sum(vis.displayData, d => d.value);
      vis.renderVis();
    }

    renderVis() {
      const vis = this;

      const fmtVal = vis.config.valueFormatter
        ? vis.config.valueFormatter
        : d => `${fmtComma(d)}${vis.config.unit}`;

      // Scales
      vis.yScale = d3.scaleBand()
        .domain(vis.displayData.map(d => d.label))
        .range([0, vis.innerHeight])
        .padding(0.28);

      vis.xScale = d3.scaleLinear()
        .domain([0, (d3.max(vis.displayData, d => d.value) || 10) * 1.15])
        .nice()
        .range([0, vis.innerWidth]);

      // Sequential gradient: light (smallest) → dark (largest); clamped so the
      // lightest bar stays visible against the white card.
      const [vMin, vMax] = d3.extent(vis.displayData, d => d.value);
      vis.gradientScale = barGradient([vMin ?? 0, vMax ?? 1], vis.config.gradientRange);

      // Gridlines
      vis.gridG.call(
        d3.axisBottom(vis.xScale)
          .ticks(6)
          .tickSize(vis.innerHeight)
          .tickFormat('')
      ).selectAll('line')
        .attr('stroke', 'rgba(0,0,0,0.06)')
        .attr('stroke-dasharray', '2 4');

      // Axes
      vis.yAxisG.classed('axis-category', true)
        .transition().duration(vis.config.duration)
        .call(d3.axisLeft(vis.yScale).tickSize(0).tickPadding(12));

      vis.xAxisG
        .attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(vis.xScale).ticks(6).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d));

      // Axis Label
      vis.xAxisG.selectAll('.axis-label').data([vis.config.xLabel])
        .join('text')
        .attr('class', 'axis-label')
        .attr('x', vis.innerWidth / 2)
        .attr('y', 38)
        .attr('text-anchor', 'middle')
        .text(d => d);

      // Data Binding using D3 .join()
      vis.plotG.selectAll('.bar')
        .data(vis.displayData, d => d.label)
        .join(
          enter => enter.append('rect')
            .attr('class', 'bar')
            .attr('y', d => vis.yScale(d.label))
            .attr('x', 0)
            .attr('height', vis.yScale.bandwidth())
            .attr('rx', 4)
            .attr('fill', d => vis.barFill(d))
            .attr('opacity', d => vis.barOpacity(d))
            .attr('width', 0)
            .call(enter => enter.transition().duration(vis.config.duration).ease(vis.config.ease)
              .attr('width', d => vis.xScale(d.value))),
          update => update
            .call(update => update.transition().duration(vis.config.duration)
              .attr('y', d => vis.yScale(d.label))
              .attr('height', vis.yScale.bandwidth())
              .attr('width', d => vis.xScale(d.value))),
          exit => exit.remove()
        )
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('opacity', 1).attr('filter', 'brightness(0.92)');
          vis.tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.label}</div>
              <div class="tooltip-row"><span>${vis.config.valueLabel}</span> <span class="tooltip-accent">${fmtVal(d.value)}</span></div>
              ${vis.config.showProportion ? `<div class="tooltip-row"><span>Proportion:</span> <span class="tooltip-val">${fmtPercent(d.value / vis.totalSum)}</span></div>` : ''}
            `);
        })
        .on('mousemove', function (event) {
          vis.tooltip
            .style('left', `${event.pageX + 14}px`)
            .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseleave', function (event, d) {
          d3.select(this)
            .attr('opacity', vis.barOpacity(d))
            .attr('filter', null);
          vis.tooltip.classed('visible', false);
        });

      // Data Labels
      if (vis.config.showLabels) {
        vis.plotG.selectAll('.bar-label')
          .data(vis.displayData, d => d.label)
          .join(
            enter => enter.append('text')
              .attr('class', 'bar-label')
              .attr('y', d => vis.yScale(d.label) + vis.yScale.bandwidth() / 2 + 4)
              .attr('x', d => vis.xScale(d.value) + 8)
              .text(d => fmtVal(d.value)),
            update => update
              .text(d => fmtVal(d.value))
              .call(u => u.transition().duration(vis.config.duration)
                .attr('y', d => vis.yScale(d.label) + vis.yScale.bandwidth() / 2 + 4)
                .attr('x', d => vis.xScale(d.value) + 8)),
            exit => exit.remove()
          );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. SUBCLASS: LollipopChart (High Data-Ink Alternative)
  // ═══════════════════════════════════════════════════════════════
  class LollipopChart extends BaseChart {
    constructor(parentElement, data, config = {}) {
      const lollipopDefaults = {
        labelKey: 'label',
        valueKey: 'value',
        palette: ['#0072B2', '#E69F00', '#009E73', '#56B4E9', '#888888'],
        xLabel: 'Total Hospitalised Cases',
        height: 420,
        autoFitLabels: true,
        margin: { top: 25, right: 90, bottom: 45, left: 200 },
      };
      const mergedConfig = Object.assign({}, lollipopDefaults, config);
      if (config.margin) {
        mergedConfig.margin = Object.assign({}, lollipopDefaults.margin, config.margin);
      }
      super(parentElement, data, mergedConfig);
    }

    wrangleData(newData) {
      if (newData) this.rawData = newData;
      const vis = this;

      vis.displayData = vis.rawData
        .map(d => ({
          label: String(d[vis.config.labelKey]),
          value: +d[vis.config.valueKey] || 0,
        }))
        .filter(d => !d.label.toLowerCase().includes('unknown position') && d.value > 1000)
        .sort((a, b) => b.value - a.value);

      vis.totalSum = d3.sum(vis.displayData, d => d.value);
      vis.renderVis();
    }

    renderVis() {
      const vis = this;

      vis.yScale = d3.scaleBand()
        .domain(vis.displayData.map(d => d.label))
        .range([0, vis.innerHeight])
        .padding(0.35);

      vis.xScale = d3.scaleLinear()
        .domain([0, (d3.max(vis.displayData, d => d.value) || 10) * 1.15])
        .nice()
        .range([0, vis.innerWidth]);

      // Grid
      vis.gridG.call(
        d3.axisBottom(vis.xScale).ticks(6).tickSize(vis.innerHeight).tickFormat('')
      ).selectAll('line')
        .attr('stroke', 'rgba(0,0,0,0.06)')
        .attr('stroke-dasharray', '2 4');

      vis.yAxisG.classed('axis-category', true)
        .call(d3.axisLeft(vis.yScale).tickSize(0).tickPadding(12));

      vis.xAxisG
        .attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(vis.xScale).ticks(6).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d));

      vis.xAxisG.selectAll('.axis-title').data([vis.config.xLabel])
        .join('text')
        .attr('class', 'axis-title')
        .attr('x', vis.innerWidth / 2)
        .attr('y', 36)
        .attr('text-anchor', 'middle')
        .text(d => d);

      // Stems (Lines)
      vis.plotG.selectAll('.lollipop-line')
        .data(vis.displayData, d => d.label)
        .join(
          enter => enter.append('line')
            .attr('class', 'lollipop-line')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', d => vis.yScale(d.label) + vis.yScale.bandwidth() / 2)
            .attr('y2', d => vis.yScale(d.label) + vis.yScale.bandwidth() / 2)
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', 2.5)
            .call(enter => enter.transition().duration(vis.config.duration).ease(vis.config.ease)
              .attr('x2', d => vis.xScale(d.value))),
          update => update
            .attr('y1', d => vis.yScale(d.label) + vis.yScale.bandwidth() / 2)
            .attr('y2', d => vis.yScale(d.label) + vis.yScale.bandwidth() / 2)
            .attr('x2', d => vis.xScale(d.value)),
          exit => exit.remove()
        );

      // Heads (Circles)
      vis.plotG.selectAll('.lollipop-dot')
        .data(vis.displayData, d => d.label)
        .join(
          enter => enter.append('circle')
            .attr('class', 'lollipop-dot')
            .attr('cx', 0)
            .attr('cy', d => vis.yScale(d.label) + vis.yScale.bandwidth() / 2)
            .attr('r', 6.5)
            .attr('fill', (d, i) => (vis.config.colorMap && vis.config.colorMap[d.label])
              ? vis.config.colorMap[d.label]
              : vis.config.palette[i % vis.config.palette.length])
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2)
            .call(enter => enter.transition().duration(vis.config.duration).ease(vis.config.ease)
              .attr('cx', d => vis.xScale(d.value))),
          update => update
            .attr('cy', d => vis.yScale(d.label) + vis.yScale.bandwidth() / 2)
            .attr('cx', d => vis.xScale(d.value))
            .attr('fill', (d, i) => (vis.config.colorMap && vis.config.colorMap[d.label])
              ? vis.config.colorMap[d.label]
              : vis.config.palette[i % vis.config.palette.length]),
          exit => exit.remove()
        );

      // Labels
      vis.plotG.selectAll('.lollipop-label')
        .data(vis.displayData, d => d.label)
        .join(
          enter => enter.append('text')
            .attr('class', 'lollipop-label')
            .attr('x', d => vis.xScale(d.value) + 12)
            .attr('y', d => vis.yScale(d.label) + vis.yScale.bandwidth() / 2 + 4)
            .text(d => fmtComma(d.value)),
          update => update
            .attr('x', d => vis.xScale(d.value) + 12)
            .attr('y', d => vis.yScale(d.label) + vis.yScale.bandwidth() / 2 + 4)
            .text(d => fmtComma(d.value)),
          exit => exit.remove()
        );

      // Interactive hitboxes
      vis.plotG.selectAll('.lollipop-hitbox')
        .data(vis.displayData, d => d.label)
        .join('rect')
        .attr('class', 'lollipop-hitbox')
        .attr('y', d => vis.yScale(d.label))
        .attr('x', 0)
        .attr('width', vis.innerWidth)
        .attr('height', vis.yScale.bandwidth())
        .attr('fill', 'transparent')
        .on('mouseenter', function (event, d) {
          vis.tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.label}</div>
              <div class="tooltip-row"><span>Total Hospitalised:</span> <span class="tooltip-val">${fmtComma(d.value)}</span></div>
              <div class="tooltip-row"><span>National Share:</span> <span class="tooltip-accent">${fmtPercent(d.value / vis.totalSum)}</span></div>
            `);
        })
        .on('mousemove', function (event) {
          vis.tooltip
            .style('left', `${event.pageX + 14}px`)
            .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseleave', function () {
          vis.tooltip.classed('visible', false);
        });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. SUBCLASS: StackedBarChart (100% Normalized Proportions)
  // ═══════════════════════════════════════════════════════════════
  class StackedBarChart extends BaseChart {
    constructor(parentElement, data, config = {}) {
      super(parentElement, data, Object.assign({
        autoFitLabels: true,
        categoryKey: 'user',
        seriesKeys: [],
        colorMap: {},
        legendItems: [],
      }, config));
    }

    wrangleData(newData) {
      if (newData) this.rawData = newData;
      const vis = this;

      vis.displayData = vis.rawData.map(d => {
        const row = { category: d[vis.config.categoryKey], raw: d };
        let sum = 0;
        vis.config.seriesKeys.forEach(k => {
          row[k] = +d[k] || 0;
          sum += row[k];
        });
        row._total = sum;
        return row;
      });

      vis.renderVis();
    }

    renderVis() {
      const vis = this;

      vis.yScale = d3.scaleBand()
        .domain(vis.displayData.map(d => d.category))
        .range([0, vis.innerHeight])
        .padding(0.32);

      vis.xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, vis.innerWidth]);

      const stack = d3.stack()
        .keys(vis.config.seriesKeys)
        .offset(d3.stackOffsetExpand);

      const series = stack(vis.displayData);

      vis.yAxisG.classed('axis-category', true)
        .call(d3.axisLeft(vis.yScale).tickSize(0).tickPadding(12));

      vis.xAxisG
        .attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(vis.xScale).ticks(5).tickFormat(d3.format('.0%')));

      // 50% benchmark
      vis.annotationsG.selectAll('.half-line').data([0.5])
        .join('line')
        .attr('class', 'half-line')
        .attr('x1', vis.xScale(0.5)).attr('x2', vis.xScale(0.5))
        .attr('y1', 0).attr('y2', vis.innerHeight)
        .attr('stroke', 'rgba(0,0,0,0.18)')
        .attr('stroke-dasharray', '3 3');

      // Layers
      const layers = vis.plotG.selectAll('.stack-layer')
        .data(series, d => d.key)
        .join('g')
        .attr('class', 'stack-layer')
        .attr('fill', d => vis.config.colorMap[d.key] || '#888888');

      layers.selectAll('rect')
        .data(d => d.map(item => ({ ...item, key: d.key, category: item.data.category, total: item.data._total })))
        .join(
          enter => enter.append('rect')
            .attr('y', d => vis.yScale(d.category))
            .attr('x', d => vis.xScale(d[0]))
            .attr('height', vis.yScale.bandwidth())
            .attr('rx', 2)
            .attr('width', 0)
            .call(enter => enter.transition().duration(vis.config.duration)
              .attr('width', d => Math.max(0, vis.xScale(d[1]) - vis.xScale(d[0])))),
          update => update
            .attr('y', d => vis.yScale(d.category))
            .attr('x', d => vis.xScale(d[0]))
            .attr('width', d => Math.max(0, vis.xScale(d[1]) - vis.xScale(d[0]))),
          exit => exit.remove()
        )
        .on('mouseenter', function (event, d) {
          const share = d[1] - d[0];
          vis.tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.category} &rarr; ${d.key}</div>
              <div class="tooltip-row"><span>Proportion:</span> <span class="tooltip-accent">${fmtPercent(share)}</span></div>
            `);
        })
        .on('mousemove', function (event) {
          vis.tooltip
            .style('left', `${event.pageX + 14}px`)
            .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseleave', function () {
          vis.tooltip.classed('visible', false);
        });

      // Top Legend
      if (vis.config.legendItems && vis.config.legendItems.length > 0) {
        vis.legendG.attr('transform', `translate(${vis.config.margin.left}, 12)`);
        const items = vis.legendG.selectAll('.legend-item')
          .data(vis.config.legendItems)
          .join('g')
          .attr('class', 'legend-item')
          .attr('transform', (d, i) => `translate(${i * 180}, 0)`);

        items.selectAll('rect').data(d => [d])
          .join('rect')
          .attr('width', 12).attr('height', 12).attr('rx', 2)
          .attr('fill', d => d.color);

        items.selectAll('text').data(d => [d])
          .join('text')
          .attr('x', 18).attr('y', 10)
          .text(d => d.label);

        // Fit legend inside the plot frame: spread items evenly across innerWidth
        const widths = [];
        items.each(function () { widths.push(this.getBBox().width); });
        const totalW = d3.sum(widths);
        const gap = Math.max(8, (vis.innerWidth - totalW) / Math.max(1, widths.length - 1));
        let cursor = 0;
        items.attr('transform', (d, i) => {
          const x = cursor;
          cursor += widths[i] + gap;
          return `translate(${x}, 0)`;
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. SUBCLASS: LineChart (Multi-Series with Context Annotations)
  // ═══════════════════════════════════════════════════════════════
  class LineChart extends BaseChart {
    constructor(parentElement, data, config = {}) {
      super(parentElement, data, Object.assign({
        xKey: 'year',
        series: [],
        breaks: [],
        yLabel: 'Annual Hospitalisations',
      }, config, {
        // Legend sits at y≈15; keep the plot (and its top "16k" tick) clear of it
        margin: Object.assign({ top: 56 }, config.margin || {}),
      }));
    }

    wrangleData(newData) {
      if (newData) this.rawData = newData;
      const vis = this;

      vis.displayData = vis.rawData
        .map(d => {
          const row = { year: +d[vis.config.xKey] };
          vis.config.series.forEach(s => {
            row[s.key] = +d[s.key] || 0;
          });
          return row;
        })
        .sort((a, b) => a.year - b.year);

      vis.renderVis();
    }

    renderVis() {
      const vis = this;

      vis.xScale = d3.scaleLinear()
        .domain(d3.extent(vis.displayData, d => d.year))
        .range([0, vis.innerWidth]);

      const maxVal = d3.max(vis.displayData, d => d3.max(vis.config.series, s => d[s.key])) || 1000;
      vis.yScale = d3.scaleLinear()
        .domain([0, maxVal * 1.1])
        .nice()
        .range([vis.innerHeight, 0]);

      // Grid
      vis.gridG.call(
        d3.axisLeft(vis.yScale).ticks(6).tickSize(-vis.innerWidth).tickFormat('')
      ).selectAll('line')
        .attr('stroke', 'rgba(0,0,0,0.06)')
        .attr('stroke-dasharray', '2 4');

      // Annotations (Reporting Breaks)
      if (vis.config.breaks) {
        vis.annotationsG.selectAll('.break-group')
          .data(vis.config.breaks)
          .join('g')
          .attr('class', 'break-group')
          .each(function (b) {
            const grp = d3.select(this);
            grp.selectAll('line').data([b])
              .join('line')
              .attr('x1', vis.xScale(b.year)).attr('x2', vis.xScale(b.year))
              .attr('y1', 0).attr('y2', vis.innerHeight)
              .attr('stroke', '#94a3b8')
              .attr('stroke-dasharray', '3 3');

            grp.selectAll('text').data([b])
              .join('text')
              .attr('class', 'break-label')
              .attr('x', vis.xScale(b.year) + 4)
              .attr('y', 14)
              .text(b.label);
          });
      }

      // X-Axis
      vis.xAxisG
        .attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(vis.xScale).ticks(11).tickFormat(d3.format('d')));

      // Y-Axis
      vis.yAxisG
        .call(d3.axisLeft(vis.yScale).ticks(6).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d));

      // Line Generator
      const lineGen = (key) => d3.line()
        .x(d => vis.xScale(d.year))
        .y(d => vis.yScale(d[key]))
        .curve(d3.curveMonotoneX);

      // Paths
      vis.config.series.forEach(s => {
        vis.plotG.selectAll(`.line-${s.key.replace(/\s+/g, '-')}`)
          .data([vis.displayData])
          .join('path')
          .attr('class', `line-path line-${s.key.replace(/\s+/g, '-')}`)
          .attr('fill', 'none')
          .attr('stroke', s.color)
          .attr('stroke-width', s.highlight ? 3.5 : 2.5)
          .attr('d', lineGen(s.key));

        // Data dots
        vis.plotG.selectAll(`.dot-${s.key.replace(/\s+/g, '-')}`)
          .data(vis.displayData)
          .join('circle')
          .attr('class', 'data-dot')
          .attr('cx', d => vis.xScale(d.year))
          .attr('cy', d => vis.yScale(d[s.key]))
          .attr('r', 3.5)
          .attr('fill', s.color)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
          .on('mouseenter', function (event, d) {
            d3.select(this).attr('r', 6);
            vis.tooltip.classed('visible', true)
              .html(`
                <div class="tooltip-title">${s.label} (${d.year})</div>
                <div class="tooltip-row"><span>Hospitalisations:</span> <span class="tooltip-val">${fmtComma(d[s.key])}</span></div>
              `);
          })
          .on('mousemove', function (event) {
            vis.tooltip
              .style('left', `${event.pageX + 14}px`)
              .style('top', `${event.pageY - 28}px`);
          })
          .on('mouseleave', function () {
            d3.select(this).attr('r', 3.5);
            vis.tooltip.classed('visible', false);
          });
      });

      // Top Interactive Legend
      vis.legendG.attr('transform', `translate(${vis.config.margin.left}, 15)`);
      const legItems = vis.legendG.selectAll('.leg-item')
        .data(vis.config.series)
        .join('g')
        .attr('class', 'leg-item')
        .attr('transform', (d, i) => `translate(${i * 135}, 0)`)
        .on('mouseenter', function (event, s) {
          vis.plotG.selectAll('.line-path').attr('opacity', 0.15);
          vis.plotG.select(`.line-${s.key.replace(/\s+/g, '-')}`).attr('opacity', 1).attr('stroke-width', 4);
        })
        .on('mouseleave', function () {
          vis.plotG.selectAll('.line-path').attr('opacity', 1).attr('stroke-width', d => 2.5);
        });

      legItems.selectAll('line').data(d => [d])
        .join('line')
        .attr('x1', 0).attr('x2', 16).attr('y1', 6).attr('y2', 6)
        .attr('stroke', d => d.color).attr('stroke-width', 3);

      legItems.selectAll('text').data(d => [d])
        .join('text')
        .attr('x', 22).attr('y', 10)
        .text(d => d.label);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. SUBCLASS: BubbleChart (Volume vs Severity Climax)
  // ═══════════════════════════════════════════════════════════════
  class BubbleChart extends BaseChart {
    constructor(parentElement, data, config = {}) {
      super(parentElement, data, Object.assign({
        xKey: 'cases',
        yKey: 'rate',
        rKey: 'avgBedDays',
        labelKey: 'user',
        colorMap: {},
      }, config));
    }

    wrangleData(newData) {
      if (newData) this.rawData = newData;
      const vis = this;

      vis.displayData = vis.rawData.map(d => {
        // Robust extraction from either pre-formatted or raw KNIME columns
        const cases = (d[vis.config.xKey] !== undefined && !isNaN(+d[vis.config.xKey]))
          ? +d[vis.config.xKey]
          : (+d['Sum(Count of cases)'] || 0);

        const deaths = (d.deaths !== undefined && !isNaN(+d.deaths))
          ? +d.deaths
          : (+d['Sum(Died_cases)'] || 0);

        const bedDays = (d.bedDays !== undefined && !isNaN(+d.bedDays))
          ? +d.bedDays
          : (+d['Sum(Bed days)'] || 0);

        const rate = (d[vis.config.yKey] !== undefined && !isNaN(+d[vis.config.yKey]))
          ? +d[vis.config.yKey]
          : (+d['Deaths_per_1000'] || (cases > 0 ? (deaths / cases) * 1000 : 0));

        const avgBedDays = (d[vis.config.rKey] !== undefined && !isNaN(+d[vis.config.rKey]))
          ? +d[vis.config.rKey]
          : (cases > 0 && bedDays > 0 ? bedDays / cases : 0);

        const user = String(d[vis.config.labelKey] || d['Road user'] || '');

        return {
          user,
          cases,
          deaths,
          bedDays,
          rate: Math.round(rate * 100) / 100,
          avgBedDays: Math.round(avgBedDays * 10) / 10,
        };
      }).filter(d => d.user && !d.user.toLowerCase().includes('unknown position') && d.cases > 1000);

      vis.renderVis();
    }

    renderVis() {
      const vis = this;

      // Log X: case volume spans two orders of magnitude (2k → 116k). A linear
      // scale crushes the four low-volume cohorts into ~30px and they overlap.
      vis.xScale = d3.scaleLog()
        .domain([1000, 200000])
        .range([0, vis.innerWidth])
        .clamp(true);

      vis.yScale = d3.scaleLinear()
        .domain([0, (d3.max(vis.displayData, d => d.rate) || 25) * 1.15])
        .nice()
        .range([vis.innerHeight, 0]);

      // True area encoding (r = 0 at value 0) so bubble area is proportional to stay length
      vis.rScale = d3.scaleSqrt()
        .domain([0, d3.max(vis.displayData, d => d.avgBedDays) || 10])
        .range([0, 22]);

      // ── Anti-collision layout ─────────────────────────────────────
      // Bubbles that still overlap after the log transform are nudged apart
      // with a collision force anchored to their true (x, y). A leader line
      // and anchor dot keep the exact data position visible.
      vis.displayData.forEach(d => {
        d.tx = vis.xScale(d.cases);
        d.ty = vis.yScale(d.rate);
        d.r  = vis.rScale(d.avgBedDays);
        d.x  = d.tx;
        d.y  = d.ty;
      });
      const sim = d3.forceSimulation(vis.displayData)
        .force('x', d3.forceX(d => d.tx).strength(0.4))
        .force('y', d3.forceY(d => d.ty).strength(0.4))
        .force('collide', d3.forceCollide(d => d.r + 2).strength(1).iterations(4))
        .stop();
      for (let i = 0; i < 300; i++) {
        sim.tick();
        vis.displayData.forEach(d => {
          d.x = Math.max(d.r, Math.min(vis.innerWidth - d.r, d.x));
          d.y = Math.max(d.r, Math.min(vis.innerHeight - d.r, d.y));
        });
      }
      vis.displayData.forEach(d => {
        d.px = d.x;
        d.py = d.y;
        d.displaced = Math.hypot(d.px - d.tx, d.py - d.ty) > 1.5;
      });

      // Grid
      vis.gridG.call(
        d3.axisLeft(vis.yScale).ticks(6).tickSize(-vis.innerWidth).tickFormat('')
      ).selectAll('line')
        .attr('stroke', 'rgba(0,0,0,0.06)')
        .attr('stroke-dasharray', '2 4');

      // Quadrant Reference Lines
      vis.annotationsG.selectAll('.quad-x').data([50000])
        .join('line')
        .attr('class', 'quad-x')
        .attr('x1', vis.xScale(50000)).attr('x2', vis.xScale(50000))
        .attr('y1', 0).attr('y2', vis.innerHeight)
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4 4');

      vis.annotationsG.selectAll('.quad-y').data([6.0])
        .join('line')
        .attr('class', 'quad-y')
        .attr('x1', 0).attr('x2', vis.innerWidth)
        .attr('y1', vis.yScale(6.0)).attr('y2', vis.yScale(6.0))
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4 4');

      // Reference line labels live in the MARGINS (outside the plot area) so
      // no bubble, label, filter state or hover can ever collide with them.
      // Y reference: right margin, at the end of its line (two lines).
      vis.annotationsG.selectAll('.quad-y-label').data([['Avg mortality', '6.0 / 1k']])
        .join('text')
        .attr('class', 'quad-y-label')
        .attr('x', vis.innerWidth + 8)
        .attr('y', vis.yScale(6.0) - 2)
        .attr('text-anchor', 'start')
        .selectAll('tspan').data(d => d).join('tspan')
        .attr('x', vis.innerWidth + 8)
        .attr('dy', (d, i) => i === 0 ? 0 : '1.2em')
        .text(d => d);

      // X reference: top margin, centred above its line.
      vis.annotationsG.selectAll('.quad-x-label').data(['50k volume threshold'])
        .join('text')
        .attr('class', 'quad-x-label')
        .attr('x', vis.xScale(50000))
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .text(d => d);

      // Axes
      vis.xAxisG
        .attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(vis.xScale)
          .tickValues([1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000])
          .tickFormat(d => d >= 1000 ? `${d / 1000}k` : d));

      vis.xAxisG.selectAll('.axis-label').data(['Total Hospitalised Cases (2011–2019 Volume, log scale) \u2192'])
        .join('text')
        .attr('class', 'axis-label')
        .attr('x', vis.innerWidth / 2)
        .attr('y', 42)
        .attr('text-anchor', 'middle')
        .text(d => d);

      vis.yAxisG
        .call(d3.axisLeft(vis.yScale).ticks(6));

      // Horizontal Y-Axis Title at top-left (no rotation = zero tick collision!)
      vis.svg.selectAll('.chart-y-axis-title').data(['Deaths per 1,000 Cases \u2191'])
        .join('text')
        .attr('class', 'chart-y-axis-title')
        .attr('x', vis.config.margin.left)
        .attr('y', vis.config.margin.top - 14)
        .text(d => d);

      // Crosshair Projection Lines Layer
      vis.crosshairG = vis.g.append('g')
        .attr('class', 'crosshair-layer');

      vis.crossLineX = vis.crosshairG.append('line')
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3 3')
        .style('display', 'none');

      vis.crossLineY = vis.crosshairG.append('line')
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3 3')
        .style('display', 'none');

      vis.crossBadgeX = vis.crosshairG.append('g').style('display', 'none');
      vis.crossBadgeX.append('rect').attr('rx', 4).attr('fill', '#1d1d1f').attr('opacity', 0.9);
      vis.crossBadgeX.append('text').attr('fill', '#ffffff').attr('font-size', '10px').attr('font-weight', '600').attr('text-anchor', 'middle');

      vis.crossBadgeY = vis.crosshairG.append('g').style('display', 'none');
      vis.crossBadgeY.append('rect').attr('rx', 4).attr('fill', '#1d1d1f').attr('opacity', 0.9);
      vis.crossBadgeY.append('text').attr('fill', '#ffffff').attr('font-size', '10px').attr('font-weight', '600').attr('text-anchor', 'end');

      // Landmark road users with direct, clean labels
      // Offsets verified collision-free (label↔label and label↔bubble) on the log-x layout
      const LANDMARK_OFFSETS = {
        'Pedestrian':    { dx: 0,   dy: -10, anchor: 'middle', useYTop: true },
        'Car driver':    { dx: -12, dy: 4,   anchor: 'end' },
        'Motorcyclist':  { dx: -10, dy: 4,   anchor: 'end' },
        'Car passenger': { dx: 0,   dy: -10, anchor: 'middle', useYTop: true },
        'Pedal cyclist': { dx: 10,  dy: 4,   anchor: 'start' },
      };

      // Low-volume cohorts (labels revealed on hover & in filtered modes)
      const CLUSTER_OFFSETS = {
        'Bus occupant':                 { dx: -10, dy: 4,  anchor: 'end' },
        'Pick-up truck or van occupant':{ dx: 10,  dy: 4,  anchor: 'start' },
        'Heavy transport driver':       { dx: 0,   dy: 16, anchor: 'middle', useYBottom: true },
        'Other or unknown':             { dx: 10,  dy: 4,  anchor: 'start' },
      };

      vis.LABEL_OFFSETS = Object.assign({}, LANDMARK_OFFSETS, CLUSTER_OFFSETS);

      // Cluster Callout Tag (shown only in "All" mode to prevent overlapping)
      const clusterNodes = vis.displayData.filter(d => CLUSTER_OFFSETS[d.user]);
      const clusterTagX = clusterNodes.length ? d3.min(clusterNodes, d => d.px - d.r) : 0;
      const clusterTagY = clusterNodes.length ? d3.min(clusterNodes, d => d.py - d.r) - 8 : 0;
      vis.annotationsG.selectAll('.cluster-tag').data(['\u25BE Low-volume cohorts (4) \u2022 hover to identify'])
        .join('text')
        .attr('class', 'cluster-tag')
        .attr('x', clusterTagX)
        .attr('y', clusterTagY)
        .text(d => d)
        .on('click', () => vis.filterByCohort('freight'));

      // Leader lines + anchor dots for nudged bubbles (true data position)
      vis.leaders = vis.plotG.selectAll('.bubble-leader')
        .data(vis.displayData.filter(d => d.displaced), d => d.user)
        .join('line')
        .attr('class', 'bubble-leader')
        .attr('x1', d => d.tx).attr('y1', d => d.ty)
        .attr('x2', d => d.px).attr('y2', d => d.py)
        .attr('stroke', d => vis.config.colorMap[d.user] || '#0072B2')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.7);

      vis.anchors = vis.plotG.selectAll('.bubble-anchor')
        .data(vis.displayData.filter(d => d.displaced), d => d.user)
        .join('circle')
        .attr('class', 'bubble-anchor')
        .attr('cx', d => d.tx).attr('cy', d => d.ty)
        .attr('r', 2.5)
        .attr('fill', d => vis.config.colorMap[d.user] || '#0072B2');

      // Bubbles
      vis.bubbles = vis.plotG.selectAll('.bubble')
        .data(vis.displayData, d => d.user)
        .join(
          enter => enter.append('circle')
            .attr('class', 'bubble')
            .attr('cx', d => d.px)
            .attr('cy', d => d.py)
            .attr('r', 0)
            .attr('fill', d => vis.config.colorMap[d.user] || '#0072B2')
            .attr('fill-opacity', 0.78)
            .attr('stroke', d => vis.config.colorMap[d.user] || '#0072B2')
            .attr('stroke-width', 2)
            .call(enter => enter.transition().duration(vis.config.duration)
              .attr('r', d => vis.rScale(d.avgBedDays))),
          update => update
            .attr('cx', d => d.px)
            .attr('cy', d => d.py)
            .attr('r', d => d.r),
          exit => exit.remove()
        )
        .on('mouseenter', function (event, d) {
          vis.spotlight(d.user);
        })
        .on('mousemove', function (event) {
          vis.tooltip
            .style('left', `${event.pageX + 16}px`)
            .style('top', `${event.pageY - 30}px`);
        })
        .on('mouseleave', function () {
          vis.resetSpotlight();
        });

      // Labels on bubbles with halo & anti-collision offsets
      vis.bubbleLabels = vis.plotG.selectAll('.bubble-text')
        .data(vis.displayData, d => d.user)
        .join(
          enter => enter.append('text')
            .attr('class', 'bubble-text')
            .attr('x', d => vis.labelX(d))
            .attr('y', d => vis.labelY(d))
            .attr('text-anchor', d => (vis.LABEL_OFFSETS[d.user] ? vis.LABEL_OFFSETS[d.user].anchor : 'middle'))
            .style('fill', d => vis.config.colorMap[d.user] || '#1d1d1f')   // data-driven
            // In "All" mode, only show the 5 landmark labels directly; cluster cohorts are revealed on hover or in filtered mode!
            .style('opacity', d => LANDMARK_OFFSETS[d.user] ? 1 : 0)
            .text(d => d.user),
          update => update
            .attr('x', d => vis.labelX(d))
            .attr('y', d => vis.labelY(d))
            .style('opacity', d => LANDMARK_OFFSETS[d.user] ? 1 : 0),
          exit => exit.remove()
        );
    }

    labelX(d) {
      const cfg = this.LABEL_OFFSETS[d.user] || { dx: 0, anchor: 'middle' };
      if (cfg.anchor === 'end') return d.px - d.r + cfg.dx;
      if (cfg.anchor === 'start') return d.px + d.r + cfg.dx;
      return d.px + cfg.dx;
    }

    labelY(d) {
      const cfg = this.LABEL_OFFSETS[d.user] || { dy: -6 };
      if (cfg.useYTop) return d.py - d.r + cfg.dy;
      if (cfg.useYBottom) return d.py + d.r + cfg.dy;
      return d.py + cfg.dy;
    }

    isAllowed(d) {
      const allowed = this.getAllowedUsers();
      return !allowed || allowed.includes(d.user);
    }

    /**
     * Interactive Spotlight Focus Mode
     */
    spotlight(userName) {
      const vis = this;
      const target = vis.displayData.find(d => d.user === userName);
      if (!target) return;

      // Crosshairs project from the TRUE data position (not the nudged bubble)
      const cx = target.tx;
      const cy = target.ty;

      // Spotlight target bubble and dim others. Only the hovered bubble grows;
      // cohorts hidden by the active filter keep their collapsed size.
      vis.plotG.selectAll('.bubble')
        .transition().duration(200)
        .attr('fill-opacity', d => d.user === userName ? 0.96 : (vis.isAllowed(d) ? 0.08 : 0.05))
        .attr('stroke-width', d => d.user === userName ? 4 : 1)
        .attr('r', d => {
          if (d.user === userName) return d.r * 1.15;
          return vis.isAllowed(d) ? d.r : 3;
        });

      vis.plotG.selectAll('.bubble-leader, .bubble-anchor')
        .transition().duration(200)
        .style('opacity', d => d.user === userName ? 1 : 0.1);

      // Emphasize label and dim others (filtered-out labels stay hidden)
      vis.plotG.selectAll('.bubble-text')
        .transition().duration(200)
        .style('opacity', d => d.user === userName ? 1 : (vis.isAllowed(d) ? 0.08 : 0))
        .style('font-size', d => d.user === userName ? '12.5px' : '11px')
        .style('font-weight', d => d.user === userName ? '700' : '600');

      vis.annotationsG.selectAll('.cluster-tag')
        .transition().duration(200)
        .style('opacity', 0);

      // Draw crosshair projection lines
      vis.crossLineX
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', cy).attr('y2', vis.innerHeight)
        .style('display', null);

      vis.crossLineY
        .attr('x1', 0).attr('x2', cx)
        .attr('y1', cy).attr('y2', cy)
        .style('display', null);

      // X badge (cases)
      const xText = `${fmtComma(target.cases)} cases`;
      vis.crossBadgeX.select('text').text(xText);
      const xBoxWidth = Math.max(70, xText.length * 6.5);
      vis.crossBadgeX.select('rect')
        .attr('x', cx - xBoxWidth / 2).attr('y', vis.innerHeight + 4)
        .attr('width', xBoxWidth).attr('height', 18);
      vis.crossBadgeX.select('text')
        .attr('x', cx).attr('y', vis.innerHeight + 16);
      vis.crossBadgeX.style('display', null);

      // Y badge (rate)
      const yText = `${fmtDec2(target.rate)} / 1k`;
      vis.crossBadgeY.select('text').text(yText);
      const yBoxWidth = Math.max(65, yText.length * 6.8);
      vis.crossBadgeY.select('rect')
        .attr('x', -yBoxWidth - 6).attr('y', cy - 9)
        .attr('width', yBoxWidth).attr('height', 18);
      vis.crossBadgeY.select('text')
        .attr('x', -10).attr('y', cy + 4);
      vis.crossBadgeY.style('display', null);

      // Tooltip Popover
      vis.tooltip.classed('visible', true)
        .html(`
          <div class="tooltip-title">${target.user}</div>
          <div class="tooltip-row"><span>Total Hospitalised:</span> <span class="tooltip-val">${fmtComma(target.cases)}</span></div>
          <div class="tooltip-row"><span>Deaths per 1,000:</span> <span class="tooltip-accent">${fmtDec2(target.rate)}</span></div>
          <div class="tooltip-row"><span>Died Cases:</span> <span class="tooltip-val">${fmtComma(target.deaths)}</span></div>
          <div class="tooltip-row"><span>Avg Inpatient Stay:</span> <span class="tooltip-val">${fmtDec1(target.avgBedDays)} days</span></div>
        `);
    }

    /**
     * Reset Spotlight to Baseline
     */
    resetSpotlight() {
      const vis = this;
      vis.crossLineX.style('display', 'none');
      vis.crossLineY.style('display', 'none');
      vis.crossBadgeX.style('display', 'none');
      vis.crossBadgeY.style('display', 'none');
      vis.tooltip.classed('visible', false);

      const allowed = vis.getAllowedUsers();
      const landmarkUsers = ['Pedestrian', 'Car driver', 'Motorcyclist', 'Pedal cyclist', 'Car passenger'];

      vis.plotG.selectAll('.bubble')
        .transition().duration(250)
        .attr('fill-opacity', d => (!allowed || allowed.includes(d.user)) ? 0.78 : 0.05)
        .attr('stroke-width', 2)
        .attr('r', d => (!allowed || allowed.includes(d.user)) ? d.r : 3);

      vis.plotG.selectAll('.bubble-leader, .bubble-anchor')
        .transition().duration(250)
        .style('opacity', d => (!allowed || allowed.includes(d.user)) ? 1 : 0);

      vis.plotG.selectAll('.bubble-text')
        .transition().duration(250)
        .style('opacity', d => {
          if (!allowed) {
            return landmarkUsers.includes(d.user) ? 1 : 0;
          }
          return allowed.includes(d.user) ? 1 : 0;
        })
        .style('font-size', '11px')
        .style('font-weight', '600');

      vis.annotationsG.selectAll('.cluster-tag')
        .transition().duration(250)
        .style('opacity', !allowed ? 1 : 0);
    }

    /**
     * Filter cohorts interactively
     */
    getAllowedUsers() {
      const vis = this;
      const groups = {
        vulnerable: ['Pedestrian', 'Motorcyclist', 'Pedal cyclist'],
        occupants: ['Car driver', 'Car passenger', 'Bus occupant', 'Pick-up truck or van occupant'],
        freight: ['Heavy transport driver', 'Other or unknown'],
        all: null,
      };
      return groups[vis.activeFilter || 'all'];
    }

    filterByCohort(category) {
      const vis = this;
      vis.activeFilter = category || 'all';
      vis.resetSpotlight();
    }
  }

  // ── Global Export Namespace ──────────────────────────────────
  global.Vis = {
    barGradient,
    BaseChart,
    BarChart,
    LollipopChart,
    StackedBarChart,
    LineChart,
    BubbleChart,
  };

})(typeof window !== 'undefined' ? window : this);

