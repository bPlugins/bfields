# bfields — worklist for 3D Viewer Premium 2.0.0

**Date:** 30 Sep 2026 · **Owner:** the bfields developer (stream A in `3d-viewer-premium/plan/NEW-UI-2.0.0-PLAN.md` §8) · **Deadline:** `1.0.0` built **30 Sep 2026** (dist/bfields.zip 26181e32…, no prerelease suffixes: see README § Versioning); the 28 Oct build is `1.0.1` only if anything changes · **Release it serves:** premium 2.0.0, **Tue 17 Nov 2026**.

Everything below happens in this repo. The premium host work (Registrar, AdminUi, adornments, e2e) is stream B and is listed in the premium plan, not here. Stored shapes never change in any item below: the `csf` codec is frozen and every item must keep `bin/test.sh` green.

**Handoff contract with stream B.** Premium wires against the **current** `dist/bfields.zip` (`e6ccf4a`, 30 Sep) from day one — the host patches already apply — and swaps in `1.0.0-rc` on 26 Oct and `1.0.0` on 28 Oct. Nothing in this list changes the PHP↔JS wire format (`"schema": 1`), the `window.bfields` runtime API, the `bfields_*`/`csf_*` hooks or the CSS class names premium's adornments will hang on; if an item needs to, it is flagged **API** and goes in before the rc.

Effort: S ≈ ½–1 day · M ≈ 2–3 days.

---

## A. Repo, CI, floor proof, release engineering (S+S+S)

| # | Task | Done when |
| --- | --- | --- |
| A1 | Commit the pending `.gitignore` change. Look at the CI run for `origin/main` (`e6ccf4a`) — it has **never been observed green**. Fix every red in `js`, `php` (7.4 / 8.2 / 8.4 lint) and `wordpress` (6.5 + latest). Confirm the WordPress job really clones Codestar `--branch 2.3.1`. | A green run linked from README § Tests. |
| A2 | Real floor once: a WP 6.5 / PHP 7.4 site (Local can make one), activate the demo, open Settings + the Postbox screen, save. Run `tests/php/asset-deps.php` and the premium harness's `strict-notices.php` there. Add a Playwright smoke (mount + save) to the `wordpress@6.5` CI job so the floor is CI, not a memory. | Both screens mount and save on 6.5/7.4; CI smoke green. |
| A3 | Deactivate the stale `bfields-demo` plugin on dev.local (site state, not code). Document `BFIELDS_FORCE_PATH` in README § "Which copy is loaded?" as the dev.local recipe once premium has `lib/bfields/`. | Done / README line. |
| A4 | Write `DESIGN-PRINCIPLES.md` (see §B0) **before** any designed component is started — it is what lets several people build controls that look like one sheet. | File exists, reviewed by Raju. |
| A5 | Versions are plain `major.minor.patch`, never `-rc` (arbitration ranks a suffix below the release). 30 Sep: `1.0.0` packaged as `dist/bfields.zip` (sha256 26181e3223868182bef7db5a770322f838fbba7d49d29193fed4cd5d8314434a, 272,728 bytes, 40 files; repackaged 20:15 with the B7 `below`-width and sale-price fixes, replacing ce4ccd96…, nothing had shipped). Tag `1.0.0` when Raju commits; the 28 Oct build bumps to `1.0.1` only if anything changed. | Tag pushed; zip sha in the premium `lib/bfields` commit. |

## B. Designed replacements for the stand-ins (decision D7)

Raju's decision: **design the fields in bfields on the existing design principles** — no external design round-trip, no raw stand-ins shipped. Every component in `ui/fields/claude/` gets a designed version in `ui/fields/`, following `ui/fields/claude/README.md` § "Replacing one" (register in `../index.ts`, delete the stand-in and its block in `claude.css`, run `design-parity.mjs` + `figma-diff.mjs`). The value shape documented in each stand-in's header is kept exactly.

### B0 — `DESIGN-PRINCIPLES.md` (S, first)

Extract the rules the transcribed components already obey so new ones inherit them, with the numbers, not adjectives:

