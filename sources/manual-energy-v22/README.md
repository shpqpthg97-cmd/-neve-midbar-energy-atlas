# Manual energy source review — 2026-11-14

The user requested continuing manual roof matching and deferred the automatic
GovMap connection. These records were individually selected and read in the
public Ministry of Energy / GovMap map, with dataset year 2025. No source API,
nearest-neighbour join, extrapolation, or inferred generation values were used.

| Education ID | Institution | Previously linked roofs | Added roofs | New total |
| --- | --- | ---: | ---: | ---: |
| 618785 | ביר אלמשוש / source label ביר אלמשאש | 1 | 8 | 9 |
| 618165 | אלמסתקבל / source label אל אעצם אל מוסתאקבל | 2 | 5 | 7 |
| 618199 | אלהושאלה / source label חסין אל הוושלה | 1 | 5 | 6 |

Two sports court observations were added separately: Bir al-Mashash (501 m²,
40 kW, 71,600 kWh/year) and Hasin al-Hawashla (333 m², 25 kW,
44,300 kWh/year). Hasin's source card reports block 100165 / parcel 9;
this is not a cadastral ownership verification. Neither court was confirmed
as a specific football facility or matched to a sports inventory ID.

The eighteen new roofs sum to 185 kW and 329,944 kWh/year. These are source
estimates, not installed systems or a financial forecast. The complete app
now contains 38 roof polygons/records across the same 17 schools and seven
canopy records. This work expands campus coverage, not the number of schools
matched. Fourteen other school checks remain unresolved or lack a source card.
Coverage of these three campuses also remains partial.

Matching basis: named school POI, visible campus/courtyard and roof shape,
and the previously established link to the unique Ministry of Education record.
Each selected polygon was inspected against the existing roof's position and
shape to avoid duplicates. All institutional matches remain provisional pending
field verification and property rights checks. Source education coordinates,
administrative locality, and existing rows were preserved.

`observations.json` contains the manually transcribed values and point positions.
The JPEG files retain each source-card observation and map context. Map UI
behaviour sometimes leaves the prior blue roof outline visible when opening a
canopy card; the canopy record uses the newly clicked point, named source card,
and visible court, never that stale outline. Public evidence pages in `web/energy/`
are clearly labelled factual transcripts, not official exports or screenshots.

The 177 m² roof at ITM 195170,567427 reports zero sunlight and zero potential.
Those observed zeros were retained and flagged for source review, with a visible
institution-card warning. Missing existing-panel area remains null everywhere.

Verification: existing institution/evidence/data integrity checks; energy and
project model checks; browser review of all three revised institution totals,
separate canopy cards, new transcript page and deduplicated regional totals.
Regional UI: 24 energy-bearing unique asset groups; 1,957 kW and 3,494,723 kWh/year.
The 38 roof records aggregate into their institutions and are not counted twice.

No unattended roof import or schedule was enabled. New canopy electricity-grid
checks remain explicitly pending; old school grid observations were preserved.
