<?php
/**
 * bfields — build tests/php/fixtures/edge/ from the golden set.
 *
 * The golden records are whatever one site happened to contain. The plan asks
 * for the cases where a codec bug would hide, and this machine's data has none
 * of them (fixtures/golden/README.md, "What is still missing"). Each edge
 * fixture starts from a REAL golden record, so its shape is real, and changes
 * only what the case is about:
 *
 *   settings-reset         switchers as PHP true/false (Codestar Reset), an
 *                          array in a single button_set, never-toggled ''
 *   viewer-reset-booleans  the same on a viewer record
 *   viewer-nested-hotspots cycle models, hotspots INSIDE model rows, row
 *                          switchers '' / true / '0'
 *   viewer-slashes         `\`, `'` and `"` in hotspot text and custom CSS
 *   viewer-free-authored   a free-plugin record: bp_3d_decoder, flat
 *                          bp3d_model_src, no Pro keys
 *   product-variants       attribute_* variant keys and popup models
 *   viewer-responsive-sizes   Pro 2.0 tablet/mobile sizes nested in
 *                             bp_3d_width / bp_3d_height
 *   viewer-responsive-inherit the same panes saved empty (inherit)
 *
 * (viewer-free-authored is the third responsive case: the free plugin's plain
 * `dimensions` writes the flat {width, unit} with no device keys at all.)
 *
 *   wp eval-file wp-content/plugins/bfields/tests/php/make-edge-fixtures.php
 */

if (!defined('ABSPATH')) {
	exit;
}

require_once (rtrim((string) (getenv('BFIELDS_ROOT') ?: WP_PLUGIN_DIR . '/bfields'), '/')) . '/tests/php/lib.php';

use BFields\Schema;

$golden = bfields_test_root() . 'tests/php/fixtures/golden';
$out    = bfields_test_root() . 'tests/php/fixtures/edge';

if (!is_dir($out)) {
	mkdir($out, 0755, true);
}

$read = static function (string $file): array {
	return (array) json_decode((string) file_get_contents($file), true);
};

