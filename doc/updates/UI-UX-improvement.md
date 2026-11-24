# Changes on `UI-UX-improvement`: dark mode, Tier 3 features and a clarity pass

This file lists what changed on the site on this branch, why it changed, and where the code is.
The full plan, with the checklist for every tier, is in `UI_UX_improvement_plan.md` at the repo root.
Tier 1 and Tier 2 of that plan (data tables, chapter band, waffles and the rest) are described there
and are not repeated here.

All numbers come from the CSVs in `src/data/`, which the KNIME workflow builds from `analysis/dataset`.
No other data was added. The site is still static HTML, vanilla JS and D3 v7; no libraries were added.

---

## Round 1: Dark mode, glass and the theme switch

### 1. Charts that suit dark mode

**Problem:** In dark mode the chart cards stayed bright white, the stepper car was black on a dark page,
and several charts kept light-mode colours.

**Changes**
- **Chart colour tokens** (`--c-ink`, `--c-surface`, `--c-grid`, `--c-accent` and others) are defined for both
  themes in `src/css/story.css`. Charts use them through `.style('fill', 'var(--c-…)')`, because an SVG
  `fill` attribute cannot read a CSS variable.
- **Blue scale:** dark mode runs from dim to bright blue (bigger = brighter) instead of light to dark.
  The helpers are `Vis.barGradient`, `Vis.isDark()` and `Vis.textOnGradient()` in `src/js/vis-components.js`.
  Notes that say "darker = more" now switch to "brighter = more" in dark mode (`.when-light` / `.when-dark` spans).
- **Every chart redraws on a theme change** (the `themechange` event from `src/js/theme.js`).
- **The stepper car** got a lighter body, windows and lights in dark mode, and now faces the direction of travel.
  The Back and Next buttons use SVG arrows that change colour with the theme.

### 2. Navbar, footer and glass

- The navbar and footer follow the theme.
- In both themes the navbar uses Apple-style glass (`backdrop-filter: saturate(180%) blur(20px)`).
  The chart cards also use glass in dark mode. Under `prefers-reduced-transparency` they fall back to solid colours.
- The mobile menu uses a solid background, because one blur cannot sit inside another.

### 3. Removed: "Since you opened this page"

The counter on the Overview only counted time in the browser and collected no data. It was removed.

---

## Round 2: Tier 3 UI features

| Feature | What it does | Code |
|---|---|---|
| **Hospital stays as calendars** | Under Figure 5.2: calendar squares (one per day, the last one part-filled) for the longest stay, the chosen road user and the shortest stay. Follows the filter. | `charts-severity.js` (`drawStayCalendars`) |
| **Shareable views** | The filter and the map zoom are kept in the address (`?ru=Pedal%20cyclist&y=2015-2021&zoom=QLD`). A link icon in the filter bar copies the link. | `global-filter.js` |
| **Theme switch with headlights** | The new theme spreads out from the sun/moon button using View Transitions. The navbar stays solid while the effect runs. Instant under reduced motion or in browsers without View Transitions. | `layout.js` (`switchThemeWithHeadlights`), `story.css` |
| **Lane-line parallax** | The yellow dashes in the hero and the chapter band slide as you scroll. Off under reduced motion. | `layout.js` (`laneParallax`) |

Skipped from the plan: a car driving along the timeline, because it repeats the stepper car.

**Fixes from feedback in this round**
- The large faint "2011–2021" behind the map faded up to full strength and then snapped back. It now fades
  straight in at its normal strength (`motion.js`, `fadeIn`).
- The small chart in the state detail panel now shows the year and number when you point at the line.
- The third key-number card showed "Cyclists" as its big number. It now shows **+51%**, with
  "Cyclists: fastest-rising group" above it and "5,391 → 8,163 patients, 2011 to 2021" below.

---

## Round 3: Tier 3 functionality

### 4. The map turns into the bar chart (Figure 3.1)

**Problem:** Switching between Map and Bar chart was an instant swap, so readers lost track of which bar
was which state.

**Changes**
- Each state's outline melts into its bar (and back), biggest state first, changing to the bar's colour as it goes.
- How it works: each outline and each bar are traced as 96 points and lined up so the shapes don't twist, then
  blended on an overlay above the page. The real bars or states appear underneath when the shapes land.
