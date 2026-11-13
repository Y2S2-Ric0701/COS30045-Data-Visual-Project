# Changes on `ricardo-knime`: readability, colour, responsive and summary update

This file lists what changed on the site in this round, why it changed, and where the code is.
It covers four rounds of feedback: readability and responsiveness; chart interaction and colour;
the Overview page structure and summary charts; and a final clarity pass.

---

## Round 1: Readability, accessibility and device support

### 1. Explaining the state and territory abbreviations

**Problem:** Readers who don't know Australia had no way to tell what NSW, VIC, QLD and so on meant.

**Changes**
- **Filter by Jurisdiction** (Overview page): every button now shows the code *and* the full name
  (for example **NSW** above *New South Wales*). The helper text explains that Australia has six states and
  two territories, together called "jurisdictions".
- **Figure 1 x-axis:** full names were added under each code in round 1, then removed in round 3
  because the filter box already spells them out (see item 7).
- **Tooltips and axis titles** now read "NSW (New South Wales)" instead of just the code.
- **"High-Concentration Region" card:** a "New South Wales & Victoria" caption sits under "NSW & VIC".
- **Conclusion paragraph:** "(NSW, VIC, QLD)" is now spelled out in full.
- **One shared lookup:** `STATE_NAMES` and `stateLabel(code)` were added to `src/js/shared-constants.js`,
  so the full names are defined in one place.

### 2. Larger, clearer text (for older readers)

**Changes** (in `src/css/base.css` and `src/css/visualisations.css`; these apply to every page)
- **Body text:** 15px → 17px. Every other size moved up with it: hero, headings, cards, filter
  buttons, stat cards, footer.
- **Chart legend** (`.chart-legend-box`): 11px → 16px, with 16px colour swatches.
- **Overview chart text:** axis ticks, axis titles, annotations and tooltips are now 15px.
- **Charts on the other pages** (built by `vis-components.js`): text went up by about 1–2px. A
  bigger jump would cut off long category labels such as "Pick-up truck or van occupant".
- **Grey text colour:** darkened from `#86868b` (contrast 3.5:1, below the WCAG AA level for normal text)
  to `#55555a` (about 7:1).

### 3. Age group chart: colour contrast (Who page, Figure 1.1)

**Before:** one blue bar for 40–64 and six faded grey bars, which were hard to tell apart.

**After:** a light-to-dark blue gradient, where darker means more hospitalisations. Each age group
gets its own shade, and the darkest bar (40–64) is still the focus. The description now says
"Darker blue = more hospitalisations."

### 4. Responsive layout: phone, tablet and desktop

- **Navigation:** the page links used to be hidden below 860px with no way to reach them. There is now a
  menu button (three lines) that opens a full-width list of links (`src/js/layout.js`).
- **Overview charts** (`src/js/main-narrative.js`): these now draw at the real width of the screen
  instead of a fixed 1000px canvas, so text stays a readable size on phones. They redraw when the
  window is resized or the phone is rotated.
- **Charts on the other pages:** these keep a minimum width of 680px on small screens and scroll
  sideways inside their card, with a "↔ Swipe sideways to see the full chart" hint. Without this,
  they would shrink until the text was unreadable.
- **Layout breakpoints:** 1024px (tablet), 860px (menu button appears) and 600px (phone). Card padding,
  grids, hero text and the jurisdiction filter (2 columns on phones) all adjust.
- **Tooltips** flip to the left of the pointer when they would run off the right edge of the screen.
- **Checked at:** 390px (phone), 820px (tablet) and 1440px (desktop). No page scrolls sideways at
  any of those widths.

### Bug fixed along the way

`updateSummaryCards()` was replacing the "NSW & VIC" stat with the % change figure. That figure now
goes on the badge of the National Admissions card (`#callout-change`), where it belongs.

---

## Round 2: Chart interaction and colour consistency

### 5. Figure 3.3: hover to read values

**Before:** the line chart had no hover, so readers had to guess values from the gridlines.

**After** (`renderStateTrendsChart` in `src/js/charts-geography.js`):
- Hovering or tapping anywhere on the chart snaps to the nearest year.
- A dashed guide line appears at that year, with a dot on each state's line.
- A tooltip lists all four states for that year, highest first, for example *"2017 hospitalisations:
  NSW – New South Wales 11,016 · VIC – Victoria 10,794 · …"*.
- The chart description now tells readers they can hover or tap.

### 6. Every bar chart uses a gradient, except when a filter selects a bar

**Rule now used across the site:** single-series bar charts are coloured by a light-to-dark blue
gradient (lighter = smaller, darker = larger). When a filter selects one bar, that bar becomes a single
solid colour (orange `#D55E00`) and every other bar fades out.

