# Questions the data can answer

Source: national workbook `hospitalisation_injury_publication_sep2023.xlsx`, sheet `raw`,
filtered to `Cause of injury = "Traffic"`. Counts, Australia 2011–2021 unless stated.
Checked 27 Oct 2026.

## Read this first: two data traps

**1. Deaths stop at June 2020.** `Died_cases` is filled every month up to June 2020, then
blank for every row from July 2020 to December 2021, across all causes. That's the end of
the 2019–20 financial year, so those deaths were most likely not yet supplied. They are not
zero deaths. Any death figure must use **2011–2019** (or Jan 2011 to Jun 2020). Including
2020–21 silently drops the death rate by about a fifth.

**2. Age bands are different widths.** 40–64 covers 25 years, 17–25 covers 9 years and 75+ is
open-ended. The widest band will always look biggest in a bar chart of counts. Because the brief
says counts only, say this in a note (or show "cases per year of age" as a secondary label).

## Null values

| Column | Nulls | What a null means | What to do |
|---|---|---|---|
| `Died_cases` | 108,178 of 117,919 rows | No deaths in that cell **up to Jun 2020**. Not recorded after that | Set to 0 for Jan 2011 to Jun 2020. Leave 2020-H2 and 2021 out of any death analysis |
| `Died_bed_days` | 107,331 | Same as above | Same as above |
| `Count of cases` | 4,937 | A "bed days only" row. Per the dictionary, a patient transferred between hospitals only counts as a case once, but the bed days of the later stay still get recorded, sometimes in a later month | Set to 0. Their `Hospitalisations` is already 0 |

Evidence: with nulls treated as 0, `Count of cases − Died_cases = Hospitalisations` holds on
all 117,919 rows. There are no literal zeros in `Died_cases`, so null is how the file writes 0.
847 rows have `Died_bed_days` but no `Died_cases`. That's the same transfer effect.

## The questions

### Who

**Q1. Which age group is hospitalised most?** Bar chart.
40–64 has the most cases (134,246). Next are 26–39 (99,795) and 17–25 (89,259).
Per year of age, though, 17–25 is densest: about 9,900 cases per year of age against about
5,400 for 40–64. Pair the chart with Q4 to make the point that the most-hurt group isn't the
most likely to die.

**Q2. Which road user is hospitalised most, and is that changing?** Small-multiple lines.
Car drivers are the largest group (33.7% in 2021). Cyclists rose 51% (2011→2021), while pedestrians fell 15%.
2020 had a cycling peak (8,332) and a pedestrian low (2,103).

**Q3. Men or women?** Bar, or a stacked bar by road user.
Men account for 65% of cases (268,244 vs 144,754). The gap is widest for heavy transport
drivers (97% male) and motorcyclists (90%). Car passengers and bus occupants are mostly women.

### What happened

**Q4. What did the injured person collide with (counterparty)?** Horizontal bar.
1. Car, pick-up truck or van: 170,730 (41%)
2. Non-collision, meaning no other vehicle was involved: 108,678 (26%)
3. Fixed or stationary object: 59,019 (14%)
4. Other/unspecified transport: 49,547 (12%)
5. Heavy transport vehicle or bus: 11,970 (3%)
6. Smaller groups: pedestrian or animal, pedal cycle, 2- or 3-wheeled motor vehicle, train

**Q5. Is there a season for road injuries?** Line or radial bar by month.
The effect is mild. March (37,012) and December (36,608) are highest, and June (32,659) is lowest,
about a 13% spread. Probably not a headline, but it's a nice small detail chart.

### How bad (2011–2019 only, see trap 1)

**Q6. Which groups are most likely to die after being hospitalised?** Bar chart.
"Deaths per 1,000 hospitalised" is a count ratio within the data, not a population rate,
so it stays inside the counts-only brief.
- By age: 75+ has **28.1** deaths per 1,000, then 65–74 with 9.9. Every group under 65 is between 3.4 and 6.8.
- By road user: pedestrians have **21.8**, bus occupants 8.0, car passengers 7.3, car drivers 5.9,
  motorcyclists 4.1 and cyclists 1.9.
- By counterparty: being hit by a heavy vehicle or bus gives **20.4**, a fixed object 8.9 and a car 7.2.
  Trains are higher still, but there are only a few hundred cases.
- By sex, men have 6.5 and women 5.3. By remoteness, Regional has 6.9 against 5.5 for Major Cities.

**Q7. Which injuries keep people in hospital longest?** Bar of bed days per case.
By age, 75+ averages 9.8 days, compared with 4–5 days for adults under 65. Pedestrians average 9.0 days and
cyclists 3.0. A train collision averages 14.5 days and a heavy vehicle 8.4.

**Q8. Volume vs severity.** Scatter, with cases on x and deaths per 1,000 on y, one dot per road user.
Car drivers have the most cases but are mid-table for severity. Pedestrians have few cases but are the most
severe. Cyclists have many cases with low severity. This could be the "aha" chart.

### Where

**Q9. City or country?** Bar.
Major Cities has 66% of cases, but Regional cases are a little more likely to be fatal (6.9 vs 5.5 per
1,000) and stay longer (5.5 vs 4.6 bed days). Remoteness here is the patient's home, not the crash site.

## Suggested story order

Q2 (the change over time) → Q1/Q3 as the linked bar for the selected road user → Q8 (the twist)
→ Q6/Q4 detail. Q5 and Q9 are optional extras.
