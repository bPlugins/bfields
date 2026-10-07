# bfields

The bPlugins settings and meta-box framework: **a JavaScript body on a PHP
spine**, with a Codestar compatibility layer so existing field definitions and
existing data work unchanged.

It replaces Codestar (CSF) on settings pages and classic meta boxes across
bPlugins products. See `CODESTAR-MIGRATION-PLAN.md` for the full plan; the
section numbers in the source comments refer to it.

## Source code for the copy inside a plugin

bfields is not installed on its own. Plugins vendor it at `lib/bfields/` —
**3D Viewer** (`3d-viewer` on WordPress.org) and 3D Viewer Premium, from 2.0.0 —
and this repository is the human-readable source of that copy. Each vendored
release is tagged here (`v1.1.0`, …); the version is `const VERSION` in
`php/includes/load.php`, so you can check out the matching tag.

| Shipped in `lib/bfields/` | Built from |
| --- | --- |
| `php/` | itself — plain PHP, not compiled |
| `build/index.js`, `build/index.css`, `build/index-rtl.css` | `ui/index.tsx` and everything it imports from `ui/core/`, `ui/fields/`, `ui/layout/` and `ui/theme/` |
| `build/notices.js`, `build/notices.css`, `build/notices-rtl.css` | `ui/notices.ts` and `ui/theme/notices.css` |
| `build/fonts/` | `ui/theme/fonts/` (Inter, copied unchanged with its OFL licence) |
| `languages/` | `bfields.pot` from `npm run i18n`; the `.po` files are the translations' source |

To rebuild the compiled files (Node 20 or later):

```bash
git checkout v1.1.0        # the version the plugin ships
npm ci
npm run build              # wp-scripts (webpack) → build/
```

The output is byte-for-byte the `build/` committed at that tag, which is the
`build/` the plugin ships. The bundle contains no third-party npm code: React
and the `@wordpress/*` packages it imports are loaded from WordPress core, not
compiled in (`build/index.asset.php` lists the script handles).

## The one rule

**Zero data loss.** bfields keeps Codestar's storage contract byte for byte:
one serialized array per `unique` key, the same field ids, the same value shapes
(`'1'`/`'0'` switchers, 8-key media arrays, `{width,unit}` dimensions,
list-of-rows groups). There is no migration step, and there must never be one —
every reader in every host plugin depends on those exact shapes.

Everything in the architecture follows from that rule:

- **The store holds values in stored shape.** Not a "nicer" representation that
  gets converted on save. Every conversion is a chance to change bytes; if the
  store *is* the wire format, an untouched value round-trips verbatim by
  construction.
- **Read-modify-write on save.** Only the ids the current field set declares are
  overwritten. Keys it does not declare — Pro settings during a licence lapse,
  junk written by older versions — are left exactly as they are. This is the
  improvement over Codestar, which replaces the whole array and drops them.
- **An absent payload is a no-op**, never a delete. A bundle that failed to load
  can never blank a user's settings.

## Architecture

```
  host plugin field files (Codestar arrays, PHP, request time)
                    │
             Registrar (host-side, ~40 lines)
            ┌───────┴────────┐
  Classic:  │                │  Modern:
  real \CSF │                │  \BFields\Compat\Codestar → JSON schema
 (untouched)│                │                    │            │
            ▼                ▼               PHP spine     React body
   wp_options / postmeta ◄── codec ◄── sanitize ◄── REST ◄── store
```

**The JSON schema is the API.** Everything PHP knows about a screen — sections,
fields, types, defaults, dependency rules, translated labels — crosses to the
browser as one versioned JSON document, and everything the browser sends back is
one JSON document of values. Both renderers consume the same schema, so neither
can declare a field the other drops.

PHP keeps only what cannot leave it: menu and meta-box registration, capability
and nonce checks, sanitization on save, default seeding on `init`, the `csf_*`
hook bridge, version arbitration, and the request-time schema translation.

## Layout

