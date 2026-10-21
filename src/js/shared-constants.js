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
