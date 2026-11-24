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

  // ── Shareable views (plan §10) ─────────────────────────────────
  // The view lives in the address as a query string, so a link opens the
  // page exactly as it was:  ?ru=Pedal%20cyclist&y=2015-2021&zoom=QLD
  // (# stays free for the in-page section links). A link beats what was
  // saved in this tab.
  function fromUrl() {
    const q = new URLSearchParams(location.search);
    const out = {};
    const ru = q.get('ru');
    if (ru && (ru === 'all' || ROAD_USER_BY_KEY.has(ru))) out.roadUser = ru;
    const m = /^(\d{4})(?:-(\d{4}))?$/.exec(q.get('y') || '');
    if (m) {
      const y0 = Math.max(PERIOD.first, Math.min(PERIOD.last, +m[1]));
      const y1 = Math.max(y0, Math.min(PERIOD.last, +(m[2] || m[1])));
      out.years = [y0, y1];
    }
    return out;
  }

  /** Write the view into the address bar (no new history entry, no reload) */
  function writeUrl(extra = {}) {
    if (!window.history || !history.replaceState) return;
    const q = new URLSearchParams(location.search);
    const isDefaultYears = state.years[0] === PERIOD.first && state.years[1] === PERIOD.last;
    if (state.roadUser === 'all') q.delete('ru'); else q.set('ru', state.roadUser);
    if (isDefaultYears) q.delete('y'); else q.set('y', rangeText(state.years).replace('–', '-'));
    Object.entries(extra).forEach(([k, v]) => (v == null ? q.delete(k) : q.set(k, v)));
    const qs = q.toString().replace(/\+/g, '%20');
    history.replaceState(history.state, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
  }

  /** Read or write one extra part of the view (e.g. the map zoom) */
  function param(name) { return new URLSearchParams(location.search).get(name); }
  function setParam(name, value) { writeUrl({ [name]: value }); }

  function restore() {
    const url = fromUrl();
    if (url.roadUser || url.years) {
      return { years: url.years || [...DEFAULT.years], roadUser: url.roadUser || DEFAULT.roadUser };
    }
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
    if (!playTimer) writeUrl();   // Play steps through years; the address keeps the reader's choice
    syncControls();
    listeners.forEach(fn => fn(get()));
  }

  /** Click a road user in a chart: select it, or clear it if it was already selected */
  function toggleRoadUser(key) {
    set({ roadUser: state.roadUser === key ? 'all' : key });
  }

  /** Call fn(state) now and every time the filter changes */
  // Light / dark switch: let every page redraw (map and heatmap colours)
  document.addEventListener('themechange', () => listeners.forEach(fn => fn(get())));

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
    // Drawn at the slider's real width so the year labels and knobs keep their
    // size on any screen; rebuilt when that width changes.
    const node = d3.select(container).node();
    if (!node) return { set() {} };
    let inner = buildYearSlider(node, onChange);
    let lastW = node.clientWidth, timer = null;
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const w = node.clientWidth;
          if (!w || Math.abs(w - lastW) < 8) return;
          lastW = w;
          const hadFocus = node.contains(document.activeElement);
          node.innerHTML = '';
          inner = buildYearSlider(node, onChange);
          if (hadFocus) { const k = node.querySelector('.year-knob'); if (k) k.focus(); }
        }, 120);
      }).observe(node);
    }
    return { set(r) { inner.set(r); } };
  }

  function buildYearSlider(container, onChange) {
    const years = YEARS;
    const first = years[0], last = years[years.length - 1];
    const W = Math.max(240, Math.min(520, Math.round(container.clientWidth) || 500)), H = 56;
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
      .style('font-size', '12.5px').text(d => `'${String(d).slice(2)}`)
      // Too narrow for 11 labels: show every second year (the chosen range is in the text above)
      .style('display', (d, i) => (iw / (years.length - 1) < 30 && i % 2 ? 'none' : null));
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
    knobs.append('circle').attr('class', 'year-knob-thumb').attr('r', R).style('fill', 'var(--c-knob)')
      .attr('stroke', 'rgba(0,0,0,0.08)').attr('stroke-width', 0.5);

    function paint(r) {
      fill.attr('x1', x(r[0])).attr('x2', x(r[1]));
      ticks.style('fill', d => (d >= r[0] && d <= r[1] ? 'var(--c-ink)' : 'var(--c-muted)'))
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
        <div class="gf-actions">
          <button type="button" class="gf-play" id="gf-play" aria-pressed="false"
                  title="Show each year from ${PERIOD.first} to ${PERIOD.last}, one at a time"></button>
          <button type="button" class="gf-reset" id="gf-reset">Reset</button>
          <button type="button" class="gf-share" id="gf-share" aria-label="Copy link to this view"
                  title="Copy a link that opens this page with the same filter and map zoom">
            <svg class="icon-link" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4L12 18.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <svg class="icon-done" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="gf-share-tip" aria-hidden="true">Link copied</span>
          </button>
          <span class="visually-hidden" id="gf-share-status" aria-live="polite"></span>
        </div>
      </div>
      </div>`;

    document.getElementById('gf-road-user')
      .addEventListener('change', e => set({ roadUser: e.target.value }));
    document.getElementById('gf-reset')
      .addEventListener('click', () => { stopPlay(); set({ years: [...DEFAULT.years], roadUser: 'all' }); });
    slider = yearSlider('#gf-year-slider', years => { stopPlay(); set({ years }); });
    document.getElementById('gf-play').addEventListener('click', () => (playTimer ? stopPlay() : startPlay()));
    document.getElementById('gf-share').addEventListener('click', copyLink);
    paintPlay();
    syncControls();
  }

  // ── Play: step through the years one at a time (plan §6.2) ─────
  // Every chart on the page follows, like a flip-book. Touching the
  // slider or Reset stops it; it ends on the last year.
  const PLAY_STEP_MS = 1100;
  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect fill="currentColor" x="5" y="4" width="5" height="16" rx="1.5"/><rect fill="currentColor" x="14" y="4" width="5" height="16" rx="1.5"/></svg>';
  let playTimer = null;
  let played = false;

  function paintPlay() {
    const btn = document.getElementById('gf-play');
    if (!btn) return;
    const on = !!playTimer;
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = on ? `${ICON_PAUSE}<span>Pause</span>`
      : `${ICON_PLAY}<span>${played ? 'Replay' : 'Play'}<span class="visually-hidden"> each year, ${PERIOD.first} to ${PERIOD.last}</span></span>`;
  }

  function startPlay() {
    let year = PERIOD.first;
    set({ years: [year, year] });
    playTimer = setInterval(() => {
      year += 1;
      if (year > PERIOD.last) { stopPlay(); return; }
      set({ years: [year, year] });
    }, PLAY_STEP_MS);
    played = true;
    paintPlay();
  }

  function stopPlay() {
    if (!playTimer) return;
    clearInterval(playTimer);
    playTimer = null;
    writeUrl();
    paintPlay();
  }

  /** "Copy link": the address already holds the view; copy it and say so */
  let shareTimer = null;
  function copyLink() {
    writeUrl();
    const btn = document.getElementById('gf-share');
    const tip = btn.querySelector('.gf-share-tip');
    const status = document.getElementById('gf-share-status');
    const done = ok => {
      tip.textContent = ok ? 'Link copied' : 'Copy it from the address bar';
      btn.classList.toggle('is-done', ok);
      btn.classList.add('show-tip');
      status.textContent = ok ? 'Link to this view copied' : 'Could not copy; the address bar holds the link';
      clearTimeout(shareTimer);
      shareTimer = setTimeout(() => btn.classList.remove('is-done', 'show-tip'), 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(location.href).then(() => done(true), () => done(false));
    } else done(false);
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

  return { get, set, subscribe, toggleRoadUser, roadUserChips, isDefault, param, setParam };
})();
