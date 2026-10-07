# bfields review — where it stands, what went wrong, what to do next

**Date:** 23 Sep 2026 · **Reviewed:** `plugins/bfields` at commit `68d5936` (framework + demo), against
`CODESTAR-MIGRATION-PLAN.md` rev 3, the vendored Codestar 2.3.1 in `3d-viewer-premium/vendor/codestar-framework/`,
and 3D Viewer Premium 2.0.0's real field files and readers.
**Goal being judged:** replace Codestar with no data loss and no broken sites. Both run side by side for 2–3
months, then Codestar is removed.

---

## 1. Verdict

The architecture is right, and most of the hard thinking is already in the code: stored-shape store, read-modify-write
merge, absent payload = no-op, newest-copy arbitration, one bundle, React from `wp.element`, a frozen codec. The
design port looks well done.

**It is not safe to put in front of a real user yet.** The problem is not that features are missing. It is that
several places *claim* a guarantee the code does not deliver, and the tests that should catch that pass without
testing anything:

- The two data-safety suites report **PASS on 0 records and 0 fields** when run the documented way (`bin/test.sh`).
  CI never runs them.
- The seeding test compares Codestar's defaults *after* passing them through bfields' own codec, so it can never
  catch a difference in stored type.
- The `csf_*` hook bridge fires in a different order from Codestar, and with different arguments.
- Unknown field types are silently shown as text inputs, and any array they hold is written back as `''`.
- On WordPress 6.5, the plugin's stated minimum, the bundle cannot load at all: it depends on `react-jsx-runtime`,
  which only exists from WP 6.6. The dev site runs 7.1.2, so nothing here would ever show it.

None of these is hard to fix, but each would be a data-loss or blank-screen ticket in the field. Fix sections 3
and 4 before anything else. After that, Stage A (the Settings page only) is realistic for the first release after
BFCM, as the plan says.

---

## 2. Progress against the plan

| Phase | Plan says | Actual state | Gap |
| --- | --- | --- | --- |
| 0 — fixtures, repo | Golden set + edge fixtures committed to the **premium** repo; schema inventory; CI running the PHP round-trip | 163 golden files captured (in `bfields/tests`, not premium); inventory JSON present; CI runs lint + TS only | Edge fixtures missing (Reset booleans, nested hotspots, variant maps, free-authored record, `\ ' "` text). PHP data suites are not in CI. |
| 1 — framework core | Simple types, options page, compat layer, `csf_*` bridge | Done, plus the "hard" types built early as stand-ins (repeater, fieldset, spacing, link, code, media) | Bridge wrong (§3.3). Validation not implemented. Several simple-type controls are not at parity yet (§5). |
| 2 — Settings in both plugins (Stage A) | `lib/bfields/`, `Registrar`, `AdminUi` (`bp3d_admin_ui`), no-JS switch | Not started in premium or free | Expected: this is the next phase. |
| 3 — viewer meta box | `Metabox.php`, `Storage/PostMeta.php` in the **framework** | Framework has neither. `createMetabox()` registers a screen nothing renders or saves. The demo carries its own copies, and they are wrong (§3.5). | The biggest piece of real work left. |
| 4–7 | — | — | — |

**Scope drift worth noting:** D.2 types (`link`, `image_select`, `heading`, `submessage`, `password`) and a
resizable page layout (`ui/layout/Resizable.tsx`) were built. The plan's v1 scope (decision 10) said to wait for a
second consumer. That is not harmful by itself. The cost is that time went into breadth while the data-path
guarantees below were left unproven.

---

## 3. What went wrong — must fix before Stage A (data or lockout risk)

### 3.1 The data-safety tests prove nothing as they stand
**Evidence.**
- `WP_PATH=… ./bin/test.sh` prints `records: 0 / values: 0 … PASS` and `fields compared: 0 … PASS`.
- In a wp-cli request `is_admin()` is false, so 3D Viewer never registers its Codestar sections (`Viewer.php:35`,
  `ViewerPro.php:40`, `Settings.php:36`). `bfields_schema_for()` returns null and every record is skipped
  (`tests/php/roundtrip.php:312-352`).
