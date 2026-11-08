# Questions the Data Can Answer

Source: national workbook `hospitalisation_injury_publication_sep2023.xlsx`, sheet `raw`,
filtered to `Cause of injury = "Traffic"`. Counts, Australia 2011–2021 unless stated.
Last verified: 27 Oct 2026.

---

## ⚠️ Read This First: Critical Data Traps

### Trap 1 — Deaths stop at June 2020

`Died_cases` is populated for every month up to June 2020, then **blank for every row**
from July 2020 to December 2021, across all causes. This is the end of the 2019–20
financial year — those deaths were most likely not yet supplied by state registries.
They are **not zero deaths**.

**Impact:** Any mortality-based metric (deaths per 1,000 hospitalised, average bed days
for deceased patients) must use the **2011–2019 baseline** (or Jan 2011 to Jun 2020).
Including 2020–21 silently deflates the death rate by approximately one-fifth.

### Trap 2 — Unequal age band widths

| Age band | Width (years) |
|----------|---------------|
| 0–7      | 8             |
| 8–16     | 9             |
| 17–25    | 9             |
| 26–39    | 14            |
| 40–64    | **25**        |
| 65–74    | 10            |
| 75+      | open-ended    |

The widest band (40–64) will always dominate a bar chart of raw counts. The dataset
only provides counts (no population denominators), so we cannot compute true rates.
**Mitigation:** add a note on the chart, or show a secondary "cases per year of age"
label (count ÷ band width) to give readers the density perspective.

### Trap 3 — Two series breaks

| Year | Jurisdiction | Change | Estimated national impact |
|------|-------------|--------|--------------------------|
| 2012 | Victoria    | Stopped counting cases treated solely in Emergency Departments | −2.8% nationally (NISU estimate) |
| 2017 (June) | NSW  | Same ED-only exclusion applied | Varies by road user group |

These breaks are **not neutral across road users** — a visible dip in one trend line
may reflect an administrative reporting change, not an actual safety improvement.
The published BITRE tables shade 2011 and 2017-onward for this reason.
**Mitigation:** annotate break years on all trend charts with dashed reference lines.

---

## Null Value Treatment

| Column | Null count | What a null means | KNIME action |
|--------|-----------|-------------------|--------------|
| `Died_cases` | 108,178 of 117,919 rows | No deaths in that cell **up to Jun 2020**; not recorded after that | `Missing Value` node → Fix Value: `0` for Jan 2011 to Jun 2020. Exclude Jul 2020 – Dec 2021 from any death analysis |
| `Died_bed_days` | 107,331 | Same as above | Same as above |
| `Count of cases` | 4,937 | A "bed days only" row — patient transferred between hospitals counts as a case once, but subsequent bed days still recorded | `Missing Value` node → Fix Value: `0`. Their `Hospitalisations` is already 0 |

**Validation:** with nulls treated as 0, `Count of cases − Died_cases = Hospitalisations`
holds on all 117,919 rows. There are no literal zeros in `Died_cases`, confirming null
is the file's encoding for zero.

---

## Research Questions & Evidence

The five research questions below are aligned with the team's website structure
(`index.html` → 5 chapter pages) and the Design Book Section 1.2.

---

### RQ1. Who is most affected by hospitalised road crash injuries?

**Website page:** `who-is-affected.html`
**KNIME branches:** Branch 1 (Age), Branch 2 (Road User), Branch 4 (Gender)

#### Sub-question 1.1 — Which age group is hospitalised most?

**Chart type:** Horizontal Bar Chart (ranking age groups from highest to lowest)

| Age group | Total cases (2011–2021) | Cases per year of age |
|-----------|------------------------|-----------------------|
| 40–64     | 134,246                | ~5,400                |
| 26–39     | 99,795                 | ~7,100                |
| 17–25     | 89,259                 | **~9,900**            |
| 65–74     | 42,831                 | ~4,300                |
| 8–16      | 33,180                 | ~3,700                |
| 75+       | 30,922                 | N/A (open-ended)      |
| 0–7       | 9,455                  | ~1,200                |

**Key insight:** 40–64 leads by raw count (widest band), but **17–25 is the densest
group** per year of age — about 1.8× the density of the 40–64 band.

#### Sub-question 1.2 — Men or women?

**Chart type:** Donut Chart (proportion comparison of two categories)

| Sex | Cases (2011–2021) | Share |
|-----|-------------------|-------|
| Male | 268,244 | **65%** |
| Female | 144,754 | 35% |

