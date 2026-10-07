# ui/fields/claude — stand-in fields

Everything in this folder was **composed, not transcribed**. The design repo
(`bPlugins/3d-viewer-new-ui`) drew seven controls; Codestar needs more than
that. Each file here fills one of those gaps, built only from the design's
tokens (`--bfields-*`) and its existing classes so it sits on the same screen
without looking foreign, but no frame in the Figma file says what it should
look like.

They live apart from the transcribed components in `../` so they can be
replaced wholesale when the original design arrives, without touching anything
that was measured.

## What is here

Already replaced by designed components in `../`: `Repeater` (B1), `Code`
(B5), `NumberInput` (B6), `Textarea` (B7), `MediaInline` (B8), `Fieldset`
(B2), and in stream A8 `ColorPanel` (B12), `SourceSelect` (B11),
`DeviceSwitcher` (B13), `Checklist` (B9) and `Spacing` (B3). Their rules
live in `../../theme/admin.css`.

| File | Codestar type | Why it is a stand-in |
| --- | --- | --- |
| `Link.tsx` | `link` | No link picker in the design (B4, may slip past 1.0.0). |
| `ImageTiles.tsx` | `image_select` | The MIME tile card with images; not in the design (B10, may slip). |

`claude.css` holds the rules these two need, plus the composed row layouts
and states the design never drew: wide, fill and wrapping rows, the selector
chip's width, the meta box's title column, the `below` slot, titled display
rows, a multiple select, and the pressed dimensions link. The transcribed
sheet (`../../theme/admin.css`) has none of them.

## Replacing one

1. **Whole fields** (`Link`) are registered in `index.ts` →
   `registerStandInFields()`. Write the designed component in `../`, register
   it in `../index.ts`, and delete the line and the file here.
2. **Presentations** (`ImageTiles`) are imported by the designed component
   beside them in `../` (`../Choice.tsx`). Replace the file in place, keeping
   its props, or move the new markup into the designed component and drop
   the import.
3. Delete the matching block from `claude.css`.
4. Run `npm run build && npm run build:demo`, then the parity check
   (`tests/e2e/design-parity.mjs`) and the screenshot diff (`tests/e2e/figma-diff.mjs`).

Stored shapes are not the design's concern and do not change with it: every
component here keeps the value shape documented in its header (plan §3.1), and
a replacement must too.
