# KNIME workflow: how the website's data is made

Every data file the website reads is produced by one KNIME workflow, **`analysis/road_crash_site_data.knwf`**.
The repo keeps only this exported file; the workflow is edited in the KNIME app and exported again.
It is laid out question by question: one shared preparation step, then one box per question.

**One folder per question, one CSV ("sheet") per sub-question.** When two or more sub-questions use exactly the
same table, they share one CSV whose name lists them all (e.g. `2.1+2.2+2.3_…csv`), so each file says which
figures it feeds.

The workflow was run headless on 23 November 2026 (KNIME 5.12.0). Its eight files are **byte-for-byte
identical** to those from the Python cross-check, `analysis/build_site_data.py`.

---

## Layout

The layout follows Ricardo's arrangement in the KNIME app: preparation across the top, question boxes
stacked down the right with a gap between each, and the states box across the bottom.

```
0 · Prepare the national data (AIHW national workbook)
   Excel Reader → Row Filter (Traffic) → Missing Value (blank counts = 0)
   → Rule Engine × 5 (road_user, counterparty, sex, age_group, remoteness)
   → Column Filter → Column Renamer (year, hospitalisations, cases, deaths, bed_days)
        │
        ├── Q1 · Who ends up in hospital?   (three rows, one per sheet)
        │     1.1  GroupBy → Row Filter → Sorter → CSV Writer       q1_who/1.1_road_users.csv
        │     1.2  GroupBy → Row Filter → Sorter → CSV Writer       q1_who/1.2_men_and_women.csv
        │     1.3  GroupBy → Row Filter → Sorter → CSV Writer       q1_who/1.3_age.csv
        ├── Q2 · Is it getting better or worse?
        │     GroupBy → Row Filter → Sorter → CSV Writer            q2_trends/2.1+2.2+2.3_road_users_by_year.csv
        ├── Q3 · Where does it happen? (city or country)
        │     GroupBy → Row Filter → deaths rule → Sorter → CSV     q3_where/3.2_city_or_country.csv
        ├── Q4 · What did they crash into?
        │     GroupBy → Row Filter → deaths rule → Sorter → CSV     q4_crashes/4.1+4.2+4.3_what_they_hit.csv
        ├── Q5 · Who is hurt the worst?
        │     GroupBy → Row Filter → deaths rule → Sorter → CSV     q5_severity/5.1+5.2+5.3_outcomes.csv
        └── national total per year ─┐
Q3 · states (AIHW state workbook)    │
   Excel Reader (A–F) → Row Filter → Rule Engine (state codes) → Pivot → Joiner → Renamer → Resorter
   → Sorter → CSV Writer                                            q3_where/3.1+3.3_states.csv
```

Each box is labelled with its question in KNIME, and every node has a label saying what it does.

| File (in `src/data/`) | Figures | Grouped by | Values | Rows |
|---|---|---|---|---|
| `q1_who/1.1_road_users.csv` | 1.1 | year, road_user | hospitalisations | 99 |
| `q1_who/1.2_men_and_women.csv` | 1.2 | year, road_user, sex | hospitalisations | 210 |
| `q1_who/1.3_age.csv` | 1.3 | year, road_user, age_group | hospitalisations | 688 |
| `q2_trends/2.1+2.2+2.3_road_users_by_year.csv` | 2.1, 2.2, 2.3, Overview fig. 2 | year, road_user | hospitalisations | 99 |
| `q3_where/3.1+3.3_states.csv` | 3.1, 3.3, Overview fig. 1 | year (one column per state + Total) | hospitalised cases | 11 |
| `q3_where/3.2_city_or_country.csv` | 3.2, Summary | year, road_user, remoteness | hospitalisations, cases, deaths, bed_days | 394 |
| `q4_crashes/4.1+4.2+4.3_what_they_hit.csv` | 4.1, 4.2, 4.3 | year, road_user, counterparty | same as above | 570 |
| `q5_severity/5.1+5.2+5.3_outcomes.csv` | 5.1, 5.2, 5.3, Summary | year, road_user | same as above | 99 |

Q1 has three files because its three figures need three different tables. Every other question's
figures use one table, so they share one file. Every file keeps `year` and (except states) `road_user`,
so every chart can follow the site's filter bar.

### The rules, in one place

- **Traffic only:** `Cause of injury = Traffic` (crashes on a public road).
- **Blank counts are 0:** a blank `Died_cases` before mid-2020 means no deaths.
- **9 road-user groups:**
  - truck driver, passenger and unknown position become "Truck occupant";
  - "Pick-up truck or van occupant" becomes "Ute or van occupant";
  - "Car unknown position" and "Other or unknown" become "Other or not recorded".
