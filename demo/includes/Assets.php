<?php
/**
 * bfields demo — the demo bundle.
 *
 * The demo ships a SECOND bundle (demo/build/index.js), never a second copy of
 * the framework's. It does two unrelated jobs:
 *
 *   Settings screen — the framework bundle renders; the demo bundle only calls
 *     window.bfields.registerField() for the four types the framework has not
 *     shipped yet (group, fieldset, spacing, link). This is the supported
 *     extension path, and it is what a host plugin would do.
 *
 *   Help & Demos — the framework bundle does no rendering either; the demo
 *     bundle draws 3D Viewer's dashboard (demo/ui/dashboard/), plain React.
 *
 *   Viewer editor — the framework bundle does no rendering. The demo bundle
 *     draws the whole editor screen itself, because a post-editor shell is not
 *     something the framework offers yet. It reuses the framework's own
 *     stylesheet, so the two screens cannot drift apart visually.
 *
 *   Product editor — the same shell, drawn into two meta boxes on
 *     WooCommerce's product screen (ProductEditor.php).
 *
 * @package BFieldsDemo
 */

namespace BFieldsDemo;

use BFields\Assets as Framework;
use BFields\Registry;
use BFields\Storage\PostMeta;
use BFields\Schema;
use BFields\Storage\Values;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Registers and enqueues the demo bundle.
 */
final class Assets
{
	/** @var Assets|null */
	private static $instance = null;

	public static function instance(): Assets
	{
		if (self::$instance === null) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function register(): void
	{
		// Priority 20: after BFields\Assets registers `bfields-ui` at 5, so the
		// dependency below resolves.
		add_action('admin_enqueue_scripts', array($this, 'enqueue'), 20);
	}

	/**
	 * Enqueue whichever half of the demo this screen needs.
	 *
	 * @param string $hook Admin page hook suffix.
	 */
	public function enqueue(string $hook): void
	{
		$screen = function_exists('get_current_screen') ? get_current_screen() : null;

		$is_editor = $screen && POST_TYPE === $screen->post_type && in_array($screen->base, array('post', 'add'), true);
		$is_product = $screen && 'product' === $screen->post_type && 'post' === $screen->base && ProductEditor::active();
		$is_settings = false !== strpos($hook, 'bfields-demo-settings');
		$is_dashboard = false !== strpos($hook, Dashboard::SLUG);

		if (!$is_editor && !$is_product && !$is_settings && !$is_dashboard) {
			return;
		}

		$asset_file = BFIELDS_DEMO_PATH . 'build/index.asset.php';

		if (!is_readable($asset_file)) {
			// The demo has not been built. Say so on the screen rather than
			// rendering an empty box and leaving the developer guessing.
			add_action('admin_notices', static function (): void {
				echo '<div class="notice notice-error"><p>';
				echo esc_html__('The bfields demo bundle is missing. Run "npm run build:demo" in the bfields plugin folder.', 'bfields-demo');
				echo '</p></div>';
			});
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_style(Framework::HANDLE);

		wp_register_script(
			HANDLE,
			BFIELDS_DEMO_URL . 'build/index.js',
			// `bfields-ui` is a dependency even on the editor screen, where the
			// framework bundle does no rendering: the demo calls
			// window.bfields.registerField() unconditionally, and a script that
			// races its own API is a bug that only shows on slow connections.
			array_merge($asset['dependencies'], array(Framework::HANDLE)),
			$asset['version'],
			true
		);

		wp_register_style(
			HANDLE,
			BFIELDS_DEMO_URL . 'build/index.css',
			array(Framework::HANDLE),
			$asset['version']
		);

		wp_enqueue_script(HANDLE);
		wp_enqueue_style(HANDLE);

		if ($is_editor) {
			wp_enqueue_media();
			$this->localize_editor();
		}

		if ($is_product) {
			wp_enqueue_media();
			$this->localize_product();
		}
	}

	/**
	 * Hand the viewer editor its schema and values.
	 */
	private function localize_editor(): void
	{
		$post = get_post();

		if (!$post) {
			return;
		}

		$screen = get_current_screen();
		$labels = get_post_type_object(POST_TYPE)->labels;

		$booted = $this->boot(VIEWER_KEY, $post, array(
			'frame'      => 'page',
			'heading'    => $screen && 'add' === $screen->action ? $labels->add_new_item : $labels->edit_item,
			// '' on post-new.php: WordPress blanks the auto-draft's title
			// on the global post before the screen renders.
			'title'      => (string) $post->post_title,
			'titleInput' => 'title',
			'shortcode'  => PostType::instance()->shortcode((int) $post->ID),
		));

		if (!$booted) {
			return;
		}

		// The body class hides WordPress's own editor so the design's can take
		// its place. If the bundle never mounts — a 404 behind a caching
		// plugin, a script error before boot — that would leave a post with no
		// way to save. This runs after the bundle's tag whether or not its
		// file loaded, and hands WordPress's editor back if nothing mounted.
		wp_add_inline_script(
			HANDLE,
			'(function(){function check(){if(!document.querySelector(\'.bfields-demo-root[data-bfields-mounted="1"]\')){document.body.classList.remove(\'bfields-demo-editor\');}}'
				. 'if(document.readyState===\'loading\'){document.addEventListener(\'DOMContentLoaded\',check);}else{check();}})();',
			'after'
		);
	}

	/**
	 * Hand the product box its schema and values. WordPress keeps the title
	 * and the Publish box on this screen, so the shell draws neither
	 * (ProductEditor.php).
	 */
	private function localize_product(): void
	{
		$post = get_post();

		if (!$post) {
			return;
		}

		$this->boot(PRODUCT_KEY, $post, array(
			'frame'        => 'metabox',
			'shortcode'    => ProductEditor::shortcode((int) $post->ID),
			'hint'         => __('Paste this shortcode in the product description, or in any post, page or widget', 'bfields-demo'),
		));
	}

	/**
	 * One editor's boot payload.
	 *
	 * Same shape as BFields\Assets::enqueue_for(), under a different global:
	 * the demo's mounter reads `window.bfieldsDemoBoot`, so the two bundles
	 * can sit on one page without fighting over one variable.
	 *
	 * @param string               $unique Storage key.
	 * @param \WP_Post             $post   Post being edited.
	 * @param array<string, mixed> $editor The furniture EditorShell draws (EditorBoot).
	 */
	private function boot(string $unique, \WP_Post $post, array $editor): bool
	{
		$schema = Registry::instance()->schema($unique);

		if (!$schema) {
			return false;
		}

		$storage = new PostMeta((int) $post->ID, $unique);
		$stored  = $storage->read();

		$payload = array(
			'schema'     => Schema::for_client($schema),
			'values'     => Values::hydrate($stored, $schema),
			'aliases'    => Schema::section_aliases($schema),
			'undeclared' => Values::undeclared($stored, $schema),
			'editor'     => $editor + array(
				'heading'    => '',
				'title'      => '',
				'titleInput' => '',
				'published'  => in_array($post->post_status, array('publish', 'future', 'private'), true),
			),
		);

		wp_add_inline_script(
			HANDLE,
			'window.bfieldsDemoBoot = window.bfieldsDemoBoot || {};'
				. 'window.bfieldsDemoBoot[' . wp_json_encode($unique) . '] = ' . wp_json_encode($payload) . ';',
			'before'
		);

		return true;
	}
}
