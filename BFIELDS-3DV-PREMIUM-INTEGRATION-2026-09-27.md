# bfields in 3D Viewer Premium — integration demo, test results and issues

**Date:** 27 Sep 2026 · **Demo plugin:** `wp-content/plugins/3d-viewer-premium` on a WordPress Studio site
(Studio site "Animated Explainer 2", `http://localhost:8882`, WP 7.1.2, PHP 8.4, SQLite, WooCommerce 11.1.1, Elementor 4.3.2,
premium 2.0.0 licensed) · **bfields:** this repo at `fc9b664`, copied into the plugin's `lib/bfields/`, plus one change made
during the demo and copied in the same way (B11, the fallback's loading state: `php/includes/Mount.php`; the bundle is
unchanged).

The main plugin's source (`wp-content/plugins/3d-viewer-premium` on the local dev site) was **not touched**.
Everything below was done in the Studio copy, and every change is also saved as patches that dry-run cleanly against the source
(§7).

---

## 1. Verdict

**Data is safe.** Across every test below, the new interface never lost, reshaped or silently changed a stored value, and it
never changed what visitors see unless Codestar makes the same change. Where the two interfaces differ, Codestar is the one that
rewrites data (§5.3); bfields keeps the bytes.

| Area | Result |
| --- | --- |
| Untouched save of every real record, live schemas (PHP, codec **and** real DB write) | 249 records, 18,495 stored values identical; only plan 3.1's sanctioned rewrites |
| Untouched save of every screen in the browser, Classic vs Modern | 27 screens each; 1,546 keys stored identically by both; **every** other difference explained, all of them Codestar-side |
| What visitors see (3-way: before / after Classic / after Modern) | **0 values changed by Modern alone**, 86 changed by Classic alone |
| The same edits through both UIs | identical bytes, including a new hotspot row (20 keys, same order) |
| Cross-mode round trip (Modern → Classic → Modern) | the last Modern save is a byte-for-byte no-op (41/41) |
| Rollback to the original 2.0.0 after using Modern | renders identically (51/51); old plugin saves = new plugin's Classic mode, byte for byte |
| Fresh-install seeding, Reset Section, Reset All | byte-identical in both UIs |
| Licence lapse (free field sets in Modern) | no Pro key lost on viewers, settings (51 Pro-only keys) or products |
| Interface switch, no-JS fallback, refusals | 29 + 31 checks; with the bundle blocked, saving writes nothing |
| A page left open in the other interface, then saved | 9/9: its form is ignored or refused; no row ever changes |
| A slow page while it loads (viewer 269 here: fields at 24 s in **both** UIs; 6–8 s with the files served normally) | "Loading these settings…" instead of the old "could not be loaded" message; the notice only when the bundle really failed: 17/17 on two viewers (B11, fixed in bfields) |

**Not yet "perfect" for a release**, for three reasons, all listed in §5 with a fix each:

1. Two bfields gaps had to be worked around in the host for the demo (the select default, the unit list). They belong in
   bfields (§5.1, B1–B2).
2. Some Codestar-era helpers are missing in the new interface: Cloud Storage picker button, SpecGloss and Advanced-viewer
   inline notices (§5.2, H7).
3. Layout rough edges in the new interface: squeezed title columns next to wide controls, and missing titles on content rows
   (§5.1, B6–B7).

---

## 2. What was built

### 2.1 How it works

```
3d-viewer-premium.php ── require lib/bfields/php/bootstrap.php   (records the copy; newest copy on the site wins)
                      └─ require vendor/codestar-framework/…      (kept in BOTH modes, unchanged)

inc/Field/*.php, inc/Woocommerce/ProductMeta*.php
        \CSF::create*()  →  \BP3D\Helper\Registrar::create*()        (call sites only; arrays unchanged)

Registrar ──(AdminUi::mode(screen))──► Classic:  \CSF::create*()                    (today's code path, untouched)
                                    └► Modern:   \BFields\Compat\Codestar::create*()
```

- **One switch for the site:** option `bp3d_admin_ui` = `modern` | `classic` (its own option, never inside `_bp3d_settings_`).
  Default **`modern`** for everyone, as asked ("option to use old UI so users can go back").
- **Overrides:** constant `BP3D_ADMIN_UI` (wp-config), filter `bp3d_admin_ui` (beats everything), filter
  `bp3d_admin_ui_default` (e.g. `'classic'` for a staged rollout, plan §4.9 Stage A), filter
  `bp3d_admin_ui_surface($mode, 'settings'|'viewer'|'product')` to keep one screen on Classic.
- **Safety net:** if bfields did not boot (a damaged `lib/bfields/`), every screen falls back to Classic automatically.
- **Where users switch:**
  - Settings → General, first row, in both UIs ("Switch to the classic interface" / "Try the new interface").
  - Viewer and product editors: a line in the Publish box ("3D Viewer interface: New · Switch to classic").
  - If the new interface cannot load (bundle blocked by a cache/CDN, JS error before mount): the server-rendered notice
    inside the screen has a **Switch to the classic interface** button. It is a plain link, no JavaScript needed. While the
    page is still loading, the same place says "Loading these settings…" instead (B11).
  - A notice after the update ("3D Viewer has a new interface… Keep the new interface / Switch to the classic interface"),
    shown on 3D Viewer screens until an admin picks either button. **On this Studio site it is invisible**: the mu-plugin
    `wp-content/mu-plugins/01-wc3d-screencast-demo.php` removes all admin notices. It was tested in PHP (§4).
- Only `manage_options` users can switch; editors and shop managers use whatever the admin chose.

### 2.2 Files changed in the demo plugin

