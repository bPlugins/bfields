<?php
/**
 * bfields — the Codestar wire format codec.
 *
 * FROZEN AT v1 (plan 4.7 invariant 6). Newest-copy-wins means a host running an
 * old bfields may be served by a newer copy's codec; if the codec changed shape
 * the old host's data would change shape with it. Additions only, forever.
 *
 * The contract is section 3.1 of the migration plan: for every field type, what
 * Codestar writes is what bfields must write, byte for byte.
 *
 * DESIGN: hydrate() and dehydrate() are IDENTITY for every value Codestar can
 * have written. That is what makes safety rule 7.2 ("untouched values
 * round-trip verbatim") true by construction rather than by testing: the store
 * holds the stored shape, so a field the user never touched goes back to the
 * database as the same bytes, including array key order and any extra keys a
 * previous version wrote.
 *
 * "Codestar can have written" is wider than the tidy shape: a never-toggled
 * switcher is '', a Reset switcher is PHP true/false, a seeded number is an
 * int. Those are kept as they are, not normalised (decided 2026-09-23, review
 * 4.1/4.2): readers disagree about what '' means — SingleProduct.php reads
 * `!== '0'` (on) and `!empty()` (off) for the same key — so rewriting it to
 * either value changes a live site. A value changes only when the user changes
 * it, and then the component writes the tidy shape ('1'/'0').
 *
 * The coercions that remain are the ones section 3.1 sanctions because the
 * stored shape is itself the bug: a single-value button_set holding an array
 * (Shortcode falls into multiple mode), and a bare media id.
 *
 * A type bfields does not know is an opaque pass-through (core 'unknown'): its
 * value is never reshaped, so a Codestar `tabbed` / `sortable` / HVP `library`
 * field survives a save byte for byte even though no component can edit it.
 *
 * @package BFields\Codec
 */

namespace BFields\Codec;

use BFields\Schema;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Translates between stored Codestar values and the store's values.
 */
final class Csf
{
	/**
	 * CSF's media array, in the order its hidden inputs POST them.
	 *
	 * Order is part of the contract: PHP serialize() preserves insertion order,
	 * so rebuilding the array in a different order changes the stored bytes.
	 */
	const MEDIA_KEYS = array('url', 'id', 'width', 'height', 'thumbnail', 'alt', 'title', 'description');

	/**
	 * The truth table every reader in the plugin already tolerates (7.6).
	 *
	 * Codestar's own coercion (assets/js/plugins.js checkBoolean) plus the
	 * `'yes'` that AnalyticsPro::settingBool() accepts.
	 */
	public static function truthy($value): bool
	{
		if (is_bool($value)) {
			return $value;
		}

		if (is_int($value) || is_float($value)) {
			return (int) $value === 1;
		}

		if (is_string($value)) {
			return in_array(strtolower($value), array('1', 'true', 'yes', 'on'), true);
		}

		return false;
	}