```
php/
  bootstrap.php       frozen recorder + newest-copy-wins arbitration
  includes/
    load.php          the winning copy's entry point
    Registry.php      screen registration; builds schemas on demand
    Schema.php        normaliser: authored arrays → versioned JSON
    Codec/Csf.php     Codestar wire format ⇄ store values (FROZEN at v1)
    Storage/          Option.php, PostMeta.php, Values.php
    Sanitizer.php     Codestar's kses default, `sanitize` and `validate`
    Dependency.php    rule engine (PHP half)
    OptionsPage.php   menu, REST save route, seeding, resets
    Metabox.php       plain core meta box: mount, mirror field, save_post
    Mount.php         the mount node + its server-rendered fallback notice
    Assets.php        registers the one bundle; builds the JS payload
    hooks.php         the csf_* ⇄ bfields_* bridge
    helpers.php       bfields_get_option() / bfields_get_meta() / bfields_is_rest_request()
  compat/
    Codestar.php      \CSF:: → bfields facade
    Instance.php      the $instance csf_* hooks receive (pre_fields, …)
ui/
  core/               types, store, dependency engine (TS half), registry, REST
  fields/             one component per core type, transcribed from the design
    claude/           stand-ins for controls the design never drew — replace
                      each when its design lands (see its README.md)
  layout/             AdminShell, MetaboxShell, FieldRenderer, ErrorBoundary
  theme/              base + tokens + admin CSS, ported from 3d-viewer-new-ui;
                      Inter bundled as woff2 (no Google Fonts request)
build/                the compiled bundle, committed
demo/                 development-only demo host — never shipped (see below)
tests/                PHP round-trip and seeding suites, TS unit suites, and
                      two design checks: computed styles (design-parity.mjs)
                      and pixels against the Figma exports (figma-diff.mjs)
```

## The demo host

`demo/` rebuilds 3D Viewer Premium's Settings page and Add New viewer editor on
bfields, so the framework can be clicked through without installing a host.
`npm run build:demo`, then activate the **bfields — 3D Viewer Demo** plugin
(`bfields-3dv-demo.php`, the repo root, because WordPress only scans one level
down inside `wp-content/plugins/`).

It is never delivered: `bin/dist.sh` packages `php/`, `build/` and `languages/`
only, and fails the build if anything from `demo/` reaches the zip. Nothing in
`php/` or `ui/` imports it.

`demo/static/` is the same two screens as plain HTML you can open from disk —
no server, no install — rendering the real schema against the real compiled
stylesheet. It is the fastest way to put the UI in front of someone.

The demo **registers no fields of its own** — every control on both of its
screens is the library's. It exists to exercise them, not to supply them.

## Installing into a host

Unzip `dist/bfields.zip` into the host at **`lib/bfields/`** and commit it —
exactly what `bp-extension-manager` does. Not `vendor/`: that is gitignored in
the host plugins, so a fresh clone could not build.

```php
require_once __DIR__ . '/lib/bfields/php/bootstrap.php';

add_action('bfields_loaded', function () {
    add_action('init', function () {
        \BFields\Compat\Codestar::createOptions('_my_settings_', [ /* … */ ]);
        \BFields\Compat\Codestar::createSection('_my_settings_', [ /* … */ ]);
    }, 1);
});
```

### Tab layout

Two screen arguments, on `createOptions()` and `createMetabox()` alike:

```php
\BFields\Compat\Codestar::createOptions('_my_settings_', [
    // …
    'tabs_position' => 'left', // 'top' (default, the design's strip) or 'left' (a sidebar)
    'tabs_switcher' => true,   // default false: let each admin flip it from the screen
]);
```

`tabs_position` is the layout every admin starts with. `tabs_switcher` adds a
two-button switch to the screen's header; an admin's flip is remembered per
browser (localStorage, keyed per screen) and never saved to the server. Below
782px the sidebar falls back to the strip on top. With `resizable` on, the
sidebar's width can be dragged too (double-click or Enter resets it), stored
alongside the page and editor sizes. The sidebar is not in the
Figma frames, so keep `'top'` wherever a screen must match them.

`'page_width' => 'full'` starts the column at the full width of the content area
instead of the design's 1185px (`'design'`, the default). With `resizable`, the
page handles narrow it from there, and dragging back to the edge or resetting
makes it full width again. A column narrower than the content area is centred;
`'page_align' => 'start'` keeps it at the left edge instead (with `resizable`,
only its right edge drags). It works on options pages and on `'frame' => 'page'`
meta boxes.

### Responsive fields (per device)

Add `'responsive' => true` to any value field and it holds one value per
device, with a Desktop / Tablet / Mobile switch beside its title:

```php
[
    'id'         => 'bp_3d_width',
    'type'       => 'dimensions',
    'height'     => false,
    'responsive' => true,
    'default'    => ['width' => '100', 'unit' => '%'],
],
```

Desktop is the field's own value, stored exactly as before, so existing
readers and existing records are unaffected. Tablet and mobile go where they
cannot collide with it:

| Type | Stored as |
| --- | --- |
| `dimensions`, `spacing` | inside the value: `{width, unit, tablet: {width, unit}, mobile: {…}}` (3D Viewer Pro's `bp3d_responsive_dimensions` shape) |
| every other value type | sibling keys `{id}_tablet` and `{id}_mobile` |
| `group`, `repeater`, `fieldset` | not supported; make their sub-fields responsive instead |

A device with no value of its own (absent or empty) **inherits**: tablet from
desktop, mobile from tablet, then desktop. Readers must apply the same
fallback. For a nested set, a unit without a number counts as empty. A device
key is written only once someone sets it. The reset button beside the
switcher clears it again. Device keys are never seeded with a default, and they
are sanitized and validated like the field they belong to.

The device is one choice for the whole page, so switching Width to Tablet
switches Height too. A live preview can follow it with
`bfields.onDeviceChange(device => …)` or `bfields.getDevice()`, or listen for
the `bfields:device-change` DOM event.

Codestar ignores the key. A Classic save of the same screen therefore drops the
device values, unless the host gives Codestar a field type that posts them.

### Meta boxes, fallback, custom types

- **Meta boxes** render as a plain core meta box inside `#poststuff` and hide
  nothing else on the screen. A host that draws its own full-screen editor
  (the demo does) registers with `'render' => false` on `createMetabox()`,
  prints and saves the screen itself, and uses `BFields\Storage\PostMeta`
  for the write (read-modify-write, `wp_slash`, the save hooks with the post id).
- **`'frame' => 'page'`** on `createMetabox()` draws the design's whole Add New
  page instead of a box (`ui/layout/EditorShell.tsx`): title, optional shortcode
  bar (`'page' => ['shortcode' => "[x id='%d']", 'hint' => …]`), tabs, a side
  column with Publish / Save Draft, and one-line admin notices. WordPress's
  title, editor and side column are hidden only while the bundle runs; other
  plugins' main boxes stay below. It saves through the same mirror field and
  `Metabox::save()` as the plain box. The host fills the side slot
  `#bfields-side-<unique>` (e.g. a live preview); a section holding a `callback`
  field renders inside a stage card. Classic editor only.
  The bundle is enqueued only for boxes the editor will draw: one taken off
  with `remove_meta_box()`, or by `filter_block_editor_meta_boxes` in the block
  editor, loads nothing.
- **`'page' => ['update_in_place' => true]`** (opt-in, page frame only) makes
  Update on a published post save without a reload. The same `#post` form is
  sent to the same `post.php` with `fetch`, plus a `bfields_in_place` marker,
  so core's nonce, `edit_post()`, every `save_post` hook and `Metabox::save()`
  run as today. `Metabox::redirect_location()` (on `redirect_post_location`,
  `PHP_INT_MAX`) then answers with JSON between `BFIELDS-UIP-BEGIN` and
  `BFIELDS-UIP-END` instead of the 302. Anything unusual navigates or uses the
  native submit, and a save is never retried on its own
  (`ui/layout/updateInPlace.ts`). `update_in_place_boxes` lists extra POST
  names that may travel in place. Filters: `bfields_update_in_place` (host
  switch) and `bfields_update_in_place_values`. Heartbeat renews the box nonce
  on opted-in screens. Not seen: a plugin that rewrites an existing hidden
  input from a native `submit` or `click` listener (jQuery ones are).
- **Register your screens in bfields' REST requests too.** The save route
  (`bfields/v1/options/<unique>`) and the option search
  (`bfields/v1/choices/<unique>`) find the field on the *registered* screen.
  A host that registers only in wp-admin (`is_admin()`, a post edit request)
  has no screen there, and they answer 404. Use
  `if (is_admin() || bfields_is_rest_request('_my_meta_')) { … }`: it reads the
  URL, so it works on `init`, before WordPress parses the route. The routes
  still check the screen's capability.
- **The escape hatch.** Every mount node carries a server-rendered notice the
  bundle removes on mount, so a screen whose bundle 404s is never blank. It
  says "Loading…" until the bundle has had its chance (it gave up, or
  `bfields_fallback_delay` seconds, default 5, after `DOMContentLoaded`), so a
  slow page does not look broken. Point its button at your Classic switch with
  `add_filter('bfields_fallback_url', fn ($url, $unique) => …, 10, 2)`.
  **Without `bfields_fallback_url` the notice has no button**: the admin sees
  the message and has no way out of the screen.
- **Types bfields does not render** (`tabbed`, `sortable`, a custom class) are
  core `unknown`: their stored value is carried verbatim and shown read-only,
  with a `_doing_it_wrong()` in `WP_DEBUG`. If you ship a component for one
  (`bfields.registerField(type, …)`), map it with the `bfields_type_map` filter.
  A type mapped onto a core renderer is also *stored* as that core's Codestar
  type (`dimension` → `dimensions`, `spacing`, `fieldset`, `repeater` →
  `group`, `link`), so 3D Viewer Pro's `bp3d_responsive_dimensions` mapped onto
  `dimension`, plus `'responsive' => true` on its fields, is edited and saved
  exactly as a responsive `dimensions` is.
- **Option sources** (`'options' => 'posts'`, `'pages'`, `'categories'`,
  `'tags'`, `'menus'`) are chosen by search over
  `GET /bfields/v1/choices/<unique>?field=<id>&term=…`. The query is the
  field's own `query_args`, read on the server. The browser names only the
  field, and nothing it sends can widen the query. Listing requires the
  capability that saving the screen requires, and
  `bfields_choices_allowed` ($allowed, $field, $unique) can change that. Other
  sources (users, roles, a callback) stay read-only. A post match also carries
  its featured image as `thumbnail` (a URL or `''`) and, for a WooCommerce
  product, its `price` as plain text; the list draws both.
- **Selects and units match Codestar's form.** For a key the row does not have
  yet, a single `select` holds what a browser would post: its `placeholder`
  option ('') if it has one, else its first option, when the default is not
  one of the options. Dependencies see that value, and the first save writes
  it, as a Classic save would. Seeding and resets still write the raw
  `default`. A stored value the list no longer offers is shown as its own
  option ("12 (not available)") and kept until another is picked. A
  `dimensions` or `spacing` field with no `units` offers Codestar's
  `px, %, em`, so Modern never stores a unit that Classic's select would
  silently turn into `px`.
- **Refused storage.** Codestar's `database` (transient, theme_mod, network) and
  a meta box's `data_type => 'unserialize'` are not implemented; registering
  one triggers `_doing_it_wrong()` and saves are refused rather than written to
  the wrong place.

### Reference host files

`docs/host/Registrar.php` and `docs/host/AdminUi.php` are the host side, taken
from 3D Viewer Premium and parameterised (`Prefix`, `PREFIX_`, `{prefix}`).
Copy them rather than premium's own. They cover:
- the mode option, kept outside the settings row;
- the `PREFIX_ADMIN_UI` constant, the `{prefix}_admin_ui_default` filter (used
  when nobody has chosen) and the locking `{prefix}_admin_ui` filter;
- the per-surface filter `{prefix}_admin_ui_surface`;
- the nonce switch endpoint that honours `redirect_to`, and the first-run
  notice;
- `bfields_fallback_url`, `bfields_is_rest_request()` for REST registration,
  and the `bfields_type_map` recipe;
- mapping locked upsell rows to `pro`.

Every screen goes through `Registrar`, whole, to one framework per request.

### Host JavaScript API

`window.bfields` exists once the `bfields-ui` bundle has run. Enqueue your
script with `bfields-ui` as a dependency. Values are in **stored** shape,
exactly what your PHP readers already parse. Group rows carry no client id:
row identity (`rowId`) lives beside the rows and is never saved.

| Call | What it does |
| --- | --- |
| `addAdornment(unique, fieldId, slot, Component)` | Draws `Component` in a slot of a field: `'before'` / `'after'` beside the control (inside its flex line), or `'below'`, a full-width block under the control (rows, cards and repeater rows alike). This works in group rows too, keyed by the sub-field id. May be called before or after the screen mounts: a late one re-renders the rows it targets. Props: `unique, field, value, values, row, id, locked, inherited, onChange, path, rowId, latest, slot`. |
| `registerField(type, Component)` | Registers or overrides a control. Also re-renders when called after mount. |
| `subscribe(unique, listener)` | Calls `listener(values)` now and on every change. It returns the unsubscribe function, and it works before the screen mounts. |
| `getValues(unique)` / `getValue(unique, idOrPath)` | Reads the current values. `idOrPath` is a root id or an array path such as `['bp3d_models', 0, 'model_src']`. `undefined` until the screen mounts, or when a step is missing. |
| `setValue(unique, idOrPath, value)` | Writes as if the user had edited it: dependencies, the unsaved-changes warning and the save all see it. An array path patches each container on the way (key order kept); a path through a missing row or key writes nothing. |
| `onReady(fn)` | Calls `fn({unique})` once bfields is about to mount, or at once if it already has. |
| `getDevice()` / `onDeviceChange(fn)` | The page's responsive device (`'desktop'`, `'tablet'` or `'mobile'`). The same change fires the `bfields:device-change` DOM event. |

**Events.** `bfields:ready` fires on `document` once, just before the first
screen mounts, with `detail.unique` listing the screens about to mount.
`bfields:device-change` fires with `detail.device`.

**Paths and rows.** An adornment (and a field component) gets `path`, from the
screen's root to its field, taken at render (`['bp3d_models', 0, 'model_src']`,
nested repeaters add more steps), and `rowId`, the client id of the row it sits
in. In a path, a list step may be the index or a `rowId`; the row id still
finds the row after a reorder, so prefer it for writes made after an await:
`setValue(unique, ['bp3d_models', rowId, 'poster'], url)`.