- Off under reduced motion. Clicking again mid-animation is handled.
- Code: `src/js/charts-geography.js` (`mapShapes`, `barShapes`, `alignRing`, `runMorph`, `switchView`).

### 5. "Where do you fit?" (Overview)

**What it is:** the reader picks how they travel. Their age, sex and where they live are optional.
Six cards then answer for that road user:

1. How many are hospitalised in an average year, and their share of all patients.
2. Share of that road user's patients in the reader's age group, plus a fair comparison per year of age.
3. Share who are men or women, against all road users.
4. Deaths in hospital per 1,000 patients in the reader's area, against major cities (or regional areas).
5. Average hospital stay and its rank among the eight road users.
6. The most common kind of crash.

**Why separate answers:** the data is split by road user × age, road user × sex and road user × area,
but never by two of those at once. The cards therefore answer one question each, and the intro says so.

**Carried to the question pages**
- Once the reader picks anything, their road user becomes the site-wide filter on all five question pages.
- Figure 1.3 highlights their age group and Figure 3.2 their area.
- Both figures also have their own chip row ("Highlight your age group", "Highlight where you live"), so the highlight
  can be changed or cleared without going back to the Overview.
- Choices stay in the visitor's browser only (`localStorage`).
- Both pages re-sync when shown again with Back or Forward. Before this fix, picking the same option again after
  going Back did nothing.

Code: `src/js/where-you-fit.js`; the shared helpers (`profile`, `profileChooser`) are in `src/js/global-filter.js`.

### 6. Scrollytelling: "The story in one chart" (Overview)

**What it is:** one chart of the eight road users stays pinned while five steps scroll past. At each step
the bars change what they measure, re-sort, and highlight that step's group:

| Step | Measure | Highlighted |
|---|---|---|
| Q1 Who is hurt the most? | Hospitalised, 2011–2021 | Car drivers (about 1 in 3) |
| Q2 Is it getting worse? | Change 2011 to 2021 | Cyclists, +51% |
| Q3 Where do they live? | Share living outside major cities | Truck occupants, more than half |
| Q4 What did they hit? | Share with no other vehicle involved | Cyclists and motorcyclists |
| Q5 Who is hurt worst? | Deaths per 1,000 patients, 2011–2019 | Pedestrians, 21.8 |

- A dashed line on each step shows all road users together, so it matches the totals on the rest of the site
  (for example +16%). It includes "Other or not recorded".
- On wide screens the chart is pinned in the middle of the screen, level with the active step.
  With a mouse wheel, two notches move one question. Before the first step and after the last, the page
  scrolls normally. Trackpads count distance instead of notches. Keyboard, scrollbar and touch are untouched.
- The axis fades between steps instead of sliding, and nothing moves outside the card.
- On phones the chart pins at the top and the steps scroll over it as cards.
- Screen readers get every value for each step.
- Code: `src/js/scrolly.js`.

---

## Round 4: Clarity pass from review

### Overview

- **Figure 1** labels the three biggest bars plus any selected state. If a full number is wider than a bar's
  slot, all labels switch to the short form ("116k") so they never touch.
- **Figure 1 colour key:** "Fewer … More hospitalisations" now reads
  **"Bar colour: fewer cases [gradient] more cases"**.
- **Figure 2:** each end label is placed above or below the line, whichever keeps it closest to its own dot, so a
  line that climbs steeply at the end (for example the Northern Territory) never runs through it.
- **Story steps:** Q1 is now "Who is hurt the most?". Q3 explains that the dashed line is all patients (32%,
  about 1 in 3). Q5 explains that 21.8 is a rate per 1,000 patients (2.2%), not a count.

### Question pages

