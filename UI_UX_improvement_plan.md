# UI/UX Improvement Plan

**Project:** Hospitalised Injuries from Road Crashes in Australia (COS30045, Group 9)
**Written:** 24 Nov 2026 (Week 12)
**Goal:** Make the site look distinctive and feel interactive without losing what already works: answer-first headings, a colour-blind-safe palette, one global filter, and keyboard-accessible charts.

---

## 0. Deadline and scope

| Date | Milestone | What should be done by then |
| :--- | :--- | :--- |
| This week (Stand-Up 4, in-person demo) | Final presentation | **Tier 1** only: the visual refresh and the "wow" moments people see in a demo |
| Fri 4 Dec 2026, 11:59 PM | Process Book + code freeze | **Tier 2**: drill-downs, linked views, dark mode, polish |
| Optional | — | **Tier 3**: stretch ideas, only if time is left |

Each item below is tagged **[T1]**, **[T2]** or **[T3]**. Section 9 gives the build order.

### Progress checklist

Tick an item when it is built **and** checked in the browser. Last updated 24 Nov 2026.

**Tier 1 (demo)**

- [x] 1. Tokens and fonts: "Asphalt & Signal" theme, Barlow Condensed + Public Sans (`css/base.css`, `css/story.css`)
- [x] 2. `js/motion.js`: reveal on scroll, reduced-motion and no-JS fallbacks
- [x] 3. Chart entrances: wipe, map fade-in darkest first, overview bars rise and lines draw
- [x] 4. Map zoom: click a state, + / − / reset, Ctrl + scroll, pinch, keyboard (`js/charts-geography.js`)
- [x] 5. Hero unit chart: "One day on Australian roads", 108 dots by road user
- [x] 6. Count-up numbers and sparklines on the key-number cards
- [x] 7. Nav "Q1–Q5" badges, reading progress bar, route stepper with the car
- [x] 8. Tooltip restyle and screen-edge flipping
- [ ] 8b. Tooltip comparison line ("vs national average", §6.5)
- [x] 9. Play button on the year filter
- [x] 10. Hint chips ("Hover" on desktop, "Tap" on touch screens)
- [x] Meta description fixed (COS30045)

**Added on request**

- [x] Road photos in `src/asset/` (1600px and 3840px for 4K / high-density screens, 800px for cards), credits in every footer and `asset/CREDITS.md`
- [x] Photo behind each page hero and on each question card
- [x] Fit to mobile and desktop: charts draw at the screen's width and switch to a phone layout below 560px (names above bars, key under line charts, slanted heatmap headers, larger map labels). The "swipe sideways" scrolling is gone. Checked at 390, 768 and 1440px with no sideways page scroll.
- [x] Full-width nav (brand at the far left, links and theme button at the far right). It collapses into the menu at 1000px and has tighter links between 1001 and 1120px, so it fits laptop and tablet-landscape widths. The filter's year slider is drawn at its real width and redraws on resize. Checked at 390, 768, 900, 1024, 1180 and 1440px.

**Tier 2 (Process Book)**

- [ ] 11. Per-capita map toggle: **blocked.** Neither workbook in `analysis/dataset` has population or rate data. Adding ABS population would bring in a new source and change the analysis, so it is left out. Possible in-dataset option: a "change since the first year" map view.
- [x] 12. Linked highlight and brushing between charts: road-user and state hover is linked across charts (`js/highlight.js`). In Figure 2.1, dragging along the years sets the year filter.
- [x] 13. Detail panel on click: states (Q3 map and bars) and road users (Q1) open a panel with a sparkline, total, share, rank and change against Australia (`js/detail-panel.js`). It is a bottom sheet on phones; Esc closes it.
- [x] 14. Chapter dividers with waffle charts: an asphalt band, "Pedestrians are 7% of patients but a quarter of deaths in hospital", with two 10×10 waffles computed from the Q5 data for 2011–2019 (`js/chapter-divider.js`). It appears on the Overview before the conclusion and on Question 5 before Figure 5.3.
- [x] 15. Chart annotations: the COVID-19 note on Figure 2.1, and "Biggest rise" notes on Figures 2.2 and 3.3.
- [x] 16. Dark mode: a sun/moon button in the nav, saved per reader. It follows the system setting until the reader chooses. Chart cards turn dim slate in dark mode. Chart text, gridlines and halos follow theme tokens (`--c-*`). The blue scale runs from dim to bright (bigger = brighter), and charts redraw when the theme is switched. The stepper car faces the way it drives, and is lane-yellow in dark mode. The nav and footer follow the theme: frosted paper in light mode, and in dark mode Apple-style glass (translucent blurred panels over a soft glow). Back/Next use SVG arrows that recolour per theme.
- [x] 17. Accessibility pass and "View as table": every figure has a "View as table" toggle (`js/data-table.js`) that follows the filter, and charts without a written description get one from the same numbers.

