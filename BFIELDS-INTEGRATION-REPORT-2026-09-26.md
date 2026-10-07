# bfields → 3D Viewer Premium: integration readiness report

**Date:** 26 Sep 2026 · **Scope:** what must happen **in bfields** (and the thin host wiring in premium) so the
framework can be integrated into 3D Viewer Premium with **no conflict and no data loss**.
**Sources:** full read of `CODESTAR-MIGRATION-PLAN.md` rev 3 and `BFIELDS-REVIEW-2026-09-23.md`; fresh code
inventory of the bfields checkout (working tree, 26 Sep) and of premium 2.0.0 at `e145e9b` (dev branch), including
the free plugin 1.9.4 as the shared-key sibling.
**Second pass (26 Sep, evening):** the "verify, don't assume" items were checked directly against the code; their
verified statuses are folded in below (REST kind check and seeding guard confirmed fixed; the responsive field and
the color picker are both safer than the first pass reported).

---

## 1. Verdict

**The framework is architecturally ready; the integration is not.** Since the 23 Sep review, nearly every
must-fix item has been fixed in the bfields working tree — but **none of it is committed** (the repo has exactly
one commit, no remote, so CI has never run once), the shipped artifact `dist/bfields.zip` is **stale (22 Sep,
predates every fix)**, and the host side (`lib/bfields/`, `Registrar`, `AdminUi`) does not exist in premium at all.

On top of that, **premium moved after the plan was written**. 2.0.0 added a custom Codestar field type
(`bp3d_responsive_dimensions`, commit `e145e9b`) that bfields' compat layer does not map — today it would render
read-only in Modern mode — and the golden fixtures were captured 19 Sep, before responsive sizes and the control
placement fields existed. The proof suite is therefore proving parity against **last week's data shapes**.

> **Check (Claude, 26 Sep, third pass):** two corrections.
> - **Capture date.** The golden set was captured **22 Sep**, not 19 Sep (file mtimes, and the README's
>   "Captured 2026-09-22"). That is *after* `3598c55` (21 Sep), so the control-placement keys are already in it:
>   `settings.json` has all of `bp3d_control_*`, and 139 viewer files carry them. Only the per-device size shapes
>   were missing. The set has now been recaptured, see §9.
> - **D1 scope.** `bp3d_responsive_dimensions` is used only in the viewer metabox (`_bp3dimages_`), never on the
>   Settings page, so D1 does not touch Stage A.
> - **"Renders read-only."** That was true, but mapping the type was not enough on its own: the codec ignored the
>   mapping. See the D1 note under §3. Fixed in bfields.

Nothing here changes the plan's staging (Stage A = Settings page, first post-BFCM release). The work below is
ordered so that data safety is re-established first, the 2.0.0 drift is absorbed second, and host wiring comes last.

---

## 2. Where things stand

### 2.1 bfields (working tree, 26 Sep)

- **Git:** branch `main`, one commit `68d5936` (23 Sep). 73 files modified, ~25k insertions uncommitted.
  **Untracked and load-bearing:** `php/includes/Metabox.php`, `php/includes/Storage/PostMeta.php`,
  `php/includes/Mount.php`, `php/compat/Instance.php`, `ui/layout/MetaboxShell.tsx`, `ui/core/responsive.ts`,
  `ui/fields/claude/DeviceSwitcher.tsx`, all the new PHP test suites and edge fixtures. **No remote → CI has never
  executed.** `dist/bfields.zip` dated 22 Sep — anyone who unzipped it today would ship the pre-review bugs.
  > **Check:** correct when written. During the 26 Sep session everything was **staged** (`git add -A`; 144
  > entries, nothing untracked) but **still not committed**, and there is still no remote. `dist/bfields.zip` has
  > been rebuilt from the current tree (26 Sep 20:54).
- **Review items:** of the eight §3 must-fixes, **seven are fixed in code** (vacuous suites, unknown-type data loss,
  hook bridge order/arguments via a real `Instance` compat object, sanitize arity, validate, `wp_enqueue_media`,
  lockout fallback markup) and the three §4 decisions (identity codec for `''`/bools, raw seeding, kses-only) are
  implemented per decisions 12–14. **Still open:** color picker (no alpha, no clear — blocks Settings/Style parity),
  code editor is a plain textarea, repeater has no drag reorder, nested dependency scope is one level deep,
  string `options => 'posts'` selects are read-only with **no search endpoint**.
  > **Check:** all five were accurate. Now **implemented**: the colour picker (alpha, `transparent`, clear/default)
  > and the posts search endpoint (§9). Still open: the code editor is still a textarea (decision 3), the
  > repeater reorders with buttons, not drag, and dependency scope is still inner row → root.
- **WP 6.5:** fixed via a `react-jsx-runtime` shim (`Assets.php:122-141`) rather than a build change — the bundle
  still lists the handle and relies on the shim. Never tried on a real 6.5 install.