| File | Change |
| --- | --- |
| `lib/bfields/` | **new** — `php/`, `build/`, `languages/`, README, composer.json of bfields `fc9b664` (what `bin/dist.sh` packages; the committed `build/` was verified byte-identical to a fresh build), plus B11: `php/includes/Mount.php`, README, `languages/bfields.pot` (the bundle is unchanged) |
| `3d-viewer-premium.php` | require `lib/bfields/php/bootstrap.php` (guarded by `file_exists`) |
| `inc/Base/AdminUi.php` | **new** — mode resolution, switch endpoint, fallback URL, notice, Publish-box line, Modern-only display tweaks, the two bfields workarounds (§5.1), REST detection |
| `inc/Helper/Registrar.php` | **new** — routes each screen to Codestar or bfields; Modern-only: `responsive => true` on `bp3d_responsive_dimensions`, `bp3d-readonly` rows → `pro => true`, Settings args (search, brand) |
| `inc/Init.php` | `Base\AdminUi::class` added first in `get_services()` |
| `inc/Field/Settings.php`, `SettingsPro.php`, `Viewer.php`, `ViewerPro.php`, `inc/Woocommerce/ProductMeta.php`, `ProductMetaPro.php` | `\CSF::create*(` → `\BP3D\Helper\Registrar::create*(` (28 call sites); `ViewerPro::init()` and `ProductMetaPro::register()` also register their screen for bfields' option-search REST request (§5.2, H2) |
| `inc/Base/EnqueueAssets.php` | `bp3dPreview.ui` (the mode) for the preview; preview script versioned by its build hash |
| `build/admin-preview.js` (+ `.asset.php`) | rebuilt from `src/admin/preview/index.tsx` with a Modern data path (§5.2, H3); the toolchain was first proven to reproduce the shipped file byte for byte |
| `inc/uninstall.php` | `bp3d_admin_ui` added to the options removed on uninstall |

---

## 3. Sample data

Created with the **original** 2.0.0 active (so it is what an upgrading site already has), by
`3dv-premium/sample-data.php`. Built from the golden/edge fixtures (real Codestar rows from the dev site) with
model/image URLs moved to files that exist on this site. Every item has meta `_bp3d_bfields_sample = 1` and a title starting
"bfields sample —". Nothing pre-existing was modified.