**Tier 3 (stretch)**

- [x] Hospital stay as days: under Figure 5.2, two-week calendars (one square per day, the last day part-filled) for the longest stay, the chosen road user (or car drivers) and the shortest. They follow the filter.
- [x] Shareable views: the filter and map zoom are kept in the address (`?ru=Pedal%20cyclist&y=2015-2021&zoom=QLD`). A link opens the page in that state, and a "Copy link" button sits in the filter bar.
- [x] Theme switch as headlights: the new theme spreads out from the sun/moon button with a warm flash, using View Transitions. Without View Transitions, or with reduced motion, the theme switches instantly.
- [x] Lane-line parallax: the yellow dashes in the hero and the chapter band slide as you scroll. Off under reduced motion.
- [ ] ~~Car driving along the timeline during Play~~: skipped (it repeats the stepper car).
- [ ] Map morphs into the bar chart (Figure 3.1)
- [ ] "Where do you fit?" personaliser
- [ ] Scrollytelling summary on the Overview

**Constraint:** the stack stays as it is (static HTML + vanilla JS + D3 v7 on Vercel). Everything here can be built with `d3-zoom`, `d3-transition` and `IntersectionObserver`, all of which are already available. **We should not add GSAP, React or a framework.**

---

## 1. What we learned from the reference site

Reference: Group 14, *Tourism Insights* (`group-14-data-visualisation.vercel.app/visualization`), built with Next.js, shadcn/ui and D3. I inspected it through the DOM; screenshots timed out.

### Worth borrowing

| Pattern on their site | How we adapt it |
| :--- | :--- |
| **A big, full-width hero chart.** A stacked area chart of foreign and domestic visitors plus a revenue line is the first thing on the page. | Open with a chart or unit visual instead of a text-only hero (§5.1). |
| **Click a segment to drill down** to a monthly breakdown. | Click a year, state or road user to open a detail panel (§6.4). |
| **A year slider that drives a bubble map**, plus a **legend that works as a filter**. | We already have a year-range slider. Add a ▶ Play button that animates the map from 2011 to 2021, and make every legend chip clickable (§6.2). |
| **Click a region to zoom in**, then hover to see exact values. | Click-to-zoom on the Figure 3.1 choropleth (§6.1). |
| **Reveal on demand.** Airplane icons reveal flight routes, with line thickness for weekly frequency. | Progressive disclosure: hide secondary layers behind a toggle, for example "Show per-capita" or "Show counting-change markers". |
| **A two-step narrative button** ("Discover the Factors" → "Explore the Insights"). | We already have a Back/Next stepper. Restyle it as a road-trip progress bar (§5.4). |

### What we should do better than the reference

- **Interaction help is a long paragraph.** Their main instruction text is about 100 words of "hover here, click there". We should show interaction hints *on* the chart instead: a small hint chip that fades out after the first interaction (§6.6).
- **Generic default look.** They use shadcn defaults: Inter, white and slate, with ColorBrewer Set2. Ours is a generic "Apple" look. We should both move to an identity tied to the topic (§2).
- **No headline takeaway.** Their chart has no answer sentence. We already do this well (`chart-card-answer`), so we keep it and give it more visual weight.
- **Fixed pixel width.** Their main SVG is hard-coded at `width="1425"`. Ours uses `viewBox`, so we keep that.

