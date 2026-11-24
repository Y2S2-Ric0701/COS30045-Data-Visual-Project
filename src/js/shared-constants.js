/* ═══════════════════════════════════════════════════════════════
   shared-constants.js – Global visual variables & chart config
   COS30045 Data Visualisation Project
   ═══════════════════════════════════════════════════════════════ */

/**
 * Theoretical Color Encoding & Palettes
 * (Munzner 2014, Bertin 1967, Knaflic 2015, Tufte 2001)
 *
 * 1. IDENTITY CHANNEL (Categorical / Qualitative attributes)
 *    - Uses distinct hues (limited to 5–7 colors for discriminability)
 *    - Colour-blind safe (Wong / Okabe-Ito, Nature Methods 2011)
 *    - Never use saturation variation for unordered categories (Expressiveness Principle violation)
 *
 * 2. MAGNITUDE CHANNELS (Ordered / Quantitative attributes)
 *    - Uses luminance / saturation variation to convey "how much"
 *    - Sequential: light-to-dark for counts, rates, and density
 *    - Diverging: two distinct hues diverging from neutral midpoint
 *
 * 3. STORYTELLING & ATTENTION (Knaflic 2015 & Tufte 2001)
 *    - "Muted Baseline + Bold Accent" rule: neutral grey baseline (#888888)
 *      with a single vibrant accent (#D55E00) for pre-attentive focus.
 */
const COLORS = {
  // ── Storytelling: Muted Baseline + Bold Accent (Knaflic 2015) ──
  storytelling: {
    baseline: '#888888',     // Slate grey for contextual / non-essential marks
    baselineLight: '#cbd5e1',// Subtle contextual backdrop
    accent: '#D55E00',       // Bold vermillion / coral for story's core takeaway
    textMuted: '#64748b',    // Neutral labels
  },

  // ── Identity Channel: Categorical (5–7 distinct color-blind safe hues) ──
  categorical: [
    '#0072B2',   // Blue
    '#E69F00',   // Orange
    '#009E73',   // Bluish Green
    '#D55E00',   // Vermillion
    '#56B4E9',   // Sky Blue
    '#CC79A7',   // Reddish Purple
    '#F0E442',   // Yellow
  ],

  // Road-crash severity semantic mapping (ordered categories using luminance)
  severity: {
    minor:    '#F0E442',   // lighter / lower severity
    serious:  '#E69F00',   // medium luminance
    critical: '#D55E00',   // saturated / high severity alert
  },

  // ── Magnitude Channel: Sequential Palette (light to dark for quantitative metrics) ──
  sequentialBlues: [
    '#eff6ff',
    '#bfdbfe',
    '#60a5fa',
    '#2563eb',
    '#1e3a8a',
  ],

  // ── Magnitude Channel: Diverging Palette (e.g., negative vs positive change) ──
  diverging: {
    decrease: '#009E73', // Green (improvement / decrease in injuries)
    neutral:  '#e2e8f0', // Neutral midpoint
    increase: '#D55E00', // Vermillion (worsening / increase in injuries)
  },

  // Legacy mappings for backwards compatibility
  minor:    '#E69F00',
  serious:  '#56B4E9',
  critical: '#D55E00',
  palette: [
    '#0072B2',
    '#E69F00',
    '#009E73',
    '#D55E00',
    '#56B4E9',
    '#CC79A7',
    '#F0E442',
  ],
};

/**
 * Australian state & territory abbreviations → full names.
 * Used to explain jurisdiction codes to readers unfamiliar with Australia.
 */
const STATE_NAMES = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  WA:  'Western Australia',
  SA:  'South Australia',
  TAS: 'Tasmania',
  ACT: 'Australian Capital Territory',
  NT:  'Northern Territory',
};

/** "NSW" → "NSW (New South Wales)"; unknown codes are returned unchanged. */
function stateLabel(code) {
  return STATE_NAMES[code] ? `${code} (${STATE_NAMES[code]})` : code;
}