	/**
	 * Stored value => store value.
	 *
	 * Identity for valid input. Coerces only documented legacy variants.
	 *
	 * @param mixed $stored Raw value out of the database (or an authored default).
	 * @param array $field  Normalised schema field.
	 */
	public static function hydrate($stored, array $field)
	{
		if (self::opaque($field)) {
			return null === $stored ? '' : $stored;
		}

		$type = Schema::codec_type($field);

		switch ($type) {
			case 'switcher':
				return self::switcher($stored);

			case 'checkbox':
				if (empty($field['props']['options'])) {
					// Single checkbox: CSF's shape is '1' / '', and Reset's bool.
					return self::single_checkbox($stored);
				}
				// Option list: '' when nothing is checked.
				return is_array($stored) ? array_values($stored) : array();

			case 'button_set':
				if (!empty($field['props']['multiple'])) {
					return is_array($stored) ? array_values($stored) : ('' === $stored || null === $stored ? array() : array($stored));
				}
				// Some defaults are authored as arrays (`'default' => ['msimple']`).
				// CSF's Reset then stores the array, and Shortcode compares
				// `['msimple'] !== 'msimple'` and falls into multiple mode.
				// Hydrating array => first element is what fixes that (3.1).
				if (is_array($stored)) {
					return self::first_of($stored);
				}
				return null === $stored ? '' : (is_scalar($stored) ? (string) $stored : $stored);

			case 'select':
				if (!empty($field['props']['multiple'])) {
					return is_array($stored) ? array_values($stored) : ('' === $stored || null === $stored ? array() : array($stored));
				}
				// An array in a single select is kept as it is. Blanking it to
				// '' is a write nobody asked for (review 3.2).
				return self::scalar($stored);

			case 'radio':
			case 'image_select':
				return self::scalar($stored);

			case 'media':
				// A bare numeric id is expanded exactly as CSF expands it at
				// render time, in CSF's key order.
				if (is_numeric($stored) && '' !== $stored) {
					$thumb = wp_get_attachment_image_src((int) $stored, 'thumbnail', true);
					return array(
						'url'         => (string) wp_get_attachment_url((int) $stored),
						'id'          => (string) $stored,
						'width'       => '',
						'height'      => '',
						'thumbnail'   => isset($thumb[0]) ? (string) $thumb[0] : '',
						'alt'         => '',
						'title'       => '',
						'description' => '',
					);
				}
				if (!is_array($stored)) {
					return self::blank($field);
				}
				// Valid array: passed through verbatim, key order and any extra
				// keys intact. Missing keys are filled without reordering.
				foreach (self::MEDIA_KEYS as $key) {
					if (!array_key_exists($key, $stored)) {
						$stored[$key] = '';
					}
				}
				return $stored;

			case 'dimensions':
			case 'spacing':
			case 'fieldset':
				return is_array($stored) ? $stored : self::blank($field);

			case 'group':
			case 'repeater':
				// '' when empty is CSF's shape; readers guard with is_array().
				return is_array($stored) ? array_values($stored) : array();

			case 'link':
				return is_array($stored) ? $stored : self::blank($field);

			default:
				// text, textarea, number, spinner, slider, color, code_editor,
				// upload, password. Codestar POSTs them as strings ("30", "1"),
				// but seeds and resets them with the raw authored default (an
				// int 20, say), so there is no intval() and no strval() here.
				return self::scalar($stored);
		}
	}

	/**
	 * A switcher, kept as stored.
	 *
	 * '' (never toggled), PHP true/false and ints (Codestar's Reset and
	 * seeding store the raw authored default) and '1'/'0' are all values
	 * Codestar writes, and each is kept (decision 12). Anything else ('yes',
	 * null) is not a Codestar shape and is tidied to '1'/'0'.
	 */
	private static function switcher($value)
	{
		if ('' === $value || '0' === $value || '1' === $value || is_bool($value) || is_int($value)) {
			return $value;
		}

		return self::truthy($value) ? '1' : '0';
	}

	/**
	 * A single checkbox, kept as stored: '1', '', PHP bools and seeded ints are
	 * Codestar's.
	 */
	private static function single_checkbox($value)
	{
		if ('' === $value || '1' === $value || is_bool($value) || is_int($value)) {
			return $value;
		}

		return self::truthy($value) ? '1' : '';
	}

	/**
	 * A value that should be a string, kept as stored.
	 *
	 * null becomes '' (it is what an absent POST key is). Everything else,
	 * arrays included, passes through: reshaping a value the field did not
	 * expect is how data is lost silently.
	 */
	private static function scalar($value)
	{
		return null === $value ? '' : $value;
	}

	/**
	 * A single-value button_set holding an array: its first element (3.1).
	 * A first element that is itself an array is malformed, and the value is
	 * kept as it is rather than cast to "Array".
	 *
	 * @param array $value Stored or posted array.
	 * @return mixed
	 */
	private static function first_of(array $value)
	{
		$first = reset($value);

		if (false === $first || null === $first) {
			return '';
		}

		return is_scalar($first) ? (string) $first : $value;
	}

