<?php
/**
 * bfields demo — the Settings screen's field set.
 *
 * 3D Viewer Premium's `inc/Field/SettingsPro.php`, re-authored against the
 * sandbox key. The field ids, types, options, defaults and dependency rules are
 * the real ones, because the demo is only worth looking at if the controls it
 * renders are the controls the product renders.
 *
 * Three keys here are bfields additions that Codestar ignores — `icon`,
 * `layout`, `pro`. That is what lets ONE array serve both renderers: CSF reads
 * only the keys it knows, so a field file can carry the presentation the new UI
 * needs without the old one noticing.
 *
 * @package BFieldsDemo
 */

namespace BFieldsDemo\Fields;

use BFields\Compat\Codestar;

use const BFieldsDemo\POST_TYPE;
use const BFieldsDemo\SETTINGS_KEY;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * The 3D Viewer Settings screen.
 */
final class Settings
{
	/**
	 * Register the screen and its sections.
	 */
	public static function register(): void
	{
		Codestar::createOptions(SETTINGS_KEY, array(
			'menu_title'         => __('Settings', 'bfields-demo'),
			'menu_slug'          => 'bfields-demo-settings',
			'menu_type'          => 'submenu',
			'menu_parent'        => 'edit.php?post_type=' . POST_TYPE,
			'menu_position'      => 10,
			'framework_title'    => __('3D Viewer Settings', 'bfields-demo'),
			'save_defaults'      => true,
			'show_reset_all'     => true,
			'show_reset_section' => true,
			'show_search'        => true,
			'sticky_tabs'        => true,
			'tabs_position'      => 'left',
			'tabs_switcher'      => true,
			'resizable'          => true,
			'brand'              => array('primary' => '#1b5cf0', 'save' => '#3b52f6'),
		));

		Codestar::createSection(SETTINGS_KEY, self::general());
		Codestar::createSection(SETTINGS_KEY, self::analytics());
		Codestar::createSection(SETTINGS_KEY, self::preset());
		Codestar::createSection(SETTINGS_KEY, self::woocommerce());
		Codestar::createSection(SETTINGS_KEY, self::shortcode());
		Codestar::createSection(SETTINGS_KEY, self::selectors());
	}