| ID | Sample | Why |
| --- | --- | --- |
| 1135 | Upload source + poster (full 2.0.0 record) | media arrays → real attachments |
| 1136 | Link source + link hotspot | plan Appendix A record |
| 1137 | Cycle models with nested hotspots | row switchers as `""`, `true`, `"0"`, `"1"` |
| 1138 / 1139 | Responsive sizes set / inheriting | tablet/mobile panes, decimals, `vh` |
| 1140 | Codestar Reset | PHP booleans, button_set stored as arrays |
| 1141 | Slashes and quotes | `\`, `'`, `"` in hotspot text and CSS |
| 1142 | Free-plugin authored | `bp_3d_decoder`, flat `bp3d_model_src` |
| 1143 | Advanced viewer (O3DViewer) | |
| 1144 | Old-version record | the ~50 keys a pre-2.0 save wrote (this site's viewer 269 has this shape) |
| 1145 / 1146 | Blank meta row (`''`) / no meta row | |
| 1147 | Undeclared keys | `readonly`, `invalid`, `bp3d_future_setting` must survive |
| 1148 | Unicode, emoji, HTML | Bengali + emoji, HTML in desc, quotes in a text field |
| 1149 | Simple product: 2 models, hotspots incl. a product hotspot | product search |
| 1150 | Variable product, colour → model (+ popup models) | `attribute_*` row maps, undeclared row keys |
| 1154 | Product with legacy free-plugin flat keys | `legacyFreeModelRows()` defaults |
| 1155 | Private page with every sample viewer's shortcode | visual check: `/bfields-sample-every-sample-viewer/` |

Products are published but hidden from the catalog. Remove everything with
`BP3D_SAMPLE_ACTION=remove studio wp eval-file 3dv-premium/sample-data.php`.
The site's own data (viewer 269, products 314–374, presets) was used as-is and is the "real upgrading site" part of the tests.

---

## 4. How it was tested

Harness: `3dv-premium/` (see its `README.md`), kept outside the public bfields repo because it carries patches against 3D Viewer Premium's source. `run-all.sh` runs everything below from a
baseline snapshot and puts the site back afterwards. Snapshots hold the **raw** DB bytes (`option_value`/`meta_value`, one list
per post so duplicated rows show), the shortcode output of every viewer, and every product page's viewer configuration fetched
over HTTP. `compare.php` diffs at the deepest differing path, with PHP types and key order.

| # | Suite | What it proves | Result |
| --- | --- | --- | --- |
| 1 | `roundtrip-live.php` | Every record on the site + 226 golden/edge fixtures → the **live** Modern schemas → the browser round trip with JavaScript's JSON rules (whole floats become ints, integer-like keys reorder) → `Sanitizer` → real `Option::save()`/`PostMeta::save()` on scratch storage. Every stored key identical or sanctioned; every added key equals what Codestar's form posts. | **PASS** — 249 records, 18,495 values identical in codec and storage; sanctioned: 18 Reset arrays, 2 empty checkbox lists, 1 kses on never-saved text; 2,097 first-save additions all equal to Codestar's |
| 2 | `seed-parity.sh` | Fresh install seeded by Codestar vs bfields | **PASS** — byte-identical (68 keys, raw types: 22 bools, 9 ints) |
| 3 | `e2e/untouched-saves.mjs` | Real browser: Settings + 16 viewers + 10 products saved untouched, Classic then Modern, from the same bytes | **PASS** — 27/27 each, no JS errors |
| 4 | `crossmode.php` | Every changed byte put in a bucket from the live schema; Classic vs Modern key by key | **PASS** — Modern changed only 752 first-save additions (Classic added the same 752), 7 Reset arrays, 1 kses. 1,546 keys identical; 83 differ, **all** explained by Codestar behaviours (§5.3) |
| 5 | `frontend3.php` | Viewer configs visitors get: before / after Classic / after Modern | **PASS** — 2,840 same, 170 changed identically by both (first save of old records, §5.3 P3), 86 Classic-only, **0 Modern-only** |
| 6 | `e2e/edits.mjs` + `edits-check.php` | Same edits through each UI's own controls: switcher, segmented, select, text with `>`, number, MIME tile, dimensions, CSS, a new hotspot row, a tablet width | **PASS** — identical stored values; new row identical (20 keys, same order) |
| 7 | `e2e/resets.mjs` | Reset Section / Reset All buttons in each UI | **PASS** — identical bytes (59 / 68 keys) |
| 8 | round trip | Modern-saved → untouched Classic → untouched Modern | **PASS** — the Modern leg changes nothing (41/41) |
| 9 | `licence-lapse.php` | Free field sets registered in Modern, `can_use_premium_code()` false in memory, Pro records saved untouched and edited | **PASS** — 29 checks; 57 locked rows are `pro`; `fs_accounts` never written |
| 10 | `switch-unit.php`, `e2e/switch.mjs` | Default, both directions from Settings and the Publish box, bundle blocked, nonce/capability/redirect refusals | **PASS** — 29 + 31 checks (final re-run: all 30 functional checks pass; the console check caught O1, truncated third-party scripts. Re-run after B11: the same, 30/30 functional; 8 extra loads showed console errors only on the loads where a script download was cut short) |
| 10b | `e2e/stale-tab.mjs` | A page left open in one interface while the site is switched to the other, then saved: viewer and Settings, both directions | **PASS** — 9/9: the other UI's form is ignored (meta box) or refused with an error that keeps the typed value (Settings); no row changes |
| 10c | `e2e/fallback.mjs` | The fallback's two states (B11), timed in the page from before its first byte, on viewer 269, a sample viewer and Settings: a working page; the bundle blocked; the bundle giving up (no payload); JavaScript off; inline scripts blocked by a strict CSP | **PASS** — 17/17 on each viewer: "Loading" on every working load and never the notice (fields 6–41 ms after `DOMContentLoaded`); blocked → notice 5.0 s after `DOMContentLoaded`; gave up → at `DOMContentLoaded`; no JS → at once; CSP → 60.0 s after the first draw, CSS only |
| 11 | `e2e/preview.mjs` | Preview in Modern: mounts after Classic's 6 s polling window, re-mounts per tab visit, follows store edits, popup, cycle models | **PASS** — 8/8 |
| 12 | `e2e/choices.mjs` | Hotspot product search on both boxes; drafts hidden; query not widenable; logged-out refused; stored as id string | **PASS** — 17/17 |
| 13 | `e2e/editor-edges.mjs`, `e2e/ui-smoke.mjs` | Block editor save and Quick Edit write nothing; `#tab=analytics`, search, dependencies, the fresh product box, units, `#model{ID}` | **PASS** — 7/7, 16/16 (final re-run: all 15 functional checks pass; the console check caught O2, a browser view-transition abort) |
| 14 | `strict-notices.php` | E_ALL handler over ~36 code paths of bfields and the host files | **PASS** — none |
| 15 | Update / rollback (manual, folder swap) | Original 2.0.0 ↔ bfields build with Modern-written data | **PASS** — see §1 |

**Order and final code.** Every data-path suite (#1, #3–#9, #15) ran after the last change to data-path code (bfields, the
Registrar, the field files, the preview, `AdminUi`'s two workarounds). Later changes touched only the switch UI (H4, and the
"bfields did not boot" guard in §5.2), so the PHP suites (#1, #2, #9, #10, #14) and the switch, UI and stale-tab browser suites
were re-run on the final code from the pristine baseline, with the same numbers.

**Environment note.** Late in the session the machine was swapping hard (20.8 of 21.5 GB swap in use), and Studio's PHP workers
served static files at ~0.1–0.6 MB/s, so every wp-admin screen took 20–30 s to load (WordPress itself rendered them in
0.2–0.3 s with no outbound HTTP calls — profiled). One full `run-all.sh` was aborted by a 30 s page timeout in the **Classic**
pass for that reason. The browser suites now skip media downloads (models, images, fonts: no data path uses them;
`BP3D_E2E_MEDIA=1` keeps them) and allow slow pages. woocommerce.com was also unreachable from this machine at the time.

Backups taken before anything was changed: `<Studio>/_backups/animated-explainer-2-2026-09-27-pre-bfields/`
(`3d-viewer-premium/` = the original plugin, `ht.sqlite.backup` = the DB before sample data, `ht.sqlite.after-samples` = after,
`3d-viewer-premium-bfields-integrated/` = the finished demo plugin).

---

## 5. Issues — to fix later

Severity: **High** = can change or lose data · **Medium** = wrong behaviour, data safe · **Low** = cosmetic or performance.

### 5.1 bfields (framework)

**B1 · FIXED 28 Sep · Medium · A single `<select>` whose value is not one of its options.** `ui/fields/Choice.tsx:106`
React shows the **first** option when the value matches none, but the store keeps `''` (or the stale value). Consequences:
(a) dependencies are evaluated against the hidden value — on the product box, `bp_model_template` has no default, so on any
product that never had 3D settings saved, the 7 fields that depend on `bp_model_template == 'none'` (zoom, arrows, hotspot style,
pin fields, height, background) were **hidden** in Modern while the select showed "None"; (b) the first save wrote `''` where
Codestar writes `none` (readers cast to int, so data-equivalent); (c) a stale stored value (e.g. a deleted preset id) is kept but
shown as "None". *Demo workaround:* `AdminUi::classicCompatible()` (`inc/Base/AdminUi.php:238`) sets a single select's
missing-key default to its first option, exactly what the browser posts; stored values, seeding and resets are untouched.
*Fix in bfields:* compute that default in `Schema::field()`; in `Choice.tsx`, render an extra option for a stored value that is
not in the list (e.g. "12 (not available)") so what is shown is what is stored. Same for the unit `<select>` in
`Dimension.tsx`.

*Fixed 28 Sep (bfields):* `Schema::select_default()` gives a single select, for a key the row does not have, what the browser
posts: its `placeholder` option ('') if it has one, else its first option, whenever the default is not an option. Seeding and
resets still use the raw default (`csfDefault`). `Choice.tsx` draws the placeholder option, and a stored value the list does
not offer as its own option ("12 (not available)"), kept until another is picked. `Dimension.tsx` / `Spacing.tsx` do the same
for a stored unit outside the list (an empty unit still shows the first, as Codestar's select does). Premium's workaround is
removed from the demo and from `host-patch/premium-host.patch`.

**B2 · FIXED 28 Sep · High (during coexistence) · Default unit lists differ from Codestar's.** `ui/fields/Dimension.tsx:44` offers
`px, %, em, rem, vw, vh`, `ui/fields/claude/Spacing.tsx:48` offers `px, em, rem, %`; Codestar's default is `px, %, em`. A user
who picks `vw` in Modern and later switches back to Classic loses it on the next Classic save: Codestar's select cannot show it,
so the browser posts `px` (this happens today with `vh`, see P1) — `100vw` silently becomes `100px`. *Demo workaround:*
`AdminUi::classicCompatible()` gives unit-less dimension/spacing fields Codestar's list. *Fix in bfields:* default to
`['px', '%', 'em']` whenever a field authors no `units` (it is Codestar's contract), at least while Classic can be switched back
to.

*Fixed 28 Sep (bfields):* `dimensions` and `spacing` with no authored `units` get `['px', '%', 'em']` in the schema
(`Schema::CSF_UNITS`) and in both components' fallback. Premium's workaround is removed.

**B3 · FIXED 28 Sep · Medium · The option-search route needs the screen registered inside the REST request.** `GET /bfields/v1/choices/<key>`
finds the field on the registered screen. Hosts commonly register meta boxes only in wp-admin (`is_admin()`, product edit
requests) — premium does — so the route answered **404** and the hotspot product search was dead in Modern. *Demo fix:* host-side
(H2). *Fix in bfields:* document it in the README ("register your screen in bfields REST requests too") and ship a helper,
e.g. `bfields_is_rest_request($unique)`, so every host does not reinvent the URL parsing.

*Fixed 28 Sep (bfields):* `bfields_is_rest_request($unique = '')` (`php/includes/helpers.php`), documented in the README. It
matches `bfields/v1/options/<unique>` and `bfields/v1/choices/<unique>` by the **exact** key, from `REQUEST_URI` or
`?rest_route=`. Premium's own `AdminUi::isChoicesRequest()` compares with `strpos(…, '/bfields/v1/choices/' . $unique) === 0`,
a prefix match (`_bp3d` would match `_bp3dimages_`). Harmless with premium's keys, but the host should switch to the helper
when it is ported.

**B4 · FIXED 28 Sep · Low · The search route builds the whole schema before checking permission.** `Choices::can_list()`
(`php/includes/Choices.php:98`) calls `field()` → `Registry::schema()` first, which runs every `callback`/`content` closure,
also for logged-out requests. Check the screen's capability from the raw args first, then build.

*Fixed 28 Sep (bfields):* `can_list()` checks the capability from the raw registration first; a refused request builds the
schema only when something filters `bfields_choices_allowed` (the filter is given the field). An unknown screen is still 404;
a refused user now gets 403 even for an unknown field. `tests/php/choices.php` proves a refused request runs no `content`
closure.

**B5 · FIXED 28 Sep · Low · The bundle is enqueued on block-editor screens where the box is removed.** `Metabox::enqueue()`
(`php/includes/Metabox.php:134`) checks only the post type; premium removes its box in Gutenberg mode
(`filter_block_editor_meta_boxes`), so ~117 KB of JS/CSS loads for nothing. No visual effect (all 481 selectors in
`build/index.css` are scoped to bfields elements, verified). Skip when `use_block_editor_for_post()` is true, or enqueue from the
box's render callback.

*Fixed 28 Sep (bfields), differently from the suggestion:* skipping whenever `use_block_editor_for_post()` is true would
also skip bfields boxes Gutenberg does show. `Metabox::is_shown()` instead checks the box is still in `$wp_meta_boxes` (core
registers boxes before `admin_enqueue_scripts` in both editors, so `remove_meta_box()` is already visible), and in the block
editor applies `filter_block_editor_meta_boxes` to a copy first.

**B6 · FIXED 28 Sep · Low · Content rows lose their title.** `ui/fields/Display.tsx` renders a `content` field without its `title`; Codestar
shows it in the title column. Visible on the product box ("Support", "Shortcode", "Template Shortcode", "Note") and on the
"Admin interface" row.

*Fixed 28 Sep (bfields):* a `content`, `callback`, `notice` or `submessage` with a title renders as a row
(`bfields-row--titled`): title (and subtitle) in the title column, the HTML and its `desc` in the control column. Headings and
untitled display fields are unchanged. No real schema has a titled `callback`, so the preview mount points are unaffected.

**B7 · FIXED 28 Sep · Low · Title column squeezed next to wide controls.** In the row layout the control column does not shrink, so a
segmented control with long options, a 6-option radio group or an upload field pushes the title/description into a
one-word-per-line column: "Default Hotspot Style", "3D Viewer Position", "3D Source", "3D Poster Image". Screenshots:
`3dv-premium/screenshots/viewer-model-tab-squeezed-titles.png`, `product-box-squeezed-radio.png`. Put such
controls on their own line (like `wide` in `ui/layout/FieldRenderer.tsx:279` does for repeaters) when options are many or long.

*Fixed 28 Sep (bfields, CSS only):* plain rows wrap. The title keeps at least 180px, and a control that does not fit beside
it takes its own line, right-aligned (`ui/fields/claude/claude.css`). A row that fits does not wrap, so its pixels do not
change. Wide, fill and display rows keep their own layouts.

**B8 · FIXED 28 Sep · Low · Duplicate React keys.** `MetaboxShell.tsx:93`, `AdminShell.tsx:345/357` key rows by `field.id`; premium's product
box has two `content` fields with the id `shortcode`. No glitch seen; React warns in development. Key by index + id.

*Fixed 28 Sep (bfields):* `fieldKeys()` (`ui/layout/FieldRenderer.tsx`) keys by id and suffixes repeats (`shortcode#2`), used
by both shells, Repeater and Fieldset. Not by index: search and row tabs filter the list, and an index key would hand one
field's component state (the link toggle) to another.

**B9 · Info · Line endings.** Textareas/code editor store `\n` in Modern and `\r\n` in Classic (the browser's form encoding). Both
are fine for CSS; noted so nobody chases it in a diff. The code editor is still a plain textarea (open decision 3 of the
26 Sep report).

**B10 · Info · Row icons.** Premium's field arrays carry no `icon` keys, so rows render without icon tiles, unlike the Figma
frames; the pixel parity measured on the demo's own screens does not apply to premium's real (larger) field set. Adding `icon`
keys (Codestar ignores them) or an id → icon map through `bfields_schema` would bring the rows closer to the design.

**B11 · Medium · FIXED here (in bfields) · The fallback said "could not be loaded" while the page was still loading.**
Reported during the demo on viewer 269: the box showed "These settings could not be loaded, so they cannot be edited right now…"
with a switch button, then the fields appeared. The notice is server HTML inside every root, and the bundle removes it when it
mounts. The bundle mounts on `DOMContentLoaded`, after every script on the page. On this machine viewer 269 drew the box at
6.7 s and reached `DOMContentLoaded` at 24.9 s, so the box said "could not be loaded" for 18 s on a page that was working.
*Fixed in `php/includes/Mount.php`:* the fallback now has two states. First it says "Loading these settings…" ("Loading the
settings…" on an options page), with a spinner. It turns into the notice only once the bundle has had its chance:
- at once, if the bundle ran and gave up (no payload, schema mismatch), or JavaScript is off;
- `bfields_fallback_delay` seconds (new filter, default 5) after `DOMContentLoaded`, if the bundle never ran (404, blocked,
  truncated);
- 60 s after the first draw, by CSS alone, if the small inline script that does the above cannot run (a strict CSP, or an
  earlier script on the page that never finishes loading).

The notice now says "These settings are taking longer than usual to load, or they could not load on this site. Nothing has
changed: saving the post will not change them." The bundle is unchanged (no rebuild). `docs/index.html`, the README and
`languages/bfields.pot` are updated. Every path is timed in the browser (§4 #10c), and `switch.mjs` still passes with the bundle
blocked. Screenshots: `3dv-premium/screenshots/fallback-loading.png`, `fallback-notice-viewer.png`,
`switch-fallback-settings.png`.

**B13 · Low · FIXED 28 Sep · Reset All kept the stored row's key order.** Found by the 28 Sep re-run ("reset all:
DIFFERENT"): every value the same, both rows 2,443 bytes, keys in a different order. `Storage\Option::reset_all()` wrote the
defaults over the stored row, so they kept that row's order; Codestar's Reset All starts from an empty array and writes the
declared fields in order. The first run passed only because its baseline happened to be in declared order. *Fixed:* the row
is rebuilt in declared order, undeclared keys after it (they still survive, rule 7.3). `tests/php/seeding.php` now resets a
reversed row with an extra key and requires the seeded row back, byte for byte, then that key; it fails on the old code.

**B12 · Low (speed, optional) · Both interfaces wait for every script on the page before they show fields; the new one
could show them sooner.** Measured on viewer 269, one load each, with media blocked as in the suites:

| Viewer 269 | Box drawn | Fields shown | Scripts on the page |
| --- | --- | --- | --- |
| Modern, static files from this Studio server | 6.6 s | 24.1 s | 123 (9.3 MB) |
| Classic, static files from this Studio server | 6.5 s | 24.3 s | 135 (9.6 MB) |
| Modern, the same files served from disk | 5.8 s | 6.0 s | 123 |
| Classic, the same files served from disk | 7.4 s | 7.6 s | 135 |

"Served from disk" means the browser was handed the same files straight from the plugin folders, as any normal web server
would serve them. It shows what this page costs on a working host. So the 24 s is this server delivering about 9.3 MB of scripts
at roughly 0.5 MB/s (bfields' own 62 KB took 9.9 s to arrive). The remaining 5–6 s is the server producing the HTML. **Classic
does not show its fields sooner.** Until Codestar's script runs on `DOMContentLoaded`, its box shows the tab list and an empty
panel, because all 155 fields sit in sections that are `display: none`
(`screenshots/classic-before-domcontentloaded.png`). Modern shows "Loading these settings…" in that time
(B11). bfields' own cost is small: 62 KB of JS and 53 KB of CSS, and it mounts 6–41 ms after `DOMContentLoaded`.

bfields renders on `DOMContentLoaded` (`ui/index.tsx`). That is deliberate: host scripts that register a field or an adornment
after the bundle are then picked up by the first render (the registry, `ui/core/registry.ts`, is plain Maps and never
re-renders). But it could render sooner. The options page enqueues the bundle on `load-{hook}`, so it prints early in the
footer: on Settings it **had already run at 7.1 s, yet the fields waited for `DOMContentLoaded` at 23.2 s**. The meta box
enqueues it at `admin_enqueue_scripts` priority 20 (`php/includes/Metabox.php:51`), behind almost everything, so on viewer 269 it
only runs at 24.1 s.

*Improvement (optional; not done in the demo, because it changes when host scripts may register):*
1. Make the registry observable (a version number plus `useSyncExternalStore`), so a field or adornment registered after the
   first render re-renders the rows it affects.
2. Then mount as soon as the bundle runs. The roots are already in the page (they print before the footer scripts). Keep the
   `DOMContentLoaded` pass for roots printed later.
3. Enqueue the meta box's bundle as early as the options page's (on `load-post.php` / `load-post-new.php`), so it prints right
   after its four dependencies.
4. Components that use a script printed later (`wp.media`, a code editor, TinyMCE) must look for it when used, not at render.

On a slow site that would put the new interface ahead of Classic: on this Settings page, fields at about 7 s instead of 23 s.
Speed only: the store and the save paths do not change.

### 5.2 Host integration (3D Viewer Premium) — done in the demo, to port

**H1 · Registrar + AdminUi.** As §2. Port with `host-patch/premium-host.patch` + `premium-main-file.patch`.

**H2 · Screens registered for the search route.** `ViewerPro::init()` and `ProductMetaPro::register()` return early outside
wp-admin; they now also register when `AdminUi::isChoicesRequest($key)` (`inc/Base/AdminUi.php:151`) is true (Modern only,
decided from the URL because it must be known on `init`). Registration grants nothing: the route still checks the screen's
capability (tested: logged out → refused, drafts hidden, query not widenable).

**H3 · Live preview.** `src/admin/preview/index.tsx` read Codestar's inputs by `name`, walked `.csf-cloneable-item` rows and
polled for its mount node for 6 s only. In Modern it now reads `window.bfields.getValues('_bp3dimages_')` (stored shapes
converted to what the inputs would hold), follows `bfields.subscribe` and `bfields:device-change`, and re-mounts whenever the
Preview tab's node is re-created. Classic code paths are unchanged. Patch: `host-patch/preview-modern.patch` (applies cleanly to
the source). The one value the store cannot give: a product hotspot's product **name** (Codestar took it from the select's
option text); the card is built from the product id as on the frontend.

**H4 · A switch redirect bug, found and fixed here.** With no `Referer` header (privacy settings, some browsers), the switch
redirected to a bare `?bp3d_admin_ui_switched=…`, i.e. back to `admin-post.php` — a blank page. Every switch link now carries
`redirect_to`, and the Settings page is the fallback.

**H4b · No dead switch when bfields is missing.** If `lib/bfields/` does not boot, every screen already falls back to Classic;
the Settings row and the Publish-box line now say the new interface could not be loaded instead of offering a switch that would
change nothing (checked in `switch-unit.php`).

**H5 · Settings args in Modern.** `show_search => true` (Codestar's default is on, bfields' off) and the brand
(`#1b5cf0`, `#3b52f6`, the logo).

**H6 · `bp3d-readonly` → `pro`.** Premium's free field sets lock 57 upsell rows with the `bp3d-readonly` class (several share the
placeholder id `readonly` across different types). In Modern they are mapped to `pro` (locked, Pro badge, never saved).
`preserveProData()`/`preserveProSettings()` still run through bfields' `csf_*` bridge with Codestar's arguments (proved in §4 #9).

**H7 · Medium · Missing in Modern (Codestar-DOM helpers not ported yet).** `build/admin.js` injects these into Codestar inputs,
so in Modern they simply do not appear:
- **Cloud Storage picker** button next to model fields (`src/admin/cloudPicker.ts`) — port with `bfields.addAdornment()`.
- **SpecGloss** inline notice under model URLs (`specGlossInline.ts`) and the **Advanced viewer** notice
  (`advancedViewerInline.ts`) — adornments too.
- Hiding hotspot "Link text" when the style is `style-1` (a body-class CSS hack in `src/admin/index.ts`) — can become a
  dependency with `'scope' => 'global'`.
- `angle_property` X/Y/Z placeholders (free set only) — a `placeholder` key.
The shortcode copy buttons work in both modes (they are PHP-rendered). The dead `csf-added` listeners
(`advancedViewerInline.ts:43`, `cloudPicker.ts:125`) noted on 26 Sep are unchanged.

**H8 · Codestar is still loaded in Modern.** Deliberate for coexistence: it keeps `class_exists('CSF')` arbitration with other
Codestar plugins exactly as today and makes Classic one click away. CSF enqueues nothing on screens it does not own.

**H9 · Default = Modern for all sites.** As requested. The migration plan recommends a staged rollout (upgrades on Classic first,
plan §4.9 Stage A); that is one filter: `add_filter('bp3d_admin_ui_default', fn() => 'classic')`.

### 5.3 Pre-existing in 3D Viewer 2.0.0 / Codestar (not caused by bfields — found by the tests)

These happen **today**, with Codestar, on a plain "Update" without touching anything. The Modern interface does not do them.

**P1 · High · A unit outside a field's `units` list becomes the first unit.** Viewer 1138: mobile height `60vh` → `60px` on an
untouched Classic save (`bp_3d_height` offers `px, em, pt`). Any stored unit Codestar's select cannot show (from an import,
Elementor-era data, or B2) is rewritten. Modern keeps it.

**P2 · Medium · A select value outside its options becomes the first option.** A hotspot `type` of `text` became `info`
(viewer 1148, product 1149); a `bp_model_template` pointing to a deleted preset would become `none`. Modern keeps the value
(and shows the first option, B1).

**P3 · Medium · The first save of an older record changes the frontend — in both UIs.** Readers' fallbacks differ from the
field defaults a save writes. Seen here: product viewer height 350px (reader fallback) → 320px (field default) on products
367/370/373/374; the free-authored viewer 1142 gains auto-rotate and navigation arrows; `bgImage` null → `""`. Every upgrading
user who opens and saves an old record gets this, whichever UI. Align the reader fallbacks with the field defaults (or the
reverse) before 10k sites hit it through any UI change.

**P4 · Medium · Settings → Custom CSS with `>`.** Both UIs store CSS through `wp_kses_post` (plan decision 3), which turns `>`
into `&gt;`. The **per-viewer** CSS survives by accident: it travels in the `data-attributes` attribute and `esc_attr()` does
not double-encode, so the browser decodes it back (verified: `.bp3d-a > .b` is parsed on the sample page). The **settings**
Custom CSS does not travel that way: `EnqueueAssets::renderCustomCSS()` (`inc/Base/EnqueueAssets.php:185`) prints it raw inside
`<style>` after `wp_strip_all_tags()`, and entities are not decoded inside `<style>`. **Verified in the browser:** with
`.bp3d-p4-probe > span { … }` saved (stored as `.bp3d-p4-probe &gt; span { … }`), the page's `<style>` holds the `&gt;` form
and the browser parses no rule for it — every custom rule using `>` is silently dropped on the frontend, today. Fix: `wp_specialchars_decode()` before `wp_strip_all_tags()` on output, or give both CSS fields a `sanitize` callback
(`wp_strip_all_tags`) so they skip kses — the same callback in both UIs keeps them byte-identical.

**P5 · Low · Blank meta row warnings.** A viewer whose `_bp3dimages_` is `''` makes `Utils::getPostMeta()` (`inc/Helper/Utils.php`
~212) index a string: "Illegal string offset" warnings on every render.

**P6 · Medium · Reset-era PHP booleans: the toggle and the frontend disagree.** A row Codestar's Reset wrote holds PHP
`true`/`false` (viewer 1140). Both UIs show `true` as ON, but premium's readers test `=== '1'` (`Utils::getPostMeta()` with
`$is_boolean`), so the frontend renders it OFF. An untouched **Classic** save posts `'1'`, so the frontend flips to ON
(viewer 1140 gains its thumbnail strip — one of the 86 Classic-only frontend changes). **Modern** keeps `true` (decision 12:
never rewrite a value nobody touched), so the frontend stays as it was but keeps disagreeing with the toggle. Fix in premium, in
both UIs' favour: read booleans with the truth table (`'1'|1|true|'true'|'yes'`, as `AnalyticsPro::settingBool()` already does).

**P6b · Low · Codestar's other rewrites** (avoided by Modern, harmless to readers today): undeclared keys dropped on every save
(`bp3d_future_setting`, old flat `bp3d_model_src`); `''` written for `content` fields that carry an id
(`bp3d_product_save_btn`, `meta_heading`, `invalid`, `shortcode`); group rows back-filled with every declared sub-field; empty
nested groups dropped from rows; empty tablet/mobile panes posted by `bp3d_responsive_dimensions`; seeded ints turned into
strings; line breaks → CRLF.

**P7 · High (still open from 26 Sep) · Classic "Restore" deletes the whole meta row.** `show_restore => true` on the free
`Viewer.php`, free `ProductMeta.php` and `ProductMetaPro.php`: Codestar deletes the row after the save filter ran, so
`preserveProData()` cannot help. Modern has no destructive restore. Flip them to `false`.

### 5.4 Console errors seen on the slowed-down machine (not from bfields or premium)

**O1 · Console errors from truncated scripts (environment).** `Cannot unlock an undefined object.` (WordPress's
`@wordpress/private-apis`), `ReferenceError: elementorCommon is not defined` (Elementor) and a `TypeError … reading 'sto…'` showed
up on some page loads, in both interfaces. Root cause found: with media enabled the browser reports
`net::ERR_CONTENT_LENGTH_MISMATCH` — Studio's local server, starved by the machine's swapping (see §4, environment note), cut
some file transfers short, and whichever script arrived truncated failed. None of these come from bfields or premium code, and
none appeared while the machine was healthy (earlier full passes: zero errors). A truncated **bfields** bundle is the "bundle
blocked" case, proven in `switch.mjs` to leave the fallback notice up and write nothing on save.

**O2 · Console error `InvalidStateError: Transition was aborted because of invalid state. Page already revealed`** (×2) in the
final UI-smoke re-run on the slowed-down machine. WordPress 7 enables cross-document view transitions in wp-admin
(`wp-admin/css/view-transitions.css`); Chrome reports an aborted one when a navigation starts while a slow page is still
revealing. Neither bfields nor premium uses view transitions. The harness now ignores exactly this message (`e2e/lib.mjs`).

### 5.5 Not covered by these tests

WordPress 6.5 floor and PHP 7.4 (the site is 7.1.2 / 8.4); multisite; RTL; keyboard/a11y; other languages; free + premium both
active (two `lib/bfields` copies); another Codestar plugin active at the same time; a real (not simulated) licence expiry;
heartbeat autosave on premium's box (bfields' own e2e covers it on its demo box); `wp.media` upload flows (untouched media arrays
are proved, picking new files was not automated); Cloud Storage, SpecGloss conversion, Visual Editor, Elementor widgets and the
block (they do not use Codestar).

---

## 6. Recommended order before this goes into the main plugin

1. **bfields:** ~~B1, B2, B3, B4, B5, B6, B7, B8, B11, B13~~ done 28 Sep (see §5.1 and §9); the two
   `AdminUi::classicCompatible()` workarounds are removed from the demo and the host patch. Left: optionally B12 (render before
   `DOMContentLoaded`), and a clean `run-all.sh` pass on a machine that is not swapping (§9).
2. **Premium, independent of bfields:** P7 (`show_restore`), P1 (units outside the list), P6 (boolean reads), P3 (reader
   fallbacks vs defaults), P4 (custom CSS `>`), P5.
3. **Premium host work:** apply the patches (§7), port H7's helpers as adornments.
4. Decide the default (H9) and whether the upgrade notice copy is final.
5. Re-run the whole harness against the main plugin build on a WP 6.5 + PHP 7.4 site, then release-gate as in the plan.

## 7. Porting to the main plugin

In `3dv-premium/host-patch/` (all three dry-run cleanly against the source at `210f654`):

| Patch | Applies to |
| --- | --- |
| `premium-host.patch` | `inc/` — AdminUi, Registrar, the six field files, Init, EnqueueAssets, uninstall (`patch -p1`) |
| `premium-main-file.patch` | `3d-viewer-premium.php` in the source's own formatting (the Studio copy is the Freemius-processed build) |
| `preview-modern.patch` | `src/admin/preview/index.tsx` (`git apply`), then `npm run build` |

Then copy bfields' `php/`, `build/`, `languages/`, README and composer.json into `lib/bfields/` (commit it — `lib/` is already
in `npm run zip`), and exclude `lib/bfields` from `make-pot`.

## 8. Re-running the tests

```bash
cd 3dv-premium                                    # the private harness; export BFIELDS_ROOT=/path/to/bfields
export BP3D_WP="/path/to/studio-wp-wrapper"      # runs `studio wp` in the site; or "wp --path=/site"
export BP3D_SITE_URL=http://localhost:8882 BP3D_ADMIN_USER=admin BP3D_ADMIN_PASS='…' BP3D_OUT=/tmp/bp3d
./run-all.sh                                      # ~40 min; snapshots the current data first and restores it at the end
```

## 9. 28 Sep — bfields fixes and re-test

bfields changes (working tree, not committed): B1–B8, B11 and B13 (§5.1). Copied into the demo's `lib/bfields/`; premium's two
`AdminUi::classicCompatible()` workarounds removed from the demo and from `host-patch/premium-host.patch`, which still dry-runs
cleanly against the source at `210f654`. Backup of the demo files before this: `<Studio>/_backups/
animated-explainer-2-2026-09-28-pre-bfields-fixes/`.

**bfields' own suites** (`WP_PATH=dev.local ./bin/test.sh`, real Codestar, the untouched 3D Viewer Premium source): TypeScript
types, 48 unit tests, PHP round trip, seeding (now also Reset All), save parity, choices route (now also B3/B4), the new
`tests/php/schema.php` (B1/B2, 12 checks) and the framework meta box end to end (28/28): **all pass**. Design parity reports 12
mismatches (tab and panel padding, slider width, tile grid), and reports **the same 12 on the committed code without these
changes**: they are older than this work and none of them are rows, selects or titled rows. They look like the demo settings
screen left in the sidebar-tabs layout. Not investigated further.

**The 3D Viewer Premium harness** ran on a machine with 16.3 of 17.4 GB swap in use (the §4 environment note). Every result
that concerns stored data or behaviour passed, except the Modern untouched save, which never got past a page-load timeout:

| Suite | Result |
| --- | --- |
| Untouched-save round trip (PHP), fresh-install seeding parity, licence lapse, stale tab, fallback (17/17), strict notices | PASS |
| Same edits through both interfaces | stored identically (the only failed check: console errors, O1) |
| Resets | re-run with B13: **Reset Section and Reset All identical bytes**, both interfaces |
| Product search (B3/B4) | 16/16 functional checks (logged out refused, unknown field/screen 404, scope not widenable); console errors only |
| Interface switch | 30/31, console errors only (Elementor `elementorCommon`, O1) |
| Live preview | 6/8 in the run; the cycle viewer's preview, re-checked alone, renders both model rows. Console errors only |
| Editor edges / UI smoke | B1 with no workaround: on a fresh product the fields that depend on `bp_model_template == 'none'` **show**, and the save writes `none` (what Codestar writes); then a page-load timeout |
| Modern untouched save of every screen (and steps 4, 5, 8, which use its snapshot) | **not completed**: three attempts, each stopped by a different environment timeout (bundle never arrived: `ERR_CONTENT_LENGTH_MISMATCH`; an admin-menu flyout over Update). Checked by hand: both viewers mount, the bundle is enqueued, no horizontal overflow |

Every console error seen is O1 (truncated WordPress core, Elementor or model-viewer scripts). None comes from bfields: the
bundle depends only on `react-jsx-runtime`, `wp-api-fetch`, `wp-element`, `wp-i18n`.

**Still to do before porting:** one clean `run-all.sh` on a machine that is not swapping, above all steps 3–5 and 8 (every
byte explained Classic vs Modern, nothing visitors see changed by Modern alone, the cross-mode round trip), which have no result
from this re-test. Then commit bfields and continue with §6 step 2.
