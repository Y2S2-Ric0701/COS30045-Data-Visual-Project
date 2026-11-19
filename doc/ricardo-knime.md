# Changes on `ricardo-knime`: readability, colour, responsive and summary update

This file lists what changed on the site in this round, why it changed, and where the code is.
It covers five rounds of feedback: readability and responsiveness; chart interaction and colour;
the Overview page structure and summary charts; a clarity pass; and new chart types and filters.

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
| 2.2 Injury Count | Gradient (narrow range) | Shared higher-contrast gradient (replaced by a dumbbell chart in round 5, item 21) |
| 3.1 State and Territory | Gradient (narrow range) | Shared higher-contrast gradient (now a heat map, round 5, item 17) |
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

*Superseded in round 5: Figure 3.1 is now a map (item 17). The full names moved into its tooltip.*

The y-axis labels now read **"Victoria (VIC)"**, **"Australian Capital Territory (ACT)"** and so on, and
the tooltip title matches. The left margin was widened to fit them. Figure 3.3's hover tooltip uses the
same name list (`STATE_NAMES` in `charts-geography.js`).

### 16. "Look here" highlight after a jump link

When a link scrolls the page to a section, the destination glows blue for **1 second** once the
scroll stops, so the reader knows where to look.
- **Where it works:** every page. That includes the Overview chips (Key Statistics, Compare States, Policy
  Insights), the "Change ↑" badges, the section chips on the question pages, and links arriving from
  another page, such as `injury-severity.html#mortality-risk` from the summary charts.
- **What glows:** the visible card inside the section (chart card, filter box), not the empty wrapper
  around it.
- **Reduced motion:** for readers who have turned on reduced motion in their system settings, a steady
  outline shows for the same second, without the pulse.
- **Code:** `initJumpHighlight()` in `src/js/layout.js` and `.jump-highlight` in `src/css/base.css`. The
  script waits for the smooth scroll to finish before starting the glow.

## Round 5: New chart types and year filters

### 17. Figure 3.1: heat map of Australia

**Before:** a bar chart of 2021 hospitalisations by state and territory.

**After:** a choropleth map in which each state and territory is shaded by its 2021 count (light blue =
fewer, dark blue = more), using the shared `Vis.barGradient()` scale.
- **Labels:** each state shows its code, count and national share. ACT and VIC are too small for text, so
  they get a call-out line into the sea east of the coast. The TAS label sits beside the island.
- **Legend:** a gradient bar under the map, from 710 (NT) to 11,130 (VIC).
- **Hover or Tab key:** the tooltip shows the full name, count, national share and rank out of 8.
- **Map file:** `src/data/australia_states.geojson` (129 KB). It is a public Australian states GeoJSON,
  simplified, with offshore islands such as Lord Howe removed so the map isn't stretched.
- **Caveat for the report:** the map shades raw counts, so states with more people look darker. A rate
  per 100,000 people would be fairer, but the dataset has no population figures.

### 18. Figure 1.1: drag buttons to filter by years

A simple range slider sits under the Sort switch: **"Years: 2011–2021"**, a track with two round buttons,
and the year labels underneath.
- **Drag a button** to move that end of the range. The buttons snap to whole years, and one can't be
  dragged past the other.
- **One year only:** drag either button onto the other one, for example the end button onto 2011.
- **Moving a single year:** when both buttons sit on the same year they act as one button, so one drag
  moves the view straight from 2011 to 2013, with no 2011–2013 step in between.
- **Click the track or a year label** to move the nearer button there. From "2013 only", clicking 2016
  widens the range to 2013–2016.
- **Keyboard:** Tab to a button, then ← → moves it one year, and Home / End jump to 2011 / 2021. If a move
  would cross the other button, both move together. Screen readers announce each button as a slider.
