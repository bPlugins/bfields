<?php
/**
 * bfields demo — the single product editor's field set.
 *
 * 3D Viewer Premium's `inc/Woocommerce/ProductMetaPro.php`, re-authored against
 * the sandbox meta key: every field it registers — the `3dviewer_product_attributes`
 * model row included — with its ids, options, defaults and dependency rules,
 * regrouped into tabs the way the viewer editor's are (Fields/Viewer.php):
 *
 *   Model · Placement · Options · Style · Dimensions · Hotspots · Popups ·
 *   Preview
 *
 * Regrouping moves fields between tabs and nothing else: the meta box stores
 * one flat array keyed by id, so a field's tab is not part of its storage.
 * Rules whose controller now sits on another tab carry `'all'`.
 *
 * What ProductMetaPro.php has that this does not, and why:
 *
 *   bp3d_product_save_btn   an Update button in a `content` field. The editor
 *                           draws Save Change under every tab, a real submit
 *                           button of `#post`, like the viewer editor's.
 *   meta_heading            the Support line, kept, at the foot of Placement.
 *   shortcode               the first of two `content` fields sharing that id:
 *                           the editor's shortcode bar is it. The second (the
 *                           PHP template call) stays, on Placement, under its
 *                           own id: two fields may not share one.
 *
 * And one thing it does differently on purpose: the row's variation selects
 * are built from the product being SAVED as well as the one being shown.
 * ProductMetaPro.php reads `$_GET['post']`, which is empty on the save
 * request, so the select ids are missing from the field list that save is
 * checked against (review §5). Here the post id comes from either.
 *
 * @package BFieldsDemo
 */

namespace BFieldsDemo\Fields;

use BFields\Compat\Codestar;

use BFieldsDemo\ProductEditor;

use const BFieldsDemo\PRODUCT_KEY;
use const BFieldsDemo\SETTINGS_KEY;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * The "3D Viewer Settings" product meta box.
 */
final class Product
{
	/** ProductMetaPro.php's most common rule: no preset picked. */
	private const NO_TEMPLATE = array('bp_model_template', '==', 'none', 'all');

	/**
	 * Register the field set — on a product edit request only.
	 *
	 * That is when ProductMetaPro.php registers too, and for the same reason:
	 * the model row's selects come from the product's own variations and the
	 * Template select from a query, neither of which belongs on every request.
	 */
	public static function register(): void
	{
		if (!class_exists('WooCommerce') || !self::is_product_request()) {
			return;
		}

		if (self::switched_off()) {
			return;
		}

		$post_id  = self::post_id();
		$settings = self::settings();

		Codestar::createMetabox(PRODUCT_KEY, array(
			'framework_title' => __('3D Viewer Settings', 'bfields-demo'),
			'post_type'       => 'product',
			'show_restore'    => false,
			// A meta box in WooCommerce's main column is ~900px wide: a strip
			// of tabs over one rows card, as on the viewer editor with its tabs
			// on top. The strip sticks under the admin bar while the box
			// scrolls, and the Live Preview column under the strip.
			'sticky_tabs'     => true,
			'tabs_position'   => 'top',
			'tabs_switcher'   => false,
			// The Live Preview column's handle, as on the viewer editor. The
			// page width is WordPress's here, so there are no page handles.
			'resizable'       => true,
			'context'         => 'normal',
			// The demo prints and saves this box itself (ProductEditor.php),
			// with the viewer editor's shell; the framework's plain meta box
			// must not render it a second time.
			'render'          => false,
		));

		Codestar::createSection(PRODUCT_KEY, self::model($post_id));
		Codestar::createSection(PRODUCT_KEY, self::placement($post_id));
		Codestar::createSection(PRODUCT_KEY, self::options($settings));
		Codestar::createSection(PRODUCT_KEY, self::style());
		Codestar::createSection(PRODUCT_KEY, self::dimensions());
		Codestar::createSection(PRODUCT_KEY, self::hotspots());
		Codestar::createSection(PRODUCT_KEY, self::popups());
		Codestar::createSection(PRODUCT_KEY, self::preview());
	}