- When I forced admin context (`wp --exec='define("WP_ADMIN",true);' --user=1`), the suite checked 152 records and
  12,391 values and passed. The **10 product records were still skipped without a warning**, because `_bp3d_product_`
  is not registered in that context either.
- `tests/php/seeding.php:128` builds "what Codestar seeds" as `dehydrate(hydrate($csf_default))`. That runs
  Codestar's value through bfields' own codec first, so the comparison is bfields against bfields. It cannot see that
  real Codestar seeds `default => true` as PHP `true` (`admin-options.class.php:187-199` saves `get_default()` raw)
  while bfields seeds `'1'`.
- `.github/workflows/ci.yml:59-76`: the PHP job only runs `php -l`.

**Why it matters.** Plan §7.16 is "proof, not confidence", and at the moment the proof is empty. Every other
guarantee in this report rests on these two suites.

**Fix.**
1. Both suites must **fail** when `records === 0`, when `fields compared === 0`, or when any of the three keys has
   no schema.
2. Boot the suites in admin context (`define('WP_ADMIN', true)` plus an administrator user) inside `bin/test.sh`.
   Make sure the Woo metabox registers (WooCommerce active, run on the hook ProductMetaPro uses).
3. Rewrite the seeding test to run **real Codestar**: delete a scratch option, instantiate `CSF_Options` for it with
   `save_defaults`, read the raw result, and compare it with `===` against what bfields writes.
4. Add a test for the **full save path**, not only `hydrate → Sanitizer::field`: `Option::save()` (merge, hooks,
   `update_option`) and the post-meta equivalent, including slashes.
5. Add the missing edge fixtures (§2 row 0). The golden README already lists them.
6. CI: run the PHP suites against a disposable WordPress (wp-env or a MySQL service). The golden fixtures and the
   schema inventory are enough to do this without the dev site.

