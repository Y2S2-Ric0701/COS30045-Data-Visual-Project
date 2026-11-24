# Figure and variable review

This file reviews every figure on the site: which variables it shows, which filters would be worth adding,
and whether it deserves its place. It covers the 15 figures on the five question pages and the 2 Overview
figures, as of 19 November 2026.

How each figure was judged: **does the reader learn something they'd care about that no other figure
already tells them?** Filters were judged by whether they change the story; each extra control is one more
thing the reader has to understand.

Key: ✅ keep · ⚠️ keep but fix · 🔀 merge or replace

---

## 1. Variables per figure

| Fig | Chart | Variables shown | Years covered | Interactive control |
|---|---|---|---|---|
| **Q1 Who** |||||
| 1.1 | Bar | **Age group** × count | 2011–2021, any range | Year slider, sort |
| 1.2 | Stacked bar | **Road user** × **Gender** | 2011–2021 total | Add Year slider |
| 1.3 | Lollipop | **Road user** × count | 2011–2021 total | – |
| **Q2 Trends** |||||
| 2.1 | Multi-line | **Year** × **Road user** | 2011–2021 by year | – |
| 2.2 | Dumbbell | **Road user** × **Year** (2011 vs 2021) | 2 years only | – |
| 2.3 | Stacked bar | **Year** × **Road user** (share) | 2011–2021 by year | – |
| **Q3 Where** |||||
| 3.1 | Choropleth map | **State / territory** × count | 2021 only | Hover |
| 3.2 | Bar | **Remoteness** × count; deaths per 1,000 and bed days in tooltip | 2011–2021 total | – |
| 3.3 | Multi-line | **Year** × **State** (NSW, VIC, QLD, WA only) | 2011–2021 by year | Hover |
| **Q4 Crash** |||||
| 4.1 | 100% stacked bar | **Road user** × **Counterparty** | 2011–2021 total | – |
| 4.2 | Heatmap | **Road user** × **Counterparty** | 2011–2021 total | Hover |
| 4.3 | Donut | **Crash scenario** (traffic vs non-traffic); deaths and bed days in tooltip | 2011–2021 total | Hover |
| **Q5 Severity** |||||
| 5.1 | Bar | **Road user** × deaths per 1,000 | 2011–2019 total | Road-user group filter |
| 5.2 | Bar | **Road user** × average bed days | 2011–2019 total | Same filter |
| 5.3 | Bubble | **Road user** × cases × deaths per 1,000 × bed days | 2011–2019 total | Same filter |
| **Overview** |||||
| Fig 1 | Bar | **State** × count | 2023 only | Jurisdiction filter |
| Fig 2 | Stacked bar | **Year** (2015 / 2019 / 2023) × **Severity** | 3 years | Jurisdiction filter |

### Where each variable appears

| Variable | Figures |
|---|---|
| Time (year) | 1.1 (filter), 2.1, 2.2, 2.3, 3.3, Overview Fig 2 |
| Road user type | 1.2, 1.3, 2.1–2.3, 4.1, 4.2, 5.1–5.3 (the most used variable) |
| Gender | 1.2 only |
| Age group | 1.1 only |
| State / territory | 3.1, 3.3, Overview Figs 1–2 |
| Remoteness | 3.2 (and the Summary Insights chart) |
| Counterparty (what they hit) | 4.1, 4.2 |
| Crash scenario | 4.3 |
| Outcome (deaths, bed days) | 3.2 tooltip, 4.3 tooltip, 5.1–5.3 |
| Severity (minor / serious / critical) | Overview Fig 2 only |

---

## 2. Main finding: Figure 1.1's age groups are not equal widths

The AIHW age groups cover different numbers of years: 40–64 spans 25 years, while 17–25 spans only 9.
So 40–64 having the most cases is partly just because it is the widest group. Cases per year of age,
from the existing data (2011–2021):

| Age group | Years in group | Cases | Cases per year of age |
|---|---|---|---|
| 0–7 | 8 | 8,005 | 1,001 |
| 8–16 | 9 | 27,453 | 3,050 |
| **17–25** | **9** | **88,925** | **9,881** |
| 26–39 | 14 | 99,495 | 7,107 |
| 40–64 | 25 | 133,729 | 5,349 |
| 65–74 | 10 | 28,071 | 2,807 |
| 75+ | open-ended | 25,205 | – |