---

## 2. Theme: "Asphalt & Signal"

**Concept:** the visual language of Australian roads. That means dark asphalt, lane markings, road-sign type, and kilometre markers for wayfinding through the 5 questions. It ties the look to the subject instead of to a tech brand.

**Main rule: dark chrome, light chart canvas.**
- The hero, nav, section dividers and footer use dark asphalt.
- Every chart stays on a warm, light "paper" surface. **Reason:** our Okabe-Ito data colours were picked for light backgrounds. `#0072B2` (Car drivers, NSW) has only **3.4:1** contrast on asphalt, but **5.2:1** on white.

### 2.1 Colour tokens

These replace `--apple-*` in `css/base.css`.

| Token | Hex | Use | Contrast (checked) |
| :--- | :--- | :--- | :--- |
| `--asphalt` | `#15191E` | Hero, nav, footer, chapter dividers | — |
| `--asphalt-2` | `#222831` | Raised surfaces on dark (tooltips, panels) | — |
| `--lane` | `#F5C518` | **Decorative only:** lane lines, progress bar, step markers | 10.8:1 on asphalt |
| `--paper` | `#F7F5F0` | Page background behind chart cards | — |
| `--surface` | `#FFFFFF` | Chart cards | — |
| `--ink` | `#14171A` | Body text | 16.5:1 on paper |
| `--ink-2` | `#4A5058` | Secondary text | 7.5:1 on paper |
| `--ink-on-dark` | `#C9CED6` | Body text on asphalt | 11.2:1 |
| `--story` | `#D55E00` | Story accent **for marks only** (highlighted bar or line) | 3.9:1 on white: fails for text |
| `--story-text` | `#B34700` | Story accent **for text**: answer highlights, badges | 5.5:1 on white ✓ |
| `--story-on-dark` | `#FF8A3D` | Accent text on asphalt | 7.5:1 ✓ |

**Rules**
1. **`--lane` yellow never appears inside a chart.** It is too close to Okabe-Ito orange `#E69F00` (Motorcyclists, VIC) and yellow `#F0E442`. Keeping it out of charts stops a reader from mistaking decoration for data.
2. **Keep the existing data palette** (`ROAD_USERS`, `STATE_COLORS`, `COUNTERPARTIES` in `shared-constants.js`). It is consistent across pages and colour-blind safe, so we don't touch it.
3. **Fix text that uses `#D55E00`** (for example the trend badges and `.tooltip-accent`). Switch it to `--story-text`.
4. **Choropleth ramp:** use the 7-step ColorBrewer *Blues* (`#f7fbff → #08306b`), single hue, with a stepped legend.

### 2.2 Typography

| Role | Font | Why |
| :--- | :--- | :--- |
| Display: hero, chapter titles, big numbers | **Barlow Condensed** 600/700 | Its design draws on highway and road-sign lettering, so it matches the theme. Condensed letters fit large numbers such as "39,505" on mobile. |
| Body and UI | **Public Sans** 400/500/600 | A neutral, very legible sans with a public-sector feel, which suits a public-health message. |
| Figures in charts and tooltips | Public Sans with `font-variant-numeric: tabular-nums` | Digits line up in tooltips and axis labels. No third font needed. |
| Pull-quotes (optional) | **Newsreader** italic | The UI/UX Pro Max "News Editorial" pairing. Use it only for the one-line policy takeaways. |