Gender gap by road user (% male):
- Heavy transport driver: **97.3%** male
- Motorcyclist: **89.6%** male
- Pedal cyclist: ~78% male
- Car driver: ~62% male
- Car passenger: **40.1%** male (majority female)
- Bus occupant: ~42% male (majority female)

**Key insight:** The gender gap is dramatic for motorcycles and heavy transport,
but **reverses** for car passengers and bus occupants.

#### Sub-question 1.3 — Which road user type is hospitalised most?

**Chart type:** Lollipop Chart (cleaner, more modern than standard bar chart)

| Road user | Share (2021) | Total (2011–2021) |
|-----------|-------------|-------------------|
| Car driver | 33.7% | ~132,000 |
| Motorcyclist | 22.5% | ~89,000 |
| Pedal cyclist | 20.7% | ~72,000 |
| Car passenger | 11.4% | ~52,000 |
| Pedestrian | 5.9% | ~28,000 |
| Heavy transport driver | 1.0% | ~4,700 |
| Bus occupant | 0.4% | ~2,100 |

---

### RQ2. How have hospitalised road crash injuries changed between 2011 and 2021?

**Website page:** `trends-over-time.html`
**KNIME branch:** Branch 3 (Year × Road User trend)

#### Sub-question 2.1 — How have injury counts changed over time?

**Chart type:** Multi-series Line Chart (one line per road user, shared y-axis)

| Road user | 2011 | 2021 | Change |
|-----------|------|------|--------|
| Car driver | 10,948 | 13,327 | +22% |
| Motorcyclist | 7,565 | 8,883 | +17% |
| Pedal cyclist | 5,391 | 8,163 | **+51%** |
| Car passenger | 4,853 | 4,495 | −7% |
| Pedestrian | 2,754 | 2,334 | **−15%** |
| Heavy transport driver | 455 | 383 | −16% |
| Bus occupant | 214 | 169 | −21% |

**Key insight:** The cycling surge (+51%) and pedestrian decline (−15%) are the
dominant trends. Vulnerable road users (motorcyclist + cyclist + pedestrian) now
account for roughly **half** of all road-crash hospitalisations.

#### Sub-question 2.2 — Which groups show the largest change?

**Chart type:** Slope Chart (comparing 2011 start point to 2021 end point)

Winners vs losers at a glance — the slope chart makes the divergence between
cyclists (climbing steeply) and pedestrians (falling) visually immediate.

#### Sub-question 2.3 — Did significant shifts occur during specific years?

**Chart type:** Annotated Area Chart (with labelled events / reporting changes)

Critical annotations to include:
- **2012:** Victoria series break (ED-only cases excluded → ~2.8% national dip)
- **2017 (June):** NSW series break (same ED exclusion)
- **2020:** COVID-19 lockdowns — cycling injuries peaked at **8,332** (highest in series),
  pedestrian injuries fell to **2,103** (lowest in series). Lockdown shifted who
  was on the road: more recreational cycling, fewer pedestrian commuters.

---

### RQ3. Where are hospitalised road crash injuries most common?

**Website page:** `geographic-distribution.html`
**KNIME branch:** ⚠️ **Not yet built** — needs a new branch from `Missing Value (#4)`

#### Sub-question 3.1 — Which states have the highest counts?

**Chart type:** Choropleth Map (geographic comparison by state shading)

**Data source required:** The `state-and-territory-hospitalisation-injury-publication-2023.xlsx`
workbook adds a jurisdiction dimension (State × Road User). The national workbook's `raw` sheet
does **not** contain a state column — only `ABS remoteness area`.

> **Action required:** Ricardo needs to either (a) add an Excel Reader for the State & Territory
> workbook in KNIME, or (b) the team agrees to use `ABS remoteness area` as the geographic
> dimension and skip the choropleth in favour of the Diverging Bar / Proportional Symbol Map.

#### Sub-question 3.2 — Metro vs Regional?

**Chart type:** Diverging Bar Chart (highlighting differences between two groups)

The national `raw` sheet contains `ABS remoteness area` with values:
`Major Cities`, `Inner Regional`, `Outer Regional`, `Remote`, `Very Remote`, `Missing`.

| Remoteness | Share of cases | Died per 1,000 | Bed days per case |
|-----------|---------------|----------------|-------------------|
| Major Cities | **66%** | 5.5 | 4.6 |
| Regional (Inner + Outer) | ~30% | **6.9** | **5.5** |
| Remote + Very Remote | ~3% | Higher | Higher |