	/**
	 * 3D Viewer turns the product box off with its WooCommerce switch, and only
	 * on an explicit '0' (ProductMetaPro.php: `=== '0'`; a never-saved '' is
	 * on). Here the switch is the demo Settings screen's copy of it.
	 */
	public static function switched_off(): bool
	{
		return (self::settings()['3d_woo_switcher'] ?? '') === '0';
	}

	/** @return array<string, mixed> The demo Settings screen's values. */
	private static function settings(): array
	{
		$settings = get_option(SETTINGS_KEY, array());

		return is_array($settings) ? $settings : array();
	}

	/**
	 * Product add/edit screen, or the post.php POST that saves it — the
	 * fields have to exist for the save to be checked against them.
	 */
	private static function is_product_request(): bool
	{
		global $pagenow;

		if (!is_admin() || !in_array($pagenow, array('post.php', 'post-new.php'), true)) {
			return false;
		}

		// phpcs:disable WordPress.Security.NonceVerification -- read-only routing.
		$post_type = isset($_REQUEST['post_type']) ? sanitize_key(wp_unslash($_REQUEST['post_type'])) : '';
		// phpcs:enable

		if ('product' === $post_type) {
			return true;
		}

		$post_id = self::post_id();

		return $post_id > 0 && 'product' === get_post_type($post_id);
	}

	/**
	 * The product on screen (`?post=`) or being saved (`post_ID`).
	 */
	private static function post_id(): int
	{
		// phpcs:disable WordPress.Security.NonceVerification -- read-only routing.
		if (isset($_GET['post'])) {
			return absint(wp_unslash($_GET['post']));
		}

		return isset($_POST['post_ID']) ? absint(wp_unslash($_POST['post_ID'])) : 0;
		// phpcs:enable
	}

	/**
	 * Model — which viewer, and the product's models: one row each, with its
	 * variation, lighting, AR, real size and hotspots.
	 */
	private static function model(int $post_id): array
	{
		return array(
			'title'  => __('Model', 'bfields-demo'),
			'icon'   => 'fa fa-cube',
			// The viewer editor's Model tab, card for card.
			'layout' => 'cards',
			'fields' => array(
				array(
					'id'       => 'currentViewer',
					'type'     => 'button_set',
					'title'    => __('Viewer Mode', 'bfields-demo'),
					'subtitle' => __('Choose between Lite and Advanced viewer modes.', 'bfields-demo'),
					'desc'     => __('The Lite Viewer prioritizes .glb and .glTF files with robust features, while the Advanced Viewer supports additional file types with streamlined functionality.', 'bfields-demo'),
					'icon'     => 'layers',
					'layout'   => 'mode-grid',
					'options'  => array(
						'modelViewer' => __('Lite', 'bfields-demo'),
						'O3DViewer'   => __('Advanced', 'bfields-demo'),
					),
					'option_meta' => array(
						'modelViewer' => array(
							'icon'  => 'zap',
							'tag'   => __('Recommended', 'bfields-demo'),
							'perks' => array(__('Faster loading', 'bfields-demo'), __('Smaller size', 'bfields-demo')),
						),
						'O3DViewer' => array(
							'icon'  => 'sliders',
							'perks' => array(__('More file types', 'bfields-demo'), __('Customization', 'bfields-demo')),
						),
					),
					'default'  => 'modelViewer',
				),
				array(
					'id'           => 'bp3d_models',
					'type'         => 'group',
					'title'        => __('Product 3D Models', 'bfields-demo'),
					'subtitle'     => __('Add one model, or several: more than one is shown as a slider.', 'bfields-demo'),
					'desc'         => __('A model can be tied to a variation, so choosing that variation on the product page shows its model.', 'bfields-demo'),
					'icon'         => 'cube',
					'button_title' => __('Add New Model', 'bfields-demo'),
					'accordion_title_prefix' => __('Model', 'bfields-demo'),
					'accordion_title_number' => true,
					// Row tabs: each sub-field's `tab` starts one (modelRow()).
					'tab_icons'    => array(
						__('Model', 'bfields-demo')    => 'cube',
						__('Lighting', 'bfields-demo') => 'sun',
						__('AR', 'bfields-demo')       => 'camera',
						__('Size', 'bfields-demo')     => 'maximize',
						__('Hotspots', 'bfields-demo') => 'move',
					),
					'fields'       => self::modelRow($post_id),
					'default'      => self::legacyRows($post_id),
				),
			),
		);
	}

