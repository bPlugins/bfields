# Replacing Codestar with bfields — migration plan

> **Status, 30 Sep 2026:** 2.0.0 ships Stage A+B together per `3d-viewer-premium/plan/NEW-UI-2.0.0-PLAN.md`; Stage C unchanged.

**Scope:** 3D Viewer (free, `3d-viewer/`) and 3D Viewer Premium (`3d-viewer-premium/`), plus **bfields**, a reusable
bPlugins settings/meta-box framework in its own repo (`bPlugins/bfields`) that other bPlugins products (HTML5 Video
Player, …) can adopt later. bfields is **not** used in the Gutenberg block; it replaces Codestar on the Settings
page, the classic shortcode-generator meta box and the WooCommerce product meta box.

**Hard constraints from the brief**

1. Zero data loss, zero broken sites. Existing installs must render exactly the same after the update.
2. Same storage keys, same value shapes. No data migration step.
3. Built as a framework, not a one-off: a JavaScript (React) body on a thin PHP spine, with a Codestar compatibility
   layer so the existing CSF field definitions and data work unchanged.
4. **Codestar and bfields ship side by side for a coexistence period of about two to three months** so users can adapt,
   switchable per site; then Codestar is retired. One UI is active at a time; both read and write the same data.

Revision 3 (2026-09-22): JS-first on a PHP spine (4.0); the PHP↔JS JSON wire format is the API and the store holds
values in stored shape (4.0); package renamed `bfields`, shipped at `lib/bfields/` not `vendor/` (4.1); one prebuilt
bundle with arbitration copied from `bp-extension-manager` (4.7); coexistence is time-boxed and staged, not permanent
(4.9), with a retirement gate (4.10) and a conflict matrix (4.9); phases reordered Settings-first and narrowed (9);
§11 decisions resolved. Revision 2 (2026-09-20) added dual-UI mode and Appendix D.

Everything below was verified against the live code on this machine (premium 2.0.0 working tree, free 1.9.3, CSF 2.3.1
vendored in both, a local WordPress dev site) on 2026-09-19 and re-checked on 2026-09-22.

---

## 1. Decision summary

| Question | Decision | Why |
| --- | --- | --- |
| How do we stay data-compatible? | bfields keeps CSF's **storage contract** byte-for-byte: one serialized array per `unique` key (`_bp3d_settings_` option, `_bp3dimages_` and `_bp3d_product_` post meta), same field ids, same value shapes (`'1'`/`'0'` switchers, `{url,id,…}` media arrays, `{width,unit}` dimensions, list-of-rows groups). The React store holds those exact shapes (4.0). | Every reader in the plugin (`Utils::getPostMeta`, `Utils::getSettings`, `Shortcode`, `Product`, `AnalyticsPro`, uninstall, Import, SpecGloss scanner, the block's `toBool`) depends on these exact shapes. Section 3 lists them. |
| How do we stay definition-compatible? | **One schema, two renderers.** The plugin's field files keep their CSF arrays and hand them to a small `Registrar` that dispatches to real Codestar (`\CSF::…`) or to bfields' compatibility layer (`\BFields\Compat\Codestar::…`) depending on the active UI. The compat layer translates the array into the **bfields JSON schema**, the contract between PHP and the React UI (4.0). | Both UIs are guaranteed to declare the same field set, so neither can drop the other's keys. The six field files change one call site, not their contents. |
| PHP or JavaScript? | **JavaScript body on a PHP spine.** Everything a user sees or touches — field components, store, dependency engine, layouts, runtime — is React, built once and enqueued once. PHP keeps only what cannot leave it (~600 generic lines): menu and meta-box registration, capability + nonce, sanitization on save, default seeding on `init`, the `csf_*` hook bridge, version arbitration, and the request-time schema translation. 3D Viewer's schema stays PHP-authored. | Menus and seeding run with no screen and no JS; sanitization is a security boundary; arbitration must happen before any script is enqueued. 3D Viewer's field set is decided per request (the public `3dviewer_product_attributes` filter, licence gating, 15 `callback`/`content` closures), which a build-time manifest cannot express (4.0). |
| Which UI do users see? | A per-site setting **Admin interface: Classic (Codestar) / Modern (bfields)**, option `bp3d_admin_ui`, switchable from both UIs, overridable by constant/filter, with a no-JS fallback link. Defaults are **staged**: Stage A ships both with upgrades on Classic and a notice inviting the switch; Stage B flips the default to Modern; Stage C removes Codestar (4.9, 10). | Adoption needs users actually on Modern before retirement, and the first release of a new UI should not hit 100 % of installs at once. |
| Do we reuse `wp-metabox-framework` (already in this plugins folder)? | **Not as-is.** Salvage its dependency evaluator, sanitizer structure and manifest idea; do not use its storage. | It stores **one meta row per field** and options under `mbf_<id>`. That is a different storage contract and would force the data migration we are avoiding. See section 5. |
| Where does the React UI come from? | The design repo (`bPlugins/3d-viewer-new-ui`): the `bp3d-*` components, tokens and CSS become bfields' default theme, renamed to the `bfields-` prefix and re-scoped so any plugin can brand it. React itself comes from WordPress (`wp.element`), never from the bundle (4.6). | Pixel-verified against Figma already; no UI library, inline SVG icons, wp-admin hardening (`base.css`) already solved. |
| Rollout | **Time-boxed coexistence (~2–3 months, three releases), then retirement.** Both UIs write the same keys, so switching either way is instant and reversible; Codestar stays vendored until the Stage C gate (4.10) passes. | Reversibility during coexistence is what makes "100 % safe" real for users; the gate is what makes the one irreversible step safe for their data. |

---

## 2. What exists today (inventory)

### 2.1 CSF surfaces in the premium plugin

| Surface | Unique key | Storage | Defined in | Rendered where |
| --- | --- | --- | --- | --- |
| Settings page | `_bp3d_settings_` | `wp_options`, one serialized array | `inc/Field/SettingsPro.php` (licensed) or `inc/Field/Settings.php` (unlicensed) — `Init::require_file()` picks one | `edit.php?post_type=bp3d-model-viewer&page=3dviewer-settings`, tabs via `#tab=<slug>` |
| Model viewer metabox | `_bp3dimages_` | `wp_postmeta`, one serialized array per post | `inc/Field/ViewerPro.php` or `inc/Field/Viewer.php` | classic edit screen of `bp3d-model-viewer` (block-editor posts remove the metabox via `filter_block_editor_meta_boxes`) |
| WooCommerce product metabox | `_bp3d_product_` | `wp_postmeta`, one serialized array per product | `inc/Woocommerce/ProductMetaPro.php` or `ProductMeta.php` | product edit screen; field list built at request time through the public filter `3dviewer_product_attributes` (variant `attribute_*` selects, "very sensitive") |

The free plugin has its own `inc/Field/Settings.php` and `inc/Field/Viewer.php` (different field sets, same keys) and the same `ProductMeta.php`. So there are **three** `_bp3dimages_` definitions and **three** `_bp3d_settings_` definitions writing to the same keys today.

### 2.2 Code that reads or writes those keys directly (must keep working unchanged)

- `inc/Helper/Utils.php` — `getPostMeta()` / `getSettings()` return a closure; boolean reads are `$value === '1'`.
- `inc/Shortcode/Shortcode.php`, `ShortcodePro.php` — build the frontend attribute JSON from `_bp3dimages_`.
- `inc/Woocommerce/Product.php`, `SingleProduct*.php`, `ProductsPro.php` — read `_bp3d_product_` and `_bp3d_settings_`; `legacyFreeModelRows()` reads flat `bp3d_model_src` / `bp3d_poster_src`.
- `inc/Base/AnalyticsPro.php` — `settingBool()` accepts `'1'|1|true|'true'`; `handleNoticeAction()` writes `analytics_enabled='0'` straight into the option and redirects to `#tab=analytics`.
- `inc/Base/Ajax.php` — setup wizard writes `gutenberg_enabled` `'1'`/`'0'`.
- `inc/Base/PostTypeModelViewer.php` — `setMetaData()` seeds `allowed_mime_types` once; `useBlockEditorForPost()` reads `gutenberg_enabled`.
- `inc/Base/ExtendMimeType.php`, `inc/Base/Import.php`, `inc/Base/SpecGlossScanner.php` (`USAGE_META_KEYS`), `inc/Init.php` (`module_<slug>`), `inc/Base/EnqueueAssets.php` (`custom_css`), `uninstall.php`.
- `src/utils/toBool.ts` — the JS truth table (`true|1|'1'|'true'|'yes'`).

### 2.3 Code that scrapes the CSF DOM (must be rewritten against the new UI)