Measured this way, **young adults (17–25) are the most affected**, not 40–64. The current caption
("working-age adults (40–64 years) carry the highest volume") is technically true but misleading.
**Fix:** add a "Total / Per year of age" toggle, or at least a note under the chart. A true rate per
100,000 people would need ABS population figures by age.

---

## 3. Figure by figure

| Fig | Verdict | Why | Filters worth adding |
|---|---|---|---|
| **1.1** Age | ⚠️ Keep, fix | Relatable, since everyone has an age. Needs the bin-width fix in section 2 | Year ✅ (done). **Gender** (young men?). **Road user** (young motorcyclists, older pedestrians) |
| **1.2** Gender × road user | ✅ Keep | Strong, surprising story: motorcyclists are about 90% male | Year, age group. Showing **% male** per road user would be clearer than stacked counts |
| **1.3** Road user totals | 🔀 Merge into 1.2 | Shows the same totals as 1.2 (male + female) | Replace with a "Split by gender: on / off" toggle on 1.2 |
| **2.1** Trends by road user | ✅ Keep | The core trend chart: the rise in cyclist injuries is the story | **Gender**, **age**. A "Counts / Growth since 2011" toggle |
| **2.2** Dumbbell 2011 vs 2021 | ✅ Keep | A quick, readable summary of 2.1 | **Choose the two years** to compare, reusing the Figure 1.1 slider |
| **2.3** Share by year | 🔀 Replace | Shares barely change from year to year, and 2.1 already shows the same data | Replace with **gender or age trends over time**, which no figure shows yet |
| **3.1** Map | ⚠️ Keep, fix | Very relatable, but raw counts mostly reflect population size | **Year** (data covers 2011–2021). A **rate per 100,000 people** needs ABS population figures, which are free and easy to add |
| **3.2** Remoteness | ✅ Keep | The most policy-relevant result on this page: a higher death rate in regional areas | **Road user**. Lead with the **death rate**, not counts |
| **3.3** State trends | 🔀 Merge into 3.1 | A year slider on the map would show change over time | If kept: a selector for all **8** jurisdictions instead of 4 fixed ones |
| **4.1** Counterparty stacked | 🔀 Replace | Same data as 4.2 (road user × counterparty), shown twice | Replace with **"Which collisions are deadliest?"**: deaths per 1,000 by counterparty. The raw AIHW data has it |
| **4.2** Counterparty heatmap | ✅ Keep | Tidy, and the story is clear | **Year**. Remoteness (for example, fixed-object crashes in regional areas) |
| **4.3** Crash scenario donut | ✅ Keep (context) | Explains the data's scope rather than a finding | **Year** only. Road user is not recorded for non-traffic cases |
| **5.1** Death rate | ✅ Keep | The most important outcome: pedestrians die at about 4× the rate of car drivers | Road-user group ✅ (exists). **Age** (older pedestrians?), **remoteness** |
| **5.2** Bed days | ✅ Keep | Relatable as hospital cost and recovery time | Same as 5.1 |
| **5.3** Bubble | ✅ Keep | A good final synthesis of volume, death rate and length of stay | Existing filter is enough. More would clutter it |
| **Overview Fig 1** | ⚠️ Fix data | Uses `sample_hospitalisation_data.csv` (2023), which is not AIHW data | Switch to `rq3_states.csv` with a year slider |
| **Overview Fig 2** | 🔀 Replace | The AIHW data has **no** minor / serious / critical severity field, so this chart cannot be real | Replace with deaths and bed days by state or year, which the data does have |

---

## 4. Data issues to check

1. **The Overview page and the question pages use different data.** The Overview figures read
   `sample_hospitalisation_data.csv` (2015, 2019 and 2023 only, with a severity column). It is not from the
   AIHW workbook, and "sample" in its name suggests placeholder data. The question pages use AIHW data for
   2011–2021.
2. **The time periods don't match across figures.** Q5 covers 2011–2019 (353,258 cases), most figures cover
   2011–2021 (about 413,000 cases), Figure 3.1 shows 2021 only, and the Overview shows 2023. The period
   should be stated on every figure.
