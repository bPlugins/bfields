<?php
/**
 * bfields — meta boxes: registration, mount node, save.
 *
 * A registered meta box renders as an ordinary core meta box inside
 * `#poststuff`, and hides nothing else on the screen: other plugins' boxes,
 * the featured image and the host's own side boxes stay where WordPress puts
 * them (decided 2026-09-23, review 3.5). A host that wants the design's
 * full-screen editor either registers with `'render' => false` and prints and
 * saves the screen itself (the demo does), or asks for `'frame' => 'page'`:
 * the framework then draws the whole Add New / Edit page (EditorShell.tsx) at
 * `edit_form_top`, hides WordPress's title, editor and side column behind a
 * body class, and saves through the same mirror field and save() as the box.
 *
 * SAVE PATH. There is no REST call. The React body mirrors its store into one
 * hidden field inside the post form, so the box is saved by WordPress's own
 * Publish / Update, in WordPress's own request. The field is printed DISABLED
 * and empty and the bundle enables it when it mounts: a disabled field is not
 * submitted, so if the bundle never runs, saving the post writes nothing
 * rather than a stale copy (7.4).
 *
 * @package BFields
 */

namespace BFields;

use BFields\Storage\PostMeta;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Adds, renders and saves every registered meta box.
 */
final class Metabox
{
	/** Errors-transient entry meaning "this box was not saved: capability". Never a field id. */
	const SKIPPED = '__bfields_skipped';

	/** Errors-transient entry meaning "this box was not saved: stale nonce" (update-in-place screens only). */
	const NONCE_FAILED = '__bfields_nonce';

	/** POST field the in-place client adds; never printed in the form. */
	const IN_PLACE = 'bfields_in_place';

	/** Errors-transient entry: the in-place save that wrote it. Never a field id. */
	const TOKEN = '__bfields_token';

	/** GET flag of the in-place client's follow-up load; carries the token it may consume. */
	const SETTLE = 'bfields_settle';

	/**
	 * What save() did per blog|post|unique in this request, for the in-place response.
	 *
	 * @var array<string, array{box: string, errors: array}>
	 */
	private $outcomes = array();