	/**
	 * One model row: ProductMetaPro.php's `3dviewer_product_attributes` list.
	 *
	 * The public filter is NOT applied: it is 3D Viewer's, and its callback
	 * would hand the demo the real plugin's fields. The row is authored here
	 * with the same ids and the same variation selects.
	 *
	 * Twenty-odd fields is too long to scroll through per model, so the row is
	 * in tabs — Model · Lighting · AR · Size · Hotspots. A `tab` key starts one
	 * and the fields after it follow; it is display only, so the row is stored
	 * exactly as ProductMetaPro.php stores it.
	 */
	private static function modelRow(int $post_id): array
	{
		return array_merge(
			array(
				array(
					'id'          => 'model_src',
					'type'        => 'upload',
					'tab'         => __('Model', 'bfields-demo'),
					'title'       => __('3D Source', 'bfields-demo'),
					'subtitle'    => __('Upload a model, or paste its URL. Supported file types: glb, glTF.', 'bfields-demo'),
					'placeholder' => __('Upload or paste a model URL', 'bfields-demo'),
				),
			),
			self::variationSelects($post_id),
			array(
				array(
					'id'      => 'model-viewer-note',
					'type'    => 'submessage',
					'style'   => 'warning',
					'content' => '<strong>' . esc_html__('Lite Viewer only', 'bfields-demo') . '</strong> &mdash; '
						. esc_html__('the poster below and everything on the other tabs is ignored by the Advanced Viewer.', 'bfields-demo'),
				),
				array(
					'id'          => 'poster_src',
					'type'        => 'upload',
					'title'       => __('3D Poster', 'bfields-demo'),
					'subtitle'    => __('Shown while the model loads.', 'bfields-demo'),
					'placeholder' => __('Upload or paste an image URL', 'bfields-demo'),
				),
				array(
					'id'          => 'environment_image_src',
					'type'        => 'upload',
					'tab'         => __('Lighting', 'bfields-demo'),
					'title'       => __('Environment Image', 'bfields-demo'),
					'subtitle'    => __('Improves lighting and reflections on the model.', 'bfields-demo'),
					'placeholder' => __('Upload or paste an image URL', 'bfields-demo'),
				),
				array(
					'id'          => 'skybox_image_src',
					'type'        => 'upload',
					'title'       => __('Skybox Image', 'bfields-demo'),
					'subtitle'    => __('The background behind the model, which also lights it.', 'bfields-demo'),
					'placeholder' => __('Upload or paste an image URL', 'bfields-demo'),
				),
				array(
					'id'       => 'exposure',
					'type'     => 'slider',
					'title'    => __('Exposure', 'bfields-demo'),
					'subtitle' => __('Brightness of the model. 1 is the default.', 'bfields-demo'),
					'min'      => 0.1,
					'max'      => 10,
					'step'     => 0.1,
					'default'  => 1,
				),
				array(
					'id'       => 'enable_ar',
					'type'     => 'switcher',
					'tab'      => __('AR', 'bfields-demo'),
					'title'    => __('Enable AR', 'bfields-demo'),
					'subtitle' => __('Let visitors place the model in their own room on supported devices.', 'bfields-demo'),
				),
				array(
					'id'          => 'model_iso_src',
					'type'        => 'upload',
					'title'       => __('3D Source for iOS (Optional)', 'bfields-demo'),
					'subtitle'    => __('The .usdz file Apple devices use for AR.', 'bfields-demo'),
					'placeholder' => __('Upload or paste a model URL', 'bfields-demo'),
					'dependency'  => array('enable_ar', '==', '1'),
				),
				array(
					'id'         => 'ar_placement',
					'type'       => 'button_set',
					'title'      => __('AR Placement', 'bfields-demo'),
					'subtitle'   => __('On the floor, or hung on a wall.', 'bfields-demo'),
					'options'    => array(
						'floor' => __('Floor', 'bfields-demo'),
						'wall'  => __('Wall', 'bfields-demo'),
					),
					'default'    => 'floor',
					'dependency' => array('enable_ar', '==', '1'),
				),
				array(
					'id'         => 'ar_mode',
					'type'       => 'button_set',
					'title'      => __('AR Mode', 'bfields-demo'),
					'subtitle'   => __('Quick Look is for iOS; the others run AR on supported Android devices.', 'bfields-demo'),
					'options'    => array(
						'webxr'        => __('WebXR', 'bfields-demo'),
						'scene-viewer' => __('Scene Viewer', 'bfields-demo'),
						'quick-look'   => __('Quick Look', 'bfields-demo'),
					),
					'default'    => 'webxr',
					'dependency' => array('enable_ar', '==', '1'),
				),
				array(
					'id'       => 'real_size',
					'type'     => 'fieldset',
					'tab'      => __('Size', 'bfields-demo'),
					'title'    => __('Real Size (Optional)', 'bfields-demo'),
					'subtitle' => __('Only if this 3D file was exported at the wrong scale', 'bfields-demo'),
					'desc'     => __("Fill one axis and the others scale to match. Leave empty to use the product's own dimensions when the Dimensions tab allows it. Changes the labels only — not the model, and not its size in AR.", 'bfields-demo'),
					'fields'   => Viewer::realSize(),
				),
				array(
					'id'           => 'hotspots',
					'type'         => 'group',
					'tab'          => __('Hotspots', 'bfields-demo'),
					'title'        => __('Hotspots', 'bfields-demo'),
					'subtitle'     => __('Add hotspots to your 3D model.', 'bfields-demo'),
					'button_title' => __('Add Hotspot', 'bfields-demo'),
					'accordion_title_prefix' => __('Hotspot', 'bfields-demo'),
					'accordion_title_number' => true,
					// The viewer's hotspot row: HotspotFields::fields() is
					// the same list on both screens.
					'fields'       => Viewer::hotspot(),
				),
				array(
					'id'          => 'initial_view',
					'type'        => 'text',
					'title'       => __('Initial View', 'bfields-demo'),
					'subtitle'    => __('Paste the Initial View JSON copied from the Visual Editor: the camera angle the model opens at.', 'bfields-demo'),
					'placeholder' => __('Paste here Initial View JSON data', 'bfields-demo'),
					'default'     => '[]',
				),
				array(
					'id'      => 'invalid',
					'type'    => 'content',
					'content' => '<p>' . esc_html__('Use the Visual Editor to add and position hotspots on your 3D model in a visual interface.', 'bfields-demo') . '</p>'
						. '<a class="button button-primary" target="_blank" rel="noopener" href="' . esc_url(admin_url('admin.php?page=3d-viewer-visual-editor')) . '">'
						. esc_html__('Open Visual Editor', 'bfields-demo') . '</a>',
				),
			)
		);
	}