| Figure | Before | After |
|---|---|---|
| Overview Fig. 1: Injuries by Jurisdiction | Orange top bar + grey bars | Gradient. A filtered state turns solid orange and the others fade |
| 1.1 Age Group | Gradient (round 1) | Same gradient range as all the others |
| 2.2 Injury Count | Gradient (narrow range) | Shared higher-contrast gradient |
| 3.1 State and Territory | Gradient (narrow range) | Shared higher-contrast gradient |
| 3.2 Metro vs Regional | Gradient (narrow range) | Shared higher-contrast gradient |
| 5.1 Mortality Rate | Orange Pedestrian bar + grey bars | Gradient (Pedestrian is still the darkest) |
| 5.2 Length of Stay | Orange Pedestrian bar + grey bars | Gradient |

- **One shared gradient:** `Vis.barGradient(domain)` in `src/js/vis-components.js` (`d3.interpolateBlues`
  from 0.3 to 1.0). The Overview page doesn't load `vis-components.js`, so `main-narrative.js` has a
  copy with the same range.
- **Figure 1 legend:** it changes with the filter. With no filter it shows a "Fewer ▬ More hospitalisations"
  gradient key. With a state selected it shows "Selected: QLD (Queensland)" and "Other jurisdictions".

**Charts left as they were, and why:** in some charts the colour stands for a category, not an amount.
These are Overview Fig. 2 (Minor / Serious / Critical), 1.2 (Male / Female), 2.3 and 4.2 (stacked
compositions), and 1.3 (lollipop chart, whose road-user colours match the 5.3 bubble chart).
A value gradient there would break their legends. The severity tiers already run light to dark
(yellow → orange → vermillion), so they still read as ordered.

---

## Round 3: Overview page structure and summary evidence

### 7. Figure 1 x-axis back to codes only

The full state names under the Figure 1 x-axis were removed, because the jurisdiction filter directly
above already spells every code out. This also makes room for the bottom of the chart.

### 8. The filter visibly belongs to Figures 1 and 2

The jurisdiction filter controls **both** Overview charts. In Figure 1 the selected bar turns orange;
in Figure 2 only that jurisdiction's severity numbers are shown. Before, this wasn't obvious, so:
- **One panel:** the filter, Figure 1 and Figure 2 now sit inside a single tinted panel
  (`.explore-group`, `#explore`) titled **"Compare States and Territories"**.
- **Filter heading:** now reads *"Filter by Jurisdiction — updates Figure 1 and Figure 2 below"*.
- **"Showing" badge on each figure:** *"Showing: All of Australia · Change ↑"* sits under each
  figure's title. It turns orange and names the jurisdiction when a filter is on, and "Change ↑" jumps back
  to the filter (`updateFilterScope()` in `main-narrative.js`).
- **Figure 2 description:** rewritten to say it shows the whole country or the selected jurisdiction.

### 9. Hero chips are now working links

The three pills under the Overview title ("AIHW & BITRE Official Data", "2015–2023 Reporting Window",
and the blue "Munzner & Tufte Visual Encoding") looked like buttons but did nothing, and the blue one
looked "selected" for no reason.
- **Now:** **Key Statistics ↓**, **Compare States ↓** and **Policy Insights ↓**, all the same style,
  which jump to those sections. This matches the clickable chips on the question pages.
