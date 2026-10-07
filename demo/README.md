# bfields demo — 3D Viewer Premium

A development-only harness that rebuilds 3D Viewer Premium's admin screens
on bfields, so the framework can be looked at, clicked through and argued about
without installing a host plugin.

**It is never delivered.** `bin/dist.sh` packages `php/`, `build/` and
`languages/` only, and fails the build if anything from here reaches the zip.
Nothing in `php/` or `ui/` imports anything in this folder: delete `demo/` and
`bfields-3dv-demo.php` and the framework is byte for byte what it was.

## Running it

```bash
npm run build:demo        # once
npm run start:demo        # or watch while editing demo/ui
wp plugin activate bfields
```

The plugin header lives at the repo root (`bfields-3dv-demo.php`), because
WordPress only scans one level down inside `wp-content/plugins/`. Activating it
adds a **3D Viewer Demo** menu.

## What it shows

| Screen | Route | Rendered by |
| --- | --- | --- |
| Settings | 3D Viewer Demo → Settings | the framework bundle |
| Add New / Edit viewer | 3D Viewer Demo → Add New | the demo bundle |
| Single product | Products → edit any product (WooCommerce active) | the demo bundle |
| Postbox Demo | 3D Viewer Demo → Postbox Demo → edit any | the framework bundle, in its plain meta box |

All four read the same schema pipeline: Codestar-shaped field arrays →
`\BFields\Compat\Codestar` → `Schema` → one JSON document → React.

## Matching the design

Two checks, because each catches what the other cannot.

**Computed styles** — `tests/e2e/design-parity.mjs` asserts 907 properties
against `tests/e2e/design-tokens.json`: the design repo's CSS for the Settings
page, and, for the viewer editor, the values measured off the Add New frames
(its `screens` block), including the page furniture — title, shortcode bar,
sidebar, Publish box, stage card.

**Pixels** — `tests/e2e/figma-diff.mjs` screenshots the editor in real wp-admin
and diffs it region by region against the Figma exports, with the same
antialiasing-tolerant method the design repo used. Chrome and Figma do not
rasterise Inter identically, so nothing scores 0%; each region's limit is the
score the design repo's OWN build gets on it (`--design=<url>` re-measures
that), and the editor must do no worse.

```bash
WP_PATH=/path/to/wordpress node tests/e2e/design-parity.mjs            # real wp-admin
WP_PATH=/path/to/wordpress node tests/e2e/design-parity.mjs --static   # the static preview
WP_PATH=/path/to/wordpress node tests/e2e/figma-diff.mjs               # pixels vs the Figma
```

**Where the frames and the design repo disagree, the frames win.** The repo
carried the Settings page's control metrics onto Add New and averaged the
difference away in a whole-screen score. The Add New frames draw a tighter
variant — a wider rows card, 38px icon tiles, 12–13px controls, a different
Preview stage card — and the editor follows them, scoped to `.bfields-editor`
so the Settings page keeps the repo's measured values. Each value is annotated
with its measurement in `ui/theme/admin.css`.

**What still differs, and why.** The row descriptions wrap where Chrome wraps
them: the frames' text boxes are hand-sized per row, and no single width
reproduces all of their line breaks. The Background Color swatch is the
checkerboard, not the frame's blue, because 3D Viewer's real default is
`transparent`. Content the demo does not have — the headphones photo, the
"Ready" badge and variant strip that need a model, the mock admin notice — is
content, not layout.

## The framework's plain meta box

Postbox Demo is the one screen registered without `'render' => false`: a
handful of fields (`includes/Fields/Postbox.php`) in the core postbox
`BFields\Metabox` prints and saves, on its own post type so the Add New frames
never gain a box. `tests/e2e/metabox-save.mjs` saves it
through Publish / Update and reads the row back: Codestar shape, byte-stable
re-saves, the `validate` notice, and no write from an autosave or a revision.

```bash
WP_PATH=/path/to/wordpress node tests/e2e/metabox-save.mjs
```

## No WordPress handy?

`demo/static/` is the same two screens as plain HTML files you open from disk —
no server, no install, no build. They load the framework's real compiled
stylesheet and render the real JSON schema, dumped from a live install, so they
are a fair likeness rather than a mockup. Start at `demo/static/index.html`;
`demo/static/README.md` says what is a stand-in and what is not.

## Sandboxed, on purpose

The demo is meant to be installed next to a live 3D Viewer, so it shares no
storage with it:

| | 3D Viewer Premium | this demo |
| --- | --- | --- |
| Settings | `_bp3d_settings_` | `_bfields_demo_settings_` |
| Viewer meta | `_bp3dimages_` | `_bfields_demo_viewer_` |
| Product meta | `_bp3d_product_` | `_bfields_demo_product_` (on WooCommerce's own `product`) |
| Post type | `bp3d-model-viewer` | `bfields-demo-viewer` |
| Postbox meta | — | `_bfields_demo_postbox_` (on its own `bfields-demo-box`) |
| Shortcode | `[3d_viewer]` / `[3d_viewer_product]` | `[bfields_demo_viewer]` / `[bfields_demo_product]` (render nothing) |

## It registers no fields

Every control on both screens is the library's. The demo contains no field
component and makes no `bfields.registerField()` call — if a control looks
wrong here, the bug is in the library, which is the only way a demo is worth
having.

The library keeps two kinds apart:

- **`ui/fields/`** — transcribed from the design: toggle, choice (segmented,
  radio, tiles, mode cards, select), slider, text, colour, dimensions, media
  cards, notices.
- **`ui/fields/claude/`** — stand-ins for controls the design never drew,
  composed from its tokens and waiting for the real design: repeater, fieldset,
  spacing, link, code editor, number/stepper, textarea, compact media,
  checklist, image tiles. See `ui/fields/claude/README.md` for how to replace
  one.

What the demo still owns is the **editor shell** (`demo/ui/layout/`), because
the framework renders options screens only, and the `PostMeta` adapter beside
it. That is the demo standing in for a framework feature, not for a field, and
it is the first thing to delete when the framework grows one.

## The two bundles

`demo/build/index.js` is a second, separate bundle. React comes from
`wp.element` in both, so there is one React on the page whatever loads.

- On **Settings** it does essentially nothing: the framework bundle renders that
  page end to end.
- On the **viewer editor** it draws the whole screen to the design — title,
  shortcode bar, tabs, the Live Preview / Publish sidebar — reusing the
  framework's own `FieldRenderer`, registry and stylesheet, so the two screens
  cannot drift apart.

## The single product screen

`ProductMetaPro.php`'s meta box, rebuilt on the Add New principle: the field
set is authored against the sandbox key and grouped into tabs
(`includes/Fields/Product.php`: Model · Placement · Options · Style ·
Dimensions · Hotspots · Popups · Preview). It is registered with
`'render' => false`, and the demo prints and saves it with the viewer editor's
pieces (`Metabox::print_root()` / `save_root()`) and draws it with the same
`EditorShell`: shortcode bar, tab strip, cards on Model, a rows card elsewhere,
the stage card on Preview, and Reset to Default / Save Change.

The difference is the frame. Add New is the demo's own post type, so the shell
takes the whole screen. The product screen is WooCommerce's, so nothing on it
is hidden: the shell runs in `frame: 'metabox'` (`includes/ProductEditor.php`).
It draws into one main-column meta box, with the Live Preview card in a
300px right-hand column beside the section, as on Add New. With `resizable`
the column has Add New's drag handle (280px up to whatever leaves the section
420px, remembered per browser); the page-width handles are Add New's only,
because this page's width is WordPress's. With `sticky_tabs` the tab strip
sticks while the box scrolls and the Live Preview column sticks under it. On
this screen they have to clear WooCommerce's own fixed header as well as the
admin bar, so `EditorShell` measures both bars and the strip, which wraps at
this width. The product's title
and Publish box stay WordPress's, and Save
Change submits `#post` with `name="save"`, the same as Update.

- It appears only on product edit requests with WooCommerce active, like the
  real box. If the demo Settings screen's WooCommerce switch is `'0'`, it shows
  a one-line box saying so, with a link, instead of the fields.
- Each model row gets one select per variation attribute (`attribute_*`). They
  are built from the product being saved as well as the one being shown, so
  they survive the save request. ProductMetaPro reads only `$_GET['post']`,
  which is empty on save.
- The field set registers on `init` 20, not 0: `wc_get_product()` cannot tell
  a variable product before WooCommerce's `init` 5.

## How the editor saves

There is no REST call, and it is still WordPress's editor underneath. The root
is printed at `edit_form_top`, inside `#post`; `#poststuff` (WordPress's title
field, meta boxes and Publish box) is hidden, not removed, once the bundle has
mounted. Every button that saves is a real submit button of `#post` — Publish
sends `publish`, Update / Save Draft / Save Change send `save`, exactly what the
Publish box would — so the request, the nonce, the redirect and the "Viewer
published." notice are WordPress's own. The title is mirrored into the hidden
`#title`, so the request carries one `post_title`.

`EditorShell` mirrors the store into one hidden field inside `#post`, and
`Metabox::save()` runs that payload through the framework's `Sanitizer` and
merges it over what is already stored — only the ids the current schema
declares are overwritten.

Three guards keep a failure from locking the user out:

- The hidden field is pre-filled server-side with the hydrated values, so a
  browser that never runs the bundle posts back what it was given and saving
  is a no-op instead of a wipe.
- `#poststuff` is only hidden under `body.js`, and an inline script after the
  bundle's tag strips the screen class if nothing mounted — a 404'd or
  crashing bundle hands WordPress's own editor back.
- Enter in any input is swallowed, because the first submit button in `#post`
  is now Publish.