- **Metabox:** the framework now owns `Metabox.php` + `Storage/PostMeta.php` (read-modify-write, `wp_slash`,
  hooks with `$post_id`, absent payload = no-op, refuses `unserialize`) — but **nothing in the repo exercises
  `Metabox::save()`**: the demo bypasses it with `'render' => false` and its own editor, and the test suites call
  `PostMeta::save` directly. The framework's default postbox path is untested end to end.
  > **Check:** correct. It is now exercised: the demo has a Postbox screen (`bfields-demo-box`) on the plain
  > postbox path, and `tests/e2e/metabox-save.mjs` saves it end to end (28 checks, see §9).

### 2.2 Premium (what bfields must serve)

- **6 CSF containers**, all `serialize`, three keys shared with the free plugin: `_bp3d_settings_` (options),
  `_bp3dimages_` (CPT metabox), `_bp3d_product_` (Woo metabox). 22 sections, ~23 field types, groups nested two
  deep (`bp_3d_models > hotspots`, plus `real_size` fieldsets in rows), ~130 dependency rules of which ~90 carry
  the 4th `'all'` flag.
  > **Check: partly.** There are **6 `CSF::create*` call sites but only 3 live containers** per request.
  > `Init::require_file()` loads either the Pro class or premium's own free-tier class, never both:
  > Settings/SettingsPro, Viewer/ViewerPro and ProductMeta/ProductMetaPro. No container sets `data_type`, so all
  > are the default `serialize`. The other counts hold: 22 `createSection` calls (12 built in Pro mode, 10 in
  > free), 23 field types, 131 `'dependency'` lines of which 86 carry `'all'`, `bp_3d_models > hotspots`, and
  > `real_size` at `ViewerPro.php:431`, `:815` and `ProductMetaPro.php:548`.