$write = static function (string $name, string $unique, string $note, array $value) use ($out): void {
	file_put_contents(
		$out . '/' . $name . '.json',
		json_encode(array('unique' => $unique, 'note' => $note, 'value' => $value), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n"
	);
	echo "wrote edge/{$name}.json\n";
};

/**
 * Turn switchers into Reset booleans, alternating with '' so both survive.
 */
$resetify = static function (array $record, array $schema): array {
	$n = 0;
	foreach (Schema::field_index($schema) as $id => $field) {
		if ('switcher' === $field['type'] && array_key_exists($id, $record)) {
			$record[$id] = 0 === $n % 3 ? ('1' === $record[$id]) : (1 === $n % 3 ? !('1' === $record[$id]) : '');
			$n++;
		}
		if ('button_set' === $field['type'] && empty($field['props']['multiple']) && is_string($record[$id] ?? null) && '' !== $record[$id]) {
			$record[$id] = array($record[$id]);   // Codestar Reset of an array default.
		}
	}
	return $record;
};

$settings_schema = bfields_test_schema('_bp3d_settings_');
$viewer_schema   = bfields_test_schema('_bp3dimages_');
$product_schema  = bfields_test_schema('_bp3d_product_');

if (!$settings_schema || !$viewer_schema || !$product_schema) {
	echo "Field sets missing — run in the admin + product-edit context (see bin/test.sh).\n";
	exit(1);
}

$viewers  = glob($golden . '/viewer-*.json');
$products = glob($golden . '/product-*.json');
$viewer   = $read($viewers[0]);
$product  = $read($products[0]);

$write('settings-reset', '_bp3d_settings_', 'Codestar Reset: PHP true/false switchers, a single button_set holding an array, never-toggled switchers.', $resetify($read($golden . '/settings.json'), $settings_schema));

$write('viewer-reset-booleans', '_bp3dimages_', 'A viewer saved by Codestar Reset.', $resetify($viewer, $viewer_schema));

// Hotspots inside model rows, the shape the cycle viewer stores.
$hotspot = static function (string $title, string $desc, $open): array {
	return array(
		'title'         => $title,
		'desc'          => $desc,
		'linkUrl'       => 'https://example.com/?a=1&amp;b=2',
		'linkText'      => 'Read more',
		'openInNewTab'  => $open,
		'imageAlt'      => '',
		'animationName' => '',
		'videoUrl'      => '',
		'position'      => '0.1m 0.2m 0.3m',
		'normal'        => '0m 1m 0m',
		'orbit'         => '',
		'target'        => '',
		'fov'           => '',
	);
};

$nested = $viewer;
$nested['bp_3d_model_type'] = 'mcycle';
$row = isset($viewer['bp_3d_models'][0]) && is_array($viewer['bp_3d_models'][0]) ? $viewer['bp_3d_models'][0] : array();
$nested['bp_3d_models'] = array(
	array_merge($row, array('enable_ar' => '', 'hotspots' => array(
		$hotspot('Lid', 'Opens at 90°', ''),
		$hotspot('Base', 'Rubber "feet"', true),
	))),
	array_merge($row, array('enable_ar' => '0', 'hotspots' => array(
		$hotspot("Handle's grip", 'Line one<br />Line two', '1'),
	))),
);
$write('viewer-nested-hotspots', '_bp3dimages_', 'Cycle models with hotspots nested in model rows; row switchers as "", PHP true, "0" and "1".', $nested);

// Backslashes and quotes. Values are in the form Codestar STORES them (already
// through wp_kses_post: `>` is `&gt;`), because that is what bfields reads.
$slashes = $viewer;
$slashes['css'] = ".bp3d-model::before { content: \"\\201C\"; font-family: 'Inter', \"Segoe UI\"; }\n.bp3d-a &gt; .b { background: url('C:\\\\tmp\\\\x.png'); }";
$slashes['hotspots'] = array(
	$hotspot('Path C:\\models\\x.glb', "It's \"quoted\" and back\\slashed \\\\ twice", ''),
);
$write('viewer-slashes', '_bp3dimages_', 'Backslashes, single and double quotes in hotspot text and custom CSS — the bytes wp_unslash() would eat.', $slashes);

// A record the FREE plugin wrote: its own decoder key and a flat model src,
// none of the Pro keys.
$free = array();
foreach (array('currentViewer', 'bp_3d_model_type', 'bp_3d_src_type', 'bp_3d_src', 'bp_camera_control', 'bp_3d_zooming', 'bp_3d_loading', 'bp_3d_progressbar', 'bp_3d_width', 'bp_3d_height', 'bp_3d_align', 'bp_model_bg') as $key) {
	if (array_key_exists($key, $viewer)) {
		$free[$key] = $viewer[$key];
	}
}
$free['bp_3d_decoder']  = 'draco';
$free['bp3d_model_src'] = 'https://example.com/models/free.glb';
$write('viewer-free-authored', '_bp3dimages_', 'Written by the free plugin: bp_3d_decoder and a flat bp3d_model_src (undeclared here), no Pro keys.', $free);

// Per-device sizes, as 3D Viewer Pro 2.0's `bp3d_responsive_dimensions` posts
// them (ResponsiveDimensions.php): tablet and mobile nest inside the desktop
// value, every pane posts its axis AND its unit, and an untouched pane saves
// '' under the unit it inherits. '' means "inherit", so both records must
// survive exactly: a set pane must not be blanked, an empty one not dropped.
$sized = $viewer;
$sized['bp_3d_width']  = array('width' => '100', 'unit' => '%', 'tablet' => array('width' => '640', 'unit' => 'px'), 'mobile' => array('width' => '100', 'unit' => '%'));
$sized['bp_3d_height'] = array('height' => '420', 'unit' => 'px', 'tablet' => array('height' => '360.5', 'unit' => 'px'), 'mobile' => array('height' => '60', 'unit' => 'vh'));
$write('viewer-responsive-sizes', '_bp3dimages_', 'Pro 2.0 per-device sizes set on both axes (a decimal, mixed units).', $sized);

$inherit = $viewer;
$inherit['bp_3d_width']  = array('width' => '96', 'unit' => '%', 'tablet' => array('width' => '', 'unit' => '%'), 'mobile' => array('width' => '', 'unit' => '%'));
$inherit['bp_3d_height'] = array('height' => '400', 'unit' => 'px', 'tablet' => array('height' => '', 'unit' => 'px'), 'mobile' => array('height' => '', 'unit' => 'px'));
$write('viewer-responsive-inherit', '_bp3dimages_', 'Pro 2.0 per-device panes saved untouched: empty = inherit, unit pre-filled.', $inherit);

// Variant maps. Codestar keeps undeclared attribute_* keys in a row because
// it saves group rows as posted (ProductMetaPro builds the fields from
// $_GET['post'], empty on save).
$variants = $product;
$prow     = isset($product['bp3d_models'][0]) && is_array($product['bp3d_models'][0]) ? $product['bp3d_models'][0] : array();
$variants['bp3d_models'] = array(
	$prow,
	array_merge($prow, array('attribute_pa_color' => 'red', 'attribute_pa_size' => 'xl')),
	array_merge($prow, array('attribute_pa_color' => 'blue', 'attribute_pa_size' => '')),
);
$variants['bp3d_popup_models'] = array(
	array('selector' => '.open-3d[data-x="1"]', 'target' => '#popup'),
	array('selector' => "a[href*='viewer']", 'target' => ''),
);
$write('product-variants', '_bp3d_product_', 'Variant attribute_* keys inside model rows, and popup models.', $variants);