| Figure | Problem | Change |
|---|---|---|
| 1.2 Men and women | Bars showed only the men's share, so they looked like "all men". | Each bar is split: men (blue) and women (pink) add up to 100%, labelled for example "94% men · 6% women". Hover dims both parts of the other bars. The dashed lines are now "Half men, half women" and "All patients together: 65% men", and the note explains both. |
| 2.1 Every year | The COVID-19 note ran into the 2021 total. | The 2021 total sits to the right of its dot on two lines; the COVID note sits straight above the 2020 dip. On phones only the note under the chart explains COVID. |
| 2.2 Each road user | No falling line was pointed out, the answer sentence contradicted the chart, and on-chart notes crossed other lines. | The end labels carry "▲ rose most" (cyclists) and "▼ fell most" (bus occupants), outside the plot (just ▲ / ▼ on phones). The answer sentence now matches the data. The note explains how the % is worked out. |
| 2.3 Change ranked | "Ute" and "winners and losers" were unclear. | The note explains what a ute is. The text now says which groups had more and fewer injuries. |
| 2.2 and 3.3 | The dashed-line labels ("VIC count change", "NSW same change") did not say what changed. | The labels now read "2012: VIC / counting change" and "2017: NSW / counting change", and each chart has a "Dashed lines" note: from those years Victoria and NSW stopped counting people treated only in the emergency department, so a fall right after a dashed line is partly a counting change. |
| 3.1 Detail panel | "Tab to it" seemed broken; the chart was two Tab presses away, with nothing visible after the first. | ← → step through the years as soon as the panel opens. The hint now reads "Point at the line, or press ← → to read each year." |
| 3.3 Each state | The on-chart note overlapped the lines. | The note is removed. The description explains the %: (last year − first year) ÷ first year, with Queensland as the example (10,447 − 6,322) ÷ 6,322 = +65%. |
| 4.1 What they hit | "Ute" and "One in four" were unclear. | The note explains what a ute is. The answer now reads "26% of cases (about 1 patient in every 4)". |
| 5.1 Deaths | "21.8" had no clear unit. | Labels read "21.8 per 1,000 (2.2%)", the axis says "for every 1,000 patients admitted", and a note explains the rate: 538 pedestrian deaths among 24,633 admitted, 2011–2019. |

**Shared chart code** (`src/js/vis-story-charts.js`)
- The ranked bar chart has a new `rest` option for split bars (used by Figure 1.2).
- The trend-line chart's `noteRiser` option now tags the end labels instead of drawing notes inside the plot.

---

## Files changed

| File | Why |
|---|---|
| `src/index.html` | Story-in-one-chart section, "Where do you fit?" section, Figure 1 key, story step wording |
| `src/js/scrolly.js` (new) | Scrollytelling chart, step trigger and two-notch wheel stepping |
| `src/js/where-you-fit.js` (new) | "Where do you fit?" cards, saved choices, hand-off to the filter |
| `src/js/global-filter.js` | Shareable views; profile helpers and the highlight chip row |
| `src/js/charts-geography.js` | Map ⇄ bar morph; Figure 3.2 highlight; Figure 3.3 labels |
| `src/js/charts-who-is-affected.js` | Figure 1.2 split bars; Figure 1.3 highlight |
| `src/js/charts-trends.js` | Figure 2.1 COVID note; Figure 2.2 tags, margin and labels |
| `src/js/charts-severity.js` | Stay calendars; Figure 5.1 units |
| `src/js/vis-story-charts.js` | Split-bar option, end-label tags, Figure 2.1 end label |
| `src/js/main-narrative.js` | Overview Figure 1 labels and key; Figure 2 label placement |
| `src/js/detail-panel.js` | Panel sparkline hover and arrow keys |
| `src/css/story.css`, `src/css/visualisations.css` | Theme tokens, glass, and styles for all the features above |
| `who-is-affected.html`, `trends-over-time.html`, `geographic-distribution.html`, `crash-characteristics.html`, `injury-severity.html` (all in `src/`) | Answer sentences and notes |
| `UI_UX_improvement_plan.md` | Tier 3 checklist ticked, with notes |

## How it was checked

- Each change was checked in headless Chrome at desktop (1280 px) and phone (390 px) widths, in light and
  dark mode, with no console errors.
- Every number quoted in the page text was recomputed from the CSVs in `src/data/`.
- Not checked: copying a link in a real browser (headless Chrome has no clipboard access), and how the
  two-notch wheel stepping feels with different mice.
