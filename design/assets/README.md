# Vendored presentation assets

## Heebo

- Official Google Fonts variable WOFF2, internal font version **3.100**, Google Fonts delivery revision **v28**.
- Hebrew, Latin and Latin Extended subsets; each supports `wght` **100–900**, including **400, 500 and 700**.
- Import `fonts/heebo/heebo.css`, then use `font-family: "Heebo", sans-serif`.
- Local font references use `font-display: swap`; no runtime third-party font request is required.
- Source CSS: https://fonts.googleapis.com/css2?family=Heebo:wght@100..900&display=swap
- Upstream project: https://github.com/OdedEzer/heebo
- License: SIL Open Font License 1.1. Full license and copyright: `fonts/heebo/OFL.txt`.
- `google-fonts-source.css` records the unmodified delivery CSS. It is provenance only; import `heebo.css` in the app.

## Lucide

- **37** official upstream SVGs from Lucide **0.468.0**, pinned to Git commit `f12b0de177fbc2a6795e99be065887e72b237123`.
- Source: https://github.com/lucide-icons/lucide/tree/f12b0de177fbc2a6795e99be065887e72b237123/icons
- License: ISC; the complete upstream license, including Feather attribution, is in `icons/lucide/LICENSE`.
- SVG path data is unchanged. Root dimensions are normalized from 24×24 to **20×20**; all retain `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="2"`, rounded line caps and joins.
- `icons/lucide/paths.json` contains only each icon's SVG inner markup for framework-neutral inline rendering. Use a shared SVG wrapper with the same viewBox and stroke attributes. Use `aria-hidden="true"` for decorative icons and put accessible names on actionable controls.
- Individual SVGs are available under `icons/lucide/<name>.svg`.

`manifest.json` records exact source URLs, local sizes and SHA-256 hashes. `acquire_assets.py` is the download/normalization script. Keep the respective license files when copying these assets into the application repository.
