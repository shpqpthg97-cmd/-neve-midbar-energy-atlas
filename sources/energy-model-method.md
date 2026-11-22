# Energy screening model

Updated 2026-11-10. This is an annual year-one scenario model, not a tariff recommendation or hourly dispatch design.

Government source: https://www.govmap.gov.il/sites/energy/index.html?map=dashboard
Council localities: https://www.nevemidbar.org.il/about/localities/?tab=4
Storage-model reference: https://sam.nlr.gov/battery-storage.html
Tariff authority: https://www.gov.il/he/departments/the_electricity_authority

The government export contains statistical-area tables keyed by locality codes 1375, 1342, 1347, 1348. Those tables use square metres and kW, unlike the municipal aggregate tables in dunams and MW. The four municipal-use rows sum to 220 buildings and 4,753 kW. The municipality table rounds the potential to 4.8 MW. The all-use building counts differ: 2,575 summed localities versus 2,569 in the municipal summary. The cause is unknown; this is disclosed in the interface.

Education records are assigned by their source locality codes. Sports records are assigned only from explicit locality or neighborhood names. Other records remain unassigned. There is no inferred transfer of aggregate solar potential to individual buildings, and institutions/sites are not summed as unique roofs.

Generation feeds direct consumption and surplus. Storage charges only from surplus. Discharge is capped by surplus after round-trip losses, usable capacity times annual cycles, inverter charge/discharge windows and assumed replaceable peak consumption. Remaining surplus is sold. Incremental battery benefit deducts the forgone value of surplus sales, storage maintenance and a user-entered wear provision. No kWh is credited both as a sale and as avoided purchased energy.

Capital cost and operating surplus are shown separately. Simple payback uses year-one operating surplus; it is not discounted and does not model loan terms, taxes, battery replacement or lifetime degradation. Empty financial assumptions block calculations. Example inputs are loaded only with the demonstration button, are explicitly hypothetical and are not official Israeli tariffs or market cost estimates.

Locality scenarios share assumptions for comparison. Regional results sum the four locality scenarios only. A separately evaluated roof is never added to that rollup. Roof generation uses the government popup's reported annual value, preserving its disclosed mismatch with the product of its rounded power and specific-yield values.