- **The vendored CSF 2.3.1 is unpatched** (verified token-identical against the free plugin's copy) — good: Classic
  mode needs no fork. But `vendor/` is gitignored; only `npm run zip` ships it.
  > **Check: partly.** Both copies are 2.3.1 with the same logic, but they are not file-identical. Premium's copy
  > lacks `assets/scss`, `samples` and the `languages/*.po` files, and `classes/abstract.class.php` differs in
  > formatting only. "No fork needed" stands. `/vendor/` is gitignored (`.gitignore:12`).
  > - **Hooks.** The three `_save` consumers are registered only by premium's free-tier classes
  >   (`Viewer.php:27`, `Settings.php:27`, `ProductMeta.php:42`).
  > - **Capability widening.** `csf_chosen_ajax_capability` is at `HotspotFields.php:19`. `searchCapability()`
  >   widens only when the type is `posts`, `post_type` is `product` and WooCommerce is active. It whitelists
  >   the query *keys* but never checks the `post_status` *value*.
- **Hooks premium actually consumes:** `csf__bp3dimages__save`, `csf__bp3d_settings__save` (reads
  `$instance->pre_fields`), `csf__bp3d_product__save` — all free-mode `preserveProData` guards — plus
  `csf_chosen_ajax_capability` for the hotspot `productId` search. No `_saved`/`_save_after` consumers.
- **CSF DOM coupling to rewrite/gate:** preview (`src/admin/preview/index.tsx` — reads inputs by name incl.
  `[tablet]`/`[mobile]`, walks `.csf-cloneable-item`, listens to `csf.change`), `cloudPicker.ts`,
  `specGlossInline.ts` / `advancedViewerInline.ts` (which listen for `csf-added`, an event CSF 2.3.1 never fires —
  they are already broken for rows added after page load), `src/admin/index.ts`, `csfModelFields.ts`, two admin CSS
  files, an inline style in `ExtendMimeType.php`, and **15 e2e spec files** plus the `wp-admin.ts` helpers.
  > **Check: two errors.**
  > - **`csf-added` listeners.** `specGlossInline.ts` does **not** listen for `csf-added`; it listens to
  >   `change`/`input` only. The dead listeners are `advancedViewerInline.ts:43` and **`cloudPicker.ts:125`**.
  >   CSF 2.3.1 never fires `csf-added`: its `main.js` triggers only `csf.hashchange`, `csf.keyup`,
  >   `csf.change`, `csf-customizer-refresh`, `csf.resize` and `csf-reload-script`.
  > - **Spec count.** There are **20** spec files. 19 of them import `helpers/wp-admin.ts`, which holds 6 CSF
  >   helpers (`openCsfMetaboxTab`, `saveCsfOptions` and others). 8 specs use `csf-` selectors directly.
  >   Budget for 19 specs, not 15.
  > - **Correct:** the preview reads `[tablet]`/`[mobile]`, walks `.csf-cloneable-item` and listens to
  >   `csf.change` and `bp3d:device-change`. The inline style is at `ExtendMimeType.php:130-139`.

---

## 3. New since the plan: 2.0.0 drift bfields must absorb

These are not in plan rev 3 (22 Sep) or the 23 Sep review. They are the reason "run the existing suites" is not
enough.

| # | Change in premium | Impact on bfields |
| --- | --- | --- |
| D1 | **`bp3d_responsive_dimensions`** — custom CSF field (`inc/Field/Types/ResponsiveDimensions.php`), used 4× (`bp_3d_width`/`bp_3d_height` in the viewer metabox and settings). Stores `{width, unit, tablet:{width,unit}, mobile:{width,unit}}`, **empty = inherit**, sanitized by `Utils::sanitizeResponsiveDimensions`. Fires `bp3d:device-change`. | **Verified: bfields was built for this and the data is safe either way.** `Schema::RESPONSIVE_NESTED` is keyed by core type and its docblock names this exact field (`Schema.php:77-83`); the codec keeps non-scalar sub-values (`Csf.php:352-354`) so nested tablet/mobile arrays survive; even unmapped, the custom type falls to the identity `scalar()` branch (`Csf.php:219-222` — arrays pass through untouched) and merely renders read-only. The demo already authors the same fields as `dimensions + 'responsive' => true` (`demo/.../Viewer.php:1495-1515`). **What remains is a two-line host recipe plus proof:** add `'responsive' => true` to the 4 field arrays (CSF ignores the key) and filter `bfields_type_map` with `bp3d_responsive_dimensions => 'dimension'`; then fixtures asserting byte parity (incl. empty = inherit and `Utils::sanitizeResponsiveDimensions(stored) === stored`), and decide the `bp3d:device-change` ↔ `bfields.setDevice/onDeviceChange` bridge for the live preview. |
| D2 | **Golden fixtures are stale.** Captured 19 Sep — before responsive sizes (`e145e9b`, 26 Sep) and the control placement fields (`3598c55`, 21 Sep; the Elements/General sections now have 7 corner selects + 8 label texts + `bp3d_control_placement`). | Recapture the golden set from the dev site after 2.0.0 settles, and add fixtures for: a viewer with tablet/mobile sizes set, one with them empty (inherit), and a record last saved by the free plugin (whose plain `dimensions` field strips the nested tablet/mobile — the round-trip must tolerate both shapes). |
| D3 | **Hotspot `productId` select shipped in 2.0.0** (`HotspotFields.php:278-289`: `select` with `options => 'posts'`, `chosen`, `ajax`, capability widened via `csf_chosen_ajax_capability`). | The read-only mitigation is fine for Stage A (Settings has no such field) but **blocks Phases 3–4**. bfields needs a posts-search REST endpoint that enforces the same capability and `query_args` whitelist the host's `searchCapability()` enforces on `wp_ajax_csf-chosen`. |
| D4 | Free plugin is now **1.9.4**; it registers no `csf_*_save` filters and its `bp_3d_width`/`bp_3d_height` are plain `dimensions`. | A standalone-free save already wipes Pro keys and the tablet/mobile sizes today — pre-existing, not a bfields regression — but the cross-mode fixtures should include a free-authored record so the suites prove bfields never makes it worse. |
| D5 | *(added by the 26 Sep check)* **The dev site's live `_bp3d_settings_` has lost its Pro keys.** On 22 Sep it held the full Pro row. On 26 Sep it held **13 free-tier keys**: 55 keys are gone, including loader, control placement, analytics, `bpp_*`, mobile, rotate and `custom_css`. | bfields is ruled out: every suite writes only scratch keys (`_bfields_test_*`, scratch posts). The shape is exactly what a free-mode save writes, which fits D4 in action, but the cause is not proven. **Find out before trusting dev.local's settings.** The 22 Sep `settings.json` golden record is the last known good copy; it was deliberately not overwritten. |

> **Checks on this table (Claude, 26 Sep):**
> - **D1, where it is used: WRONG.** All 4 uses are in the viewer metabox (`_bp3dimages_`): premium's free-tier
>   `Viewer.php:462,475` and `ViewerPro.php:1104,1117`. None is in Settings. The field is
>   `CSF_Field_bp3d_responsive_dimensions extends CSF_Field_dimensions`.
> - **D1, the shape.** The height field stores `height`, not `width`. CSF always posts a unit, and an untouched
>   pane saves as `{width: '', unit: '%'}`, the unit it inherits. Premium's `sanitize` =>
>   `Utils::sanitizeResponsiveDimensions` keeps strings as saved (`sizeNumber()`). bfields runs that callback in
>   place of kses, and the codec layer now proves it returns stored values unchanged on 225 records.
> - **D1, "two-line host recipe": WRONG as written.** `bfields_type_map` only changed `core`, the renderer. The
>   codec and the sanitizer switch on the *authoring* type, so a mapped `bp3d_responsive_dimensions` fell through
>   to the identity codec. It blanked to `''` instead of `{width, unit}`, and a type mapped onto `repeater` would
>   have written the UI's row `__id`s into the database. **Fixed in bfields** (`Schema::codec_type()`,
>   `Schema::CORE_CODEC`). A roundtrip check fails without the fix and passes with it. With the fix, the
>   two-line recipe is correct.
> - **D1, the bridge.** bfields already has `bfields.setDevice` / `onDeviceChange` / `getDevice` and fires a
>   `bfields:device-change` DOM event (`ui/core/responsive.ts:34-53`, `runtime.ts:95-97`). The bridge decision is
>   the host's. One nuance: when a device pane is *edited* in Modern, it is written `{unit, width}` (inherited
>   unit first), not Classic's `{width, unit}`. Readers index by key, so this is safe, and untouched values keep
>   their bytes.
> - **D2: partly wrong** (see the §1 note). The capture was 22 Sep and the control-placement keys were already
>   captured. Recaptured now, see §9.
> - **D3: correct.** Implemented, see §9.
> - **D4: correct** (`F/inc/Field/Viewer.php:387,398`). The free-authored viewer fixture exists
>   (`edge/viewer-free-authored`).

