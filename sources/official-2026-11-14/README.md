# Verification snapshot — 14 November 2026 (Israel local time)

The public IEC ArcGIS application (item 50e8bc89f74449298c103615c2899697)
was inspected together with its IEC explanation. The visible map date was
18 October 2026. Public application/webmap metadata identifies the four
FeatureServer layers saved alongside this file.

`scripts/import-grid-checks.py` queries each distinct supported location in
ITM/EPSG:2039, with intersects semantics. It preserves the complete attribute
responses and query URLs. 52 points produce 49 mapped asset records: 24
education institutions, 20 reported sports facilities, and 5 observed canopy
features. The remaining 181 education records have no precise usable location.
These are asset records, not 49 unique buildings or connections.

All four rating attributes are present in the LV_DAY layer. For Al Najah the
other three dedicated layers were queried independently and agreed. No
local distribution check, available kW, ownership, or formal connection
approval is inferred from these polygons. Sports coordinates are 2021 reports.

Additional GovMap observations are recorded in
`additional-govmap-observations.json`, with screenshots deployed alongside the
asset data. One additional roof at Mustaqbal and three canopy features were
observed. Mustaqbal court is explicitly joined to sports record 861R1105790;
that alias shares its energy identifier and work-progress key, so totals are
deduplicated. The Aatsam B parking feature retains the source classification
and visibly warns that its appearance suggests a play surface.

All 31 school rows remain in the inventory: 17 have a partial roof join,
7 have a checked location without an energy card, and 7 remain unidentified.
There are 16 football/futsal records; all have a canopy-check workflow, but
only one has a join to a specific sports-register ID. Two additional observed
sports canopies are linked to school campuses without claiming a sports ID.

IEC general and LV TOU tariffs effective 1 July 2026 were read from the live
official tariff pages. Rendered text is retained here. PV bands derive from
decision 70103; complementary peak rates and the strictly-greater-than-800
kWh/kW annual condition derive from January 2026 tariff book, table 6.7-5.
The UI gives exact official URLs, reference dates, and applicability limits.
The July tariff book itself could not be read; no claim is made that its PV
or complementary table was independently verified. System charge reference
table 8.1-1 is linked separately and is not blindly deducted per exported kWh.

The calculator is an illustrative annual screening model. DC/AC, previous
approved capacity P0, shared-meter grouping, energy timing, costs and regulatory
eligibility are assumptions, not acquired institution facts. Consumption and
sales prices are separate. Peak revenue is not also counted as consumption
savings. Charges, finance and taxes are excluded and prominently identified.
Storage is charged from PV surplus only; no grid-arbitrage model is implied.

Checks: original energy conservation/opportunity-cost tests; tariff-band,
P0, strict threshold, annual weighting, shared-campus and export-accounting
tests; school/evidence/coordinate checks; browser verification of institution
and sports cards, missing locations, both storage outcomes, filters and local
task-progress persistence. Browser extension metadata errors were unrelated
to the site. No user task progress or account information is published.