**Late writes.** A field's `onChange` (and an adornment's) patches the value
the store holds **when it is called**, not the one it was rendered with. In a
repeater row it finds its row by `rowId`, so a picker that calls it after a
modal closes keeps every edit made meanwhile, follows the row through a
reorder, and writes nothing if the row was removed. `latest()` reads the
field's value at call time.

Registration order no longer matters: register at load, on `bfields:ready`,
or later.

**A Cloud Storage button beside a model URL field (adornment).** In a group
row, `onChange` writes the row's own sub-field, safely after the modal closes:

```js
const { createElement: el } = wp.element;
const { __ } = wp.i18n;

function CloudButton({ onChange, locked }) {
    return el('button', {
        type: 'button',
        className: 'button',
        disabled: locked,
        onClick: () => openCloudPicker({
            title: __('Choose a 3D model', 'my-plugin'),
            onSelect: (file) => onChange(file.url), // the canonical URL; sign it at render time
        }),
    }, __('Cloud Storage', 'my-plugin'));
}

window.bfields.addAdornment('_bp3dimages_', 'bp_3d_src_link', 'after', CloudButton);
window.bfields.addAdornment('_bp3d_product_', 'model_src', 'after', CloudButton);
```

**Writing another field (`setValue`).** A pick on the `media` field
`bp_3d_src` must not store a URL in an attachment array. Flip the source to
"link" and fill the link field instead. Both are existing keys, so nothing
new is stored:

