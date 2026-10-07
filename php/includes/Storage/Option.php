<?php
/**
 * bfields — `serialize` storage against wp_options.
 *
 * One serialized array under the screen's `unique` key, exactly as Codestar
 * stores it (2.1). Codestar's other `database` modes (transient, theme_mod,
 * network) are refused at registration (Registry), not silently written here.
 *
 * @package BFields\Storage
 */

namespace BFields\Storage;

use BFields\Codec\Csf;
use BFields\Schema;
use BFields\Sanitizer;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Reads and writes one options row.
 */
final class Option
{
	/** @var string */
	private $unique;

	/**
	 * Validation messages from the last save(), keyed by field id.
	 *
	 * @var array<string, string>
	 */
	private $errors = array();

	public function __construct(string $unique)
	{
		$this->unique = $unique;
	}

	/**
	 * The raw stored array, or an empty array when the option is absent.
	 */
	public function read(): array
	{
		$value = get_option($this->unique, array());

		return is_array($value) ? $value : array();
	}

	/**
	 * Hydrate the stored array into store shape, filling in defaults.
	 *
	 * Declared fields only. Undeclared keys are not sent to the UI; they
	 * survive because save() merges over the stored row (7.3).
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
	 * Read-modify-write: only the ids the schema declares are overwritten.
	 * Every other key in the row is left exactly as it was (7.3), which is the
	 * improvement over Codestar's "replace the whole array" save (3.2).
	 *
	 * @param array $values Incoming values, keyed by field id.
	 * @param array $schema Normalised schema.
	 * @return array The stored array, for the UI to adopt as its new baseline.
	 */
	public function save(array $values, array $schema): array
	{
		$this->errors = array();

		$clean = Sanitizer::values($values, $schema, $this->read(), $this->errors);

		return $this->write($clean, $schema, true);
	}

	/**
	 * Write an already-sanitized array, firing the save hooks in Codestar's
	 * order (admin-options.class.php:317-352): the `_save` filter, then
	 * `_save_before`, the write, `_saved`, `_save_after`.
	 *
	 * The filter sees what Codestar's would: the form's values ($partial), or
	 * the whole row for a reset. That is where 3D Viewer's
	 * preserveProSettings() runs during a licence lapse. The actions see what
	 * is actually written.
	 *
	 * @param array $data    Sanitized values.
	 * @param array $schema  Normalised schema.
	 * @param bool  $partial True when $data holds only the form's fields and
	 *                       is to be merged over the stored row.
	 */
	public function write(array $data, array $schema, bool $partial = false): array
	{
		$unique = $this->unique;

		/**
		 * Filter the data about to be written. Bridged to csf_{$unique}_save.
		 *
		 * @param array  $data   Values about to be written.
		 * @param string $unique Storage key.
		 */
		$data = apply_filters("bfields_{$unique}_save", $data, $unique);

		// A filter that returns something other than an array is a bug in the
		// filter. Codestar would write it (and blank the row); bfields writes
		// nothing.
		if (!is_array($data)) {
			return $this->hydrate($schema);
		}

		$row = $partial ? array_merge($this->read(), $data) : $data;

		do_action("bfields_{$unique}_save_before", $row, $unique);

		update_option($unique, $row);

		do_action("bfields_{$unique}_saved", $row, $unique);
		do_action("bfields_{$unique}_save_after", $row, $unique);

		return $this->hydrate($schema);
	}

	/**
	 * Seed defaults when the option is empty — Codestar's `save_defaults` (7.5).
	 *
	 * Runs on `init` with no admin screen and no JS, because readers on the
	 * frontend depend on the seeded values: Product.php falls back to
	 * rotateDelay 200 / 3d_rotate_speed 20 / bp_3d_loading 'lazy', which are
	 * NOT the field defaults. A fresh site seeded differently from CSF would
	 * quietly change how the WooCommerce viewer behaves.
	 *
	 * Byte for byte what Codestar seeds: the raw default of every declared
	 * field (Csf::seed_value), so `'default' => true` is stored as PHP true.
	 * Like Codestar's save_options(), only `_saved` fires.
	 */
	public function seed(array $schema): void
	{
		// Codestar seeds when empty($tmp_options) — absent, '', array() alike.
		if (!empty(get_option($this->unique))) {
			return;
		}

		$stored = array();

		foreach (Schema::field_index($schema) as $id => $field) {
			$stored[$id] = Csf::seed_value($field);
		}

		if (array() === $stored) {
			return;
		}

		update_option($this->unique, $stored);

		do_action("bfields_{$this->unique}_saved", $stored, $this->unique);
	}

	/**
	 * Reset one section's fields to their defaults, keeping everything else.
	 */
	public function reset_section(string $section_id, array $schema): array
	{
		$stored = $this->read();

		foreach ($schema['sections'] as $section) {
			if ($section['id'] !== $section_id) {
				continue;
			}
			foreach ($section['fields'] as $field) {
				if ('' === $field['id'] || $field['display'] || $field['pro']) {
					continue;
				}
				$stored[$field['id']] = Csf::seed_value($field);
			}
		}

		return $this->write($stored, $schema);
	}

	/**
	 * Reset every declared field to its default.
	 *
	 * Undeclared keys survive, same as any other write — a Reset All must not
	 * be a back door around rule 7.3.
	 *
	 * The row is rebuilt in declared order, as Codestar's Reset All does (it
	 * starts from an empty array), with the undeclared keys after it. Written
	 * over the stored row instead, the defaults kept whatever order that row
	 * had, so the same reset gave different bytes in the two interfaces.
	 */
	public function reset_all(array $schema): array
	{
		$row = array();

		foreach (Schema::field_index($schema) as $id => $field) {
			$row[$id] = Csf::seed_value($field);
		}

		return $this->write($row + $this->read(), $schema);
	}
}
