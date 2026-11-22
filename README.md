# מנהלת ידע ואנרגיה — נווה מדבר

עותק קוד המקור של גרסה 26, לרבות העיצוב המעודכן מ־20.11.2026.
מקור: `5138c1dee7b61040606dd0fa47fa334631ba43eb`.

## בנייה

נדרשת סביבת Node.js 24. מתוך תיקיית הפרויקט:

```sh
npm ci
npm run build
```

הבנייה מפיקה את `dist/server/index.js`. תוצרי הבנייה ותיקיית התלויות אינם נשמרים במאגר.
היישום משתמש ב־Worker ובמסד D1; אין לפרסם את תיקיית `web/` באמצעות GitHub Pages, משום שהכניסה וההרשאות נאכפות בשרת.

## סודות ונתונים

קובץ `.env.example` מכיל שמות משתנים בלבד. סודות הגישה, מסד הנתונים החי, חשבונות המשתמשים, פרויקטים והערות שנשמרו בשרת אינם מועתקים למאגר.
המאגר כולל את קובצי הנתונים, מקורות המידע והייחוס שכבר מצורפים לקוד. העלאה זו אינה מרעננת את נתוני המקור או מחברת פריסה אוטומטית מ־GitHub.

בדיקות העיצוב מתועדות ב־`docs/redesign-2026-11-20/QA.md`. הבדיקות משתמשות בנתוני בדיקה; אין להשתמש בהם כפרטי כניסה לאתר.

---

# Neve Midbar Knowledge and Energy Directorate

## School energy portfolio and screening analysis (v25)

Authenticated tabs **אנרגיה בבתי הספר** and **ניתוח ותעדוף**, also linked from home, group the existing 38 roof records into 17 schools out of 31 council school records. `web/school-energy-model.js` performs exact institution-ID joins, excludes conflicting duplicate roof IDs, preserves unknown versus zero values, and keeps seven canopy records separate. Roof-only totals are 1,662 kW, 2,967,573 kWh/year, 26,872 m² surveyed roof area and 11,628 m² suitable area. These are source estimates, not installed capacity, measured production or complete coverage. Source year 2025 and retrieval dates 10–14 November 2026 remain visible; refreshing reloads the current repository datasets and does not scrape new government records.

The school catalog supports name/code search, source-location filters, data-quality focus, sorting and filtered CSV export. Each school opens a roof-level evidence dialog, separate canopy opportunities, the latest available grid-map status and links to its existing work plan, institution card and financial scenario. Analysis shows source-generation concentration for a user-selected number of schools, locality shares, coverage and quality flags, and practical next steps for PV, storage, economics and project readiness. It does not infer battery size or financial returns from roof area. Abu Amar remains a distinct source location rather than being reassigned from administrative tribal names. The existing unsaved-project guard, authentication, data records and stored projects are unchanged.

Validation: `node tests/school-energy.cjs` checks aggregate totals, locality aliases, excluded councils, duplicate/conflicting IDs, missing versus zero values, ratio suppression for incomplete data, filtering, concentration and CSV formula escaping. Browser QA in the isolated synthetic-role fixture covered administrator/guest navigation, filtering, zero-results state, roof evidence, work-plan and finance links, CSV download, top-five concentration (45.0%), and narrow/zoomed layouts. Screenshot: `docs/school-analysis-v25.jpg`. The UI fixture is never deployed; production sign-in remains required.

## Grid regulation, tariffs and storage knowledge base (v24)

`KnowledgeBase.jsx` renders the business models followed by `GridEnergyKnowledge.jsx`, with accessible in-page section links. `grid-energy-topics.json` is the standalone structured content for the three topics: market regulation and tariffs, BESS, and grid/planning/fire requirements. Each card separates always-visible qualifications, expandable explanations and council actions, official source links with scope notes, and the manual review date (17 November 2026). It distinguishes suppliers from network/system operators, conditional commercial allocation from automatic net-metering, peak reduction from connection-size capacity charges, and battery installation from engineered blackout backup. Planning and grid options are conditional, not asset-specific approvals. No hardcoded tariff rates, automatic knowledge updates or changes to the calculator, site authentication, asset records or projects are introduced.

## Solar business models knowledge base (v23)

The authenticated **מאגר ידע** tab and home-page shortcut mount the React component in `components/solar-models/`. Its JSON contains the EPC, BOT/roof-lease and ESCO/PPA models, with always-visible strategic risks and keyboard-accessible native disclosures. The bundle loads only when the tab is opened and unmounts on navigation. The existing project unsaved-change guard remains authoritative. Build-time Tailwind utilities and base styles are scoped to `#solarModelsRoot`; no framework reset touches the existing dashboard. `npm install` installs the pinned build dependencies and `npm run build` generates the protected JS/CSS before packaging the Worker. No new data store, authentication route or project mutation is introduced.