```js
function CloudToLink({ unique }) {
    const pick = () => openCloudPicker({
        onSelect: (file) => {
            window.bfields.setValue(unique, 'bp_3d_src_type', 'link');
            window.bfields.setValue(unique, 'bp_3d_src_link', file.url);
        },
    });
    return el('button', { type: 'button', className: 'button', onClick: pick }, __('Cloud Storage', 'my-plugin'));
}
window.bfields.addAdornment('_bp3dimages_', 'bp_3d_src', 'after', CloudToLink);
```

**A notice under a row field, and a sibling write (`below`, `rowId`):**

```js
function PickWithPoster({ unique, path, rowId }) {
    const pick = () => openCloudPicker({
        onSelect: (file) => {
            const row = path.slice(0, -2);  // ['bp3d_models']
            window.bfields.setValue(unique, [...row, rowId, 'model_src'], file.url);
            window.bfields.setValue(unique, [...row, rowId, 'poster_src'], file.poster);
        },
    });
    return el('button', { type: 'button', className: 'button', onClick: pick }, __('Cloud Storage', 'my-plugin'));
}
function WhiteModelNotice({ value }) {
    return isSpecGloss(value) ? el('p', { className: 'my-notice' }, __('This model renders white.', 'my-plugin')) : null;
}
window.bfields.addAdornment('_bp3d_product_', 'model_src', 'after', PickWithPoster);
window.bfields.addAdornment('_bp3d_product_', 'model_src', 'below', WhiteModelNotice);
```