- **6 crash types:** car, ute or van · no other vehicle · fixed object · truck or bus · something else ·
  not recorded.
- **Sex:** Male, Female, or "Other or missing" (15 cases).
- **Deaths blank after 2019** (Rule Engine `$year$ <= 2019 => $deaths$`): AIHW had no death records after
  June 2020, so 2020–2021 deaths are left blank, not 0.
- **Empty groups dropped:** groups where every value is 0 are removed. Groups with 0 cases but some bed days
  are kept: these are AIHW's "bed days only" rows for patients transferred between hospitals.
- **State `Total`** is the national figure from step 0. It includes the ~2% of cases with no state recorded.

---

## Opening it in the KNIME app

The file paths in the workflow are **relative to the KNIME workspace** and start with
`COS30045-Data-Visual-Project/`, the same convention as the team's original workflow. So the repo has to sit
in the workspace under that exact name:

- **Option 1:** clone the repo into the workspace folder, e.g. `~/knime-workspace/COS30045-Data-Visual-Project`.
- **Option 2:** keep it where it is and add a link (done on Ricardo's machine):
  `ln -s /path/to/COS30045-Data-Visual-Project ~/knime-workspace/COS30045-Data-Visual-Project`
  (on Windows, use a directory junction: `mklink /J`).

Then, in KNIME: **File → Import KNIME Workflow…**, choose `analysis/road_crash_site_data.knwf`, and import it
into the workspace root. Open it and click **Execute all**.

**After editing it in KNIME:** File → Export KNIME Workflow… → overwrite
`analysis/road_crash_site_data.knwf` (leave "export with data" off, so the file stays small). Then run the batch
script below, so `src/data` matches the new workflow.

## Running it from the terminal (batch mode)

```bash
analysis/knime/run_batch.sh
git status src/data           # nothing listed = data unchanged
```

- **Needs the NodePit Batch extension:** KNIME's own Batch Executor has been deprecated and is not on the
  5.12 update site. NodePit Batch is free with the free KNIME, and was installed on this machine with:
  `~/knime_5.12.0/knime -nosplash -application org.eclipse.equinox.p2.director -repository https://download.nodepit.com/5.12 -installIUs com.nodepit.batch.feature.feature.group`
- **What the script does:** it unpacks the `.knwf` into a temporary folder, links the repo in beside it under
  `COS30045-Data-Visual-Project` (so the workflow's paths resolve), runs it, and deletes the temporary folder.
  It doesn't need your KNIME workspace, and it doesn't touch the copy you imported there.
- **KNIME in a different place:** set `KNIME=/path/to/knime`.
- **Exit codes:** 0 = all files written; 20 = the workflow could not load; 30 = a node failed.

## Checking the output

- **After a KNIME change:** run `analysis/knime/run_batch.sh`, then `git status src/data`.
- **Cross-check:** run `uv run --with openpyxl python analysis/build_site_data.py`, then `git status src/data`
  again. Both should give the same files. If they don't, one of them has a rule the other lacks.

Totals to expect:

| File | Totals |
|---|---|
| every Q1 file, Q2 | hospitalisations 410,884 |
| `3.1+3.3_states` | Total 410,884 · NSW 116,060 · 2011: `2011,10618,9326,6322,2359,3442,493,456,537,34033` |
| `3.2_city_or_country`, Q4, Q5 | hospitalisations 410,884 · cases 413,013 · deaths 2,041 · bed days 2,018,891 |

---

## The team's original workflow

`analysis/data_visual_project.knwf` (by Jessica and Aaron) is **unchanged**. It writes the older `rq*.csv`
files, which the site no longer reads; they are kept in `analysis/old-csv/`.

| | Original workflow | New workflow |
|---|---|---|
| Death years | Jan 2011 – Jun 2020 | 2011–2019 (whole years) |
| Road users | 12 AIHW groups; some outputs keep only 5 | 9 groups, all kept |
| Sex | Drops "intersex or indeterminate or missing" | Keeps them as "Other or missing" |
| Years | Mostly all years added together | Every output keeps `year`, for the site's year filter |
| State data | Not included | `3.1+3.3_states.csv` from the state workbook |
| Files | One CSV per chart idea, flat folder | One folder per question, one CSV per sub-question |

## Still to decide

- [ ] Keep the original workflow for reference, or replace it with this one in the submission.
- [ ] Keep `analysis/build_site_data.py` as the cross-check, or remove it so KNIME is the only source.
      Either way, say in the report that the data comes from KNIME.
- [ ] Teammates: put the repo in your KNIME workspace (see above) before opening the workflow.
