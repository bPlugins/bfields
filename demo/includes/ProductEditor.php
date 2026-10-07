<?php
/**
 * bfields demo — the "3D Viewer Settings" box on WooCommerce's product screen.
 *
 * The viewer editor's principle, on a screen the demo does not own. The field
 * set is registered with `'render' => false` (Fields/Product.php), and the
 * demo prints and saves it itself with the viewer editor's pieces: the same
 * mount node, mirror field, nonce and save handler (Metabox.php), and the same
 * React shell (demo/ui/layout/EditorShell.tsx) drawing the design's shortcode
 * bar, tab strip, rows card, Live Preview and stage card.
 *
 * WHAT IS DIFFERENT, AND WHY. Add New is the demo's own post type, so the
 * shell takes the whole screen. This screen is WooCommerce's: the product's
 * title, description, Product data and Publish box are the product, and none
 * of them is hidden. So the shell draws into one ordinary meta box in the
 * main column — shortcode bar, tabs, the section and, beside it, the Live
 * Preview card, as on Add New — and leaves the title and Publish to WordPress. Save Change under each tab
 * is a `name="save"` submit button of `#post`, which is what WordPress's own
 * Update / Save Draft sends, so the request, the redirect and the "Product
 * updated." notice are WordPress's.
 *
 * Nothing is hidden, so nothing needs handing back if the bundle fails: the
 * boxes stay empty and the pre-filled mirror field makes Update a no-op for
 * this key.
 *
 * @package BFieldsDemo
 */

namespace BFieldsDemo;

use BFields\Registry;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Adds, renders and saves the demo product boxes.
 */
final class ProductEditor
{
	/** The main-column box. */
	const BOX = 'bfields_demo_product';

	/** @var ProductEditor|null */
	private static $instance = null;

	public static function instance(): ProductEditor
	{
		if (self::$instance === null) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function register(): void
	{
		if (!is_admin()) {
			return;
		}

		add_action('add_meta_boxes_product', array($this, 'add_boxes'));
		add_action('save_post_product', array($this, 'save'), 10, 2);
	}

	/**
	 * Whether the field set is registered on this request: WooCommerce is
	 * active, this is a product edit request, and the demo Settings screen
	 * has not switched the WooCommerce viewer off.
	 */
	public static function active(): bool
	{
		return Registry::instance()->has(PRODUCT_KEY);
	}

	public function add_boxes(): void
	{
		if (!self::active()) {
			// Switched off on the demo Settings screen, as 3D Viewer's
			// WooCommerce switch turns off its box. The real plugin then shows
			// nothing; a demo that shows nothing looks broken, so it says why.
			if (class_exists('WooCommerce') && Fields\Product::switched_off()) {
				add_meta_box(
					self::BOX,
					__('3D Viewer Settings — bfields demo', 'bfields-demo'),
					array($this, 'render_off'),
					'product',
					'normal',
					'high'
				);
			}

			return;
		}

		add_meta_box(
			self::BOX,
			__('3D Viewer Settings — bfields demo', 'bfields-demo'),
			array($this, 'render'),
			'product',
			'normal',
			'high'
		);

	}

	public function render(\WP_Post $post): void
	{
		if (!Metabox::instance()->print_root($post, PRODUCT_KEY)) {
			return;
		}

		echo '<noscript><p class="bfields-demo-noscript">';
		esc_html_e('This box needs JavaScript. Your saved 3D settings are unchanged when you update the product.', 'bfields-demo');
		echo '</p></noscript>';
	}

	public function render_off(): void
	{
		printf(
			'<p>%1$s <a href="%2$s">%3$s</a></p>',
			esc_html__('The WooCommerce viewer is switched off in the demo settings, so this product has no 3D settings.', 'bfields-demo'),
			esc_url(admin_url('edit.php?post_type=' . POST_TYPE . '&page=bfields-demo-settings#tab=woocommerce-settings')),
			esc_html__('Turn it on', 'bfields-demo')
		);
	}

	/**
	 * @param int      $post_id Post being saved.
	 * @param \WP_Post $post    The post object.
	 */
	public function save(int $post_id, \WP_Post $post): void
	{
		if ('product' !== $post->post_type || !self::active()) {
			return;
		}

		Metabox::instance()->save_root($post_id, PRODUCT_KEY);
	}

	/**
	 * The shortcode for a product. Deliberately not `3d_viewer_product`:
	 * pasting a demo shortcode into a real page must render nothing rather
	 * than a viewer built from sandbox data.
	 */
	public static function shortcode(int $post_id): string
	{
		return sprintf('[bfields_demo_product id="%d"]', $post_id);
	}
}