A `below` block that renders nothing takes no space.

**A live preview (`subscribe`, `getValues`, `getDevice`):**

```js
const render = () => {
    const values = window.bfields.getValues('_bp3dimages_') || {};
    preview.update(values, window.bfields.getDevice()); // your renderer
};
const stop = window.bfields.subscribe('_bp3dimages_', render);
document.addEventListener('bfields:device-change', render);
// stop() and removeEventListener() when the preview unmounts.
```

### Layout hints

`layout` is display only and never stored.

| Where | Value | Result |
| --- | --- | --- |
| section | `rows` (default) | Settings-screen rows: icon and title on the left, a compact control on the right |
| section | `cards` | Editor cards: head, then a full-width control, then the description |
| field | `tile-grid` | A multi-choice `checkbox` as a grid of tiles in its own card |
| field | `danger` | A bordered warning card with a trash icon (for example "delete data on uninstall"); ignored in `cards` sections |
| field | `mode-grid` | A `radio` or `button_set` as large option cards, with per-option `option_meta` (icon, description) |
| field | `selector` | A `text` field drawn as a mono chip with a copy button (CSS selectors) |

There is no per-field `card`: cards are a section `layout` only. Icons are set
with `'icon' => '<name>'` on a section, a field or an `option_meta` entry. The
name can be a bfields name, Font Awesome or a Dashicon, and an unknown name
falls back to `box`. The full list is in `DESIGN-PRINCIPLES.md` §6.

### Field groups (`field_group`, since 1.1.0)

A `field_group` draws a titled, collapsible card around sibling fields, so a
long tab can be split into parts ("Hotspots", "Lighting & Environment"). It
is layout only and holds no value:

```php
[
    'id'          => 'myplugin_group_lighting', // required; never stored, unique on the screen
    'type'        => 'field_group',
    'title'       => __('Lighting & Environment', 'my-plugin'),
    'icon'        => 'sun',      // any icon name (DESIGN-PRINCIPLES.md §6)
    'subtitle'    => '',         // optional, under the head
    'desc'        => '',         // optional HTML, at the top of the body
    'collapsible' => true,       // default true; false draws a plain heading
    'collapsed'   => false,      // default false: the initial state
    'layout'      => 'card',     // 'row': title + subtitle in a row's label column, the card beside them
    'card_title'  => '',         // 'row' only: the card head's label; empty repeats the title
    'dependency'  => [...],      // optional: hides the whole card (ANDed onto each field)
    'fields'      => [ /* ordinary fields */ ],
],
```

- **Storage does not change.** The schema splices the group's fields back
  into the section where the group was, as plain siblings, so they keep their
  keys, defaults, seeding order, resets, sanitizing and REST lookups. A screen
  with groups stores exactly the bytes of the same screen without them
  (`tests/php/field-group.php`). On the wire each grouped field carries
  `fieldGroup: '<group id>'` and the section lists its cards in `groups`.
- **Dependencies are unchanged.** A grouped field's rule still resolves against
  its siblings at the section level, inside the group or outside it. The card
  also hides itself when every field in it is hidden. A group's own
  `dependency` is ANDed onto each of its fields wherever the group is spliced
  away (the schema, rows, fieldsets, the Codestar unwrap), so Classic hides
  what the card hides. Codestar applies a 4th-element global flag to a whole
  rule set, so keep that flag the same on a group and on the fields inside it.
- Search shows a group with only its matching fields, opened; a match on the
  group's own title shows all of them. A group holding a field the last save
  rejected opens.
- Top level only. Inside a repeater row or a fieldset (which have `tab`), the
  group's fields are spliced in flat with no card; a group inside a group joins
  the outer one. Both are reported under `WP_DEBUG`, never a crash.
