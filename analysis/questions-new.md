# Research questions (refined)

Reworked from `questions-the-data-answers.md` into the five research questions (RQ1–RQ5) and their
suggested graphs. Source: national workbook `hospitalisation_injury_publication_sep2023.xlsx`, sheet `raw`,
filtered to `Cause of injury = "Traffic"`. Counts, Australia 2011–2021 unless stated.
Figures carried over from the earlier file (checked 27 Oct 2026).

## Read this first: traps that affect the charts

1. **Deaths stop at June 2020.** `Died_cases` is blank from July 2020 onward (not zero). Every
   death or mortality figure (RQ5) must use **2011–2019**. Null `Died_cases` before then means 0.
2. **Age bands have different widths** (40–64 spans 25 years, 17–25 spans 9, 75+ is open-ended).
   The widest band will always look biggest, so add a note or a "cases per year of age" label (RQ1).
3. **Counts, not rates.** There is no population or exposure denominator. "Most hospitalised" is not
   "most at risk". "Deaths per 1,000 hospitalised" is a ratio within the data, so it stays inside the brief.
4. **Two series breaks.** Victoria 2012 and NSW from mid-2017 stopped counting ED-only cases, and this
   is not neutral across road users. Mark both on every time chart (RQ2).
5. **Remoteness is the patient's home**, not the crash site (RQ3).

## What the data can and cannot support

| Suggested graph | Status | Note |
|---|---|---|
| Horizontal bar, donut, lollipop (RQ1) | Supported | Straight group-bys |
| Line, slope, annotated area (RQ2) | Supported | Year × road user |
| Choropleth, proportional symbol map (RQ3) | **Needs the state file** | The national `raw` sheet has no state column. Use `state-and-territory-hospitalisation-injury-publication-2023.xlsx` (its `raw` tab is five tables side by side, so it is messy to parse). State × road user only, with car driver/passenger collapsed |
| Diverging bar, Metro vs Regional (RQ3) | Supported | Remoteness has 5+ levels, so define Metro = Major Cities and Regional = everything else, and say so |
| Treemap, heatmap, Sankey (RQ4) | Supported | Road user × counterparty exists (114 combinations) |
| Ranked bar (RQ5) | Supported | 2011–2019 only |
| **Box plot (RQ5)** | **Not supported as drawn** | Rows are monthly aggregates, not individual patients. Median and outliers of length of stay per patient cannot be computed. See the alternative under RQ5 |
| Bubble chart (RQ5) | Supported | One bubble per road user |

---

## RQ1. Who is most affected by hospitalised road crash injuries?

| Sub-question | Graph | Finding to show |
|---|---|---|
| Which age group is hospitalised most? | Horizontal bar | 40–64 is highest (134,246), then 26–39 (99,795) and 17–25 (89,259). Per year of age, 17–25 is densest (about 9,900 vs 5,400 for 40–64), so add that as a secondary label |
| Men or women? | Donut | Men 65% (268,244), women 35% (144,754). Missing and intersex/indeterminate are tiny, so group them as "Other/missing" and keep them visible |
| Which road user is hospitalised most? | Lollipop | Car driver is largest (33.7% of 2021 cases), then motorcyclist (22.5%) and pedal cyclist (20.7%). Pedestrian is only 5.9% |

Optional extra: stack or colour the lollipop by sex. Heavy transport drivers are 97% male and motorcyclists
90%, while car passengers are mostly women.

## RQ2. How have hospitalised road crash injuries changed between 2011 and 2021?

| Sub-question | Graph | Finding to show |
|---|---|---|
| How have injury counts changed over time? | Line (total plus one line per road user) | Total rose from 34,033 (2011) to 39,505 (2021) |
| Which groups show the largest change? | Slope (2011 → 2021 per road user) | Pedal cyclists **+51%** (5,391 → 8,163), car drivers +22%, motorcyclists +17%. Pedestrians **−15%**, heavy transport drivers −16%, bus occupants −21% |
| Did significant shifts occur during specific years? | Annotated area | Annotate **2012** (Vic ED change), **2017** (NSW ED change) and **2020** (cycling peak of 8,332, pedestrian low of 2,103) |

Caution: because of the series breaks, a dip in one line may be an admin change. Label the break years
rather than hiding them. Counts for small groups (bus, heavy transport) are in the hundreds, so
percentage change there is noisy and should be shown with the raw counts.

