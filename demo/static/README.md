# The static preview

Three HTML files that show the 3D Viewer demo screens **without WordPress**.
Open `index.html` from disk — no server, no build, no install.

```
demo/static/
  index.html        the viewer list, and the way in
  settings.html     3D Viewer Settings — the options screen
  add-new.html      Add New viewer — the post editor, as the demo draws it
  assets/
    schema.js       GENERATED — the schemas, dumped from a live install
    icons.js        GENERATED — the icon set, lifted from ui/core/icons.tsx
    preview.js      a vanilla renderer for the schema
    wp-admin.css    a wp-admin lookalike, for the frame around the screens
```

## What it is honest about

It loads the framework's **real** compiled stylesheet (`build/index.css`) and
the demo's (`demo/build/index.css`), and emits the **same class names** the
React components emit, driven by the **same JSON schema** PHP sends to the
browser. If a control looks right here it looks right in wp-admin.

Three things are stand-ins, and each says so on screen:

- **Nothing is saved.** On the settings screen Save Changes reports that it did
  nothing. On the editor, Publish, Save Draft and Save Change are the same
  submit buttons the real screen has, but there is no `#post` form to submit:
  each one puts up a notice above the editor saying nothing was saved.
- **The media library cannot open.** It is a WordPress frame; the Upload buttons
  are disabled with a title explaining why. Paste a URL instead.
- **The wp-admin chrome is a lookalike.** `assets/wp-admin.css` reproduces the
  admin bar, menu, notices, buttons and list table from WordPress's own values
  because a `file://` page cannot reach `wp-admin/css/`. Inside a real install
  WordPress draws every bit of it.

## The two screens

**Settings** is the framework's own options screen. PHP prints one empty div and
the React body draws everything from the page title down, so the static page is
that div and the renderer draws the same thing into it.

**Add New** is not WordPress furniture around a meta box any more. The demo
bundle (`demo/ui/layout/EditorShell.tsx`) takes over the post editor and draws
the whole screen to the design — the "Add New" heading, the title field, the
shortcode bar, the fixed-width tab strip, and a two-column editor: the section
on the left (a card per field on Model, one rows card with the section title on
every other tab, the stage card on Preview) with Reset to Default
and, once something has changed, Save Change under it; and on the right the
Live Preview card, "Active Insights & Promotion" and the Publish box (Publish
box first on the Preview tab). WordPress's own heading and `#poststuff` are
hidden by `demo/ui/theme/demo.css`, which also gives the page the design's
`#f8f9fa` background, 48px gutters and 1185px column.

`add-new.html` is therefore one root — the `.bfields-demo-root` that
`Metabox::render()` prints inside `#post` — and `preview.js` draws the editor
into it with EditorShell's markup, LivePreview's and StageCard's included. The
page frame restates demo.css's gutters and column against the lookalike's own
elements (`assets/wp-admin.css`), because the real rules are keyed on
wp-admin ids this page does not have.

`assets/preview.js` is **not** a second implementation of bfields and shares no
code with it — it emits the library's class names and reads the library's
schema, nothing more. If the two ever disagree, the plugin is right.

## Held to the same pixel contract

```bash
WP_PATH=/path/to/wordpress node tests/e2e/design-parity.mjs --static
```

That is the same contract the wp-admin run uses (`tests/e2e/design-tokens.json`,
including the editor's own overrides), transcribed from the design repo, walked
over every tab of both screens. A static preview that drifted from the plugin would be worse
than no preview, so it is measured rather than eyeballed.

## Rebuilding it

The generated files are committed so the preview works from a clean checkout.
Regenerate them after changing the field sets or the icons:

```bash
npm run build && npm run build:demo        # the stylesheets the pages load
npm run static:icons                        # assets/icons.js, from ui/core/icons.tsx
wp eval-file demo/static/dump-schema.php    # assets/schema.js, needs the plugin active
```

The schema dump needs a WordPress install because that is the point of it: the
preview renders what the plugin actually produced, not a hand-copied version
that quietly rots the first time a field changes.

## Why a renderer instead of hand-written HTML

The two screens are 80 top-level fields with dependencies, six presentations
and two nesting levels. Writing that as static markup would be a copy — wrong within a
week, and wrong silently. Reading the real schema cannot be.

It costs ~1,900 lines of vanilla JS, and it buys working tabs, search,
dependency rules, the repeater, Reset Section / Reset All / Reset to Default,
the Save Change button that appears only once something changed, and a Live
Preview card and Preview stage that track the fields, which is what makes the
preview worth showing to anyone.
