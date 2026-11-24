"""Cross-check for the KNIME workflow: builds the same six data files in Python.

The website's data is produced by the KNIME workflow analysis/road_crash_site_data.knwf
(run it with analysis/knime/run_batch.sh; see doc/knime-workflow.md). This script applies the
same rules independently. Both give byte-identical files, so a difference after editing one
of them means the two have drifted apart.

Run from the repository root:
    uv run --with openpyxl python analysis/build_site_data.py

Sources (analysis/dataset/):
  hospitalisation_injury_publication_sep2023.xlsx           sheet `raw`, national monthly data
  state-and-territory-hospitalisation-injury-publication-2023.xlsx  sheet `raw`, table 1 (columns A-F)
Both are filtered to Cause of injury = "Traffic" (crashes on a public road).

Outputs (src/data/): one folder per question, one CSV ("sheet") per sub-question.
Sub-questions that use exactly the same table share one CSV, named "a+b".
  q1_who/1.1_road_users.csv                     year, road_user, hospitalisations
  q1_who/1.2_men_and_women.csv                  year, road_user, sex, hospitalisations
  q1_who/1.3_age.csv                            year, road_user, age_group, hospitalisations
  q2_trends/2.1+2.2+2.3_road_users_by_year.csv  year, road_user, hospitalisations
  q3_where/3.1+3.3_states.csv                   year, NSW, VIC, QLD, SA, WA, TAS, NT, ACT, Total
  q3_where/3.2_city_or_country.csv              year, road_user, remoteness, hospitalisations, cases, deaths, bed_days
  q4_crashes/4.1+4.2+4.3_what_they_hit.csv      year, road_user, counterparty, hospitalisations, cases, deaths, bed_days
  q5_severity/5.1+5.2+5.3_outcomes.csv          year, road_user, hospitalisations, cases, deaths, bed_days

Rules applied here so every chart on the site uses the same definitions:
  * Road users are grouped into the 9 groups in ROAD_USER_GROUP.
  * What the injured person hit is grouped into the 6 groups in COUNTERPARTY_GROUP.
  * Deaths are only recorded up to June 2020 (blank afterwards, not zero), so the
    `deaths` column is left empty for 2020 and 2021. Charts about deaths or hospital
    stay use 2011-2019 only, so both measures describe the same patients.
  * q3_states `Total` is the national figure, which includes ~2% of cases with no state.

The matching KNIME nodes are listed in doc/knime-workflow.md.
"""
import csv
import collections
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
NATIONAL = ROOT / 'analysis/dataset/hospitalisation_injury_publication_sep2023.xlsx'
STATES = ROOT / 'analysis/dataset/state-and-territory-hospitalisation-injury-publication-2023.xlsx'
OUT = ROOT / 'src/data'

ROAD_USER_GROUP = {
    'Car driver': 'Car driver',
    'Car passenger': 'Car passenger',
    'Motorcyclist': 'Motorcyclist',
    'Pedal cyclist': 'Pedal cyclist',
    'Pedestrian': 'Pedestrian',
    'Pick-up truck or van occupant': 'Ute or van occupant',
    'Heavy transport driver': 'Truck occupant',
    'Heavy transport passenger': 'Truck occupant',
    'Heavy transport unknown position': 'Truck occupant',
    'Bus occupant': 'Bus occupant',
    # A car occupant whose seat was not recorded can't be called a driver or a
    # passenger, so it joins the other unrecorded cases.
    'Car unknown position': 'Other or not recorded',
    'Other or unknown': 'Other or not recorded',
}

COUNTERPARTY_GROUP = {
    'Car, pick-up truck or van': 'Car, ute or van',
    'Non-collision transport accident': 'No other vehicle',
    'Fixed or stationary object': 'Fixed object',
    'Heavy transport vehicle or bus': 'Truck or bus',
    'Other and unspecified transport accidents': 'Not recorded',
    '2- or 3- wheeled motor vehicle': 'Something else',
    'Pedal cycle': 'Something else',
    'Pedestrian or animal': 'Something else',
    'Train': 'Something else',
    'Other non-motor vehicle': 'Something else',
}

SEX_GROUP = {'Male': 'Male', 'Female': 'Female'}   # anything else -> 'Other or missing'
STATE_CODE = {'NSW': 'NSW', 'Vic': 'VIC', 'Qld': 'QLD', 'SA': 'SA', 'WA': 'WA',
              'Tas': 'TAS', 'NT': 'NT', 'ACT': 'ACT'}
