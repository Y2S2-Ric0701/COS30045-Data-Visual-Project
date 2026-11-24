/* ═══════════════════════════════════════════════════════════════
   global-filter.js – One filter for every chart on the question pages
   COS30045 Data Visualisation Project

   The reader picks a road user and a range of years once, in the bar
   at the top of the page, and every chart on the page follows it.
   Clicking a road user in any chart (bar, line, legend chip) sets the
   same filter, and the choice carries over to the next page.

   Each figure says what it is showing in its "Showing:" line, built
   from two attributes on <p class="figure-scope">:
     data-road-user = "filter"    chart is redrawn for the chosen road user
                      "highlight" every road user stays, the chosen one is highlighted
                      "none"      this data has no road-user split
     data-years     = "counts"    counts for the chosen years
                      "deaths"    deaths / hospital stay: chosen years up to 2019
                      "trend"     all years drawn, chosen years highlighted
                      "change"    change from the first to the last chosen year
   ═══════════════════════════════════════════════════════════════ */

const GlobalFilter = (function () {
  'use strict';

  const STORAGE_KEY = 'roadcrash-filter-v1';
  const DEFAULT = { years: [PERIOD.first, PERIOD.last], roadUser: 'all' };
  const listeners = [];
  let state = restore();
  let slider = null;

  function restore() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && Array.isArray(saved.years) && saved.years.length === 2) {
        const y0 = Math.max(PERIOD.first, Math.min(PERIOD.last, +saved.years[0]));
        const y1 = Math.max(y0, Math.min(PERIOD.last, +saved.years[1]));
        const ru = saved.roadUser === 'all' || ROAD_USER_BY_KEY.has(saved.roadUser) ? saved.roadUser : 'all';
        return { years: [y0, y1], roadUser: ru };
      }
    } catch (e) { /* storage blocked: start from the default */ }
    return { years: [...DEFAULT.years], roadUser: DEFAULT.roadUser };
  }

  function save() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  const get = () => ({ years: [...state.years], roadUser: state.roadUser });
  const isDefault = () => state.roadUser === 'all' &&
    state.years[0] === PERIOD.first && state.years[1] === PERIOD.last;

  function set(partial) {
    const next = Object.assign(get(), partial);
    if (next.years[0] === state.years[0] && next.years[1] === state.years[1] &&
        next.roadUser === state.roadUser) return;
    state = next;
    save();
    syncControls();
    listeners.forEach(fn => fn(get()));
  }

  /** Click a road user in a chart: select it, or clear it if it was already selected */
  function toggleRoadUser(key) {
    set({ roadUser: state.roadUser === key ? 'all' : key });
  }

  /** Call fn(state) now and every time the filter changes */
  function subscribe(fn) {
    listeners.push(fn);
    fn(get());
  }

  // ── "Showing: …" line on each figure ───────────────────────────
  function scopeText(el) {
    const ru = state.roadUser;
    const mode = el.dataset.roadUser || 'filter';
    const yearsMode = el.dataset.years || 'counts';
    let who;
    if (mode === 'none') who = 'All road users (this data is not split by road user)';
    else if (ru === 'all') who = 'All road users';
    else if (mode === 'highlight') who = `All road users, <strong>${roadUserPlural(ru)}</strong> highlighted`;
    else who = `<strong>${roadUserPlural(ru)}</strong> only`;

    let when;
    const yrs = rangeText(state.years);
    if (yearsMode === 'deaths') {
      const dy = SiteData.deathYears(state.years);
      if (!dy) when = '<strong>no death records for 2020–2021</strong>';
      else if (dy[1] < state.years[1]) when = `<strong>${rangeText(dy)}</strong> (deaths after 2019 are not recorded yet)`;
      else when = `<strong>${rangeText(dy)}</strong>`;
    } else if (yearsMode === 'trend') {
      when = isDefault() || (state.years[0] === PERIOD.first && state.years[1] === PERIOD.last)
        ? '<strong>2011–2021</strong>'
        : `2011–2021, <strong>${yrs}</strong> highlighted`;
    } else if (yearsMode === 'change') {
      when = state.years[0] === state.years[1]
        ? `<strong>${yrs}</strong> (pick two or more years to see a change)`
        : `change from <strong>${state.years[0]}</strong> to <strong>${state.years[1]}</strong>`;
    } else {
      when = `<strong>${yrs}</strong>`;
    }
    return `<span class="figure-scope-label">Showing:</span> ${who} · ${when}`;
  }

  function syncScopes() {
    document.querySelectorAll('.figure-scope').forEach(el => { el.innerHTML = scopeText(el); });
    document.body.classList.toggle('is-filtered', !isDefault());
  }

  // ── Road-user legend chips (also a filter) ─────────────────────
  const chipGroups = [];
  function roadUserChips(selector, keys) {
    const box = d3.select(selector);
    if (box.empty()) return;
    box.attr('class', 'road-user-chips').attr('role', 'group')
      .attr('aria-label', 'Road users: click one to filter every chart');
    const list = (keys || ROAD_USERS.map(r => r.key)).map(k => ROAD_USER_BY_KEY.get(k));
    const chips = box.selectAll('button').data(list).join('button')
      .attr('type', 'button').attr('class', 'legend-chip')
      .on('click', (event, d) => toggleRoadUser(d.key));
    chips.selectAll('*').remove();
    chips.append('span').attr('class', 'legend-chip-dot').style('background-color', d => d.color);
    chips.append('span').attr('class', 'legend-chip-label').text(d => d.plural);
    chipGroups.push(chips);
    syncChips();
  }
  function syncChips() {
    chipGroups.forEach(chips => chips
      .classed('active', d => d.key === state.roadUser)
      .classed('is-dimmed', d => state.roadUser !== 'all' && d.key !== state.roadUser)
      .attr('aria-pressed', d => String(d.key === state.roadUser)));
  }

  // ── Year range slider: two draggable buttons on a track ────────
  // Drag a button to move that end of the range. When both sit on the
  // same year they move together. Click the track or a year to move the
  // nearer button there. Keyboard: ←/→, Home, End.
  function yearSlider(container, onChange) {
    const years = YEARS;
    const first = years[0], last = years[years.length - 1];
    const W = 500, H = 56;
    const m = { top: 2, right: 20, bottom: 2, left: 20 };
    const iw = W - m.left - m.right;
    const trackY = 18;
    const R = 12;

    const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${W} ${H}`)
      .attr('class', 'year-slider-svg');
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const x = d3.scalePoint().domain(years).range([0, iw]);
    const yearAt = px => years.reduce((b, y) => Math.abs(x(y) - px) < Math.abs(x(b) - px) ? y : b, first);
    let current = [...state.years];

    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', trackY).attr('y2', trackY)
      .attr('stroke', '#e5e5ea').attr('stroke-width', 4).attr('stroke-linecap', 'round');
    const fill = g.append('line').attr('y1', trackY).attr('y2', trackY)
      .attr('stroke', '#0071e3').attr('stroke-width', 4).attr('stroke-linecap', 'round');
    const ticks = g.selectAll('.year-tick').data(years).join('text').attr('class', 'year-tick')
      .attr('x', d => x(d)).attr('y', trackY + 32).attr('text-anchor', 'middle')
      .style('font-size', '12.5px').text(d => `'${String(d).slice(2)}`);
    g.append('rect').attr('x', -m.left).attr('y', 0).attr('width', W).attr('height', H)
      .attr('fill', 'transparent').style('cursor', 'pointer')
      .on('click', event => {
        const yr = yearAt(d3.pointer(event, g.node())[0]);
        const [a, b] = current;
        const useStart = yr < a || (yr <= b && Math.abs(yr - a) < Math.abs(yr - b));
        apply(useStart ? [yr, b] : [a, yr]);
      });

    const knobs = g.selectAll('.year-knob').data([0, 1]).join('g').attr('class', 'year-knob')
      .attr('tabindex', 0).attr('role', 'slider')
      .attr('aria-valuemin', first).attr('aria-valuemax', last)
      .attr('aria-label', i => (i === 0 ? 'First year' : 'Last year'))
      .style('cursor', 'grab');
    knobs.append('circle').attr('class', 'year-knob-ring').attr('r', R + 4).attr('fill', 'transparent');
    knobs.append('circle').attr('class', 'year-knob-thumb').attr('r', R).attr('fill', '#ffffff')
      .attr('stroke', 'rgba(0,0,0,0.08)').attr('stroke-width', 0.5);

    function paint(r) {
      fill.attr('x1', x(r[0])).attr('x2', x(r[1]));
      ticks.style('fill', d => (d >= r[0] && d <= r[1] ? '#1d1d1f' : '#94a3b8'))
        .style('font-weight', d => (d === r[0] || d === r[1] ? '700' : '400'));
      knobs.attr('transform', i => `translate(${x(r[i])},${trackY})`)
        .attr('aria-valuenow', i => r[i]).attr('aria-valuetext', i => String(r[i]));
    }
    function apply(r) {
      paint(r);
      if (r[0] === current[0] && r[1] === current[1]) return;
      current = r;
      onChange([...r]);
    }

    let together = false;
    knobs.call(d3.drag().container(g.node())
      .on('start', function () { together = current[0] === current[1]; d3.select(this).raise().style('cursor', 'grabbing'); })
      .on('drag', function (event, i) {
        const yr = yearAt(event.x);
        if (together) return apply([yr, yr]);
        const r = [...current];
        r[i] = i === 0 ? Math.min(yr, current[1]) : Math.max(yr, current[0]);
        apply(r);
      })
      .on('end', function () { d3.select(this).style('cursor', 'grab'); }));

    knobs.on('keydown', function (event, i) {
      const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
      let yr;
      if (event.key in step) yr = current[i] + step[event.key];
      else if (event.key === 'Home') yr = first;
      else if (event.key === 'End') yr = last;
      else return;
      event.preventDefault();
      yr = Math.max(first, Math.min(last, yr));
      const crosses = i === 0 ? yr > current[1] : yr < current[0];
      apply(crosses ? [yr, yr] : (i === 0 ? [yr, current[1]] : [current[0], yr]));
    });

    paint(current);
    return { set(r) { current = [...r]; paint(current); } };
  }

  // ── The filter bar itself ──────────────────────────────────────
  function mount(selector) {
    const host = document.querySelector(selector);
    if (!host) return;
    host.className = 'global-filter-wrap';
    // Inside .container so the bar is exactly as wide as the chart cards
    host.innerHTML = `
      <div class="container">
      <div class="global-filter" role="region" aria-label="Filter for every chart on this page">
        <div class="gf-title">
          <span class="gf-headline">Filter every chart</span>
          <span class="gf-hint">Tip: click a road user in any chart. Your choice carries over to the next page.</span>
        </div>
        <label class="gf-field">
          <span class="gf-label">Road user</span>
          <select class="gf-select" id="gf-road-user">
            <option value="all">All road users</option>
            ${ROAD_USERS.map(r => `<option value="${r.key}">${r.plural}</option>`).join('')}
          </select>
        </label>
        <div class="gf-field gf-years">
          <span class="gf-label">Years: <span class="gf-year-readout" id="gf-year-readout" aria-live="polite"></span></span>
          <div class="gf-slider" id="gf-year-slider"></div>
        </div>
        <button type="button" class="gf-reset" id="gf-reset">Reset</button>
      </div>
      </div>`;

    document.getElementById('gf-road-user')
      .addEventListener('change', e => set({ roadUser: e.target.value }));
    document.getElementById('gf-reset')
      .addEventListener('click', () => set({ years: [...DEFAULT.years], roadUser: 'all' }));
    slider = yearSlider('#gf-year-slider', years => set({ years }));
    syncControls();
  }

  function syncControls() {
    const sel = document.getElementById('gf-road-user');
    if (sel) sel.value = state.roadUser;
    const readout = document.getElementById('gf-year-readout');
    if (readout) readout.textContent = rangeText(state.years);
    const reset = document.getElementById('gf-reset');
    if (reset) reset.disabled = isDefault();
    if (slider) slider.set(state.years);
    syncChips();
    syncScopes();
  }

  document.addEventListener('DOMContentLoaded', () => {
    mount('#global-filter');
    syncScopes();
  });

  return { get, set, subscribe, toggleRoadUser, roadUserChips, isDefault };
})();