	/**
	 * General Settings.
	 */
	private static function general(): array
	{
		return array(
			'title'  => __('General Settings', 'bfields-demo'),
			'icon'   => 'fas fa-cog',
			'fields' => array(
				array(
					'id'      => 'allowed_mime_types',
					'type'    => 'checkbox',
					'title'   => __('Allowed Mime Types', 'bfields-demo'),
					'desc'    => __('Select which 3D model file types can be uploaded to the media library. By default, all extended mime types are disabled.', 'bfields-demo'),
					'options' => array(
						'glb'  => 'GLB (.glb)',
						'gltf' => 'GLTF (.gltf)',
						'obj'  => 'OBJ (.obj)',
						'3ds'  => '3DS (.3ds)',
						'step' => 'STEP (.step)',
						'stl'  => 'STL (.stl)',
						'fbx'  => 'FBX (.fbx)',
						'3dml' => '3DML (.3dml)',
						'dae'  => 'DAE (.dae)',
						'wrl'  => 'WRL (.wrl)',
						'3mf'  => '3MF (.3mf)',
						'mtl'  => 'MTL (.mtl)',
						'hdr'  => 'HDR (.hdr)',
						'usdz' => 'USDZ (.usdz)',
					),
					'default' => array(),
				),
				array(
					'type'    => 'notice',
					'style'   => 'info',
					'content' => __('Extended mime types are disabled by default because WordPress refuses unknown uploads for a reason. Enable only the formats your site actually serves.', 'bfields-demo'),
				),
				array(
					'id'       => 'bp3d_loader_type',
					'type'     => 'button_set',
					'title'    => __('Loading Spinner', 'bfields-demo'),
					'subtitle' => __('Shown while a 3D model loads', 'bfields-demo'),
					'icon'     => 'loader',
					'options'  => array(
						'default' => __('Default', 'bfields-demo'),
						'image'   => __('Custom image', 'bfields-demo'),
						'none'    => __('None', 'bfields-demo'),
					),
					'default'  => 'default',
				),
				array(
					'id'           => 'bp3d_loader_image',
					'type'         => 'media',
					'title'        => __('Spinner Image', 'bfields-demo'),
					'button_title' => __('Upload Image', 'bfields-demo'),
					'library'      => 'image',
					'icon'         => 'image',
					'desc'         => __('GIF, animated WebP, SVG or PNG. The default spinner is used while this is empty.', 'bfields-demo'),
					'dependency'   => array('bp3d_loader_type', '==', 'image', 'all'),
				),
				array(
					'id'         => 'bp3d_loader_size',
					'type'       => 'number',
					'title'      => __('Spinner Size', 'bfields-demo'),
					'desc'       => __('Width of the spinner image, 24–300 px. Height follows the image.', 'bfields-demo'),
					'icon'       => 'sliders',
					'unit'       => 'px',
					'min'        => 24,
					'max'        => 300,
					'default'    => 100,
					'dependency' => array('bp3d_loader_type', '!=', 'none', 'all'),
				),
				array(
					'id'         => 'bp3d_loader_background',
					'type'       => 'color',
					'title'      => __('Spinner Background', 'bfields-demo'),
					'desc'       => __('Background of the spinner card. Use transparent for none.', 'bfields-demo'),
					'icon'       => 'palette',
					'default'    => '#ffffff',
					'dependency' => array('bp3d_loader_type', '!=', 'none', 'all'),
				),
				array(
					'id'       => 'bp3d_control_placement',
					'type'     => 'radio',
					'title'    => __('Control Placement', 'bfields-demo'),
					'subtitle' => __('Where the Zoom, Fullscreen, Camera, Reset, Dimensions and AR icons sit on the viewer', 'bfields-demo'),
					'icon'     => 'move',
					'options'  => array(
						'corners' => __('Classic corners — four fixed positions', 'bfields-demo'),
						'zones'   => __('Drag-and-drop zones — eight positions, draggable', 'bfields-demo'),
					),
					'default'  => 'corners',
				),
				array(
					'id'       => 'bp3d_control_labels',
					'type'     => 'switcher',
					'title'    => __('Control Labels', 'bfields-demo'),
					'subtitle' => __('Show a text label beside each control icon', 'bfields-demo'),
					'icon'     => 'eye',
					'default'  => false,
				),
				array(
					'id'      => 'bp3d_control_size',
					'type'    => 'slider',
					'title'   => __('Control Size', 'bfields-demo'),
					'icon'    => 'sliders',
					'unit'    => 'px',
					'min'     => 16,
					'max'     => 64,
					'step'    => 1,
					'default' => 32,
				),
				array(
					'id'       => 'delete_data_on_uninstall',
					'type'     => 'switcher',
					'title'    => __('Delete data on uninstall', 'bfields-demo'),
					'subtitle' => __('Remove every viewer, setting and analytics row when the plugin is deleted. This cannot be undone.', 'bfields-demo'),
					'layout'   => 'danger',
					'text_on'  => __('Yes', 'bfields-demo'),
					'text_off' => __('No', 'bfields-demo'),
					'default'  => false,
				),
			),
		);
	}

