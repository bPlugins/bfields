<?php
/**
 * bfields demo — the plain postbox screen.
 *
 * Every other editor the demo draws registers with `'render' => false` and
 * prints and saves itself (Metabox.php). This one does not: it is the
 * framework's DEFAULT meta box path, untouched — BFields\Metabox adds the core
 * postbox, prints the nonce and the disabled mirror field, enables the field
 * from the framework bundle, and saves through BFields\Storage\PostMeta on
 * `save_post`. The demo supplies a post type and a field set, nothing else.
 *
 * Its own post type, so the Add New screen that is compared against the Figma
 * frames never grows a second box. Stock WordPress chrome: title, Publish box,
 * Revisions (so a save creates one, and tests/e2e/metabox-save.mjs can check
 * that a revision carries no meta).
 *
 * @package BFieldsDemo
 */

namespace BFieldsDemo;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Registers the sandbox postbox post type.
 */
final class Postbox
{
	/** @var Postbox|null */
	private static $instance = null;

	public static function instance(): Postbox
	{
		if (self::$instance === null) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function register(): void
	{
		add_action('init', array($this, 'register_post_type'), 0);
	}

	/**
	 * Register the post type, as a submenu of the demo's own menu.
	 *
	 * Classic editor for the same reason as the viewer (PostType.php):
	 * `show_in_rest` false keeps meta boxes in `#poststuff`.
	 */
	public function register_post_type(): void
	{
		register_post_type(POSTBOX_TYPE, array(
			'labels' => array(
				'name'          => __('Postbox Demo', 'bfields-demo'),
				'singular_name' => __('Postbox Demo', 'bfields-demo'),
				'menu_name'     => __('Postbox Demo', 'bfields-demo'),
				'all_items'     => __('Postbox Demo', 'bfields-demo'),
				'add_new_item'  => __('Add New Postbox Demo', 'bfields-demo'),
				'edit_item'     => __('Edit Postbox Demo', 'bfields-demo'),
			),
			'description'     => __('The framework\'s plain meta box. Sandbox data.', 'bfields-demo'),
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => 'edit.php?post_type=' . POST_TYPE,
			'capability_type' => 'post',
			'has_archive'     => false,
			'hierarchical'    => false,
			'supports'        => array('title', 'revisions'),
			'show_in_rest'    => false,
		));
	}
}