```html
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Public+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

**Type scale** (fluid, using `clamp`):
- Hero: `clamp(2.75rem, 7vw, 5.5rem)`, Barlow Condensed 700, uppercase, letter-spacing `0.01em`
- Chapter title (H2): `clamp(2rem, 4vw, 3rem)`, Barlow Condensed 600
- Chart answer: `1.25rem`, Public Sans 600. This line is the takeaway, so it should be the boldest text on the card.
- Body: `1.0625rem` / 1.6; chart notes: `0.9375rem`

Sources: UI/UX Pro Max search, `typography` domain ("News Editorial", "Magazine Style", "Dashboard Data"). Barlow Condensed is our own pick for the road theme.

### 2.3 Design elements

| Element | Description |
| :--- | :--- |
| **Lane-line spine** | A dashed vertical yellow line runs down the left edge of the page and fills in as you scroll, so it doubles as the reading-progress bar. On mobile it becomes a 3px progress bar under the nav. |
| **Kilometre-marker question badges** | Q1–Q5 appear as small road-marker posts ("Q3 · WHERE"). They are used in the nav, the stepper and the chapter dividers. |
| **Chapter dividers** | A full-width asphalt band between the hero and the questions grid, and before the conclusion: one huge number plus one sentence. |
| **Chart cards** | White, 16px radius, one 1px border (`#E6E2D8`) and no heavy shadow. On hover, lift 2px and change the border colour. |
| **Signal badges** | Trend badges restyled as small road-sign shapes: ▲ rising (`--story-text`), ▼ falling (`#1B7A4A`). Each badge has an icon as well as colour, so the meaning does not depend on colour alone. |
| **Icons** | Lucide SVG icons (car, bike, footprints, truck, bus) next to road-user labels in legends and tooltips. No emoji. |

---

## 3. Current state audit

| Area | What works | What to improve |
| :--- | :--- | :--- |
| Identity | Clean and calm | The "Apple Design System" look (SF/Inter, `#f5f5f7`) is generic and could be any product |
| Hero | Clear question and jump chips | Text only, with no visual hook in the first 5 seconds |
| Key numbers | Linked to source figures | Static text; no count-up and no visual anchor |
| Map (Fig 3.1) | Keyboard focusable, tooltips, Map/Bar toggle | No zoom (ACT and VIC need call-out lines); shades **raw counts** (see §6.1); no time animation |
| Filters | One global filter that persists across pages | The year slider has no Play; legends are not all clickable |
| Transitions | `TRANSITION_MS = 600`, reduced-motion CSS exists | Charts appear with no entrance; one duration is used for everything |
| Tooltips | Consistent `tipHtml` helper | Plain styling; no comparison context; hover-only on touch devices |
| Page rhythm | Answer-first cards | Every figure uses the same card, so 15 identical blocks feel monotonous |
| Bug | — | `index.html` meta description says **"COS20031 Database Design Project"**. It should say COS30045 Data Visualisation. |

---

## 4. Motion system

We use one small set of motion tokens instead of a single 600 ms value for everything (UI/UX Pro Max `ux` guideline: "Duration Timing").

```css
:root {
  --dur-micro: 150ms;   /* hover, focus, press */
  --dur-ui:    250ms;   /* tooltips, chips, panels opening */
  --dur-data:  600ms;   /* chart updates after a filter change */
  --dur-enter: 900ms;   /* first-time chart entrance */
  --dur-zoom:  750ms;   /* map zoom */
  --ease-out:  cubic-bezier(0.16, 1, 0.3, 1);
  --ease-io:   cubic-bezier(0.65, 0, 0.35, 1);
}
```

In D3: `d3.easeCubicOut` for entrances and `d3.easeCubicInOut` for updates and zoom.

**Motion rules**
1. **Animate when a chart first enters the viewport**, not on page load. Use `IntersectionObserver` with `threshold: 0.3`, run it once, then `unobserve`.
2. **Keyed joins** (`.data(rows, d => d.key)`) on every update, so a bar or line *moves* to its new value instead of being redrawn. This is called object constancy, and it is the strongest reason to animate data.
3. **Animate at most 1–2 things per view.** If a chart is entering, nothing else on screen animates at the same time.
4. **Reduced motion:** wrap everything in one helper:
   ```js
   const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
   const dur = ms => (REDUCED ? 0 : ms);
   ```
   Map zoom then jumps instead of flying, count-ups show the final number, and Play steps through years without tweening.
5. **No-JS fallback:** content is visible by default. The reveal class is added by JS, so nothing stays invisible if the script fails.

### Entrance animation per chart type (from `vis-components.js` / `vis-story-charts.js`)

