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

      vis.innerWidth  = Math.max(0, vis.config.width - vis.config.margin.left - vis.config.margin.right);
      vis.innerHeight = Math.max(0, vis.config.height - vis.config.margin.top - vis.config.margin.bottom);

      vis.svg = container.append('svg')
        .attr('viewBox', `0 0 ${vis.config.width} ${vis.config.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
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
      }, config));
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
      vis.yAxisG.call(d3.axisLeft(vis.yScale).tickSize(0).tickPadding(12))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#1d1d1f');

      vis.xAxisG
        .attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(vis.xScale).ticks(6).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      // Axis Label
      vis.xAxisG.selectAll('.axis-label').data([vis.config.xLabel])
        .join('text')
        .attr('class', 'axis-label')
        .attr('x', vis.innerWidth / 2)
        .attr('y', 38)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '12px')
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
            .attr('fill', d => (vis.config.colorMap && vis.config.colorMap[d.label])
              ? vis.config.colorMap[d.label]
              : (d.label === vis.config.accentKey ? vis.config.accentColor : vis.config.baselineColor))
            .attr('opacity', d => (vis.config.accentKey ? (d.label === vis.config.accentKey ? 0.95 : 0.5) : 0.85))
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
            .attr('opacity', vis.config.accentKey ? (d.label === vis.config.accentKey ? 0.95 : 0.5) : 0.85)
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
              .style('font-size', '11px')
              .style('font-weight', '600')
              .style('fill', '#1d1d1f')
              .text(d => fmtVal(d.value)),
            update => update
              .attr('y', d => vis.yScale(d.label) + vis.yScale.bandwidth() / 2 + 4)
              .attr('x', d => vis.xScale(d.value) + 8)
              .text(d => fmtVal(d.value)),
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

      vis.yAxisG.call(d3.axisLeft(vis.yScale).tickSize(0).tickPadding(12))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#1d1d1f');

      vis.xAxisG
        .attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(vis.xScale).ticks(6).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      vis.xAxisG.selectAll('.axis-title').data([vis.config.xLabel])
        .join('text')
        .attr('class', 'axis-title')
        .attr('x', vis.innerWidth / 2)
        .attr('y', 36)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '11px')
        .style('font-weight', '500')
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
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('fill', '#1d1d1f')
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
        .style('cursor', 'pointer')
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

      vis.yAxisG.call(d3.axisLeft(vis.yScale).tickSize(0).tickPadding(12))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#1d1d1f');

      vis.xAxisG
        .attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(vis.xScale).ticks(5).tickFormat(d3.format('.0%')))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

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
          .style('font-size', '11.5px')
          .style('fill', '#1d1d1f')
          .text(d => d.label);
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
      }, config));
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
              .attr('x', vis.xScale(b.year) + 4)
              .attr('y', 14)
              .style('font-size', '9.5px')
              .style('fill', '#64748b')
              .text(b.label);
          });
      }

      // X-Axis
      vis.xAxisG
        .attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(vis.xScale).ticks(11).tickFormat(d3.format('d')))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

      // Y-Axis
      vis.yAxisG
        .call(d3.axisLeft(vis.yScale).ticks(6).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d))
        .selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#86868b');

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
        .style('cursor', 'pointer')
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
        .style('font-size', '11.5px')
        .style('fill', '#1d1d1f')
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

      vis.xScale = d3.scaleLinear()
        .domain([0, (d3.max(vis.displayData, d => d.cases) || 120000) * 1.15])
        .range([0, vis.innerWidth]);

      vis.yScale = d3.scaleLinear()
        .domain([0, (d3.max(vis.displayData, d => d.rate) || 25) * 1.15])
        .nice()
        .range([vis.innerHeight, 0]);

      vis.rScale = d3.scaleSqrt()
        .domain([0, d3.max(vis.displayData, d => d.avgBedDays) || 10])
        .range([6, 30]);

      // Grid
      vis.gridG.call(
        d3.axisLeft(vis.yScale).ticks(6).tickSize(-vis.innerWidth).tickFormat('')
      ).selectAll('line')
        .attr('stroke', 'rgba(0,0,0,0.06)')
        .attr('stroke-dasharray', '2 4');

      // Quadrants
      vis.annotationsG.selectAll('.quad-x').data([50000])
        .join('line')
        .attr('class', 'quad-x')
        .attr('x1', vis.xScale(50000)).attr('x2', vis.xScale(50000))
        .attr('y1', 0).attr('y2', vis.innerHeight)
        .attr('stroke', 'rgba(0,0,0,0.12)')
        .attr('stroke-dasharray', '4 4');

      vis.annotationsG.selectAll('.quad-y').data([6.0])
        .join('line')
        .attr('class', 'quad-y')
        .attr('x1', 0).attr('x2', vis.innerWidth)
        .attr('y1', vis.yScale(6.0)).attr('y2', vis.yScale(6.0))
        .attr('stroke', 'rgba(0,0,0,0.12)')
        .attr('stroke-dasharray', '4 4');

      // Quadrant labels
      vis.annotationsG.selectAll('.quad-label-ped').data(['Catastrophic Vulnerability (High Mortality, High Stays)'])
        .join('text')
        .attr('class', 'quad-label-ped')
        .attr('x', 14)
        .attr('y', 20)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#D55E00')
        .style('opacity', 0.85)
        .text(d => d);

      vis.annotationsG.selectAll('.quad-label-vol').data(['High-Volume Cohort (Drivers & Motorcyclists)'])
        .join('text')
        .attr('class', 'quad-label-vol')
        .attr('x', vis.innerWidth - 10)
        .attr('y', vis.innerHeight - 15)
        .attr('text-anchor', 'end')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#0072B2')
        .style('opacity', 0.85)
        .text(d => d);

      // Axes
      vis.xAxisG
        .attr('transform', `translate(0,${vis.innerHeight})`)
        .call(d3.axisBottom(vis.xScale).ticks(6).tickFormat(d => d >= 1000 ? `${d / 1000}k` : d))
        .selectAll('text').style('font-size', '11px').style('fill', '#86868b');

      vis.xAxisG.selectAll('.axis-label').data(['Total Hospitalised Cases (2011–2019 Cumulative Volume)'])
        .join('text')
        .attr('class', 'axis-label')
        .attr('x', vis.innerWidth / 2)
        .attr('y', 42)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '12px')
        .text(d => d);

      vis.yAxisG
        .call(d3.axisLeft(vis.yScale).ticks(6))
        .selectAll('text').style('font-size', '11px').style('fill', '#86868b');

      vis.yAxisG.selectAll('.axis-label').data(['In-Hospital Deaths per 1,000 Cases'])
        .join('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -vis.innerHeight / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .style('fill', '#86868b')
        .style('font-size', '12px')
        .text(d => d);

      // Bubbles
      vis.plotG.selectAll('.bubble')
        .data(vis.displayData, d => d.user)
        .join(
          enter => enter.append('circle')
            .attr('class', 'bubble')
            .attr('cx', d => vis.xScale(d.cases))
            .attr('cy', d => vis.yScale(d.rate))
            .attr('r', 0)
            .attr('fill', d => vis.config.colorMap[d.user] || '#0072B2')
            .attr('fill-opacity', 0.75)
            .attr('stroke', d => vis.config.colorMap[d.user] || '#0072B2')
            .attr('stroke-width', 2)
            .call(enter => enter.transition().duration(vis.config.duration)
              .attr('r', d => vis.rScale(d.avgBedDays))),
          update => update
            .attr('cx', d => vis.xScale(d.cases))
            .attr('cy', d => vis.yScale(d.rate))
            .attr('r', d => vis.rScale(d.avgBedDays)),
          exit => exit.remove()
        )
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('fill-opacity', 0.95).attr('stroke-width', 3);
          vis.tooltip.classed('visible', true)
            .html(`
              <div class="tooltip-title">${d.user}</div>
              <div class="tooltip-row"><span>Total Cases (x):</span> <span class="tooltip-val">${fmtComma(d.cases)}</span></div>
              <div class="tooltip-row"><span>Deaths / 1,000 (y):</span> <span class="tooltip-accent">${fmtDec2(d.rate)}</span></div>
              <div class="tooltip-row"><span>Avg Stay (size):</span> <span class="tooltip-val">${fmtDec1(d.avgBedDays)} days</span></div>
            `);
        })
        .on('mousemove', function (event) {
          vis.tooltip
            .style('left', `${event.pageX + 16}px`)
            .style('top', `${event.pageY - 30}px`);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('fill-opacity', 0.75).attr('stroke-width', 2);
          vis.tooltip.classed('visible', false);
        });

      // Labels on bubbles
      vis.plotG.selectAll('.bubble-text')
        .data(vis.displayData, d => d.user)
        .join(
          enter => enter.append('text')
            .attr('class', 'bubble-text')
            .attr('x', d => vis.xScale(d.cases))
            .attr('y', d => vis.yScale(d.rate) - vis.rScale(d.avgBedDays) - 6)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('fill', d => vis.config.colorMap[d.user] || '#1d1d1f')
            .text(d => d.user),
          update => update
            .attr('x', d => vis.xScale(d.cases))
            .attr('y', d => vis.yScale(d.rate) - vis.rScale(d.avgBedDays) - 6),
          exit => exit.remove()
        );
    }
  }

  // ── Global Export Namespace ──────────────────────────────────
  global.Vis = {
    BaseChart,
    BarChart,
    LollipopChart,
    StackedBarChart,
    LineChart,
    BubbleChart,
  };

})(typeof window !== 'undefined' ? window : this);

