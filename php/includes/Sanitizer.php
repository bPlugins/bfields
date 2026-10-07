<?php
/**
 * bfields — sanitization and validation on save.
 *
 * A security boundary, so it lives in PHP and nowhere else (4.0). The JS side
 * validates for UX only; nothing the browser sends is trusted here.
 *
 * The rules are Codestar's, exactly (admin-options.class.php:276-303,
 * metabox-options.class.php:322-360), because during coexistence a Classic save
 * and a Modern save of the same input must write the same bytes (decision
 * 11.3, re-confirmed 2026-09-23 for review 4.3):
 *
 *   - no `sanitize` key       wp_kses_post over the value, deep for arrays —
 *                             for EVERY type, URLs and colours included. `&`
 *                             in a URL becomes `&amp;`, `>` in custom_css
 *                             becomes `&gt;`; EnqueueAssets::renderCustomCSS()
 *                             already copes, and a relative `models/x.glb`
 *                             stays relative (esc_url_raw made it
 *                             `http://models/x.glb`).
 *   - callable `sanitize`     called with the value ALONE, instead of kses.
 *                             A second argument turns esc_url_raw's
 *                             $protocols into the field array and makes
 *                             intval()/trim() fatal on PHP 8 (review 3.7).
 *   - `sanitize` not callable the value is saved as posted (`=> false`).
 *   - callable `validate`     called with the value; a non-empty return is an
 *                             error message, and the field keeps its stored
 *                             value (review 3.8).
 *
 * Both callbacks apply to top-level fields only, as in Codestar: a group's rows
 * are kses'd deep and their sub-fields' callbacks are not run.
 *
 * Everything in this file must be IDEMPOTENT: sanitize(stored) === stored for
 * every golden fixture (7.2). A sanitizer that is not idempotent rewrites data
 * on every save, which is exactly the "zero data loss" failure being avoided.
 *
 * @package BFields
 */

namespace BFields;

use BFields\Codec\Csf;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Sanitizes and validates incoming values against the schema.
 */
final class Sanitizer
{
	/**
	 * Sanitize one field's value and put it into stored shape.
	 *
	 * @param mixed $value Value as the UI sent it (store shape).
	 * @param array $field Normalised schema field.
	 * @param bool  $top   False for a sub-field inside a group or fieldset,
	 *                     whose `sanitize` Codestar never runs.
	 * @return mixed Value in stored shape, safe to write.
	 */
	public static function field($value, array $field, bool $top = true)
	{
		// Shape first: the codec decides what the stored value looks like, the
		// sanitizer only decides what characters may be in it.
		$value = Csf::dehydrate($value, $field);

		if ($top && array_key_exists('sanitize', $field)) {
			if (false !== $field['sanitize'] && is_callable($field['sanitize'])) {
				$value = call_user_func($field['sanitize'], $value);
			}
			// Set but not callable: Codestar saves the value as posted.
		} else {
			$value = self::by_type($value, $field);
		}

		/**
		 * Filter a sanitized field value.
		 *
		 * Lets a host add a sanitizer for a field type it registered itself
		 * through bfields.registerField() (Appendix D.2).
		 *
		 * @param mixed $value Sanitized value.
		 * @param array $field Normalised schema field.
		 */
		$value = apply_filters('bfields_sanitize_' . $field['type'], $value, $field);

		return apply_filters('bfields_sanitize', $value, $field);
	}

	/**
	 * Per-type sanitization: kses everywhere, recursing into sub-fields so a
	 * row's values are shaped by their own field's codec first.
	 */
	private static function by_type($value, array $field)
	{
		switch (Schema::codec_type($field)) {
			case 'group':
			case 'repeater':
				if (!is_array($value)) {
					return self::kses($value);
				}
				$children = self::children($field);
				$rows     = array();
				foreach ($value as $row) {
					if (!is_array($row)) {
						continue;
					}
					$clean = array();
					foreach ($row as $key => $item) {
						$clean[$key] = isset($children[$key])
							? self::field($item, $children[$key], false)
							: self::kses($item);
					}
					$rows[] = $clean;
				}
				return $rows;

			case 'fieldset':
				if (!is_array($value)) {
					return self::kses($value);
				}
				$children = self::children($field);
				$clean    = array();
				foreach ($value as $key => $item) {
					$clean[$key] = isset($children[$key])
						? self::field($item, $children[$key], false)
						: self::kses($item);
				}
				return $clean;

			default:
				// Every other type, `unknown` included: Codestar's
				// wp_kses_post(_deep) default.
				return self::kses($value);
		}
	}

	/**
	 * Sub-fields of a group or fieldset, keyed by id.
	 */
	private static function children(array $field): array
	{
		$children = array();

		foreach ((array) (isset($field['fields']) ? $field['fields'] : array()) as $child) {
			// A `pro` sub-field's stored value is kses'd like an undeclared key, never reshaped.
			if ('' !== $child['id'] && empty($child['pro'])) {
				$children[$child['id']] = $child;
				// A responsive sub-field's `{id}_tablet` / `{id}_mobile` keys
				// are sanitized as the sub-field is.
				$children += Schema::device_fields($child);
			}
		}

		return $children;
	}

	/**
	 * wp_kses_post over a string or, recursively, an array.
	 *
	 * Non-string scalars (a Reset switcher's PHP true, a seeded int) are left
	 * as they are: kses has nothing to remove from them, and casting them to
	 * strings would rewrite a value the user never touched (review 4.1).
	 */
	private static function kses($value)
	{
		if (is_array($value)) {
			return array_map(array(__CLASS__, 'kses'), $value);
		}

		if (!is_string($value)) {
			return $value;
		}

		return wp_kses_post($value);
	}

	/**
	 * Sanitize and validate a whole value set against a schema.
	 *
	 * Only declared, non-display, non-`pro` fields are returned; the caller
	 * merges the result over what is already stored (7.3).
	 *
	 * A field whose `validate` callback returns a message is not taken from
	 * the payload: its stored value is kept (or it is left out, if it has
	 * none), and the message is reported in $errors, keyed by field id.
	 *
	 * @param array $values Incoming values, keyed by field id.
	 * @param array $schema Normalised schema.
	 * @param array $stored The row as it is now, for failed validations.
	 * @param array $errors Receives field id => message.
	 */
	public static function values(array $values, array $schema, array $stored = array(), array &$errors = array()): array
	{
		$clean = array();

		foreach (Schema::field_index($schema) as $id => $field) {
			if (!array_key_exists($id, $values)) {
				continue;
			}

			if (!empty($field['validate']) && is_callable($field['validate'])) {
				$message = call_user_func($field['validate'], Csf::dehydrate($values[$id], $field));

				if (!empty($message)) {
					$errors[$id] = is_string($message) ? $message : __('This value is not valid.', 'bfields');

					if (array_key_exists($id, $stored)) {
						$clean[$id] = $stored[$id];
					}
					continue;
				}
			}

			$clean[$id] = self::field($values[$id], $field);
		}

		return $clean;
	}
}
