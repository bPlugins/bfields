# bfields — design principles

The rules every bfields control follows, so several people can build controls in
parallel and still produce one sheet. Every value is in the code, file cited; where
this document and the code disagree, the code wins. Values were measured off the
design repo's 1x Figma exports (`~/Development/3d-viewer-new-ui`) and ported in
`ui/theme/`. Do not "tidy" them: 15.9px and 41px are measurements.

Corrections to the B0 brief, from the code: row descriptions are **14px/400** at
20px (not 13px, not 500); row controls are **40px** tall and card controls 44px
(36px is only the Settings dimension input).

## 1. Tokens only

A component sheet contains no literal colour and no literal font stack. It uses
`var(--bfields-*)` from `ui/theme/tokens.css`, which are declared on `.bfields-app`,
never `:root`. `--bfields-primary` and `--bfields-save` are overridden inline per
host (the `brand` argument), so a control that hard-codes `#1b5cf0` breaks every
other host's brand.

| Token | Value | Use |
| --- | --- | --- |
| `--bfields-primary` | `#1b5cf0` | tabs, Enable, Publish, chips, focus ring, active state |
| `--bfields-primary-hover` | `#1450d8` | primary button hover |
| `--bfields-save` | `#3b52f6` | Save Changes / Save Change only (and the Settings segmented pill) |
| `--bfields-strip` | `#f5f8ff` | tab strip, selected mode card, pressed switch |
| `--bfields-bg` / `--bfields-card` | `#f8f9fa` / `#ffffff` | page / panels and cards |
| `--bfields-border` | `#e5e7eb` | every 1px border |
| `--bfields-field` | `#f3f4f6` | segmented strip, muted fills |
| `--bfields-title` / `--bfields-heading` | `#111827` / `#0f172a` | page title / section title |
| `--bfields-row-title` | `#24242b` | row and card titles, control text, body default |
| `--bfields-row-desc` | `#6b7280` | descriptions, hints, secondary text |
| `--bfields-muted` / `--bfields-placeholder` | `#919195` / `#9ca3af` | icons at rest / placeholders only (not text, see 8) |
| `--bfields-on` / `--bfields-off` / `--bfields-off-soft` | `#10b981` / `#ef4444` / `#fda4af` | toggle on, destructive, toggle off track |
| `--bfields-check` | `#00bf7c` | checked tile/checkbox box (not `--bfields-on`) |
| `--bfields-slider` | `#2563eb` | slider fill and thumb (not `--bfields-primary`) |
| `--bfields-info-bg` | `#eff6ff` | soft buttons (`--soft`, `linkbtn`), info bar |
| `--bfields-warn-*`, `--bfields-reset-*`, `--bfields-danger-*` | see tokens.css | badge/status pairs, Reset, Reset All |
| `--bfields-radius` | `10px` | panels, cards, subcards |
| `--bfields-font` / `--bfields-font-mono` | Inter stack / `ui-monospace` stack | all text / code, selectors |

Hairlines are the one sanctioned literal: row rule `#f1f3f5`, radio/checkbox ring
`#cbd5e1`, tab hover border `#cbd5e1` (`admin.css`). The Add New compact controls
use a slate ramp (`#d9e3ec` borders, `#1e293b` text, `#64748b` secondary,
`#f3f6fa`/`#e9eef5` strip) — only inside `.bfields-editor` rows (`admin.css`,
"the Add New frames' compact controls"). A new colour becomes a token first.

## 2. Typography

Inter, bundled as variable woff2 (weights 400–700, latin + latin-ext,
`ui/theme/fonts/`, declared in `base.css`). No Google Fonts request, ever.
`.bfields-app` pins `font-size: 16px; line-height: normal` because wp-admin puts
13px/1.4 on `<body>`; size every text element explicitly.