**Key insight:** Cities have the volume, but **Regional injuries are more severe** —
higher mortality rate (6.9 vs 5.5 per 1,000) and longer hospital stays (5.5 vs 4.6 days).
Note: "remoteness" reflects the **patient's usual residence**, not where the crash occurred.

#### Sub-question 3.3 — Geographic distribution overall?

**Chart type:** Proportional Symbol Map (bubble size represents injury counts by location)

If the state-level workbook is incorporated, bubble markers on an Australia map sized
by total hospitalisations per state would provide an effective spatial overview.

---

### RQ4. What crash characteristics are associated with hospitalised injuries?

**Website page:** `crash-characteristics.html`
**KNIME branch:** Branch 5 (Road User × Counterparty cross-tabulation)

#### Sub-question 4.1 — What are the most common collision types?

**Chart type:** Treemap (showing composition and relative size)

| Counterparty | Cases (2011–2021) | Share |
|-------------|-------------------|-------|
| Car, pick-up truck or van | 170,730 | **41%** |
| Non-collision (no other vehicle involved) | 108,678 | **26%** |
| Fixed or stationary object | 59,019 | 14% |
| Other/unspecified transport | 49,547 | 12% |
| Heavy transport vehicle or bus | 11,970 | 3% |
| Smaller groups (pedestrian/animal, pedal cycle, 2/3-wheeled motor, train) | ~12,000 | ~3% |

**Key insight:** Over a quarter of all hospitalisations (26%) involve **no other vehicle**
at all — these are single-vehicle loss-of-control crashes.

#### Sub-question 4.2 — Do collision patterns differ by road user?

**Chart type:** Heatmap Matrix (Road User rows × Counterparty columns, colour = count)

Biggest road user × counterparty pairs:
1. Car driver vs car/ute/van: **73,930** cases
2. Motorcyclist non-collision: **37,983** cases
3. Pedal cyclist non-collision: **33,446** cases

**Key insight:** Roughly **half of all cyclist and motorcyclist injuries involve no
other vehicle** — they are single-vehicle falls, loss of control, or fixed-object impacts.
This is a genuinely surprising finding that challenges the common assumption that
vulnerable road users are primarily endangered by cars.

#### Sub-question 4.3 — How do road users connect to crash scenarios?

**Chart type:** Sankey Diagram (flow from Road User → Counterparty Group)