| File | What it does today |
| --- | --- |
| `src/admin/preview/index.tsx` | Reads every metabox value by `name="_bp3dimages_[…]"`, walks `.csf-cloneable-item` rows for cycle models, listens to CSF's jQuery `change` events, mounts into `#bp3d-model-preview-root` (Preview tab) and `#bp3d-preview-btn-root` (side metabox `bp3d_live_preview`). |
| `src/admin/cloudPicker.ts` | Injects a Cloud Storage button next to CSF `media`/`upload` inputs. |
| `src/admin/specGlossInline.ts`, `advancedViewerInline.ts` | Inline notices under model-URL inputs. |
| `src/admin/index.ts` | Placeholders on `angle_property`, hotspot link-field visibility via body class (CSF can't express that dependency), custom-CSS subtitle `#model{ID}`, shortcode copy buttons. |
| `admin/css/admin-style.css`, `admin/css/readonly.css` | `.csf-*` overrides; `.bp3d-readonly` "Pro only" hover overlay. |
| `inc/Base/ExtendMimeType.php` (bottom) | Injects a `.csf-metabox .ui-icon` style fix. |
| `tests/e2e/helpers/wp-admin.ts` + 11 specs | `openCsfMetaboxTab`, `setCsfSwitcher`, `setCsfButtonSet`, `setCsfMediaUrl`, `saveCsfOptions`, `csfSwitcher()` … |

### 2.4 Not affected

Gutenberg block (`src/blocks/3d-viewer`), Visual Editor, Analytics page, Dashboard (`build/dashboard.js`), Presets CPT (block-based), Elementor controls (`inc/Addons/Controls`), Freemius, Extension Manager, frontend bundles. None of them touch CSF.

### 2.5 Field types in use (tally across all bPlugins plugins in this folder)

`switcher` 172 · `text` 156 · `button_set` 74 · `upload` 48 · `color` 37 · `number` 32 · `select` 29 · `spinner` 27 · `content` 25 · `radio` 20 · `group` 19 · `textarea` 12 · `dimensions` 11 · `media` 9 · `slider` 8 · `notice` 6 · `code_editor` 6 · `repeater` 4 · `checkbox` 4 · `callback` 4 · `heading` 4 · `fieldset` 3 · `subheading` 3 · `spacing` 3 · `link` 3 · `image_select` 1.

Those 26 types are the framework's v1 field set. 3D Viewer itself needs 21 of them.

---

## 3. The data contract that must not change

### 3.1 Wire format per field type (what CSF writes; what the framework must write)

| CSF type | Stored value | Notes / legacy variants readers already tolerate |
| --- | --- | --- |
| `switcher` | `'1'` or `'0'` (strings) | Never-toggled fields are `''`; CSF "Reset" and seeding write PHP `true`/`false`. Readers use `=== '1'` (Utils), `!== '0'` / `=== '0'` (Woo switch), `!empty()` (SingleProduct) — so `''` is ON for one reader and OFF for another of the same key (`3d_woo_switcher`). **Framework keeps the stored value as it is (`''`, `true`/`false`, `'1'`/`'0'`) and writes `'1'`/`'0'` only when the user flips the toggle** (decision 12, 2026-09-23; review 4.1). Rewriting `''` to either value changes a live site. |
| `button_set` (single) | string | Some defaults are arrays (`'default' => ['msimple']`); a reset stores the array and `Shortcode` then treats `['msimple'] !== 'msimple'` as multiple mode. **Framework hydrates array → first element and writes a string.** |
| `radio`, `select` | string (`select` with `multiple` → list) | |
| `checkbox` with `options` | list of option keys; `''` when nothing checked | Readers guard with `is_array()`, so `[]` and `''` behave identically. Framework writes `[]`. |
| `text`, `textarea`, `number`, `spinner`, `slider`, `color`, `code_editor`, `upload` | string | Numbers are **strings** (`"30"`, `"1"`) when posted, but seeding and Reset store the raw authored default (an int `20`), which the framework keeps. `upload` is a bare URL string. `color` may be `transparent` or `rgba(…)`. An array in any of these (or in a single `select`/`radio`) is kept, never blanked. |
| Types bfields does not render (`tabbed`, `sortable`, `wp_editor`, HVP's `library`…) | anything | Core type `unknown`: an opaque pass-through — the codec never reshapes it, kses only, read-only notice in the UI (review 3.2). |
| `media` | `{url,id,width,height,thumbnail,alt,title,description}` all strings | CSF also accepts a bare numeric id and expands it at render time. `Utils` reads `['url']`. |
| `dimensions` | `{width,unit}` or `{height,unit}` | |
| `spacing` | `{top,right,bottom[,left][,unit]}` | `angle_property` |
| `fieldset` | assoc array of sub-field ids | `real_size` → `{width,height,depth}` |
| `group`, `repeater` | list of assoc rows; `''` when empty | `bp_3d_models`, `hotspots`, `bp3d_models`, `bp3d_popup_models`, `bp_3d_posters`. Readers guard with `is_array()`. |
| `content`, `notice`, `callback`, `heading`, `subheading`, `link` | not stored | Except when they carry an `id` — see 3.3. |

Sample of a real `_bp3dimages_` record and the live `_bp3d_settings_` option are in Appendix A; they are the reference fixtures for the round-trip tests in section 8.

### 3.2 Save semantics to reproduce (and the two to improve)

| CSF behaviour | Keep? | Framework behaviour |
| --- | --- | --- |
| Whole array replaced on every save; keys not declared by the *current* field set are **dropped**. This is why `preserveProData()` exists in `Viewer.php` and `ProductMeta.php`, and why the Analytics section is registered in the free `Settings.php` too. | **Improve on the modern side; Codestar keeps its behaviour** | Modern: read-modify-write, overwrite only declared field ids, keep every other key. Classic: unchanged (Codestar code is not patched). Because both renderers consume the same schema (section 4.9), the declared set is identical in both modes, so a Classic save never drops a key the Modern UI wrote. `preserveProData()` stays forever: during coexistence it guards Classic saves in a licence lapse, and after Stage C it guards saves made by the free plugin; the framework fires the same `csf_{unique}_save` filter so one method serves both. |
| Options page: `save_defaults => true` writes all field defaults into the option the first time it is found empty (runs on `init`, every request). | **Keep** | Same seeding at boot when the option is empty/missing, with CSF's `get_default()` **raw** (`'default' => true` is stored as PHP `true`, `args['defaults']` overrides), same key order; the only difference is a single `button_set`'s array default seeded as its first element (3.1). Verified against a real `CSF_Options` (tests/php/seeding.php). Readers have their own, sometimes different, fallbacks (`Product.php` uses `rotateDelay 200`, `3d_rotate_speed 20`, `bp_3d_loading 'lazy'`), so a fresh site must be seeded exactly as CSF seeds it or the Woo viewer changes behaviour. |
| Options page: "Reset Section" = section fields to defaults merged over the rest; "Reset All" = every field to default. | Keep | Same. |
| Metabox: "Restore" (`_reset`) **deletes the whole meta row**; the frontend then falls back to reader defaults, not field defaults. | **Improve** | "Reset to Default" per tab (as in the design) sets that tab's fields to their defaults in the editor; nothing is deleted. Saving writes the array as usual. |
| Metabox: if the POST has no field data at all, CSF deletes the meta. | **Improve** | Absent payload → no-op. A failed script load can never wipe a post. |
| Default sanitization is `wp_kses_post` / `wp_kses_post_deep` for every type (no per-type sanitizers, no validators in this plugin). | Keep as default | Same kses default so stored text is identical (including its quirks, e.g. `>` in `custom_css` becomes `&gt;`, which `EnqueueAssets::renderCustomCSS()` already copes with). Per-field `sanitize` callables run **instead of** kses and get the value alone, as in CSF (`'sanitize' => false` saves raw); `validate` keeps the stored value and reports the message. No URL/colour sanitizers: `upload`, `media`, `link`, `color` are kses'd like everything else (decision 3, re-confirmed 2026-09-23 — review 4.3). |
| Slashing: options are `wp_unslash`ed then `update_option`; metabox passes slashed POST straight to `update_post_meta` (which unslashes). Net: stored data is unslashed. | Keep the net effect | Framework reads one JSON payload, `wp_unslash` → `json_decode` → sanitize → `update_option($data)` / `update_post_meta($id, $key, wp_slash($data))`. Round-trip test with `\`, `'`, `"` in hotspot text and CSS (section 8). |
| Nonce + capability: options `manage_options`; metabox `save_post` + nonce, skips autosave. | Keep | Same, plus `current_user_can('edit_post')` and revision skip. |
| Hooks: `csf_{unique}_save` (filter), `_save_before`, `_saved`, `_save_after`. | Keep, both names | The compat layer fires the `csf_*` names permanently and the core fires `bfields_*`, **in CSF's order** (filter → `_save_before` → write → `_saved` → `_save_after`) and with CSF's arguments: `($data, $instance)` for options, `($data, $post_id, $instance)` for a meta box, where `$instance` carries `unique`, `args`, `pre_fields` (review 3.3). Verified against real Codestar (tests/php/save-parity.php). |
| Tabs addressed by `#tab=<sanitize_title(section title)>` (`#tab=analytics` is hard-coded in `AnalyticsPro::handleNoticeAction()`; e2e uses `#tab=…`). | Keep as alias | New router accepts `#tab=<legacy-slug>` and maps it to the section id. |

### 3.3 Placeholder fields that pollute data today

Free-mode definitions use `'id' => 'readonly'` and `'id' => 'invalid'` for locked upsell rows, so CSF stores junk keys (`"invalid": ""` is in the sample record). The framework marks these `'pro' => true` (rendered locked, never saved). Existing junk keys are left alone by the "keep undeclared keys" rule; `uninstall.php` already removes the whole array.

---

## 4. The framework

Name: **bfields** (`BFields\` PHP namespace, `bfields-` CSS/JS prefix, `window.bfields`, script handle `bfields-ui`, text
domain `bfields`). Frozen from Phase 0: these end up in CSS classes, hook names, the script handle and the text domain of
every host, so they cannot be renamed later. The prefix is framework-wide, not `bp3d`, because two plugins may load it at
once. One caveat on the name itself: "bfields" reads as a field library, but the package registers menus, routes tabs,
saves over REST, seeds defaults and runs a wizard — expect it to undersell itself.

### 4.0 Architecture: JavaScript body, PHP spine

```
   plugin field files (CSF arrays, PHP, request time)         later: TypeScript defineSchema() → JSON
                      │                                                         │
               Registrar (4.9)                                                  │
              ┌───────┴────────┐                                                │
    Classic:  │                │ Modern:                                        │
    real \CSF │                │ \BFields\Compat\Codestar ─ translate ─► bfields JSON schema ◄──────┘
   (untouched)│                │                                           │             │
              ▼                ▼                                      PHP spine       React body
     wp_options / postmeta ◄── csf codec ◄── sanitize ◄── REST / POST ◄── store (values in stored shape)
```

**The JSON schema is the API.** Everything PHP knows about a screen — sections, fields, types, defaults, dependency
rules, layout hints, translated labels — crosses to the browser as one JSON document, and everything the browser sends
back is one JSON document of values. Both authoring syntaxes (CSF arrays now, `defineSchema()` later) are front-ends to
that format; both renderers consume it. Version it (`"schema": 1`) and never break it.

**PHP spine (~600 lines, generic, never edited per plugin).** Only what cannot leave PHP:

| Stays in PHP | Why it cannot move |
| --- | --- |
| `add_submenu_page`, `add_meta_box`, enqueue | No JS runs before the screen exists |
| Capability + nonce (`manage_options`, `edit_post`, `wp_rest`) | Security boundary |
| Sanitization on save (3.2) | Client-side sanitization is decoration; both renderers must write identical bytes |
| `save_defaults` seeding on `init` | Runs on every request with no admin screen and no JS; `Product.php` reads seeded values on the frontend |
| `csf_{unique}_save` bridge → `preserveProData()` | Licence-lapse Pro-key protection, server side |
| Version arbitration (4.7) | Only PHP can pick one copy before any script is enqueued |
| Schema translation (`\BFields\Compat\Codestar`) | The schema is built at request time (below) |

**React body (the framework).** Field registry and every field component, the store, the dependency engine, layouts
(shell, tabs, rows, cards, meta-box shell, wizard), search, toasts, `window.bfields` runtime, theme. Built once, shipped
as one bundle (4.1), enqueued once (4.7).

**3D Viewer's schema stays PHP-authored.** Not a compromise: four things are decided per request and cannot live in a
build-time manifest. `apply_filters('3dviewer_product_attributes', …, $post_id)` builds the Woo row fields from the
product's own variation attributes and is a **public** filter (`ProductMetaPro.php:180`); `Init::require_file()` picks
the licensed or unlicensed field set at runtime; 15 `callback`/`content` fields are PHP closures; subtitles such as the
custom-CSS `#model{ID}` are computed. Keeping labels in PHP `__()` also keeps them in the existing `.pot` pipeline — the
JS-catalogue path is the fragile one (4.8). `defineSchema()` is offered later, for plugins without those needs.

**The store holds values in stored shape.** `'1'`/`'0'` strings, the 8-key media array, `{width,unit}`, list-of-rows
groups — exactly what section 3.1 says is in the database. Field components convert at the edge for display only. Every
conversion is a chance to change bytes; if the store *is* the wire format, byte-identical round-trip holds by
construction and the golden tests (8) confirm it rather than establish it. Group rows carry a client-side id for
reorder/delete and serialize back to a plain list.

**The dependency engine keeps CSF's operators and drops its DOM.** CSF's hazards — the 4th-element global flag,
pipe-joined rules always AND'd, radio multi-match filtered by `:checked`, the hidden clone template matching first — are
all DOM-lookup pathology. In a store, "row-local vs global" is simply "this row's values, then the root's". Implement the
operators with CSF's coercion (`==`, `!=` incl. `'1'/'true'/'0'/'false'`, `>`, `>=`, `<`, `<=`, `any`, `not-any`),
resolve controllers row-first-then-root, and the bug class that hid the hotspot link fields disappears.

**Validation is duplicated on purpose.** JS for UX (inline errors, disabled Save), PHP for truth. Share the per-type
rules in the schema JSON; implement twice; never share code across the boundary.

**Never define the global `CSF` class.** Codestar guards itself with `class_exists('CSF')`; a polyfill would silently
hijack every other CSF-based plugin on the site. The facade lives at `\BFields\Compat\Codestar` only.

### 4.1 Layout of the package

Repo `bPlugins/bfields`. Its working checkout is `wp-content/plugins/bfields/` on the dev site (not `3d-viewer-premium/bfields/` as first planned). The golden fixtures live in this repo, not in premium; they hold real site URLs, so the repo stays private.

```
bfields/
  php/
    bootstrap.php            frozen recorder + newest-copy-wins (4.7) — copied from bp-extension-manager
    includes/
      Registry.php           registerOptions / registerSection / registerMetabox → JSON schema
      Schema.php             normaliser, defaults, group/fieldset flattening, "schema": 1
      Codec/Csf.php          Codestar wire format (3.1) ⇄ typed values — frozen at v1
      Storage/Option.php     wp_options, read-modify-write
      Storage/PostMeta.php   one serialized array per post
      Sanitizer.php          per-type sanitizers, kses default for csf-codec keys, per-field callables
      Dependency.php         rule engine (server side, same operators as the TS engine)
      OptionsPage.php        menu, REST save route, seeding, resets, #tab= aliases
      Metabox.php            add_meta_box, mount node, save_post handler
      Assets.php             enqueue the built UI once; localize schema + values + i18n + brand tokens
      hooks.php              bfields_* filters/actions
    compat/
      Codestar.php           CSF array → JSON schema; csf_* hook bridge; #tab= aliases
  ui/                        React source, built with @wordpress/scripts
    core/                    store, dependency engine, schema types, registry (registerField, addAdornment, subscribe)
    fields/                  one component per core type (Appendix D)
    layout/                  AdminShell, TabStrip, Card, SettingRow, ActionBar, MetaboxShell, Wizard
    theme/                   base.css, tokens.css, admin.css, onboarding.css — ported from 3d-viewer-new-ui
  build/                     compiled UI, committed
  dist/bfields.zip           php/ + build/ + languages/ only — what a host unzips into lib/bfields/
  languages/                 bfields.pot + catalogues for the framework's own strings
  tests/                     PHP unit (codec round-trip against golden fixtures), TS unit (dependency engine)
  composer.json              type: wordpress-library, PSR-4 BFields\ → php/includes
  package.json               @bplugins/bfields — TypeScript types and defineSchema() only, not the runtime
```

**Two artifacts, one version number.**

- **Runtime** = `dist/bfields.zip`, unzipped into each host at **`lib/bfields/`** and committed there — exactly what
  `bp-extension-manager` does. Not `vendor/`: `/vendor/` is gitignored in this plugin (`git ls-files vendor` → 0 files),
  so a fresh clone could not build and the only authoritative copy would be one developer's disk. `lib/` is tracked and
  already in the `npm run zip` list.
- **npm `@bplugins/bfields`** = types, `defineSchema()`, dev ergonomics. **Never** the runtime: if each host
  `npm install`s and webpacks it, the site loads N bundles, N React roots and N `window.bfields`.
- **No git submodule.** Freemius deploy and `npm run zip` do not fetch one, and `--recursive` gets forgotten.

### 4.2 Compatibility API (what 3D Viewer calls)

The plugin never calls either framework directly. `inc/Helper/Registrar.php` (new, ~40 lines) forwards to
`\CSF::*` in Classic mode and to `\BFields\Compat\Codestar::*` in Modern mode, so the field files below read
the same in both modes:

```php
Registrar::createOptions('_bp3d_settings_', [
  'menu_title'      => 'Settings',
  'menu_slug'       => '3dviewer-settings',
  'menu_type'       => 'submenu',
  'menu_parent'     => 'edit.php?post_type=bp3d-model-viewer',
  'menu_position'   => 10,
  'menu_capability' => 'manage_options',
  'framework_title' => __('3D Viewer Settings', '3d-viewer'),
  'save_defaults'   => true,
  'show_reset_all'  => true,
  'show_reset_section' => true,
  'show_search'     => true,        // design has "Search settings…"
  'brand'           => ['primary' => '#1B5CF0', 'save' => '#3B52F6', 'logo' => BP3D_DIR.'admin/images/logo.svg'],
]);

Registrar::createSection('_bp3d_settings_', [
  'id'     => 'general',            // NEW, optional: stable route id; defaults to sanitize_title(title) == CSF's #tab slug
  'title'  => __('General Settings', '3d-viewer'),
  'icon'   => 'box',                // framework icon name (inline SVG) or a Dashicon; CSF's 'fa fa-cog' strings are mapped
  'layout' => 'rows',               // NEW, optional: 'rows' (SettingRow list) | 'cards'
  'fields' => [ /* unchanged CSF field arrays */ ],
]);

Registrar::createMetabox('_bp3dimages_', [
  'title'     => __('3D Viewer Settings', '3d-viewer'),
  'post_type' => 'bp3d-model-viewer',
  'data_type' => 'serialize',       // CSF default, and the only one v1 implements: 'unserialize' is refused loudly
  'context'   => 'normal',
  'show_restore' => true,           // Classic: CSF Restore; Modern: "Reset to Default" per tab, non-destructive (3.2)
]);
```

Field arrays keep every CSF key, and Codestar ignores the new keys below (it only reads the keys it knows),
so one array serves both renderers. New optional keys:

| Key | Purpose |
| --- | --- |
| `pro` (bool) | Modern: render locked with the "available in Pro" treatment and **exclude from save**. Classic still needs `'class' => 'bp3d-readonly'` on the same field, so free-mode definitions carry both keys. |
| `icon` | Row icon (design shows one per SettingRow). |
| `layout` | Per-field renderer hint: `card` (Model tab cards), `mode-grid` (Lite/Advanced picker), `tile-grid` (MIME tiles), `danger` (delete-on-uninstall card), `selector` (copyable selector chip). Unknown/absent → plain row. |
| `adornments` | Named slots other scripts can fill (cloud picker button, SpecGloss notice) — see 4.5. |
| `sanitize` / `validate` | As in CSF (callables). |

`dependency` keeps CSF syntax exactly: `[controller, condition, value]`, `'a|b', '==|!=', 'x|y'`, the 4th `'all'` flag for cross-section controllers, arrays of rules. Operators implemented with CSF's semantics from `assets/js/plugins.js`: `==`, `!=` (loose, with CSF's boolean coercion of `'1'/'true'/'0'/'false'`), `>`, `>=`, `<`, `<=` (numeric), `any`, `not-any` (comma-separated list). Group-local controllers resolve inside the row first, then globally — same as CSF, which is why the `hotspot_style` body-class hack in `src/admin/index.ts` exists; the framework adds `'scope' => 'global'` per rule so that hack can be expressed declaratively.

Parsing follows what CSF actually does, checked against Codestar's own code (tests/ts/codestar-parity.test.ts runs the attributes real `CSF::field()` prints through Codestar's `main.js` and `Rule.evalCondition`): a short pipe list falls back to the **first** condition and an **empty** value (`conditions[i] || conditions[0]`, `values[i] || ''`); a single rule's `'0'` value reaches the script as `''` (CSF's `! empty()`); an empty condition always shows; any non-empty 4th element is global; `any` lists are not trimmed; there is no `=` alias. **Documented differences:** (1) in the list-of-rules form CSF makes the whole set global when any rule is, bfields scopes each rule; (2) a controller that does not exist hides the field in CSF (no DOM node) and is evaluated as empty in bfields.