| Role | Size / weight / line-height | Colour | Source |
| --- | --- | --- | --- |
| Page title, Add New | 30 / 700 / 1.2, −0.02em | `--bfields-title` | `.bfields-title` |
| Page title, Settings | 22 / 700, −0.01em | `#000` | `.bfields-settings-head__title` |
| Section / subcard title | 18 / 700 | `--bfields-heading` | `.bfields-section-title` |
| Row title, card title | 14 / 600 / 1.3 | `--bfields-row-title` | `.bfields-row__title`, `.bfields-card__title` |
| Row description | 14 / 400 / 20px, 3px under title | `--bfields-row-desc` | `.bfields-row__desc` |
| Card description / hint | 14 / 1.45 / 14 under control | `--bfields-row-desc` | `.bfields-card__desc`, `.bfields-hint` |
| Tab, button | 14 / 600 | — | `.bfields-tab`, `.bfields-btn` |
| Input, select | 14 (search 15, post title 20) | `--bfields-row-title` | `.bfields-input`, `.bfields-select` |
| Toggle label, radio | toggle 14 / 500, radio 14 (editor 12, 13) | state colour | `.bfields-toggle__label`, `.bfields-radio` |
| Segmented | 13 / 500, pressed 600 (editor 12) | `--bfields-row-desc` | `.bfields-segmented button` |
| Status line, poster meta | 13 / 500, 13 | state / `--bfields-muted` | `.bfields-actions__status` |
| Small tag, perks | 12 / 500, 12 | primary / reset-fg | `.bfields-mode__tag` |
| Pro badge | 11 / 600, uppercase | warn pair | `.bfields-badge--pro` |
| Mono (selector chip, code) | 13 | inherits | `--bfields-font-mono` |

## 3. Geometry

| Thing | Settings (`rows`) | Add New editor | Source |
| --- | --- | --- | --- |
| Row padding | 15.9px top/bottom | 14.9px | `.bfields-row`, `.bfields-editor .bfields-row` |
| Row pitch (title + one-line desc) | **74px** = 31.8 + 41.2 + 1 | **72px** | design README, inconsistency 10 |
| Row rule | 1px `#f1f3f5`, none on last row | same | `.bfields-row` |
| Icon tile | 40×40, 8px radius, `#f8fafc`, 18px icon, 18px gap | 38×38, 15px to text, 10px to control | `.bfields-row__icon` |
| Spaced row (radio group) | 39px / 17px, next row +38 top | 37 / 26, next +27 | `.bfields-row--spaced` |
| Text input | 40px, 0 14px padding, 8px radius | 44px in a card | `.bfields-input`, `.bfields-card__control > input` |
| Select | 44px, min-width 180px, chevron 14px from end | full width in a card | `.bfields-select` |
| Button | 40px, 0 18px, gap 9, 8px radius (ghost 45, soft 44) | Publish 45 | `.bfields-btn` |
| Small button | 34px (`linkbtn`, stepper, dim link), 6px radius | 28–30 | `.bfields-linkbtn`, `.bfields-icon-btn` |
| Segmented | 32px buttons in a 4px-padded strip (40 total) | 27 in 35; 36 in a card | `.bfields-segmented` |
| Dimension | 72×36 input, 62×36 unit select, 10 gap | 70×30, content-width select | `.bfields-dim` |
| Toggle track | **41×24**, 18px knob, 3px inset, 17px travel | 41×22, 2px inset, 19px travel | `.bfields-toggle__track` |
| Radio | 18px ring 1.5px, 9px dot, 9px to label, 26px apart | 24px apart | `.bfields-radio` |
| Slider | 350×5 track, 18px thumb, 34px readout | 20px thumb, 37×31 readout | `.bfields-slider` |
| MIME tile | **178px** × 50, 5 columns, 14px gap, 20px box r5 | — | `.bfields-mime-grid` |
| Panel / tab strip | 19px panel padding; strip 10px 16px, 24px gap, 44px tabs | tabs min 112px | `.bfields-panel`, `.bfields-tabs--fixed` |
| Device switch | 26px pill (1px border, 1px padding, 2px gap) of three 22px round buttons, 8px after the title, pulled into its 18px line (`margin-block: -4px`) so the pitch holds; 22px × reset after it | same | `.bfields-devswitch` |

