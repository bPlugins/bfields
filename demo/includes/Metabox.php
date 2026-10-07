<?php
/**
 * bfields demo — the "3D Viewer Settings" editor.
 *
 * The framework renders a meta box as a plain core postbox (BFields\Metabox).
 * The design draws something else, so the demo registers its schema with
 * `'render' => false` and supplies the pieces its own editor needs: a mount
 * node, the mirror field, and a `save_post` handler. Storage is the
 * framework's (BFields\Storage\PostMeta): read-modify-write, wp_slash, and the
 * bfields_/csf_ save hooks with the post id.
 *
 * WHY NOT A META BOX. The design draws the Add New screen as ONE page — title,
 * shortcode bar, a tabbed panel with its own sidebar holding Live Preview and
 * Publish — not as a postbox in WordPress's two-column layout. So the root is
 * printed at `edit_form_top`, inside `#post` but outside `#poststuff`, and
 * demo.css hides WordPress's editor and Publish box once the bundle has
 * mounted — only those, so other plugins' meta boxes stay (review 3.5). The
 * schema is registered with `'render' => false` so the framework's own meta
 * box does not render it too. Everything the
 * form posts is still in the form: WordPress's hidden fields, its nonce, its
 * hidden title input (which the editor mirrors into) and its submit box.
 *
 * SAVE PATH. There is no REST call here. The React body mirrors its store into
 * one hidden field inside `#post`, so the screen is saved by WordPress's own
 * Publish button, in WordPress's own request, with WordPress's own nonce — the
 * user gets the editor they already know, and the demo does not have to invent
 * a second way to persist a post. That is also why the whole payload is sent
 * rather than the dirty fields only: the handler merges what it is given, and a
 * partial payload is how a field silently reverts to its default.
 *
 * @package BFieldsDemo
 */

namespace BFieldsDemo;

use BFields\Registry;
use BFields\Storage\PostMeta;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Renders and saves the viewer editor, and lends both steps to every other
 * editor the demo draws.
 */
final class Metabox
{
	/** The hidden field the React body mirrors its store into. */
	const INPUT = 'bfields_demo_values';

	const NONCE = 'bfields_demo_nonce';

	/** @var Metabox|null */
	private static $instance = null;

	public static function instance(): Metabox
	{
		if (self::$instance === null) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function register(): void
	{
		add_action('edit_form_top', array($this, 'render'));
		add_action('save_post_' . POST_TYPE, array($this, 'save'), 10, 2);
	}

	/**
	 * The viewer editor's root, at the top of `#post`.
	 */
	public function render(\WP_Post $post): void
	{
		if (POST_TYPE !== $post->post_type) {
			return;
		}

		$this->print_root($post, VIEWER_KEY);

		echo '<noscript><p class="bfields-demo-noscript">';
		esc_html_e('This editor needs JavaScript. WordPress\'s own editor is shown below instead; your saved settings are unchanged.', 'bfields-demo');
		echo '</p></noscript>';
	}

	/**
	 * Persist the viewer editor.
	 *
	 * @param int      $post_id Post being saved.
	 * @param \WP_Post $post    The post object.
	 */
	public function save(int $post_id, \WP_Post $post): void
	{
		if (POST_TYPE !== $post->post_type) {
			return;
		}

		$this->save_root($post_id, VIEWER_KEY);
	}

	/**
	 * The nonce, the mirror field and the mount node for one editor.
	 *
	 * Shared by every screen the demo draws with EditorShell (the viewer's
	 * here, the product's in ProductEditor.php), so they post and save the
	 * same way.
	 *
	 * The mirror field is pre-filled with the hydrated values. A browser that
	 * never runs the bundle therefore posts back exactly what it was given, and
	 * saving the post is a no-op instead of a wipe — the framework's rule that
	 * an absent payload is never a delete, applied to a form submit.
	 *
	 * @param \WP_Post            $post   Post being edited.
	 * @param string              $unique Storage key.
	 * @param array<string, mixed> $data  Extra data-* attributes for the root.
	 * @return bool Whether a root was printed.
	 */
	public function print_root(\WP_Post $post, string $unique, array $data = array()): bool
	{
		$schema = Registry::instance()->schema($unique);

		if (!$schema) {
			return false;
		}

		$values = (new PostMeta((int) $post->ID, $unique))->hydrate($schema);

		wp_nonce_field(self::nonce_action($unique, (int) $post->ID), self::NONCE);

		printf(
			'<textarea name="%1$s" id="%1$s" style="display:none" readonly>%2$s</textarea>',
			esc_attr(self::INPUT),
			esc_textarea((string) wp_json_encode($values))
		);

		$attrs = '';

		foreach (array_merge(array('unique' => $unique, 'kind' => 'metabox', 'input' => self::INPUT), $data) as $name => $value) {
			$attrs .= sprintf(' data-%s="%s"', sanitize_key($name), esc_attr((string) $value));
		}

		// `bfields-demo-root` and not `bfields-root`: the framework bundle
		// mounts every `.bfields-root` it finds, and on this screen the demo
		// bundle is the renderer. Two mounts on one node is a bug that only
		// shows up when both scripts happen to load together.
		printf(
			'<div class="bfields-demo-root bfields-app"%1$s%2$s></div>',
			$attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
			self::brand_style($schema) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in brand_style().
		);

		return true;
	}

	/**
	 * The schema's brand tokens as a ` style="…"` attribute, or ''.
	 */
	private static function brand_style(array $schema): string
	{
		$style = '';

		foreach ($schema['args']['brand'] as $token => $value) {
			if ('logo' === $token) {
				continue;
			}
			$style .= '--bfields-' . sanitize_key($token) . ':' . $value . ';';
		}

		return '' === $style ? '' : ' style="' . esc_attr($style) . '"';
	}

	/**
	 * Persist one editor's payload, if this request carries it.
	 *
	 * @param int    $post_id Post being saved.
	 * @param string $unique  Storage key.
	 */
	public function save_root(int $post_id, string $unique): void
	{
		if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
			return;
		}

		if (wp_is_post_revision($post_id)) {
			return;
		}

		$nonce = isset($_POST[self::NONCE]) ? sanitize_text_field(wp_unslash($_POST[self::NONCE])) : '';

		if (!wp_verify_nonce($nonce, self::nonce_action($unique, $post_id))) {
			return;
		}

		if (!current_user_can('edit_post', $post_id)) {
			return;
		}

		// Absent payload is a no-op, never a delete. A bundle that failed to
		// load must not be able to blank a record just because the user hit
		// Update.
		if (!isset($_POST[self::INPUT])) {
			return;
		}

		$raw = wp_unslash($_POST[self::INPUT]); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- JSON, sanitized against the schema below.

		if (!is_string($raw) || '' === trim($raw)) {
			return;
		}

		$values = json_decode($raw, true);

		if (!is_array($values) || array() === $values) {
			return;
		}

		$schema = Registry::instance()->schema($unique);

		if (!$schema) {
			return;
		}

		// Everything below this line is sanitized by the framework against the
		// schema; nothing the browser sent is trusted.
		(new PostMeta($post_id, $unique))->save($values, $schema);
	}

	/**
	 * The nonce is per key as well as per post: a nonce printed for one
	 * editor can never save another's key.
	 */
	private static function nonce_action(string $unique, int $post_id): string
	{
		return 'bfields_demo_save_' . $unique . '_' . $post_id;
	}
}