### 4.3 Storage adapters

- `serialize` (default, CSF default): one array under `unique`. Read = `get_option` / `get_post_meta(…, true)`. Write =
  read-modify-write, declared fields only, then `update_option` / `update_post_meta` (`wp_slash`ed). **The only adapter
  in v1** — all three 3D Viewer keys use it.
- Deferred until a second consumer exists (11.10): `unserialize` (one row per field id — HTML5 Video Player's
  `h5vp_option`), `network`, `transient`, `theme_mod`. Same names as CSF's `database` arg when they land.

Helper readers: `bfields_get_option($unique, $field, $default)`, `bfields_get_meta($post_id, $unique, $field, $default)`,
both returning the **raw stored value** (no casting) so the plugin's `Utils` closures stay the single source of interpretation.

### 4.4 Saving

- **Options page:** REST route `POST /bfields/v1/options/<unique>` (nonce via `wp_rest`, capability from `menu_capability`).
  Payload = `{ schema: 1, values: {field_id: value}, action: 'save' | 'reset_section' | 'reset_all', section: id }`. The
  UI sends every declared field, **untouched fields verbatim as hydrated** (7.2). Server: merge → sanitize (idempotent) →
  write → return the stored array, which the store adopts as its new baseline. A failed save (network, nonce expiry,
  capability) shows an error toast and **leaves the store as it was** — a failure never discards the user's edits.
- **Metabox:** the React app mirrors its state into `<textarea name="bfields_values[_bp3dimages_]" hidden disabled>` as
  JSON, enabled only once the bundle mounts, saved on `save_post` through `Storage\PostMeta` (read-modify-write,
  `wp_slash`, the save hooks with the post id). WordPress's own Publish/Update button remains the submit. The framework's
  box is a **plain core meta box inside `#poststuff` that hides nothing** (decision 14); a host that draws the design's
  full-screen editor registers with `'render' => false`, prints and saves the screen itself, and hides only the core
  boxes it replaces — never other plugins' boxes. Whether that host restyles `#submitdiv` or proxies it is decision 5.
- **Absent payload = no-op** (3.2). A textarea that is missing or empty because the bundle never ran must not wipe a post.

### 4.5 JS runtime (`window.bfields`)

```js
bfields.registerField(type, Component)          // add/override a field renderer (plugins, Pro add-ons)
bfields.addAdornment(unique, fieldId, slot, Cmp)  // e.g. Cloud Storage button beside bp_3d_src, SpecGloss notice under model_link
bfields.subscribe(unique, (values) => {})         // live values, same wire shapes as stored → the preview stops scraping the DOM
bfields.getValue(unique, path) / bfields.setValue(unique, path, value)
bfields.registerLayout(name, Component)           // custom section/field layouts
```

In Modern mode the preview (`src/admin/preview/index.tsx`) becomes a subscriber; its `readAttributes()` mapping stays, fed from state instead of `document.querySelector`. Cloud picker and SpecGloss bridges become adornments. The `angle_property` placeholders and custom-CSS subtitle become schema keys (`placeholder`, `subtitle` callback). In Classic mode all of these keep their current Codestar DOM paths (4.9).

### 4.6 UI/theme — porting `3d-viewer-new-ui`

- Rename `bp3d-` → `bfields-` (classes, tokens, `#bp3d-root` → per-instance `.bfields-root[data-unique]`). The README's
  scoping contract (`.bp3d-app :where(p)` specificity ladder, `--bp3d-viewport`, import order) carries over unchanged;
  only the prefix changes.
- Brand tokens (`--bfields-primary`, `--bfields-save`, `--bfields-ob-primary`, logo) are set inline on the root by PHP
  from the `brand` arg, so 3D Viewer keeps its blues and HVP can use its own.
- Drop `WpChrome.jsx`, `wp-chrome.css`, the mock notice/footer in `AdminLayout.jsx`, `global.css` (all "preview only" in
  the README). Images go through `plugins_url()` via localized data instead of `asset()`. Inter is **bundled woff2**
  (11.8) — no Google Fonts request from wp-admin.