**Radii.** 10px panels/cards (`--bfields-radius`); 8px inputs, selects, buttons,
tabs, tiles, chips, info bars; 6px small buttons and inner segments; 5px checkbox
box; 4px swatch and tag; 999px toggles, pills, badges, the device pill and its
buttons; 50% radios.

**Card insets.** Model-tab cards (`.bfields-card`): 21px 19px, 19px top in the
editor, 18px between cards, control 20px (editor 18px) under the head, head icon
20px with 14px (editor 10px) gap. Rows cards (`.bfields-card--rows`): **29px left,
13px right** (29px right in the editor, with −20px margin). Subcard 32px. Danger
card 21px 24px. The two insets differ in Figma on purpose (inconsistency 13).

**Title column and wrapping (B7).** In a plain row the title column
(`.bfields-row__main`) keeps `min-width: 180px`; the row is `flex-wrap: wrap;
justify-content: flex-end; row-gap: 10px`, so a control that does not fit beside
a 180px title takes its own line, still right-aligned. A row that fits does not
wrap and its pixels do not change (`claude.css`, "a control too wide for its
row"). Other row kinds keep their own rule:

| Row kind | Rule | Set by |
| --- | --- | --- |
| `--wide` (repeater, fieldset, mode grid, media inside a row) | control always on its own line, `flex: 1 0 100%`, 12px under the title | `FieldRenderer.tsx:328` |
| `--fill` (text, code) | title fixed 240px, 11px top pad; control fills the rest | `FieldRenderer.tsx:336` |
| nested (repeater body, fieldset) | title `flex: 1 1 220px`, wraps | `claude.css` |
| ≤782px viewport | every row wraps; control indented 58px | `admin.css`, narrow screens |

A new control never sets its own width to beat the column; it declares a core,
and `FieldRenderer` decides wide/fill. At ≤1100px the MIME grid is 2 columns and
the editor is one column.

## 4. Two row idioms

The **section** decides, never the field (`layout` on the section, `FieldRenderer`
`layout` prop): a tab that mixes the two reads as broken. The same goes for icon
tiles (`showIcons`): every row in a section has one, or none does.

| Section `layout` | Design source | Field looks like | Used for |
| --- | --- | --- | --- |
| `rows` (default) | Settings screen | icon + title/desc left, compact control right | settings pages, meta-box tabs, rows cards |
| `cards` | Add New Model tab | bordered card: icon, title, subtitle stacked; control full width under; `desc` as hint under that | the few big choices of an editor tab |

In `cards`, `subtitle` is the head copy and `desc` goes under the control; in
`rows`, both sit under the title. A segmented control is the one control that sits
beside the head (`.bfields-card--inline`).

**Card-only controls** (declared in the schema, drawn only in `cards`):
the **mode grid** (`layout => 'mode-grid'` on a choice → 2-column grid of 16px
padded cards, 36px icon tile, radio at the end, per-option chrome from
`option_meta`, `Choice.tsx:178`); the **source row** (`upload` → 44px input +
44px `--soft` Upload button, 14px apart, `.bfields-field-row`); the **poster
block** (`media` → 62px thumb, name 14/600, meta 13, 44px buttons, `.bfields-poster`).

## 5. States

| State | Rule | Source |
| --- | --- | --- |
| Hover | Colour or border only, never size: tab border `#cbd5e1`; primary → `--bfields-primary-hover`; ghost/icon → `--bfields-bg` | `admin.css` |
| Focus | `:focus-visible` only: 2px solid `--bfields-primary`, offset 1px (inputs −1px, inset controls −2px). A composite control rings its **container** (`:has(input:focus-visible)`), not the bare inner input. Never colour-only, never removed without a replacement. | `base.css`, `.bfields-selector-field` |
| Disabled | Buttons `opacity: .6; cursor: not-allowed`; icon buttons stay visually at rest, only inert | `.bfields-btn:disabled`, `.bfields-icon-btn:disabled` |
| `pro` locked | Row gets `.bfields-row--locked` (control at `opacity: .65`) and the Pro badge after the title; the component receives `locked` and must disable every input. Locked fields are **never saved** (`Schema.php:859/882`, `Storage/Option.php:184`); a component must not write while locked. | `FieldRenderer.tsx` |
| Selected | `--bfields-primary` border + `--bfields-strip` fill (cards); solid primary (tabs, pressed segment); `--bfields-check` (tick boxes) | `admin.css` |
| Error | One line in the action bar, "Saved, except: Field: message" (`AdminShell.tsx`), and the post-redirect notice for meta boxes. The tab of a section holding a rejected field carries an 18px round "!" marker, named "(has errors)" for screen readers (`TabError.tsx`, `.bfields-tab__error`), until the next save. A designed per-field message goes **under the control** in `--bfields-danger-fg`, 13px, linked with `aria-describedby`; not built yet. | — |
| Loading | Mount prints "Loading…" until the bundle mounts or gives up (`Mount.php`); inside a control, a search in flight shows "Searching…" in the list's state line, never "No matches." (`SourceSelect.tsx:219`). Never a spinner that shifts layout. | — |
| Empty | `.bfields-empty`: 32px vertical padding, 14px `--bfields-row-desc`. A list's empty state names the add action. | `admin.css` |

## 6. Icons

Inline SVG from `ui/core/icons.tsx`, no icon font or package: 24×24 viewBox,
`stroke="currentColor"`, **stroke 2** (the `Check` mark 3), round caps and joins,
`aria-hidden` and `focusable="false"`. Colour comes from the parent's `color`.
Default size 20px. Sizes in use: 18 row tile and tab switch, 20 card head, 22
danger card, 16 copy/check in a chip, 14 inside a search input, 12 check mark.

A host names an icon with `'icon' => '<name>'` on a section, field or
`option_meta` entry. `resolveIcon()` accepts a bfields name, Font Awesome
(`'fa fa-cog'`, `'fas fa-shopping-cart'`) or a Dashicon (`'dashicons-admin-generic'`),
maps Codestar-era names through `ALIASES` (`cog`→`gear`, `woocommerce`→`cart`…),
and falls back to `box` so an unknown name never breaks a row.

Names today (53, `ICONS` in `icons.tsx`): `box gear pencil eye search save reset
trash info warning copy check move zoom-in zoom-out maximize maximize-2 loader
palette image code cart chart layers sliders link chain zap puzzle diamond
terminal upload send external-link refresh monitor tablet phone mobile grid sun
cloud-drizzle download camera`, the six the Repeater draws (`grip chevron-down
arrow-up arrow-down plus minus`), and `arrow-left arrow-right x`, with `close`
and `times` aliased to `x` (and `cube` to `box`). `PanelTop`/`PanelLeft` are
exported but not nameable. A new icon is Lucide-style
geometry added to `ICONS`, never an `<img>` or a font glyph.

## 7. Motion

Transitions only, no keyframes: 0.15s ease for colour, border and opacity; 0.18s
for the toggle track and knob; 0.2s for preview transforms (`admin.css`). Nothing
animates layout (height, width, position) except the preview stage `max-width`.
`base.css` clamps every animation and transition to 0.01ms under
`prefers-reduced-motion: reduce`; a new component needs nothing extra, but must
not rely on `transitionend` to finish a state change.

## 8. Accessibility

- **Keyboard.** Every control is a native `button`/`input`/`select` or carries
  `tabIndex={0}` with Enter/Space handling (`Color.tsx`). Nothing is click-only.
  Composite widgets follow the WAI-ARIA APG pattern they claim: `tablist`/`tab`
  with `aria-selected` (`AdminShell.tsx:289`), `radiogroup`/`radio` with
  `aria-checked` (`Choice.tsx`), `switch` with `aria-checked` (`Toggle.tsx`),
  `combobox` with `aria-expanded`/`aria-controls` over a `listbox`
  (`SourceSelect.tsx`), `dialog` for popovers (`ColorPanel.tsx`), `separator`
  with `aria-valuenow` for splitters (`Resizable.tsx`). Arrow-key roving focus is
  expected in tablists, radiogroups and listboxes; the splitter, the meta-box
  tablist (`MetaboxShell.tsx:71`, reversed in RTL) and the source listbox have it,
  and new composites must add it.
- **Names.** An icon-only button has `aria-label` (and `title`). A control without
  a visible `<label for>` takes `aria-label={field.title}`.
- **Popovers.** Escape and an outside mousedown close (`ColorPanel.tsx:110-127`,
  `:156`). Escape returns focus to the opener (`Color.tsx:36-41`); an outside
  mousedown leaves focus where the click put it. Tab is trapped inside a
  `dialog` popover. Opening never writes a value.
- **Live regions.** Save status is `role="status"`; Repeater reorder, add and
  remove announce through one polite `aria-live` region (`Repeater.tsx:615`), and
  the source search announces its result count the same way.
- **Contrast floor.** 4.5:1 for text, 3:1 for icons, focus rings and control
  borders that carry meaning (dashboard audit A1, `DASHBOARD-FIGMA-ISSUES.md`:
  `#6B6B6B` is the lightest body grey that passes everywhere).

**Design debt, ruled 2 Oct 2026 (C6 / V-M6).** Raju ruled the measured pairs
below the floor be darkened in place, keeping their hues. Text tokens now clear
4.5:1 and track, tick and ring tokens 3:1 on the backgrounds they sit on:

| Token / pair | Was | Now |
| --- | --- | --- |
| Toggle "on" label, `--bfields-on-fg` on white / `--bfields-bg` | `#10b981` 2.54 | `#0b835c` 4.76 / 4.51 |
| Toggle "off" label, `--bfields-off-fg` on white / `--bfields-bg` | `#ef4444` 3.76 | `#e41414` 4.76 / 4.52 |
| Toggle "on" track, `--bfields-on` (white thumb, white card) | `#10b981` 2.54 | `#0ea473` 3.19 |
| Toggle "off" track, `--bfields-off-soft` | `#fda4af` 1.89 | `#fb5f72` 3.01 |
| `--bfields-row-desc` on `--bfields-field` (unpressed segmented) | `#6b7280` 4.39 | `#69707e` 4.52 |
| Editor-row segmented label on `#f3f6fa` | `#64748b` 4.39 | `#627289` 4.52 |
| Checked box, white tick on `--bfields-check` (and on `#f4f6f8`) | `#00bf7c` 2.40 | `#00a36a` 3.26 / 3.01 |
| Unchecked box / radio ring, `--bfields-control-border` | `#cbd5e1` 1.48 | `#7f97b5` 3.00 |
| `--bfields-muted` as text (on white / `#f5f7f8`) | `#919195` 3.14 | `#717176` 4.85 / 4.52 |
| `--bfields-placeholder` on white | `#9ca3af` 2.54 | `#6e7788` 4.51 |
| Search placeholder | `#93b4f5` 2.08 | `#3170ec` 4.51 |
| Pro badge, `--bfields-warn-fg` on `--bfields-warn-bg` | `#ee9f0b` 2.00 | `#996607` 4.52 |
| Reset, `--bfields-reset-fg` on `--bfields-reset-bg` | `#00a44c` 3.10 | `#00843d` 4.56 |
| Reset All, `--bfields-danger-fg` on `--bfields-danger-bg` | `#ef4444` 2.96 | `#cc1111` 4.52 |
| Pressed device button text / ring on white | `#2573ff` 4.22 / `#6ea1ff` 2.56 | `#1b6cff` 4.53 / `#5892ff` 3.01 |

A new control uses these tokens and does not reintroduce the old values.

## 9. Scoping and wp-admin hardening

- Every selector is `.bfields-app .bfields-x` (0,2,0), so it beats wp-admin's
  `input[type=text]` (0,1,1). All of them, modifiers included; a partly scoped
  sheet ranks a modifier below its own base rule. CI checks `admin.css` and
  `claude.css` with comments stripped (`.github/workflows/ci.yml`).
- Nothing selects `html`, `body` or a bare element outside `.bfields-app`; the one
  exception is the opt-in `body.bfields-screen` background (`base.css`).
- Element resets are `.bfields-app :where(el)` (0,1,0) and `base.css` loads first,
  so a component class wins on source order.
- **`min-height` is not a specificity problem.** wp-admin's `select
  { min-height: 40px }` clamps any height; a new control class joins the reset
  list in `admin.css` ("Neutralise wp-admin's control min-height"). Also reset
  `max-width` (forms.css caps selects at 25rem) and `margin`.
- Class names are BEM under `bfields-`; a host styles nothing inside, it hangs
  adornments on the documented slots.
- **RTL.** The build emits `build/index-rtl.css` (rtlcss) and `Assets.php:101`
  swaps it in for RTL locales, so physical `left/right` are flipped today. New
  sheets use logical properties (`margin-inline-start`, `inset-inline-end`,
  `text-align: start`) so the source reads correctly in both directions; icons
  that mean direction (chevrons, carets) flip, others do not.

## 10. Stored-shape rule

A component's job ends at the store, and the store holds the Codestar wire shape.
A designed replacement keeps **exactly** the shape in its stand-in's header
(`ui/fields/claude/*.tsx`), patches objects instead of rebuilding them (key order
is bytes), never writes on mount, open or focus, and never normalises what it did
not change.

| Type | Stored shape |
| --- | --- |
| `switcher` | `'1'` / `'0'` |
| `text`, `textarea`, `code_editor` | string, untrimmed; code is kses'd by PHP |
| `number`, `spinner` | **string** (`"30"`), never a number |
| `select` (source) | id as string, list when `multiple`, `''` when none |
| `checkbox` with options | list of keys, `[]` when empty |
| `color` | `#rrggbb`, `rgba(r, g, b, a)` with that spacing, `transparent`, or `''` |
| `dimensions` / `spacing` | `{width,unit}` / `{top,right,bottom,left,unit}`, only declared sides |
| `fieldset` | object keyed by sub-field ids, patched |
| `group` / `repeater` | list of row objects, `''` when empty; `__id` never stored |
| `link` | `{url,text,target}`, `target` is `'_blank'` or `''` |
| `media` / `upload` | 8-key media array / URL string |
| responsive | desktop in the field's own key; tablet/mobile nested (dimension types) or `{id}_tablet`/`{id}_mobile` |

## 11. How to verify

Run all of these before a component is called done; paste the result lines.

| Check | Command | Proves |
| --- | --- | --- |
| Types, units | `npx tsc -p tsconfig.json --noEmit`; `npx jest --config jest.config.cjs` | TS compiles; engines agree |
| Everything | `WP_PATH=/path/to/wp ./bin/test.sh` | PHP data suites, design parity, meta-box save e2e |
| Computed styles | `WP_PATH=… node tests/e2e/design-parity.mjs` (and `--static`) | measured values survive wp-admin; add the new control's measurements to `tests/e2e/design-tokens.json` |
| Pixels | `WP_PATH=… node tests/e2e/figma-diff.mjs --out=dir` | every region at or below the design build's own floor |
| Accessibility | axe (`@axe-core/playwright`) on both demo screens | 0 serious/critical (C6) |
| Scoping | the CI "scoped for wp-admin" step | no bare `.bfields-x` selector |

Both e2e checks pin the demo's tab switcher to the design's top strip (the demo
defaults to `tabs_position => 'left'`); check the sidebar and a 782px window by eye.