	/**
	 * Is this a type the codec must not interpret?
	 */
	private static function opaque(array $field): bool
	{
		return isset($field['core']) && 'unknown' === $field['core'];
	}

	/**
	 * A value as Codestar's form POSTs it back when the user leaves it alone.
	 *
	 * Codestar prints the current value into the field's input
	 * (`value="<?php echo esc_attr( $value ) ?>"`) and saves what comes back,
	 * so a scalar comes back as a string: PHP true as '1', false and null as
	 * '', an int 20 as '20'. Arrays (media, dimensions, group rows) come back
	 * in shape. This is the value to use for a declared field the stored row
	 * does not have yet: saving it writes what a Codestar save would, where the
	 * raw default (true) would read as OFF to an `=== '1'` reader.
	 */
	public static function posted($value)
	{
		if (is_array($value)) {
			return $value;
		}

		if (is_bool($value)) {
			return $value ? '1' : '';
		}

		return null === $value ? '' : (string) $value;
	}

	/**
	 * What Codestar writes for a field when it seeds or resets it.
	 *
	 * Codestar's get_default(): the authored `default` (isset semantics, so
	 * null counts as absent), overridden by the screen's `args['defaults']`,
	 * else ''. Stored RAW — PHP true stays true, an int stays an int (7.5).
	 *
	 * One sanctioned difference (3.1): a single-value button_set authored with
	 * an array default (`['msimple']`) is seeded as its first element, because
	 * the array is what sends Shortcode into multiple mode.
	 *
	 * @param array $field Normalised schema field (its `csfDefault`).
	 */
	public static function seed_value(array $field)
	{
		$value = array_key_exists('csfDefault', $field) ? $field['csfDefault'] : '';

		if ('button_set' === $field['type'] && empty($field['props']['multiple']) && is_array($value)) {
			return self::first_of($value);
		}

		return $value;
	}

	/**
	 * Store value => stored value.
	 *
	 * The inverse of hydrate(), and identity wherever hydrate() is identity.
	 *
	 * @param mixed $value Value as the UI sends it.
	 * @param array $field Normalised schema field.
	 */
	public static function dehydrate($value, array $field)
	{
		if (self::opaque($field)) {
			return null === $value ? '' : $value;
		}

		$type = Schema::codec_type($field);

		switch ($type) {
			case 'switcher':
				// The Toggle writes '1'/'0'; anything it did not touch comes
				// back exactly as it was hydrated.
				return self::switcher($value);

			case 'checkbox':
				if (empty($field['props']['options'])) {
					return self::single_checkbox($value);
				}
				// Documented normalisation: [] rather than '' when nothing is
				// checked. Readers guard with is_array(), so the two behave
				// identically (3.1).
				return is_array($value) ? array_values(array_map('strval', $value)) : array();

			case 'button_set':
				if (!empty($field['props']['multiple'])) {
					return is_array($value) ? array_values(array_map('strval', $value)) : array();
				}
				if (is_array($value)) {
					return self::first_of($value);
				}
				return self::scalar($value);

			case 'select':
				if (!empty($field['props']['multiple'])) {
					return is_array($value) ? array_values(array_map('strval', $value)) : array();
				}
				return self::scalar($value);

			case 'radio':
			case 'image_select':
				return self::scalar($value);

			case 'media':
				if (!is_array($value)) {
					return self::blank($field);
				}
				foreach (self::MEDIA_KEYS as $key) {
					if (!array_key_exists($key, $value)) {
						$value[$key] = '';
					}
				}
				// Sub-values are strings in CSF, including the id.
				return array_map(static function ($item) {
					return is_scalar($item) ? (string) $item : '';
				}, $value);

			case 'dimensions':
			case 'spacing':
			case 'fieldset':
				if (!is_array($value)) {
					return self::blank($field);
				}
				return array_map(static function ($item) {
					return is_scalar($item) ? (string) $item : $item;
				}, $value);

			case 'group':
			case 'repeater':
				if (!is_array($value) || array() === $value) {
					// CSF stores '' for an empty group; keeping that means an
					// untouched empty group round-trips to the same bytes.
					return '';
				}
				$rows = array();
				foreach (array_values($value) as $row) {
					if (!is_array($row)) {
						continue;
					}
					// The client-side row id used for reorder/delete never
					// reaches the database (4.0).
					unset($row['__id']);
					$rows[] = self::dehydrate_row($row, $field);
				}
				return $rows;

			case 'link':
				return is_array($value) ? $value : self::blank($field);

			default:
				return self::scalar($value);
		}
	}