---

## 4. What to do in bfields, in order

### Step 0 — Secure the work that already exists (½ day, do first)

1. **Commit everything** (the 73 modified + all untracked files). Right now one `git checkout .` or disk failure
   erases three days of data-safety fixes. Split into reviewable commits if desired, but get it into history today.
2. **Add the remote and push** so the CI workflow actually runs (it clones Codestar `--branch 2.3.1` — verify that
   tag exists upstream on the first run). Keep the repo **private**: the golden fixtures contain real site URLs.
3. **Rebuild `dist/bfields.zip`** from the fixed tree and treat any zip older than the last commit as poison.
4. Housekeeping while at it: `package.json` `"main"` points at `ui/core/index.ts`, which doesn't exist; the
   `ui/fields/claude/` directory and `claude.css` still ship under that name (review asked for `interim/`);
   deactivate the stale `bfields-demo` plugin on dev.local; add the `BFIELDS_FORCE_PATH`/`-dev` version override so
   the checkout and the future `lib/bfields/` copy in premium are distinguishable (arbitration is newest-wins, and
   identical versions make "which copy am I testing?" unanswerable).
   > **Check:**
   > - **`"main"`.** Correct, and fixed: `ui/core/index.ts` now exists and exports types only.
   > - **Renaming `ui/fields/claude/`. Not done, on purpose.** The folder name is Raju's own convention (23 Sep):
   >   stand-ins live there so the designed replacements can drop in. The review's `interim/` suggestion
   >   contradicts it. Rename only if Raju decides to.
   > - **Stale `bfields-demo`.** Left active, because it is site state and Raju's call. `bin/test.sh` gated the
   >   design-parity step on that stale folder, although the step tests this checkout's demo. Fixed: it now gates
   >   on this checkout being active.
   > - **"Unanswerable": wrong.** At equal versions the copy registered last wins, which is deterministic (plugin
   >   load order), and `$GLOBALS['bfields_loaded_from']` names it.
   > - **`BFIELDS_FORCE_PATH`: implemented** (`bootstrap.php`, outside the frozen block). The forced copy
   >   registers under a version no release can reach, so a path that nothing loads changes nothing.
   > - **`-dev` suffix: not done.** `version_compare()` ranks `1.0.0-dev` *below* `1.0.0`, so a `-dev` checkout
   >   would always lose to the shipped copy. `dist.sh` also requires `bootstrap.php` and `load.php` to agree.
   >   `FORCE_PATH` covers the need.

### Step 1 — Make the proof current again (1–2 days)

5. **Run the suites and record the result.** The fixed suites (fail-on-zero, admin + product-edit context, real
   `CSF_Options`/`CSF_Metabox` comparisons, full `save()` path, edge fixtures) have never demonstrably been run.
   First run on dev.local, then in CI on WP 6.5 and latest.
6. **Recapture golden fixtures against 2.0.0 HEAD** (D2) and re-run. Whitelist review: the codec still rewrites a
   few things on save — bare numeric media ids expand to the 8-key array, media/fieldset sub-values are cast to
   string, group rows are re-indexed and `__id`-stripped, checkbox `''` → `[]`. Each of these must either appear in
   the sanctioned-normalisation whitelist with a reader-safety argument, or be removed.
   > **Check:**
   > - **The whitelist** (`bfields_documented_normalisation()`, `roundtrip.php`) sanctions: checkbox `''` → `[]`,
   >   single `button_set` array → first element (22 occurrences; the list above missed it), group `[]` → `''`,
   >   and media bare id → 8-key array, applied recursively inside group and fieldset rows.
   > - **The string casts and the re-indexing are *not* whitelisted**, so they fail the suite if they ever occur.
   >   None of the 225 records triggers them. No field on this site has a non-string sub-default, so a Codestar
   >   Reset cannot produce one either.
   > - **`__id` stripping** is UI-only: stored rows never carry `__id`.
7. ~~Verify two review-§6 fixes~~ **Both verified fixed (second pass):** the REST route refuses non-options
   kinds (`OptionsPage.php:193` — `POST /bfields/v1/options/_bp3dimages_` cannot create a wp_option), and
   `Registry::seed_defaults` checks `save_defaults` and `!empty(get_option($unique))` **before** building the
   schema (`Registry.php:221-230`), so frontend requests on a seeded site never run the callback/content closures.
8. **Prove WP 6.5 for real once:** the shim is code, not evidence. One manual boot of the Settings page on a 6.5
   install (or the CI `wordpress@6.5` job with an e2e smoke) closes the 2.0.0 review's open "T5 WP 6.5" item for
   this stack.