	/**
	 * One select per variation attribute with more than one value, as
	 * ProductMetaPro.php's filter builds them. The id is the attribute key
	 * itself (`attribute_pa_color`) — the plugin's front end reads it by that
	 * name ("very sensitive").
	 */
	private static function variationSelects(int $post_id): array
	{
		$product = $post_id > 0 && function_exists('wc_get_product') ? wc_get_product($post_id) : null;

		if (!$product || !method_exists($product, 'get_available_variations')) {
			return array();
		}

		$variations = $product->get_available_variations();

		if (!$variations) {
			return array();
		}

		$list = wp_list_pluck($variations, 'attributes');
		$keys = $list && is_array($list[0]) ? array_keys($list[0]) : array();
		$out  = array();

		foreach ($keys as $key) {
			$values = wp_list_pluck($list, $key);

			if (!is_array($values) || count($values) < 2) {
				continue;
			}

			$options = array('all' => __('All', 'bfields-demo'));

			foreach ($values as $value) {
				$value = trim((string) $value);

				if ('' !== $value) {
					$options[str_replace(' ', '-', $value)] = $value;
				}
			}

			$out[] = array(
				'id'       => $key,
				'type'     => 'select',
				/* translators: %s: variation attribute name, e.g. "pa_color". */
				'title'    => sprintf(__('Select %s', 'bfields-demo'), str_replace('attribute_', '', $key)),
				'subtitle' => __('Show this model for one value of the attribute. The slider should be off.', 'bfields-demo'),
				'options'  => $options,
				'default'  => 'all',
			);
		}

		return $out;
	}

