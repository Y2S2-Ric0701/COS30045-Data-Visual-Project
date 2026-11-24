/* ═══════════════════════════════════════════════════════════════
   summary-charts.js – Evidence charts for "Summary Insights & Policy"
   COS30045 Data Visualisation Project

   Each policy point on the Overview page gets one small chart that
   backs up its claim:
     1. Vulnerable road users → deaths per 1,000 cases by road user
     2. Regional emergency response → deaths per 1,000 by remoteness area
   Uses barGradient() from main-narrative.js (light = less, dark = more),
   the same colour rule as every other bar chart on the site.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const TOP_USERS = ['Pedestrian', 'Car passenger', 'Car driver', 'Motorcyclist', 'Pedal cyclist'];

  let roadUserData = null;
  let remotenessData = null;

  /**
   * Small horizontal bar chart drawn at the container's real pixel width,
   * so the text stays the same readable size on phones and desktops.
   *
   * @param {d3.Selection} parent  element to append into
   * @param {{label: string, value: number}[]} data  already sorted
   * @param {{format: function, subtitle?: string, ariaLabel: string}} opts
   */
  function miniBarChart(parent, data, opts) {
    const width = Math.max(260, Math.round(parent.node().getBoundingClientRect().width));
    const barH = 26;
    const gap = 10;
    const top = opts.subtitle ? 30 : 6;
    const svg = parent.append('svg')
      .attr('role', 'img')
      .attr('aria-label', opts.ariaLabel);

    // Measure the longest label so it never gets clipped on narrow screens
    const probe = svg.append('g');
    let labelW = 0;
    data.forEach(d => {
      const t = probe.append('text').attr('class', 'summary-chart-label').text(d.label);
      labelW = Math.max(labelW, t.node().getComputedTextLength());
    });
    probe.remove();

    const margin = { top, right: 76, bottom: 6, left: Math.ceil(labelW) + 16 };
    const innerW = Math.max(40, width - margin.left - margin.right);
    const height = margin.top + data.length * (barH + gap) - gap + margin.bottom;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    if (opts.subtitle) {
      svg.append('text')
        .attr('class', 'summary-chart-subtitle')
        .attr('x', 0).attr('y', 18)
        .text(opts.subtitle);
    }

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([0, innerW]);
    const color = barGradient(d3.extent(data, d => d.value));

    const row = g.selectAll('g.row')
      .data(data)
      .join('g')
      .attr('class', 'row')
      .attr('transform', (d, i) => `translate(0,${i * (barH + gap)})`);

    row.append('text')
      .attr('class', 'summary-chart-label')
      .attr('x', -10)
      .attr('y', barH / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .text(d => d.label);

    row.append('rect')
      .attr('height', barH)
      .attr('rx', 4)
      .attr('width', d => Math.max(2, x(d.value)))
      .attr('fill', d => color(d.value));

    row.append('text')
      .attr('class', 'summary-chart-value')
      .attr('x', d => x(d.value) + 8)
      .attr('y', barH / 2)
      .attr('dy', '0.35em')
      .text(d => opts.format(d.value));
  }

  function renderRoadUsers() {
    const el = d3.select('#summary-chart-road-users');
    if (el.empty() || !roadUserData) return;
    el.selectAll('*').remove();
    miniBarChart(el, roadUserData, {
      format: v => v.toFixed(1),
      ariaLabel: 'Deaths per 1,000 hospitalised cases: ' +
        roadUserData.map(d => `${d.label} ${d.value.toFixed(1)}`).join(', '),
    });
    if (typeof DataTable !== 'undefined') {
      DataTable.register(el.node(), () => ({
        columns: ['Road user', 'Deaths per 1,000 hospitalised cases'],
        rows: roadUserData.map(d => [d.label, d.value.toFixed(1)]),
      }));
    }
  }

  function renderRemoteness() {
    const el = d3.select('#summary-chart-remoteness');
    if (el.empty() || !remotenessData) return;
    el.selectAll('*').remove();

    // One measure only, so the message reads in a second: Regional is the dark bar
    miniBarChart(el, remotenessData.map(d => ({ label: d.label, value: d.deaths })), {
      format: v => v.toFixed(1),
      ariaLabel: 'Deaths per 1,000 cases: ' +
        remotenessData.map(d => `${d.label} ${d.deaths.toFixed(1)}`).join(', '),
    });
    if (typeof DataTable !== 'undefined') {
      DataTable.register(el.node(), () => ({
        columns: ['Area', 'Deaths per 1,000 cases'],
        rows: remotenessData.map(d => [d.label, d.deaths.toFixed(1)]),
      }));
    }
  }

  function renderAll() {
    renderRoadUsers();
    renderRemoteness();
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Same data and years (2011–2019) as Figures 5.1 and 3.2
    Promise.all([SiteData.severity(), SiteData.remoteness()]).then(([severity, remoteness]) => {
      const years = [PERIOD.first, PERIOD.lastDeath];
      const rate = o => (o.deaths / o.cases) * 1000;

      const byUser = SiteData.sumBy(SiteData.inYears(severity, years), d => d.road_user, ['cases', 'deaths']);
      roadUserData = TOP_USERS
        .map(k => ({ label: roadUserPlural(k), value: rate(byUser.get(k)) }))
        .sort((a, b) => b.value - a.value);

      // Keep the natural city → remote order (it is an ordered category)
      const byArea = SiteData.sumBy(SiteData.inYears(remoteness, years), d => d.remoteness, ['cases', 'deaths']);
      remotenessData = ['Major Cities', 'Regional', 'Remote'].map(a => ({
        label: a === 'Major Cities' ? 'Major cities' : a,
        deaths: rate(byArea.get(a)),
      }));

      renderAll();
      // Re-measure once the web font has loaded (label widths change slightly)
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderAll);
    }).catch(err => console.error('[summary-charts] Failed to load data:', err));

    let lastWidth = window.innerWidth;
    let timer;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      clearTimeout(timer);
      timer = setTimeout(renderAll, 150);
    });
    document.addEventListener('themechange', renderAll);
  });
})();
