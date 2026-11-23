/* ═══════════════════════════════════════════════════════════════
   site-data.js – Loads the shared data files once and adds them up
   COS30045 Data Visualisation Project

   One folder per question, one CSV ("sheet") per sub-question, all built
   by the KNIME workflow analysis/road_crash_site_data.knwf with the same
   road-user groups and rules. Sub-questions that use exactly the same
   table share one CSV, named "a+b":
     q1_who/1.1_road_users.csv                     year × road user
     q1_who/1.2_men_and_women.csv                  year × road user × sex
     q1_who/1.3_age.csv                            year × road user × age group
     q2_trends/2.1+2.2+2.3_road_users_by_year.csv  year × road user
     q3_where/3.1+3.3_states.csv                   year × state (AIHW state workbook)
     q3_where/3.2_city_or_country.csv              year × road user × remoteness
     q4_crashes/4.1+4.2+4.3_what_they_hit.csv      year × road user × what they hit
     q5_severity/5.1+5.2+5.3_outcomes.csv          year × road user
   3.2, 4.x and 5.x also have cases, deaths (blank after 2019) and bed days.
   ═══════════════════════════════════════════════════════════════ */

const SiteData = (function () {
  'use strict';

  const cache = {};
  const load = name => (cache[name] = cache[name] || d3.csv(`data/${name}.csv`, d3.autoType));

  const roadUsers  = () => load('q1_who/1.1_road_users');
  const sexes      = () => load('q1_who/1.2_men_and_women');
  const ages       = () => load('q1_who/1.3_age');
  const trends     = () => load('q2_trends/2.1+2.2+2.3_road_users_by_year');
  const states     = () => load('q3_where/3.1+3.3_states');
  const remoteness = () => load('q3_where/3.2_city_or_country');
  const crashes    = () => load('q4_crashes/4.1+4.2+4.3_what_they_hit');
  const severity   = () => load('q5_severity/5.1+5.2+5.3_outcomes');

  /** Rows whose year is inside [y0, y1] */
  const inYears = (rows, [y0, y1]) => rows.filter(d => d.year >= y0 && d.year <= y1);

  /** Rows for one road user ('all' keeps every row) */
  const ofRoadUser = (rows, roadUser) =>
    (roadUser && roadUser !== 'all' ? rows.filter(d => d.road_user === roadUser) : rows);

  /**
   * Deaths stop in 2019, so death and hospital-stay charts use only the
   * part of the chosen years up to 2019. Returns null when none is left.
   */
  function deathYears([y0, y1]) {
    if (y0 > PERIOD.lastDeath) return null;
    return [y0, Math.min(y1, PERIOD.lastDeath)];
  }

  /** Sum the given numeric fields, grouped by key(row) → Map(key → {field: sum}) */
  function sumBy(rows, key, fields) {
    const out = new Map();
    rows.forEach(d => {
      const k = key(d);
      if (!out.has(k)) out.set(k, Object.fromEntries(fields.map(f => [f, 0])));
      const o = out.get(k);
      fields.forEach(f => { o[f] += +d[f] || 0; });
    });
    return out;
  }

  /** Deaths per 1,000 hospitalised cases, average stay, … from summed outcome fields */
  function outcomes(o) {
    return {
      cases: o.cases,
      deaths: o.deaths,
      rate: o.cases ? (o.deaths / o.cases) * 1000 : null,
      stay: o.cases ? o.bed_days / o.cases : null,
    };
  }

  return { roadUsers, sexes, ages, trends, states, remoteness, crashes, severity, inYears, ofRoadUser, deathYears, sumBy, outcomes };
})();
