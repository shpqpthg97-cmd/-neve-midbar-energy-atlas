# Deterministic source sync — operational contract

Project: appgprj_6af2fed1b4608191bb740716ca28c0ce. The published Site's own MCP tools execute the importer. Do not research and enter replacement numbers, edit source data, republish the Site or use browser sign-in to run scheduled refreshes.

## Access and run

Use the Site plugin created by Sites, with the authenticated account whose verified email matches the atlas administrator email. `/mcp` checks platform identity against `atlas_admin.email`; anonymous callers, guests and different accounts cannot execute tools. Sites service bypass credentials alone do not supply this identity. No credentials belong in this file or a schedule prompt.

1. `atlas_sync_status`: verify service enabled and identify any running batch.
2. `atlas_sync_start`: starts or resumes the same fixed-source run. Respect a paused/skipped response. Starts are limited to one new run per five minutes.
3. `atlas_sync_step` with returned `run_id`: process bounded batches while status is `running`, stopping after 40 calls maximum. A busy response means another caller holds a short lease; do not busy-loop. Each saved batch resumes after interruption.
4. `atlas_sync_status`: read back saved status, current run, summary, source edit date and exception counts. Report failures honestly. Never invent missing locations, ratings or ownership. An initial invocation through this same cloud tool must succeed before claiming unattended operation verified.

After Sites successfully saves a linked schedule, `atlas_sync_record_schedule` records its returned ID and human-readable timing for display only. This tool does not create or change scheduling. Respect the source pause setting even when the cloud schedule remains enabled.

## Fixed sources

- IEC: https://services3.arcgis.com/IwBfWsA3Hiwd5dEw/arcgis/rest/services/LV_DAY/FeatureServer/3 ; schema query then exact EPSG:2039 point intersections for four `POTENTIALITY_TO_CONNECT_*` fields plus OBJECTID. Only known council-associated catalog records and administrator-reviewed location overrides are eligible. A mapped polygon is not a connection approval, local distribution check, current electricity supply, spare asset kW or council ownership proof.
- Cadastral metadata: https://data.gov.il/api/3/action/package_show?id=shape ; parcel resource c68b4df6-c809-4bb5-a546-61fa1528fed5. Check modification/size/download metadata only. Do not download the ~667 MB national ZIP into the Worker. There is no automatic parcel-to-building import in this version.
- GovMap energy roofs: no verified unattended connector. Existing roof observations remain static, with their dates and evidence. Do not claim roof data refreshed.

Every completed run stores source responses, source-edit timestamp (not retrieval date), retrieval time, status changes and a snapshot in D1. Failed or ambiguous point lookups are explicit. A previous valid result may be shown as historical after a network failure only if the queried point is unchanged. Work plans, notes, roofs, tariff assumptions and financial inputs are not overwritten.

## Location files

Administrator-only CSV (Excel CSV UTF-8 export) and WGS84 Point GeoJSON import. Maximum 250 rows, 2 MB client file, 256 KB normalized request. Required asset_id, coordinates, source_reference and observed_on. Unknown IDs and duplicate canonical assets are rejected. Files are staged first; acceptance requires a review note and explicit location/asset confirmation. Accepted locations affect future grid queries, not the energy-roof inventory or project task statuses. Pending/rejected files do not affect ingestion.