- **React comes from WordPress, never from the bundle.** Build with `@wordpress/scripts` so `react`/`react-dom` resolve
  to `wp.element`; import from `@wordpress/element`. The plugin's `package.json` pins `react ^19.1.1` while
  `Requires at least: 6.5` ships React 18.2 — two Reacts on one admin page is the failure to avoid. Never destructure
  `window.ReactDOM` at module scope (the preview bundle's existing scar).
- **The blank-screen failure mode.** Codestar renders server HTML; React renders an empty `div`. If the bundle 404s
  behind a caching/optimization plugin or throws at boot, the page must not be a locked door: an error boundary that
  renders "The settings interface failed to load — Switch to the classic interface" with a **plain form POST** to the
  `bp3d_admin_ui` switch (no JS needed), a `<noscript>` with the same link, and the constant override (4.9). Section
  3.2's "absent payload = no-op" protects the data; this protects the screen.
- The design is a visual prototype of two screens, not a control library: `src/admin/controls.jsx` has 7 components
  (TabStrip, SettingRow, Toggle, RadioGroup, Segmented, Slider, MimeTile) against the 21 types in D.1, ~1 800 lines in
  total. Appendix D's gaps are the critical path, not the port.
- Icons: keep the inline SVG sets (`admin/icons.jsx`, `components/icons.jsx`); expose them as the `icon` vocabulary.

### 4.7 Loading one copy across many plugins

Free and premium 3D Viewer both ship bfields; during an upgrade window both plugins are active; later HVP adds
copies at other versions. CSF's `class_exists('CSF')` (first to load wins, version ignored) is not good enough. **Copy
`vendor/bp-extension-manager/bootstrap.php` literally** — it already solves this, and its invariants are the lessons:

1. Each host `require`s `lib/bfields/php/bootstrap.php`, which only **records** `[version, path]` into
   `$GLOBALS['bfields_copies']`. It never requires class files.
2. On `plugins_loaded` priority **`-1000`** (not `-100`: it has to beat anything else hooking early) the highest version
   requires its autoloader and fires `bfields_loaded`. Hosts register their schemas on `bfields_loaded`.
3. The version is a **local variable** in bootstrap.php, never a constant — only the winner may `define('BFIELDS_VERSION')`.
   The recorder block is **frozen bytes** across every release, so an old copy can always register with a newer one.
4. Every guard is `class_exists('X', false)` — with autoload on, the guard defeats itself (the `BP3D\Init` incident,
   2026-07-14).
5. **Assets are registered once**, handle `bfields-ui`, by the winning copy. Every host's schema mounts into that one
   runtime; `window.bfields` is defined once. This is why the runtime must not be bundled per plugin (4.1).
6. **No breaking changes under one package name.** Newest-wins means a breaking v2 would break v1 hosts on the same site,
   so the consumer API is additive and the `csf` codec is frozen (10). A breaking change ships as a new package
   (`bfields2`, namespace `BFields2\`) that coexists.

### 4.8 i18n

- **Schema strings stay in PHP** (`__()` in the field files) and travel in the JSON payload. They remain in each plugin's
  own `.pot`, so the existing `npm run i18n` pipeline keeps working and no plugin string ever depends on a JS catalogue.
- **The framework's own chrome** (Save Changes, Reset Section, unsaved-changes warning, search placeholder…) uses text
  domain `bfields`, loaded by the winning copy with `wp_set_script_translations('bfields-ui', 'bfields', BFIELDS_PATH .
  'languages')`, catalogues shipped in `lib/bfields/languages/`.
- Exclude `lib/bfields` from each plugin's `make-pot` (`--exclude=src,zip,public,lib/bfields`). Never generate an `en_US`
  catalogue for `bfields` either (the empty-catalogue trap that blanked the editor strings during 2.0.0).

### 4.9 Coexistence period: Classic (Codestar) and Modern (bfields), time-boxed

Both renderers ship for **about two to three months** — three releases (10) — so users can adapt; then Codestar is retired
(4.10). During coexistence one UI is active per site; both read and write the same arrays.

**What is shared.** Data (same keys, shapes, codec), the schema (one set of CSF arrays per key), the save hooks
(`csf_{unique}_save` fires in both modes), URLs (`page=3dviewer-settings`, `#tab=` slugs), the post-type screens, every
reader in the plugin. **What differs** is only which renderer is loaded for the admin screens.

**The switch.**

| Aspect | Decision |
| --- | --- |
| Storage | Standalone option `bp3d_admin_ui`, values `classic` \| `modern`. Not inside `_bp3d_settings_`, so Codestar's key-dropping can never touch it and it survives a Reset All. Added to `uninstall.php`. |
| Scope | Per site. (Per-user later via user meta and the same filter; not in v1.) |
| Default | **Stage A** (first release with bfields): fresh installs `modern`; upgrades (option absent, `_bp3d_settings_` present) `classic`, with a dismissible notice "A new interface is available — Try it / Keep classic". **Stage B**: default flips to `modern` for everyone; the switch back stays one click in the header. **Stage C**: the option is still read but `classic` is treated as `modern` (4.10). |
| Where to change it | Classic: a `button_set` "Admin interface" at the top of General, saved into `bp3d_admin_ui` through the `csf_{unique}_save` filter (not into the settings array). Modern: the same row, plus "Switch to classic interface" in the header. Both confirm and reload. Plus the no-JS form POST in the error boundary (4.6). |
| Overrides | `define('BP3D_ADMIN_UI', 'classic'|'modern')` beats the option; filter `bp3d_admin_ui` beats both. Support playbook and e2e use these. |
| Capability | `manage_options`. |

**How dispatch works.** `Init::get_services()` is unchanged; `Field\Settings*`, `Field\Viewer*` and
`Woocommerce\ProductMeta*` call `Registrar::create*()`, which reads the resolved mode once per request and forwards.
Classic also `require`s `vendor/codestar-framework/codestar-framework.php` exactly as today; Modern does not load Codestar
at all, so the unused UI's CSS/JS is never enqueued. In Stage A the meta boxes are forwarded to `\CSF::` in **both** modes
(only Settings is on bfields yet — Phase 2); the notice says so.

**Bridges in both modes.** The live preview, cloud picker and SpecGloss notices run in both: Classic keeps today's DOM
scraping (`src/admin/preview/index.tsx` etc. unchanged); Modern uses `bfields.subscribe` / adornments (4.5). Both paths
sit behind a `bp3dAdmin.ui` flag localized by PHP. The Classic paths are deleted at Stage C, not before.

**Conflict matrix — what "user conflicts" means here, and how each one is prevented.**

| Situation | Prevention |
| --- | --- |
| Free and premium both active (upgrade window), possibly with different bfields versions | Arbitration (4.7): one copy loads, one bundle, one `window.bfields`. Modes are per plugin, so free can be Classic while premium is Modern. |
| Another bPlugins product ships an older or newer bfields | Same: newest wins, API additive, `csf` codec frozen. |
| Another vendor's plugin uses Codestar | bfields never defines `CSF` (4.0); Codestar's own guard keeps working; Classic mode loads our vendored 2.3.1 as today. |
| Third-party code hooks `csf_{unique}_save` / `_saved` / `_save_after` | The compat layer fires the same names with the same signatures in Modern — and keeps firing them after Stage C. |
| A save arrives from a form opened in the *other* mode (two tabs; mode switched in between) | Each form targets its own endpoint (Codestar's nonce form vs the `bfields/v1` REST route); the server applies the same codec and merge, so the write is valid whichever UI produced it. |
| Codestar Reset wrote PHP `true`/`false`; Modern hydrates it | Truth table (7.6); a Classic-reset record is in the golden fixtures. |
| Licence lapses while on Modern | `Registrar` still picks the unlicensed field set; `preserveProData()` still runs through `csf_{unique}_save`; Pro keys survive (3.2). |
| A caching/optimization plugin breaks the bundle | Error boundary + no-JS switch + constant (4.6); the data is untouched because an absent payload is a no-op (3.2). |
| Two admins edit the same screen in different modes | Same as today with two Codestar tabs: last write wins per declared field, undeclared keys kept (Modern) — no worse than 2.0.0. |
| Multisite | `bp3d_admin_ui` is per site; arbitration is per request; nothing network-wide. |

**Asymmetries to remember** (unchanged from rev 2): Classic saves drop undeclared keys, Modern keeps them (harmless — same
declared set); Classic Restore deletes the meta row, Modern Reset is per tab and non-destructive; Classic writes
`true`/`false` on Reset All, Modern always `'1'`/`'0'`. Readers tolerate all of it today; the golden tests keep it that way.

### 4.10 Retiring Codestar (Stage C) — the gate

Removing Codestar is the one irreversible step, so it has its own gate. **Every item must be true** before the Stage C
release is cut:

1. **Field evidence, not lab evidence.** Stage B (Modern default) has been live for at least four weeks with no open
   bfields data-shape bug and no support ticket that needed `BP3D_ADMIN_UI='classic'` as its fix.
2. **Golden round-trip is green in Modern alone** (8.2) for every surface (Settings, viewer meta box, Woo meta box), in
   free and premium, licensed and unlicensed, on current WP and on the floor (6.5).
3. **Cross-mode records still hydrate.** Everything Codestar wrote during coexistence — Reset-All PHP booleans, rows the
   Classic Restore recreated, `''` empty groups — loads and re-saves byte-identically through bfields.
4. **Everything Codestar did that data depends on is owned by bfields**, verified by test: `save_defaults` seeding with
   CSF's exact default set; the `csf_{unique}_save`, `_save_before`, `_saved`, `_save_after` hooks (public API, kept
   forever); `preserveProData()` wired through them; `#tab=<legacy slug>` aliases; the `3dviewer_product_attributes` filter.
5. **The switch degrades, never fatals.** `bp3d_admin_ui = 'classic'` and `BP3D_ADMIN_UI='classic'` are read and treated
   as `modern`, with a one-time notice "The classic interface has been retired". The option stays in `uninstall.php`.
   Nothing deletes or rewrites it on upgrade.
6. **Free and premium retire in lockstep, or free first — never premium first.** During a licence lapse the free field
   set saves the shared `_bp3dimages_`/`_bp3d_product_` arrays; if free still ran Codestar after premium had dropped its
   Classic paths, `preserveProData()` would run under Codestar's key-dropping with premium unable to verify it.
7. **What is removed** is exactly Appendix C's "Remove at Stage C" list. **What is not removed**: the CSF field arrays
   (they are the schema), `preserveProData()`, the `csf_*` hook names, `bp3d_admin_ui`.
8. **Release-gate agent** (`.claude/agents/bp3d-release-reviewer.md`) run on the Stage C build with the Phase 0 golden
   fixtures as its Rule 1/2 inputs.

If any item fails, Stage C slips a release. One more month of coexistence is cheaper than a removal that strands data.

---

## 5. Why not `wp-metabox-framework` as-is

`/wp-content/plugins/wp-metabox-framework` (v0.1.0, TS-first) is close in spirit and worth mining:

- `src/core/dependency.ts` — a typed dependency evaluator (needs CSF's operator set and `|` syntax added).
- `php/class-sanitizer.php` — per-type switch with a `mbf_sanitize_{type}` filter; same shape as our 4.3 sanitizer.
- `php/class-metabox.php` — nonce/capability/autosave/revision guards and the hidden-JSON-textarea pattern.

But it cannot be adopted for 3D Viewer without a migration:

| wp-metabox-framework | CSF / 3D Viewer today |
| --- | --- |
| One `wp_postmeta` row per field id (`update_post_meta($post_id, $fid, …)`) | One row `_bp3dimages_` holding the whole array |
| Options stored under `mbf_<id>` | `_bp3d_settings_` |
| `switcher` → PHP `bool` | `'1'`/`'0'` strings |
| `media` → its own array shape | `{url,id,width,height,thumbnail,alt,title,description}` |
| Schema authored in TypeScript, compiled to a manifest | Schema authored in PHP at request time (Woo variant selects, mime notices, licence gating, `3dviewer_product_attributes` filter all need PHP) |

Decision: new package with the CSF-compatible contract; port its evaluator/sanitizer ideas; retire it or keep it as the "greenfield" option later.

---

## 6. Mapping the design to real fields

### 6.1 Settings page (`_bp3d_settings_`) — design has 4 tabs, product has up to 7

| Design tab | Design rows | Real premium fields | Gap |
| --- | --- | --- | --- |
| General Settings | MIME tiles, Delete-on-uninstall card | `allowed_mime_types` (checkbox → `tile-grid`), `delete_data_on_uninstall` (switcher → `danger`), **plus** `bp3d_loader_type/image/size/background`, `bp3d_control_labels`, 6 × `bp3d_control_corner_*`, 7 × `bp3d_control_text_*`, `bp3d_control_size/gap/offset` | Loader + control rows need row designs (plain SettingRows with select/text/number/color/media controls). |
| Woocommerce Settings | 4 toggles + Loading Type (placeholder copy) | `3d_woo_switcher`, `is_not_compatible`, `3d_shadow_intensity`, `bp_camera_control`, `bp_3d_zooming`, `bp_3d_progressbar`, `bp_3d_loading`, `bp_3d_mobile_image_mode/tap_label/breakpoint/reduce_motion`, `bp_3d_rotate`, `3d_rotate_speed`, `3d_rotate_delay`, `bp_3d_autoplay`, `bp_3d_fullscreen` | Schema-driven rows fix the placeholder copy automatically. |
| Shortcode Generator | Enable Gutenberg | `gutenberg_enabled` | none |
| Woocommerce Selectors | 1 selector chip + 4 toggles (placeholders) | `gallery`, `gallery_item`, `gallery_item_active`, `gallery_thumbnail_item`, `gallery_trigger` (text → `selector` layout, editable, copyable), `custom_css` (code_editor) | Selectors are **editable text**, not read-only chips; code editor component needed. |
| — | — | **Preset** tab (`bpp_*`, `3dp_*`: 14 fields; feeds metabox defaults via `ViewerPro::bpmeta_isset`) | Missing from design. |
| — | — | **Analytics** tab (`analytics_*`: 5 fields + intro content) | Missing from design. |
| — | — | **Modules** tab (`module_<slug>` switchers, dynamic) | Missing from design. |

The Delete-data card is repeated on every design tab; in the schema it lives once (General). Recommend one placement.

### 6.2 Add New / edit screen (`_bp3dimages_`) — design mirrors the **free** plugin's field set

| Design tab | Design control | Field id | Present in |
| --- | --- | --- | --- |
| Model | Viewer Mode (Lite/Advanced) | `currentViewer` (`mode-grid`) | free, prem-free, pro |
| Model | 3D Source URL + Upload | free: `bp_3d_src` (media). prem: `bp_3d_src_type` (button_set) → `bp_3d_src` (media) / `bp_3d_src_link` (text) | all, different shape |
| Model | Decoder select | `bp_3d_decoder` + `bp_3d_decoder_draco_file` | **free plugin only** |
| Model | Poster Image | `bp_3d_poster` (media) | all |
| Settings | Moving Controls, Enable Zoom, Full Screen, Zoom In/Out, Camera, Download, Loading Type, Progressbar, Exposure, Shadow, Enable AR | `bp_camera_control`, `bp_3d_zooming`, `bp_3d_fullscreen`, `bp_3d_zoom_in_out_btn`, `bp_3d_camera_btn`, `bp_3d_download_btn` (**free only**), `bp_3d_loading`, `bp_3d_progressbar`, `3d_exposure`, `3d_shadow_intensity`, `bp_3d_enable_ar` | In pro, fullscreen/zoom-btn/camera/AR live in the **Elements** tab |
| Style | Width, Height, Align, Background Color | `bp_3d_width`, `bp_3d_height` (dimensions), `bp_3d_align` (button_set → Segmented), `bp_model_bg` (color) | all; pro adds `bp_model_bg_image`, `bp_3d_thumb_size`, `bp_model_progressbar_color`, `css`, `additional_id`, `additional_class`, control size/gap/offset |
| Preview | Live preview stage | `callback` field → preview mount | all |
| Sidebar | Live Preview card, Publish box | existing `bp3d_live_preview` side metabox + core `submitdiv` | — |

Not covered by the design and needed for pro: **Elements** tab (16 fields incl. 6 corner selects + 7 label texts), **group/repeater** UI (`bp_3d_models` rows with 20 nested fields incl. nested `hotspots` group and `real_size` fieldset), `hotspots` group on single models, environment/skybox/tone-mapping rows, edge controls, mobile/dimensions blocks, `code_editor`, `color` picker with alpha, `media` picker (wp.media), `upload`, `spacing`, `fieldset`.

### 6.3 WooCommerce product metabox (`_bp3d_product_`) — no design yet

Top level: `currentViewer`, `bp3d_models` (group, dynamic fields from `3dviewer_product_attributes`), `replace_model_with_thumbnail`, `show_model_instead_thumbnail`, `viewer_position`, `bp_model_template` (select from `bp3d-preset` posts), `show_thumbs`, `bp_3d_zooming`, `show_arrows`, `hotspot_style`, `bp_3d_dimensions_mode`, `bp_3d_dimensions_source`, `bp_3d_dimension_color`, `bp_3d_height`, `bp_model_bg`, `bp3d_popup_models` (group), two `content` fields; free adds `bp_model_angle` + `angle_property`; legacy flat `bp3d_model_src` / `bp3d_poster_src` surfaced as group defaults. Render with the framework's default metabox layout (rows inside a WooCommerce postbox); dedicated design optional.

### 6.4 Onboarding (not CSF, but part of the new UI)

Premium: hidden page `bp3d-setup-wizard`, option `bp3d_setup_wizard_completed`, step "choose-how-to-generate" writes `gutenberg_enabled` via `Ajax::saveSetup`. Free: `Onboarding.php` with `bp3d_onboarding_completed/progress/exited/redirect`. The framework's `Wizard` module renders the three Figma steps from a config; keys above are kept. Design gap to resolve: Step 3 offers Gutenberg / Elementor / Shortcode, while the stored setting is binary (`gutenberg_enabled` `'1'`/`'0'`). Proposed mapping: Gutenberg → `'1'`, Elementor and Shortcode → `'0'`.

### 6.5 Pre-existing free ↔ premium drift (document, do not fix here)

The free plugin writes `bp_3d_environment_image_preset` (`neutral|legacy|custom`) and `bp_3d_decoder*`; premium reads `bp_3d_environment_preset` (`''|legacy|custom`) and ignores decoders. A site upgrading free → premium already loses those choices today. Out of scope for this migration (fixing it means a read-time alias, not a UI change), but the unified schema is the right place to add the alias later.

---

## 7. Safety rules (the checklist every phase must satisfy)

1. **Keys and shapes** exactly as section 3.1. No renames, no type changes, no new keys inside the three data arrays. The only new options are `bp3d_admin_ui` (4.9) and `bfields_version`; both go into `uninstall.php`.
2. **Untouched values round-trip verbatim.** Hydrate raw → edit → send; a field the user did not touch is sent exactly as hydrated. Sanitizers must be idempotent over the golden dataset (`sanitize(stored) === stored`).
3. **Never drop undeclared keys** (read-modify-write merge).
4. **Never delete on empty payload.** Deletion only via WordPress uninstall.
5. **Seed defaults like CSF** when the option is empty, using the plugin's field defaults, so fresh installs behave identically.
6. **Boolean discipline**: a toggle the user flips writes `'1'`/`'0'`; a stored `''` or PHP `true`/`false` nobody touched is written back as it is (decision 12). Display reads the full truth table (`'1'|1|true|'true'|'yes'` → on).
7. **Same URLs**: `page=3dviewer-settings`, `#tab=<legacy slug>` aliases, `bp3d-setup-wizard`, mount ids `#bp3d-model-preview-root` / `#bp3d-preview-btn-root` kept until the preview is a subscriber.
8. **Same gating**: licence checks (`bp3d_fs()->can_use_premium_code()`), `3d_woo_switcher === '0'` early return, `filter_block_editor_meta_boxes` removal, capability checks.
9. **Same public filters, forever**: `3dviewer_product_attributes`, `bp3d_classic_model_attribute`, `csf_{unique}_save` and its siblings — fired by both renderers during coexistence and by bfields alone after Stage C.
10. **Reversible during coexistence**: option `bp3d_admin_ui`, constant `BP3D_ADMIN_UI`, filter `bp3d_admin_ui`, and a no-JS switch. Codestar stays vendored until the Stage C gate (4.10) passes. Switching UI requires no data action.
11. **One schema per key**: a field array is defined once and handed to `Registrar`; never maintain a Classic copy and a Modern copy of the same field list.
12. **The store holds stored shapes** (4.0). No field component may hold a "nicer" representation that is converted on save.
13. **One runtime on the page**: one `lib/bfields/` copy loaded by arbitration, one `bfields-ui` handle, one `window.bfields`. No host bundles the runtime.
14. **The screen never locks the user out**: a fallback notice rendered as server HTML inside the mount node (removed by the bundle on mount, so it stays when the bundle 404s or is blocked, not only without JS) + error boundary + `data-fallback` switch URL from the host + constant override (4.6).
15. **Validation twice, by spec**: per-type rules live in the schema JSON and are implemented in both PHP and TS; no shared code across the boundary, no trust in the client.
16. **Proof, not confidence**: the verification protocol in section 8 runs green **in both modes** before each phase is merged during coexistence, including the cross-mode round-trip (save in Classic, open and save in Modern, and back); and green in Modern alone before Stage C.
17. **No JSON inside the three data arrays**: `SpecGlossScanner` searches the serialized meta with raw SQL `LIKE` and only works while URLs are stored as plain strings inside PHP-serialized arrays.

---

## 8. Verification protocol

### 8.1 Golden dataset (capture once from the dev site, keep as fixtures)

```bash
cd /path/to/wordpress
mkdir -p golden/before
wp option get _bp3d_settings_ --format=json > golden/before/settings.json
for id in $(wp post list --post_type=bp3d-model-viewer --post_status=any --format=ids); do
  wp post meta get "$id" _bp3dimages_ --format=json > "golden/before/viewer-$id.json"
done
for id in $(wp post list --post_type=product --post_status=any --meta_key=_bp3d_product_ --format=ids); do
  wp post meta get "$id" _bp3d_product_ --format=json > "golden/before/product-$id.json"
done
# frontend parity
for id in $(wp post list --post_type=bp3d-model-viewer --post_status=publish --format=ids); do
  wp eval "echo do_shortcode('[3d_viewer id=$id]');" > "golden/before/render-$id.html"
done
```

Today's dev site has 27 viewers (16 with `_bp3dimages_`, 6 block-editor), 12 products (9 with `_bp3d_product_`). Add fixtures for: a cycle-model post with nested hotspots, a product with variant `attribute_*` maps and popup models, a record saved by CSF "Reset" (PHP bools), a free-plugin-authored record (`bp_3d_decoder`, flat `bp3d_model_src`), text with `\` `'` `"` in hotspot desc and CSS.

### 8.2 Automated

- **PHP unit (framework)** — `bin/test.sh`, and the `wordpress` CI job on WP 6.5 and latest (gate item 2 of 4.10):
  - `tests/php/roundtrip.php`: for every golden and edge record (`fixtures/golden`, `fixtures/edge` — Reset booleans, nested hotspots, variant maps, a free-authored record, `\ ' "` text), `sanitize(hydrate(stored))` equals `stored`, and so does a full `Storage\Option::save()` / `Storage\PostMeta::save()` round trip on scratch storage; only the documented 3.1 variants may change; undeclared keys survive; unknown types keep their arrays. Fails on 0 records or a missing field set.
  - `tests/php/seeding.php`: bfields' seeded row `===` the row a real `CSF_Options` seeds, key order included.
  - `tests/php/save-parity.php`: the same POST through real Codestar and through bfields stores the same bytes (kses, one-argument `sanitize`, `validate`) and fires the same hooks in the same order with the same arguments, for an options page and a meta box.
  - `tests/php/asset-deps.php`: the bundle depends only on handles WordPress 6.5 registers (or bfields shims).
- **PHP unit (dependency):** table of CSF rules from all six field files evaluated identically by the PHP and TS engines (shared JSON fixture), and both checked against Codestar's own `main.js` parsing and `Rule.evalCondition` (tests/ts/codestar-parity.test.ts).
- **Playwright e2e (rewrite helpers in `tests/e2e/helpers/wp-admin.ts`):** `openSettingsTab`, `setSwitch`, `setChoice`, `setMediaUrl`, `saveSettings` against `bfields-*` selectors; keep every existing spec's assertions (11 specs reference CSF).
- **Round-trip e2e:** open each screen, click Save with no edits, then `diff -r golden/before golden/after` — must be empty. Repeat after toggling one field and toggling it back. Run in Modern, then switch to Classic and repeat, then Modern again (cross-mode round trip).
- **Frontend parity:** re-render `render-*.html` after saving through the new UI and diff.

### 8.3 Manual (release checklist)

Fresh install (free and premium), upgrade from 2.0.0 with existing data, licence active → inactive → active (Pro data survives a free-mode save), WooCommerce off/on, block-editor post, classic post, product with variations, multisite subsite, RTL, keyboard/a11y pass (the `a11y.spec.ts` suite already exists).

---

## 9. Phased plan

Effort tags: S ≈ days, M ≈ 1–2 weeks, L ≈ 3+ weeks, one engineer. The three **stages** are releases (10); the phases are
the work between them. The coexistence clock starts when Stage A ships.

**Calendar constraint.** 2.0.0 is not yet shipped and the BFCM feature freeze is ~15 Oct 2026. Phases 0–1 change nothing
in the plugins and can run in October; Stage A cannot ship inside the BFCM window. Earliest realistic Stage A is the
first post-BFCM release (late Nov / early Dec 2026), which puts Stage B in Jan 2027 and Stage C in Feb–Mar 2027. If that
is too late, the lever is scope, not safety: Stage A already ships only the Settings page on Modern (Phase 2), so the
smallest possible first release is already the plan.

### Phase 0 — Freeze, fixtures, repo (S)
- Create `bPlugins/bfields`; `php/bootstrap.php` copied from `bp-extension-manager` with the prefix changed; composer,
  npm, CI running the PHP round-trip suite and the TS unit suite on every push.
- Capture the golden dataset (8.1) and commit it to the premium repo under `tests/fixtures/golden/`, plus the extra
  fixtures listed there (cycle model with nested hotspots, product with variant maps and popup models, a Classic Reset
  record with PHP booleans, a free-authored record, text with `\` `'` `"`).
- Dump the CSF registries from both plugins into `tests/fixtures/schema-inventory.json` — the contract bfields is tested against.
- Freeze the names (4) and `"schema": 1`.
- Exit: fixtures committed; this document approved (11 confirmed).

### Phase 1 — Framework core (L)
- **JS first**: registry, store in stored shape, dependency engine (operators from `plugins.js`, row-then-root scope),
  layouts ported from `3d-viewer-new-ui` under the `bfields-` prefix, `window.bfields` runtime, toasts, search,
  unsaved-changes guard, error boundary. The **simple types** — `text`, `textarea`, `number`, `spinner`, `switcher`,
  `select`, `radio`, `color`, `slider`, `button_set`, `checkbox`, `content`, `notice`, `callback` — enough to render the
  whole Settings page (Appendix B, `_bp3d_settings_` uses no group/media/code types except `bp3d_loader_image` and
  `custom_css`, which get the `media` and `code_editor` components here too).
- **PHP spine**: bootstrap, Registry → JSON schema, `csf` codec, `serialize` option storage, sanitizer, OptionsPage
  (menu, REST save, seeding, resets, `#tab=` aliases), Assets, `bfields_*` hooks; `\BFields\Compat\Codestar` covering
  the Settings-page types plus the `csf_*` hook bridge.
- **Not in Phase 1**, deferred until a second consumer exists (11.10): `json` codec, `unserialize`/network/transient
  storage, `defineSchema()`, D.2/D.3 types.
- Exit: a demo plugin registers the full `_bp3d_settings_` schema through the compat layer; `sanitize(hydrate(golden))
  === golden` for every settings fixture; the TS and PHP dependency engines agree on the rule table from all six field files.

### Phase 2 — Settings page in both plugins → **Stage A release** (M)
- `lib/bfields/` into premium and free; `inc/Helper/Registrar.php`; `inc/Base/AdminUi.php` (`bp3d_admin_ui`, Stage A
  defaults, notice, overrides, the no-JS switch endpoint); `uninstall.php`.
- `Settings.php`/`SettingsPro.php`/`AnalyticsPro::settingsSection()` → `Registrar::`, plus `id`/`icon`/`layout`/`pro`
  keys (ignored by Codestar). Preset/Analytics/Modules tabs on the default row layout until designed.
- **Meta boxes stay on Codestar in both modes** — `Registrar` forwards them to `\CSF::` regardless of mode until Phase 3.
- e2e helpers gain a mode parameter; `plugin.spec.ts`, `analytics.spec.ts`, `loader.spec.ts`, `a11y.spec.ts` run in both
  modes; round-trip diff empty on the golden option in both and across modes; fresh-install seeding identical.
- Release-gate agent; ship. **Coexistence clock starts.**

### Phase 3 — The hard types + the viewer meta box (L)
- `group`/`repeater` (nested, collapsible, sortable, row-local dependencies, empty → `''`), `media` (wp.media, 8-key
  array), `upload` (URL string, adornment slots), `dimensions`, `spacing`, `fieldset`, `code_editor` — Appendix D.1
  complete. `Metabox.php` + `MetaboxShell`, `serialize` post-meta storage, hidden JSON textarea, `save_post` guards.
- `Viewer.php`/`ViewerPro.php` → `Registrar::`; `pro => true` beside the existing `bp3d-readonly` classes.
- Preview becomes a subscriber (`bfields.subscribe`, `readAttributes()` kept); cloud picker, SpecGloss and
  advanced-viewer notices become adornments; Classic paths stay behind `bp3dAdmin.ui`.
- `#submitdiv` restyled per 11.5; `[3d_viewer id=N]` header rendered inside the React panel in Modern.
- e2e: `classic.spec.ts`, `hotspots.spec.ts`, `dimensions.spec.ts`, `cloudstorage.spec.ts`, `specgloss.spec.ts` in both
  modes; round-trip diff empty on all viewer fixtures; frontend render diff empty; licence-lapse save keeps Pro keys.
- **Cannot exit without the repeater design (11.6).**

### Phase 4 — WooCommerce product meta box (M)
- `ProductMeta.php`/`ProductMetaPro.php` → `Registrar::`; `3dviewer_product_attributes`, `legacyFreeModelRows()` and
  `preserveProData()` unchanged. Default meta-box layout until a design exists (6.3).
- e2e `woocommerce.spec.ts` in both modes; round-trip diff empty incl. variant maps and popup models.

### Phase 5 — **Stage B release** (S)
- Default flips to `modern` for all sites; one-click switch back in the header; notice copy updated.
- Release-gate agent; ship. **The four-week field-evidence window (4.10 item 1) starts.**

### Phase 6 — Onboarding (S–M, may slide past Stage C)
- `Wizard` from `OnboardingLayout`/`Stepper`/`Highlights`/`Step*`; config-driven like `src/admin/setup-wizard/config.json`;
  same page slug and completion keys; Step 3 mapping per 6.4.

### Phase 7 — **Stage C release: retire Codestar** (S + the gate)
- Every item in 4.10 true. Remove exactly Appendix C's "Remove at Stage C" list. Release-gate agent; ship.
- Then widen bfields: D.2 types, `unserialize` storage, `defineSchema()`, HVP — each with its own
  coexistence period and its own gate.

---

## 10. Rollout and rollback

Three releases, about two to three months end to end from Stage A:

| Stage | Ships | Default for upgrades | Rollback |
| --- | --- | --- | --- |
| **A** | bfields + Codestar; Settings page on Modern, meta boxes still Codestar | `classic`, with a notice inviting the switch | Setting, header link, no-JS form, `BP3D_ADMIN_UI`, filter — instant, no data action |
| **B** | Meta boxes on Modern too | `modern` for everyone, one-click back | Same |
| **C** | Codestar removed | `classic` read as `modern` | **None by design** — which is why 4.10 exists. Emergency path: the previous release's zip (Freemius keeps them) restores Codestar with zero data work, because the arrays never changed |

- **Support playbook (A, B):** "Settings look wrong / can't save in the new interface" → switch to Classic (setting or
  constant), reload, ask for the screen and the `_bp3d_settings_` export. No data step.
- **Support playbook (C):** the same ticket now means a bfields bug with no fallback UI. Triage against the golden
  fixtures first; the previous release is the rollback.
- **Measuring adoption before B and C:** count sites on each mode (Freemius opt-in data, or one aggregate in the existing
  analytics beacon with opt-in respected) and the number of "switch back" actions. Stage B needs a comfortable majority
  already on Modern by choice; Stage C needs 4.10.
- **Framework upgrades later:** arbitration (4.7) means the newest plugin's copy wins; the `csf` codec is frozen and
  covered by the golden tests, so a newer bfields never changes stored shapes. Breaking changes ship as a new package.
- **Codestar upgrades during coexistence:** stay on 2.3.1. Nothing depends on upgrading it and it is about to leave.

---

## 11. Decisions — resolved in revision 3 (confirm or override before Phase 1)

| # | Decision | Resolution |
| --- | --- | --- |
| 1 | Package name and home | **`bfields`, own repo `bPlugins/bfields`, shipped at `lib/bfields/`** (4.1). Not `bpl-tools` (JS-only, and not maintained by this team). |
| 2 | Schema authoring | **PHP arrays for 3D Viewer, forever; the JSON wire format is the API; `defineSchema()` deferred** to the first plugin that has no request-time schema (4.0). |
| 3 | Default sanitization | **Keep CSF's `wp_kses_post` for `csf`-codec keys.** A Classic save and a Modern save must produce identical bytes during coexistence; per-type strictness is a post-Stage-C option. |
| 3a | Switch defaults | **Staged** (4.9, 10): A = upgrades Classic + notice; B = Modern for all; C = Codestar gone. *Needs your confirmation — the alternative (Modern for all at A) gets adoption data sooner at the cost of hitting 100 % of installs with a first release.* |
| 4 | Metabox reset | **Non-destructive per-tab reset** in Modern; Codestar's Restore untouched in Classic. |
| 5 | Publish box | **Restyle core `#submitdiv`**, do not hide or proxy it. `post.php` stays the saver; autosave, revisions and post locking keep working; publishing never depends on a React handler being alive. |
| 6 | Design gaps to commission | Still open — Elements tab, group/repeater rows, Preset/Analytics/Modules tabs, Woo meta box, `code_editor`, `color` alpha, `media`/`upload` pickers, `spacing`, `fieldset`. Framework defaults render them until then; **Phase 3 cannot exit without the repeater design.** |
| 7 | Onboarding | **After Stage B, may slide past Stage C** (Phase 6). Step 3 mapping: Gutenberg → `'1'`, Elementor/Shortcode → `'0'`. |
| 8 | Fonts | **Bundled Inter woff2.** No third-party request from wp-admin (GDPR). |
| 9 *(new)* | Coexistence length | **~2–3 months, three releases**, with Stage C gated by 4.10 rather than by the calendar. |
| 10 *(new)* | Scope of v1 | **21 types, `csf` codec, `serialize` storage only.** Everything else waits for a second consumer. |
| 11 *(new)* | Where this document lives | **In `bPlugins/bfields`**, once the repo exists. The copy in `3d-viewer-new-ui/` becomes a one-line pointer so the two cannot drift. |
| 12 *(2026-09-23)* | Switcher and seeded values (review 4.1, 4.2) | **Identity.** The codec never rewrites a value Codestar can have written (`''`, PHP bools, ints); a value changes only when the user changes it. Seeding and Reset store CSF's raw default, so `true` stays `true`. Supersedes "always writes `'1'`/`'0'`" in 3.1. |
| 13 *(2026-09-23)* | URL/colour sanitizers (review 4.3) | **Decision 3 re-confirmed: kses for every type** during coexistence; the `esc_url_raw`/`absint`/lower-casing layer was removed. |
| 14 *(2026-09-23)* | Framework meta box (review 3.5) | **Plain core meta box, hides nothing.** A full-screen editor is a host layout (`'render' => false`) that hides only the core boxes it replaces. |

---

## Appendix A — Reference fixtures from the dev site (2026-09-19)

`_bp3d_settings_` (premium 2.0.0, licensed):

```json
{"allowed_mime_types":"","delete_data_on_uninstall":"","bp3d_loader_type":"default","bp3d_loader_image":{"url":"","id":"","width":"","height":"","thumbnail":"","alt":"","title":"","description":""},"bp3d_loader_size":"100","bp3d_loader_background":"#ffffff","bp3d_control_labels":"off","bp3d_control_corner_zoom":"bottom-right","bp3d_control_corner_fullscreen":"bottom-right","bp3d_control_corner_camera":"bottom-left","bp3d_control_corner_reset":"bottom-left","bp3d_control_corner_dimensions":"bottom-left","bp3d_control_corner_ar":"bottom-left","bp3d_control_text_zoomIn":"","bp3d_control_text_zoomOut":"","bp3d_control_text_fullscreen":"","bp3d_control_text_camera":"","bp3d_control_text_reset":"","bp3d_control_text_dimensions":"","bp3d_control_text_ar":"","bp3d_control_size":"35","bp3d_control_gap":"10","bp3d_control_offset":"10","analytics_enabled":"1","analytics_exclude_editors":"1","analytics_respect_gpc":"1","analytics_retention":"90","analytics_ga4":"","bpp_3d_width":{"width":"100","unit":"%"},"bpp_3d_height":{"height":"320","unit":"px"},"bpp_model_bg":"transparent","bpp_3d_autoplay":"","3dp_shadow_intensity":"1","bpp_3d_preloader":"","bpp_camera_control":"1","bpp_3d_zooming":"1","bpp_3d_progressbar":"1","bpp_3d_loading":"auto","bpp_3d_rotate":"","3dp_rotate_speed":"30","3dp_rotate_delay":"3000","bpp_3d_fullscreen":"1","3d_woo_switcher":"1","is_not_compatible":"0","3d_shadow_intensity":"1","bp_camera_control":"1","bp_3d_zooming":"1","bp_3d_progressbar":"1","bp_3d_loading":"auto","bp_3d_mobile_image_mode":"off","bp_3d_mobile_tap_label":"","bp_3d_mobile_breakpoint":"768","bp_3d_mobile_reduce_motion":"","bp_3d_rotate":"1","3d_rotate_speed":"30","3d_rotate_delay":"3000","bp_3d_autoplay":"","bp_3d_fullscreen":"1","gutenberg_enabled":"1","gallery":".woocommerce-product-gallery","gallery_item":"","gallery_item_active":"","gallery_thumbnail_item":"","gallery_trigger":"","custom_css":""}
```

Note the three spellings of "off" in one record (`""`, `"0"`, and `"1"` for on) — the truth table in 7.6 is not optional.

`_bp3dimages_` for post 6322 (single model, link source, one link hotspot, empty groups stored as `""`):

```json
{"currentViewer":"modelViewer","bp_3d_model_type":"msimple","bp_3d_src_type":"link","bp_3d_src":{"url":"","id":"","width":"","height":"","thumbnail":"","alt":"","title":"","description":""},"bp_3d_src_link":"https://modelviewer.dev/shared-assets/models/Astronaut.glb","bp_3d_models":"","bp_3d_poster":{"url":"","id":"","width":"","height":"","thumbnail":"","alt":"","title":"","description":""},"initial_view":"[]","invalid":"","hotspots":[{"title":"Link E2E","type":"link","desc":"","linkUrl":"https://example.com/","linkText":"","openInNewTab":"0","position":"0m 0.5m 0m","normal":"0m 0m 1m","orbit":"","target":"","fov":""}],"hotspot_style":"style-2","bp_3d_posters":"","bp_3d_environment_preset":"custom","bp_3d_environment_image":"","bp_3d_use_environment_as_skybox":"","bp_3d_skybox_image":"","bp_3d_skybox_height":"","bp_3d_tone_mapping":"","bp_3d_autoplay":"","bp_camera_control":"1","bp_3d_zooming":"1","bp_3d_show_edge":"","bp_3d_edge_color":"#000000","bp_3d_edge_threshold":"1","lockXAxisRotation":"","lockYAxisRotation":"","bp_3d_loading":"auto","bp_3d_mobile_image_mode":"off","bp_3d_mobile_tap_label":"","bp_3d_mobile_breakpoint":"768","bp_3d_mobile_reduce_motion":"","bp_3d_dimensions_mode":"off","bp_3d_dimension_unit":"cm","bp_3d_dimension_color":"","real_size":{"width":"","height":"","depth":""},"bp_3d_rotate":"","3d_rotate_speed":"30","3d_rotate_delay":"3000","3d_zoom_level":"1","3d_shadow_intensity":"1","3d_exposure":"1","show_thumbs":"","show_arrows":"1","bp_3d_enable_ar":"","model_iso_src":"","ar_placement":"floor","ar_mode":"webxr","bp_3d_fullscreen":"1","bp_3d_zoom_in_out_btn":"","bp_3d_camera_btn":"","bp_3d_reset_view_btn":"","bp_3d_control_labels":"off","bp_3d_control_corner_zoom":"bottom-right","bp_3d_control_corner_fullscreen":"bottom-right","bp_3d_control_corner_camera":"bottom-left","bp_3d_control_corner_reset":"bottom-left","bp_3d_control_corner_dimensions":"bottom-left","bp_3d_control_corner_ar":"bottom-left","bp_3d_control_text_zoomIn":"","bp_3d_control_text_zoomOut":"","bp_3d_control_text_fullscreen":"","bp_3d_control_text_camera":"","bp_3d_control_text_reset":"","bp_3d_control_text_dimensions":"","bp_3d_control_text_ar":"","bp_3d_progressbar":"1","bp_model_progress_percent":"","bp_3d_variant":"","bp_3d_animation":"","bp_3d_selected_animation":"","bp_3d_control_size":"35","bp_3d_control_gap":"10","bp_3d_control_offset":"10","bp_3d_width":{"width":"100","unit":"%"},"bp_3d_height":{"height":"320","unit":"px"},"bp_3d_align":"center","bp_model_bg":"transparent","bp_model_bg_image":"","bp_3d_thumb_size":"70px","bp_model_progressbar_color":"rgba(0, 0, 0, 0.4)","css":"","additional_id":"","additional_class":""}
```

## Appendix B — Full key inventory

### `_bp3d_settings_`

| Section (premium / free) | Keys |
| --- | --- |
| General (both) | `allowed_mime_types`, `delete_data_on_uninstall` |
| General (premium only) | `bp3d_loader_type`, `bp3d_loader_image`, `bp3d_loader_size`, `bp3d_loader_background`, `bp3d_control_labels`, `bp3d_control_corner_{zoom,fullscreen,camera,reset,dimensions,ar}`, `bp3d_control_text_{zoomIn,zoomOut,fullscreen,camera,reset,dimensions,ar}`, `bp3d_control_size`, `bp3d_control_gap`, `bp3d_control_offset` |
| Analytics (premium build, licensed or not) | `analytics_enabled`, `analytics_exclude_editors`, `analytics_respect_gpc`, `analytics_retention`, `analytics_ga4` |
| Preset (premium build) | `bpp_3d_width`, `bpp_3d_height`, `bpp_model_bg`, `bpp_3d_autoplay`, `3dp_shadow_intensity`, `bpp_3d_preloader`, `bpp_camera_control`, `bpp_3d_zooming`, `bpp_3d_progressbar`, `bpp_3d_loading`, `bpp_3d_rotate`, `3dp_rotate_speed`, `3dp_rotate_delay`, `bpp_3d_fullscreen` |
| WooCommerce (both; free has a subset) | `3d_woo_switcher`, `is_not_compatible`, `3d_shadow_intensity`, `bp_camera_control`, `bp_3d_zooming`, `bp_3d_progressbar`, `bp_3d_loading`, `bp_3d_mobile_image_mode`, `bp_3d_mobile_tap_label`, `bp_3d_mobile_breakpoint`, `bp_3d_mobile_reduce_motion`, `bp_3d_rotate`, `3d_rotate_speed`, `3d_rotate_delay`, `bp_3d_autoplay`, `bp_3d_fullscreen` |
| Shortcode (both) | `gutenberg_enabled` |
| Selectors (both; `custom_css` premium only) | `gallery`, `gallery_item`, `gallery_item_active`, `gallery_thumbnail_item`, `gallery_trigger`, `custom_css` |
| Modules (premium, dynamic) | `module_<slug>` |

### `_bp3dimages_` (pro definition; free/prem-free are subsets plus `bp_3d_decoder`, `bp_3d_decoder_draco_file`, `bp_3d_download_btn`, `bp_3d_environment_image_preset`, `bp_model_angle`, `angle_property`, `bp_3d_poster_type`, `bp_model_anim_du`)

Model: `currentViewer`, `bp_3d_model_type`, `bp_3d_src_type`, `bp_3d_src`, `bp_3d_src_link`, `bp_3d_models[]{model_link, poster_src, environment_preset, environment_image_src, use_environment_as_skybox, skybox_image_src, skybox_height, tone_mapping, exposure, enable_ar, model_iso_src, ar_placement, ar_mode, real_size{width,height,depth}, hotspots[]{title,type,desc,linkUrl,linkText,openInNewTab,position,normal,orbit,target,fov}, initial_view}`, `bp_3d_poster`, `initial_view`, `hotspots[]`, `hotspot_style`, `bp_3d_posters[]{poster_img}`, `bp_3d_environment_preset`, `bp_3d_environment_image`, `bp_3d_use_environment_as_skybox`, `bp_3d_skybox_image`, `bp_3d_skybox_height`, `bp_3d_tone_mapping`.

Settings: `bp_3d_autoplay`, `bp_camera_control`, `bp_3d_zooming`, `bp_3d_show_edge`, `bp_3d_edge_color`, `bp_3d_edge_threshold`, `lockXAxisRotation`, `lockYAxisRotation`, `bp_3d_loading`, `bp_3d_mobile_image_mode`, `bp_3d_mobile_tap_label`, `bp_3d_mobile_breakpoint`, `bp_3d_mobile_reduce_motion`, `bp_3d_dimensions_mode`, `bp_3d_dimension_unit`, `bp_3d_dimension_color`, `real_size{}`, `bp_3d_rotate`, `3d_rotate_speed`, `3d_rotate_delay`, `3d_zoom_level`, `3d_shadow_intensity`, `3d_exposure`.

Elements: `show_thumbs`, `show_arrows`, `bp_3d_enable_ar`, `model_iso_src`, `ar_placement`, `ar_mode`, `bp_3d_fullscreen`, `bp_3d_zoom_in_out_btn`, `bp_3d_camera_btn`, `bp_3d_reset_view_btn`, `bp_3d_control_labels`, `bp_3d_control_corner_*` (6), `bp_3d_control_text_*` (7), `bp_3d_progressbar`, `bp_model_progress_percent`, `bp_3d_variant`, `bp_3d_animation`, `bp_3d_selected_animation`.

Style: `bp_3d_control_size`, `bp_3d_control_gap`, `bp_3d_control_offset`, `bp_3d_width`, `bp_3d_height`, `bp_3d_align`, `bp_model_bg`, `bp_model_bg_image`, `bp_3d_thumb_size`, `bp_model_progressbar_color`, `css`, `additional_id`, `additional_class`.

Other post meta touched by the plugin, unaffected: `_bp3d_is_gutenberg` (legacy `isGutenberg`), `_bp3d_specgloss_probe`, `_bp3d_converted_from/_to`.

### `_bp3d_product_`

See 6.3. Dynamic row fields inside `bp3d_models[]`: `model_src`, `attribute_<name>` (one select per variation attribute), `poster_src`, `environment_image_src`, `skybox_image_src`, `exposure`, `enable_ar`, `model_iso_src`, `ar_placement`, `ar_mode`, `real_size{}`, `hotspots[]`, `initial_view`. Legacy flat: `bp3d_model_src`, `bp3d_poster_src`.

## Appendix C — Files touched per plugin (premium; free is the subset without `*Pro.php`)

**Add:** `lib/bfields/` (runtime copy from `dist/bfields.zip`, committed), `inc/Helper/Registrar.php`, `inc/Base/AdminUi.php`
(option, staged defaults, notice, overrides, no-JS switch endpoint), `tests/fixtures/golden/`, `tests/fixtures/schema-inventory.json`.

**Change:** `3d-viewer-premium.php` (require `lib/bfields/php/bootstrap.php`; make the Codestar `require_once` conditional on
Classic mode), `inc/Field/Settings.php`, `SettingsPro.php`, `Viewer.php`, `ViewerPro.php`, `inc/Woocommerce/ProductMeta.php`,
`ProductMetaPro.php` (`\CSF::` → `Registrar::`, add `id`/`icon`/`layout`/`pro` keys), `inc/Base/AnalyticsPro.php`
(`settingsSection()` unchanged content, called through `Registrar`), `inc/Base/EnqueueAssets.php` (enqueue `bp3d-readonly-style`
and `.csf-*` overrides only in Classic; localize `bp3dAdmin.ui`), `inc/Base/ExtendMimeType.php` (style injection only in Classic),
`inc/Base/PostTypeModelViewer.php` (shortcode area / live-preview box per mode; `#submitdiv` restyle), `inc/Base/SetupWizard.php`
(Phase 6), `src/admin/preview/index.tsx`, `src/admin/cloudPicker.ts`, `src/admin/specGlossInline.ts`, `src/admin/advancedViewerInline.ts`,
`src/admin/index.ts` (add Modern paths, keep Classic paths until Stage C), `admin/css/admin-style.css` (split Classic-only rules),
`uninstall.php` (`bp3d_admin_ui`, `bfields_version`), `tests/e2e/helpers/wp-admin.ts` + 11 specs (mode-aware), `package.json`
(`zip` already lists `lib/`; `i18n-pot` gains `lib/bfields` in `--exclude`), `.gitignore` (nothing to add — `lib/` is tracked and
`/bfields`, the framework's working checkout, is already ignored), `readme.txt`.

**Remove at Stage A / B:** nothing.

**Remove at Stage C** (after the 4.10 gate): `vendor/codestar-framework/`, the `\CSF::` branch of `Registrar`, `admin/css/readonly.css`
and the `.csf-*` overrides in `admin-style.css`, the `ExtendMimeType` style fix, the Classic DOM-scraping branches in `src/admin/*`,
the CSF e2e helpers (`openCsfMetaboxTab`, `setCsfSwitcher`, …), the `bp3dAdmin.ui` flag. **Keep forever:** the CSF field arrays
(they are the schema), `preserveProData()`, the `csf_*` hook names, `bp3d_admin_ui` (read, mapped to `modern`).

## Appendix D — Field type coverage: what the new UI already has, what is missing

Legend for **Design/prototype**: ✅ component exists in the design repo (`3d-viewer-new-ui`) · ◐ partial (visual only, no behaviour) · ✗ nothing yet.
"Core type" is the modern schema type the Codestar type translates to.

### D.1 Types used by 3D Viewer (simple set by Phase 1, all 21 by Phase 3)

| CSF type | Where used | Core type | Design/prototype | What is missing |
| --- | --- | --- | --- | --- |
| `switcher` | everywhere (toggles) | `toggle` | ✅ `Toggle` (`controls.jsx`) | `text_on`/`text_off` labels are supported; `label` (side caption) is not. `danger` tone exists. |
| `button_set` | viewer, model type, align, AR, loader, labels, mobile mode… | `choice` (`presentation: segmented \| cards`) | ✅ `Segmented`, ✅ mode cards (`bp3d-mode`) | Generic cards need icon/perks from schema; `multiple => true` variant (multi-select buttons) not built. |
| `radio` | loading type, viewer position | `choice` (`presentation: radio`) | ✅ `RadioGroup` | Options with descriptions (Woo `viewer_position` has 6 long labels) need a stacked layout. |
| `select` | tone mapping, env preset, units, corners, retention, template, hotspot type | `choice` (`presentation: select`) | ◐ native `<select class="bp3d-select">` | Styled dropdown; `chosen`/`multiple`; empty-value option (`'' => 'Neutral (default)'`) must round-trip as `''`. |
| `checkbox` (with options) | `allowed_mime_types` | `choice` (`multiple`, `presentation: tiles`) | ✅ `MimeTile` grid + Select/Deselect all | Plain checkbox list presentation for non-MIME use; single checkbox (no options → `'1'`/`''`) not built. |
| `text` | selectors, labels, links, JSON fields, thumb size | `text` | ◐ `bp3d-input` | Placeholder/`attributes` pass-through, `selector` layout with copy button, monospace variant for JSON (`initial_view`, `position`). |
| `textarea` | hotspot `desc` | `text` (`multiline`) | ✗ | Component. |
| `number` | delays, breakpoint, control size/gap/offset, real size | `number` | ✗ | Component with `unit` suffix and `attributes.min/max/step`; must **store strings**. |
| `spinner` | shadow, rotate speed, zoom level, exposure (free) | `number` (`presentation: stepper`) | ✗ | Stepper control with `min/max/step/unit`. |
| `slider` | exposure, edge threshold, shadow (free) | `number` (`presentation: slider`) | ✅ `Slider` | Decimal `step` (0.1) and `unit`; current prototype is integer 0–10. |
| `color` | backgrounds, progressbar, edge, dimension line, loader bg | `color` | ◐ `bp3d-colorpick` button only | Picker with alpha (`rgba(0, 0, 0, 0.4)`), `transparent`, empty = default; no `wp-color-picker` dependency. |
| `media` | `bp_3d_src`, `bp_3d_poster`, `bp3d_loader_image` | `media` (`shape: csf-attachment`) | ◐ poster card (`bp3d-poster`) | `wp.media` frame integration, `library` filter, remove button, preview of non-image files (GLB), must write the 8-key array. |
| `upload` | env/skybox/iOS/background images, `model_link`, `poster_src`, `model_iso_src` | `media` (`shape: url`) | ◐ URL input + Upload button (Model tab) | `wp.media` frame writing a bare URL string; paste-URL path; adornment slots (cloud picker, SpecGloss). |
| `dimensions` | width/height (viewer, settings preset, Woo height) | `dimension` | ◐ input + unit select (`bp3d-dim`) | `units` list from schema, `width => false`/`height => false` single-axis mode; the link icon in the design has no CSF meaning (drop or make it a no-op). |
| `spacing` | `angle_property` (free/Woo) | `spacing` | ✗ | 3–4 numeric inputs with icons (`top_icon` "Deg"), `left => false`, `show_units => false`. |
| `fieldset` | `real_size` | `fieldset` | ✗ | Inline sub-field group rendering `{width,height,depth}`. |
| `group` | `bp_3d_models`, `hotspots`, `bp_3d_posters`, `bp3d_models`, `bp3d_popup_models` | `repeater` (`collapsible: true`) | ✗ | Add/remove/clone/sort rows, collapsible titles, `max`, `button_title`, **nested groups** (hotspots inside models), row-local dependency scope, empty → `''`. Biggest missing piece. |
| `repeater` | free `readonly` cycle models, `bp_3d_posters` (free) | `repeater` | ✗ | Same component as `group` without collapse. |
| `code_editor` | `custom_css`, `css` | `code` | ✗ | CSS editor (CodeMirror via WordPress `wp_enqueue_code_editor`, or a lightweight editor), `settings.mode`, subtitle callback (`#model{ID}`). |
| `content` | upgrade banners, notes, support links, shortcode text | `display` (`html`) | ◐ hint text / info bar | Render arbitrary trusted HTML (kses) with a `title`; the "Open Visual Editor" button variant. |
| `notice` | free Model tab mime warnings | `display` (`notice`, `style`) | ◐ `bp3d-infobar` | `style: info \| danger \| warning \| success` variants. |
| `callback` | preview mount points | `display` (`mount`) | ✅ mount `<div>` | Trivial: render the callback's output or an id'd mount node. |

### D.2 Types used by other bPlugins plugins (HTML5 Video Player) — needed before they adopt the framework

| CSF type | Used by | Core type | Design/prototype | What is missing |
| --- | --- | --- | --- | --- |
| `heading`, `subheading` | HVP | `display` (`heading`) | ✗ (section titles exist, not in-form headings) | In-form heading rows. |
| `image_select` | HVP | `choice` (`presentation: images`) | ✗ | Image-tile radio/checkbox. |
| `link` | HVP (3 uses in the tally) | `link` | ✗ | WordPress link picker (`wpLink`) writing `{url,text,target}`. |
| `checkbox` (single, no options) | HVP | `toggle` (`shape: '1'/''`) | ✗ | Plain checkbox writing `'1'`/`''`. |
| `select` with `chosen` / `multiple` | HVP | `choice` | ✗ | Searchable multi-select. |
| `password` | HVP | `text` (`secret`) | ✗ | Masked input. |
| Custom `library`, `poster`, `plugin` | HVP (its own `CSF_Field_*` classes) | plugin-registered | ✗ | `bfields.registerField()` + a PHP `bfields_sanitize_{type}` filter; port each class. |

### D.3 Codestar types not used by any bPlugins plugin (defer indefinitely)

`accordion`, `background`, `backup`, `border`, `color_group`, `date`, `datetime`, `gallery`, `icon`, `link_color`, `map`, `palette`, `sortable`, `sorter`, `submessage`, `tabbed`, `typography`, `wp_editor`.

### D.4 Framework behaviours (not fields) that Codestar provides and the new UI does not have yet

| Codestar behaviour | Status in prototype | Needed for |
| --- | --- | --- |
| Dependency engine (`==`, `!=`, `>`, `>=`, `<`, `<=`, `any`, `not-any`, `\|` multi-rule, `'all'` global scope, row-local scope in groups) | ✗ | every screen |
| Save / Reset Section / Reset All with confirm dialogs, success + error notices | ◐ buttons only | Settings page |
| "You have unsaved changes" warning (`show_form_warning`) and beforeunload guard | ✗ | Settings page |
| Section error markers on tabs (`validate` callbacks) | ✗ | parity; no validators in 3D Viewer today |
| Search across fields (`show_search`) | ◐ input only | Settings page |
| Metabox section nav inside a postbox, collapsible postbox, `context: side` layout | ✗ | viewer + product metaboxes |
| `wp.media` integration for `media`/`upload` | ✗ | Model tab, Woo |
| Import/Export (`backup` field) | ✗ | not used by 3D Viewer; optional |
| Locked "Pro" overlay (`bp3d-readonly` hover message) | ✗ | free plugin, premium unlicensed |
| RTL styles | ✗ (Codestar ships `style-rtl.css`) | parity |