	/** @var string This request's in-place save token, made on first use. */
	private $token = '';

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
		add_action('add_meta_boxes', array($this, 'add_boxes'), 10, 1);
		// After Assets::register_assets() (priority 5).
		add_action('admin_enqueue_scripts', array($this, 'enqueue'), 20);
		add_action('save_post', array($this, 'save'), 10, 2);
		add_action('edit_form_top', array($this, 'render_page'));
		add_filter('admin_body_class', array($this, 'body_class'));
		// After every other plugin, so `location` carries their changes.
		add_filter('redirect_post_location', array($this, 'redirect_location'), PHP_INT_MAX, 2);
		add_filter('wp_refresh_nonces', array($this, 'refresh_nonces'), 11, 3);
	}

	/** `'page' => ['update_in_place' => true]`: Update saves without a reload (opt-in). */
	private static function in_place_arg(array $screen): bool
	{
		return isset($screen['args']['page']) && is_array($screen['args']['page']) && !empty($screen['args']['page']['update_in_place']);
	}

	/** The host's switch, read whenever it is used so a late filter still counts. */
	private static function in_place_allowed(int $post_id, string $unique): bool
	{
		return (bool) apply_filters('bfields_update_in_place', true, $post_id, $unique);
	}

	private static function outcome_key(int $post_id, string $unique): string
	{
		return get_current_blog_id() . '|' . $post_id . '|' . $unique;
	}

	/** `'frame' => 'page'`: the screen is drawn as the whole editor page, not a box. */
	private static function is_page(array $screen): bool
	{
		return isset($screen['args']['frame']) && 'page' === $screen['args']['frame'];
	}

	/**
	 * The page-frame screen for a post type, if any. One per post type: the
	 * first registered wins, later ones stay plain boxes.
	 *
	 * @return array{0: string, 1: array}|null [unique, screen]
	 */
	private function page_screen(string $post_type): ?array
	{
		foreach ($this->screens_for($post_type) as $unique => $screen) {
			if (self::is_page($screen)) {
				return array($unique, $screen);
			}
		}

		return null;
	}

	/** The POST field a box's values arrive in: bfields_values[<unique>]. */
	public static function input_name(string $unique): string
	{
		return 'bfields_values[' . $unique . ']';
	}

	public static function input_id(string $unique): string
	{
		return 'bfields-values-' . sanitize_key($unique);
	}

	private static function nonce_name(string $unique): string
	{
		return 'bfields_metabox_nonce_' . sanitize_key($unique);
	}

	private static function nonce_action(string $unique, int $post_id): string
	{
		return 'bfields_metabox_' . $unique . '_' . $post_id;
	}

	/**
	 * Meta-box screens registered for a post type.
	 *
	 * @return array<string, array> unique => screen
	 */
	private function screens_for(string $post_type): array
	{
		$out = array();

		foreach (Registry::instance()->keys() as $unique) {
			$screen = Registry::instance()->screen($unique);

			if (!$screen || 'metabox' !== $screen['kind'] || '' !== Registry::instance()->unsupported($unique)) {
				continue;
			}

			// `'render' => false`: the host prints and saves this screen
			// itself (a full-screen editor built on the schema), so the
			// framework neither adds its box nor saves it.
			if (isset($screen['args']['render']) && false === $screen['args']['render']) {
				continue;
			}

			$types = isset($screen['args']['post_type']) ? array_filter((array) $screen['args']['post_type']) : array();

			if (in_array($post_type, $types, true)) {
				$out[$unique] = $screen;
			}
		}

		return $out;
	}

	/**
	 * add_meta_boxes: one core meta box per registered screen.
	 *
	 * @param string $post_type Post type of the screen.
	 */
	public function add_boxes($post_type): void
	{
		$page = $this->page_screen((string) $post_type);

		foreach ($this->screens_for((string) $post_type) as $unique => $screen) {
			if ($page && $page[0] === $unique) {
				continue;
			}

			$args = $screen['args'];

			add_meta_box(
				$unique,
				isset($args['title']) ? (string) $args['title'] : $unique,
				array($this, 'render'),
				(string) $post_type,
				isset($args['context']) ? (string) $args['context'] : 'normal',
				isset($args['priority']) ? (string) $args['priority'] : 'default',
				array('unique' => $unique)
			);
		}
	}

	/**
	 * Enqueue the bundle and each box's payload on the post editor.
	 */
	public function enqueue(): void
	{
		$screen = function_exists('get_current_screen') ? get_current_screen() : null;

		if (!$screen || 'post' !== $screen->base || '' === (string) $screen->post_type) {
			return;
		}

		$post = get_post();

		if (!$post) {
			return;
		}

		foreach ($this->screens_for((string) $screen->post_type) as $unique => $args) {
			if ($this->is_shown($unique, $screen, $post)) {
				Assets::instance()->enqueue_for($unique, (int) $post->ID);

				// The in-place save announces its result through wp.a11y.speak.
				if (self::is_page($args) && self::in_place_arg($args) && self::in_place_allowed((int) $post->ID, $unique)) {
					wp_enqueue_script('wp-a11y');
				}
			}
		}
	}

	/**
	 * Will this box be drawn on this editor?
	 *
	 * Core registers the boxes before `admin_enqueue_scripts` in both editors,
	 * so a box a host took off with remove_meta_box() is already `false`. The
	 * block editor also drops what `filter_block_editor_meta_boxes` removes,
	 * but only later, when it prints the boxes, so that filter is applied
	 * here too (on a copy). Without this, 3D Viewer's product box, which it
	 * removes in the block editor, loaded ~117 KB of JS and CSS for nothing.
	 *
	 * @param string     $unique Storage key, the box id.
	 * @param \WP_Screen $screen Current screen.
	 * @param \WP_Post   $post   Post being edited.
	 */
	private function is_shown(string $unique, $screen, $post): bool
	{
		global $wp_meta_boxes;

		$page = $this->page_screen((string) $post->post_type);

		if ($page && $page[0] === $unique) {
			// No box to look for: the page frame draws whenever the classic editor does.
			return !(function_exists('use_block_editor_for_post') && use_block_editor_for_post($post));
		}

		if (!is_array($wp_meta_boxes) || empty($wp_meta_boxes[$screen->id])) {
			// Nothing to go by (a host enqueueing on its own screen): enqueue.
			return true;
		}

		$boxes = $wp_meta_boxes;

		if (function_exists('use_block_editor_for_post') && use_block_editor_for_post($post)) {
			/** This filter is documented in wp-admin/includes/post.php */
			$boxes = apply_filters('filter_block_editor_meta_boxes', $boxes);
		}

		if (empty($boxes[$screen->id]) || !is_array($boxes[$screen->id])) {
			return false;
		}

		foreach ($boxes[$screen->id] as $priorities) {
			foreach ((array) $priorities as $by_id) {
				if (!empty($by_id[$unique])) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * body.bfields-page-editor on a post screen a page frame draws. page.css
	 * keys every rule that restyles or hides wp-admin's own page on it.
	 *
	 * @param string $classes Space-separated body classes.
	 */
	public function body_class($classes): string
	{
		$screen = function_exists('get_current_screen') ? get_current_screen() : null;
		$post   = get_post();

		$page = $screen && 'post' === $screen->base && $post ? $this->page_screen((string) $screen->post_type) : null;

		if (!$page) {
			return (string) $classes;
		}

		if (function_exists('use_block_editor_for_post') && use_block_editor_for_post($post)) {
			return (string) $classes;
		}

		// Printed server side so a `page_align: 'start'` column never paints centred first.
		$align = isset($page[1]['args']['page_align']) && 'start' === $page[1]['args']['page_align'] ? ' bfields-page-align-start' : '';

		// Spaces on both sides: later filters append without one.
		return $classes . ' bfields-page-editor' . $align . ' ';
	}

	/**
	 * edit_form_top: the page frame's root, inside `#post`, above `#poststuff`.
	 *
	 * @param \WP_Post $post Post being edited.
	 */
	public function render_page($post): void
	{
		if (!($post instanceof \WP_Post)) {
			return;
		}

		$page = $this->page_screen($post->post_type);

		if (!$page) {
			return;
		}

		list($unique, $screen) = $page;

		$args   = isset($screen['args']['page']) && is_array($screen['args']['page']) ? $screen['args']['page'] : array();
		$type   = get_post_type_object($post->post_type);
		$is_new = 'auto-draft' === $post->post_status;

		$shortcode = isset($args['shortcode']) ? (string) $args['shortcode'] : '';

		$editor = array(
			'heading'     => $type ? (string) ($is_new ? $type->labels->add_new_item : $type->labels->edit_item) : '',
			'title'       => (string) $post->post_title,
			'titleInput'  => 'title',
			'shortcode'   => '' === $shortcode ? '' : str_replace('%d', (string) (int) $post->ID, $shortcode),
			'hint'        => isset($args['hint']) ? (string) $args['hint'] : __('Copy and paste this shortcode into your posts, pages and widget', 'bfields'),
			'sideHeading' => isset($args['side_heading']) ? (string) $args['side_heading'] : '',
			'published'   => in_array($post->post_status, array('publish', 'future', 'private'), true),
			// What post_submit_meta_box() reads to label its buttons.
			'status'      => (string) $post->post_status,
			'canPublish'  => $type ? current_user_can($type->cap->publish_posts) : false,
			'scheduled'   => !empty($post->post_date_gmt) && time() < strtotime($post->post_date_gmt . ' +0000'),
			// get_delete_post_link() is HTML-escaped; React sets href from the raw string.
			'trashUrl'    => !$is_new && current_user_can('delete_post', $post->ID) ? wp_specialchars_decode((string) get_delete_post_link($post->ID)) : '',
			'trashLabel'  => EMPTY_TRASH_DAYS ? __('Move to Trash', 'bfields') : __('Delete permanently', 'bfields'),
		);

		if (self::in_place_arg($screen)) {
			$editor['updateInPlace'] = in_array($post->post_status, array('publish', 'private'), true) && self::in_place_allowed((int) $post->ID, $unique);
			$editor['postId']        = (int) $post->ID;
			$editor['updatedNotice'] = self::updated_notice($post->post_type);
			$editor['inPlaceNames']  = isset($args['update_in_place_boxes']) ? array_values(array_map('strval', (array) $args['update_in_place_boxes'])) : array();
		}

		$this->render($post, array('args' => array('unique' => $unique, 'frame' => 'page', 'editor' => wp_json_encode($editor))));
	}

	/**
	 * Core's "updated" message (message=1) for this post type, as edit-form-advanced.php
	 * built and filtered it in global scope just before `edit_form_top`.
	 */
	private static function updated_notice(string $post_type): string
	{
		global $messages;

		$message = '';

		if (is_array($messages) && isset($messages[$post_type][1])) {
			$message = $messages[$post_type][1];
		} elseif (is_array($messages) && !isset($messages[$post_type]) && isset($messages['post'][1])) {
			$message = $messages['post'][1];
		}

		return is_string($message) && '' !== $message ? wp_kses_post($message) : __('Post updated.', 'bfields');
	}

	/**
	 * The meta box body: nonce, mirror field, validation notices, mount node.
	 *
	 * @param \WP_Post $post Post being edited.
	 * @param array    $box  add_meta_box() callback args.
	 */
	public function render($post, array $box): void
	{
		$unique = isset($box['args']['unique']) ? (string) $box['args']['unique'] : '';
		$schema = Registry::instance()->schema($unique);

		if (!$schema || !($post instanceof \WP_Post)) {
			return;
		}

		wp_nonce_field(self::nonce_action($unique, (int) $post->ID), self::nonce_name($unique));

		printf(
			'<textarea name="%1$s" id="%2$s" hidden disabled></textarea>',
			esc_attr(self::input_name($unique)),
			esc_attr(self::input_id($unique))
		);

		$errors_key = self::errors_key($unique, (int) $post->ID);
		$errors     = get_transient($errors_key);
		$data       = array('input' => self::input_id($unique));

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only flag; it can only stop a delete.
		$settle = isset($_GET[self::SETTLE]) && is_string($_GET[self::SETTLE]) ? sanitize_text_field(wp_unslash($_GET[self::SETTLE])) : null;

		// The in-place follow-up load consumes only the page box's report from its own save, never a later one.
		if (null !== $settle && (!isset($box['args']['frame']) || !is_array($errors) || empty($errors[self::TOKEN]) || !hash_equals((string) $errors[self::TOKEN], $settle))) {
			$errors = false;
		}

		if (is_array($errors)) {
			unset($errors[self::TOKEN]);
		}

		if (isset($box['args']['frame'])) {
			$data['frame']  = (string) $box['args']['frame'];
			$data['editor'] = (string) $box['args']['editor'];
		}

		if (is_array($errors) && isset($errors[self::SKIPPED])) {
			unset($errors[self::SKIPPED]);
			delete_transient($errors_key);

			printf(
				'<div class="notice notice-warning inline bfields-box-notice" data-unique="%1$s"><p>%2$s</p></div>',
				esc_attr($unique),
				esc_html__('These settings were not saved: your account is not allowed to change them.', 'bfields')
			);
		}

		if (is_array($errors) && isset($errors[self::NONCE_FAILED])) {
			unset($errors[self::NONCE_FAILED]);
			delete_transient($errors_key);

			printf(
				'<div class="notice notice-warning inline bfields-box-notice" data-unique="%1$s"><p>%2$s</p></div>',
				esc_attr($unique),
				esc_html__('These settings were not saved because the page was open too long. Make your changes again and click Update.', 'bfields')
			);
		}

		if (is_array($errors) && array() !== $errors) {
			$data['errors'] = wp_json_encode(array_map('strval', array_keys($errors)));

			delete_transient($errors_key);

			printf('<div class="notice notice-error inline bfields-box-notice" data-unique="%s"><ul>', esc_attr($unique));
			foreach ($errors as $id => $message) {
				printf('<li><code>%1$s</code> %2$s</li>', esc_html((string) $id), esc_html((string) $message));
			}
			echo '</ul></div>';
		}

		Mount::render($unique, 'metabox', $schema, $data);
	}

	/**
	 * save_post: persist every box posted for this post.
	 *
	 * @param int      $post_id Post being saved.
	 * @param \WP_Post $post    The post object.
	 */
	public function save($post_id, $post): void
	{
		$post_id = (int) $post_id;

		if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || wp_is_post_revision($post_id) || !($post instanceof \WP_Post)) {
			return;
		}

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- verified per box below.
		$posted = isset($_POST['bfields_values']) && is_array($_POST['bfields_values']) ? $_POST['bfields_values'] : array();
		// phpcs:enable

		foreach ($this->screens_for($post->post_type) as $unique => $screen) {
			$key = self::outcome_key($post_id, $unique);

			// Absent payload is a no-op, never a delete (7.4): the bundle never
			// ran, or this box was not on the form.
			if (!isset($posted[$unique])) {
				$this->outcomes[$key] = array('box' => 'absent', 'errors' => array());
				continue;
			}

			$nonce = isset($_POST[self::nonce_name($unique)]) ? sanitize_text_field(wp_unslash($_POST[self::nonce_name($unique)])) : '';

			if (!wp_verify_nonce($nonce, self::nonce_action($unique, $post_id))) {
				$this->outcomes[$key] = array('box' => 'nonce', 'errors' => array());

				// Say so on the next load, but only for the post being edited, not a nested save of another.
				if (self::in_place_arg($screen) && self::in_place_allowed($post_id, $unique) && isset($_POST['post_ID']) && (int) $_POST['post_ID'] === $post_id) {
					$this->report($unique, $post_id, array(self::NONCE_FAILED => true));
				}
				continue;
			}

			if (!current_user_can('edit_post', $post_id)) {
				$this->outcomes[$key] = array('box' => 'cannot_edit', 'errors' => array());
				continue;
			}

			if (!current_user_can(self::capability($screen, $post->post_type))) {
				$this->outcomes[$key] = array('box' => 'capability', 'errors' => array());
				// The post itself saved, so say why these settings did not.
				$this->report($unique, $post_id, array(self::SKIPPED => true));
				continue;
			}

			$raw = wp_unslash($posted[$unique]);

			if (!is_string($raw) || '' === trim($raw)) {
				$this->outcomes[$key] = array('box' => 'empty', 'errors' => array());
				continue;
			}

			$values = json_decode($raw, true);

			if (!is_array($values) || array() === $values) {
				$this->outcomes[$key] = array('box' => 'empty', 'errors' => array());
				continue;
			}

			$schema = Registry::instance()->schema($unique);

			if (!$schema) {
				$this->outcomes[$key] = array('box' => 'schema', 'errors' => array());
				continue;
			}

			// Everything below is sanitized against the schema; nothing the
			// browser sent is trusted.
			$storage = new PostMeta($post_id, $unique);
			$storage->save($values, $schema);

			$this->outcomes[$key] = array('box' => 'saved', 'errors' => $storage->errors());

			if (array() !== $storage->errors()) {
				$this->report($unique, $post_id, $storage->errors());
			}
		}
	}

	/**
	 * Keep a box's notices for the next load. An in-place save of the post being
	 * edited tags them, so only its own follow-up GET may consume them.
	 *
	 * @param array<string, mixed> $errors Field id => message, or a SKIPPED/NONCE_FAILED flag.
	 */
	private function report(string $unique, int $post_id, array $errors): void
	{
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- save() already verified this box's nonce, or is recording that it failed.
		if (isset($_POST[self::IN_PLACE], $_POST['post_ID']) && (int) $_POST['post_ID'] === $post_id) {
			if ('' === $this->token) {
				$this->token = wp_generate_password(20, false);
			}

			$errors[self::TOKEN] = $this->token;
		}

		set_transient(self::errors_key($unique, $post_id), $errors, 5 * MINUTE_IN_SECONDS);
	}

	/**
	 * redirect_post_location, last: answer the in-place client with JSON
	 * instead of the redirect. Without its marker the location is untouched.
	 *
	 * @param string $location Where post.php is about to redirect.
	 * @param int    $post_id  Post just saved.
	 */
	public function redirect_location($location, $post_id)
	{
		$data = $this->in_place_response((string) $location, (int) $post_id);

		if (null === $data) {
			return $location;
		}

		if (!headers_sent()) {
			nocache_headers();
			status_header(200);
			header('Content-Type: text/plain; charset=' . get_option('blog_charset'));
			header('X-Content-Type-Options: nosniff');
		}

		echo self::encode_response($data); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON for a text/plain reply.
		exit;
	}

	/** Plain-text sentinels let the client skip PHP notices before and shutdown output after. */
	public static function encode_response(array $data): string
	{
		// A saved value can hold the sentinel text; \u002d keeps it out of the JSON (only strings can contain it).
		$json = str_replace('BFIELDS-UIP-', 'BFIELDS\u002dUIP-', (string) wp_json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP));

		return 'BFIELDS-UIP-BEGIN' . $json . 'BFIELDS-UIP-END';
	}

	/**
	 * The in-place payload for a save that just ran, or null when the request
	 * is not the in-place client's (the redirect then goes out as today).
	 * Read-only: it never writes, and never reads or deletes the errors transient.
	 *
	 * @param string $location Redirect target post.php built.
	 * @param int    $post_id  Post just saved.
	 */
	public function in_place_response(string $location, int $post_id): ?array
	{
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- post.php checked update-post_<id> before edit_post().
		if (!isset($_POST[self::IN_PLACE]) || !is_string($_POST[self::IN_PLACE])) {
			return null;
		}

		$action = isset($_POST['action']) && is_string($_POST['action']) ? sanitize_key(wp_unslash($_POST['action'])) : '';

		if (!isset($GLOBALS['pagenow']) || 'post.php' !== $GLOBALS['pagenow'] || 'editpost' !== $action) {
			return null;
		}

		if (!isset($_POST['post_ID']) || (int) $_POST['post_ID'] !== $post_id) {
			return null;
		}

		$post = get_post($post_id);

		if (!$post || !current_user_can('edit_post', $post_id)) {
			return null;
		}

		$unique = sanitize_text_field(wp_unslash($_POST[self::IN_PLACE]));
		$screens = $this->screens_for($post->post_type);
		$page    = $this->page_screen($post->post_type);
		$outcome = isset($this->outcomes[self::outcome_key($post_id, $unique)]) ? $this->outcomes[self::outcome_key($post_id, $unique)] : array('box' => 'absent', 'errors' => array());
		$box     = isset($screens[$unique]) ? $outcome['box'] : 'absent';
		$errors  = isset($screens[$unique]) ? array_map('strval', $outcome['errors']) : array();
		$status  = (string) get_post_status($post_id);

		$others = $this->others_not_saved($screens, $post_id, $unique);
		$reason = '';

		if (!$page || $page[0] !== $unique || !self::in_place_arg($page[1]) || !self::in_place_allowed($post_id, $unique)) {
			$reason = 'off';
		} elseif ('saved' !== $box) {
			$reason = $box;
		} elseif (array() !== $errors) {
			$reason = 'errors';
		} elseif ($others) {
			$reason = 'others';
		} elseif (!isset($_POST['save']) || isset($_POST['publish'])) {
			$reason = 'button';
		} elseif (!isset($_POST['original_post_status']) || $status !== sanitize_key(wp_unslash($_POST['original_post_status'])) || !in_array($status, array('publish', 'private'), true)) {
			$reason = 'status';
		} elseif (self::date_edited()) {
			$reason = 'date';
		} elseif (remove_query_arg('message', $location) !== get_edit_post_link($post_id, 'url')) {
			$reason = 'location';
		}
		// phpcs:enable

		$nonces = array('_wpnonce' => wp_create_nonce('update-post_' . $post_id));

		if (isset($screens[$unique])) {
			$nonces[self::nonce_name($unique)] = wp_create_nonce(self::nonce_action($unique, $post_id));
		}

		$data = array(
			'bfields'      => 'update-in-place',
			'version'      => 1,
			'postId'       => $post_id,
			'unique'       => $unique,
			'inPlace'      => '' === $reason,
			'reason'       => $reason,
			'location'     => (string) $location,
			'status'       => $status,
			'box'          => $box,
			'errors'       => (object) $errors,
			'nonces'       => $nonces,
			'lock'         => (string) get_post_meta($post_id, '_edit_lock', true),
			// Whatever the page box did: another box's notices then wait for a real reload.
			'othersFailed' => $others,
			'token'        => $this->token,
		);

		$schema = 'saved' === $box ? Registry::instance()->schema($unique) : null;

		if ($schema) {
			$values = \BFields\Storage\Values::hydrate((new PostMeta($post_id, $unique))->read(), $schema);
			$values = apply_filters('bfields_update_in_place_values', $values, $post_id, $unique);

			// An empty PHP array would encode as [], which the client reads as no values.
			$data['values'] = (object) (is_array($values) ? $values : array());
		}

		return $data;
	}

	/**
	 * Did another bfields box on this form fail to save (stale nonce, capability,
	 * validation)? Its notice then needs today's reload, not a settle GET that consumes it.
	 *
	 * @param array<string, array> $screens Screens for the post type.
	 */
	private function others_not_saved(array $screens, int $post_id, string $unique): bool
	{
		foreach (array_keys($screens) as $other) {
			if ($other === $unique || !isset($this->outcomes[self::outcome_key($post_id, (string) $other)])) {
				continue;
			}

			$outcome = $this->outcomes[self::outcome_key($post_id, (string) $other)];

			if (in_array($outcome['box'], array('nonce', 'capability'), true) || array() !== $outcome['errors']) {
				return true;
			}
		}

		return false;
	}

	/** Core's own date-edit test (edit_post(): any `hidden_*` part that differs). */
	private static function date_edited(): bool
	{
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- see in_place_response().
		foreach (array('aa', 'mm', 'jj', 'hh', 'mn') as $unit) {
			$hidden = isset($_POST['hidden_' . $unit]) ? wp_unslash($_POST['hidden_' . $unit]) : '';
			$value  = isset($_POST[$unit]) ? wp_unslash($_POST[$unit]) : null;

			if (!empty($hidden) && $hidden !== $value) {
				return true;
			}
		}
		// phpcs:enable

		return false;
	}

	/**
	 * wp_refresh_nonces: heartbeat also renews the box nonce of an
	 * update-in-place screen, so a page left open keeps saving its box.
	 *
	 * @param array  $response  Heartbeat response.
	 * @param array  $data      Heartbeat data.
	 * @param string $screen_id Screen id.
	 */
	public function refresh_nonces($response, $data, $screen_id)
	{
		if (!is_array($response) || !isset($response['wp-refresh-post-nonces']['replace']) || !is_array($response['wp-refresh-post-nonces']['replace'])) {
			return $response;
		}

		$post_id = isset($data['wp-refresh-post-nonces']['post_id']) ? absint($data['wp-refresh-post-nonces']['post_id']) : 0;
		$post    = $post_id ? get_post($post_id) : null;

		if (!$post || !current_user_can('edit_post', $post_id)) {
			return $response;
		}

		$page = $this->page_screen($post->post_type);

		if ($page && self::in_place_arg($page[1]) && self::in_place_allowed($post_id, $page[0])) {
			$response['wp-refresh-post-nonces']['replace'][self::nonce_name($page[0])] = wp_create_nonce(self::nonce_action($page[0], $post_id));
		}

		return $response;
	}

	/**
	 * The capability a box needs to be saved: the authored `menu_capability`,
	 * else the post type's own `edit_posts` (`edit_products` for a product),
	 * so a role that can edit the post can save its box.
	 *
	 * @param array  $screen    Raw registration record.
	 * @param string $post_type Post type being saved.
	 */
	public static function capability(array $screen, string $post_type): string
	{
		if (!empty($screen['args']['menu_capability']) && is_string($screen['args']['menu_capability'])) {
			return $screen['args']['menu_capability'];
		}

		$object = get_post_type_object($post_type);

		return $object ? (string) $object->cap->edit_posts : 'edit_posts';
	}

	/**
	 * Validation messages survive the post.php redirect in a short transient,
	 * per user, as Codestar keeps them in `_csf_errors_<unique>` meta.
	 */
	private static function errors_key(string $unique, int $post_id): string
	{
		return 'bfields_errors_' . md5($unique . '|' . $post_id . '|' . get_current_user_id());
	}
}