	/**
	 * Dehydrate one group/repeater row against the row's sub-field schema.
	 *
	 * Iterates the ROW, not the schema. That is deliberate and it is the mirror
	 * of safety rule 7.3: just as the top-level merge never DROPS a key the
	 * current field set does not declare, a row never GAINS one it did not
	 * have. Codestar's group save posts every declared sub-field for every row,
	 * so re-saving an old record under a newer field set rewrites all of its
	 * rows with a dozen new empty keys; bfields leaves them exactly as they
	 * are, and an untouched record diffs clean (7.2, 8.2).
	 *
	 * Sub-fields the row lacks are supplied by the field components at render
	 * time — display only, never written back (4.0) — so a row gains a key only
	 * when the user actually sets one. New rows are built from the schema by
	 * the UI and therefore arrive complete.
	 */
	private static function dehydrate_row(array $row, array $field): array
	{
		if (empty($field['fields'])) {
			return $row;
		}

		$children = array();

		foreach ($field['fields'] as $child) {
			// A `pro` sub-field is never edited, so its stored value passes
			// through untouched like an undeclared key (the UI's new rows
			// leave it out), and the row keeps it through a licence lapse.
			if ('' === $child['id'] || $child['display'] || !empty($child['pro'])) {
				continue;
			}
			$children[$child['id']] = $child;
			// Addition (v1 stays frozen for every existing field): a
			// responsive sub-field's device keys are shaped as it is.
			$children += \BFields\Schema::device_fields($child);
		}

		$out = array();

		foreach ($row as $key => $value) {
			// Undeclared sub-keys pass through untouched, same as the top level.
			$out[$key] = isset($children[$key]) ? self::dehydrate($value, $children[$key]) : $value;
		}

		return $out;
	}

	/**
	 * The empty value for a field with no authored default.
	 */
	public static function blank(array $field)
	{
		if (self::opaque($field)) {
			return '';
		}

		switch (Schema::codec_type($field)) {
			case 'switcher':
				// What Codestar's hidden input posts for a switcher that has no
				// value and no default.
				return '';

			case 'checkbox':
				return empty($field['props']['options']) ? '' : array();

			case 'button_set':
			case 'select':
				return !empty($field['props']['multiple']) ? array() : '';

			case 'media':
				return array_fill_keys(self::MEDIA_KEYS, '');

			case 'dimensions':
				$out = array();
				if (!isset($field['props']['width']) || false !== $field['props']['width']) {
					$out['width'] = '';
				}
				if (!isset($field['props']['height']) || false !== $field['props']['height']) {
					$out['height'] = '';
				}
				$out['unit'] = '';
				return $out;

			case 'spacing':
				$out = array('top' => '', 'right' => '', 'bottom' => '');
				if (!isset($field['props']['left']) || false !== $field['props']['left']) {
					$out['left'] = '';
				}
				if (!isset($field['props']['showUnits']) || false !== $field['props']['showUnits']) {
					$out['unit'] = '';
				}
				return $out;

			case 'fieldset':
				$out = array();
				foreach ((array) (isset($field['fields']) ? $field['fields'] : array()) as $child) {
					if ('' !== $child['id'] && !$child['display']) {
						$out[$child['id']] = self::blank($child);
					}
				}
				return $out;

			case 'group':
			case 'repeater':
				return array();

			case 'link':
				return array('url' => '', 'text' => '', 'target' => '');

			default:
				return '';
		}
	}
}