Web sources live in `web/`. `worker/gate.mjs` protects every application route and dataset. Public login pages have a centered, vertical layout. Administrators use email/password; guests use four-digit codes and can read project data and submit professional notes. Only the administrator can change projects or read the notes inbox. D1 stores accounts, guest permissions, throttling records, projects and feedback.

Build: `node scripts/build-worker.mjs`. The output is a single Worker module under `dist/server/index.js`, containing gzip-packed protected assets. Do not publish `web/` as static assets. `.openai/hosting.json` declares `d1: DB`, with no static hosting. Schema-only SQL migrations and journal live in `drizzle/`; Sites applies them on deployment. `db/schema.sql` records the current authored schema.

Initial setup requires the previous high-entropy access code, checked against `ATLAS_ACCESS_HASH`, and succeeds only once. A unique owner row and transactional guest initialization prevent an arbitrary first visitor from claiming administration. The owner chooses email/password in the setup form. Email is a login identifier, not an email verification service. Setup shows a one-time recovery code. Recovery rotates the code and invalidates existing administrator sessions; it does not send email.

Passwords are salted and peppered, with PBKDF2-SHA256 at 100,000 iterations. The pepper/signing key is the Sites secret `ATLAS_SESSION_KEY`. Guest codes and recovery codes use separate HMAC domains. No password, live PIN, setup code, recovery code or production signing secret is committed. `ATLAS_INITIAL_GUEST_CODE` is a Sites secret consumed only when the first owner creates the initial general guest record. Later code changes are stored in D1, and the bootstrap PIN is never used to authenticate directly.

Sessions use revocable signed v3 session cookies with an eight-hour absolute limit and a server-enforced ten-minute idle timeout, also bounded by guest expiration. Explicit user activity renews the idle deadline; background data requests do not. Each sign-in permits one protected document navigation; a refresh or new visit invalidates the session and returns to the login page. Page-exit beacons and BFCache protection supplement the server check. Password changes preserve the current document but require login at the next navigation. HttpOnly, Secure, SameSite=Strict cookies and same-origin POST checks apply. Every authorized request rechecks the record version and guest active/expiry flags. Disabling or rotating a guest invalidates their existing sessions. `/api/account*` is server-authorized for administrators only; guests receive no administrator email or account details. Old v1 and v2 sessions are rejected.

Persistent throttling: guest attempts limited to five per client over fifteen minutes and fifty across the site over twenty-four hours; administrator attempts limited to eight per client per fifteen minutes and one hundred per hour across the site. Client keys are HMAC-pseudonymized. Counters are bounded and expire; no attempt password/code values are stored. A four-digit shared code is intentionally a limited guest-access credential, not an administrator credential.

Preview runs through the managed daemon using `scripts/preview-worker.mjs`. It uses the ignored `.dev.vars` fixture and a separate `.preview/auth.db`. `scripts/sqlite-preview.mjs` adapts SQLite to the D1 calls for local validation and never enters the deployed bundle.

Checks: `node tests/asset-delivery.mjs`, `node tests/access-gate.mjs`, `node tests/bill-model.cjs`, `node tests/energy-model.cjs`, `node tests/roof-links.cjs`, `node tests/tariffs-and-projects.cjs`.

## Data and limitations
Existing source provenance remains under `sources/` and within the data records. Grid probability is separate from actual supply status. No historical 2016 survey records were added: the user requested current institution-level evidence only. No current verified institution supply inventory has been imported.

The annual bill comparison subtracts avoided energy costs once, adds user-entered remaining charges, and compares before/after bills. Export revenue and project expenses remain separate. Actual accounts are never fabricated by the demo. Inputs are scoped to the selected assets, retained only in memory, and included in scenario exports. Project task completion is now shared, server-persisted user reporting, not professional approval. Existing browser-local work-plan records remain available for export and are not automatically imported.

The default unauthenticated page is guest PIN entry, with a personal-account link underneath. Explicit `?mode=login` also permits switching from a guest session to a personal account. Assets are stored gzip-compressed in the bundle, decompressed as streams before returning a Response, and sent without a Content-Encoding override; the host handles transport compression. The asset-delivery regression exercises the browser payload after automatic edge compression.

Savings display: the visible scenario summary separates avoided electricity purchases, export/storage sales, modeled operating expenses and combined annual benefit. It reuses the same benefit calculation used by the bill comparison; it never adds electricity savings to a net figure that already includes them. Without bill inputs, full before/after bills stay unknown. Complete bills incorporate changes in other electricity charges and extra project expenses; invalid bills suppress the combined summary. Tests include `node tests/bill-model.cjs` and `node tests/bill-ui.cjs` (optional `--preview` produces an ignored illustrative component fixture).