- A group cannot be `responsive` or carry a `default`.
- **Codestar has no such type.** A host that also registers the screen with
  Codestar (a Classic fallback) unwraps first, or Codestar drops every grouped
  field on save:

  ```php
  $section['fields'] = function_exists('bfields_unwrap_field_groups')
      ? bfields_unwrap_field_groups($section['fields'])
      : $section['fields'];
  \CSF::createSection($unique, $section);
  ```

  A host that may run against an older bfields copy keeps its own splice
  instead (`docs/host/Registrar.php`, `unwrapGroups()`), and only sends groups
  to bfields 1.1.0 or newer.

### Translations

The framework's own strings use the `bfields` text domain. PHP strings load
from `languages/bfields-{locale}.mo`. The bundle's strings load from the
`bfields-{locale}-<md5 of "build/index.js">.json` catalogue, also for a copy
embedded at `lib/bfields/`: `Assets::translation_path()` maps its path back.
Host field labels travel in the schema and use the host's own text domain.
Refresh the catalogues after a UI build, and never generate an `en_US`
catalogue (it would blank every string):

```bash
npm run i18n   # make-pot with the right excludes; drops the three demo plugin-header entries itself
# then update the .po from the .pot, and:
wp i18n make-mo languages/bfields-es_ES.po languages
wp i18n make-json languages/bfields-es_ES.po languages --no-purge
```