### 3.2 Unknown field types lose data silently
**Evidence.**
- `Schema.php:235` maps any type missing from `TYPE_MAP` to `'text'`.
- The UI therefore resolves it to the Text component, so the warning in `FieldRenderer.tsx:81-87` ("cannot be
  edited… its saved value is preserved") never fires.
- `Codec/Csf.php:155-163` then turns any stored array into `''`, and a save writes `''` back.

**Affected types:** every Codestar type not in the map: `tabbed`, `accordion`, `sortable`, `sorter`, `gallery`,
`typography`, `background`, `border`, `wp_editor`, `date`, `backup`, `icon`, and HVP's custom `library` / `poster` /
`plugin` classes.

**Fix.** An unknown type must become an opaque pass-through: `core: 'unknown'`, `hydrate` and `dehydrate` return
the value as it is, the sanitizer uses kses only, and the UI shows a read-only notice. In `WP_DEBUG`, also call
`_doing_it_wrong()` from `Schema::field()`. Add a golden test that registers a `tabbed` field and round-trips an
array through it.

**Same class of bug, smaller:** `select` / `radio` / `image_select` without `multiple` hydrate a stored **array**
to `''` (`Csf.php:104-112`). `button_set` got the "first element" rule, but these three did not. Apply the same
rule, or pass the value through.

### 3.3 The `csf_*` hook bridge is not what Codestar does
**Evidence.**

| | Codestar 2.3.1 | bfields |
| --- | --- | --- |
| Order (options) | `_save` filter → `_save_before` → `update_option` → `_saved` → `_save_after` (`admin-options.class.php:317-352`) | `_save_before` **with unfiltered data** → `_save` filter → update → `_saved` → `_save_after` (`Storage/Option.php:89-102`) |
| 2nd argument (options) | the `CSF_Options` instance | the `$unique` string (`hooks.php:42-50`) |
| Arguments (metabox) | `($data, $post_id, $instance)` (`metabox-options.class.php:373-407`) | `($data, $unique)`, with no post id |

3D Viewer's own code hooks these:
- `Viewer.php:27` and `ProductMeta.php:42` hook `preserveProData($data, $post_id)` and call
  `get_post_meta((int) $post_id, …)`. Under the bridge, `$post_id` is `'_bp3dimages_'`, which casts to 0, so the guard
  silently does nothing.
- `Settings.php:79` reads `$instance->pre_fields`. It degrades to `array_keys($data)` only because it defensively
  checks `is_object()`.

**Fix.**
- Fire `csf_{unique}_save` first, then `save_before`, `saved` and `save_after`, in Codestar's order.
- Pass a small compat object as the last argument (`unique`, `args`, `pre_fields` = the flattened declared fields),
  so `$instance->pre_fields` keeps working.
- For metaboxes, pass `($data, $post_id, $compat)`.
- Add one test per hook asserting order and arguments against real Codestar.

### 3.4 WordPress 6.5 gets a blank screen
**Evidence.** `build/index.asset.php` lists `react-jsx-runtime`. That handle is registered only from WordPress 6.6,
and a script with a missing dependency is never printed. The plugin says `Requires at least: 6.5`, and the 2.0.0
code review already carries "T5 WP 6.5" as open.

**Fix.** Choose one:
- Build with the classic JSX runtime (a Babel override, or pin `@wordpress/scripts` to a version that emits
  `wp-element` only).
- Register a `react-jsx-runtime` shim when `! wp_script_is( 'react-jsx-runtime', 'registered' )`.

In both cases, add a CI assertion that the dependency list contains no handle newer than the floor. Run the round-trip
and one e2e test on a 6.5 install before Stage A.

### 3.5 Meta-box support only exists in the demo, and the demo breaks the plan's own rules
**Evidence.**
- There is no `php/includes/Metabox.php` and no `Storage/PostMeta.php`.
- The demo supplies both, with these problems:
  - `demo/includes/PostMeta.php:78` calls `update_post_meta()` **without `wp_slash()`**. WordPress unslashes meta on
    write, so every `\` in hotspot text or CSS would be stripped on save. Plan §3.2 names this exact risk.
  - It fires no `bfields_*` / `csf_*` hooks, so `preserveProData()` would never run on a meta-box save.
  - It hides all of `#poststuff` (`demo/ui/theme/demo.css:66`) and proxies Publish from React (`EditorShell.tsx`).
    Decision 11.5 locked "restyle core `#submitdiv`, never a proxy". Hiding `#poststuff` also hides every other
    plugin's meta box on that screen (SEO plugins, custom fields, featured image, and 3D Viewer's own
    `bp3d_live_preview` side box).

**Why it matters.** Phase 3 will naturally start from the demo, and all three problems would then ship.

**Fix.** Move meta-box support into the framework before Phase 3:
- `Storage/PostMeta.php`: read-modify-write, `wp_slash`, the same hook sequence as §3.3 with `$post_id`, a no-op
  on an absent payload, and a refusal (not a silent serialize) when `data_type` is `unserialize`.
- `Metabox.php`: `add_meta_box` plus the hidden JSON field.
- The layout decision: either keep the meta box inside `#poststuff` as the plan says, or bring decision 11.5 back to
  Raju explicitly. The demo should not decide it quietly.

### 3.6 The "never lock the user out" guarantee is not wired up
**Evidence.**
- `ui/index.tsx:65` passes `node.dataset.fallback` to the error boundary, but `OptionsPage::render()` never prints
  `data-fallback`. So the "Switch to the classic interface" button never appears.
- The default fallback URL is the current page (`OptionsPage.php:175-179`), which just reloads the broken screen.
- `<noscript>` only shows when JavaScript is **disabled**. It does nothing when the bundle 404s or is blocked by an
  optimisation plugin, which is the case plan §4.6 is written for. In that case the page is an empty div.

**Fix.**
- Render the fallback notice as normal server HTML inside the root, and let the bundle remove it on successful mount.
  If JS never runs, the escape hatch is still visible.
- Print `data-fallback`.
- Make the host's `bp3d_admin_ui` switch endpoint part of Stage A's definition of done (plan §4.9). Without it there
  is nowhere to fall back to.

### 3.7 Per-field `sanitize` callbacks get the wrong arguments
**Evidence.** `Sanitizer.php:50-52` calls `call_user_func($field['sanitize'], $value, $field)`, but Codestar passes
one argument (`admin-options.class.php:289`).
- With `'sanitize' => 'esc_url_raw'`, the field array becomes the `$protocols` list, and the URL is stripped. I
  confirmed that the second parameter receives the array.
