<?php
/**
 * bfields demo — the sandbox viewer post type.
 *
 * A copy of 3D Viewer Premium's `bp3d-model-viewer` screen: the menu, the list
 * table's Shortcode column, the update notices, and the editor screen itself.
 *
 * The editor is drawn by the demo bundle to the design (demo/ui/layout/
 * EditorShell.tsx), and this class hands it the screen: a body class that
 * hides WordPress's heading, title/editor and Publish box (other plugins' meta
 * boxes stay) and sets the design's page background and gutters. The form, its hidden fields and its submit request
 * are untouched — the editor's buttons submit `#post` exactly as the Publish
 * box would, so the save path, the redirect and the "Viewer updated." notice
 * are still WordPress's.
 *
 * @package BFieldsDemo
 */

namespace BFieldsDemo;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Registers the demo post type and its editor chrome.
 */
final class PostType
{
	/** @var PostType|null */
	private static $instance = null;

	public static function instance(): PostType
	{
		if (self::$instance === null) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Hook everything up.
	 */
	public function register(): void
	{
		add_action('init', array($this, 'register_post_type'), 0);

		if (!is_admin()) {
			return;
		}

		add_filter('manage_' . POST_TYPE . '_posts_columns', array($this, 'add_shortcode_column'));
		add_action('manage_' . POST_TYPE . '_posts_custom_column', array($this, 'render_shortcode_column'), 10, 2);
		add_filter('post_updated_messages', array($this, 'update_messages'));
		add_filter('admin_body_class', array($this, 'editor_body_class'));
		add_action('admin_head', array($this, 'mark_add_new_submenu'));
	}

	/**
	 * Register the post type.
	 *
	 * `show_in_rest` is false and `supports` is title-only, which is what keeps
	 * the classic editor — and therefore meta boxes — on this screen. The block
	 * editor would render the meta box in a compatibility drawer at the bottom
	 * of the page, which is not the screen 3D Viewer ships.
	 */
	public function register_post_type(): void
	{
		register_post_type(POST_TYPE, array(
			'labels' => array(
				'name'           => __('3D Viewer Demo', 'bfields-demo'),
				'menu_name'      => __('3D Viewer Demo', 'bfields-demo'),
				'name_admin_bar' => __('3D Viewer Demo', 'bfields-demo'),
				'add_new'        => __('Add New', 'bfields-demo'),
				'add_new_item'   => __('Add New', 'bfields-demo'),
				'new_item'       => __('New 3D Viewer', 'bfields-demo'),
				'edit_item'      => __('Edit 3D Viewer', 'bfields-demo'),
				'view_item'      => __('View 3D Viewer', 'bfields-demo'),
				'all_items'      => __('All 3D Viewers', 'bfields-demo'),
				'search_items'   => __('Search Viewers', 'bfields-demo'),
				'not_found'      => __('No viewers yet. Create one to see the demo.', 'bfields-demo'),
			),
			'description'     => __('bfields demo viewers. Sandbox data.', 'bfields-demo'),
			'public'          => false,
			'show_ui'         => true,
			'menu_icon'       => 'dashicons-format-image',
			'menu_position'   => 58,
			'capability_type' => 'post',
			'has_archive'     => false,
			'hierarchical'    => false,
			'supports'        => array('title'),
			'show_in_rest'    => false,
		));
	}

	/**
	 * Add the Shortcode column to the list table.
	 *
	 * Inserted before Date rather than appended, which is where 3D Viewer puts
	 * it — rebuilding the array is the only way to control column order.
	 *
	 * @param array $columns Existing columns.
	 */
	public function add_shortcode_column(array $columns): array
	{
		$out = array();

		foreach ($columns as $key => $label) {
			if ('date' === $key) {
				$out['bfields_demo_shortcode'] = __('Shortcode', 'bfields-demo');
			}
			$out[$key] = $label;
		}

		if (!isset($out['bfields_demo_shortcode'])) {
			$out['bfields_demo_shortcode'] = __('Shortcode', 'bfields-demo');
		}

		return $out;
	}

	/**
	 * Render the Shortcode column.
	 *
	 * @param string $column  Column key.
	 * @param int    $post_id Post id.
	 */
	public function render_shortcode_column(string $column, int $post_id): void
	{
		if ('bfields_demo_shortcode' !== $column) {
			return;
		}

		printf(
			'<code class="bfields-demo-shortcode">%s</code>',
			esc_html($this->shortcode($post_id))
		);
	}

	/**
	 * Hand the editor screen to the demo bundle.
	 *
	 * The class is what demo.css keys on to hide WordPress's heading, editor
	 * and Publish box and to lay the page out on the design's 1185px column.
	 * Only on `post.php` / `post-new.php` for this post type — the list table
	 * stays stock WordPress.
	 *
	 * @param string $classes Space-separated body classes.
	 */
	public function editor_body_class(string $classes): string
	{
		$screen = function_exists('get_current_screen') ? get_current_screen() : null;

		if (!$screen || POST_TYPE !== $screen->post_type || 'post' !== $screen->base) {
			return $classes;
		}

		// Spaces on BOTH sides. admin_body_class is a plain string, and filters
		// that run after this one append without a leading space (Tutor LMS
		// does), which glued the next class onto this one and silently turned
		// the whole screen back into stock WordPress.
		return $classes . ' bfields-demo-editor ';
	}

	/**
	 * Mark the sidebar's "Add New" item with a nested arrow.
	 */
	public function mark_add_new_submenu(): void
	{
		printf(
			'<style>#adminmenu a[href*="post-new.php?post_type=%s"]::before{content:"\\21B3\\00A0"}</style>',
			esc_attr(POST_TYPE)
		);
	}

	/**
	 * Say "Viewer" rather than "Post" in the update notices.
	 *
	 * @param array $messages Existing messages.
	 */
	public function update_messages(array $messages): array
	{
		$viewer = array(
			0  => '',
			1  => __('Viewer updated.', 'bfields-demo'),
			4  => __('Viewer updated.', 'bfields-demo'),
			6  => __('Viewer published.', 'bfields-demo'),
			7  => __('Viewer saved.', 'bfields-demo'),
			10 => __('Viewer draft updated.', 'bfields-demo'),
		);

		$messages[POST_TYPE] = $viewer + array_fill(0, 11, __('Viewer updated.', 'bfields-demo'));

		return $messages;
	}

	/**
	 * The shortcode for a viewer.
	 *
	 * Deliberately `bfields_demo_viewer`, not `3d_viewer`: pasting a demo
	 * shortcode into a real page must render nothing rather than a viewer
	 * built from sandbox data.
	 */
	public function shortcode(int $post_id): string
	{
		return sprintf('[bfields_demo_viewer id="%d"]', $post_id);
	}
}
