# Changes on `rick-UI-minor-fix`: phone layout fixes and data source correction

This file lists what changed in this round, why, and where the code is. The main goal was to make
the site work on a small phone screen (tested at 454 × 784). It also fixes the BITRE data source,
which pointed to a dataset the site does not use.

Everything was checked in headless Chrome at 454 × 784 on all six pages: no text runs past a chart
or off the screen, nothing scrolls sideways, and no script errors appear.

---

## 1. "The story in one chart" on phones (Overview page)

**Problem:** On phones the chart is pinned at the top and the question cards scroll past it. The
cards scrolled *over* the chart, so they covered the bars while you were reading them. Touch
scrolling also ran freely past the questions; there was no stop at each one as there is with a
mouse wheel on desktop.

**Changes**
- **Cards slide under the chart, not over it.** On phones the chart is drawn in front of the cards.
  Each card is read in the space below the chart, then slides behind it. A strip in the page's
  background colour fills the gap between the nav bar and the chart, so cards don't show through
  it. (`src/css/story.css`, the `max-width: 860px` block)
- **Shorter chart on phones**, so there is room to read below it: bar rows went from 30px to 25px.
  On short screens (height 820px or less), the source line under the chart is hidden and the card
  text is slightly smaller (15.5px). (`src/js/scrolly.js`, `src/css/story.css`)
- **One swipe = one question, like desktop.** While the chart is pinned, a swipe moves exactly one
  question and the new card glides to the middle of the space below the chart. A fast flick into
  the section stops on Q1 (or, coming back up, on Q5). Above Q1 and below Q5 the page scrolls
  normally. (`watchTouch()` in `src/js/scrolly.js`)
- **Cards are centred.** On phones a card rests in the middle of the space below the chart. On
  desktop it rests in the middle of the screen, as before. The question also changes at that same
  point. Before, phones used a fixed line 74% of the way down the screen. (`midY()` in
  `src/js/scrolly.js`)
- The wheel and touch code now share the same helpers (`midY`, `offsets`, `glideTo`, `holds`), and
  the wheel also works in a narrow desktop window.

## 2. Charts on phones

Most of these are in the shared `RankedBarChart` (`src/js/vis-story-charts.js`), so they apply to
every figure that uses it: 1.2, 1.3, 2.3, 3.x, 4.x and 5.x.

- **Fig 1.2: reference labels went off the screen.** "All patients together: 65% men" ran past the
  right edge. On phones, a reference label that would run off the edge now flips to the other side
  of its dashed line. If it would then overlap another label, it moves up a row, and its dashed line
  extends up to meet it. The chart's top margin grows to make room.
- **Fig 2.3: rows looked squashed.** Each name sat right on top of its bar. Phone rows are now taller
  (56px → 62px), with a clear gap between the name and the bar.
- **Fig 2.3: names crossed the zero line.** "Ute or van occupants" and "Other or not recorded" ran
  through the solid zero line. On phones, the chart now measures the longest name and moves the
  zero line to its right. It does this by widening the negative side of the same scale (the axis
  now runs −40% to +60%), not by using a separate scale for each side. So bar lengths still compare
  fairly on both sides of zero. Desktop is unchanged.
- **Lines no longer cross text.** Bar names and values are drawn on their own layer, above the zero
  and reference lines (`labelLayer()`), and the outline around them in the card's background colour
  went from 3–3.5px to 5px (`src/css/visualisations.css`). In Fig 1.2 the 50% and 65% dashed lines
  no longer cut through "94% men" and similar values. Clicks still pass through to the bars.
- **Fig 5.1: long axis title.** "Deaths in hospital for every 1,000 patients admitted, 2011–2019"
  now wraps onto two lines. Any long axis title wraps this way (`wrapText()`), and the chart gets
  taller to fit.
- **Axis numbers at the edges.** The first and last axis numbers ("0%", "100%", "12k", "+60%", "50%")
  were cut off by a few pixels. On phones they are now pinned inside the chart (`pinEdgeTicks()`,
  also used by the paired bar chart in Q5).
- **Fig 4.x heatmap.** The last slanted column heading, "Truck/bus", was cut off. The phone right
  margin went from 6px to 20px. (`src/js/charts-characteristics.js`)

## 3. Data source correction

**Problem:** The footer and README listed BITRE's *Road Deaths Australia* annual summaries. That
is a separate police-reported deaths dataset, and no chart on the site uses it.

**Checked:** All the site's data comes from two files in `analysis/dataset/`:
`hospitalisation_injury_publication_sep2023.xlsx` and
`state-and-territory-hospitalisation-injury-publication-2023.xlsx`. Both were published by the
Department of Infrastructure (BITRE's department), as the files' metadata shows. They were built
from AIHW's National Hospital Morbidity Database, according to the data dictionary. They come from
BITRE's **Hospitalised Injury** publication, which lists all four files in `analysis/dataset/`.

**Changes**
- The BITRE entry now reads *Hospitalised Injury* (September 2023 release: national and state and
  territory series, 2011–2021, from AIHW hospital data), linking to
  <https://www.bitre.gov.au/publications/ongoing/hospitalised-injury>.
- Updated in all three places: the Overview footer (`src/index.html`), the footer built for the
  other pages (`src/js/layout.js`), and `README.md`.
- The AIHW entry is unchanged: it is still the original source of the hospital data.

---

## Still to check

- **A real phone, especially an iPhone.** The swipe stops were tested with simulated touch events
  in Chrome. iOS Safari handles momentum scrolling differently.
- **The BITRE link.** It was confirmed through search results, but the BITRE site timed out when
  we tried to open it, so click it once before submitting.
- **Fig 1.2 on phones.** The two reference labels are stacked close together. If that looks busy,
  the phone version could say "All patients: 65% men".