	/**
	 * Analytics — the section AnalyticsPro contributes to the real screen.
	 */
	private static function analytics(): array
	{
		return array(
			'title'  => __('Analytics', 'bfields-demo'),
			'icon'   => 'fas fa-chart-bar',
			'fields' => array(
				array(
					'id'       => 'analytics_enabled',
					'type'     => 'switcher',
					'title'    => __('Track viewer usage', 'bfields-demo'),
					'subtitle' => __('Counts views and interactions per viewer. No personal data is stored.', 'bfields-demo'),
					'icon'     => 'chart',
					'default'  => true,
				),
				array(
					'id'         => 'analytics_retention',
					'type'       => 'spinner',
					'title'      => __('Keep daily rows for', 'bfields-demo'),
					'subtitle'   => __('Older rows are rolled up into monthly totals.', 'bfields-demo'),
					'icon'       => 'sliders',
					'unit'       => __('days', 'bfields-demo'),
					'min'        => 30,
					'max'        => 730,
					'step'       => 30,
					'default'    => 180,
					'dependency' => array('analytics_enabled', '==', '1'),
				),
				array(
					'id'         => 'analytics_sample_rate',
					'type'       => 'slider',
					'title'      => __('Sample rate', 'bfields-demo'),
					'subtitle'   => __('Record this share of sessions. Lower it on very high-traffic sites.', 'bfields-demo'),
					'icon'       => 'chart',
					'unit'       => '%',
					'min'        => 1,
					'max'        => 100,
					'step'       => 1,
					'default'    => 100,
					'dependency' => array('analytics_enabled', '==', '1'),
				),
				array(
					'id'       => 'analytics_export',
					'type'     => 'switcher',
					'title'    => __('CSV export', 'bfields-demo'),
					'subtitle' => __('Available on the Pro licence.', 'bfields-demo'),
					'icon'     => 'save',
					'pro'      => true,
				),
			),
		);
	}

	/**
	 * Preset — the defaults every new viewer inherits.
	 */
	private static function preset(): array
	{
		return array(
			'title'  => __('Preset', 'bfields-demo'),
			'icon'   => 'fa fa-cubes',
			'fields' => array(
				array(
					'type'  => 'heading',
					'title' => __('Defaults for every new viewer', 'bfields-demo'),
				),
				array(
					'id'      => 'bp3d_preset_size',
					'type'    => 'dimensions',
					'title'   => __('Viewer Size', 'bfields-demo'),
					'icon'    => 'maximize',
					'units'   => array('px', '%', 'vw', 'vh'),
					'default' => array('width' => '100', 'height' => '500', 'unit' => 'px'),
				),
				array(
					'id'      => 'bp3d_preset_background',
					'type'    => 'color',
					'title'   => __('Background Color', 'bfields-demo'),
					'icon'    => 'palette',
					'default' => '#f5f5f5',
				),
				array(
					'id'      => 'bp3d_preset_autoplay',
					'type'    => 'switcher',
					'title'   => __('Autoplay', 'bfields-demo'),
					'icon'    => 'move',
					'default' => true,
				),
				array(
					'id'      => 'bp3d_preset_shadow',
					'type'    => 'slider',
					'title'   => __('Shadow Intensity', 'bfields-demo'),
					'icon'    => 'sliders',
					'min'     => 0,
					'max'     => 10,
					'step'    => 0.1,
					'default' => 1,
				),
				array(
					'id'      => 'bp3d_preset_loading',
					'type'    => 'radio',
					'title'   => __('Loading Type', 'bfields-demo'),
					'icon'    => 'loader',
					'options' => array(
						'auto'  => __('Auto — the browser decides', 'bfields-demo'),
						'lazy'  => __('Lazy — load when scrolled into view', 'bfields-demo'),
						'eager' => __('Eager — load immediately', 'bfields-demo'),
					),
					'default' => 'lazy',
				),
				array(
					'id'      => 'bp3d_preset_zoom',
					'type'    => 'switcher',
					'title'   => __('Enable Zoom', 'bfields-demo'),
					'icon'    => 'zoom-in',
					'default' => true,
				),
				array(
					'id'      => 'bp3d_preset_progressbar',
					'type'    => 'switcher',
					'title'   => __('Progress Bar', 'bfields-demo'),
					'icon'    => 'loader',
					'default' => true,
				),
				array(
					'id'      => 'bp3d_preset_rotate',
					'type'    => 'switcher',
					'title'   => __('Auto Rotate', 'bfields-demo'),
					'icon'    => 'move',
					'default' => false,
				),
				array(
					'id'         => 'bp3d_preset_rotate_speed',
					'type'       => 'spinner',
					'title'      => __('Auto Rotate Speed', 'bfields-demo'),
					'icon'       => 'sliders',
					'unit'       => 'deg/s',
					'min'        => 1,
					'max'        => 120,
					'step'       => 1,
					'default'    => 20,
					'dependency' => array('bp3d_preset_rotate', '==', '1'),
				),
				array(
					'id'         => 'bp3d_preset_rotate_delay',
					'type'       => 'number',
					'title'      => __('Auto Rotation Delay', 'bfields-demo'),
					'icon'       => 'sliders',
					'unit'       => 'ms',
					'default'    => 200,
					'dependency' => array('bp3d_preset_rotate', '==', '1'),
				),
				array(
					'id'      => 'bp3d_preset_fullscreen',
					'type'    => 'switcher',
					'title'   => __('Fullscreen', 'bfields-demo'),
					'icon'    => 'maximize',
					'default' => true,
				),
			),
		);
	}