	/**
	 * A product configured under the free plugin keeps its model flat
	 * (`bp3d_model_src` / `bp3d_poster_src`). ProductMetaPro.php surfaces it
	 * as the group's default, so it shows here and the next save writes the
	 * row shape (Product::legacyFreeModelRows()). A default is only used when
	 * the key is absent, so a saved list is never overridden.
	 */
	private static function legacyRows(int $post_id): array
	{
		$meta = $post_id > 0 ? get_post_meta($post_id, PRODUCT_KEY, true) : array();
		$meta = is_array($meta) ? $meta : array();

		if (!empty($meta['bp3d_models'])) {
			return array();
		}

		$url = static function ($value): string {
			if (is_array($value)) {
				$value = $value['url'] ?? '';
			}

			return is_string($value) ? trim($value) : '';
		};

		$src = $url($meta['bp3d_model_src'] ?? '');

		if ('' === $src) {
			return array();
		}

		return array(array(
			'model_src'  => $src,
			'poster_src' => $url($meta['bp3d_poster_src'] ?? ''),
		));
	}

	/**
	 * Placement — where the viewer goes on the product page, in the shop and
	 * in a theme template, and whether a preset decides the rest.
	 */
	private static function placement(int $post_id): array
	{
		$shortcode = ProductEditor::shortcode($post_id);

		return array(
			'title'  => __('Placement', 'bfields-demo'),
			'icon'   => 'shop',
			'fields' => array(
				array(
					'id'       => 'viewer_position',
					'type'     => 'radio',
					'title'    => __('3D Viewer Position', 'bfields-demo'),
					'subtitle' => __('Where the viewer sits on the product page.', 'bfields-demo'),
					'icon'     => 'layers',
					// Six long labels do not fit an inline radio beside the
					// row's copy; the mode grid gives each a card, as for
					// the viewer's Default Hotspot Style.
					'layout'   => 'mode-grid',
					'options'  => array(
						'none'                   => __('None', 'bfields-demo'),
						'top'                    => __('Top of the product image', 'bfields-demo'),
						'bottom'                 => __('Bottom of the product image', 'bfields-demo'),
						'replace'                => __('Replace Product Image with 3D', 'bfields-demo'),
						'merge_with_first_image' => __('Show 3D on First Image of Woocommerce Gallery', 'bfields-demo'),
						'tab'                    => __('Dedicated Tab', 'bfields-demo'),
					),
					'default'  => 'none',
				),
				array(
					'id'       => 'bp_model_template',
					'type'     => 'select',
					'title'    => __('Template/Preset', 'bfields-demo'),
					'subtitle' => __('A saved preset sets the look; the Options, Style and Hotspots tabs apply only with None.', 'bfields-demo'),
					'icon'     => 'preset',
					'options'  => self::templates(),
					// ProductMetaPro.php sets no default, so CSF stores the
					// first option: None.
					'default'  => 'none',
				),
				array(
					'id'       => 'replace_model_with_thumbnail',
					'type'     => 'switcher',
					'title'    => __('3D Icon in the Shop', 'bfields-demo'),
					'subtitle' => __('Show a 3D icon on this product in shop pages and product listings, to open its model.', 'bfields-demo'),
					'icon'     => 'cube',
					'default'  => false,
				),
				array(
					'id'       => 'show_model_instead_thumbnail',
					'type'     => 'switcher',
					'title'    => __('3D Model in the Shop', 'bfields-demo'),
					'subtitle' => __('Show the model itself instead of the thumbnail in shop pages and product listings.', 'bfields-demo'),
					'icon'     => 'image',
					'default'  => false,
				),
				array(
					// A `content` row draws its HTML only, so the title is in it.
					'id'      => 'template_shortcode',
					'type'    => 'content',
					'content' => '<p><strong>' . esc_html__('Template Shortcode', 'bfields-demo') . '</strong> &mdash; '
						. esc_html__('for a theme template. Outside PHP, paste the shortcode above in the product description instead.', 'bfields-demo') . '</p>'
						. '<p><code>&lt;?php echo do_shortcode(\'[bfields_demo_product id=\' . get_the_ID() . \']\'); ?&gt;</code></p>'
						. '<p>' . esc_html__('or, for this product only:', 'bfields-demo') . '</p>'
						. '<p><code>&lt;?php echo do_shortcode(\'' . esc_html($shortcode) . '\'); ?&gt;</code></p>',
				),
				array(
					'id'      => 'meta_heading',
					'type'    => 'content',
					'content' => '<p><strong>' . esc_html__('Support', 'bfields-demo') . '</strong> &mdash; '
						. esc_html__('Please leave a message if you encounter any issues on the product page.', 'bfields-demo') . ' '
						. '<a href="https://bplugins.com/support" target="_blank" rel="noopener">' . esc_html__('Support Center', 'bfields-demo') . '</a></p>',
				),
			),
		);
	}

