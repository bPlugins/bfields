<?php
/**
 * bfields — `serialize` storage against post meta.
 *
 * One serialized array under the meta box's `unique` key, exactly as
 * Codestar's CSF_Metabox stores it, with the same contract as Storage\Option:
 *
 *   READ-MODIFY-WRITE. Only the ids the current schema declares are
 *   overwritten. Keys the field set no longer declares — Pro keys during a
 *   licence lapse, junk from an older version — are left exactly as they are.
 *
 *   SLASHES. update_post_meta() runs wp_unslash() over the value. Codestar
 *   hands it the still-slashed $_POST, so the two cancel out. bfields hands it
 *   a decoded JSON payload, which is NOT slashed, so it must be wp_slash()ed
 *   once — or every `\` in hotspot text and custom CSS is stripped on save
 *   (plan 3.2).
 *
 *   HOOKS. The same sequence as Codestar (metabox-options.class.php:373-407),
 *   with the post id: `bfields_{unique}_save` ($data, $post_id, $unique), then
 *   `_save_before`, the write, `_saved`, `_save_after`. The csf_* bridge
 *   passes ($data, $post_id, $instance), which is what preserveProData() needs.
 *
 *   ABSENT PAYLOAD. An empty value set writes nothing (7.4).
 *
 * `data_type => unserialize` (one meta row per field) is not implemented, and
 * a save is refused rather than silently written serialized.
 *
 * @package BFields\Storage
 */

namespace BFields\Storage;

use BFields\Sanitizer;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Reads and writes one serialized post-meta row.
 */
final class PostMeta
{
	/** @var int */
	private $post_id;

	/** @var string */
	private $unique;

	/** @var array<string, string> */
	private $errors = array();

	public function __construct(int $post_id, string $unique)
	{
		$this->post_id = $post_id;
		$this->unique  = $unique;
	}

	/**
	 * The raw stored array, or an empty array when the meta is absent.
	 */
	public function read(): array
	{
		$value = get_post_meta($this->post_id, $this->unique, true);

		return is_array($value) ? $value : array();
	}

	/**
	 * Hydrate storage into store shape, filling in defaults.
	 */
	public function hydrate(array $schema): array
	{
		return Values::hydrate($this->read(), $schema);
	}

	/**
	 * Validation messages from the last save(), keyed by field id.
	 */
	public function errors(): array
	{
		return $this->errors;
	}

	/**
	 * Sanitize, validate, merge and write.
	 *
	 * @param array $values Incoming values, keyed by field id.
	 * @param array $schema Normalised schema.
	 * @return array The stored array in store shape.
	 */
	public function save(array $values, array $schema): array
	{
		$this->errors = array();

		if (array() === $values || !$this->supported($schema)) {
			return $this->hydrate($schema);
		}

		$clean = Sanitizer::values($values, $schema, $this->read(), $this->errors);

		return $this->write($clean, $schema, true);
	}

	/**
	 * Write already-sanitized values, firing the hooks in Codestar's order.
	 *
	 * @param array $data    Sanitized values.
	 * @param array $schema  Normalised schema.
	 * @param bool  $partial True when $data is to be merged over the stored row.
	 */
	public function write(array $data, array $schema, bool $partial = false): array
	{
		if (!$this->supported($schema)) {
			return $this->hydrate($schema);
		}

		$unique  = $this->unique;
		$post_id = $this->post_id;

		/**
		 * Filter the data about to be written. Bridged to csf_{$unique}_save.
		 *
		 * @param array  $data    Values about to be written.
		 * @param int    $post_id Post being saved.
		 * @param string $unique  Storage key.
		 */
		$data = apply_filters("bfields_{$unique}_save", $data, $post_id, $unique);

		if (!is_array($data)) {
			return $this->hydrate($schema);
		}

		$row = $partial ? array_merge($this->read(), $data) : $data;

		do_action("bfields_{$unique}_save_before", $row, $post_id, $unique);

		update_post_meta($post_id, $unique, wp_slash($row));

		do_action("bfields_{$unique}_saved", $row, $post_id, $unique);
		do_action("bfields_{$unique}_save_after", $row, $post_id, $unique);

		return $this->hydrate($schema);
	}

	/**
	 * Only `serialize` is implemented.
	 */
	private function supported(array $schema): bool
	{
		if ('serialize' === $schema['args']['dataType']) {
			return true;
		}

		_doing_it_wrong(
			__METHOD__,
			esc_html__('bfields only stores meta boxes with data_type "serialize". Nothing was saved.', 'bfields'),
			'1.0.0'
		);

		return false;
	}
}
