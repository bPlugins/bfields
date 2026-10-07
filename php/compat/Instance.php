<?php
/**
 * bfields — the object `csf_*` hooks receive in place of Codestar's instance.
 *
 * Codestar passes `$this` (CSF_Options / CSF_Metabox) as the last argument of
 * every save hook, and plugin code reads it: 3D Viewer's
 * Settings::overlayDeclared() walks `$instance->pre_fields` to learn which keys
 * the current form declares. Passing the storage key instead made that guard
 * fall back to array_keys($data) (review 3.3).
 *
 * This carries the public properties hook consumers read, built from the raw
 * registration: `unique`, `abstract`, `args`, `sections`, `pre_fields` (every top-level
 * field of every section, as authored — Codestar's definition — with any
 * `field_group` unwrapped into its fields) and, for a meta
 * box, `post_type`. It is not a CSF_Options; methods are not provided.
 *
 * @package BFields\Compat
 */

namespace BFields\Compat;

use BFields\Registry;
use BFields\Schema;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Read-only stand-in for a CSF_Options / CSF_Metabox instance.
 */
final class Instance
{
	/** @var string */
	public $unique = '';

	/** @var string 'options' | 'metabox' */
	public $kind = 'options';

	/** @var string Codestar's name for the same thing. */
	public $abstract = 'options';

	/** @var array */
	public $args = array();

	/** @var array */
	public $sections = array();

	/** @var array */
	public $pre_fields = array();

	/** @var array */
	public $post_type = array();

	/**
	 * Build the stand-in for a registered key.
	 */
	public static function for_key(string $unique): Instance
	{
		$instance         = new self();
		$instance->unique = $unique;

		$screen = Registry::instance()->screen($unique);

		if (!$screen) {
			return $instance;
		}

		$instance->kind     = $screen['kind'];
		$instance->abstract = $screen['kind'];
		$instance->args     = $screen['args'];
		// What Codestar would hold for the same screen: no field_group wrappers,
		// so `pre_fields` lists the grouped fields themselves.
		$instance->sections = Schema::unwrap_sections($screen['sections']);

		foreach ($instance->sections as $section) {
			if (!empty($section['fields'])) {
				foreach ((array) $section['fields'] as $field) {
					$instance->pre_fields[] = $field;
				}
			}
		}

		if ('metabox' === $screen['kind']) {
			$instance->post_type = isset($screen['args']['post_type'])
				? array_filter((array) $screen['args']['post_type'])
				: array();
		}

		return $instance;
	}
}