- With internal functions such as `intval` or `trim`, PHP 8 throws a `TypeError` and the save request fatals.

**Fix.** Call it with one argument, as Codestar does. If bfields wants to offer the field array, add it as a new
`bfields_sanitize` key.

### 3.8 Validation callbacks are ignored
**Evidence.** `validate` is copied onto the schema (`Schema.php:292-296`) and then never called. Under Codestar, a
failing `validate` keeps the old value and shows an error (`admin-options.class.php:293-303`). Under bfields, the
invalid value is saved. 3D Viewer registers no validators today, but HVP might, and the plan's §4.2 promises them.

**Fix.** Run `validate` in `Sanitizer::values()`. On failure, keep the stored value and return per-field errors in
the REST response.

---

## 4. Behaviour differences that need a decision or a proof

### 4.1 Never-toggled switchers: `''` becomes `'0'` on the first save
The codec normalises `''` to `'0'`. On the golden set that happens **2,182 times**, and the plan allows it (§3.1).
The plan's reasoning is "readers use `=== '1'` or `!empty()`", but not every reader does:
- `SingleProduct.php:67` checks `$settings('3d_woo_switcher') !== '0'`.
- `ProductMeta.php:33` / `ProductMetaPro.php:42` return early when it `=== '0'`.

A site whose `3d_woo_switcher` is `''` has the Woo viewer **on** today for those readers. After one bfields save it
becomes `'0'`: the Woo viewer turns **off** site-wide and the product meta box disappears. The golden set doesn't
happen to contain that case, but a free-plugin site or a site with an interrupted seed can.

The same key is also read as `!empty()` (`SingleProduct.php:82-83`, `SingleProductPro.php:40-41`), which treats `''`
as **off**. So today a `''` value is already half on and half off, and normalising it will change behaviour whichever
value you pick. That is one more reason to leave untouched values alone.

**Do this:** go through every switcher key and list its readers. For keys where `''` and `'0'` behave differently,
either keep `''` when the user did not touch the field (identity hydrate, normalise only on change), or hydrate
`''` to the value the reader actually shows. The simplest safe rule: **don't normalise an untouched value**. The
store already knows which fields are dirty.

### 4.2 Fresh-install seeding: `true` vs `'1'`
Real Codestar seeds `'default' => true` as PHP `true`. bfields seeds `'1'`. Readers that check `=== '1'` behave
differently on a fresh site, depending on which UI seeded it. This is arguably a fix, but plan §7.5 says "seed
exactly as Codestar". **Raju decides:** match Codestar byte for byte (store `true`), or accept `'1'` and list it as
a deliberate change in the changelog and in the plan. Either way, the seeding test (§3.1) has to be able to see the
difference.

### 4.3 `upload` / `media` / `link` / `color` no longer use kses
Decision 11.3 says: keep `wp_kses_post` for `csf`-codec keys, so a Classic save and a Modern save produce the same
bytes during coexistence. `Sanitizer.php:84-111` instead uses `esc_url_raw` for `upload`, the media `url` /
`thumbnail`, and `link`, `absint` for the media `id`, and lower-cases and trims colours.

Today's golden data survives this, since the round-trip passes. New input does not match Classic: a URL with a space
or a non-listed scheme, or a relative path like `models/x.glb`, which `esc_url_raw` turns into `http://models/x.glb`.

**Pick one:** revert to kses for coexistence, as decided, or change decision 11.3 on purpose and add cross-mode
tests for URLs with spaces, relative paths and custom schemes.

### 4.4 Dependency pipe-list fallbacks differ from Codestar
Codestar reads `values[index] || ''` and `conditions[index] || conditions[0]`
(`vendor/codestar-framework/assets/js/main.js:412-413`). bfields falls back to the **last** entry for both
(`Dependency.php:99-108`, and the same in `ui/core/dependency.ts`). The ~5,000-case parity test only checks that
TypeScript and PHP agree with each other, so a shared misreading of Codestar passes.