	/**
	 * WooCommerce.
	 */
	private static function woocommerce(): array
	{
		return array(
			'title'  => __('WooCommerce Settings', 'bfields-demo'),
			'icon'   => 'fas fa-shopping-cart',
			'fields' => array(
				array(
					'id'       => '3d_woo_switcher',
					'type'     => 'switcher',
					'title'    => __('WooCommerce', 'bfields-demo'),
					'subtitle' => __('Show 3D models on product pages', 'bfields-demo'),
					'icon'     => 'cart',
					'default'  => false,
				),
				array(
					'type'       => 'notice',
					'style'      => 'warning',
					'content'    => __('If your theme overrides the product gallery, set the selectors on the next tab before enabling this.', 'bfields-demo'),
					'dependency' => array('3d_woo_switcher', '==', '1'),
				),
				array(
					'id'         => '3d_woo_position',
					'type'       => 'radio',
					'title'      => __('Viewer Position', 'bfields-demo'),
					'icon'       => 'move',
					'options'    => array(
						'replace' => __('Replace the product gallery', 'bfields-demo'),
						'before'  => __('Above the product gallery', 'bfields-demo'),
						'after'   => __('Below the product gallery', 'bfields-demo'),
						'tab'     => __('In its own product tab', 'bfields-demo'),
					),
					'default'    => 'replace',
					'dependency' => array('3d_woo_switcher', '==', '1'),
				),
				array(
					'id'         => '3d_woo_mobile',
					'type'       => 'button_set',
					'title'      => __('On Mobile Devices', 'bfields-demo'),
					'icon'       => 'eye',
					'options'    => array(
						'viewer' => __('3D viewer', 'bfields-demo'),
						'image'  => __('Poster image', 'bfields-demo'),
						'tap'    => __('Tap to load', 'bfields-demo'),
					),
					'default'    => 'tap',
					'dependency' => array('3d_woo_switcher', '==', '1'),
				),
				array(
					'id'         => '3d_woo_tap_text',
					'type'       => 'text',
					'title'      => __('Tap Button Text', 'bfields-demo'),
					'icon'       => 'pencil',
					'default'    => __('Tap to view in 3D', 'bfields-demo'),
					'dependency' => array('3d_woo_switcher|3d_woo_mobile', '==|==', '1|tap', 'all'),
				),
				array(
					'id'         => '3d_woo_breakpoint',
					'type'       => 'number',
					'title'      => __('Mobile Breakpoint', 'bfields-demo'),
					'icon'       => 'maximize',
					'unit'       => 'px',
					'default'    => 768,
					'dependency' => array('3d_woo_switcher', '==', '1'),
				),
				array(
					'id'         => '3d_woo_reduce_motion',
					'type'       => 'switcher',
					'title'      => __('Reduce Motion on Mobile', 'bfields-demo'),
					'icon'       => 'move',
					'default'    => true,
					'dependency' => array('3d_woo_switcher', '==', '1'),
				),
			),
		);
	}

