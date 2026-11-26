/* ═══════════════════════════════════════════════════════════════
   where-you-fit.js – "Where do you fit?" (Overview page)
   COS30045 Data Visualisation Project

   The reader picks how they travel, and optionally their age, sex and
   where they live. Each card then answers one question for that road
   user from the site's own CSVs. The data is split by road user × age,
   road user × sex and road user × area, but never by two of those at
   once, so the cards answer separately instead of combining them.
   Choices are kept in this browser only (localStorage).
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const root = document.getElementById('where-you-fit');
  if (!root || typeof SiteData === 'undefined') return;

  const fmt = d3.format(',');
  const pct = d3.format('.0%');
  const dec1 = d3.format('.1f');
  const signed = v => `${v >= 0 ? '+' : '−'}${pct(Math.abs(v))}`;
  const ordinal = n => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;
  // "the largest" / "the 2nd-largest" / "the smallest"
  const rankWord = (rank, count, most, least) =>
    (rank === 1 ? most : rank === count ? least : `${ordinal(rank)}-${most}`);

  const USERS = ROAD_USERS.filter(r => r.key !== 'Other or not recorded');
  // Age groups and how many single years of age each covers (75+ has no top)
  const AGES = [
    { key: '0-7', label: '0–7', span: 8 }, { key: '8-16', label: '8–16', span: 9 },
    { key: '17-25', label: '17–25', span: 9 }, { key: '26-39', label: '26–39', span: 14 },
    { key: '40-64', label: '40–64', span: 25 }, { key: '65-74', label: '65–74', span: 10 },
    { key: '75+', label: '75 or over', span: null },
  ];
  const SEXES = [{ key: 'Female', label: 'Woman', noun: 'women' }, { key: 'Male', label: 'Man', noun: 'men' }];
  const AREAS = [
    { key: 'Major Cities', label: 'A major city', noun: 'major cities' },
    { key: 'Regional', label: 'A regional area', noun: 'regional areas' },
    { key: 'Remote', label: 'A remote area', noun: 'remote areas' },
  ];
  const SKIP = { key: '', label: 'Rather not say' };

  // Singular names for the travel buttons ("Cyclist", not "Pedal cyclist")
  const SINGULAR = {
    'Car driver': 'Car driver', Motorcyclist: 'Motorcyclist', 'Pedal cyclist': 'Cyclist',
    'Car passenger': 'Car passenger', Pedestrian: 'Pedestrian (walking)', 'Truck occupant': 'In a truck',
    'Ute or van occupant': 'In a ute or van', 'Bus occupant': 'On a bus',
  };
  const QUESTIONS = [
    { id: 'ru', options: USERS.map(u => ({ key: u.key, label: SINGULAR[u.key] || u.key })) },
    { id: 'age', options: [SKIP, ...AGES] },
    { id: 'sex', options: [SKIP, ...SEXES] },
    { id: 'area', options: [SKIP, ...AREAS] },
  ];

  // ── Remembered choices (this browser only) ──
  const STORE = 'fit-choices';
  let choice = { ru: 'Car driver', age: '', sex: '', area: '' };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && USERS.some(u => u.key === saved.ru)) choice = Object.assign(choice, saved);
  } catch (e) { /* private mode: start fresh */ }
  // Once the reader picks anything, their road user becomes the site-wide
  // filter (the same tab storage js/global-filter.js reads), so every chart
  // on the five question pages follows it. Years already chosen are kept.
  function sendToFilter() {
    try {
      const KEY = 'roadcrash-filter-v1';
      const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      const years = saved && Array.isArray(saved.years) ? saved.years : [PERIOD.first, PERIOD.last];
      sessionStorage.setItem(KEY, JSON.stringify({ years, roadUser: choice.ru }));
    } catch (e) { /* storage blocked: the Follow link still carries it */ }
  }
  const remember = () => { try { localStorage.setItem(STORE, JSON.stringify(choice)); } catch (e) { /* ignore */ } };

  // ── Radio buttons, styled as chips ──
  QUESTIONS.forEach(q => {
    const box = root.querySelector(`[data-fit="${q.id}"]`);
    if (!box) return;
    q.options.forEach(o => {
      const label = document.createElement('label');
      label.className = 'fit-option' + (o.key ? '' : ' is-skip');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `fit-${q.id}`;
      input.value = o.key;
      input.checked = choice[q.id] === o.key;
      input.addEventListener('change', () => { choice[q.id] = o.key; remember(); sendToFilter(); render(); });
      if (q.id === 'ru') {
        const dot = document.createElement('span');
        dot.className = 'fit-dot';
        dot.style.background = roadUserColor(o.key);
        dot.setAttribute('aria-hidden', 'true');
        label.append(input, dot, document.createTextNode(o.label));
      } else {
        label.append(input, document.createTextNode(o.label));
      }
      box.appendChild(label);
    });
  });

  // Coming back with the Back button (or a change made on a question
  // page) must show the saved choices, or picking the same option again
  // would not register as a change
  function resync() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (saved && USERS.some(u => u.key === saved.ru)) choice = Object.assign({ ru: 'Car driver', age: '', sex: '', area: '' }, saved);
    } catch (e) { /* ignore */ }
    QUESTIONS.forEach(q => root.querySelectorAll(`input[name="fit-${q.id}"]`).forEach(i => { i.checked = i.value === choice[q.id]; }));
    render();
  }
  window.addEventListener('pageshow', e => { if (e.persisted) resync(); });
  window.addEventListener('storage', e => { if (e.key === STORE) resync(); });

  const results = document.getElementById('fit-results');
  const follow = document.getElementById('fit-follow');
  let data = null;

  Promise.all([SiteData.roadUsers(), SiteData.ages(), SiteData.sexes(), SiteData.remoteness(), SiteData.severity(), SiteData.crashes()])
    .then(([users, ages, sexes, areas, outcomes, crashes]) => {
      data = { users, ages, sexes, areas, outcomes, crashes };
      render();
    })
    .catch(err => {
      console.error('Error loading "Where do you fit?" data:', err);
      results.textContent = 'The numbers could not be loaded.';
    });

  /** One answer card */
  function tile({ kicker, big, text, share, note, prompt }) {
    if (prompt) {
      return `<div class="fit-tile is-prompt"><div class="fit-kicker">${kicker}</div><p class="fit-text">${prompt}</p></div>`;
    }
    const bar = share == null ? '' :
      `<div class="fit-bar" aria-hidden="true"><span style="width:${Math.max(1.5, Math.min(100, share * 100)).toFixed(1)}%"></span></div>`;
    return `<div class="fit-tile">
      <div class="fit-kicker">${kicker}</div>
      <div class="fit-big">${big}</div>
      ${bar}
      <p class="fit-text">${text}</p>
      ${note ? `<p class="fit-note">${note}</p>` : ''}
    </div>`;
  }

  function render() {
    const ru = choice.ru;
    const plural = roadUserPlural(ru);
    const lower = plural.toLowerCase();
    if (follow) {
      follow.href = `who-is-affected.html?ru=${encodeURIComponent(ru)}`;
      follow.textContent = `Follow ${lower} through all five questions →`;
    }
    if (!data) return;
    const { users, ages, sexes, areas, outcomes, crashes } = data;
    const mine = rows => rows.filter(d => d.road_user === ru);
    const first = PERIOD.first, last = PERIOD.last;
    const deathYrs = rangeText([first, PERIOD.lastDeath]);
    const allYrs = rangeText([first, last]);
    const tiles = [];

    // 1. How many, every year
    const byYear = d3.rollup(mine(users), v => d3.sum(v, d => d.hospitalisations), d => d.year);
    const total = d3.sum([...byYear.values()]);
    const everyone = d3.sum(users, d => d.hospitalisations);
    const change = byYear.get(first) ? (byYear.get(last) - byYear.get(first)) / byYear.get(first) : null;
    tiles.push(tile({
      kicker: 'Every year',
      big: fmt(Math.round(total / YEARS.length)),
      share: total / everyone,
      text: `${plural} are hospitalised after a crash in an average year: <strong>${pct(total / everyone)}</strong> of all road-crash patients.`,
      note: change == null ? '' : `${fmt(byYear.get(first))} in ${first}, ${fmt(byYear.get(last))} in ${last} (${signed(change)}).`,
    }));

    // 2. Your age group
    const age = AGES.find(a => a.key === choice.age);
    if (!age) {
      tiles.push(tile({ kicker: 'Your age', prompt: `Pick your age to see how many injured ${lower} are your age.` }));
    } else {
      const sums = d3.rollup(mine(ages).filter(d => d.age_group !== 'Missing'), v => d3.sum(v, d => d.hospitalisations), d => d.age_group);
      const known = d3.sum([...sums.values()]);
      const mineN = sums.get(age.key) || 0;
      const order = [...sums.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
      let note = '';
      if (age.span) {
        // Fair comparison: cases per single year of age, against ages 0–74
        const perAge = mineN / age.span;
        const avg = d3.sum(AGES.filter(a => a.span), a => sums.get(a.key) || 0) / d3.sum(AGES.filter(a => a.span), a => a.span);
        const ratio = avg ? perAge / avg : null;
        if (ratio != null) {
          note = ratio >= 1.15 ? `Per year of age, that is <strong>${dec1(ratio)}×</strong> the average for ${lower} aged 0–74.`
            : ratio <= 0.87 ? `Per year of age, that is <strong>${pct(1 - ratio)} below</strong> the average for ${lower} aged 0–74.`
              : `Per year of age, that is about the average for ${lower} aged 0–74.`;
        }
      }
      tiles.push(tile({
        kicker: `Aged ${age.label}`,
        big: pct(known ? mineN / known : 0),
        share: known ? mineN / known : 0,
        text: `of injured ${lower} are aged ${age.label} (${fmt(mineN)} people, ${allYrs}). The ${rankWord(order.indexOf(age.key) + 1, order.length, 'largest', 'smallest')} of ${order.length} age groups.`,
        note,
      }));
    }

    // 3. Men or women
    const sex = SEXES.find(s => s.key === choice.sex);
    if (!sex) {
      tiles.push(tile({ kicker: 'Men and women', prompt: `Pick your sex to see what share of injured ${lower} are like you.` }));
    } else {
      const share = rows => {
        const known = rows.filter(d => d.sex === 'Female' || d.sex === 'Male');
        const n = d3.sum(known, d => d.hospitalisations);
        return n ? d3.sum(known.filter(d => d.sex === sex.key), d => d.hospitalisations) / n : 0;
      };
      const s = share(mine(sexes));
      tiles.push(tile({
        kicker: sex.key === 'Male' ? 'Men' : 'Women',
        big: pct(s),
        share: s,
        text: `of injured ${lower} are ${sex.noun}, ${allYrs}.`,
        note: `Across all road users: ${pct(share(sexes))}.`,
      }));
    }

    // 4. Where you live: chance of dying once in hospital
    const area = AREAS.find(a => a.key === choice.area);
    const deathRows = SiteData.inYears(mine(areas), [first, PERIOD.lastDeath]);
    const areaSums = SiteData.sumBy(deathRows, d => d.remoteness, ['cases', 'deaths', 'bed_days']);
    const rateOf = k => SiteData.outcomes(areaSums.get(k) || { cases: 0, deaths: 0, bed_days: 0 });
    if (!area) {
      tiles.push(tile({ kicker: 'Where you live', prompt: `Pick where you live to compare ${lower}' chance of dying in hospital with other areas.` }));
    } else {
      const here = rateOf(area.key);
      const other = AREAS.find(a => a.key === (area.key === 'Major Cities' ? 'Regional' : 'Major Cities'));
      const there = rateOf(other.key);
      const small = here.cases < 500;
      tiles.push(tile({
        kicker: `Living in ${area.noun}`,
        big: here.rate == null ? '–' : dec1(here.rate),
        text: here.rate == null ? `No ${lower} from ${area.noun} in the data.`
          : `in every 1,000 hospitalised ${lower} from ${area.noun} died in hospital, against <strong>${there.rate == null ? '–' : dec1(there.rate)}</strong> from ${other.noun} (${deathYrs}).`,
        note: small ? `Only ${fmt(here.cases)} cases, so this number can swing a lot.` : 'The area is where the patient lives, not where the crash was.',
      }));
    }

    // 5. Time in hospital, ranked against the other road users
    const outSums = SiteData.sumBy(SiteData.inYears(outcomes, [first, PERIOD.lastDeath]), d => d.road_user, ['cases', 'deaths', 'bed_days']);
    const stays = USERS.map(u => ({ key: u.key, ...SiteData.outcomes(outSums.get(u.key) || { cases: 0, deaths: 0, bed_days: 0 }) }))
      .filter(d => d.stay != null).sort((a, b) => b.stay - a.stay);
    const me = stays.find(d => d.key === ru);
    if (me) {
      tiles.push(tile({
        kicker: 'If you are hurt',
        big: `${dec1(me.stay)} days`,
        share: me.stay / stays[0].stay,
        text: `is the average hospital stay for ${lower}: the ${rankWord(stays.indexOf(me) + 1, stays.length, 'longest', 'shortest')} of ${stays.length} road users (${deathYrs}).`,
        note: `${dec1(me.rate)} in every 1,000 die in hospital.`,
      }));
    }

    // 6. What they most often crash into (ignoring "not recorded")
    const hits = d3.rollup(mine(crashes).filter(d => d.counterparty !== 'Not recorded'), v => d3.sum(v, d => d.cases), d => d.counterparty);
    const hitTotal = d3.sum([...hits.values()]);
    const [topKey, topN] = [...hits.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    if (topKey) {
      const desc = (COUNTERPARTY_BY_KEY.get(topKey) || {}).desc || topKey;
      tiles.push(tile({
        kicker: 'Most common crash',
        big: pct(topN / hitTotal),
        share: topN / hitTotal,
        text: `of injured ${lower} (where it was recorded): <strong>${desc.charAt(0).toLowerCase()}${desc.slice(1)}</strong>.`,
        note: `<a href="crash-characteristics.html?ru=${encodeURIComponent(ru)}">See every crash type for ${lower} →</a>`,
      }));
    }

    results.innerHTML = tiles.join('');
    results.style.setProperty('--fit-color', roadUserColor(ru));
  }
})();
