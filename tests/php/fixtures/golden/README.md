# Golden fixtures

Real records captured from a live WordPress install (see plan §8.1). They are
the contract `tests/php/roundtrip.php` tests against: for every value here,
hydrating it into the store and sanitizing it back must produce **the same
bytes**. If that suite is green, saving a screen through bfields without
touching anything cannot change a user's data.

| File | Source |
| --- | --- |
| `settings.json` | the `_bp3d_settings_` option |
| `viewer-<id>.json` | `_bp3dimages_` post meta, one file per viewer |
| `product-<id>.json` | `_bp3d_product_` post meta, one file per product |

Captured 2026-09-22: 1 settings row, 151 viewers, 10 products — 12,391 values
across 16 field types.

Re-captured 2026-09-26 against 3D Viewer Pro 2.0.0 (`e145e9b`): 54 new viewers
(two with real per-device sizes, `viewer-8033` and `viewer-8438`) and 1 new
product were added, and `product-1893` was refreshed. Records whose post no
longer exists (`product-6051`, `product-6661`) were kept: they are still
real shapes. **`settings.json` was deliberately NOT refreshed.** On
2026-09-26 the live `_bp3d_settings_` row held only 13 free-tier keys. Every
Pro key the 22 Sep row had (loader, control placement, analytics, `bpp_*`,
mobile, rotate, `custom_css`) was gone, which is what a free-mode save
writes. A record that has already lost its data is not a golden record.

## Re-capturing

```bash
cd /path/to/wordpress
G=wp-content/plugins/bfields/tests/php/fixtures/golden

wp option get _bp3d_settings_ --format=json > "$G/settings.json"

for id in $(wp post list --post_type=bp3d-model-viewer --post_status=any --format=ids); do
  wp post meta get "$id" _bp3dimages_ --format=json > "$G/viewer-$id.json" 2>/dev/null || true
done

for id in $(wp post list --post_type=product --post_status=any --format=ids); do
  wp post meta get "$id" _bp3d_product_ --format=json > "$G/product-$id.json" 2>/dev/null || true
done
```

Delete any zero-byte files the loops leave behind (posts without the meta).

## Edge cases

The cases a codec bug would hide in, which this machine's data does not
contain, are in `../edge/`, generated from these records by
`tests/php/make-edge-fixtures.php` (each starts from a real record and changes
only what the case is about):

- `settings-reset`, `viewer-reset-booleans` — saved by Codestar's **Reset**:
  switchers hold PHP `true`/`false`, a single button_set holds an array
- `viewer-nested-hotspots` — cycle models with hotspots **inside** model rows
- `viewer-slashes` — `\`, `'` and `"` in hotspot text and custom CSS
- `viewer-free-authored` — written by the free plugin (`bp_3d_decoder`, flat
  `bp3d_model_src`)
- `product-variants` — variant `attribute_*` maps and popup models

`tests/php/roundtrip.php` runs them with the golden set, through the codec and
through real storage.