## RQ3. Where are hospitalised road crash injuries most common?

| Sub-question | Graph | Finding to show |
|---|---|---|
| Which states have the highest counts? | Choropleth | **Needs the state file.** Not yet analysed. Counts only, so large states will dominate, so state this plainly |
| Metro vs Regional? | Diverging bar | Major Cities hold 66% of cases. Regional is more likely to be fatal (6.9 vs 5.5 deaths per 1,000, 2011–2019) and stays longer (5.5 vs 4.6 bed days per case). Diverging by road user: cyclists and pedestrians are 75%+ Major Cities, heavy transport drivers are 50% Regional |
| Geographic distribution overall? | Proportional symbol map | **Needs the state file**, and the only locations available are state or territory centroids, so this is a coarser version of the choropleth. Consider using one map, not both, or encoding a second variable (such as the share of cyclists or pedestrians) in the symbol |

Decision needed: the two map charts add a second data source and parsing work. If scope is tight, keep
the diverging bar and treat the state view as a stretch goal.

## RQ4. What crash characteristics are associated with hospitalised injuries?

| Sub-question | Graph | Finding to show |
|---|---|---|
| What are the most common collision types? | Treemap (counterparty) | Car/pick-up/van 170,730 (41%), non-collision 108,678 (26%), fixed object 59,019 (14%), other transport 49,547 (12%), heavy vehicle or bus 11,970 (3%) |
| Do collision patterns differ by road user? | Heatmap (road user × counterparty, row-normalised) | Roughly half of all cyclist and motorcyclist injuries involve no other vehicle. Biggest cells: car driver vs car/ute/van (73,930), motorcyclist non-collision (37,983), cyclist non-collision (33,446) |
| How do road users connect to crash scenarios? | Sankey (road user → counterparty) | Same data as the heatmap in flow form. Show only the top links, and group the smallest counterparties into "Other", or it becomes unreadable |

Note: "counterparty" is what the injured person collided with, not who was at fault. The heatmap should be
row-normalised (share within each road user) or large groups will wash out small ones. The Sankey duplicates
the heatmap, so keep it only if it earns its space.

Optional (dropped from the earlier list as a stand-alone chart): seasonality by month is mild, a 13% spread
from June (32,659) to March (37,012), and could be a small side detail.

## RQ5. What are the most severe consequences of hospitalised road crash injuries?

All figures here use **2011–2019**.

| Sub-question | Graph | Finding to show |
|---|---|---|
| Which groups have the highest mortality risk? | Ranked bar (deaths per 1,000 hospitalised) | By age: 75+ **28.1**, 65–74 9.9, all under-65 groups 3.4–6.8. By road user: pedestrian **21.8**, bus occupant 8.0, car passenger 7.3, car driver 5.9, motorcyclist 4.1, cyclist 1.9. By counterparty: heavy vehicle/bus **20.4**, fixed object 8.9, car 7.2 |
| Which injuries require the longest hospital stay? | **Replace the box plot** with a ranked bar or lollipop of mean bed days per case | By age, 75+ averages 9.8 days against 4–5 for under-65s. Pedestrians 9.0 days, cyclists 3.0. A train collision averages 14.5 days and a heavy vehicle 8.4. A box plot is not possible because the data holds no per-patient lengths. If the box plot is still wanted, say it is for a different dataset |
| Volume vs severity? | Bubble (x = cases, y = deaths per 1,000, size = bed days per case, one bubble per road user) | Car drivers have the most cases but sit mid-table on severity. Pedestrians have few cases but are the most severe. Cyclists have many cases and low severity. This is the "aha" chart |

Note: "injuries" in the second sub-question is really "groups". The data has no injury type (fracture, head
injury), only who was hurt and how. Reword it to "Which groups stay in hospital longest?" unless an injury
type column turns out to exist.

---

## Suggested story order

RQ2 (the change over time) → RQ1 (who, linked to the selected road user) → RQ5 bubble (the twist: the biggest
group is not the worst hurt) → RQ4 (how it happens) → RQ3 (where, if the state data is added).

## Open decisions

1. Add the state workbook to support the two RQ3 maps, or drop to the Metro/Regional diverging bar only?
2. Replace the RQ5 box plot with mean bed days per case (recommended), or change the question?
3. Keep both the RQ4 heatmap and the Sankey, or choose one?