LAST_DEATH_YEAR = 2019
OUTCOMES = ['hospitalisations', 'cases', 'deaths', 'bed_days']
STATES_CSV = 'q3_where/3.1+3.3_states.csv'


def num(v):
    return float(v) if v not in (None, '') else 0.0


def read_national():
    """Traffic rows of the national `raw` sheet, with grouped categories."""
    wb = openpyxl.load_workbook(NATIONAL, read_only=True)
    rows = wb['raw'].iter_rows(values_only=True)
    col = {h: i for i, h in enumerate(next(rows))}
    out, unmapped = [], collections.Counter()
    for r in rows:
        if r[col['Cause of injury']] != 'Traffic' or r[col['Calendar year']] is None:
            continue
        ru = ROAD_USER_GROUP.get(r[col['Road user']])
        cp = COUNTERPARTY_GROUP.get(r[col['Counterparty']])
        if ru is None or cp is None:
            unmapped[(r[col['Road user']], r[col['Counterparty']])] += num(r[col['Hospitalisations']])
            continue
        out.append({
            'year': int(r[col['Calendar year']]),
            'road_user': ru,
            'counterparty': cp,
            'sex': SEX_GROUP.get(r[col['Sex']], 'Other or missing'),
            'age_group': r[col['Age group']] or 'Missing',
            'remoteness': r[col['ABS remoteness area']] or 'Missing',
            'hospitalisations': num(r[col['Hospitalisations']]),
            'cases': num(r[col['Count of cases']]),
            'deaths': num(r[col['Died_cases']]),       # blank = 0 up to June 2020
            'bed_days': num(r[col['Bed days']]),
        })
    if unmapped:
        print('Rows not mapped (hospitalisations):', dict(unmapped))
    return out


def write_grouped(name, rows, keys, fields):
    """Group rows by `keys`, sum `fields`, write src/data/<name>."""
    (OUT / name).parent.mkdir(parents=True, exist_ok=True)
    sums = collections.defaultdict(lambda: collections.Counter())
    for r in rows:
        k = tuple(r[c] for c in keys)
        for f in fields:
            sums[k][f] += r[f]
    with open(OUT / name, 'w', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(keys + fields)
        n = 0
        for k, v in sorted(sums.items()):
            if not any(v[f] for f in fields):
                continue
            vals = []
            for fld in fields:
                if fld == 'deaths' and k[0] > LAST_DEATH_YEAR:
                    vals.append('')                  # not recorded yet, not zero
                else:
                    vals.append(int(v[fld]))
            w.writerow(list(k) + vals)
            n += 1
    print(f'Wrote {name} ({n} rows)')


def write_states(national_rows):
    """Table 1 of the state workbook: cases per state per year (two half-years added)."""
    wb = openpyxl.load_workbook(STATES, read_only=True)
    per_state = collections.Counter()
    for i, r in enumerate(wb['raw'].iter_rows(values_only=True)):
        if i < 2 or r[0] is None:            # two header rows
            continue
        per_state[(int(r[0]), STATE_CODE[r[5]])] += r[3]
    national = collections.Counter()
    for r in national_rows:
        national[r['year']] += r['hospitalisations']
    codes = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
    (OUT / STATES_CSV).parent.mkdir(parents=True, exist_ok=True)
    with open(OUT / STATES_CSV, 'w', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['year'] + codes + ['Total'])
        for y in sorted(national):
            w.writerow([y] + [per_state[(y, c)] for c in codes] + [int(national[y])])
    print(f'Wrote {STATES_CSV}')


def main():
    rows = read_national()
    hosp = ['hospitalisations']
    write_grouped('q1_who/1.1_road_users.csv', rows, ['year', 'road_user'], hosp)
    write_grouped('q1_who/1.2_men_and_women.csv', rows, ['year', 'road_user', 'sex'], hosp)
    write_grouped('q1_who/1.3_age.csv', rows, ['year', 'road_user', 'age_group'], hosp)
    write_grouped('q2_trends/2.1+2.2+2.3_road_users_by_year.csv', rows, ['year', 'road_user'], hosp)
    write_states(rows)
    write_grouped('q3_where/3.2_city_or_country.csv', rows, ['year', 'road_user', 'remoteness'], OUTCOMES)
    write_grouped('q4_crashes/4.1+4.2+4.3_what_they_hit.csv', rows, ['year', 'road_user', 'counterparty'], OUTCOMES)
    write_grouped('q5_severity/5.1+5.2+5.3_outcomes.csv', rows, ['year', 'road_user'], OUTCOMES)

if __name__ == '__main__':
    main()