	/**
	 * Published 3D Viewer presets, as ProductMetaPro.php lists them. Read-only:
	 * the demo only offers them, and a preset id is all it stores.
	 *
	 * @return array<string, string>
	 */
	private static function templates(): array
	{
		$options = array('none' => __('None', 'bfields-demo'));

		foreach (get_posts(array(
			'post_type'      => 'bp3d-preset',
			'post_status'    => 'publish',
			'posts_per_page' => 100,
			'no_found_rows'  => true,
		)) as $preset) {
			$options[(string) $preset->ID] = wp_specialchars_decode(get_the_title($preset), ENT_QUOTES);
		}

		return $options;
	}

	/**
	 * Options — the viewer's own controls.
	 *
	 * @param array<string, mixed> $settings The demo Settings screen's values.
	 */
	private static function options(array $settings): array
	{
		return array(
			'title'  => __('Options', 'bfields-demo'),
			'icon'   => 'fa fa-cog',
			'fields' => array(
				self::presetNotice(),
				array(
					'id'         => 'show_thumbs',
					'type'       => 'switcher',
					'title'      => __('Show Thumbnail List', 'bfields-demo'),
					'subtitle'   => __('A strip of thumbnails under the viewer. Needs more than one model.', 'bfields-demo'),
					'icon'       => 'grid',
					'default'    => false,
					'dependency' => array('bp_model_template|viewer_position', '==|!=', 'none|merge_with_first_image', 'all'),
				),
				array(
					'id'         => 'bp_3d_zooming',
					'type'       => 'switcher',
					'title'      => __('Enable Zoom', 'bfields-demo'),
					'subtitle'   => __('Let visitors zoom the model. Moving controls have to be on for it to work.', 'bfields-demo'),
					'icon'       => 'zoom-in',
					// ProductMetaPro.php starts a product on the site-wide
					// setting, which here is the demo Settings screen's.
					'default'    => ($settings['bp_3d_zooming'] ?? '1') == '1', // phpcs:ignore Universal.Operators.StrictComparisons -- as ProductMetaPro.php.
					'dependency' => self::NO_TEMPLATE,
				),
				array(
					'id'         => 'show_arrows',
					'type'       => 'switcher',
					'title'      => __('Show Arrows', 'bfields-demo'),
					'subtitle'   => __('Previous and next arrows on the viewer. Needs more than one model.', 'bfields-demo'),
					'icon'       => 'move',
					'default'    => false,
					'dependency' => self::NO_TEMPLATE,
				),
			),
		);
	}

	/**
	 * Style — the viewer's height and background.
	 */
	private static function style(): array
	{
		return array(
			'title'  => __('Style', 'bfields-demo'),
			'icon'   => 'fa fa-paint-brush',
			'fields' => array(
				self::presetNotice(),
				array(
					'id'         => 'bp_3d_height',
					'type'       => 'dimensions',
					'title'      => __('Height', 'bfields-demo'),
					'subtitle'   => __('Used where the height cannot be worked out, as in a shortcode. Elsewhere it adjusts on its own.', 'bfields-demo'),
					'icon'       => 'maximize',
					'units'      => array('px', 'em', 'pt'),
					'default'    => array('height' => '320', 'unit' => 'px'),
					'width'      => false,
					'dependency' => self::NO_TEMPLATE,
				),
				array(
					'id'         => 'bp_model_bg',
					'type'       => 'color',
					'title'      => __('Background Color', 'bfields-demo'),
					'subtitle'   => __('Behind the model.', 'bfields-demo'),
					'icon'       => 'palette',
					'default'    => 'transparent',
					'dependency' => self::NO_TEMPLATE,
				),
			),
		);
	}

