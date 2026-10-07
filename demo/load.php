<?php
/**
 * bfields demo — boot.
 *
 * Registers 3D Viewer Premium's admin screens against SANDBOX storage:
 *
 *   Settings   → options page, key `_bfields_demo_settings_`
 *   Add New    → post type `bfields-demo-viewer`, meta key `_bfields_demo_viewer_`
 *   Product    → WooCommerce's `product` screen, meta key `_bfields_demo_product_`
 *   Help & Demos → 3D Viewer's dashboard; stores nothing (includes/Dashboard.php)
 *   Postbox Demo → post type `bfields-demo-box`, meta key `_bfields_demo_postbox_`:
 *                  the framework's own plain meta box (includes/Postbox.php)
 *
 * Never `_bp3d_settings_`, never `_bp3dimages_`, never `_bp3d_product_`, never
 * `bp3d-model-viewer`. The product box is the one screen on a real post type,
 * because a product editor needs WooCommerce's products; it still only reads
 * and writes its own key.
 *
 * The demo is meant to be installed next to a live 3D Viewer and must not be
 * able to read, overwrite or seed a single byte the real plugin depends on.
 *
 * @package BFieldsDemo
 */

namespace BFieldsDemo;

if (!defined('ABSPATH')) {
	exit;
}

/** Sandbox option key for the Settings screen. */
const SETTINGS_KEY = '_bfields_demo_settings_';

/** Sandbox post-meta key for the viewer editor. */
const VIEWER_KEY = '_bfields_demo_viewer_';

/** Sandbox post-meta key for the product editor, on WooCommerce's `product`. */
const PRODUCT_KEY = '_bfields_demo_product_';

/** Sandbox post type. */
const POST_TYPE = 'bfields-demo-viewer';

/** Sandbox post-meta key for the plain postbox screen. */
const POSTBOX_KEY = '_bfields_demo_postbox_';

/** Sandbox post type for the plain postbox screen. */
const POSTBOX_TYPE = 'bfields-demo-box';

/** The demo bundle's script handle. */
const HANDLE = 'bfields-demo';

define('BFIELDS_DEMO_PATH', __DIR__ . '/');
define('BFIELDS_DEMO_URL', plugin_dir_url(__FILE__));

// Layer 1 of the framework: record this copy. Arbitration on plugins_loaded
// picks the newest bfields on the site and fires `bfields_loaded`.
require_once dirname(__DIR__) . '/php/bootstrap.php';

require_once __DIR__ . '/includes/Assets.php';
require_once __DIR__ . '/includes/PostType.php';
require_once __DIR__ . '/includes/Metabox.php';
require_once __DIR__ . '/includes/ProductEditor.php';
require_once __DIR__ . '/includes/Dashboard.php';
require_once __DIR__ . '/includes/Postbox.php';
require_once __DIR__ . '/includes/Fields/Settings.php';
require_once __DIR__ . '/includes/Fields/Viewer.php';
require_once __DIR__ . '/includes/Fields/Product.php';
require_once __DIR__ . '/includes/Fields/Postbox.php';

/**
 * Wire the demo up once the framework has booted.
 *
 * Field sets are registered on `init` priority 0 — the same priority 3D Viewer
 * uses — because bfields seeds `save_defaults` on `init` 99 and both screens
 * have to exist by then.
 */
add_action('bfields_loaded', static function (): void {
	add_action('init', static function (): void {
		Fields\Settings::register();
		Fields\Viewer::register();
		Fields\Postbox::register();
	}, 0);

	// Only with WooCommerce, only on a product edit request, and later than
	// the others: the model row's variation selects need wc_get_product() to
	// know the product is variable, which it cannot before WooCommerce
	// registers its product_type taxonomy on `init` 5. A meta box is not
	// seeded, so nothing needs it earlier than `add_meta_boxes` / `save_post`.
	add_action('init', array(Fields\Product::class, 'register'), 20);
});

PostType::instance()->register();
Metabox::instance()->register();
ProductEditor::instance()->register();
Dashboard::instance()->register();
Postbox::instance()->register();
Assets::instance()->register();
