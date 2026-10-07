<?php
/**
 * bfields demo — the Help & Demos dashboard.
 *
 * 3D Viewer's own dashboard screen (3d-viewer/inc/admin.php,
 * render_dashboard_page()), under the demo's menu. It is not a bfields
 * screen: the demo bundle draws it with plain React (demo/ui/dashboard/) and
 * it stores nothing, so there is no sandbox key to keep apart.
 *
 * Every link that would lead into 3D Viewer points at the demo's copy of that
 * screen instead — Add New, the viewer list, Settings — so clicking around
 * never leaves the sandbox.
 *
 * @package BFieldsDemo
 */

namespace BFieldsDemo;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Registers and renders the dashboard page.
 */
final class Dashboard
{
	/** Submenu slug; Assets.php matches the screen's hook on it. */
	const SLUG = 'bfields-demo-dashboard';

	/** @var Dashboard|null */
	private static $instance = null;

	public static function instance(): Dashboard
	{
		if (self::$instance === null) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function register(): void
	{
		add_action('admin_menu', array($this, 'add_page'), 15);
	}

	/**
	 * Add "Help & Demos" to the demo menu, where 3D Viewer puts it: position 9,
	 * in the same orange.
	 */
	public function add_page(): void
	{
		add_submenu_page(
			'edit.php?post_type=' . POST_TYPE,
			__('Demo and Help - 3D Viewer Demo', 'bfields-demo'),
			'<span style="color: #f18500;">' . esc_html__('Help & Demos', 'bfields-demo') . '</span>',
			'edit_posts',
			self::SLUG,
			array($this, 'render'),
			9
		);
	}

	/**
	 * Print the mount node and the config the dashboard reads from it
	 * (demo/ui/dashboard/lib/config.ts).
	 */
	public function render(): void
	{
		$cpt = 'edit.php?post_type=' . POST_TYPE;

		$info = wp_json_encode(array(
			// 3D Viewer's version when it is active next to the demo, which is
			// the number the real screen would show.
			'version'    => defined('BP3D_VERSION') && is_string(BP3D_VERSION) ? BP3D_VERSION : '',
			// The demo has no guided setup, so the nav entry for it stays hidden.
			'onboarding' => array('completed' => true, 'percent' => 100),
			'urls'       => array(
				'addModel'       => admin_url('post-new.php?post_type=' . POST_TYPE),
				'models'         => admin_url($cpt),
				'settings'       => admin_url($cpt . '&page=bfields-demo-settings'),
				// No extension manager in the demo; the nav entry is dropped when empty.
				'extensions'     => '',
				'setup'          => '',
				'docs'           => 'https://bplugins.com/docs/3d-viewer/',
				'support'        => 'https://bplugins.com/support/',
				'community'      => 'https://facebook.com/groups/1828495198556137',
				'featureRequest' => 'https://bplugins.com/support/',
				'review'         => 'https://wordpress.org/support/plugin/3d-viewer/reviews/#new-post',
				'changelog'      => 'https://wordpress.org/plugins/3d-viewer/#developers',
				'pricing'        => 'https://bplugins.com/products/3d-viewer/pricing/',
			),
		));

		printf('<div id="%s" data-info="%s"></div>', esc_attr(self::SLUG), esc_attr($info));
	}
}