**Fix:** match Codestar. Then add a jest test that loads Codestar's real `evalCondition` from `plugins.js` and runs
it on the same fixture, so the engines are tested against Codestar itself.

Related: bfields applies the 4th-element "global" flag **per rule**, where Codestar applies it to the whole rule
set. That is an intentional fix (it removes the `hotspot_style` body-class hack), but put it in plan §4.2 as a
documented difference.

---

## 5. Parity gaps in the controls (not data loss, but they block their screens)

| Control | Problem | Where | Blocks |
| --- | --- | --- | --- |
| `select` with `'options' => 'posts'` (+ `query_args`, `chosen`, `ajax`) | `toOptions('posts')` produces the options `p`, `o`, `s`, `t`, `s`. There is no search endpoint, and `query_args` is not passed to the UI. Touching the field saves `'0'`… | `Choice.tsx:27-37`, `HotspotFields.php:279-288` | Product hotspots (2.0.0 feature), Phase 3 |
| `color` | Native `<input type=color>`: hex only, no alpha, no `transparent`, and no way to clear back to default. Picking a colour on `rgba(0, 0, 0, 0.4)` loses the alpha. | `Color.tsx:47` | Settings (loader bg), Style tab |
| `media` / `upload` | Nothing calls `wp_enqueue_media()`, so on the Settings page the Upload button does nothing (`bp3d_loader_image`). | `Assets.php:108-148`, `Media.tsx:61` | Settings page |
| Adornments inside repeater rows | Row children render with `unique = "<field>-<index>"`, so `addAdornment('_bp3dimages_', 'model_link', …)` can never match a row field (the cloud picker on `bp_3d_models[].model_link`). | `Repeater.tsx:203` | Phase 3 |
| Repeater | No `max` / `min`, no drag reordering, row-local dependency resolution only one level deep (inner row, then root, skipping the outer row) | `Repeater.tsx`, `dependency.ts:162-175` | Phase 3 nested hotspots |
| `code_editor` | A plain textarea | `claude/Code.tsx` | Acceptable for Stage A, but should be decided |
| `args['defaults']`, `database` (`transient`/`network`), `data_type: unserialize` | Accepted and silently ignored. `unserialize` would be written serialized. | `Schema.php:109-158` | HVP later. Refuse loudly now. |

---

## 5a. Coverage against what 3D Viewer actually uses

This comes from a full inventory of premium's Codestar usage: every `createOptions` / `createMetabox`, every field
type and field key, every dependency, every hook and every reader.

**Types.** 3D Viewer uses 22 types, and bfields handles all 22:
- switcher 80, text 43, button_set 31, upload 29, number 24, select 16, color 14, spinner 14, content 11, group 10,
  dimensions 9, radio 8, media 6, slider 6, code_editor 4, fieldset 3, repeater 2, spacing 2, callback 2,
  checkbox 1, submessage 1, textarea 1.
- None of the types that §3.2 would break (`tabbed`, `accordion`, `wp_editor`…) are used, so §3.2 is a
  framework/HVP risk rather than a 3D Viewer one.
- `link`, `image_select`, `heading` and `password` are **not used** by 3D Viewer. The D.2 work was not needed for the
  migration.

**What matches Codestar already:**
- **Group rows.** Codestar saves them exactly as posted, without looking at the sub-field declarations, so old rows
  lack newer keys, and the variant `attribute_*` keys survive even though the save POST declares none
  (`ProductMetaPro.php:39` builds the fields from `$_GET['post']`, which is empty on save). bfields'
  `dehydrate_row()` iterates the row in the same way, so it matches.
- **Hidden fields** are saved in both.
- **Array defaults** on single-value button_sets (`array('msimple')`) are handled.
- **Empty `allowed_mime_types` ⇒ `[]`** behaves the same as `''` in `ExtendMimeType`.

**Still missing or different for 3D Viewer:**

