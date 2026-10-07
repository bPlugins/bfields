<?php
/**
 * bfields demo — the viewer editor's field set.
 *
 * 3D Viewer Premium's `inc/Field/ViewerPro.php`, re-authored against the
 * sandbox meta key: every field it registers, with its ids, options, defaults
 * and dependency rules, regrouped into the twelve tabs the Elementor and
 * Gutenberg panels use:
 *
 *   Model · Lighting & Environment · AR · Options · Advanced Viewer · Mobile ·
 *   Controls · Dimensions · Hotspots · Style · Additional · Preview
 *
 * Regrouping moves fields between tabs and nothing else — the meta box stores
 * one flat array keyed by id, so a field's tab is not part of its storage.
 * What it does change is reach: a rule without Codestar's `'all'` flag only
 * sees controllers in its own section, so every field whose controller now
 * lives on another tab carries `'all'` (ViewerPro.php already set it on all
 * of them but three, and those three stay beside their controller on Model).
 *
 * Multiple-models mode keeps its per-model lighting, AR, real size and
 * hotspots inside the model rows on Model: moving them out would change how
 * they are stored. The Lighting, AR, Dimensions and Hotspots tabs are the
 * single model's, and say so with a notice in the modes they do not apply to,
 * because a tab cannot hide itself.
 *
 * Rows the design draws (Figma "Model (1)"–"(3)") keep the design's copy and
 * icons; everything else takes ViewerPro.php's. The Decoder card and Padding
 * row have no ViewerPro field: the first is drawn by the design, the second is
 * the one `spacing` field, so that stand-in has a screen to render on.
 *
 * @package BFieldsDemo
 */

namespace BFieldsDemo\Fields;

use BFields\Compat\Codestar;

use const BFieldsDemo\POST_TYPE;
use const BFieldsDemo\VIEWER_KEY;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * The "3D Viewer Settings" meta box.
 */
final class Viewer
{
	/** Shown on the single-model tabs while the viewer cycles several models. */
	private const SINGLE_ONLY = array('bp_3d_model_type', '==', 'mcycle', 'all');

	/** Shown on the Lite-only tabs while the Advanced Viewer is picked. */
	private const ADVANCED = array('currentViewer', '==', 'O3DViewer', 'all');

	/** The single model on the Lite Viewer: ViewerPro.php's most common rule. */
	private const SINGLE_LITE = array('bp_3d_model_type|currentViewer', '==|==', 'msimple|modelViewer', 'all');

	public static function register(): void
	{
		Codestar::createMetabox(VIEWER_KEY, array(
			'framework_title' => __('3D Viewer Settings', 'bfields-demo'),
			'post_type'       => POST_TYPE,
			'show_restore'    => false,
			'sticky_tabs'     => true,
			'tabs_position'   => 'left',
			'tabs_switcher'   => true,
			'resizable'       => true,
			'context'         => 'normal',
			// The demo prints and saves this screen itself (Metabox.php), as
			// the design's full-screen editor; the framework's plain meta box
			// must not render it a second time.
			'render'          => false,
		));

		Codestar::createSection(VIEWER_KEY, self::model());
		Codestar::createSection(VIEWER_KEY, self::lighting());
		Codestar::createSection(VIEWER_KEY, self::ar());
		Codestar::createSection(VIEWER_KEY, self::options());
		Codestar::createSection(VIEWER_KEY, self::advanced());
		Codestar::createSection(VIEWER_KEY, self::mobile());
		Codestar::createSection(VIEWER_KEY, self::controls());
		Codestar::createSection(VIEWER_KEY, self::dimensions());
		Codestar::createSection(VIEWER_KEY, self::hotspots());
		Codestar::createSection(VIEWER_KEY, self::style());
		Codestar::createSection(VIEWER_KEY, self::additional());
		Codestar::createSection(VIEWER_KEY, self::preview());
	}

	/**
	 * A notice for a tab whose fields are all hidden in some mode.
	 *
	 * @param array<int, string> $dependency
	 */
	private static function notice(string $content, array $dependency): array
	{
		return array(
			'type'       => 'notice',
			'style'      => 'info',
			'content'    => $content,
			'dependency' => $dependency,
		);
	}