| Component | Entrance |
| :--- | :--- |
| `BarChart`, `RankedBarChart`, `PairedBarChart` | Bars grow from the baseline, staggered 40 ms in rank order. Value labels fade in at the end. |
| `LineChart`, `TrendLinesChart` | Lines draw left to right (`stroke-dasharray`/`dashoffset`). End labels fade in when each line arrives. |
| `StackedAreaChart`, `StackedBarChart` | Layers rise from 0, bottom layer first |
| `LollipopChart`, `DumbbellChart` | The stick extends, then the dot pops (scale 0 → 1, `easeBackOut(1.2)`, the only bouncy motion on the site) |
| `BubbleChart` | Radius 0 → r, staggered by size, largest first |
| `DonutChart` | Arc sweep with `attrTween` |
| Map | States fade in from light to their colour, in rank order (largest first) |

Implementation: add an `animateIn()` method to `BaseChart` that each subclass overrides, and an `observeEntrance(chart)` helper in a new `js/motion.js`.

---

## 5. Page-level redesign

### 5.1 Home hero [T1]

**Layout:** full-bleed asphalt with a dashed lane line through the middle.

```
┌──────────────────────────────────────────────────────────────┐
│  [nav on asphalt · Q1 Q2 Q3 Q4 Q5 markers]                   │
│                                                              │
│   EVERY 13 MINUTES                                           │
│   SOMEONE IS ADMITTED TO HOSPITAL                            │
│   AFTER A ROAD CRASH IN AUSTRALIA.                           │
│                                                              │
│   ● ● ● ● ● ● ● ● ● ● ● ● ● ●   ← 108 dots = one day          │
│   ● ● ● ● ● ● ● ● ● ● ● ● ● ●     coloured by road user      │
│   ...                             (hover a dot → who)        │
│                                                              │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (lane line) ─ ─ ─ ─ ─ ─ ─ ─ ─ ─         │
│   [ Start the journey ↓ ]   [ Jump to a question ▾ ]         │
└──────────────────────────────────────────────────────────────┘
```

- **The hook number comes from our data:** 39,505 cases in 2021 ÷ 365 ≈ 108 a day, which is about one every 13.3 minutes. Label it "at 2021 rates".
- **Unit chart:** 108 dots, coloured by the 2021 road-user mix using `ROAD_USERS` colours. On hover or tap a dot shows "Cyclist", and a legend sits below. On load the dots fill in one by one over about 1.5 s; with reduced motion they appear at once.
- ~~"Since you opened this page" counter~~: built, then removed. It showed "0 people admitted" for the first 13 minutes, which read as broken.

### 5.2 Key numbers → "Three signs on the road" [T1]

- Three cards styled as road signs, with Barlow Condensed numbers.
- **Count-up** when the card scrolls into view: 1.2 s, `easeCubicOut`, tabular numbers so the width doesn't jump.
- Each card has a small inline sparkline (2011–2021) under the number, drawn with the same line entrance.
- The whole card stays a link to its source figure, as now.

### 5.3 Chapter dividers [T2]

Between sections, a full-width asphalt band with one statement:
> **Pedestrians are 7% of patients but a quarter of deaths in hospital.**

Below it, two 100-square waffle charts side by side, "share of cases" and "share of deaths", with pedestrians filled in `#D55E00`. The comparison is shown visually instead of only being written. This also gives the long pages a visual break.

### 5.4 Navigation and stepper [T1]

- The nav sits on asphalt. Question links become km-marker badges (`Q1 WHO`, `Q2 TRENDS`…), and the current one is outlined in `--lane`.
- The lane-line progress bar (§2.3) is under the nav.
- The Back/Next stepper becomes a road strip with 6 stops (Overview + Q1–Q5). A car icon marks the current page and slides to the next stop on hover over "Next". It keeps the "Next: Question 4 — What did they crash into?" text.

### 5.5 Question pages [T1 for the restyle / T2 for the rest]