Basemap requests use the canonical OpenStreetMap tile URL and the browser’s real origin via strict-origin-when-cross-origin. No proxy or bulk tile cache is used. A failed background request switches to a data-only map with a clear status while preserving asset, plan and boundary layers. Users may also select data-only mode.

Additional checks: `node tests/session-lock.mjs`, `node tests/session-client.cjs`, `node tests/map-background.cjs`, `node tests/data-integrity.cjs`. `scripts/preview-app.mjs` is a local UI fixture with synthetic authorization; it is never bundled or a substitute for production authentication.


## Shared project delivery (v18)

`web/project-model.js` provides the common stage and KPI definitions used by browser and Worker. `worker/projects.mjs` authorizes `/api/projects*` and `/api/feedback*` after the existing session gate. Migration `0002_projects_feedback.sql` creates project and feedback tables without seeding production records. The immutable server catalog is built from existing education, municipal sports and canopy records, with canonical keys joining observed sport/canopy duplicates. Registry entries do not establish separate buildings, meters or verified ownership.

An administrator starts a project, selects a responsible person and optional deadline, then updates ten work-plan tasks with evidence notes. Ten preparation risks start as **not checked**, never as confirmed blockers. Completion requires tasks done, risks reviewed and no active blockers. Progress is the equally weighted fraction of tasks reported done; current stage is the first incomplete task. Active/paused/completed status is administrator reporting, not physical installation. No KPI infers measured savings, installed capacity or grid approval. Dates use Israel time. Open visible screens refresh every 30 seconds without renewing idle authentication. Unsaved forms are retained when another screen updates the project; version checks reject stale writes. Project changes and the latest 50 history entries are stored atomically.

The home-page note form accepts optional self-reported name and asset association. Author permission identity comes from the session. Notes are internal only, rate limited and idempotent; no email is sent. Only the administrator can list/triage notes. Notes do not automatically create projects or blockers. Feedback is rendered as escaped plain text. Guest authorization is enforced on the server, not merely hidden in the interface.

`web/project-risks.js` links official sources for rights, structural review, grid acceptance, current supply/emergency modes, fire and environmental review, planning, economics, procurement, operations and grants. Recommendations must be adapted by qualified professionals. The July 2026 Ministry of Energy announcement lists Neve Midbar among solar sports-canopy grant winners; the checklist asks the treasury to locate the award file and does not assign an award, amount or progress to any specific facility.

Checks: `node tests/projects-feedback.mjs` exercises durable records, canonical deduplication, administrator-only mutation, private feedback, stale writes, evidence requirements, completion gates, idempotency and model metrics. The local-only `scripts/preview-app.mjs` fixture uses `.preview/project-qa18.db` and synthetic roles for UI QA; test records and the role switch are never packaged into the Worker.

## Government-source sync (v19)

`worker/sync.mjs` provides bounded deterministic source ingestion, resumable D1 runs, dated snapshots, schema checks, history and reviewed location imports. `/api/sync/*` uses the existing site roles. All signed-in visitors can read source status/grid results; start, settings, file intake and review require the administrator. Public `/mcp` discovery returns metadata only. Executable tools require Sites' trusted user ID and verified email matching the existing administrator. The `mcp` capability provisions the Site's private connector; its connection and a real invocation must be verified before configuring an unattended schedule. See `sources/scheduled-source-sync.md` for the self-contained cloud run contract and exact sources. No unattended secrets or fake identities are stored.

Source retrieval uses fixed URLs, exact known points and no agent-generated values. Eight points per invocation, four concurrent upstream requests, 12-second timeouts, bounded JSON, a single running source job and versioned leases. Atomic publish installs a complete run snapshot; partial/ambiguous/error records are marked. Previous source snapshots remain in run history. A failed schema check leaves the previous current snapshot intact. Grid-source date is read dynamically from `editingInfo.dataLastEditDate`, separately from retrieval date. Official parcel ZIP metadata is checked, but neither the large archive nor unverified energy-roof data is imported. The map cards read the current server snapshot; no republish is needed for data-only updates.

`web/source-sync.js` adds the source monitor, manual resume/pause, history, CSV template and CSV/GeoJSON preview/review. File data is kept separate from existing project/feedback records. Accepted locations are a council-admin assertion, not automatic ownership verification. CSV rows with no filled coordinate/evidence/date are ignored as empty template rows; matching is by existing stable asset ID, never fuzzy name alone. The local-only preview uses `.preview/sync-qa19.db`; test imports are not shipped.

Validation: `node tests/source-sync.mjs` plus existing auth/session/project/asset/data regression tests. Browser QA exercises real public-source fetch, status and intake controls in an isolated database. Hosted source access and the unattended tool identity are verified separately after publication.