	/**
	 * Shortcode Generator.
	 */
	private static function shortcode(): array
	{
		return array(
			'title'  => __('Shortcode Generator', 'bfields-demo'),
			'icon'   => 'fas fa-code',
			'fields' => array(
				array(
					'id'       => 'gutenberg_enabled',
					'type'     => 'switcher',
					'title'    => __('Enable Gutenberg', 'bfields-demo'),
					'subtitle' => __('Register the 3D Viewer block in the block editor', 'bfields-demo'),
					'icon'     => 'code',
					'default'  => true,
				),
				array(
					'id'       => 'shortcode_docs',
					'type'     => 'link',
					'title'    => __('Documentation link', 'bfields-demo'),
					'subtitle' => __('Shown under the generator', 'bfields-demo'),
					'icon'     => 'link',
					'default'  => array(
						'url'    => 'https://bplugins.com/docs/3d-viewer/',
						'text'   => __('Shortcode reference', 'bfields-demo'),
						'target' => '_blank',
					),
				),
				array(
					'id'       => 'shortcode_defaults',
					'type'     => 'fieldset',
					'title'    => __('Generated shortcode defaults', 'bfields-demo'),
					'subtitle' => __('Pre-filled whenever the generator writes a shortcode', 'bfields-demo'),
					'icon'     => 'layers',
					// A fieldset's blank value is built from its children's
					// BLANK values, not their defaults, so a fieldset that wants
					// seeded defaults states them here as one object — the same
					// shape it is stored in.
					'default'  => array('width' => '100%', 'height' => '500px', 'class' => ''),
					'fields'   => array(
						array(
							'id'      => 'width',
							'type'    => 'text',
							'title'   => __('Width', 'bfields-demo'),
							'default' => '100%',
						),
						array(
							'id'      => 'height',
							'type'    => 'text',
							'title'   => __('Height', 'bfields-demo'),
							'default' => '500px',
						),
						array(
							'id'      => 'class',
							'type'    => 'text',
							'title'   => __('Extra class', 'bfields-demo'),
							'default' => '',
						),
					),
				),
			),
		);
	}

	/**
	 * WooCommerce Selectors.
	 */
	private static function selectors(): array
	{
		$selectors = array(
			'woo_gallery_selector'             => array(__('Gallery Selector', 'bfields-demo'), '.woocommerce-product-gallery'),
			'woo_gallery_item_selector'        => array(__('Gallery Item Selector', 'bfields-demo'), '.woocommerce-product-gallery__image'),
			'woo_gallery_item_active_selector' => array(__('Gallery Item Active Selector', 'bfields-demo'), '.flex-active-slide'),
			'woo_gallery_thumb_selector'       => array(__('Gallery Thumbnail Item Selector', 'bfields-demo'), '.flex-control-nav li'),
			'woo_gallery_trigger_selector'     => array(__('Gallery Trigger Selector', 'bfields-demo'), '.woocommerce-product-gallery__trigger'),
		);

		$fields = array(
			array(
				'type'    => 'notice',
				'style'   => 'info',
				'content' => __('Only change these if your theme replaces the default WooCommerce gallery markup.', 'bfields-demo'),
			),
		);

		foreach ($selectors as $id => $selector) {
			$fields[] = array(
				'id'      => $id,
				'type'    => 'text',
				'title'   => $selector[0],
				'icon'    => 'code',
				'default' => $selector[1],
				// A plain text field holding the default. The placeholder
				// repeats it, so a cleared field still says what it falls back to.
				'placeholder' => $selector[1],
			);
		}

		$fields[] = array(
			'id'       => 'custom_css',
			'type'     => 'code_editor',
			'title'    => __('Custom CSS', 'bfields-demo'),
			'subtitle' => __('Loaded on every page that renders a viewer.', 'bfields-demo'),
			'icon'     => 'code',
			'default'  => '',
		);

		return array(
			'title'  => __('WooCommerce Selectors', 'bfields-demo'),
			'icon'   => 'fas fa-eye',
			'fields' => $fields,
		);
	}
}