- **Hero:** a small asphalt band with the km marker, the question in Barlow Condensed, and the "Short answer" in large `--ink-on-dark` text.
- **Sticky global filter:** keep the existing behaviour. Restyle it as a slim bar that becomes compact once it sticks, showing "Showing: Cyclists · 2015–2021 ✕". Clicking ✕ resets it.
- **Break the card monotony:** alternate layouts. Figure X.1 goes full-bleed and wide. Figure X.2 uses a 60/40 split, with the chart on one side and the answer and "why it matters" on the other. Figure X.3 returns to a standard card.

---

## 6. Interactions

### 6.1 Map zoom and pan, Figure 3.1 [T1]

Built with `d3.zoom()` in `charts-geography.js → drawMap()`.

| Behaviour | Spec |
| :--- | :--- |
| Click a state | Zoom to its bounds (`path.bounds(d)`, 90% fit, `--dur-zoom`). Other states dim to 35% opacity. The detail panel opens (§6.4). |
| Click the same state, press `Esc`, or click Reset | Zoom back out to all of Australia |
| Wheel or pinch | Free zoom, `scaleExtent([1, 8])`, `translateExtent` clamped to the map box. **Ctrl/⌘ + wheel only**, so normal page scrolling isn't hijacked (show a hint: "Use Ctrl + scroll to zoom"). |
| Buttons | `+` / `−` / `⟲ Reset` in the top-right corner, 44×44 px touch targets |
| Keyboard | `Tab` to a state, `Enter` to zoom in, `+`/`-` to zoom, arrow keys to pan, `Esc` to reset (WCAG 2.1.1 Keyboard and 2.5.7 Dragging Movements) |
| Strokes | `vector-effect: non-scaling-stroke` so borders stay 1.2 px at any zoom level |
| Labels | Counter-scale the label font by `1/k` so text stays the same size |
| Small states | When zoomed to VIC or ACT, show their labels inside the shape and hide the call-out lines. Zooming replaces the call-out workaround. |
| Reduced motion | Jump straight to the target transform; no animation |

**Data honesty issue to fix [T2]:** the map shades **raw case counts**. UI/UX Pro Max (`chart` domain) and standard cartography advice say a choropleth should show a *rate*. Otherwise big states look "worse" just because they have more people, and our own "Why it matters" text already admits this.
- Add a toggle on the map: **`Total cases` | `Per 100,000 people`**.
- This needs state population from ABS *National, state and territory population* (2011–2021), joined in the KNIME workflow and exported to `src/data/q3_where/`. This is a natural task for the data lead.
- Keep raw totals in the Map/Bar toggle. A bar chart is the right form for totals.

### 6.2 Time animation: ▶ Play [T1]

- Add a Play/Pause button next to the global year slider.
- Play steps a single year from 2011 to 2021, about 800 ms per year. The map recolours and the line charts move a "current year" marker.
- The large year shows in the corner of the map, in Barlow Condensed at 30% opacity.
- Pause automatically when the user touches any control. Under reduced motion, step without tweening.

### 6.3 Linked views (brushing and linking) [T2]

The README promises this for Prototype 2.
- **Fig 3.1 ↔ Fig 3.3:** hovering a state on the map highlights its line in "Each state over time" and greys the others, and the reverse also works. Use a shared `Highlight` event bus next to `GlobalFilter`, as a hover-only, transient state.
- **Road users:** hovering a road user in any chart highlights that road user in every visible chart on the page. Clicking sets the global filter, which already works.
- **Fig 2.1 brush:** drag across years in the total-trend chart to set the global year range. The slider and the brush stay in sync.

### 6.4 Drill-down detail panel [T2]

This is inspired by the reference site's "click segment → monthly breakdown".
- Clicking a state, a year bar or a road-user bar opens a **side panel**: it slides in from the right on desktop and becomes a bottom sheet on mobile.
- The panel shows a title, a 2011–2021 sparkline, rank, share, the change since 2011, and "Compare with national average" (for example `1.4× national rate`).
- Focus moves into the panel, `Esc` closes it, and focus returns to the clicked mark.

### 6.5 Tooltips [T1]