### Step 2 — Absorb the 2.0.0 drift (2–3 days)

9. **`bp3d_responsive_dimensions` support** (D1) — verified to be host wiring, not framework work: the code's
   documented intent (`Schema.php:79-81`) is a host-registered `bfields_type_map` entry mapping the custom type
   onto `dimension`, plus `'responsive' => true` on the 4 field arrays. In bfields itself only the proof is
   missing: D2 fixtures asserting byte parity with what the CSF field posts (`[field][tablet][width]` nesting,
   strings, empty = inherit), and the `bp3d:device-change` ↔ `bfields.setDevice/onDeviceChange` bridge decision
   for the live preview.
10. **Posts-search endpoint** for `options => 'posts'` selects (D3): REST route with per-field capability +
    `query_args` whitelist mirroring `HotspotFields::searchCapability()`. Needed before Phase 3, not Stage A —
    but design it now so the schema key doesn't change later.
11. **Color picker with alpha, `transparent`, and clear-to-default.** Better than the first pass reported:
    `Color.tsx` never rewrites a stored value on load — the swatch paints `rgba(…)` as-is and the value changes
    only on an actual pick — so a stored `rgba(0, 0, 0, 0.4)` or `transparent` **survives being looked at and
    saved untouched**. The remaining gap is authoring parity, not corruption: the native `<input type=color>` can
    only *produce* opaque hex, so in Modern a user cannot set alpha, choose `transparent`, or clear back to
    default — all three of which Classic's picker can do (`bp_model_progressbar_color`, `bp_model_bg`,
    `bp3d_loader_background`). Still worth doing for Stage A, but it is a parity gap, not a data-loss risk.
12. **Decide the `code_editor` stand-in** (plain textarea vs `wp_enqueue_code_editor`) — a decision, not a blocker:
    `custom_css`/`css` round-trip fine through a textarea, they just lose highlighting.

### Step 3 — Give the framework metabox a real consumer (1–2 days, before Phase 3)

13. Point the demo's viewer screen at the framework's **plain postbox path** (decision 14) instead of
    `'render' => false`, or add a second demo screen that does — so `Metabox::save()`, the hidden
    `bfields_values[...]` textarea enablement, the nonce, autosave/revision skips and the validation transient are
    exercised by something before premium is that something. Add one e2e that saves through it and diffs the meta.
14. **Restore semantics:** the framework's per-tab non-destructive reset is right, but note for the host work that
    CSF's Classic `show_restore => true` (free `Viewer.php:46`, free `ProductMeta.php:47`, **and
    `ProductMetaPro.php:51`**) deletes the whole meta row before any `preserveProData` merge can run. That is a
    pre-existing data-loss hole, and coexistence keeps Classic alive — recommend premium flips `show_restore` to
    `false` on the Pro product box (its own `ViewerPro` already has it false) as a 2.0.x change independent of
    bfields.
    > **Check: the mechanism and the line numbers are wrong; the conclusion stands, and the fix is wider.**
    > - **When the row is deleted.** CSF deletes it *after* the `csf_{unique}_save` filter runs, not before
    >   (`vendor/codestar-framework/classes/metabox-options.class.php:373-387`: the filter runs, then
    >   `_save_before`, then `if (empty($data) || !empty($request['_reset'])) delete_post_meta(...)`). The
    >   filter's `preserveProData` output is computed and thrown away, so the whole row is still lost.
    > - **Line numbers.** The free plugin's are `F/inc/Field/Viewer.php:42` and `F/inc/Woocommerce/ProductMeta.php:38`.
    >   The cited `Viewer.php:46` / `ProductMeta.php:47` are **premium's own free-tier copies**, which also have
    >   `show_restore => true`. So premium-unlicensed users hit the same hole on the viewer box and the product
    >   box.
    > - **Recommendation.** Flip premium's `Viewer.php:46` and `ProductMeta.php:47` as well as
    >   `ProductMetaPro.php:51`.

### Step 4 — Dependency-engine verifications (½–1 day)

15. Side-by-side check of the two flagged rules: `ViewerPro.php:384` (in-row `currentViewer any …` without
    `'all'`) and `:453` (in-row with `'all'`), Classic vs Modern, and confirm the **hotspots-inside-models** nested
    group needs no parent-row controller (bfields resolves inner row → root, skipping the parent row;
    `HotspotFields`' rules are row-local by design, so this should pass — verify, don't assume).