**Which copy is loaded?** `$GLOBALS['bfields_loaded_from']` names it. At equal
versions the copy registered last wins, which comes down to plugin load order.
To pin one (a checkout next to a host's `lib/bfields/`), define
`BFIELDS_FORCE_PATH` in `wp-config.php` as that copy's package root.

The npm package `@bplugins/bfields` ships **types and authoring helpers only,
never the runtime**. If each host bundled the runtime the site would load N
bundles, N React roots and N `window.bfields`.

## Versioning

Plain `major.minor.patch` only, never a prerelease suffix. Arbitration loads
the copy with the highest `version_compare()` result, and `1.0.0-rc.1` compares
*lower* than `1.0.0`, so a release candidate would lose to the older copy a host
already ships. Build candidates under the version they will ship as; if a
candidate changes after it has been vendored somewhere, bump the patch number.

## Invariants

These are load-bearing. Breaking one is a data-loss bug, not a style question.

1. **`php/bootstrap.php`'s recorder block is frozen bytes** in every release,
   forever, so an old copy can always register with a newer one.
2. **Only the arbitration winner defines `BFIELDS_VERSION`.** Each copy's own
   version is a local variable.
3. **`Codec/Csf.php` is frozen at v1.** Newest-copy-wins means a newer codec
   serves older hosts; if it changed shape, their data would change with it.
4. **No breaking changes under this package name.** A breaking change ships as
   `bfields2` / `BFields2\` and coexists.
5. **Never define the global `CSF` class.** Codestar guards itself with
   `class_exists('CSF')`; a polyfill would hijack every other CSF-based plugin
   on the site. The facade is `\BFields\Compat\Codestar` and nothing else.
6. **React comes from `wp.element`, never from the bundle.** CI asserts it.
7. **One schema per key.** A field array is defined once and handed to the
   host's `Registrar`; never a Classic copy and a Modern copy of one field list.

## The UI is a port, not an interpretation

`ui/theme/` is ported from the design repo (`bPlugins/3d-viewer-new-ui`), which
measured every value off the 1x Figma exports in
`assets/images/figma/settings/`. The odd-looking numbers — 15.9px row padding,
41px toggle tracks, 178px MIME columns — are the measurements, not typos, and
`tests/e2e/design-parity.mjs` asserts they survive contact with wp-admin.

The port covers both of the design's row idioms, because the schema has always
named both on a section:

| Section `layout` | Design source | What a field looks like |
| --- | --- | --- |
| `rows` | Settings screen | icon and title left, a compact control pushed right |
| `cards` | Add New Model tab | icon, title and description stacked at the top of a bordered card, the control full width beneath, the long sentence under that |

Three controls only appear in the card idiom, and all three were declared in the
schema long before anything drew them: the **mode grid** (`layout: 'mode-grid'`
→ the `cards` presentation of a choice, with per-option chrome from
`option_meta`), the **source field row** (an `upload` with a soft-tinted button
beside it) and the **poster block** (a `media` with a thumbnail, a name and a
line of guidance). Until they were implemented a `mode-grid` field silently fell
through to a radio list.

Four controls are **composed rather than measured**, because the design repo
never drew them: `repeater`/`group`, `fieldset`, `spacing` and `link`. They are
built only from the tokens the rest of the sheet uses — so a host that overrides
`--bfields-primary` restyles them too — and they keep the same 36px control
height and hairline row rule as everything else. Being unmeasured, they are the
part of the sheet most worth a designer's eye.

Two things bite when that CSS moves from a standalone preview into wp-admin,
and both are solved in `ui/theme/admin.css`:

1. **Specificity.** wp-admin's `forms.css` styles controls with attribute
   selectors (`input[type="text"], select, textarea { border-radius: 2px }`),
   which is (0,1,1) and beats a plain `.bfields-input` at (0,1,0). Every
   selector is therefore written `.bfields-app .bfields-x`, taking it to
   (0,2,0)+. Scoping only *some* of them is worse than none: a modifier like
   `.bfields-tab--active` would then rank below its own scoped base rule.
2. **`min-height` is not a specificity problem.** wp-admin sets
   `select { min-height: 40px }`, which clamps the used height no matter how
   specific your `height: 36px` is. It has to be reset, not outranked.

Neither surfaced in the design repo, because it never runs inside wp-admin.

## Tests

```bash
WP_PATH=/path/to/wordpress ./bin/test.sh
```

| Suite | What it proves |
| --- | --- |
| `tests/php/roundtrip.php` | Every real stored value (golden + edge fixtures) round-trips byte for byte, through the codec and through a real `Option::save()` / `PostMeta::save()`. Differences are allowed only where §3.1 sanctions them, and the suite names which rule permits each one. Fails on 0 records. |
| `tests/php/seeding.php` | A fresh install is seeded exactly as a real `CSF_Options` seeds it — raw types (`true` stays `true`) and key order included. |
| `tests/php/save-parity.php` | The same form saved by real Codestar and by bfields stores the same bytes and fires the `csf_*` hooks in the same order with the same arguments, for an options page and a meta box. |
| `tests/php/choices.php` | The option-source route lists what Codestar's `field_data()` would, only inside the field's own `query_args` (a client cannot widen it, stored ids outside it resolve to nothing), and only for users who can save the screen. |
| `tests/php/asset-deps.php` | The bundle depends only on script handles WordPress 6.5 registers (or bfields shims). |
| `tests/ts/dependency.test.ts` | The TypeScript and PHP dependency engines agree on ~5,000 cases generated from every rule the bPlugins plugins actually register. |
| `tests/ts/codestar-parity.test.ts` | Both engines agree with **Codestar's own** parsing (`main.js`) and `Rule.evalCondition`, extracted verbatim into `tests/fixtures/codestar/`. |
| `tests/e2e/metabox-save.mjs` | The framework's own meta box (the demo's Postbox screen) saved through Publish / Update in real wp-admin: Codestar-shaped strings, untouched fields byte-identical, autosave and revisions write nothing, `validate` errors survive the redirect once, and the colour panel and searched select write what Codestar's would. |
| `tests/e2e/design-parity.mjs` | The rendered screens match the design repo's measured values **inside real wp-admin**, where WordPress's own forms.css competes for the same properties. 643 computed properties over 66 selectors, across every tab of both screens — and `--static` runs the same contract against the static preview. |

The PHP suites run against a **real** install and the **real** registered field
sets, not a hand-written copy of them. `bin/test.sh` boots wp-cli as an
administrator in wp-admin on a product edit request, because that is the only
context in which 3D Viewer registers all three screens; a missing field set is a
failure. CI has no 3D Viewer, so it sets `BFIELDS_SCHEMA_SOURCE=inventory` and
reads the committed `tests/php/fixtures/schema-inventory.json` instead.
Regenerate the inputs (in the same context) with `tests/php/dump-inventory.php`,
`tests/php/dump-dependencies.php` and `tests/php/make-edge-fixtures.php`.

## Credits

- **Inter** by Rasmus Andersson and The Inter Project Authors
  (https://rsms.me/inter/), bundled as `build/fonts/inter-latin*.woff2` from
  `ui/theme/fonts/`. Licensed under the SIL Open Font License 1.1; the licence
  text ships beside the fonts as `build/fonts/OFL.txt`.

## License

bfields is © bPlugins and licensed under the GNU General Public License,
version 2 or (at your option) any later version — see `LICENSE`. The bundled
Inter font is under the SIL Open Font License 1.1 (above).