| Item | Why it matters | Needed by |
| --- | --- | --- |
| Tab slugs come from **translated** section titles | `AnalyticsPro.php:476,616` redirect to `#tab=analytics`, which only resolves in English. With the new es_ES catalogue, the Spanish slug differs. bfields inherits the problem. | Stage A: give every section an explicit `id` (plan §4.2 allows it) and route the redirects to the id |
| `select` with `options => 'posts'`, `query_args`, `chosen`, `ajax` (hotspot `productId`) | See §5. It also needs a search endpoint that applies the same `query_args` whitelist `HotspotFields::searchCapability()` enforces on `wp_ajax_csf-chosen`. | Phase 3 / 4 |
| Product meta is registered only on product edit requests (`isProductEditRequest()`, `ProductMetaPro.php:31,62-80`) | Explains why the round-trip skips products. The test has to fake `$pagenow = 'post.php'` plus a product id. | Step 1 |
| In-row rules with a root-only controller and no `'all'` (`ViewerPro.php:384` `currentViewer any …`), and an in-row rule with `'all'` (`:453`) | bfields' row-then-root fallback may **show** fields Codestar leaves hidden, or the reverse. This affects visibility only, since hidden fields save anyway. Needs one side-by-side check. | Phase 3 |
| Legacy undeclared Woo keys `force_to_change_position`, `is_custom_selector` (`SingleProduct.php:47-64`) | A Classic save drops them; a Modern save keeps them. So during coexistence the product page can look different depending on which UI saved last. | Phase 4: decide whether to keep them |
| `SpecGlossScanner` searches the serialized meta with raw SQL `LIKE` (`SpecGlossScanner.php:41-44,600-625`) | Works only while URLs are stored unescaped inside PHP-serialized strings. It is one more reason the codec must never write JSON into these keys. | Invariant, add it to plan §7 |
| FontAwesome 5 section icons (`fa fa-cube`, `fas fa-cog`) | Need a mapping to the bfields icon vocabulary (plan §4.2 promises it). Check it covers all the icons used. | Stage A |
| Code editor settings (`theme monokai/mbo`, `mode css`, `lineNumbers`) | The stand-in textarea ignores them. | Stage A decision |

**Found along the way (premium bugs, not bfields):**
- `src/admin/advancedViewerInline.ts`, `specGlossInline.ts` and `cloudPicker.ts:125` listen for `csf-added`, an event
  Codestar 2.3.1 never fires (its event is `csf-reload-script`, `main.js:3482`). As a result the cloud picker and
  the inline notices never attach to repeater rows added after page load.
- `CSF_Setup::init()` runs outside Codestar's own `class_exists` guard (`setup.class.php:795`). When free and premium
  are both loaded, the last copy resets Codestar's paths. This is harmless today, and it is gone at Stage C.

---

## 6. Robustness, performance, housekeeping

- **The schema is built on every request.** `Registry::seed_defaults()` (init 99, including the frontend) and
  `register_menus()` (every admin page) both call `schema()`. That runs every `callback` field through `ob_start`,
  every `content` closure, and `wp_get_attachment_*`. Check `get_option()` before building the schema for seeding,
  and use the raw args for the menu. This matters: the perf baseline already flags unguarded admin queries (+6
  queries on admin).
- **The REST route accepts meta-box keys.** `can_save()` only checks `has($unique)`, so
  `POST /bfields/v1/options/_bp3dimages_` writes a *wp_option* named `_bp3dimages_`. Refuse anything whose kind is not
  `options`.
- **The Reset buttons discard unsaved edits in other sections** without saying so (`store.commit` overwrites). Warn
  in the confirmation text.
- **Search only covers the active tab.** Codestar searches all sections.
- **RTL:** `build/index-rtl.css` is built but never registered. Add `wp_style_add_data('bfields-ui', 'rtl', 'replace')`.
- **PHP strings** in the `bfields` domain (`OptionsPage.php`, `Codestar.php`) have no `load_textdomain`.
- **Small bugs:**
  - `runtime.ts:46-53`: an unsubscribe returned before the store mounts cannot unsubscribe once it has mounted.
  - `registry.ts:4`: the comment says "core first" but the code resolves the authoring type first.
  - `Values::hydrate()` and `Option::hydrate()` have comments claiming they "carry undeclared keys through". They don't
    (the merge does). Fix the comments, because someone will rely on them.