- **Style:** asphalt `#222831` background, 12px radius, a colour swatch with a road-user icon in the title, and tabular numbers.
- **Content:** value + share + one comparison line, for example "▲ 2.3× the national average" or "+51% since 2011".
- **Position:** offset 14px from the pointer and flip at viewport edges (extend `Vis.placeTip`).
- **Touch:** tap pins the tooltip, tapping elsewhere closes it, and hover-only is never the only way in. Keyboard focus already places the tooltip at the centroid for the map; extend that to every chart.
- **Crosshair** on line charts: a vertical rule snaps to the nearest year, with a single tooltip listing every visible series sorted by value. Fig 3.3 already does this, so reuse it on Figs 2.1 and 2.2.

### 6.6 Hints instead of instruction paragraphs [T1]

- Replace sentences such as "Hover a bar for the number of cases…" in `.chart-note` with a **hint chip** on the chart: `[pointer icon] Tap a state to zoom`, using a Lucide SVG icon, not an emoji.
- The chip pulses once, softly, when the chart enters. It hides after the first interaction, and that is remembered in `sessionStorage`.
- Keep `.chart-note` for data caveats only (missing state, counting changes).

### 6.7 Micro-interactions [T1]

- **Buttons and chips:** press scale 0.97, hover background shift, `--dur-micro`.
- **Segmented controls:** the selection pill *slides* to the chosen segment instead of jumping. This applies to the Map/Bar toggle and the jurisdiction filter.
- **Legend chips:** hover previews the highlight, click toggles. Hidden series show a dashed outline instead of disappearing from the legend.
- **Focus rings:** 3px `#1F6FEB` with a 2px offset, on every interactive element and SVG mark. Never remove them.

### 6.8 Annotations [T2]

- Draw on-chart annotations with a short leader line and a label for: the VIC 2012 and NSW 2017 counting changes, the 2020 COVID dip, and the top riser (cyclists +51%).
- Annotations fade in *after* the chart entrance finishes, so the story arrives in order: data first, then meaning.

---

## 7. Dark mode [T2]

- Tokens are redefined under `@media (prefers-color-scheme: dark)`, with a manual toggle (sun/moon) in the nav saved to `localStorage`.
- **Charts keep a light card surface in dark mode**, either `#F7F5F0` paper or `#ECEAE4`, because of the data-colour contrast issue in §2. The rest of the page goes dark. This is the simplest way to keep the palette valid.
- If full dark charts are wanted later, we would need a dark-tuned palette in which every series is at least 3:1 against `#15191E`. That is out of scope for 4 Dec.

---

## 8. Accessibility and quality checklist

The checklist comes from UI/UX Pro Max (pre-delivery checklist + `ux` domain). Run it before the demo and again before 4 Dec.

- [ ] Text contrast ≥ 4.5:1 (large text ≥ 3:1); chart marks ≥ 3:1 against the card
- [ ] No `#D55E00` used as small text (use `--story-text`)
- [ ] Every chart has an `aria-label` summary (already done for the map, so extend it to all) plus a "View as table" toggle
- [ ] Map is fully usable with keyboard only (§6.1)
- [ ] Every hover interaction also works with tap and with focus
- [ ] Touch targets ≥ 44×44 px (slider handles, zoom buttons, legend chips)
- [ ] `prefers-reduced-motion` turns off entrances, zoom flights, count-ups and Play tweening
- [ ] No horizontal scroll at 375 px; check at 375, 768, 1024 and 1440 px
- [ ] Meaning never depends on colour alone (icons on trend badges, labels on the map, patterns where needed)
- [ ] No layout shift when fonts load (`font-display: swap`, plus `size-adjust` fallback metrics)
- [ ] Meta description fixed (COS30045, not COS20031)

**Usability test tie-in** (for Process Book Section 6). These tasks measure the new features:
1. "Which state had the most injuries per person in 2019?" This tests the per-capita toggle, the slider and zoom.
2. "How did cyclists change since 2011?" This tests the legend click and the tooltip comparison.
3. "Show only Tasmania and read its 2021 value." This tests zoom, the detail panel and keyboard access.

Record task success, time and think-aloud notes before and after the redesign if there is time.