3. **Gender and age each appear once,** both on the Q1 page. Neither is used for trends, places or severity.
4. **Figure 1.2 already contains Figure 1.3's data** (male + female = total per road user). Also,
   `rq1_gender_female.csv` and `rq1_gender_male.csv` hold the same data in a different order, and only the
   male file is used.
5. **Figure 3.3 leaves out 4 of the 8 jurisdictions** (SA, TAS, NT and ACT), although the data file has
   all of them.
6. **Figure 3.2's total is 402,051, against 410,884 traffic cases.** The gap is cases whose remoteness is
   recorded as "Missing". The figure doesn't mention it.

---

## 5. Filters across the site

- **Year range:** the most reusable filter, and it already exists on Figure 1.1. It suits 3.1, 4.2, 4.3 and
  the Overview.
- **Gender and age:** the biggest gap. The AIHW raw sheet has both for every year, road user and place, but
  each appears only once (Q1).
- **Remoteness:** valuable on the severity charts (Q5), since the regional death rate is a key policy point.
- **Keep to 1–2 filters per figure.** A single site-wide filter bar would look impressive, but it gets
  confusing when some figures can't respond to it (for example, 4.3 has no road-user data).

### Variables in the AIHW raw data not used yet

The `raw` sheet of `analysis/dataset/hospitalisation_injury_publication_sep2023.xlsx` has calendar year,
**month**, remoteness, cause of injury, age group, sex, road user and counterparty, with cases, bed days and
deaths for every combination. That supports, for example:

- gender or age trends over time (is the male / female gap narrowing?)
- age × road user (young motorcyclists, older pedestrians)
- remoteness × road user for death rates
- month or season patterns (a month × year heatmap)
- deaths per 1,000 by counterparty (which collisions are deadliest)

---

## 6. Priority if time is limited

1. **Fix the Overview data:** it uses sample data and a severity field that the AIHW data doesn't have.
   This is the biggest marking risk.
2. **Fix Figure 1.1 with a per-year-of-age view:** a quick change that turns a misleading claim into a strong
   finding about young adults.
3. **Remove the duplicates:** merge 1.3 into 1.2, replace 4.1 with the deadliest-collisions chart, and merge
   3.3 into the map with a year slider.
4. **Add a gender or age trend** in place of 2.3, so every core variable appears over time.
5. **Optional:** a rate per 100,000 people on the map (needs ABS population data).



Things to take note: 
Every chart logic has to link to each other. Why I want to present this chart? What is it I'm trying to present. I have to make it clear to observer why the analysis matter so that can take note. The analysis has to be human, simple and straight forward yet carry very important analysis.
1. Figure 2.1: Why is the line labelling important? What do you want to tell the user? 
2. Figure 2.2: Delete the "and rates over time". Can we do Pie Chart?
3. Figure 2.3: Make it to Stack area chart.
4. Figure 4.1: As a human, I don't understand what the graph trying to convery. Every chart has to have a direction of explaining. Can consider remove/merge to other chart. Every chart has to have great disctintion to other graph.
5. Figure 4.3: Useless. Delete

Figure 3.1: Can add filter to change map view or bar chart view. Add a filter to filter by years also
Figure 3.3: Why the graph only four states? Every bar in each questions has to show coloration between each other 
Figure 1.2: Need to mention the dataset show the whole year present in dataset
Figure 2.1: Include every road user.
Figure 5.1: Why the dataset only show up to 2019, explain in the web.
Figure 5.3 As a human, I don’t really understand the purpose of this graph. Is the size of the bubble means anything? Have to state clearly.
Figure 1.1: When I click one of the graph, it should change the global filter also.
Overview figure 1: Why is there 2023?
Overview figure 2: Unless the graph shows only 3 years, change to line chart.
Summary figure 2: The graph in the summary figure 2 should add to either question 3 or 5 so user can refer to that next.


The dataset presentation is not consistent. 
Your new thinking algorithm: When you think, each thinking has to come up with a purpose. Ask yourself why you think that way, why you want to show this graph, why is it relevant, why should the audience know this, what is the takeaway?
Each explanation has to have a point. You cannot just blindly present the data without explaining your intention of presenting.
Add a next and back button at the bottom of each page.