- **Naming:** `ui/fields/claude/` and `claude.css` ship in the product bundle. Rename them to `interim/` or
  `standin/` before the names reach hosts. The class names are already `bfields-*`, so this only changes files.
- **Dev environment:**
  - Two demo hosts are active on dev.local: `bfields` (`bfields-3dv-demo.php`) and an older `bfields-demo` from
    22 Sep. Deactivate the old one.
  - Once premium ships `lib/bfields` at 1.0.0, the dev checkout and the shipped copy have the **same version**. The
    last one to register wins, so you can't tell which copy you are testing. Bump the dev checkout to
    `1.0.0-dev`/`1.0.1-dev`, or add a `BFIELDS_FORCE_PATH` override for development.
- **Plan drift to reconcile:**
  - The plan says the working checkout is `3d-viewer-premium/bfields/` (gitignored there). It actually lives at
    `plugins/bfields/`.
  - Golden fixtures were meant for the premium repo, but they are in bfields. They contain real site URLs, so keep
    the bfields repo private.

---

## 7. What to do next, in order

**Step 1 — make the proof real (2–3 days).** Everything in §3.1: fail on zero, admin context, real-Codestar seeding,
full save path, edge fixtures, PHP suites in CI.

**Step 2 — close the data holes (2–3 days).**
- Unknown types become pass-through (§3.2), and `select`/`radio` arrays too.
- Fix the hook bridge's order and arguments (§3.3).
- Call `sanitize` with one argument (§3.7) and implement `validate` (§3.8).
- Decide §4.1 (untouched switchers) and §4.3 (kses vs URL sanitizers), and implement the decision.
- Fix the dependency fallbacks and add the test against Codestar's JS (§4.4).

**Step 3 — make Stage A un-bricking (1–2 days).**
- WP 6.5 JSX runtime (§3.4).
- A server-rendered fallback that the bundle removes on mount (§3.6).
- `wp_enqueue_media`, RTL registration, the REST kind check, lazy schema.

**Step 4 — Settings-page parity (3–4 days).** A colour picker with alpha, transparent and clear. Then walk every
Settings field in premium (licensed and unlicensed) and free, and confirm each renders and round-trips. Then the
Phase 2 host work: `lib/bfields/`, `Registrar`, `AdminUi` with the switch, constant and filter, uninstall entries,
e2e in both modes.

**Step 5 — framework meta box before Phase 3.** `Storage/PostMeta.php` and `Metabox.php` in the framework (§3.5).
Decide 11.5. String options with AJAX search (`posts`), adornments inside rows, and repeater `max`/nesting.

**Decisions needed from Raju:** §4.1 (keep `''`?), §4.2 (seed `true` or `'1'`), §4.3 (kses or URL sanitizers during
coexistence), §3.5 (keep 11.5 or change it), and whether to keep the D.2 types in v1 or park them.

After steps 1–3 the plan's timeline still holds: Stage A as the first post-BFCM release, Stage C no earlier than
Feb–Mar 2027 and only through the §4.10 gate. Do the removal of Codestar exactly as §4.10 describes, with one
addition: **gate item 2 has to be the CI job from step 1, not a manual run.**

---

## 8. How this was checked

- Read the plan in full, and every file under `php/`, plus `ui/core`, `ui/layout`, the field components and the demo's
  PHP. Compared them against Codestar 2.3.1's `admin-options.class.php`, `metabox-options.class.php`, `main.js` and
  `plugins.js`.
- `WP_PATH=… ./bin/test.sh`: every suite green, but both PHP data suites checked **0** items.
- Round-trip re-run with `define('WP_ADMIN', true)` and `--user=1`: 152 records, 12,391 values, PASS, 2,182 sanctioned
  `''`→`'0'` rewrites, 10 product fixtures skipped.
- Seeding re-run the same way: 156 fields, PASS, but the comparison is codec against codec (§3.1).
- Grepped 3D Viewer Premium for readers that tell `'0'` apart from `''` (§4.1), for `csf_*` hook consumers (§3.3),
  and for string `options` (§5).
- `wp plugin list`: WP 7.1.2 on dev.local; both demo hosts active.