- **Live update:** the age chart, the "Years:" label and the x-axis title change while dragging.
- **Apple-style look:** the buttons copy the macOS / iOS slider: a plain white circle with a soft shadow
  that grows slightly while held, on a thin light-grey track with the selected range in Apple system blue
  (`--apple-blue`, #0071e3). A blue ring shows which button has keyboard focus.
- **Data:** `src/data/rq1_age_group_by_year.csv`, from Table 3 (age group by year) of the AIHW workbook.
  All years together match the old totals exactly. The readout total is 1 lower than the age-group sum
  because one 2014 case has an unknown age.
- **Chart type:** still a bar chart. A filter shows one period at a time, and comparing 7 age groups at
  one point in time is what bars do best. To show change across years, a line chart or an age × year
  heatmap would be better.
- **History:** a year dropdown came first, then a drag-across timeline (D3 brush), then a slider with
  mini bars, a hint line and a reset button. It was cut down to just the slider and year labels so it
  reads at a glance.

### 19. Chart type check: 9 types across the five question pages

| Question | Figures | Chart types |
|---|---|---|
| Q1 Who | 1.1, 1.2, 1.3 | Bar (with year range slider), stacked bar, lollipop |
| Q2 Trends | 2.1, 2.2, 2.3 | Multi-line, **dumbbell** (new), stacked bar |
| Q3 Where | 3.1, 3.2, 3.3 | **Choropleth map** (new), bar, multi-line |
| Q4 Crash | 4.1, 4.2, 4.3 | 100% stacked bar, heatmap, **donut** (new) |
| Q5 Severity | 5.1, 5.2, 5.3 | Bar, bar, bubble |

The nine types are bar, stacked bar, lollipop, line, choropleth map, heatmap, bubble, dumbbell and donut.

### 20. Figure 4.3 was a copy of Figure 4.1, now a donut chart of crash scenario

**Before:** `charts-characteristics.js` drew the Figure 4.1 counterparty chart a second time as a
placeholder, even though the caption promised "traffic vs non-traffic".

**After:** a donut chart of where the 663,023 transport crash cases (2011–2021) happened, from the
"Cause of injury" column of the AIHW raw sheet (`src/data/rq4_crash_scenario.csv`):

| Scenario | Cases | Share | Meaning (AIHW data dictionary) |
|---|---|---|---|
| Traffic | 410,884 | 62.0% | On a public road. This is the data every other figure uses |
| Non-traffic | 169,963 | 25.6% | Road vehicle crash off a public road |
| Unknown traffic | 63,848 | 9.6% | Road setting not recorded |
| Other transport | 18,328 | 2.8% | Water, air and other transport (ICD V90–V99) |

- **Total in the centre,** with a value table on the right that doubles as the legend.
- **Hover** a slice or a table row: it shows deaths per 1,000 cases and average bed days.
- **Point for the report:** the site covers public-road crashes only, which is about 62% of transport
  crash hospitalisations.

### 21. Figure 2.2: dumbbell chart, 2011 vs 2021

**Before:** the caption said "counts and rates over time", and the code worked out the % change, but the
chart only plotted 2021 counts.

**After:** each road user has a grey dot for 2011 and a blue dot for 2021, joined by a line. The label gives
the % change, orange for an increase and green for a decrease, and rows are sorted by change:
pedal cyclists +51.4%, car drivers +21.7%, motorcyclists +17.4%, car passengers −7.4%, pedestrians −15.3%.
Hovering shows both counts and the change.

### 22. Figure 4.2: tidier heatmap and clearer wording

- **Title:** "Counterparty" → **"What Each Road User Collided With"**.
- **Description:** explains that each row adds to 100%, and states the two main findings: pedestrians were
  almost always hit by a car, ute or van (88%), and over 40% of motorcyclist and cyclist injuries involved
  no other vehicle.
- **Column headers:** moved to the top, horizontal and in plain words ("Car, ute or van", "Fixed object
  (tree, pole)", "Not recorded"). Before, they were tilted labels under the chart.
- **Cases column:** each row shows its total number of cases on the right.
- **Largest share outlined:** the biggest cell in each row has a dark outline, so the main pattern stands out.
- **0% cells:** show "–" in grey instead of "0%" in a coloured cell.
- **Hover:** the row and column stay bright and the other cells fade. The tooltip gives the share and the
  approximate number of cases.
- **Legend:** a "Share of row" gradient bar (0–90%) and a key for the outline.

### 23. Bug fixed: bar colours now update with new data

`BarChart.renderVis()` only set bar colours when a bar was first drawn. After a filter changed the values,
the old shades stayed. The update step now sets `fill` and `opacity` too.

---

## Files changed

| File | What changed |
|---|---|
| `src/index.html` | Jurisdiction filter with full names, callout caption, legend, chart descriptions, explore panel, "Showing" badges, hero jump links, summary charts and rewritten policy text |
| `src/js/summary-charts.js` | **New.** Evidence charts for Summary Insights & Policy (one chart per insight) |
| `src/who-is-affected.html` | Figure 1.1 description, sort switch and year range slider |
| `src/geographic-distribution.html` | Figure 3.1 title and description (heat map), Figure 3.3 hover hint |
| `src/trends-over-time.html` | Figure 2.2 title and description (dumbbell) |
| `src/crash-characteristics.html` | Figure 4.2 title and description, Figure 4.3 description |
| `src/css/base.css` | Font sizes, text contrast, jurisdiction grid, mobile menu, breakpoints, gradient swatch, year range slider |
| `src/css/visualisations.css` | Chart text sizes, axis sub-labels, mobile chart scrolling |
| `src/js/shared-constants.js` | `STATE_NAMES`, `stateLabel()` |
| `src/js/main-narrative.js` | Responsive Overview charts, gradient/filter colouring, dynamic legend, tooltip edge handling, callout bug fix |
| `src/js/layout.js` | Mobile menu button, jump-link highlight |
| `src/js/vis-components.js` | `Vis.barGradient()`, configurable `gradientRange`, `fitLeftMargin()` label auto-fit, line chart top margin, animated re-sort, bar colours update with new data, new `DumbbellChart` and `DonutChart` |
| `src/js/charts-who-is-affected.js` | Figure 1.1 uses the gradient, sort switch and two-knob year range slider |
| `src/js/charts-severity.js` | Figures 5.1 and 5.2 use the gradient |
| `src/js/charts-geography.js` | Figure 3.1 heat map, shared gradient for 3.2, hover read-out for 3.3 |
| `src/js/charts-trends.js` | Figure 2.2 dumbbell chart |
| `src/js/charts-characteristics.js` | Figure 4.2 rebuilt heatmap, Figure 4.3 donut chart |
| `src/data/australia_states.geojson` | **New.** State and territory boundaries for the Figure 3.1 map |
| `src/data/rq1_age_group_by_year.csv` | **New.** Age group by year (AIHW Table 3) for the Figure 1.1 year slider |
| `src/data/rq4_crash_scenario.csv` | **New.** Traffic / non-traffic / unknown / other transport totals for Figure 4.3 |