- **Source and reporting window:** moved to a plain text line underneath ("Data: AIHW & BITRE · Reporting
  window 2015–2023"), where "AIHW & BITRE" links to the references in the footer.
- **Jump targets:** `scroll-padding-top` was added so jumps land below the sticky navigation bar.

### 10. Evidence charts in "Summary Insights & Policy"

Following the tutor's feedback, each policy point now has a small chart backing it up
(`src/js/summary-charts.js`, same blue gradient rule as the other bar charts):

| Policy point | Chart | Data |
|---|---|---|
| Targeted Vulnerable Road User Infrastructure | Deaths per 1,000 hospitalised cases for pedestrians, car passengers, car drivers, motorcyclists and pedal cyclists | `rq5_mortality_severity.csv` |
| Regional Emergency Response Timing | Two small bar charts comparing Major Cities, Regional and Remote: deaths per 1,000 cases, and average days in hospital | `rq3_remoteness.csv` |

**Text updated to match the data**
- **Road users:** the old text said separated cycling corridors "significantly reduce high-severity
  impacts", but pedal cyclists have the **lowest** death rate (2.0 per 1,000). Pedestrians have the
  highest (21.9, about 4× car drivers). The point now leads with pedestrians, and notes that cycling
  corridors mainly reduce how *often* cyclists are hurt.
- **Regions:** the old text said "non-metro areas", but only **Regional** stands out (5.8 deaths per
  1,000, against 4.7 in major cities and 4.8 in remote areas). The text now says "regional" and quotes the
  numbers.

**Considered but not added: a slope chart of the serious + critical share, 2015 → 2023 by state.**
In `sample_hospitalisation_data.csv` that share is flat at about 40–43% in every state and year, so the
chart would show almost nothing. The file name also suggests it may be placeholder data. That should be
checked before the Overview figures or the "over 40%" claim are presented as real results.

## Round 4: Clarity pass

### 11. Summary Insights & Policy: the "1-second" layout

The two side-by-side cards with long paragraphs and three charts felt cramped. Each insight is now a
full-width row that can be understood at a glance:

| Part | Insight 1 | Insight 2 |
|---|---|---|
| Kicker | Vulnerable road users | Regional areas |
| **Big number** | **4×** | **+23%** |
| One sentence | Once in hospital, pedestrians are about 4 times more likely to die than car drivers. | People injured in regional areas have a 23% higher death rate in hospital than people in major cities. |
| Policy line | → Safer crossings and lower speeds where people walk. | → Faster transfer to trauma centres outside the cities. |
| One chart | Deaths per 1,000 cases by road user (Pedestrian is the darkest bar) | Deaths per 1,000 cases by area (Regional is the darkest bar) |

- **How it reads:** on desktop, the number and sentence sit on the left and the chart on the right.
  Below 860px they stack.
- **Matching colours:** the big number uses the same navy as the darkest bar, so the eye links them.
- **Removed:** the "average days in hospital" chart, so each insight has exactly one chart.
- **Where the numbers come from:** 21.9 ÷ 5.8 ≈ 3.8 ("about 4×"), and 5.81 ÷ 4.71 = 1.23 ("+23%").

### 12. Navbar text matches body text

The navbar brand and page links went from 15–16px to **17px**, the same as body text. On phones, the
links in the drop-down menu are also 17px.

### 13. All chart text kept inside its frame

An automated check went through every chart on all six pages at 1440px, 820px and 390px, comparing each
text label's position with the edge of its chart.
- **Found:** Figure 1.2's "Heavy transport driver" label was cut off (up to 40px past the left edge).
  The legend in Figure 2.1 also crowded the top "16k" tick and the break notes.
- **Fix: labels set their own margin.** `BaseChart.fitLeftMargin()` in `vis-components.js` measures the
  longest category label and widens the left margin when needed. It's turned on for every bar, stacked-bar
  and lollipop chart (`autoFitLabels: true`), so new or renamed categories can't be clipped either.
- **Fix: line chart top margin.** The default is now 56px, so the legend has its own row.
- **Result:** no text extends outside any chart at any of the three widths.

### 14. Figure 1.1: sort by age group or total number

A **Sort by: Age group | Total number** switch was added above the chart.
- **Age group (default):** youngest to oldest, the natural order for ages.
- **Total number:** ranks the groups from most to fewest hospitalisations.
- **Switching:** bars, value labels and axis labels move to their new positions with an animation, and
  the colour gradient stays the same.

### 15. Figure 3.1: abbreviations shown with full names

The y-axis labels now read **"Victoria (VIC)"**, **"Australian Capital Territory (ACT)"** and so on, and
the tooltip title matches. The left margin was widened to fit them. Figure 3.3's hover tooltip uses the
same name list (`STATE_NAMES` in `charts-geography.js`).

---

## Files changed

| File | What changed |
|---|---|
| `src/index.html` | Jurisdiction filter with full names, callout caption, legend, chart descriptions, explore panel, "Showing" badges, hero jump links, summary charts and rewritten policy text |
| `src/js/summary-charts.js` | **New.** Evidence charts for Summary Insights & Policy (one chart per insight) |
| `src/who-is-affected.html` | Figure 1.1 description and sort switch |
| `src/geographic-distribution.html` | Figure 3.1 description, Figure 3.3 hover hint |
| `src/css/base.css` | Font sizes, text contrast, jurisdiction grid, mobile menu, breakpoints, gradient swatch |
| `src/css/visualisations.css` | Chart text sizes, axis sub-labels, mobile chart scrolling |
| `src/js/shared-constants.js` | `STATE_NAMES`, `stateLabel()` |
| `src/js/main-narrative.js` | Responsive Overview charts, gradient/filter colouring, dynamic legend, tooltip edge handling, callout bug fix |
| `src/js/layout.js` | Mobile menu button |
| `src/js/vis-components.js` | `Vis.barGradient()`, configurable `gradientRange`, `fitLeftMargin()` label auto-fit, line chart top margin, animated re-sort |
| `src/js/charts-who-is-affected.js` | Figure 1.1 uses the gradient and has the sort switch |
| `src/js/charts-severity.js` | Figures 5.1 and 5.2 use the gradient |
| `src/js/charts-geography.js` | Shared gradient for 3.1 and 3.2, full-name labels for 3.1, hover read-out for 3.3 |