The Rule Engine node (#26) in KNIME already consolidates counterparties into 6 groups:
`Car/ute/van`, `No other vehicle`, `Fixed object`, `Truck/bus`, `Not specified`, `Other`.
The Sankey diagram would visualize these flows, making the non-collision dominance for
two-wheeled users dramatically visible.

---

### RQ5. What are the most severe consequences of hospitalised road crash injuries?

**Website page:** `injury-severity.html`
**KNIME branch:** ⚠️ **Partially built** — `Rule-based Row Filter (#5)` (filtering to
2011–2019 for valid death data) exists but is **disconnected** from any downstream nodes.

> **⚠️ All severity metrics in this section use the 2011–2019 baseline only (see Trap 1).**

#### Sub-question 5.1 — Which groups have the highest mortality risk?

**Chart type:** Ranked Bar Chart (supports direct comparison and ranking)

**Deaths per 1,000 hospitalised (2011–2019):**

By age:
| Age group | Deaths per 1,000 |
|-----------|-----------------|
| 75+ | **28.1** |
| 65–74 | 9.9 |
| 40–64 | 6.8 |
| 26–39 | 4.5 |
| 17–25 | 3.4 |

By road user:
| Road user | Deaths per 1,000 |
|-----------|-----------------|
| Pedestrian | **21.8** |
| Bus occupant | 8.0 |
| Car passenger | 7.3 |
| Car driver | 5.9 |
| Motorcyclist | 4.1 |
| Pedal cyclist | **1.9** |

By counterparty:
| Counterparty | Deaths per 1,000 |
|-------------|-----------------|
| Train | Highest (few hundred cases) |
| Heavy vehicle or bus | **20.4** |
| Fixed object | 8.9 |
| Car/ute/van | 7.2 |

Other dimensions:
- By sex: Male 6.5, Female 5.3
- By remoteness: Regional **6.9** vs Major Cities 5.5

#### Sub-question 5.2 — Which injuries require the longest hospital stay?

**Chart type:** Box Plot (shows median, spread, and outliers of bed day distributions)

| Group dimension | Longest stays (avg bed days per case) |
|----------------|--------------------------------------|
| **By age:** 75+ | **9.8 days** |
| Adults under 65 | 4–5 days |
| **By road user:** Pedestrian | **9.0 days** |
| Cyclist | 3.0 days |
| **By counterparty:** Train | **14.5 days** |
| Heavy vehicle | 8.4 days |

#### Sub-question 5.3 — Volume vs Severity (the "aha" chart)

**Chart type:** Bubble Chart (x = cases, y = deaths per 1,000, size = avg bed days)

This is the **narrative climax** of the entire data story.

| Road user | Cases (volume) | Deaths per 1,000 (severity) | Bed days (bubble size) |
|-----------|---------------|---------------------------|----------------------|
| Car driver | Highest | Mid-table (5.9) | 4.5 |
| Pedal cyclist | High & growing | **Lowest** (1.9) | 3.0 |
| Pedestrian | Low & falling | **Highest** (21.8) | **9.0** |
| Motorcyclist | High | Low (4.1) | 5.4 |

**The twist:** Car drivers have the most cases but are mid-table for severity.
Pedestrians have few cases but suffer **~12× the mortality rate of cyclists** and
the longest hospital stays. **The biggest group on the road is not the worst hurt.**

---

## Narrative Story Arc

The recommended story order follows the Knaflic (2015) explanatory storytelling framework:

```
Act 1: THE SHIFTING LANDSCAPE (RQ2 → RQ1)
  "Australia's roads are getting safer for some and more dangerous for others."
  Lead: Multi-series trend lines showing the cycling surge (+51%) and pedestrian decline.
  Support: Linked demographic breakdowns (age, sex) for each road user.

Act 2: THE CONTEXT (RQ3 → RQ4)
  "Where and how do crashes happen?"
  Lead: Metro vs Regional severity gap; half of cyclist/motorcyclist crashes are non-collision.
  Support: Counterparty heatmap reveals the surprising dominance of single-vehicle crashes.

Act 3: THE TWIST (RQ5)
  "The biggest group is not the worst hurt."
  Climax: Volume vs Severity Bubble Chart — the single most powerful visualization.
  Resolution: Policy implications for vulnerable road user infrastructure and
  regional emergency response times.
```

---

## KNIME → CSV Export Plan

Each KNIME branch should terminate with a `CSV Writer` node exporting to `src/data/`:

| KNIME Branch | Attach CSV Writer After | Output File | Columns |
|-------------|------------------------|-------------|---------|
| Branch 1 (Age) | `Sorter (#8)` | `rq1_age_group.csv` | `Age group`, `Sum(Hospitalisations)` |
| Branch 2 (Road User) | `Sorter (#11)` | `rq1_road_user.csv` | `Road user`, `Sum(Hospitalisations)` |
| Branch 4 (Gender) | `Pivot (#21)` | `rq1_gender.csv` | `Road user`, `Male`, `Female` |
| Branch 3 (Trends) | `Pivot (#13)` | `rq2_trends.csv` | `Calendar year`, one column per road user |
| NEW (Geography) | New GroupBy → Sorter | `rq3_geography.csv` | `ABS remoteness area`, `Sum(Hospitalisations)`, `Sum(Died_cases)`, `Sum(Bed days)` |
| Branch 5 (Counterparty) | `Math Formula (#33)` | `rq4_counterparty.csv` | `Road user`, counterparty % columns |
| NEW (Severity) | Connect from `Rule-based Row Filter (#5)` → GroupBy | `rq5_severity.csv` | `Road user`, `Cases`, `Died_cases`, `Bed days`, `Deaths_per_1000`, `Avg_bed_days` |

**CSV Writer settings:**
- Column delimiter: `,` (comma)
- ☑ Include column header
- ☐ Include row ID (uncheck — D3 doesn't need KNIME Row0, Row1 IDs)

---

## Caveats to Display on the Website

These must appear as annotations, footnotes, or info-tooltips on the published charts:

1. **Counts, not rates.** No population denominators — "most hospitalised" ≠ "most at risk per person". No exposure data (km travelled, hours riding) exists in these files.
2. **Series breaks:** VIC 2012 and NSW 2017 (ED-only exclusions). Mark with dashed lines on trend charts.
3. **Remoteness = patient's usual residence**, not where the crash occurred.
4. **`Missing` values** exist in remoteness, age, and sex. Sex includes a third value `intersex or indeterminate or missing`. Subgroup totals will not sum to the national total.
5. **Road user** is "the action being undertaken by the injured party", derived from ICD-10-AM external cause codes. Car driver / passenger / unknown position are three separate categories.
6. **Death data baseline:** All mortality metrics use 2011–2019 only (see Trap 1).