---

## 9. Build order

| # | Task | Files | Tier | Effort |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Swap tokens (§2.1) and fonts (§2.2); fix the meta description | `css/base.css`, all `*.html` `<head>` | T1 | S |
| 2 | Motion tokens + `js/motion.js` (`observeEntrance`, `countUp`, `REDUCED`) | new `js/motion.js`, `css/base.css` | T1 | S |
| 3 | `BaseChart.animateIn()` + entrances for Bar, Line and Map | `js/vis-components.js`, `js/vis-story-charts.js` | T1 | M |
| 4 | Map zoom, buttons and keyboard (§6.1) | `js/charts-geography.js`, `css/visualisations.css` | T1 | M |
| 5 | Home hero: unit chart, hook number, asphalt band (§5.1) | `index.html`, `js/main-narrative.js` | T1 | M |
| 6 | Key-number count-up + sparklines (§5.2) | `index.html`, `js/main-narrative.js` | T1 | S |
| 7 | Nav on asphalt, lane progress bar, road-strip stepper (§5.4) | `js/layout.js`, `css/base.css` | T1 | S |
| 8 | Tooltip restyle + tap-to-pin + edge flip (§6.5) | `js/vis-story-charts.js` (`tipHtml`, `placeTip`), `css/visualisations.css` | T1 | S |
| 9 | Play button on the year slider (§6.2) | `js/global-filter.js` | T1 | S |
| 10 | Hint chips replace instruction text (§6.6) | page HTML, `js/motion.js` | T1 | S |
| 11 | Per-capita data from ABS via KNIME + map toggle | `analysis/*.knwf`, `src/data/q3_where/`, `js/charts-geography.js` | T2 | M |
| 12 | Linked highlight bus + Fig 2.1 brush (§6.3) | new `js/highlight.js`, chart files | T2 | M |
| 13 | Drill-down detail panel (§6.4) | new `js/detail-panel.js`, `css/base.css` | T2 | M |
| 14 | Chapter dividers with waffle charts (§5.3) | `index.html`, `injury-severity.html` | T2 | M |
| 15 | On-chart annotations (§6.8) | chart files | T2 | S |
| 16 | Dark mode + toggle (§7) | `css/base.css`, `js/layout.js` | T2 | S |
| 17 | Accessibility pass + "View as table" for every figure (§8) | all | T2 | M |

S = under 2 hours, M = half a day.

**Suggested split** (matches the README roles; change it as needed):
- **UI/UX lead:** 1, 5, 7, 10, 14, 16, and the §8 checklist
- **Web/D3 lead:** 3, 4, 8, 12, 13
- **Data lead:** 2, 6, 9, 11, 15

---

## 10. Stretch ideas [T3]

- **Scrollytelling on the home page:** a pinned chart whose state changes as each paragraph scrolls past (Q1 → Q5 summary in one graphic). Pin at most one section per page.
- **"Where do you fit?" personaliser:** pick your age group, gender and how you travel, and the site highlights "people like you" in every chart through the global filter.
- **Shareable state:** encode the filter and zoom in the URL hash (`#ru=Pedal%20cyclist&y=2015-2021&zoom=QLD`) so a specific view can be linked in the Process Book and during the demo.
- **Lane-line parallax in the hero:** the dashed lane markings drift slightly as you scroll. This is purely decorative and turned off under reduced motion.

---

## 11. Sources

- Reference site: Group 14, *Tourism Insights*, inspected 24 Nov 2026 (DOM inspection; screenshots timed out).
- UI/UX Pro Max skill (local): `--design-system` and the `typography`, `color`, `chart`, `ux` and `gsap` domain searches. We used its typography pairings, choropleth and map-keyboard guidance, motion timing rules and the pre-delivery checklist. We did not use its generated colour palette, which matched a pharmacy/sales product, or its "conversion" page pattern.
- Contrast ratios computed with the WCAG 2.x relative-luminance formula.
- Okabe, M. & Ito, K. (2008). *Color Universal Design*; Munzner (2014); Knaflic (2015). These are already cited in the site footer.