	/**
	 * Model — which viewer, which file, the poster(s), the cycle list and the
	 * initial view.
	 */
	private static function model(): array
	{
		return array(
			'title'  => __('Model', 'bfields-demo'),
			'icon'   => 'fa fa-cube',
			// The design draws this tab as cards, not rows: icon, title and
			// description stacked at the top of a bordered card, the control
			// full width beneath, the long sentence under that. The schema has
			// named both idioms on a section since v1.
			'layout' => 'cards',
			'fields' => array(
				array(
					'id'       => 'currentViewer',
					'type'     => 'button_set',
					'title'    => __('Viewer Mode', 'bfields-demo'),
					'subtitle' => __('Choose between Lite and Advanced viewer modes.', 'bfields-demo'),
					'icon'     => 'layers',
					// `mode-grid` is the layout Schema.php maps to the `cards`
					// presentation; `option_meta` is the per-option chrome the
					// design gives each card. Codestar reads neither.
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
							'perks' => array(__('More features', 'bfields-demo'), __('Customization', 'bfields-demo')),
						),
					),
					'default'  => 'modelViewer',
				),
				array(
					'id'       => 'bp_3d_model_type',
					'type'     => 'button_set',
					'title'    => __('Model Type', 'bfields-demo'),
					'subtitle' => __('One model, or a list the viewer cycles through', 'bfields-demo'),
					'icon'     => 'layers',
					'options'  => array(
						'msimple' => __('Simple', 'bfields-demo'),
						'mcycle'  => __('Cycle', 'bfields-demo'),
					),
					'default'  => 'msimple',
				),
				array(
					'id'         => 'bp_3d_src_type',
					'type'       => 'button_set',
					'title'      => __('Model Source Type', 'bfields-demo'),
					'icon'       => 'image',
					'options'    => array(
						'upload' => __('Upload', 'bfields-demo'),
						'link'   => __('Link', 'bfields-demo'),
					),
					'default'    => 'upload',
					'dependency' => array('bp_3d_model_type', '==', 'msimple'),
				),
				array(
					'id'           => 'bp_3d_src',
					'type'         => 'upload',
					'title'        => __('3D Source', 'bfields-demo'),
					'subtitle'     => __('Select the source URL or upload a 3D model file.', 'bfields-demo'),
					'desc'         => __('Or upload a file from your media library. You can also use a direct URL to your 3D model.', 'bfields-demo'),
					'button_title' => __('Upload Source', 'bfields-demo'),
					'placeholder'  => 'https://example.com/model.glb',
					'icon'         => 'link',
					'dependency'   => array('bp_3d_model_type|bp_3d_src_type', '==|==', 'msimple|upload', 'all'),
				),
				array(
					'id'          => 'bp_3d_src_link',
					'type'        => 'text',
					'title'       => __('3D Source', 'bfields-demo'),
					'subtitle'    => __('Paste a valid model URL', 'bfields-demo'),
					'icon'        => 'link',
					'placeholder' => 'https://example.com/model.glb',
					'dependency'  => array('bp_3d_model_type|bp_3d_src_type', '==|==', 'msimple|link', 'all'),
				),
				array(
					// Drawn by the design; ViewerPro.php has no decoder field.
					'id'           => 'bp_3d_decoder',
					'type'         => 'select',
					'title'        => __('Decoder', 'bfields-demo'),
					'subtitle'     => __('Choose a decoder to decode the 3D model.', 'bfields-demo'),
					'desc'         => __('Select a decoder if your 3D model requires one (e.g., Draco, KTX).', 'bfields-demo'),
					'icon'         => 'terminal',
					'options'      => array(
						''      => __('None', 'bfields-demo'),
						'draco' => 'Draco',
						'ktx'   => 'KTX',
					),
					'default'      => '',
					'dependency'   => array('bp_3d_model_type', '==', 'msimple'),
				),
				array(
					'id'           => 'bp_3d_poster',
					'type'         => 'media',
					'title'        => __('Poster Image', 'bfields-demo'),
					'subtitle'     => __('Display a poster image until the model is loaded.', 'bfields-demo'),
					'button_title' => __('Upload Poster', 'bfields-demo'),
					'library'      => 'image',
					'icon'         => 'image',
					'placeholder'  => __('Recommended size: 800 × 600px (JPG, PNG)', 'bfields-demo'),
					'dependency'   => array('bp_3d_model_type', '==', 'msimple', 'all'),
				),
				array(
					'id'           => 'bp_3d_models',
					'type'         => 'group',
					'title'        => __('3D Cycle Models', 'bfields-demo'),
					'subtitle'     => __('Cycling between 3D models', 'bfields-demo'),
					'desc'         => __('Use Multiple Model in a row.', 'bfields-demo'),
					'button_title' => __('Add New Model', 'bfields-demo'),
					'icon'         => 'layers',
					// The accordion row title. Codestar reads both keys; the
					// demo's Repeater reads them through the schema's props.
					'accordion_title_prefix' => __('Model', 'bfields-demo'),
					'accordion_title_number' => true,
					'dependency'   => array('bp_3d_model_type', '==', 'mcycle'),
					'fields'       => self::cycleModel(),
				),
				array(
					'id'           => 'bp_3d_posters',
					'type'         => 'group',
					'title'        => __('Poster Images (Deprecated)', 'bfields-demo'),
					'subtitle'     => __("Use multiple images for poster image. If you don't want to use just leave it empty.", 'bfields-demo'),
					'button_title' => __('Add New Poster Images', 'bfields-demo'),
					'icon'         => 'image',
					'dependency'   => array('bp_3d_model_type', '==', 'mcycle', 'all'),
					'fields'       => array(
						array(
							'id'      => 'poster_img',
							'type'    => 'upload',
							'title'   => __('Poster Image', 'bfields-demo'),
							'library' => 'image',
						),
					),
				),
				array(
					'id'          => 'initial_view',
					'type'        => 'text',
					'title'       => __('Initial View', 'bfields-demo'),
					'subtitle'    => __('Defines the initial camera angle and orientation of the model when the viewer first loads.', 'bfields-demo'),
					'desc'        => __('Paste the Initial View JSON data copied from the Visual editor. Initial View allow you to set the initial view of your 3D model.', 'bfields-demo'),
					'placeholder' => __('Paste here Initial View JSON data', 'bfields-demo'),
					'icon'        => 'eye',
					'default'     => '[]',
					'dependency'  => self::SINGLE_LITE,
				),
				array(
					'id'         => 'invalid',
					'type'       => 'content',
					'content'    => '<p>' . esc_html__('Use the Visual Editor to add hotspots or set initial view on your 3D model in a visual interface.', 'bfields-demo') . '</p>'
						. '<a class="button button-primary" target="_blank" rel="noopener" href="' . esc_url(admin_url('admin.php?page=3d-viewer-visual-editor')) . '">'
						. esc_html__('Open Visual Editor', 'bfields-demo') . '</a>',
					'dependency' => array('bp_3d_model_type|currentViewer', '==|==', 'msimple|modelViewer'),
				),
			),
		);
	}

	/**
	 * One row of the cycle list: its file and poster, then its own lighting,
	 * AR, real size, hotspots and initial view. These stay in the row, not on
	 * the single-model tabs, because that is where they are stored.
	 */
	private static function cycleModel(): array
	{
		return array(
			array(
				'id'          => 'model_link',
				'type'        => 'upload',
				'title'       => __('3D Source', 'bfields-demo'),
				'subtitle'    => __('The 3D model file to display in the viewer.', 'bfields-demo'),
				'placeholder' => __('Upload or paste a model URL', 'bfields-demo'),
			),
			array(
				'id'          => 'poster_src',
				'type'        => 'upload',
				'title'       => __('3D Poster', 'bfields-demo'),
				'subtitle'    => __('Shown while the model loads, in either viewer.', 'bfields-demo'),
				'placeholder' => __('Upload or paste an image URL', 'bfields-demo'),
			),
			array(
				'id'      => 'model-viewer-note',
				'type'    => 'submessage',
				'style'   => 'warning',
				'content' => '<strong>' . esc_html__('Lite Viewer only', 'bfields-demo') . '</strong> &mdash; '
					. esc_html__('every option below this line is ignored when this model uses the Advanced Viewer.', 'bfields-demo'),
			),

			// ---- lighting ----

			array(
				'id'      => 'environment_preset',
				'type'    => 'select',
				'title'   => __('Environment Preset', 'bfields-demo'),
				'subtitle' => __('Built-in lighting used when no environment image is set', 'bfields-demo'),
				'options' => array(
					''       => __('Neutral (default)', 'bfields-demo'),
					'legacy' => __('Legacy', 'bfields-demo'),
					'custom' => __('Custom image', 'bfields-demo'),
				),
				// ViewerPro.php's default: a new row starts on a
				// custom environment image.
				'default' => 'custom',
			),
			array(
				'id'         => 'environment_image_src',
				'type'       => 'upload',
				'title'      => __('Environment Image', 'bfields-demo'),
				'subtitle'   => __('Improves lighting and reflections on the model.', 'bfields-demo'),
				'placeholder' => __('Upload or paste an image URL', 'bfields-demo'),
				// Row-local: `environment_preset` is a sibling in
				// this row, so each row resolves its own.
				'dependency' => array('environment_preset', '==', 'custom'),
			),
			array(
				'id'       => 'use_environment_as_skybox',
				'type'     => 'switcher',
				'title'    => __('Use Environment as Skybox', 'bfields-demo'),
				'subtitle' => __('Paints the environment image behind the model instead of a separate skybox image.', 'bfields-demo'),
				'default'  => false,
			),
			array(
				'id'          => 'skybox_image_src',
				'type'        => 'upload',
				'title'       => __('Skybox Image', 'bfields-demo'),
				'subtitle'    => __('The background behind the model, which also lights it.', 'bfields-demo'),
				'placeholder' => __('Upload or paste an image URL', 'bfields-demo'),
			),
			array(
				'id'          => 'skybox_height',
				'type'        => 'text',
				'title'       => __('Skybox Height', 'bfields-demo'),
				'subtitle'    => __('Camera height inside the skybox, e.g. 1.6m', 'bfields-demo'),
				'placeholder' => '0m',
				'default'     => '',
			),
			array(
				'id'      => 'tone_mapping',
				'type'    => 'select',
				'title'   => __('Tone Mapping', 'bfields-demo'),
				'options' => array(
					''        => __('Default', 'bfields-demo'),
					'neutral' => __('Neutral', 'bfields-demo'),
					'aces'    => __('ACES', 'bfields-demo'),
					'agx'     => __('agX', 'bfields-demo'),
				),
				'default' => '',
			),
			array(
				'id'         => 'exposure',
				'type'       => 'slider',
				'title'      => __('Exposure', 'bfields-demo'),
				'subtitle'   => __('Brightness for Model', 'bfields-demo'),
				'min'        => 0.1,
				'max'        => 10,
				'step'       => 0.1,
				'default'    => 1,
				// `'all'` makes this GLOBAL: currentViewer lives on
				// the screen, not in the row. Mixing an in-row and
				// an out-of-row controller in one rule is the bug
				// this flag exists to avoid.
				'dependency' => array('currentViewer', '==', 'modelViewer', 'all'),
			),

			// ---- AR ----

			array(
				'id'       => 'enable_ar',
				'type'     => 'switcher',
				'title'    => __('Enable AR', 'bfields-demo'),
				'subtitle' => __('Let visitors place the model in their own room on supported devices.', 'bfields-demo'),
				'default'  => false,
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

			// ---- size, hotspots, view ----

			array(
				'id'         => 'real_size',
				'type'       => 'fieldset',
				'title'      => __('Real Size (Optional)', 'bfields-demo'),
				'subtitle'   => __('Only if this 3D file was exported at the wrong scale', 'bfields-demo'),
				'fields'     => self::realSize(),
				// Both controllers live on the screen, not in the row.
				'dependency' => array('currentViewer|bp_3d_dimensions_mode', '==|!=', 'modelViewer|off', 'all'),
			),
			array(
				// A group inside a group: this model's own hotspots,
				// the same row as the single-model list on Hotspots.
				'id'           => 'hotspots',
				'type'         => 'group',
				'title'        => __('Hotspots/Annotations', 'bfields-demo'),
				'subtitle'     => __('Adds interactive hotspots to the model for displaying information or actions.', 'bfields-demo'),
				'button_title' => __('Add Hotspot', 'bfields-demo'),
				'accordion_title_prefix' => __('Hotspot', 'bfields-demo'),
				'accordion_title_number' => true,
				'fields'       => self::hotspot(),
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
		);
	}

	/** Width / height / depth, as ViewerPro.php's `real_size` fieldset has them. */
	public static function realSize(): array
	{
		return array(
			array('id' => 'width', 'type' => 'number', 'title' => __('Width', 'bfields-demo')),
			array('id' => 'height', 'type' => 'number', 'title' => __('Height', 'bfields-demo')),
			array('id' => 'depth', 'type' => 'number', 'title' => __('Depth', 'bfields-demo')),
		);
	}

	/**
	 * One hotspot row.
	 *
	 * 3D Viewer Premium's HotspotFields::fields() — same keys, options and
	 * defaults — in the order and with the labels of the block editor's row
	 * (src/blocks/3d-viewer/Components/Backend/Tabs/General/Hotspots.tsx),
	 * which is the richer of the two: the coordinates sit behind Edit Manually
	 * and each has a copy button, and Display and Description hide where the
	 * type or display has no card to show them in.
	 *
	 * Every dependency is row-local (no `'all'`): `type`, `display`, `pinIcon`
	 * and `editManually` live in the same row as the fields they control.
	 */
	public static function hotspot(): array
	{
		$types = array(
			'info'      => __('Info', 'bfields-demo'),
			'link'      => __('Link', 'bfields-demo'),
			'image'     => __('Image', 'bfields-demo'),
			'waypoint'  => __('Waypoint', 'bfields-demo'),
			'animation' => __('Animation', 'bfields-demo'),
			'video'     => __('Video', 'bfields-demo'),
		);

		// As in the plugin, the Product type exists only with WooCommerce.
		if (class_exists('WooCommerce')) {
			$types['product'] = __('Product', 'bfields-demo');
		}

		$coordinate = static function (string $id, string $title, string $subtitle): array {
			return array(
				'id'         => $id,
				'type'       => 'text',
				'title'      => $title,
				'subtitle'   => $subtitle,
				// The copyable chip: an input with a copy button beside it.
				'layout'     => 'selector',
				'dependency' => array('editManually', '==', 'true'),
			);
		};

		return array(
			array(
				'id'       => 'title',
				'type'     => 'text',
				'title'    => __('Name', 'bfields-demo'),
				'subtitle' => __("Shown on the pin, and as the card's heading when the pin is a badge icon.", 'bfields-demo'),
			),
			array(
				'id'       => 'type',
				'type'     => 'select',
				'title'    => __('Type', 'bfields-demo'),
				'subtitle' => __('What this hotspot does when clicked, and which fields it offers.', 'bfields-demo'),
				'options'  => $types,
				'default'  => 'info',
			),
			array(
				'id'         => 'display',
				'type'       => 'select',
				'title'      => __('Display', 'bfields-demo'),
				'subtitle'   => __('How this hotspot shows its content. Popup is ignored for Link and Animation, whose click already does something else.', 'bfields-demo'),
				'options'    => array(
					''       => __('Use viewer setting', 'bfields-demo'),
					'always' => __('Always visible', 'bfields-demo'),
					'hover'  => __('Tooltip on hover', 'bfields-demo'),
					'popup'  => __('Popup', 'bfields-demo'),
					'none'   => __('Pin only (no content)', 'bfields-demo'),
				),
				'default'    => '',
				// A waypoint has no card, so nothing to display.
				'dependency' => array('type', '!=', 'waypoint'),
			),
			array(
				'id'       => 'pinIcon',
				'type'     => 'select',
				'title'    => __('Pin Icon', 'bfields-demo'),
				'subtitle' => __("What the pin shows: the hotspot's name as a label, one of the badge icons, or your own picture.", 'bfields-demo'),
				'options'  => array(
					''         => __('Use viewer setting', 'bfields-demo'),
					'text'     => __('Text (name)', 'bfields-demo'),
					'info'     => __('Info', 'bfields-demo'),
					'plus'     => __('Plus', 'bfields-demo'),
					'dot'      => __('Dot', 'bfields-demo'),
					'number'   => __('Number', 'bfields-demo'),
					'link'     => __('Link', 'bfields-demo'),
					'play'     => __('Play', 'bfields-demo'),
					'cart'     => __('Cart', 'bfields-demo'),
					'question' => __('Question', 'bfields-demo'),
					'custom'   => __('Custom image', 'bfields-demo'),
				),
				'default'  => '',
			),
			array(
				'id'         => 'customIcon',
				'type'       => 'upload',
				'title'      => __('Pin Image', 'bfields-demo'),
				'subtitle'   => __('Drawn inside the pin badge instead of an icon. A small square picture works best.', 'bfields-demo'),
				'library'    => 'image',
				'dependency' => array('pinIcon', '==', 'custom'),
			),
			array(
				'id'         => 'desc',
				'type'       => 'textarea',
				'title'      => __('Description', 'bfields-demo'),
				'subtitle'   => __('The text inside the card. Hidden when Display is set to Pin only.', 'bfields-demo'),
				'dependency' => array('type|display', '!=|!=', 'waypoint|none'),
			),

			// ---- per type ----

			array(
				'id'          => 'linkUrl',
				'type'        => 'text',
				'title'       => __('Link URL', 'bfields-demo'),
				'placeholder' => 'https://example.com',
				'dependency'  => array('type', '==', 'link'),
			),
			array(
				'id'          => 'linkText',
				'type'        => 'text',
				'title'       => __('Link Button Text', 'bfields-demo'),
				'placeholder' => __('Visit Link', 'bfields-demo'),
				'dependency'  => array('type', '==', 'link'),
			),
			array(
				'id'         => 'openInNewTab',
				'type'       => 'switcher',
				'title'      => __('Open in new tab', 'bfields-demo'),
				'default'    => false,
				'dependency' => array('type', '==', 'link'),
			),
			array(
				'id'         => 'imageUrl',
				'type'       => 'upload',
				'title'      => __('Image', 'bfields-demo'),
				'subtitle'   => __('Shown above the description in the card styles.', 'bfields-demo'),
				'library'    => 'image',
				'dependency' => array('type', '==', 'image'),
			),
			array(
				'id'         => 'imageAlt',
				'type'       => 'text',
				'title'      => __('Image Alt Text', 'bfields-demo'),
				'subtitle'   => __('Falls back to the hotspot name.', 'bfields-demo'),
				'dependency' => array('type', '==', 'image'),
			),
			array(
				'id'         => 'animationName',
				'type'       => 'text',
				'title'      => __('Animation Name', 'bfields-demo'),
				'subtitle'   => __('The clip to play, exactly as it is named in the model.', 'bfields-demo'),
				'dependency' => array('type', '==', 'animation'),
			),
			array(
				'id'         => 'animationRepeat',
				'type'       => 'select',
				'title'      => __('Repeat', 'bfields-demo'),
				'options'    => array(
					'once'     => __('Once', 'bfields-demo'),
					'loop'     => __('Loop until clicked again', 'bfields-demo'),
					'pingpong' => __('Back and forth until clicked again', 'bfields-demo'),
				),
				'default'    => 'once',
				'dependency' => array('type', '==', 'animation'),
			),
			array(
				'id'          => 'videoUrl',
				'type'        => 'text',
				'title'       => __('Video URL', 'bfields-demo'),
				'subtitle'    => __('YouTube, Vimeo, or a direct MP4, WebM or OGG file.', 'bfields-demo'),
				'placeholder' => 'https://www.youtube.com/watch?v=...',
				'dependency'  => array('type', '==', 'video'),
			),
			array(
				'id'          => 'productId',
				'type'        => 'select',
				'title'       => __('Product', 'bfields-demo'),
				'subtitle'    => __('The card is built from this product when the visitor opens it.', 'bfields-demo'),
				// The plugin's own definition (HotspotFields.php, 2.0.0): a
				// product search. bfields lists it through its choices route,
				// with these query_args read on the server.
				'placeholder' => __('Search products', 'bfields-demo'),
				'options'     => 'posts',
				'query_args'  => array('post_type' => 'product', 'post_status' => 'publish'),
				'chosen'      => true,
				'ajax'        => true,
				'default'     => '',
				'dependency'  => array('type', '==', 'product'),
			),

			// ---- coordinates ----

			array(
				'id'       => 'editManually',
				'type'     => 'switcher',
				'title'    => __('Edit Manually', 'bfields-demo'),
				'subtitle' => __('Show the coordinates the Visual Editor wrote, to copy them to another viewer or fine-tune them.', 'bfields-demo'),
				'default'  => false,
			),
			$coordinate('position', __('Hotspot Position', 'bfields-demo'), __('Where the pin sits on the model.', 'bfields-demo')),
			$coordinate('normal', __('Hotspot Normal', 'bfields-demo'), __('Which way the pin faces.', 'bfields-demo')),
			$coordinate('orbit', __('Camera Orbit', 'bfields-demo'), __('Where the camera moves when the pin is clicked.', 'bfields-demo')),
			$coordinate('target', __('Camera Target', 'bfields-demo'), __('What the camera looks at when the pin is clicked.', 'bfields-demo')),
			$coordinate('fov', __('FOV (Field Of View)', 'bfields-demo'), __('How far the camera zooms when the pin is clicked.', 'bfields-demo')),
		);
	}

	/**
	 * Lighting & Environment — the single model's environment, skybox and
	 * tone mapping. A cycle sets these per model, in its rows on Model.
	 */
	private static function lighting(): array
	{
		return array(
			'title'  => __('Lighting & Environment', 'bfields-demo'),
			'icon'   => 'fa fa-sun',
			'fields' => array(
				self::notice(__('Multiple models set their own lighting: open each model in the list on the Model tab.', 'bfields-demo'), self::SINGLE_ONLY),
				self::notice(__('Lighting and environment apply to the Lite Viewer only.', 'bfields-demo'), array('bp_3d_model_type|currentViewer', '==|==', 'msimple|O3DViewer', 'all')),
				array(
					'id'         => 'bp_3d_environment_preset',
					'type'       => 'select',
					'title'      => __('Environment Preset', 'bfields-demo'),
					'subtitle'   => __("Uses one of the viewer's built-in lighting environments. Ignored when an Environment Image is uploaded below.", 'bfields-demo'),
					'icon'       => 'sun',
					'options'    => array(
						''       => __('Neutral (default)', 'bfields-demo'),
						'legacy' => __('Legacy', 'bfields-demo'),
						'custom' => __('Custom image', 'bfields-demo'),
					),
					'default'    => 'custom',
					'dependency' => self::SINGLE_LITE,
				),
				array(
					'id'           => 'bp_3d_environment_image',
					'type'         => 'upload',
					'title'        => __('Environment Image', 'bfields-demo'),
					'subtitle'     => __('Sets an environment image to improve lighting and reflections on the model.', 'bfields-demo'),
					'button_title' => __('Upload', 'bfields-demo'),
					'library'      => 'image',
					'icon'         => 'image',
					'dependency'   => array('bp_3d_model_type|currentViewer|bp_3d_environment_preset', '==|==|==', 'msimple|modelViewer|custom', 'all'),
				),
				array(
					'id'         => 'bp_3d_use_environment_as_skybox',
					'type'       => 'switcher',
					'title'      => __('Use Environment as Skybox', 'bfields-demo'),
					'subtitle'   => __('Paints the environment image behind the model instead of using a separate skybox image.', 'bfields-demo'),
					'icon'       => 'layers',
					'default'    => false,
					'dependency' => self::SINGLE_LITE,
				),
				array(
					'id'           => 'bp_3d_skybox_image',
					'type'         => 'upload',
					'title'        => __('HDR Skybox Image', 'bfields-demo'),
					'subtitle'     => __('Sets a skybox image that appears as the background and provides environmental lighting for the model.', 'bfields-demo'),
					'button_title' => __('Upload', 'bfields-demo'),
					'library'      => 'image',
					'icon'         => 'image',
					'dependency'   => self::SINGLE_LITE,
				),
				array(
					'id'          => 'bp_3d_skybox_height',
					'type'        => 'text',
					'title'       => __('Skybox Height', 'bfields-demo'),
					'subtitle'    => __('Raises the camera inside the skybox so the model sits on the ground plane instead of floating. Leave empty for the default.', 'bfields-demo'),
					'placeholder' => '0m',
					'icon'        => 'move',
					'default'     => '',
					'dependency'  => self::SINGLE_LITE,
				),
				array(
					'id'         => 'bp_3d_tone_mapping',
					'type'       => 'select',
					'title'      => __('Tone Mapping', 'bfields-demo'),
					'subtitle'   => __("Changes how highlights roll off. 'Default' leaves the viewer's own choice in place.", 'bfields-demo'),
					'icon'       => 'palette',
					'options'    => array(
						''        => __('Default', 'bfields-demo'),
						'neutral' => __('Neutral', 'bfields-demo'),
						'aces'    => __('ACES', 'bfields-demo'),
						'agx'     => __('agX', 'bfields-demo'),
					),
					'default'    => '',
					'dependency' => self::SINGLE_LITE,
				),
			),
		);
	}

	/**
	 * AR — the single model's AR. A cycle sets AR per model, in its rows.
	 */
	private static function ar(): array
	{
		$ar = array('bp_3d_enable_ar|currentViewer', '==|==', '1|modelViewer', 'all');

		return array(
			'title'  => __('AR', 'bfields-demo'),
			'icon'   => 'fa fa-camera',
			'fields' => array(
				self::notice(__('Multiple models set their own AR: open each model in the list on the Model tab.', 'bfields-demo'), self::SINGLE_ONLY),
				self::notice(__('AR is available on the Lite Viewer only.', 'bfields-demo'), self::ADVANCED),
				array(
					'id'         => 'bp_3d_enable_ar',
					'type'       => 'switcher',
					'title'      => __('Enable AR', 'bfields-demo'),
					'subtitle'   => __('Enables AR (Augmented Reality) so visitors can view the 3D model in their real environment.', 'bfields-demo'),
					'icon'       => 'phone',
					'default'    => false,
					'dependency' => array('currentViewer', '==', 'modelViewer', 'all'),
				),
				array(
					'id'          => 'model_iso_src',
					'type'        => 'upload',
					'title'       => __('3D Source for iOS (Optional)', 'bfields-demo'),
					'subtitle'    => __('Specifies the iOS-specific model file (.usdz) used for viewing the 3D model in AR on Apple devices.', 'bfields-demo'),
					'placeholder' => __('Upload or paste a model URL', 'bfields-demo'),
					'icon'        => 'upload',
					'dependency'  => $ar,
				),
				array(
					'id'         => 'ar_placement',
					'type'       => 'button_set',
					'title'      => __('AR Placement', 'bfields-demo'),
					'subtitle'   => __("Defines how the model is placed in AR. Choose 'floor' to place the model on the ground or 'wall' to attach it to a vertical surface.", 'bfields-demo'),
					'icon'       => 'move',
					'options'    => array(
						'floor' => __('Floor', 'bfields-demo'),
						'wall'  => __('Wall', 'bfields-demo'),
					),
					'default'    => 'floor',
					'dependency' => $ar,
				),
				array(
					'id'         => 'ar_mode',
					'type'       => 'button_set',
					'title'      => __('AR Mode', 'bfields-demo'),
					'subtitle'   => __("Selects the AR viewing mode. 'Quick Look' is used for iOS devices, while other modes enable AR on supported Android devices.", 'bfields-demo'),
					'icon'       => 'phone',
					'options'    => array(
						'webxr'        => __('WebXR', 'bfields-demo'),
						'scene-viewer' => __('Scene Viewer', 'bfields-demo'),
						'quick-look'   => __('Quick Look', 'bfields-demo'),
					),
					'default'    => 'webxr',
					'dependency' => $ar,
				),
			),
		);
	}

	/**
	 * Options — how the model behaves, and which buttons and selectors it
	 * draws.
	 *
	 * The first ten rows are the design's Settings tab (Add New → Settings,
	 * Figma "Model (2)"), in its order and with its copy, on the ids 3D Viewer
	 * Premium stores them under. The design's eleventh, Enable AR, is on AR.
	 */
	private static function options(): array
	{
		$lite = array('currentViewer', '==', 'modelViewer', 'all');
		$rotate = array('bp_3d_rotate|currentViewer', '==|==', '1|modelViewer', 'all');
		$cycle = array('bp_3d_model_type', '==', 'mcycle', 'all');

		return array(
			'title'  => __('Options', 'bfields-demo'),
			'icon'   => 'fa fa-cog',
			'fields' => array(
				array(
					'id'       => 'bp_camera_control',
					'type'     => 'switcher',
					'title'    => __('Moving Controls', 'bfields-demo'),
					'subtitle' => __('Allows users to rotate, pan, and interact with the model using a mouse or touch input.', 'bfields-demo'),
					'icon'     => 'move',
					'default'  => true,
				),
				array(
					'id'         => 'bp_3d_zooming',
					'type'       => 'switcher',
					'title'      => __('Enable Zoom', 'bfields-demo'),
					'subtitle'   => __('Enable or Disable Zooming Behaviour', 'bfields-demo'),
					'icon'       => 'zoom-in',
					'default'    => true,
					'dependency' => array('bp_camera_control', '==', '1', 'all'),
				),
				array(
					'id'       => 'bp_3d_fullscreen',
					'type'     => 'switcher',
					'title'    => __('Full Screen Button', 'bfields-demo'),
					'subtitle' => __('Show/Hide Full Screen Button', 'bfields-demo'),
					'icon'     => 'maximize',
					'default'  => true,
				),
				array(
					'id'         => 'bp_3d_zoom_in_out_btn',
					'type'       => 'switcher',
					'title'      => __('Zoom In/Out Button', 'bfields-demo'),
					'subtitle'   => __('Show/Hide Zoom In/Out Button', 'bfields-demo'),
					'icon'       => 'zoom-out',
					'default'    => true,
					'dependency' => array('bp_camera_control|bp_3d_zooming', '==|==', '1|1', 'all'),
				),
				array(
					'id'         => 'bp_3d_camera_btn',
					'type'       => 'switcher',
					'title'      => __('Camera Button', 'bfields-demo'),
					'subtitle'   => __('Show/Hide Camera Button', 'bfields-demo'),
					'icon'       => 'camera',
					'default'    => false,
					'dependency' => $lite,
				),
				array(
					'id'         => 'bp_3d_download_btn',
					'type'       => 'switcher',
					'title'      => __('3D File Download Button', 'bfields-demo'),
					'subtitle'   => __('Show/Hide 3D File Download Button', 'bfields-demo'),
					'icon'       => 'download',
					'default'    => false,
					'dependency' => $lite,
				),
				array(
					'id'         => 'bp_3d_loading',
					'type'       => 'radio',
					'title'      => __('Loading Type', 'bfields-demo'),
					'subtitle'   => __('Choose Loading type, default: "Auto"', 'bfields-demo'),
					'icon'       => 'loader',
					'options'    => array(
						'auto'  => __('Auto', 'bfields-demo'),
						'lazy'  => __('Lazy', 'bfields-demo'),
						'eager' => __('Eager', 'bfields-demo'),
					),
					'default'    => 'auto',
					'dependency' => $lite,
				),
				array(
					'id'         => 'bp_3d_progressbar',
					'type'       => 'switcher',
					'title'      => __('Progressbar', 'bfields-demo'),
					'subtitle'   => __('Show/Hide Progressbar', 'bfields-demo'),
					'icon'       => 'sliders',
					'default'    => true,
					'dependency' => $lite,
				),
				array(
					'id'         => '3d_exposure',
					'type'       => 'slider',
					'title'      => __('Exposure', 'bfields-demo'),
					'subtitle'   => __('Brightness for Model', 'bfields-demo'),
					'icon'       => 'sun',
					'min'        => 0.1,
					'max'        => 5,
					'step'       => 0.1,
					'default'    => '1',
					'dependency' => array('bp_3d_model_type|currentViewer', '!=|==', 'mcycle|modelViewer', 'all'),
				),
				array(
					// ViewerPro.php authors this as a spinner; the design
					// draws it as a slider, and both store one number.
					'id'         => '3d_shadow_intensity',
					'type'       => 'slider',
					'title'      => __('Shadow Intensity', 'bfields-demo'),
					'subtitle'   => __('Shadow Intensity for Model', 'bfields-demo'),
					'icon'       => 'cloud-drizzle',
					'min'        => 0,
					'max'        => 10,
					'step'       => 0.1,
					'default'    => '1',
					'dependency' => $lite,
				),

				// ---- beyond the design ----

				array(
					'id'         => 'bp_3d_autoplay',
					'type'       => 'switcher',
					'title'      => __('Autoplay', 'bfields-demo'),
					'subtitle'   => __('Automatically starts model animation when the viewer loads.', 'bfields-demo'),
					'icon'       => 'zap',
					'default'    => false,
					'dependency' => $lite,
				),
				array(
					'id'         => 'bp_3d_rotate',
					'type'       => 'switcher',
					'title'      => __('Auto Rotate', 'bfields-demo'),
					'subtitle'   => __('Turn the model slowly until a visitor takes over', 'bfields-demo'),
					'icon'       => 'refresh',
					'default'    => false,
					'dependency' => $lite,
				),
				array(
					'id'         => '3d_rotate_speed',
					'type'       => 'spinner',
					'title'      => __('Auto Rotate Speed', 'bfields-demo'),
					'subtitle'   => __('Controls how fast the model rotates automatically. Higher values mean faster rotation.', 'bfields-demo'),
					'icon'       => 'sliders',
					'unit'       => 'deg/s',
					'min'        => 0,
					'max'        => 180,
					'default'    => '30',
					'dependency' => $rotate,
				),
				array(
					'id'         => '3d_rotate_delay',
					'type'       => 'number',
					'title'      => __('Auto Rotation Delay', 'bfields-demo'),
					'subtitle'   => __('Sets the delay time before automatic rotation starts after the model loads or after user interaction stops.', 'bfields-demo'),
					'icon'       => 'sliders',
					'unit'       => 'ms',
					'default'    => '3000',
					'dependency' => $rotate,
				),
				array(
					'id'         => '3d_zoom_level',
					'type'       => 'spinner',
					'title'      => __('Zoom Level', 'bfields-demo'),
					'subtitle'   => __('Controls the zoom level of the model. Higher values mean closer zoom.', 'bfields-demo'),
					'icon'       => 'zoom-in',
					'min'        => 0.5,
					'max'        => 5,
					'step'       => 0.1,
					'default'    => 1,
					'dependency' => $lite,
				),
				array(
					'id'         => 'lockXAxisRotation',
					'type'       => 'switcher',
					'title'      => __('Lock Left-Right Rotation', 'bfields-demo'),
					'subtitle'   => __('Prevents the model from rotating along the X axis. Only one lock (Left-Right or Up-Down) works at a time.', 'bfields-demo'),
					'icon'       => 'move',
					'default'    => false,
					'dependency' => $lite,
				),
				array(
					'id'         => 'lockYAxisRotation',
					'type'       => 'switcher',
					'title'      => __('Lock Up-Down Rotation', 'bfields-demo'),
					'subtitle'   => __('Prevents the model from rotating along the Y axis. Only one lock (Left-Right or Up-Down) works at a time.', 'bfields-demo'),
					'icon'       => 'move',
					'default'    => false,
					'dependency' => $lite,
				),
				array(
					'id'         => 'bp_3d_reset_view_btn',
					'type'       => 'switcher',
					'title'      => __('Reset View Button', 'bfields-demo'),
					'subtitle'   => __('Restores the initial camera angle and target.', 'bfields-demo'),
					'icon'       => 'reset',
					'default'    => false,
					'dependency' => $lite,
				),
				array(
					'id'         => 'show_thumbs',
					'type'       => 'switcher',
					'title'      => __('Show Thumbnail List', 'bfields-demo'),
					'subtitle'   => __('Displays pagination thumbnails when multiple models are available.', 'bfields-demo'),
					'icon'       => 'grid',
					'default'    => false,
					'dependency' => $cycle,
				),
				array(
					'id'         => 'show_arrows',
					'type'       => 'switcher',
					'title'      => __('Show Arrows', 'bfields-demo'),
					'subtitle'   => __('Shows navigation controls for switching between multiple models.', 'bfields-demo'),
					'icon'       => 'move',
					'default'    => true,
					'dependency' => $cycle,
				),
				array(
					'id'         => 'bp_model_progress_percent',
					'type'       => 'switcher',
					'title'      => __('Show Progress Percent', 'bfields-demo'),
					'subtitle'   => __('Shows the loading percentage while the 3D model is being loaded.', 'bfields-demo'),
					'icon'       => 'loader',
					'dependency' => $lite,
				),
				array(
					'id'         => 'bp_3d_variant',
					'type'       => 'switcher',
					'title'      => __('Enable Variant Selector', 'bfields-demo'),
					'subtitle'   => __('Shows a dropdown of the KHR_materials_variants defined in the model. Nothing appears if the file has none.', 'bfields-demo'),
					'icon'       => 'palette',
					'default'    => false,
					'dependency' => $lite,
				),
				array(
					'id'         => 'bp_3d_animation',
					'type'       => 'switcher',
					'title'      => __('Enable Animation Selector', 'bfields-demo'),
					'subtitle'   => __('Shows a dropdown of the animations defined in the model. Nothing appears if the file has none.', 'bfields-demo'),
					'icon'       => 'zap',
					'default'    => false,
					'dependency' => $lite,
				),
				array(
					'id'         => 'bp_3d_selected_animation',
					'type'       => 'text',
					'title'      => __('Set Animation', 'bfields-demo'),
					'subtitle'   => __('Exact animation name from the 3D file. Leave empty to play the first one.', 'bfields-demo'),
					'icon'       => 'pencil',
					'default'    => '',
					'dependency' => array('bp_3d_animation', '==', '1', 'all'),
				),
			),
		);
	}

	/**
	 * Advanced Viewer — the edge outline only the Advanced Viewer draws.
	 */
	private static function advanced(): array
	{
		$edge = array('bp_3d_show_edge', '==', '1', 'all');

		return array(
			'title'  => __('Advanced Viewer', 'bfields-demo'),
			'icon'   => 'fa fa-diamond',
			'fields' => array(
				self::notice(__('These options apply to the Advanced Viewer. Switch Viewer Mode to Advanced on the Model tab to use them.', 'bfields-demo'), array('currentViewer', '==', 'modelViewer', 'all')),
				array(
					'id'         => 'bp_3d_show_edge',
					'type'       => 'switcher',
					'title'      => __('Show Edge', 'bfields-demo'),
					'subtitle'   => __('Draws outlines on the model where two surfaces meet at a sharp angle.', 'bfields-demo'),
					'icon'       => 'box',
					'default'    => false,
					'dependency' => self::ADVANCED,
				),
				array(
					'id'         => 'bp_3d_edge_color',
					'type'       => 'color',
					'title'      => __('Edge Color', 'bfields-demo'),
					'subtitle'   => __('Colour of the outlines drawn on the model.', 'bfields-demo'),
					'icon'       => 'palette',
					'default'    => '#000000',
					'dependency' => $edge,
				),
				array(
					'id'         => 'bp_3d_edge_threshold',
					'type'       => 'slider',
					'title'      => __('Edge Threshold', 'bfields-demo'),
					'subtitle'   => __('Edges are drawn only where two surfaces meet at a sharper angle than this. Lower values show more edges; 0 outlines every triangle.', 'bfields-demo'),
					'icon'       => 'sliders',
					'min'        => 0,
					'max'        => 90,
					'step'       => 1,
					'default'    => 1,
					'dependency' => $edge,
				),
			),
		);
	}

	/**
	 * Mobile — what phones get instead of, or on top of, the model.
	 */
	private static function mobile(): array
	{
		return array(
			'title'  => __('Mobile', 'bfields-demo'),
			'icon'   => 'fa fa-mobile',
			'fields' => array(
				array(
					'id'       => 'bp_3d_mobile_image_mode',
					'type'     => 'button_set',
					'title'    => __('On Mobile Devices', 'bfields-demo'),
					'subtitle' => __("Needs a poster image. 'Image, tap to load' shows a View in 3D button; 'Image only' never loads the model on mobile. Works with both viewers.", 'bfields-demo'),
					'icon'     => 'phone',
					'options'  => array(
						'off'    => __('Load 3D model', 'bfields-demo'),
						'tap'    => __('Image, tap to load', 'bfields-demo'),
						'static' => __('Image only', 'bfields-demo'),
					),
					'default'  => 'off',
				),
				array(
					'id'          => 'bp_3d_mobile_tap_label',
					'type'        => 'text',
					'title'       => __('Tap Button Text', 'bfields-demo'),
					'icon'        => 'pencil',
					'placeholder' => __('View in 3D', 'bfields-demo'),
					'default'     => '',
					'dependency'  => array('bp_3d_mobile_image_mode', '==', 'tap', 'all'),
				),
				array(
					'id'         => 'bp_3d_mobile_breakpoint',
					'type'       => 'number',
					'title'      => __('Mobile Breakpoint', 'bfields-demo'),
					'subtitle'   => __('Screens up to this width count as mobile. Touch-only devices are judged by their shorter edge, so a phone in landscape still counts.', 'bfields-demo'),
					'icon'       => 'tablet',
					'unit'       => 'px',
					'default'    => 768,
					'dependency' => array('bp_3d_mobile_image_mode', '!=', 'off', 'all'),
				),
				array(
					'id'         => 'bp_3d_mobile_reduce_motion',
					'type'       => 'switcher',
					'title'      => __('Reduce Motion on Mobile', 'bfields-demo'),
					'subtitle'   => __('Turns off the model animation and Auto Rotate on phones, and for visitors whose device asks for reduced motion. Visitors can still rotate and zoom.', 'bfields-demo'),
					'icon'       => 'refresh',
					'default'    => false,
					'dependency' => array('currentViewer', '==', 'modelViewer', 'all'),
				),
			),
		);
	}

	/**
	 * Controls — label mode, corner and label text of each viewer button.
	 *
	 * ViewerPro.php's control_fields(), which builds these from
	 * Utils::controlKeys() and Utils::controlTextKeys(): one corner select per
	 * control, one label per button (zoom has two). Each hides with its
	 * button's own toggle, which lives on Options, and — for the controls only
	 * the Lite Viewer draws — with the viewer.
	 */
	private static function controls(): array
	{
		$titles = array(
			'zoom'       => __('Zoom in / out', 'bfields-demo'),
			'fullscreen' => __('Fullscreen', 'bfields-demo'),
			'camera'     => __('Capture image', 'bfields-demo'),
			'download'   => __('Download model', 'bfields-demo'),
			'reset'      => __('Reset view', 'bfields-demo'),
			'dimensions' => __('Dimensions', 'bfields-demo'),
			'ar'         => __('View in AR', 'bfields-demo'),
		);

		// key => array(dependency, default corner).
		$controls = array(
			'zoom'       => array(array('bp_3d_zoom_in_out_btn', '==', '1', 'all'), 'bottom-right'),
			'fullscreen' => array(array('bp_3d_fullscreen', '==', '1', 'all'), 'bottom-right'),
			'camera'     => array(array('bp_3d_camera_btn|currentViewer', '==|==', '1|modelViewer', 'all'), 'bottom-left'),
			'download'   => array(array('bp_3d_download_btn|currentViewer', '==|==', '1|modelViewer', 'all'), 'bottom-left'),
			'reset'      => array(array('bp_3d_reset_view_btn|currentViewer', '==|==', '1|modelViewer', 'all'), 'bottom-left'),
			'dimensions' => array(array('bp_3d_dimensions_mode|currentViewer', '!=|==', 'off|modelViewer', 'all'), 'bottom-left'),
			// AR is per model in a cycle, so it asks for the viewer only.
			'ar'         => array(array('currentViewer', '==', 'modelViewer', 'all'), 'bottom-left'),
		);

		$corners = array(
			'top-left'     => __('Top left', 'bfields-demo'),
			'top-right'    => __('Top right', 'bfields-demo'),
			'bottom-left'  => __('Bottom left', 'bfields-demo'),
			'bottom-right' => __('Bottom right', 'bfields-demo'),
		);

		$texts = array(
			'zoomIn'     => __('Zoom in', 'bfields-demo'),
			'zoomOut'    => __('Zoom out', 'bfields-demo'),
			'fullscreen' => __('Fullscreen', 'bfields-demo'),
			'camera'     => __('Capture image', 'bfields-demo'),
			'download'   => __('Download model', 'bfields-demo'),
			'reset'      => __('Reset view', 'bfields-demo'),
			'dimensions' => __('Dimensions', 'bfields-demo'),
			'ar'         => __('View in AR', 'bfields-demo'),
		);

		// Buttons only the Lite Viewer draws; zoomIn/zoomOut are both halves
		// of the one Zoom control, which both viewers draw.
		$liteOnly = array('camera', 'download', 'reset', 'dimensions', 'ar');

		$fields = array(
			array(
				'id'       => 'bp_3d_control_labels',
				'type'     => 'button_set',
				'title'    => __('Control Labels', 'bfields-demo'),
				'subtitle' => __("Show each control's name next to its icon. Screen readers announce the name in every mode.", 'bfields-demo'),
				'icon'     => 'info',
				'options'  => array(
					'off'     => __('Off', 'bfields-demo'),
					'tooltip' => __('Tooltip', 'bfields-demo'),
					'inline'  => __('Inline text', 'bfields-demo'),
				),
				'default'  => 'off',
			),
		);

		foreach ($controls as $key => $control) {
			$fields[] = array(
				'id'         => 'bp_3d_control_corner_' . $key,
				'type'       => 'select',
				/* translators: %s: control name, e.g. Fullscreen. */
				'title'      => sprintf(__('%s position', 'bfields-demo'), $titles[$key]),
				'icon'       => 'move',
				'options'    => $corners,
				'default'    => $control[1],
				'dependency' => $control[0],
			);
		}

		// Empty is never stored as a default string: empty means "use the
		// translated default", so the label follows the site language.
		foreach ($texts as $key => $title) {
			$fields[] = array(
				'id'         => 'bp_3d_control_text_' . $key,
				'type'       => 'text',
				/* translators: %s: control name, e.g. Zoom in. */
				'title'      => sprintf(__('%s label', 'bfields-demo'), $title),
				'subtitle'   => __('Leave empty to use the translated default.', 'bfields-demo'),
				'icon'       => 'pencil',
				'default'    => '',
				'dependency' => in_array($key, $liteOnly, true)
					? array('bp_3d_control_labels|currentViewer', '!=|==', 'off|modelViewer', 'all')
					: array('bp_3d_control_labels', '!=', 'off', 'all'),
			);
		}

		return array(
			'title'  => __('Controls', 'bfields-demo'),
			'icon'   => 'fa fa-sliders',
			'fields' => $fields,
		);
	}

	/**
	 * Dimensions — the measurement lines, their unit and colour, and the
	 * single model's real size.
	 */
	private static function dimensions(): array
	{
		$shown = array('currentViewer|bp_3d_dimensions_mode', '==|!=', 'modelViewer|off', 'all');

		return array(
			'title'  => __('Dimensions', 'bfields-demo'),
			'icon'   => 'maximize',
			'fields' => array(
				self::notice(__('Dimensions are drawn by the Lite Viewer only.', 'bfields-demo'), self::ADVANCED),
				array(
					'id'         => 'bp_3d_dimensions_mode',
					'type'       => 'button_set',
					'title'      => __('Show Dimensions', 'bfields-demo'),
					'subtitle'   => __("Draws measurement lines around the model with real-world labels. 'Ruler button' hides them behind a button visitors press; 'Always on' shows them from the moment the model loads.", 'bfields-demo'),
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
					'id'         => 'bp_3d_dimension_unit',
					'type'       => 'select',
					'title'      => __('Dimension Unit', 'bfields-demo'),
					'subtitle'   => __('Unit the measurements are shown in. Also the unit the Real Size fields expect.', 'bfields-demo'),
					'icon'       => 'sliders',
					'options'    => array(
						'mm' => __('Millimetres (mm)', 'bfields-demo'),
						'cm' => __('Centimetres (cm)', 'bfields-demo'),
						'm'  => __('Metres (m)', 'bfields-demo'),
						'in' => __('Inches (in)', 'bfields-demo'),
						'ft' => __('Feet (ft)', 'bfields-demo'),
					),
					'default'    => 'cm',
					'dependency' => $shown,
				),
				array(
					'id'         => 'bp_3d_dimension_color',
					'type'       => 'color',
					'title'      => __('Dimension Line Colour', 'bfields-demo'),
					'subtitle'   => __('Colour of the dimension lines, corner dots and label text. Leave empty for the default.', 'bfields-demo'),
					'icon'       => 'palette',
					'default'    => '',
					'dependency' => $shown,
				),
				array(
					'id'         => 'real_size',
					'type'       => 'fieldset',
					'title'      => __('Real Size (Optional)', 'bfields-demo'),
					'subtitle'   => __("Type the product's real size if the 3D file was exported at the wrong scale. Fill one axis and the others scale to match; leave all three empty to use the size measured from the file.", 'bfields-demo'),
					'icon'       => 'box',
					'fields'     => self::realSize(),
					'dependency' => $shown,
				),
			),
		);
	}

	/**
	 * Hotspots — the single model's hotspots, their default style and pin
	 * look. A cycle sets hotspots per model, in its rows.
	 */
	private static function hotspots(): array
	{
		return array(
			'title'  => __('Hotspots', 'bfields-demo'),
			'icon'   => 'move',
			'fields' => array(
				self::notice(__('Multiple models set their own hotspots: open each model in the list on the Model tab.', 'bfields-demo'), self::SINGLE_ONLY),
				self::notice(__('Hotspots are drawn by the Lite Viewer only.', 'bfields-demo'), array('bp_3d_model_type|currentViewer', '==|==', 'msimple|O3DViewer', 'all')),
				array(
					// 3D Viewer Premium stores this as `hotspots`, with the row
					// HotspotFields::fields() defines (inc/Field/HotspotFields.php).
					'id'           => 'hotspots',
					'type'         => 'group',
					'title'        => __('Hotspots', 'bfields-demo'),
					'subtitle'     => __('Adds interactive hotspots to the model for displaying information or actions.', 'bfields-demo'),
					'button_title' => __('Add Hotspot', 'bfields-demo'),
					'icon'         => 'move',
					'accordion_title_prefix' => __('Hotspot', 'bfields-demo'),
					'accordion_title_number' => true,
					'dependency'   => self::SINGLE_LITE,
					'fields'       => self::hotspot(),
				),
				array(
					'id'         => 'hotspot_style',
					'type'       => 'button_set',
					'title'      => __('Default Hotspot Style', 'bfields-demo'),
					'subtitle'   => __('The starting look for every hotspot on this viewer. Any hotspot can override it with its own Display and Pin Icon.', 'bfields-demo'),
					'icon'       => 'palette',
					// Four long labels do not fit a segmented control beside
					// the row's copy; the mode grid gives them a line of their own.
					'layout'     => 'mode-grid',
					'options'    => array(
						'style-1' => __('Simple Tag (Text Only)', 'bfields-demo'),
						'style-2' => __('Always Visible Card', 'bfields-demo'),
						'style-3' => __('Hover Popup Card', 'bfields-demo'),
						'style-4' => __('Minimal Icon Badge', 'bfields-demo'),
					),
					'default'    => 'style-1',
					'dependency' => self::SINGLE_LITE,
				),

				...self::pinStyle(self::SINGLE_LITE),
			),
		);
	}

	/**
	 * HotspotFields::pinStyleFields(): the badge's size and colours, under
	 * whatever rule hides hotspots on the screen that uses them.
	 *
	 * @param array<int, string> $dependency
	 */
	public static function pinStyle(array $dependency): array
	{
		return array(
			array(
				'id'         => 'bp_3d_pin_size',
				'type'       => 'slider',
				'title'      => __('Pin Size', 'bfields-demo'),
				'subtitle'   => __('Diameter of the hotspot badge, in pixels. Text pins are unaffected.', 'bfields-demo'),
				'icon'       => 'sliders',
				'unit'       => 'px',
				'min'        => 16,
				'max'        => 64,
				'step'       => 1,
				'default'    => 28,
				'dependency' => $dependency,
			),
			array(
				'id'         => 'bp_3d_pin_color',
				'type'       => 'color',
				'title'      => __('Pin Icon Colour', 'bfields-demo'),
				'subtitle'   => __('Colour of the icon inside the badge, and of the label on a text pin.', 'bfields-demo'),
				'icon'       => 'palette',
				'default'    => '#15171a',
				'dependency' => $dependency,
			),
			array(
				'id'         => 'bp_3d_pin_background',
				'type'       => 'color',
				'title'      => __('Pin Background', 'bfields-demo'),
				'subtitle'   => __('Colour of the badge behind the icon, and of the pill behind a text pin.', 'bfields-demo'),
				'icon'       => 'palette',
				'default'    => '#ffffff',
				'dependency' => $dependency,
			),
		);
	}

	/**
	 * Style — size, alignment, background, thumbnails, progress bar and the
	 * control buttons' geometry.
	 *
	 * The first four rows are the design's Style tab (Figma "Model (3)"),
	 * authored as ViewerPro.php authors them: Width and Height are two
	 * single-axis `dimensions` fields, which is what the design draws.
	 *
	 * Both are `'responsive' => true`: a Desktop / Tablet / Mobile switch
	 * beside the title, with tablet and mobile stored inside the value
	 * (`{width, unit, tablet: {width, unit}}`), the shape 3D Viewer Pro's
	 * `bp3d_responsive_dimensions` writes. Align is responsive too, and as a
	 * scalar it keeps tablet and mobile in `bp_3d_align_tablet` /
	 * `bp_3d_align_mobile`.
	 */
	private static function style(): array
	{
		return array(
			'title'  => __('Style', 'bfields-demo'),
			'icon'   => 'fa fa-paint-brush',
			'fields' => array(
				array(
					'id'         => 'bp_3d_width',
					'type'       => 'dimensions',
					'title'      => __('Width', 'bfields-demo'),
					'subtitle'   => __('Set the width of the 3D viewer. You can use values like %, px, or vw for responsive layouts.', 'bfields-demo'),
					'icon'       => 'move',
					'units'      => array('%', 'px', 'vw'),
					'responsive' => true,
					'height'     => false,
					'default'    => array('width' => '100', 'unit' => '%'),
				),
				array(
					'id'         => 'bp_3d_height',
					'type'       => 'dimensions',
					'title'      => __('Height', 'bfields-demo'),
					'subtitle'   => __('Set the height of the 3D viewer. Adjust this to control how much vertical space the model occupies.', 'bfields-demo'),
					'icon'       => 'zoom-in',
					'units'      => array('px', 'em', 'pt'),
					'responsive' => true,
					'width'      => false,
					'default'    => array('height' => '320', 'unit' => 'px'),
				),
				array(
					'id'         => 'bp_3d_align',
					'type'       => 'button_set',
					'title'      => __('Align', 'bfields-demo'),
					'subtitle'   => __('Controls the alignment of the 3D viewer within its container, such as left, center, or right.', 'bfields-demo'),
					'icon'       => 'maximize',
					'options'    => array(
						'start'  => __('Left', 'bfields-demo'),
						'center' => __('Center', 'bfields-demo'),
						'end'    => __('Right', 'bfields-demo'),
					),
					'responsive' => true,
					'default'    => 'center',
				),
				array(
					'id'       => 'bp_model_bg',
					'type'     => 'color',
					'title'    => __('Background Color', 'bfields-demo'),
					'subtitle' => __("Set background color for 3d model. If you don't need just leave blank. Default: 'transparent color'", 'bfields-demo'),
					'icon'     => 'zoom-out',
					'default'  => 'transparent',
				),

				// ---- beyond the design ----

				array(
					'id'           => 'bp_model_bg_image',
					'type'         => 'upload',
					'title'        => __('Background Image', 'bfields-demo'),
					'subtitle'     => __('Shown behind the model. The background colour is ignored while an image is set.', 'bfields-demo'),
					'button_title' => __('Upload', 'bfields-demo'),
					'library'      => 'image',
					'icon'         => 'image',
					'dependency'   => array('currentViewer', '==', 'modelViewer', 'all'),
				),
				array(
					'id'          => 'bp_3d_thumb_size',
					'type'        => 'text',
					'title'       => __('Thumb Size', 'bfields-demo'),
					'subtitle'    => __('Size of each thumbnail in the model list, e.g. 70px', 'bfields-demo'),
					'icon'        => 'grid',
					'placeholder' => '70px',
					'default'     => '70px',
					'dependency'  => array('bp_3d_model_type', '==', 'mcycle', 'all'),
				),
				array(
					'id'         => 'bp_model_progressbar_color',
					'type'       => 'color',
					'title'      => __('Progressbar Color', 'bfields-demo'),
					'subtitle'   => __('Changes the color of the loading progress bar shown while the model is loading.', 'bfields-demo'),
					'icon'       => 'palette',
					'default'    => 'rgba(0, 0, 0, 0.4)',
					'dependency' => array('currentViewer|bp_3d_progressbar', '==|==', 'modelViewer|1', 'all'),
				),
				array(
					'id'         => 'bp_3d_control_size',
					'type'       => 'number',
					'title'      => __('Control Size', 'bfields-demo'),
					'subtitle'   => __('Width and height of each control button. Inline labels keep this height and grow sideways.', 'bfields-demo'),
					'icon'       => 'sliders',
					'unit'       => 'px',
					'default'    => 35,
					'attributes' => array('min' => 24, 'max' => 64, 'step' => 1),
				),
				array(
					'id'         => 'bp_3d_control_gap',
					'type'       => 'number',
					'title'      => __('Control Spacing', 'bfields-demo'),
					'subtitle'   => __('Space between controls stacked in the same corner.', 'bfields-demo'),
					'icon'       => 'sliders',
					'unit'       => 'px',
					'default'    => 10,
					'attributes' => array('min' => 0, 'max' => 40, 'step' => 1),
				),
				array(
					'id'         => 'bp_3d_control_offset',
					'type'       => 'number',
					'title'      => __('Control Edge Offset', 'bfields-demo'),
					'subtitle'   => __('Distance from the viewer edge to the controls.', 'bfields-demo'),
					'icon'       => 'move',
					'unit'       => 'px',
					'default'    => 10,
					'attributes' => array('min' => 0, 'max' => 60, 'step' => 1),
				),
				array(
					// Demo-only: the one `spacing` field on either screen.
					'id'       => 'bp_3d_padding',
					'type'     => 'spacing',
					'title'    => __('Padding', 'bfields-demo'),
					'icon'     => 'maximize',
					'units'    => array('px', 'em', 'rem', '%'),
					'default'  => array('top' => '', 'right' => '', 'bottom' => '', 'left' => '', 'unit' => 'px'),
				),
			),
		);
	}

	/**
	 * Additional — custom CSS, and the wrapper's extra id and class.
	 */
	private static function additional(): array
	{
		return array(
			'title'  => __('Additional', 'bfields-demo'),
			'icon'   => 'fa fa-code',
			'fields' => array(
				array(
					'id'       => 'css',
					'type'     => 'code_editor',
					'title'    => __('Custom CSS', 'bfields-demo'),
					'subtitle' => __('Add your own CSS to style the 3D viewer. Use the Additional ID below as the wrapper selector.', 'bfields-demo'),
					'icon'     => 'code',
					'settings' => array(
						'theme' => 'mbo',
						'mode'  => 'css',
					),
					'default'  => '',
				),
				array(
					'id'       => 'additional_id',
					'type'     => 'text',
					'title'    => __('Additional ID', 'bfields-demo'),
					'subtitle' => __('Adds a custom HTML ID to the 3D viewer wrapper. Useful for targeting the viewer with CSS or JavaScript.', 'bfields-demo'),
					'icon'     => 'code',
					'default'  => '',
				),
				array(
					'id'       => 'additional_class',
					'type'     => 'text',
					'title'    => __('Additional Class', 'bfields-demo'),
					'subtitle' => __('Adds custom CSS class names to the 3D viewer wrapper for advanced styling or scripting.', 'bfields-demo'),
					'icon'     => 'code',
					'default'  => '',
				),
			),
		);
	}

	/**
	 * Preview — a `callback` field, rendered by PHP and left alone by the UI.
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
						// Codestar renders this; the demo's EditorShell does not.
						// A section holding a `callback` is the preview section,
						// and the shell draws the design's stage card for it
						// (demo/ui/layout/StageCard.tsx). The node stays so the
						// Classic renderer has somewhere to mount a preview.
						echo '<div id="bfields-demo-stage" class="bfields-demo-stage-mount"></div>';
					},
				),
			),
		);
	}
}