/* ── One colour per category, used on every page ─────────────────
   A road user (or state, or crash type) keeps the same colour on every
   chart, so a reader who learns "green = cyclists" on page 1 can still
   read it on page 5. Keys match the groups made by the KNIME workflow
   (analysis/road_crash_site_data.knwf). */
const ROAD_USERS = [
  { key: 'Car driver',            plural: 'Car drivers',          color: '#0072B2' },
  { key: 'Motorcyclist',          plural: 'Motorcyclists',        color: '#E69F00' },
  { key: 'Pedal cyclist',         plural: 'Cyclists',             color: '#009E73' },
  { key: 'Car passenger',         plural: 'Car passengers',       color: '#56B4E9' },
  { key: 'Pedestrian',            plural: 'Pedestrians',          color: '#D55E00' },
  { key: 'Truck occupant',        plural: 'Truck occupants',      color: '#CC79A7' },
  { key: 'Ute or van occupant',   plural: 'Ute or van occupants', color: '#7B5EA7' },
  { key: 'Bus occupant',          plural: 'Bus occupants',        color: '#8C564B' },
  { key: 'Other or not recorded', plural: 'Other or not recorded', color: '#94a3b8',
    note: 'Includes car occupants whose seat (driver or passenger) was not recorded' },
];
const ROAD_USER_BY_KEY = new Map(ROAD_USERS.map(r => [r.key, r]));
const roadUserColor = key => (ROAD_USER_BY_KEY.get(key) || {}).color || '#94a3b8';
const roadUserPlural = key => (ROAD_USER_BY_KEY.get(key) || {}).plural || key;

/** What the injured person crashed into (AIHW "counterparty"), in plain words */
const COUNTERPARTIES = [
  { key: 'Car, ute or van',  color: '#0072B2', desc: 'Hit by, or crashed into, a car, ute or van' },
  { key: 'No other vehicle', color: '#E69F00', desc: 'Fell off or lost control; no one else involved' },
  { key: 'Fixed object',     color: '#009E73', desc: 'A tree, pole, wall or barrier' },
  { key: 'Not recorded',     color: '#94a3b8', desc: 'The hospital record does not say' },
  { key: 'Something else',   color: '#CC79A7', desc: 'A motorbike, bicycle, pedestrian, animal, train or other' },
  { key: 'Truck or bus',     color: '#D55E00', desc: 'A heavy truck or a bus' },
];
const COUNTERPARTY_BY_KEY = new Map(COUNTERPARTIES.map(c => [c.key, c]));

/** One identity colour per state / territory (Figure 3.3) */
const STATE_COLORS = {
  NSW: '#0072B2', VIC: '#E69F00', QLD: '#009E73', WA: '#CC79A7',
  SA: '#D55E00', TAS: '#56B4E9', ACT: '#8C564B', NT: '#7B5EA7',
};

/* ── Time periods (stated on every figure) ───────────────────────
   Counts cover 2011–2021. Deaths are only recorded up to mid-2020, so
   every death or hospital-stay figure uses 2011–2019. */
const PERIOD = { first: 2011, last: 2021, lastDeath: 2019 };
const YEARS = d3.range(PERIOD.first, PERIOD.last + 1);
const rangeText = ([y0, y1]) => (y0 === y1 ? `${y0}` : `${y0}–${y1}`);

/**
 * D3 margin convention
 * Provides consistent padding around the plot area for axes and labels.
 */
const MARGIN = { top: 40, right: 30, bottom: 50, left: 60 };

/**
 * Default chart dimensions (used in viewBox calculations).
 * Actual rendering is responsive via SVG viewBox.
 */
const WIDTH  = 1000;
const HEIGHT = 500;

/* Computed inner (plot-area) dimensions */
const INNER_WIDTH  = WIDTH  - MARGIN.left - MARGIN.right;
const INNER_HEIGHT = HEIGHT - MARGIN.top  - MARGIN.bottom;

/**
 * Transition duration in milliseconds for animated updates.
 */
const TRANSITION_MS = 600;
