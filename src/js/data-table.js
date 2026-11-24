/* ═══════════════════════════════════════════════════════════════
   data-table.js – "View as table" under every figure (plan §8)
   Each chart registers a function that returns its current numbers:

     DataTable.register('#chart-gender', () => ({
       columns: ['Road user', 'Share who are men'],
       rows: [['Truck occupants', '94%'], …],
       summary: 'Share of patients who are men: Truck occupants 94%, …',
     }));

   - A native <details> "View as table" sits under the chart, so it works
     with the keyboard and screen readers without extra scripting.
   - The table is built when it is opened and rebuilt when the filter
     changes, so it always matches the chart above it.
   - `summary` becomes the chart's aria-label when the chart has none.
   Charts made with Vis.BaseChart register themselves (vis-components.js).
   ═══════════════════════════════════════════════════════════════ */
const DataTable = (function () {
  'use strict';

  const entries = new Map();   // container element → { provider, details }

  const esc = v => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function captionFor(container) {
    const card = container.closest('.apple-chart-card, .apple-card, section');
    const title = card && card.querySelector('.chart-card-title, .apple-card-title, h2, h3');
    return title ? title.textContent.trim() : 'Chart data';
  }

  function render(entry) {
    let data;
    try { data = entry.provider(); } catch (e) { console.error('[DataTable]', e); return; }
    if (!data) return;

    // Screen-reader summary on the chart itself, unless the chart wrote its own
    const svg = entry.container.querySelector(':scope > svg');
    if (svg && data.summary && (!svg.getAttribute('aria-label') || svg.dataset.autoLabel)) {
      svg.setAttribute('aria-label', data.summary);
      svg.dataset.autoLabel = '1';
    }

    if (!entry.details.open) return;
    const wrap = entry.details.querySelector('.data-table-wrap');
    if (!data.rows || !data.rows.length) {
      wrap.innerHTML = '<p class="data-table-empty">No data for this selection.</p>';
      return;
    }
    const numeric = data.columns.map((c, i) => i > 0);
    wrap.innerHTML = `
      <table class="data-table">
        <caption>${esc(data.caption || captionFor(entry.container))}</caption>
        <thead><tr>${data.columns.map((c, i) => `<th scope="col"${numeric[i] ? ' class="num"' : ''}>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${data.rows.map(r => `<tr>${r.map((v, i) => (i === 0
          ? `<th scope="row">${esc(v)}</th>`
          : `<td class="num">${esc(v)}</td>`)).join('')}</tr>`).join('')}</tbody>
      </table>`;
  }

  function register(target, provider) {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) return;
    let entry = entries.get(container);
    if (entry) { entry.provider = provider; render(entry); return; }

    const details = document.createElement('details');
    details.className = 'data-table-toggle';
    details.innerHTML = `
      <summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5h17v13h-17zM3.5 10h17M3.5 14.5h17M9.5 5.5v13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>View as table</summary>
      <div class="data-table-wrap" tabindex="0" role="region" aria-label="Data table"></div>`;
    // Below the chart and its legend chips, just above the figure's note
    let note = container.nextElementSibling;
    while (note && !note.matches('.chart-note, .chart-source, .data-table-toggle')) note = note.nextElementSibling;
    if (note && !note.matches('.data-table-toggle')) note.insertAdjacentElement('beforebegin', details);
    else container.insertAdjacentElement('afterend', details);
    entry = { container, provider, details };
    entries.set(container, entry);
    details.addEventListener('toggle', () => render(entry));
    // A chart hidden by a view switch (map ↔ bars) hides its table too
    const syncHidden = () => { details.hidden = container.hidden; };
    syncHidden();
    new MutationObserver(syncHidden).observe(container, { attributes: true, attributeFilter: ['hidden'] });
    render(entry);
  }

  /** Rebuild every table (and summary), e.g. after a filter change */
  function refresh() { entries.forEach(render); }

  if (typeof GlobalFilter !== 'undefined') {
    // After the charts have redrawn for the new filter
    GlobalFilter.subscribe(() => setTimeout(refresh, 0));
  }

  return { register, refresh };
})();
