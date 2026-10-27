# Road user data story — which file, which sheets, which questions

Notes written 26 Oct 2026 from the four BITRE/AIHW files Tan uploaded
(hospitalised injuries from road crashes, Australia 2011–2021).

## 1. Which file to use

**Use the national file — `hospitalisation_injury_publication_sep2023.xlsx` — as the single
source, and build from its `raw` sheet.**

The `raw` sheet is 117,919 tidy rows, one row per
`Calendar year × Month × ABS remoteness area × Cause of injury × Age group × Sex × Road user ×
Counterparty`, with columns `Count of cases`, `Bed days`, `Died_cases`, `Died_bed_days`,
`Hospitalisations`.

Verified it reproduces the published tables exactly: filter `Cause of injury = "Traffic"`
and sum `Hospitalisations` and you get Table 1 (34,033 in 2011; 39,505 in 2021) and Table 2
(car driver 10,948 in 2011) to the unit.

- `Hospitalisations` = `Count of cases` − `Died_cases` (cases that died in hospital within 30
  days). Use `Hospitalisations` to match the published tables; use `Count of cases` and
  `Died_cases` if you want a severity measure.
- The six `Cause of injury` values are Traffic, Non-traffic, Unknown traffic, Other transport,
  All other trauma events, Medical events. **Only `Traffic` is "road crashes".** Rows outside
  Traffic carry `Road user = "Not applicable"`.

The other two workbooks are **optional add-ons, not the base**:

- **State and territory file** — adds a jurisdiction dimension (T2 = state × road user), but
  its `raw` tab is laid out as five separate tables side by side in one sheet (columns 1–5,
  6–13, 14–…), which is messy to parse. Only worth it if the story needs a state map.
- **First Nations file** — T2 is First Nations × road user, a genuine equity angle, but heavy
  transport, pick-up and bus cells are suppressed as `n.p.` every single year, and its age
  bands differ (65+ as one band, not 65–74 / 75+). Good for one supporting chart, bad as a base.
- **Data dictionary PDF** — definitions and the two series breaks. Cite it for the processing
  write-up.

## 2. Caveats that must appear in the story

- **Counts, not rates.** No population denominators in these files (the dashboard's rates come
  from a separate ABS custom population request). So "most hospitalised" ≠ "most at risk per
  person" — and crucially, there is no exposure denominator either (km travelled, hours riding).
  State this once, plainly.
- **Two series breaks.** Victoria from 2012 stopped counting cases treated solely in Emergency
  Departments (NISU estimate: about −2.8% nationally in 2012, "likely to differ by road user
  group"). NSW made the same change from June 2017. The published tables shade 2011 and
  2017-onward for this reason. For a road user story this matters: the break is *not* neutral
  across road users, so a dip in one line may be an admin change, not a safety change.
- **Remoteness = usual residence of the patient**, not where the crash happened.
- `Missing` appears in remoteness, age and sex; sex has a third value
  `intersex or indeterminate or missing`. Totals by subgroup won't match Table 1 exactly —
  the dictionary says so.
- Road user is "the action being undertaken by the injured party", derived from ICD-10-AM
  external cause codes. "Car driver / passenger / unknown position" are three separate
  categories; the state and First Nations files collapse them into one.

## 3. What the data actually says (traffic only, 2011–2021)

Hospitalisations by road user:

| Road user | 2011 | 2021 | change | share 2021 | bed days/case | died per 1,000 |
|---|---|---|---|---|---|---|
| Car driver | 10,948 | 13,327 | +22% | 33.7% | 4.5 | 4.9 |
| Motorcyclist | 7,565 | 8,883 | +17% | 22.5% | 5.4 | 3.5 |
| Pedal cyclist | 5,391 | 8,163 | **+51%** | 20.7% | 3.0 | 1.6 |
| Car passenger | 4,853 | 4,495 | −7% | 11.4% | 4.8 | 6.3 |
| Pedestrian | 2,754 | 2,334 | **−15%** | 5.9% | **9.0** | **19.3** |
| Heavy transport driver | 455 | 383 | −16% | 1.0% | 5.8 | 3.5 |
| Bus occupant | 214 | 169 | −21% | 0.4% | 5.0 | 6.9 |

Other things worth showing:

- **2020 is a natural experiment.** Cycling injuries jumped to 8,332 (highest in the series)
  while pedestrian injuries fell to 2,103 (lowest) — lockdown changed who was on the road.
- **Severity inverts volume.** Pedestrians are only 6% of cases but average 9.0 bed days and
  19.3 in-hospital deaths per 1,000 — roughly 12× the cyclist death rate. The biggest group is
  not the worst-off group.
- **Demographic fingerprints are very distinct** (share of that road user's cases):
  - Motorcyclist 89.6% male; heavy transport driver 97.3% male; car passenger only 40.1% male.
  - Pedal cyclist peaks at 40–64 (40.3%) and has a child tail (14.5% aged 8–16).
  - Bus occupant is the oldest group: 28.5% aged 75+.
  - Car driver and motorcyclist both have ~25% aged 17–25.
- **Remoteness differs by road user**: cyclists and pedestrians are 75%+ Major Cities, heavy
  transport drivers are 50% Regional.
- **Counterparty cross-tab exists** (114 road user × counterparty combinations). Biggest single
  pairs: car driver vs car/ute/van (73,930 cases), motorcyclist in a non-collision accident
  (37,983), pedal cyclist non-collision (33,446). Roughly half of all cyclist and motorcyclist
  injuries involve no other vehicle at all — a genuinely surprising finding.

## 4. Candidate story questions

**A. Recommended — "Australia's roads are getting safer for some road users and not others."**
Who is being hospitalised, and how has the mix shifted 2011–2021? Cyclists up 51% while
pedestrians fell 15%; vulnerable road users (motorcyclist + cyclist + pedestrian) are now
about half of all road-crash hospitalisations.
*Chart pairing:* small-multiple trend lines (one per road user, shared y-scale, break years
marked) as the lead, with a linked bar chart of age × sex for whichever road user the reader
selects. Classic D3 brush-and-link, and the series breaks become an annotation, not a problem.

**B. "The biggest group is not the worst hurt."** Volume versus severity by road user, using
bed days per case and in-hospital deaths per 1,000.
*Chart pairing:* scatter/bubble (x = cases, y = bed days per case, size = deaths) plus a
linked detail bar. Strong, less common, but only one real dimension of change.

**C. "Who is on the road?"** The demographic fingerprint of each road user — motorcyclists
almost entirely male, bus occupants mostly elderly, cyclists peaking at 40–64.
*Chart pairing:* population-pyramid small multiples plus a linked trend line. Visually
appealing, but a snapshot rather than a story.

**Recommendation: A, with B folded in as the second section.** A gives the narrative arc and a
real finding (the cycling surge and the 2020 shock); B gives the twist that stops the reader
reading it as a simple ranking. C's best facts can live inside A's linked bar chart.

## 5. Processing steps to document

1. Read sheet `raw` from the national workbook.
2. Filter `Cause of injury == "Traffic"`.
3. Group by `Calendar year`, `Road user` (and `Age group` / `Sex` / `ABS remoteness area` for
   the linked views); sum `Hospitalisations`, `Count of cases`, `Bed days`, `Died_cases`.
4. Keep `Missing` / `Not applicable` categories visible rather than silently dropping them;
   note the resulting totals gap.
5. Flag 2012 (Vic) and 2017 (NSW) as series breaks in the output data so the chart can mark them.
6. Export one tidy CSV/JSON per view — the whole thing is well under a megabyte.
