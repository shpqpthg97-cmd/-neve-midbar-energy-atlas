# Presentation redesign — 20 November 2026

Scope: CSS tokens, bundled Heebo/Lucide, display preferences, shared components, login presentation, navigation grouping and responsive layout. Existing handlers and data models remain authoritative.

## Preservation
- Baseline: a003a5fd38f4ceab35942412595aee7f2153c41d (v25).
- Compared 61 original JavaScript/data/component files by SHA-256. 57 unchanged. The four differences are the generated knowledge bundle, two icon rendering functions, and the Worker login CSP parameter/header.
- No datasets, SQL, schema, model calculations, source-sync code, project routes, authentication decisions or authorization policies were changed.
- Original navigation buttons are moved, not replaced. The wrapper invokes the original tab chain and checks actual active destination before updating presentation.
- Login form actions, method, field names, constraints and server validation are unchanged. Presentation script allowed by exact build-time SHA-256 only; no unsafe-inline script allowance. Fonts bundled locally.
- Display choices use nm-display-* local-storage keys only. Recent activity is explicitly local navigation history, not a fabricated project audit log.
- Preview uses synthetic identities and an isolated existing local fixture. No production data or accounts were edited during QA.

## Automated checks
All 14 existing suites passed: asset-delivery, bill-ui, school-energy, session-client, access-gate, map-background, source-sync, data-integrity, session-lock, tariffs-and-projects, bill-model, roof-links, projects-feedback, energy-model.
The added design-accessibility suite passed: 18 light/dark text/control contrast combinations; original form actions/fields; exact-script CSP; embedded fonts; unauthorized design-asset rejection.
Production Worker build passed (120 protected assets).

## Browser checks
- All 18 admin destinations opened with correct active state and heading.
- Guest had neither account nor professional-inbox admin destinations.
- Search by Hebrew name and Ctrl+K/Enter navigation; favorite pinning and persistence across reload; compact/full sidebar.
- School scope stayed 17 schools / 38 roofs; locality filter Abu Tlul returned 4 schools / 11 roofs; original institution detail opened with unchanged metrics.
- Existing unsaved project confirmation: dismiss retained form and tab 10; accept returned to home. Test draft was not saved.
- Dark mode, persisted theme, high contrast, link emphasis, text enlargement to 200%, reset, native dialogs and Escape, skip link focus on main content.
- Narrow layout via browser zoom: 340 CSS-pixel viewport, no document horizontal overflow; mobile drawer opens/closes with Escape; bottom nav opens school page; table becomes data cards.
- Login: 454 CSS-pixel layout, narrow brand strip, form within viewport; visible labels; password show/hide tested on empty field; empty required fields produce Hebrew inline errors without submitting credentials.
- No application-origin errors observed during navigation. Browser-extension metadata errors were outside application code.

## Limits
These are development checks, not a completed professional WCAG/Israeli-standard compliance audit or screen-reader/device matrix. Third-party maps/documents retain their existing external accessibility constraints. No source data freshness or energy-model changes were part of this design task.