	/**
	 * Dimensions — real-world width, height and depth lines, per product.
	 */
	private static function dimensions(): array
	{
		return array(
			'title'  => __('Dimensions', 'bfields-demo'),
			'icon'   => 'maximize',
			'fields' => array(
				array(
					'type'       => 'notice',
					'style'      => 'info',
					'content'    => __('Dimension lines are drawn by the Lite Viewer only.', 'bfields-demo'),
					'dependency' => array('currentViewer', '==', 'O3DViewer', 'all'),
				),
				array(
					'id'         => 'bp_3d_dimensions_mode',
					'type'       => 'button_set',
					'title'      => __('Show Dimensions', 'bfields-demo'),
					'subtitle'   => __("Real-world width, height and depth lines on the model, in the store's dimension unit.", 'bfields-demo'),
					'icon'       => 'maximize',
					'options'    => array(
						'off'    => __('Off', 'bfields-demo'),
						'button' => __('Ruler button', 'bfields-demo'),
						'always' => __('Always on', 'bfields-demo'),
					),
					'default'    => 'off',
					'dependency' => array('currentViewer', '==', 'modelViewer', 'all'),
				),
				array(
					'id'         => 'bp_3d_dimensions_source',
					'type'       => 'button_set',
					'title'      => __('Dimensions Come From', 'bfields-demo'),
					'subtitle'   => __("This product's shipping dimensions, or measured from the 3D file. A model's Real Size always wins.", 'bfields-demo'),
					'icon'       => 'sliders',
					'options'    => array(
						'product' => __('Product dimensions', 'bfields-demo'),
						'model'   => __('Measured from the model', 'bfields-demo'),
					),
					'default'    => 'product',
					'dependency' => array('bp_3d_dimensions_mode', '!=', 'off', 'all'),
				),
				array(
					'id'         => 'bp_3d_dimension_color',
					'type'       => 'color',
					'title'      => __('Dimension Line Colour', 'bfields-demo'),
					'subtitle'   => __('Lines, corner dots and label text. Leave empty for the default.', 'bfields-demo'),
					'icon'       => 'palette',
					'default'    => '',
					'dependency' => array('bp_3d_dimensions_mode', '!=', 'off', 'all'),
				),
			),
		);
	}

	/**
	 * Hotspots — how every model's hotspots look by default. The hotspots
	 * themselves are per model, in the rows on Model.
	 */
	private static function hotspots(): array
	{
		return array(
			'title'  => __('Hotspots', 'bfields-demo'),
			'icon'   => 'move',
			'fields' => array(
				self::presetNotice(),
				array(
					'type'    => 'notice',
					'style'   => 'info',
					'content' => __('Each model sets its own hotspots: open it in the list on the Model tab.', 'bfields-demo'),
				),
				array(
					'id'         => 'hotspot_style',
					'type'       => 'button_set',
					'title'      => __('Default Hotspot Style', 'bfields-demo'),
					'subtitle'   => __('The starting look for every hotspot on this product. Any hotspot can override it with its own Display and Pin Icon.', 'bfields-demo'),
					'icon'       => 'palette',
					'layout'     => 'mode-grid',
					'options'    => array(
						'style-1' => __('Simple Tag (Text Only)', 'bfields-demo'),
						'style-2' => __('Always Visible Card', 'bfields-demo'),
						'style-3' => __('Hover Popup Card', 'bfields-demo'),
						'style-4' => __('Minimal Icon Badge', 'bfields-demo'),
					),
					'default'    => 'style-1',
					'dependency' => self::NO_TEMPLATE,
				),
				...Viewer::pinStyle(self::NO_TEMPLATE),
			),
		);
	}

