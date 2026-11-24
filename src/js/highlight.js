/* ═══════════════════════════════════════════════════════════════
   highlight.js – linked hover between charts (plan §6.3)
   A tiny event bus next to GlobalFilter. GlobalFilter holds the reader's
   choices (they last and carry to the next page); Highlight only holds
   what the pointer is over right now, so it is cleared on mouse-out.

   Channels used on the site:
     'roadUser' – a road-user key such as 'Pedal cyclist'
     'state'    – a state code such as 'NSW'

   Highlight.set(channel, key)  – key or null
   Highlight.on(channel, fn)    – fn(key) on every change
   Highlight.get(channel)
   ═══════════════════════════════════════════════════════════════ */
const Highlight = (function () {
  'use strict';

  const listeners = {};
  const current = {};

  function set(channel, key) {
    const k = key == null ? null : key;
    if (current[channel] === k) return;
    current[channel] = k;
    (listeners[channel] || []).forEach(fn => {
      try { fn(k); } catch (e) { console.error('[Highlight]', e); }
    });
  }

  function on(channel, fn) {
    (listeners[channel] = listeners[channel] || []).push(fn);
  }

  function get(channel) {
    return current[channel] == null ? null : current[channel];
  }

  return { set, on, get };
})();