16. Premium uses the pipe syntax heavily (~90 rules with `'all'`); the codestar-parity jest suite covers the
    semantics, but add the actual rule table extracted from all six premium field files as a fixture so a premium
    refactor can't drift out from under the test.
    > **Check:**
    > - **Item 16 was already done.** `tests/fixtures/dependency-cases.json` holds 150 rules and 5,790 cases dumped
    >   from the live registry. `dependency.test.ts` (TS vs PHP) and `codestar-parity.test.ts` (both vs
    >   Codestar's own `main.js`, extracted) run it. Re-dumped against 2.0.0 HEAD on 26 Sep: the table is
    >   **unchanged**; only the capture date moved.
    > - **The one real gap.** The table is dumped in Pro mode, so the rules in premium's free-tier files
    >   (`Viewer.php` 26, `Settings.php` 4, `ProductMeta.php` 1) are not in it. Dump once more with Pro inactive to
    >   cover them.
    > - **Item 15.** The two rules are in the table and parse as Codestar parses them. `ViewerPro.php:384`
    >   (`exposure`, `currentViewer any modelViewer`, no `'all'`) resolves `local`. `:453` (`real_size`,
    >   `currentViewer|bp_3d_dimensions_mode ==|!= modelViewer|off 'all'`, which uses `==|!=`, not `any`)
    >   resolves `global`.
    > - **Scope.** Both engines resolve a controller as own row, then root (`dependency.ts:168-178`,
    >   `Dependency.php:172-179`). A live Classic-vs-Modern check in the browser has not been done.

### Step 5 — Host wiring in premium (Phase 2 of the plan, after Steps 0–2)

Unchanged from plan §9/Appendix C; the inventory confirms the list and adds two items:

- `lib/bfields/` (from the rebuilt zip, **committed** — unlike `vendor/`), `require` of `bootstrap.php` in
  `3d-viewer-premium.php`, `inc/Helper/Registrar.php`, `inc/Base/AdminUi.php` (`bp3d_admin_ui`, staged defaults,
  notice, constant/filter overrides, the no-JS switch endpoint), `uninstall.php` entries.
- **The host must hook `bfields_fallback_url`** — the framework's lockout escape hatch renders its "switch to
  classic" button only when a host supplies the URL. Without this one filter, plan safety rule 14 is inert.
  Make it part of Stage A's definition of done.
- Settings field files → `Registrar::` with explicit section `id`s (the `#tab=analytics` redirect in
  `AnalyticsPro.php` only resolves in English otherwise — the es_ES catalogue makes this real now).
- Classic-only gating of `.csf-*` CSS, the `ExtendMimeType` style injection, and the DOM-scraping admin scripts
  behind the localized `bp3dAdmin.ui` flag; e2e helpers get the mode parameter (15 specs are CSF-coupled).
- i18n: exclude `lib/bfields` from `make-pot`; never generate an `en_US` catalogue for the `bfields` domain
  (the 2.0.0 empty-catalogue trap).

---

## 5. Conflict analysis (site-level)

| Risk | Status |
| --- | --- |
| Other CSF plugins active on the same site (`html5-video-player`, `html5-video-player-pro`, `swatchly` each bundle CSF 2.3.1) | Safe by design: bfields never defines the global `CSF` class, so their copies keep working; in Classic mode premium loads its vendored copy exactly as today. Pre-existing quirk, unchanged by bfields: `CSF_Setup::init()` runs outside the `class_exists` guard, so the last copy to load resets CSF's paths — harmless at identical 2.3.1 versions, gone at Stage C. |
| Free + premium both active (upgrade window), each shipping `lib/bfields` | Arbitration bootstrap (frozen recorder, `plugins_loaded @ -1000`, newest wins, `class_exists(..., false)` guards) handles it — this is the pattern that already survived the `BP3D\Init` collision incident. One bundle, one `window.bfields`. |
| Dev checkout vs shipped `lib/bfields` copy at the same version | Ambiguous winner — resolved by Step 0 item 4 (`-dev` version / `BFIELDS_FORCE_PATH`). |
| Two demo host plugins active on dev.local | Deactivate the stale `bfields-demo`; keep only `bfields-3dv-demo`. |
| Caching/optimization plugin breaks the bundle | Server-rendered fallback + error boundary exist; **only works once the host supplies `bfields_fallback_url`** (Step 5). Data is safe regardless: absent payload = no-op. |
| Cross-mode saves (two tabs, mode switched between) | Each mode posts to its own endpoint; both run the same codec and merge; Modern additionally preserves undeclared keys (strictly safer than Classic). |

> **Checks on this table (Claude, 26 Sep):**
> - **CSF versions: partly wrong.** `html5-video-player-pro` bundles CSF **2.3.0**, not 2.3.1; the other two are
>   2.3.1. The `CSF_Setup::init()` path reset (`classes/setup.class.php:795`, outside the guard) is therefore
>   *not* between identical versions when HVP Pro is active. It is still pre-existing and not bfields'.
> - **"`class_exists(..., false)` guards."** Invariant 5 is documented. In code, the re-entry guard is the
>   `$GLOBALS['bfields_loaded_from']` sentinel in `load.php`, which also explains why a `class_exists` guard
>   cannot work there.
> - **The dev-vs-shipped copy row.** Now `BFIELDS_FORCE_PATH`; see the Step 0 note.

---

## 6. Data-loss analysis (the hard rule)

What the inventory confirms is **already safe** in bfields: identity codec for untouched values (`''`, PHP bools,
ints survive), raw-default seeding (`true` stays `true`), kses-only sanitization matching Classic bytes, unknown
types as opaque pass-throughs, read-modify-write merge that preserves undeclared keys (this actually *fixes*
today's CSF behaviour of dropping `module_<slug>`, `force_to_change_position`, `is_custom_selector` on every
save), `csf_*` hooks in Codestar's order with a real `$instance` and `$post_id` so all three `preserveProData`
guards keep working, `wp_slash` on post meta, empty payload = no-op, `pro` fields excluded from save, hidden
fields saved (matching CSF), JSON metabox payload preserving PHP types, and no JSON ever written into the three
keys (the SpecGloss SQL-`LIKE` invariant holds).

> **Check: two precisions.**
> - **"A real `$instance`."** It is a compat stand-in, `BFields\Compat\Instance`, exposing `unique`, `args`,
>   `sections`, `pre_fields` and `post_type`. That is enough for `preserveProSettings` (it reads `pre_fields`),
>   but it is not a `CSF_Options` object.
> - **"`pro` fields excluded from save"** holds at the top level only. A `pro` sub-field inside a group row is not
>   excluded, because `dehydrate_row()` does not check it. No premium group has one today.

What still stands between here and "no data loss," all covered by Steps 0–3 above:

1. **Unproven, not wrong:** none of it is committed, CI has never run, and the golden set predates 2.0.0's shapes.
2. **`bp3d_responsive_dimensions` degrades to read-only** in Modern until the host registers the two-line
   mapping (item 9) — verified no loss on save in either state (identity `scalar()` branch; nested arrays kept by
   the dimensions codec), so this is a usability gap plus a missing proof, not a corruption risk.
3. **The color control cannot author alpha/`transparent`/clear in Modern** — verified it never rewrites an
   untouched value (item 11), so this is a parity gap, not byte corruption.
4. **Classic `show_restore` meta deletion** — pre-existing CSF hole that coexistence keeps alive; close it in
   premium (item 14).
5. **The metabox save path has no consumer or e2e** — the code reads correctly, but plan §7.16 ("proof, not
   confidence") applies exactly here.

---

## 7. Decisions needed from Raju

| # | Decision | Recommendation |
| --- | --- | --- |
| 1 | Where does `bp3d_responsive_dimensions` support live: bfields core `TYPE_MAP`, or host-registered via `bfields_type_map`? | **The code already chose the filter path** — `Schema.php:79-81` documents the custom type being mapped by the host, and the responsive machinery is generic core code either way. Keep the host filter (it keeps plugin-specific type names out of the framework); the reusable behaviour (`responsive.ts`, `DeviceSwitcher`, nested/suffix modes) is already core. |
| 2 | Flip `show_restore => false` on `ProductMetaPro` (and accept free's Restore stays destructive until free ports)? | Yes, in the next premium 2.0.x — it is a one-attribute change closing a whole-meta deletion path. **Check:** premium's own free-tier `Viewer.php:46` and `ProductMeta.php:47` have the same hole, so flip them too (see the item 14 note). |
| 3 | `code_editor` stand-in for Stage A: textarea or `wp_enqueue_code_editor`? | Textarea is data-safe; `wp_enqueue_code_editor` is cheap (core asset). Either is fine — decide so it stops being "open". |
| 4 | Golden recapture timing: now (dev HEAD) or after 2.0.0 ships? | Now against dev HEAD, again at the 2.0.0 tag; the suite should pin to the shipped tag's capture. |
| 5 | Confirm decision 14 stands given the demo still uses `'render' => false` (the framework postbox has no consumer). | Keep 14; make the demo (then premium) consume the postbox path — Step 3. |

---

## 8. Timeline reality check

- **BFCM freeze ~15 Oct:** Steps 0–4 touch only the bfields repo and change nothing in shipping premium — they can
  all run in October. Item 14 (`show_restore`) is a one-line premium change worth slipping into 2.0.0 or 2.0.1.
- **Stage A (Settings page on Modern)** stays the first post-BFCM release (late Nov / early Dec), per the plan.
  Its entry gate, updated by this report: Steps 0–2 done and green in CI, `bfields_fallback_url` wired, the
  AdminUi switch working with no JS, and the release-gate agent run.
- **Stage C (remove Codestar)** unchanged: Feb–Mar 2027 at the earliest, only through the plan §4.10 gate, with
  gate item 2 being the CI job — never a manual run.

---

## 9. Verification and implementation (26 Sep, third pass, Claude)

Every claim above was checked against the code: bfields' working tree, premium `e145e9b` (`dev`), free 1.9.4 and
the vendored CSF. Corrections are inline as **Check** notes. Anything not marked was verified correct. What was
implemented in bfields:

| Item | Status | Where |
| --- | --- | --- |
| 0.1 Commit | **Not done.** Everything is staged but not committed. Committing is Raju's call. | — |
| 0.2 Remote and CI | **Not done.** There is no remote to push to. | — |
| 0.3 Rebuild the zip | **Done** (26 Sep 20:54, 232K, demo-leak tripwire passed) | `dist/bfields.zip` |
| 0.4 Housekeeping | **Done:** `package.json` `main`, `BFIELDS_FORCE_PATH`, `test.sh` gated on the right demo. **Not done, by decision:** the `claude/` rename and the `-dev` suffix (see the Step 0 note). | `ui/core/index.ts`, `php/bootstrap.php`, `bin/test.sh` |
| 5 Run the suites | **Done.** Green, except design parity (below). | — |
| 6 Recapture golden, whitelist | **Done.** +54 viewers (2 with real device sizes: `viewer-8033`, `viewer-8438`), +1 product, `product-1893` refreshed, `settings.json` kept (D5). Whitelist reviewed (Step 1 note). | `tests/php/fixtures/golden/` |
| 7 REST kind check, seeding guard | Verified correct. | — |
| 8 WP 6.5 | **Not done here.** There is no 6.5 install on this machine. `asset-deps.php` passes and `ci.yml` has a 6.5 job, but CI has never run. | — |
| 9 `bp3d_responsive_dimensions` | **Done, including a framework fix the report missed:** mapped types are now stored as their core's Codestar type. Edge fixtures `viewer-responsive-sizes` / `-inherit` were added. The suites run under the host recipe (`tests/php/lib.php`). | `Schema::codec_type()`, `Codec/Csf.php`, `Sanitizer.php` |
| 10 Posts search endpoint | **Done.** Details below. | `php/includes/Choices.php`, `ui/fields/claude/SourceSelect.tsx`, `tests/php/choices.php` |
| 11 Colour alpha / transparent / clear | **Done.** Details below. | `ui/fields/claude/ColorPanel.tsx`, `ui/fields/Color.tsx`, `tests/ts/color.test.ts` |
| 12 `code_editor` | **Open.** Decision 3. | — |
| 13 Postbox consumer and e2e | **Done.** Details below. | `demo/includes/Postbox.php`, `demo/includes/Fields/Postbox.php`, `tests/e2e/metabox-save.mjs` |
| 14 `show_restore` | Premium-side; see the item 14 note for the wider fix. | premium |
| 15 / 16 Dependency rules | Already covered, and re-dumped against 2.0.0. The gap is free-tier rules (Step 4 note). | `tests/fixtures/dependency-cases.json` |

**10, the search endpoint.** `GET /bfields/v1/choices/<unique>?field=&term=|include=` covers posts, pages,
categories, tags and menus.
- **Scope.** The query is the field's own `query_args`, read on the server; they are never sent to or from the
  browser (`sourceArgs` is stripped in `for_client`). `include` ids go through the same scope, so a private
  post's title cannot be read by id.
- **Permission.** Listing needs the screen's save capability, and `bfields_choices_allowed` can change that.
- **UI.** Supported sources get `props.searchable` and the `SourceSelect` stand-in. Other sources stay
  read-only.
- **Demo.** The demo's hotspot `productId` now uses premium's real 2.0.0 definition.

**11, the colour panel.** The designed button is unchanged at rest; a click opens a stand-in panel. The panel
holds the native picker, an opacity slider, the raw value, and Transparent, Default and Clear.
- **What it writes:** `#rrggbb`, `rgba(r, g, b, a)` with Codestar's authored spacing, `transparent` or `''`.
- **What it never does:** write on open or on load.

**13, the Postbox demo.** A new post type, `bfields-demo-box`, registers the framework's plain postbox path (no
`'render' => false`). The e2e runs **28 checks in real wp-admin**:
- mount, the mirror field, and a heartbeat autosave that writes no meta
- Codestar-shaped strings, and a revision that carries no meta
- a no-change update that writes identical bytes
- a `validate` rejection, whose notice is shown once
- colour alpha / `transparent` and a searched post

No bugs were found in `Metabox.php` or `PostMeta.php`.

**Test results after the changes** (`WP_PATH=… ./bin/test.sh`):

| Suite | Result |
| --- | --- |
| PHP syntax, `tsc` | ok |
| jest (4 suites) | 48 / 48 |
| Bundle deps on WP 6.5 | ok |
| Golden round-trip | PASS: 225 records, 17,663 values (codec) and 17,669 (storage), plus mapped-host-type checks |
| Seeding parity | PASS |
| Save parity | PASS |
| Choices route | PASS: 11 requests. A mutation test (permission check disabled) fails it, as it should. |
| Metabox e2e | PASS: 28 / 28 |
| Design parity | **FAIL: 12 mismatches, all pre-existing** (see below) |

**Design parity and the Figma diff fail, and both failures predate this session.** A build of the pre-session
sources, byte-identical to the staged `build/`, gives the same 12 design-parity mismatches and the same 13
`figma-diff.mjs` scores. Examples: `.bfields-editor` `paddingTop` 10px vs 20px, and `.bfields-title` `marginTop`
0 vs 20. The changes here add no pixel difference. These failures need their own pass against the Figma frames
before the next UI sign-off.

**Still Raju's, in order:**
1. Find out what emptied dev.local's `_bp3d_settings_` (D5).
2. Commit the staged work, add the private remote, and let CI run once.
3. Premium's `show_restore` flips.
4. Decisions 3 and 4.
5. The design-parity regression.
