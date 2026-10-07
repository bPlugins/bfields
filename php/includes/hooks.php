<?php
/**
 * bfields — hook documentation and the csf_* bridge.
 *
 * Plugin code hooks the `csf_*` names it already uses (3D Viewer's
 * preserveProData() among them) and keeps working in both Classic and Modern
 * mode (4.9). The framework fires its own `bfields_*` names; this file mirrors
 * each one onto its `csf_*` twin with Codestar's signature.
 *
 * ORDER, as Codestar fires them (admin-options.class.php:317-352,
 * metabox-options.class.php:373-407) and as the storage adapters fire the
 * bfields_ twins:
 *
 *   1. filter  {prefix}_{unique}_save         the data about to be written
 *   2. action  {prefix}_{unique}_save_before
 *   3.         update_option / update_post_meta
 *   4. action  {prefix}_{unique}_saved
 *   5. action  {prefix}_{unique}_save_after
 *
 * ARGUMENTS
 *
 *   bfields_ options   ($data, $unique)
 *   bfields_ metabox   ($data, $post_id, $unique)
 *   csf_ options       ($data, $instance)
 *   csf_ metabox       ($data, $post_id, $instance)
 *
 * `$instance` is a \BFields\Compat\Instance: the public properties Codestar's
 * instance has (`unique`, `args`, `pre_fields`, …), so `$instance->pre_fields`
 * keeps working. A meta box's `$post_id` is the real post id —
 * preserveProData($data, $post_id) reads get_post_meta((int) $post_id), which
 * silently did nothing when it was given the storage key (review 3.3).
 *
 * The bridge is PERMANENT, not a coexistence measure: after Stage C retires
 * Codestar, `csf_{unique}_save` is still the filter the free plugin uses to
 * protect Pro keys during a licence lapse (3.2), so one method keeps serving
 * both.
 *
 * @package BFields
 */

if (!defined('ABSPATH')) {
	exit;
}

if (!function_exists('bfields_bridge_csf_hooks')) {

	/**
	 * Mirror a screen's bfields_* save hooks onto their csf_* twins.
	 *
	 * Called by the compatibility layer for every key it registers, so a host
	 * that registers natively does not pay for a bridge it does not use.
	 *
	 * @param string $unique Storage key.
	 */
	function bfields_bridge_csf_hooks($unique)
	{
		static $bridged = array();

		if (isset($bridged[$unique])) {
			return;
		}

		$bridged[$unique] = true;

		// The kind is read when the hook FIRES, not now: createSection() may
		// run before createMetabox() (Registry::section() makes a placeholder
		// options screen until then).
		$csf_args = static function ($data, array $context) use ($unique): array {
			$instance = \BFields\Compat\Instance::for_key($unique);

			if ('metabox' === $instance->kind) {
				return array($data, isset($context[0]) ? (int) $context[0] : 0, $instance);
			}

			return array($data, $instance);
		};

		add_filter("bfields_{$unique}_save", static function ($data, ...$context) use ($unique, $csf_args) {
			return apply_filters_ref_array("csf_{$unique}_save", $csf_args($data, $context));
		}, 10, 3);

		foreach (array('save_before', 'saved', 'save_after') as $event) {
			add_action("bfields_{$unique}_{$event}", static function ($data, ...$context) use ($unique, $event, $csf_args) {
				do_action_ref_array("csf_{$unique}_{$event}", $csf_args($data, $context));
			}, 10, 3);
		}
	}
}