- Tokens only (`--bfields-*`); no literal colours/sizes in a component sheet. Brand: `--bfields-primary` `#1b5cf0` (tabs, Enable, chips), `--bfields-save` `#3b52f6` (Save). Neutrals, borders, row-desc colour from `tokens.css`.
- Type: Inter (bundled woff2), 14px/500 body, 14px/600 card headers, 13px descriptions at 20px line-height; row title/desc colours as measured.
- Geometry: 36px control height, hairline row rule, row pitch 74px (Settings) / 72px (editor), title column ≥ 180px, control column right-aligned and wraps to its own line when it does not fit (B7), 8px input radius, card inset 19px (Model cards) / 29–13px (rows cards), 41px toggle track, 178px MIME tile column.
- Two row idioms (`rows`, `cards`) and when each is used; the three card-only controls (mode grid, source row, poster block).
- States: hover, focus ring (visible, not colour-only), disabled, `pro` locked (badge + no save), error (validate message under the control), loading.
- Icons: inline SVG from the ported set (`ui/core/icons.tsx`); stroke weight and 16/20px sizes; the `icon` vocabulary a host may name.
- Motion: none beyond the existing transitions; respect `prefers-reduced-motion`.
- Accessibility: every control keyboard-operable, `aria-*` for composite widgets, 4.5:1 text contrast (the dashboard audit's `#6B6B6B` floor for body text).
- Scoping: every selector `.bfields-app .bfields-x` (CI checks), `min-height` resets for wp-admin, RTL via logical properties where possible.

### B1 — `Repeater` (`group`, `repeater`) — **M, the critical one**

Cycle models, hotspots (nested inside models), posters, product models, popup models all render through it. Design it as the Settings/Add New sheet would draw a list:

- Row = a bordered card in the `cards` idiom: drag handle · row title (Codestar's `title`/`button_title` + the first text sub-field's value, as CSF does) · collapse chevron · actions (clone, remove) on the right; collapsed by default when `'collapsible'`/`accordion` is set, honouring CSF's `max`/`min`.
- **Drag reorder** (D9): pointer-based, with keyboard alternative (Move up/down in the row menu) and `aria-live` announcement; rows serialize as a plain list, `__id` never stored (existing round-trip test).
- Row tabs (a sub-field's `tab` + `tab_icons`) drawn as a small tab strip inside the card; nested groups render as an indented list with the same card idiom one level down.
- Empty state: dashed card with the add button and a one-line hint; add button at the bottom in `--bfields-primary` tint (like the source-row button).
- Row-local dependency scope unchanged.

### B2 — `Fieldset` (`real_size` `{width,height,depth}`) — S
Inline sub-form: a labelled group in the row's control column, sub-fields as a 3-up grid of `NumberInput`s with their unit suffix; group title small caps; no card border (it sits inside a row or a repeater card).

### B3 — `Spacing` (`angle_property`, free set) — S
Four (or three, `left => false`) numeric inputs with the icon/label CSF gives (`top_icon` "Deg"), optional unit select, same 36px height, `show_units => false` honoured.

### B4 — `Link` (HVP later; free of premium use) — S
Button that opens WordPress `wpLink`; shows `{url,text,target}` as a chip with a clear. Low priority: **can slip past 1.0.0** (no premium field uses it).

### B5 — `Code` (`custom_css`, `css`) — S (decision D3)
`wp_enqueue_code_editor` (CSS mode) from the host's Assets hook; the component looks for `wp.codeEditor` **at use time**, falls back to the styled textarea when absent (CSP, disabled syntax highlighting in the user profile). Same border/radius/focus ring as inputs; the `#model{ID}` subtitle under the title. Stores `\n`; bytes identical to the textarea path (save-parity).

### B6 — `NumberInput` (`number`, `spinner`) — S
Input with unit suffix inside the field, stepper buttons for `spinner` (36px, hairline separated), `attributes.min/max/step` honoured, decimals allowed, **stores strings**. Slider stays the design's `Number.tsx`.

### B7 — `Textarea` (hotspot `desc`) — S
Multi-line input in the input style, auto-grows to 6 lines then scrolls, resize handle hidden.

### B8 — `MediaInline` (`media` / `upload` in a row) — S
Row version of the Model-tab source/poster controls: URL input + tinted "Upload" button (upload) or thumbnail chip + name + Replace/Remove (media). `wp.media` looked up at use time. Adornment slots `before`/`after` kept and **documented** (premium's cloud picker hangs there — **API**).

### B9 — `Checklist` (`checkbox` with a short option list) — S
Vertical list of design-styled checkboxes (the MIME tile's tick, 20px box), two columns above 8 options; writes a list, `[]` when empty.

### B10 — `ImageTiles` (`image_select`; HVP) — S
The MIME tile with an image; radio and multi variants. Low priority, may slip.

### B11 — `SourceSelect` (`select` with `options => 'posts'`…) — S
Searchable select styled as the design's select at rest; open state = input + result list (product thumbnail, title, price when the source is products), keyboard navigation, empty/loading/error states, the stored id shown as "12 (not available)" when the term list does not contain it (B1 rule).

### B12 — `ColorPanel` (`color`) — S
The designed button at rest stays; the popover becomes a designed panel: swatch preview, hex/rgba input, opacity slider, Transparent / Default / Clear as text buttons; writes exactly what Codestar's picker writes (`#rrggbb`, `rgba(r, g, b, a)` with the authored spacing, `transparent`, `''`); never writes on open.

### B13 — `DeviceSwitcher` (`'responsive' => true`) — S
Beside the field title: three icon buttons (desktop/tablet/mobile) in a pill, active in `--bfields-primary`, the per-device reset as a small × when a device has its own value; sized after the Add New stage card's switch. Fires `bfields:device-change` as today.

### B14 — Row icons and layouts hosts will name — S, **API**
- Export the icon vocabulary (name → SVG) from `ui/core/icons.tsx` and list the names in README so premium can add `'icon' => 'box'` keys; add the ~20 icons the Settings/Add New frames use per row.
- Confirm the four `layout` hints premium will use exist and are drawn: `tile-grid` (MIME), `danger` (delete-data card), `mode-grid` (viewer mode), **`selector`** (copyable chip + editable input for the Woo gallery selectors — verify it is implemented; the plan named it in §4.2 but the README does not list it).

### B15 — Meta box shell skin — S
`MetaboxShell` inside a core postbox: top tab strip in the design's style, panel padding per the editor idiom (72px pitch), the "Interface: New · Switch to classic" line is the host's (Publish box). Make sure the postbox header/handle from wp-admin does not fight the strip (B7-style wrapping at narrow widths).

## C. Behaviour, parity, a11y, i18n (M)

| # | Task | Done when |
| --- | --- | --- |
| C1 | **B12 early mount:** observable registry (`useSyncExternalStore`), mount when the bundle runs (roots are already printed), keep the `DOMContentLoaded` pass for late roots, enqueue the meta-box bundle on `load-post.php`/`load-post-new.php`; components that use `wp.media`/`wp.codeEditor` look them up at use. | Settings fields visible before `DOMContentLoaded`; an adornment registered after first render appears (new TS test). |
| C2 | `dehydrate_row()` excludes `pro` sub-fields inside group rows (26 Sep §6 hole). | Unit test. |
| C3 | The 12 pre-existing `design-parity.mjs` mismatches (`.bfields-editor` paddingTop 10 vs 20, `.bfields-title` marginTop, slider width, tile grid) — fix against the Figma exports or rebaseline with a reason each. | `design-parity.mjs` green; `figma-diff.mjs` scores at or below the 26 Sep values. |
| C4 | Verify (do not assume) the D.4 behaviours on the real premium schema: unsaved-changes warning + `beforeunload`; section error markers on tabs for `validate`; search across fields; `#tab=<legacy slug>` alias; Reset Section / Reset All confirm dialogs and toasts; `pro` locked rows never saved. | One checklist run on the Studio copy, results in this file. |
| C5 | RTL: `build/index-rtl.css` is enqueued for RTL locales (check `Assets.php`); flip logical properties where the sheet still uses `left/right`; run the demo in `ar` once. | Screenshot pair. |
| C6 | Keyboard/a11y pass over every B-component: tab order, visible focus ring, `aria-*` on Repeater/SourceSelect/ColorPanel/DeviceSwitcher, Escape closes popovers, axe run on both demo screens. | axe: 0 serious/critical. |
| C7 | i18n: refresh `languages/bfields.pot`; **ship an `es_ES` catalogue** for the framework chrome (Save Changes, Reset…, unsaved changes, Loading…, the fallback notice, Repeater/SourceSelect/ColorPanel strings) because premium 1.10.0 ships Spanish; verify `wp_set_script_translations('bfields-ui','bfields',…)` resolves on dev.local in es_ES. **Never** generate `en_US`. | Spanish chrome on dev.local. |
| C8 | Dependency fixture gap: dump `dependency-cases.json` once more with Pro **inactive** so premium's free-tier rules (Viewer.php 26, Settings.php 4, ProductMeta.php 1) are covered. | Fixture count grows; both parity suites green. |

## D. Proof against premium (M, with stream B)

| # | Task | Done when |
| --- | --- | --- |
| D1 | **Re-run the integration harness now** on the Studio demo copy with the current bfields, on a machine that is not swapping — steps 3–5 and 8 (Classic vs Modern untouched saves, every byte explained, 0 Modern-only frontend changes, cross-mode round trip) have **no result since the 28 Sep fixes**. | §9 of the 27 Sep report gets a row per suite, all PASS. |
| D2 | Recapture the golden set at premium's **1.10.0 tag** (2 Oct) on dev.local and re-run `roundtrip.php`; add the fixtures to `tests/php/fixtures/golden/` (private repo). | PASS on the new set. |
| D3 | After stream B has `lib/bfields/` in premium (~16 Oct): run `run-all.sh` against the **premium dev build** on dev.local (current WP) and on the 6.5/7.4 site from A2. Repeat on the `1.0.0` zip on 28–29 Oct. | Two green runs per stack recorded in the premium plan §7. |
| D4 | Keep `tests/php/fixtures/schema-inventory.json` current after premium's field-array enrichment (icons/ids/layouts add keys Codestar ignores; the inventory dump must include them so CI tests the shipped schema). | Re-dumped 23 Oct. |

## E. Host-developer documentation (S)

| # | Task | Done when |
| --- | --- | --- |
| E1 | README: `bfields.addAdornment(unique, fieldId, slot, Component)` and `bfields.subscribe/getValues/setValue/getDevice` with one worked example each (the cloud-picker button is the natural one); the `icon` name list (B14); the `layout` hints; the `bfields_fallback_url` requirement stated as "without it there is no button". | Sections exist. |
| E2 | Ship reference host files in `docs/host/`: `Registrar.php` and `AdminUi.php` distilled from premium's (mode option, overrides, switch endpoint, notice, fallback URL, `bfields_is_rest_request`), so the free plugin (D8) and HVP copy a known-good pattern instead of premium's. | Files + a README paragraph. |
| E3 | Update `CODESTAR-MIGRATION-PLAN.md` header: "2.0.0 ships Stage A+B together per `3d-viewer-premium/plan/NEW-UI-2.0.0-PLAN.md`; Stage C unchanged." | One paragraph. |

---

## Order and cut lines

1. A1 → A4 → **D1** (proof first: a hidden regression found in week 4 costs the date) → D2.
2. B1 Repeater (with D9 drag) before any other component — it is the most-used Pro surface and the one most likely to drive switch-backs.
3. B5 Code, B6 Number, B7 Textarea, B8 MediaInline, B2 Fieldset, B12 ColorPanel, B11 SourceSelect, B13 DeviceSwitcher, B9 Checklist, B3 Spacing, B14/B15 — then C1–C8.
4. `1.0.0-rc` Fri 23 Oct; D3 with stream B; `1.0.0` Wed 28 Oct.

**If the date is threatened, cut in this order:** B4 Link and B10 ImageTiles (no premium use) → C1 early mount (perf only) → B3 Spacing designed (free set only; keep the stand-in) → B9 Checklist designed (keep the stand-in). Never cut: A1, A2, D1–D3, B1, C2, C6, C7.

Two people can work this list in parallel: one on B (components, C3, C6), one on A/C1/C2/C7/C8/D/E.