	/**
	 * Popups — models that open in a popup from something already on the
	 * page: an image, or any element a selector matches.
	 */
	private static function popups(): array
	{
		return array(
			'title'  => __('Popups', 'bfields-demo'),
			'icon'   => 'external-link',
			'fields' => array(
				array(
					'id'           => 'bp3d_popup_models',
					'type'         => 'group',
					'title'        => __('Popup 3D Models', 'bfields-demo'),
					'subtitle'     => __('Clicking the matched element opens its model in a popup.', 'bfields-demo'),
					'icon'         => 'external-link',
					'button_title' => __('Add New Model', 'bfields-demo'),
					'accordion_title_prefix' => __('Popup', 'bfields-demo'),
					'accordion_title_number' => true,
					'fields'       => array(
						array(
							'id'          => 'selector',
							'type'        => 'text',
							'title'       => __('Selector', 'bfields-demo'),
							'subtitle'    => __('An image URL, or a CSS selector such as a class or an id.', 'bfields-demo'),
							'placeholder' => __('Class, ID, Image SRC', 'bfields-demo'),
						),
						array(
							'id'       => 'popupCurrentViewer',
							'type'     => 'button_set',
							'title'    => __('Viewer', 'bfields-demo'),
							'subtitle' => __('Lite for GLB/glTF, Advanced for other formats.', 'bfields-demo'),
							'options'  => array(
								'modelViewer' => __('Lite', 'bfields-demo'),
								'O3DViewer'   => __('Advanced', 'bfields-demo'),
							),
							'default'  => 'modelViewer',
						),
						array(
							'id'          => 'model_src',
							'type'        => 'upload',
							'title'       => __('3D Model Source', 'bfields-demo'),
							'subtitle'    => __('Upload a model, or paste its URL. Supported file types: glb, glTF.', 'bfields-demo'),
							'placeholder' => __('Upload or paste a model URL', 'bfields-demo'),
						),
						array(
							'id'          => 'poster_src',
							'type'        => 'upload',
							'title'       => __('3D Poster', 'bfields-demo'),
							'subtitle'    => __('Shown while the model loads.', 'bfields-demo'),
							'placeholder' => __('Upload or paste an image URL', 'bfields-demo'),
						),
						array(
							'id'          => 'environment_image_src',
							'type'        => 'upload',
							'title'       => __('Environment Image', 'bfields-demo'),
							'subtitle'    => __('Lighting and reflections (Lite Viewer).', 'bfields-demo'),
							'placeholder' => __('Upload or paste an image URL', 'bfields-demo'),
						),
						array(
							'id'          => 'skybox_image_src',
							'type'        => 'upload',
							'title'       => __('Skybox Image', 'bfields-demo'),
							'subtitle'    => __('The background behind the model.', 'bfields-demo'),
							'placeholder' => __('Upload or paste an image URL', 'bfields-demo'),
						),
						array(
							'id'          => 'target',
							'type'        => 'text',
							'title'       => __('Target', 'bfields-demo'),
							'subtitle'    => __("Leave it empty. It's used in special cases.", 'bfields-demo'),
							'placeholder' => __('Target', 'bfields-demo'),
						),
					),
				),
			),
		);
	}

	/**
	 * Preview — a `callback` field, which the editor draws as the stage card.
	 */
	private static function preview(): array
	{
		return array(
			'title'  => __('Preview', 'bfields-demo'),
			'icon'   => 'fas fa-eye',
			'fields' => array(
				array(
					'type'     => 'callback',
					'function' => static function (): void {
						// See Viewer::preview(): the shell draws the stage
						// card for a section holding a `callback`.
						echo '<div class="bfields-demo-stage-mount"></div>';
					},
				),
			),
		);
	}

	/** Shown on the tabs a preset takes over. */
	private static function presetNotice(): array
	{
		return array(
			'type'       => 'notice',
			'style'      => 'info',
			'content'    => __('A preset is picked on the Placement tab, so it decides these settings.', 'bfields-demo'),
			'dependency' => array('bp_model_template', '!=', 'none', 'all'),
		);
	}
}
