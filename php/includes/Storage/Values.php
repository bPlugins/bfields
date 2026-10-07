<?php
/**
 * bfields — stored array <-> store values.
 *
 * Shared by every storage adapter. Hydration is where "the store holds values
 * in stored shape" (4.0) is enforced: a field the user never touches leaves
 * here as the same bytes it arrived as, travels to the browser, comes back
 * unchanged and is written back identically.
 *
 * @package BFields\Storage
 */

namespace BFields\Storage;

use BFields\Codec\Csf;
use BFields\Schema;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Hydrates a stored row into the values the UI receives.
 */
final class Values
{
	/**
	 * Stored array => store values.
	 *
	 * Declared fields only; a missing one falls back to its default, and so
	 * does a stored null, which Codestar's isset() reads as missing too.
	 * Undeclared keys are NOT returned and never reach the browser — they
	 * survive a save because the storage adapter merges the sanitized values
	 * over the stored row (7.3), not because they travel through here.
	 *
	 * @param array $stored Raw row out of the database.
	 * @param array $schema Normalised schema.
	 */
	public static function hydrate(array $stored, array $schema): array
	{
		$values = array();

		foreach (Schema::field_index($schema) as $id => $field) {
			if (isset($stored[$id])) {
				$values[$id] = Csf::hydrate($stored[$id], $field);
			} elseif (!empty($field['device'])) {
				// An unset device key (`{id}_tablet`) stays out of the store,
				// so a save does not write it. It inherits until someone sets
				// it.
				continue;
			} elseif (array_key_exists('default', $field)) {
				$values[$id] = $field['default'];
			} else {
				$values[$id] = Csf::blank($field);
			}
		}

		return $values;
	}

	/**
	 * Keys present in storage that the current field set does not declare.
	 *
	 * Reported to the UI for diagnostics only — never rendered, never sent
	 * back, never rewritten. These are the Pro keys during a licence lapse and
	 * the `readonly`/`invalid` placeholder junk Codestar wrote (3.3).
	 */
	public static function undeclared(array $stored, array $schema): array
	{
		return array_values(array_diff(array_keys($stored), Schema::declared_ids($schema)));
	}
}
