<?php
/**
 * bfields — schema normaliser.
 *
 * Turns a registered screen (options page or meta box) into the single JSON
 * document that crosses to the browser. That document is the API between PHP
 * and the React body (plan 4.0): both authoring syntaxes (CSF arrays now,
 * defineSchema() later) are front-ends to this format, and both renderers
 * consume it. It is versioned ("schema": 1) and must never break.
 *
 * @package BFields
 */

namespace BFields;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Normalises authored field arrays into the versioned JSON schema.
 */
final class Schema
{
	/**
	 * Authoring type (CSF vocabulary) => core renderer type.
	 *
	 * The authoring type is kept on every field as `type`, because the codec
	 * (3.1) and the sanitizer key off it; `core` only tells the UI which
	 * component to mount. Appendix D of the migration plan is this table.
	 */
	const TYPE_MAP = array(
		'switcher'    => 'toggle',
		'checkbox'    => 'choice',   // Re-mapped to `toggle` below when it has no options.
		'button_set'  => 'choice',
		'radio'       => 'choice',
		'select'      => 'choice',
		'image_select' => 'choice',
		'text'        => 'text',
		'textarea'    => 'text',
		'password'    => 'text',
		'number'      => 'number',
		'spinner'     => 'number',
		'slider'      => 'number',
		'color'       => 'color',
		'media'       => 'media',
		'upload'      => 'media',
		'dimensions'  => 'dimension',
		'spacing'     => 'spacing',
		'fieldset'    => 'fieldset',
		'group'       => 'repeater',
		'repeater'    => 'repeater',
		'code_editor' => 'code',
		'content'     => 'display',
		'notice'      => 'display',
		'callback'    => 'display',
		'heading'     => 'display',
		'subheading'  => 'display',
		// HVP registers one; it holds no value, so it must not be mistaken for
		// a text field that then gets written to the row.
		'submessage'  => 'display',
		'link'        => 'link',
		// A layout node, spliced away by section(). Only a node handed to
		// field() directly lands here, and it must never hold a value.
		'field_group' => 'display',
	);

	/**
	 * Types that hold no value of their own and are never stored (3.1).
	 *
	 * A `content`/`notice`/`callback` field that carries an `id` still pollutes
	 * the data under Codestar (3.3); bfields never writes one.
	 */
	const DISPLAY_TYPES = array('content', 'notice', 'callback', 'heading', 'subheading', 'submessage', 'field_group');

	/** Layout-only card around sibling fields: holds no value, never a field on the wire (flatten()). */
	const FIELD_GROUP = 'field_group';

	/**
	 * Core types whose value is an object with known keys, so tablet and
	 * mobile nest INSIDE it: `{width, unit, tablet: {width, unit}, mobile: {…}}`.
	 *
	 * That is the shape 3D Viewer Pro's `bp3d_responsive_dimensions` already
	 * writes for `bp_3d_width` / `bp_3d_height`, so its data needs no migration.
	 * Every reader of the desktop keys is unaffected. Keyed by CORE type, so
	 * that custom type, mapped onto `dimension` with the bfields_type_map
	 * filter, nests too.
	 */
	const RESPONSIVE_NESTED = array('dimension', 'spacing');

	/**
	 * Core types that cannot be responsive. A list of rows or a sub-form has
	 * no single value to hold per device. Make its sub-fields responsive
	 * instead.
	 */
	const RESPONSIVE_NEVER = array('repeater', 'fieldset');

	/**
	 * Core type => the Codestar type whose stored shape it writes.
	 *
	 * Only the cores whose shape is unambiguous. `choice` (checkbox vs select),
	 * `media` (an 8-key array vs an upload URL) and the scalar cores are left
	 * out: a host type mapped onto one of them keeps the identity codec.
	 */
	const CORE_CODEC = array(
		'dimension' => 'dimensions',
		'spacing'   => 'spacing',
		'fieldset'  => 'fieldset',
		'repeater'  => 'group',
		'link'      => 'link',
	);

	/**
	 * Codestar's `units` for `dimensions` and `spacing` when a field authors
	 * none (fields/dimensions/dimensions.php, fields/spacing/spacing.php).
	 */
	const CSF_UNITS = array('px', '%', 'em');

	/**
	 * Build the JSON document for one screen.
	 *
	 * @param string $unique   Storage key (`_bp3d_settings_`, `_bp3dimages_`, …).
	 * @param string $kind     'options' | 'metabox'.
	 * @param array  $args     Screen arguments as registered.
	 * @param array  $sections Sections in registration order.
	 */
	public static function build(string $unique, string $kind, array $args, array $sections): array
	{
		$normalised = array();

		foreach ($sections as $index => $section) {
			$normalised[] = self::section($section, $index);
		}

		// Codestar's get_default() lets the screen override any top-level
		// field's default: `'defaults' => array('field_id' => value)`.
		if (!empty($args['defaults']) && is_array($args['defaults'])) {
			foreach ($normalised as $s => $section) {
				foreach ($section['fields'] as $f => $field) {
					if ('' === $field['id'] || $field['display'] || !isset($args['defaults'][$field['id']])) {
						continue;
					}
					$override = $args['defaults'][$field['id']];

					$normalised[$s]['fields'][$f]['csfDefault'] = $override;
					$normalised[$s]['fields'][$f]['default']    = Codec\Csf::hydrate(Codec\Csf::posted($override), $field);
					$normalised[$s]['fields'][$f]['default']    = self::select_default($normalised[$s]['fields'][$f]);
				}
			}
		}

		$normalised = self::tag_select_rules($normalised);

		if (defined('WP_DEBUG') && WP_DEBUG) {
			self::check_group_ids($normalised);
		}

		$schema = array(
			'schema'   => Loader::SCHEMA,
			'unique'   => $unique,
			'kind'     => $kind,
			'args'     => self::args($args, $kind),
			'sections' => $normalised,
		);

		/**
		 * Filter the finished schema for a screen, after normalisation.
		 *
		 * @param array  $schema The JSON document.
		 * @param string $unique Storage key.
		 */
		return apply_filters('bfields_schema', $schema, $unique);
	}

	/**
	 * Normalise screen-level arguments, keeping CSF's names.
	 */
	private static function args(array $args, string $kind): array
	{
		$defaults = array(
			'framework_title'    => '',
			'menu_title'         => '',
			'menu_slug'          => '',
			'menu_capability'    => 'manage_options',
			'save_defaults'      => true,
			'show_reset_all'     => true,
			'show_reset_section' => true,
			'show_search'        => false,
			'sticky_tabs'        => false,
			'tabs_position'      => 'top',
			'tabs_switcher'      => false,
			'resizable'          => false,
			'page_width'         => 'design',
			'page_align'         => 'center',
			'show_form_warning'  => true,
			'show_restore'       => false,
			'data_type'          => 'serialize',
			'database'           => '',
			'context'            => 'normal',
			'priority'           => 'default',
			'post_type'          => array(),
			'brand'              => array(),
			'theme'              => 'light',
		);

		$args = array_merge($defaults, $args);

		// Never let an authored value widen the capability silently.
		$args['menu_capability'] = is_string($args['menu_capability']) && $args['menu_capability'] !== ''
			? $args['menu_capability']
			: ('metabox' === $kind ? 'edit_posts' : 'manage_options');

		$args['post_type'] = (array) $args['post_type'];

		// 'top' is the design's pill strip; 'left' stacks the tabs in a
		// sidebar beside the panel. Anything else falls back to the design.
		$args['tabs_position'] = in_array($args['tabs_position'], array('top', 'left'), true)
			? $args['tabs_position']
			: 'top';

		// 'design' is the 1185px column the frames were measured at; 'full' fills the content well.
		$args['page_width'] = 'full' === $args['page_width'] ? 'full' : 'design';

		// 'start' pins a narrower column to the leading edge instead of centring it.
		$args['page_align'] = 'start' === $args['page_align'] ? 'start' : 'center';

		// Only the keys the UI actually reads cross the wire; callables and
		// PHP-only arguments (menu_parent, menu_position…) stay server side.
		return array(
			'title'            => (string) $args['framework_title'],
			'menuTitle'        => (string) $args['menu_title'],
			'menuSlug'         => (string) $args['menu_slug'],
			'saveDefaults'     => (bool) $args['save_defaults'],
			'showResetAll'     => (bool) $args['show_reset_all'],
			'showResetSection' => (bool) $args['show_reset_section'],
			'showSearch'       => (bool) $args['show_search'],
			'stickyTabs'       => (bool) $args['sticky_tabs'],
			'tabsPosition'     => $args['tabs_position'],
			'tabsSwitcher'     => (bool) $args['tabs_switcher'],
			'resizable'        => (bool) $args['resizable'],
			'pageWidth'        => $args['page_width'],
			'pageAlign'        => $args['page_align'],
			'showFormWarning'  => (bool) $args['show_form_warning'],
			'showRestore'      => (bool) $args['show_restore'],
			'dataType'         => (string) $args['data_type'],
			'database'         => (string) $args['database'],
			'context'          => (string) $args['context'],
			'brand'            => self::brand($args['brand']),
		);
	}

	/**
	 * Sanitise the brand tokens a host may set (plan 4.6).
	 *
	 * These end up as inline custom properties on the root element, so every
	 * value is validated rather than trusted.
	 */
	private static function brand($brand): array
	{
		if (!is_array($brand)) {
			return array();
		}

		$out = array();

		foreach (array('primary', 'save', 'obPrimary') as $key) {
			if (!empty($brand[$key]) && is_string($brand[$key])) {
				$colour = sanitize_hex_color($brand[$key]);
				if ($colour) {
					$out[$key] = $colour;
				}
			}
		}

		if (!empty($brand['logo']) && is_string($brand['logo'])) {
			$out['logo'] = esc_url_raw($brand['logo']);
		}

		return $out;
	}

	/**
	 * Normalise one section.
	 *
	 * The section id doubles as the route: it defaults to
	 * sanitize_title(title), which is exactly CSF's `#tab=` slug, so existing
	 * deep links (`#tab=analytics`, hard-coded in AnalyticsPro) keep working
	 * without an alias table (7.7).
	 */
	private static function section(array $section, int $index): array
	{
		$title = isset($section['title']) ? (string) $section['title'] : '';
		$id    = !empty($section['id']) ? sanitize_key($section['id']) : sanitize_title($title);

		if ('' === $id) {
			$id = 'section-' . $index;
		}

		$groups = array();
		$fields = self::flatten((array) (isset($section['fields']) ? $section['fields'] : array()), $id, $groups);

		return array(
			'id'     => $id,
			// The slug CSF would have produced, kept even when an explicit id
			// is given, so #tab= aliases resolve either way.
			'slug'   => sanitize_title($title),
			'title'  => $title,
			'icon'   => isset($section['icon']) ? (string) $section['icon'] : '',
			'layout' => isset($section['layout']) ? (string) $section['layout'] : 'rows',
			'fields' => $fields,
			'groups' => $groups,
		);
	}

	/**
	 * Splice every `field_group` into its parent list, so storage sees the same fields as without it.
	 *
	 * @param array      $authored Fields as authored.
	 * @param string     $section  Section id, for generated group ids.
	 * @param array|null $groups   Collects descriptors; null inside a row.
	 * @param string     $tag      Enclosing group id while recursing.
	 */
	private static function flatten(array $authored, string $section, ?array &$groups, string $tag = ''): array
	{
		$out = array();

		foreach ($authored as $field) {
			if (!is_array($field) || empty($field['type'])) {
				continue;
			}

			if (self::FIELD_GROUP !== $field['type']) {
				$node = self::field($field);
				if ('' !== $tag) {
					$node['fieldGroup'] = $tag;
				}
				$out[] = $node;
				continue;
			}

			$children = self::inherit_dependency(
				isset($field['fields']) && is_array($field['fields']) ? $field['fields'] : array(),
				isset($field['dependency']) ? $field['dependency'] : null
			);

			if (defined('WP_DEBUG') && WP_DEBUG && (isset($field['default']) || !empty($field['responsive']))) {
				_doing_it_wrong(
					__METHOD__,
					esc_html__('A "field_group" holds no value: its "default" and "responsive" keys are ignored. Set them on its fields.', 'bfields'),
					'1.1.0'
				);
			}

			if (null === $groups || '' !== $tag) {
				if ('' !== $tag && defined('WP_DEBUG') && WP_DEBUG) {
					_doing_it_wrong(
						__METHOD__,
						esc_html__('A "field_group" inside another "field_group" is not drawn as its own card; its fields join the outer group.', 'bfields'),
						'1.1.0'
					);
				} elseif ('' === $tag && defined('WP_DEBUG') && WP_DEBUG) {
					_doing_it_wrong(
						__METHOD__,
						esc_html__('A "field_group" inside a repeater row or a fieldset is not drawn as a card; its fields are shown flat.', 'bfields'),
						'1.1.0'
					);
				}
				foreach (self::flatten($children, $section, $groups, $tag) as $child) {
					$out[] = $child;
				}
				continue;
			}

			$group = self::group($field, $section, $groups);
			$spliced = self::flatten($children, $section, $groups, $group['id']);

			// An empty group draws nothing, so it describes nothing either.
			if (array() !== $spliced) {
				$groups[] = $group;
			}
			foreach ($spliced as $child) {
				$out[] = $child;
			}
		}

		return $out;
	}

	/**
	 * The presentational descriptor of one top-level `field_group`.
	 *
	 * @param array $field   As authored.
	 * @param string $section Section id.
	 * @param array $groups  The section's descriptors so far, for unique ids.
	 */
	private static function group(array $field, string $section, array $groups): array
	{
		$taken = array_column($groups, 'id');
		$id    = isset($field['id']) ? sanitize_key((string) $field['id']) : '';
		$id    = '' !== $id ? $id : 'group-' . $section . '-' . (count($groups) + 1);
		$base  = $id;

		for ($n = 2; in_array($id, $taken, true); $n++) {
			$id = $base . '-' . $n;
		}

		$group = array(
			'id'          => $id,
			'title'       => isset($field['title']) ? wp_strip_all_tags((string) $field['title']) : '',
			'subtitle'    => isset($field['subtitle']) ? wp_strip_all_tags((string) $field['subtitle']) : '',
			'desc'        => isset($field['desc']) ? wp_kses_post((string) $field['desc']) : '',
			'icon'        => isset($field['icon']) ? (string) $field['icon'] : '',
			'class'       => isset($field['class']) ? (string) $field['class'] : '',
			'collapsible' => !isset($field['collapsible']) || (bool) $field['collapsible'],
			'collapsed'   => !empty($field['collapsed']),
			// 'row': title and subtitle in the row's label column, the card beside them.
			'layout'      => isset($field['layout']) && 'row' === $field['layout'] ? 'row' : 'card',
			'card_title'  => isset($field['card_title']) ? wp_strip_all_tags((string) $field['card_title']) : '',
		);

		if (!empty($field['dependency'])) {
			$group['dependency'] = Dependency::normalize($field['dependency']);
		}

		return $group;
	}

	/**
	 * WP_DEBUG only: a group id is presentational, so one that equals a field
	 * id (or another section's group) is almost certainly an authoring slip.
	 */
	private static function check_group_ids(array $sections): void
	{
		$fields = array();
		$groups = array();

		foreach ($sections as $section) {
			foreach ($section['fields'] as $field) {
				if ('' !== $field['id']) {
					$fields[$field['id']] = true;
				}
			}
		}

		foreach ($sections as $section) {
			foreach ($section['groups'] as $group) {
				if (isset($fields[$group['id']]) || isset($groups[$group['id']])) {
					_doing_it_wrong(
						__CLASS__ . '::build',
						sprintf(
							/* translators: %s: field_group id. */
							esc_html__('The field_group id "%s" is also used by a field or another group on this screen. Group ids are never stored, but they must be unique.', 'bfields'),
							esc_html($group['id'])
						),
						'1.1.0'
					);
				}
				$groups[$group['id']] = true;
			}
		}
	}

	/**
	 * Splice every `field_group` away at any depth: the list Codestar must be given.
	 *
	 * @param array $fields Fields as authored.
	 */
	public static function unwrap_groups(array $fields): array
	{
		$out = array();

		foreach ($fields as $key => $field) {
			if (!is_array($field)) {
				$out[] = $field;
				continue;
			}

			if (isset($field['type']) && self::FIELD_GROUP === $field['type']) {
				$children = self::inherit_dependency(
					isset($field['fields']) && is_array($field['fields']) ? $field['fields'] : array(),
					isset($field['dependency']) ? $field['dependency'] : null
				);
				foreach (self::unwrap_groups($children) as $child) {
					$out[] = $child;
				}
				continue;
			}

			if (!empty($field['fields']) && is_array($field['fields'])) {
				$field['fields'] = self::unwrap_groups($field['fields']);
			}

			$out[] = $field;
		}

		return $out;
	}

	/**
	 * A group's rule is ANDed onto each child's own, so splicing the group away never shows what its card hides.
	 *
	 * @param array $children   The group's fields as authored.
	 * @param mixed $dependency The group's own rule, if any.
	 */
	public static function inherit_dependency(array $children, $dependency): array
	{
		if (!is_array($dependency) || array() === $dependency) {
			return $children;
		}

		$outer = self::rule_list($dependency);

		foreach ($children as $i => $child) {
			if (!is_array($child)) {
				continue;
			}

			if (empty($child['dependency']) || !is_array($child['dependency'])) {
				$children[$i]['dependency'] = $dependency;
				continue;
			}

			$inner = self::rule_list($child['dependency']);
			$flags = array_unique(array_map(static function ($rule) {
				return !empty($rule[3]);
			}, array_merge($outer, $inner)));

			// Codestar applies a 4th-element global flag to the whole rule set.
			if (count($flags) > 1 && defined('WP_DEBUG') && WP_DEBUG) {
				_doing_it_wrong(
					__METHOD__,
					esc_html__('A "field_group" dependency and a field dependency inside it disagree on the global (4th) flag; Codestar applies one flag to both.', 'bfields'),
					'1.1.0'
				);
			}

			$children[$i]['dependency'] = array_merge($outer, $inner);
		}

		return $children;
	}

	/** A dependency as a list of rules, each read the way CSF::field() reads it. */
	private static function rule_list(array $dependency): array
	{
		if (isset($dependency[0]) && is_array($dependency[0])) {
			$list = array();
			foreach ($dependency as $rule) {
				if (is_array($rule)) {
					$list[] = self::trim_rule($rule, false);
				}
			}
			return $list;
		}

		return array(self::trim_rule($dependency, true));
	}

	/** Keep the global and visible flags only when set: CSF implodes those columns and tests !empty(). */
	private static function trim_rule(array $rule, bool $single): array
	{
		$out = array();
		for ($k = 0; $k < 3; $k++) {
			// A single rule prints a part only when !empty(), a listed one raw (setup.class.php:732-743).
			$out[] = $single ? (!empty($rule[$k]) ? $rule[$k] : '') : (isset($rule[$k]) ? $rule[$k] : '');
		}
		foreach (array(3, 4) as $k) {
			if (!empty($rule[$k])) {
				$out[$k] = $rule[$k];
			}
		}

		return $out;
	}

	/**
	 * unwrap_groups() over every section of a screen.
	 *
	 * @param array $sections Sections as authored.
	 */
	public static function unwrap_sections(array $sections): array
	{
		foreach ($sections as $i => $section) {
			if (is_array($section) && !empty($section['fields']) && is_array($section['fields'])) {
				$sections[$i]['fields'] = self::unwrap_groups($section['fields']);
			}
		}

		return $sections;
	}

	/**
	 * Normalise one field, recursing into group/fieldset children.
	 */
	public static function field(array $field): array
	{
		$type = (string) $field['type'];
		$map  = self::type_map();
		$core = isset($map[$type]) ? $map[$type] : 'unknown';

		// An unknown type is NOT a text field. Codestar types bfields does not
		// render (`tabbed`, `sortable`, `wp_editor`…) and custom classes (HVP's
		// `library`) often hold arrays; treating them as text blanked those
		// arrays to '' on save (review 3.2). `unknown` is an opaque
		// pass-through: the codec never reshapes it, the sanitizer only kses
		// it, and the UI shows a read-only notice unless a host registered a
		// component for the type (bfields.registerField).
		if ('unknown' === $core && defined('WP_DEBUG') && WP_DEBUG) {
			_doing_it_wrong(
				__METHOD__,
				sprintf(
					/* translators: %s: field type. */
					esc_html__('bfields has no renderer for the field type "%s". Its stored value is preserved but it cannot be edited. Map it with the bfields_type_map filter.', 'bfields'),
					esc_html($type)
				),
				'1.0.0'
			);
		}

		// A `checkbox` with no options is a single boolean, not a choice list.
		if ('checkbox' === $type && empty($field['options'])) {
			$core = 'toggle';
		}

		$display = in_array($type, self::DISPLAY_TYPES, true);

		$out = array(
			'id'       => isset($field['id']) ? (string) $field['id'] : '',
			'type'     => $type,
			'core'     => $core,
			// Codestar prints these as HTML; the UI renders them as text, so markup would show as tags.
			'title'    => isset($field['title']) ? wp_strip_all_tags((string) $field['title']) : '',
			'subtitle' => isset($field['subtitle']) ? wp_strip_all_tags((string) $field['subtitle']) : '',
			'desc'     => isset($field['desc']) ? (string) $field['desc'] : '',
			'before'   => isset($field['before']) ? (string) $field['before'] : '',
			'after'    => isset($field['after']) ? (string) $field['after'] : '',
			'class'    => isset($field['class']) ? (string) $field['class'] : '',
			// `pro` renders the locked upsell treatment AND excludes the field
			// from save, so free-mode placeholder ids never reach the data (3.3).
			'pro'      => !empty($field['pro']),
			'display'  => $display,
			'layout'   => isset($field['layout']) ? (string) $field['layout'] : '',
			'icon'     => isset($field['icon']) ? (string) $field['icon'] : '',
			'props'    => self::props($field, self::codec_type(array('type' => $type, 'core' => $core))),
		);

		if (!empty($field['dependency'])) {
			$out['dependency'] = Dependency::normalize($field['dependency']);
		}

		if (!empty($field['adornments']) && is_array($field['adornments'])) {
			$out['adornments'] = array_values(array_map('strval', $field['adornments']));
		}

		if (!empty($field['responsive'])) {
			$responsive = self::responsive($out);
			if (null !== $responsive) {
				$out['responsive'] = $responsive;
			}
		}

		// Children FIRST. A fieldset's or group's blank value is built from
		// its sub-fields, so computing the default before attaching them gives
		// `real_size` an empty array instead of {width,height,depth}.
		// A field_group inside a row or fieldset is spliced flat (no card).
		if (!empty($field['fields']) && is_array($field['fields'])) {
			$none          = null;
			$out['fields'] = self::flatten($field['fields'], '', $none);
		}

		if (!$display) {
			// Server-only: the RAW authored default, which is what Codestar
			// seeds and resets with (get_default(), isset semantics).
			$out['csfDefault'] = isset($field['default']) ? $field['default'] : '';

			// What the UI holds for a key the row does not have: the default as
			// Codestar's form would post it back ('1' for true, '' for none),
			// so the first save writes what a Codestar save would.
			$out['default'] = Codec\Csf::hydrate(Codec\Csf::posted($out['csfDefault']), $out);
			$out['default'] = self::select_default($out);
		}

		// Server-only: callables cannot cross to the browser. for_client()
		// strips them before the schema is encoded.
		//
		// Codestar runs `sanitize` INSTEAD of kses when it is callable, and
		// saves the value raw when it is set but not callable (`'sanitize' =>
		// false`). `false` here records that second case.
		if (isset($field['sanitize'])) {
			$out['sanitize'] = is_callable($field['sanitize']) ? $field['sanitize'] : false;
		}
		// Server-only: a source's `query_args`. Choices runs the query with
		// them, and the browser never sends or sees them.
		if (isset($field['options'], $field['query_args']) && is_string($field['options']) && is_array($field['query_args'])) {
			$out['sourceArgs'] = $field['query_args'];
		}
		if (!empty($field['validate']) && is_callable($field['validate'])) {
			$out['validate'] = $field['validate'];
		}


		return $out;
	}

	/**
	 * Per-type presentation properties the UI needs.
	 *
	 * Everything here is display-only. Nothing in `props` may influence the
	 * stored shape — that is the codec's job (3.1).
	 */
	private static function props(array $field, string $type): array
	{
		$props = array();

		$copy = static function (string $from, string $to = '') use ($field, &$props) {
			$to = '' === $to ? $from : $to;
			if (isset($field[$from])) {
				$props[$to] = $field[$from];
			}
		};

		// A string `options` is a Codestar data source ('posts', 'pages',
		// 'categories', a function name…), not a list. Copied as-is it reached
		// the UI as the characters p/o/s/t/s. The name crosses the wire on its
		// own. The sources Choices can list are `searchable` and are chosen
		// through its REST route. Any other source keeps the stored value
		// read-only.
		if (isset($field['options']) && is_string($field['options'])) {
			$props['optionsSource'] = $field['options'];
			$props['searchable']    = Choices::supports($field['options']);
		} else {
			$copy('options');
			if (isset($props['options']) && is_array($props['options']) && self::js_reorders($props['options'])) {
				$props['optionOrder'] = array_map('strval', array_keys($props['options']));
			}
		}
		$copy('placeholder');
		$copy('attributes');
		$copy('multiple');
		$copy('unit');
		$copy('units');
		$copy('min');
		$copy('max');
		$copy('step');
		$copy('text_on', 'textOn');
		$copy('text_off', 'textOff');
		$copy('label');
		$copy('library');
		$copy('button_title', 'buttonTitle');
		$copy('add_title', 'addTitle');
		$copy('accordion_title_prefix', 'titlePrefix');
		$copy('accordion_title_number', 'titleNumber');
		$copy('style');
		$copy('settings');
		$copy('max_length', 'maxLength');
		// Row tabs for a group/repeater (ui/fields/claude/Repeater.tsx): a
		// sub-field's `tab` names the tab it starts, and the group's
		// `tab_icons` maps tab names to icons. Presentation only: a row stays
		// one flat object, and Codestar ignores both keys.
		$copy('tab');
		$copy('tab_icons', 'tabIcons');
		// group/repeater row limits, as in Codestar (0 = no limit).
		if ('group' === $type || 'repeater' === $type) {
			$copy('max', 'maxRows');
			$copy('min', 'minRows');
		}
		// Per-option presentation for the `cards` mode grid: icon, tag and perks.
		// Codestar has no such key and ignores it, which is exactly why it can
		// live on the same field array both renderers read (4.2).
		$copy('option_meta', 'optionMeta');

		if (isset($field['width']) && false === $field['width']) {
			$props['width'] = false;
		}
		if (isset($field['height']) && false === $field['height']) {
			$props['height'] = false;
		}
		if (isset($field['left']) && false === $field['left']) {
			$props['left'] = false;
		}
		if (isset($field['show_units']) && false === $field['show_units']) {
			$props['showUnits'] = false;
		}
		// spacing: Codestar's per-side `{side}_icon` (shown when plain text) and
		// a Modern-only per-side caption, `labels`. Codestar ignores `labels`.
		if ('spacing' === $type) {
			foreach (array('top', 'right', 'bottom', 'left') as $side) {
				if (isset($field[$side . '_icon']) && is_string($field[$side . '_icon'])) {
					$props[$side . 'Icon'] = $field[$side . '_icon'];
				}
			}
			if (isset($field['labels']) && is_array($field['labels'])) {
				$props['labels'] = array_map('strval', array_intersect_key($field['labels'], array_flip(array('top', 'right', 'bottom', 'left'))));
			}
		}
		// Codestar's own unit list when the field authors none. A unit only
		// this interface offered (`vw`) could not be shown by Codestar's
		// select, so the next Classic save would post `px` in its place:
		// `100vw` silently became `100px`.
		if (('dimensions' === $type || 'spacing' === $type) && empty($field['units'])) {
			$props['units'] = self::CSF_UNITS;
		}

		// `content` and `notice` carry trusted HTML authored in PHP; kses it
		// here rather than trusting the browser with it.
		if ('content' === $type && isset($field['content'])) {
			$props['html'] = wp_kses_post(self::resolve($field['content']));
		}
		if ('notice' === $type && isset($field['content'])) {
			$props['html']  = wp_kses_post(self::resolve($field['content']));
			$props['style'] = isset($field['style']) ? (string) $field['style'] : 'info';
		}
		if ('callback' === $type) {
			// A callback renders server-side output once, into a mount node the
			// UI leaves alone. Other scripts (the preview) target it by id.
			$props['html'] = self::callback($field);
		}
		if ('heading' === $type || 'subheading' === $type) {
			$props['level'] = 'heading' === $type ? 3 : 4;
		}
		if ('submessage' === $type) {
			$props['html']  = wp_kses_post(self::resolve(isset($field['content']) ? $field['content'] : ''));
			$props['style'] = isset($field['style']) ? (string) $field['style'] : 'info';
		}
		if ('textarea' === $type) {
			$props['multiline'] = true;
		}
		if ('password' === $type) {
			$props['secret'] = true;
		}

		// Presentation hint per core type (Appendix D).
		$presentation = array(
			'button_set'   => 'segmented',
			'radio'        => 'radio',
			'select'       => 'select',
			// Appendix D: `checkbox` with options IS the MIME tile grid in the
			// design. A plain checkbox list is the exception, via `layout`.
			'checkbox'     => 'tiles',
			'image_select' => 'images',
			'spinner'      => 'stepper',
			'slider'       => 'slider',
			'number'       => 'input',
			'upload'       => 'url',
			'media'        => 'attachment',
			'group'        => 'collapsible',
			'repeater'     => 'plain',
		);

		if (isset($presentation[$type])) {
			$props['presentation'] = $presentation[$type];
		}

		// An explicit `layout` overrides the default presentation for choices.
		if (!empty($field['layout']) && in_array($field['layout'], array('mode-grid', 'tile-grid', 'cards'), true)) {
			$props['presentation'] = 'mode-grid' === $field['layout'] ? 'cards'
				: ('tile-grid' === $field['layout'] ? 'tiles' : 'cards');
		}

		return $props;
	}

	/**
	 * What a single `select` holds for a key the row does not have.
	 *
	 * A browser shows AND posts a select's first option when its value
	 * matches none of them: Codestar's placeholder option (value '') when
	 * the field has one, else the first authored option. So that is what a
	 * Classic save stores. Holding '' instead meant the UI showed the first
	 * option, evaluated dependencies against '' (3D Viewer's product box hid
	 * the seven fields that depend on `bp_model_template == 'none'`) and
	 * wrote '' on the first save.
	 *
	 * Only the missing-key value changes. Seeding and resets write the raw
	 * `csfDefault`, as Codestar does.
	 *
	 * @param array $field Normalised schema field, with its `default`.
	 * @return mixed
	 */
	private static function select_default(array $field)
	{
		$default = $field['default'];
		$options = isset($field['props']['options']) ? $field['props']['options'] : null;

		if ('select' !== $field['type'] || !empty($field['props']['multiple']) || !is_array($options) || array() === $options || is_array($default)) {
			return $default;
		}

		$keys = self::option_keys($options);

		if (!empty($field['props']['placeholder'])) {
			array_unshift($keys, '');
		}

		return array() === $keys || in_array((string) $default, $keys, true) ? $default : $keys[0];
	}

	/**
	 * Would a JavaScript object built from this map list its keys in another
	 * order? JS enumerates integer keys first, ascending (`'none'` then `12`
	 * comes back as `12`, `'none'`), so the UI gets the PHP order as well.
	 *
	 * @param array $options Authored `options`.
	 */
	private static function js_reorders(array $options): bool
	{
		$keys  = array_keys($options);
		$index = array();
		$named = array();

		foreach ($keys as $key) {
			if (is_int($key) && $key >= 0) {
				$index[] = $key;
			} else {
				$named[] = $key;
			}
		}

		sort($index);

		return array_merge($index, $named) !== $keys;
	}

	/**
	 * Tag every dependency rule whose controller is a single `select` with
	 * that select's option values and the value Codestar's form shows when
	 * the stored one is not among them (Dependency::shown()).
	 *
	 * A local rule inside a row reads the row's own field when the row
	 * declares that id, else the root's, as Dependency::resolve() does.
	 *
	 * @param array $sections Normalised sections.
	 */
	private static function tag_select_rules(array $sections): array
	{
		$root = array();

		foreach ($sections as $section) {
			foreach (self::select_controllers($section['fields']) as $id => $choices) {
				$root[$id] = $choices;
			}
		}

		foreach ($sections as $s => $section) {
			foreach ($section['groups'] as $g => $group) {
				if (!empty($group['dependency'])) {
					$sections[$s]['groups'][$g]['dependency'] = self::tag_rules($group['dependency'], $root, array());
				}
			}
			$sections[$s]['fields'] = self::tag_fields($section['fields'], $root, array());
		}

		return $sections;
	}

	/** Recursive half of tag_select_rules(): a row's fields resolve against that row first. */
	private static function tag_fields(array $fields, array $root, array $row): array
	{
		foreach ($fields as $i => $field) {
			if (!empty($field['dependency'])) {
				$fields[$i]['dependency'] = self::tag_rules($field['dependency'], $root, $row);
			}
			if (!empty($field['fields']) && is_array($field['fields'])) {
				$fields[$i]['fields'] = self::tag_fields($field['fields'], $root, self::select_controllers($field['fields']));
			}
		}

		return $fields;
	}

	private static function tag_rules(array $rules, array $root, array $row): array
	{
		foreach ($rules as $r => $rule) {
			$id = $rule['controller'];

			$choices = 'global' !== $rule['scope'] && array_key_exists($id, $row)
				? $row[$id]
				: (isset($root[$id]) ? $root[$id] : null);

			if (null !== $choices) {
				$rules[$r]['choices'] = $choices;
				$rules[$r]['shown']   = $choices[0];
			}
		}

		return $rules;
	}

	/**
	 * id => option values (placeholder '' first) for each single select in
	 * a field list, and id => null for every other value field, so a row's
	 * own text field is never read as a root select of the same id.
	 *
	 * @param array $fields Normalised fields.
	 * @return array<string, string[]|null>
	 */
	private static function select_controllers(array $fields): array
	{
		$out = array();

		foreach ($fields as $field) {
			if ('' === $field['id'] || $field['display'] || $field['pro']) {
				continue;
			}

			$out[$field['id']] = null;
			$options           = isset($field['props']['options']) ? $field['props']['options'] : null;

			if ('select' !== $field['type'] || !empty($field['props']['multiple']) || !is_array($options) || array() === $options) {
				continue;
			}

			$keys = self::option_keys($options);

			if (!empty($field['props']['placeholder'])) {
				array_unshift($keys, '');
			}

			if (array() !== $keys) {
				$out[$field['id']] = array_values($keys);
			}
		}

		return $out;
	}

	/**
	 * The option values a choice field offers, as strings, the way the UI
	 * reads them (ui/fields/Choice.tsx): the keys of a map, the labels of a
	 * plain list, an optgroup's own keys in place of the group.
	 *
	 * @param array $options Authored `options`.
	 * @return string[]
	 */
	private static function option_keys(array $options): array
	{
		if (array_values($options) === $options) {
			return array_map('strval', array_filter($options, 'is_scalar'));
		}

		$keys = array();

		foreach ($options as $key => $label) {
			if (is_array($label)) {
				foreach (array_keys($label) as $sub) {
					$keys[] = (string) $sub;
				}
				continue;
			}
			$keys[] = (string) $key;
		}

		return $keys;
	}

	/**
	 * How a `'responsive' => true` field keeps its tablet and mobile values.
	 *
	 * Desktop is always the field's own value, untouched, so turning a field
	 * responsive changes nothing any existing reader sees. The other devices
	 * go where they cannot collide with it:
	 *
	 *   nested   dimensions, spacing. Under `tablet` / `mobile` INSIDE the
	 *            object (see RESPONSIVE_NESTED).
	 *   suffix   everything else. A scalar has no inside, so the devices are
	 *            sibling keys `{id}_tablet` / `{id}_mobile` in the same row.
	 *
	 * Either way, a device with no value of its own (absent or empty)
	 * inherits: tablet from desktop, mobile from tablet. Readers do the same
	 * fallback. A device key is written only once someone sets it.
	 *
	 * Codestar knows none of this. A Classic save of the same screen drops
	 * the device values unless the host gives Codestar a field type that
	 * posts them (as `bp3d_responsive_dimensions` does).
	 *
	 * @return array{mode: string, keys: array{tablet: string, mobile: string}}|null
	 *         Null for a type that cannot be responsive.
	 */
	private static function responsive(array $field): ?array
	{
		if ('' === $field['id'] || $field['display'] || 'unknown' === $field['core'] || in_array($field['core'], self::RESPONSIVE_NEVER, true)) {
			if (defined('WP_DEBUG') && WP_DEBUG) {
				_doing_it_wrong(
					__METHOD__,
					sprintf(
						/* translators: %s: field type. */
						esc_html__('A "%s" field cannot be responsive. Make its sub-fields responsive instead.', 'bfields'),
						esc_html($field['type'])
					),
					'1.0.0'
				);
			}
			return null;
		}

		if (in_array($field['core'], self::RESPONSIVE_NESTED, true)) {
			return array(
				'mode' => 'nested',
				'keys' => array('tablet' => 'tablet', 'mobile' => 'mobile'),
			);
		}

		return array(
			'mode' => 'suffix',
			'keys' => array('tablet' => $field['id'] . '_tablet', 'mobile' => $field['id'] . '_mobile'),
		);
	}

	/**
	 * The extra stored keys a `suffix` responsive field owns, as fields.
	 *
	 * Each is a copy of the field under the device's key, with no default.
	 * An unset device must stay unset, not be seeded with the desktop
	 * default. Listing them as fields is what lets the codec, the sanitizer
	 * and `validate` treat a tablet value exactly as they treat the desktop
	 * one, without any of them knowing about devices.
	 *
	 * @return array<string, array> Device key => field.
	 */
	public static function device_fields(array $field): array
	{
		if (empty($field['responsive']) || 'suffix' !== $field['responsive']['mode']) {
			return array();
		}

		$out = array();

		foreach ($field['responsive']['keys'] as $device => $key) {
			$copy = $field;
			unset($copy['responsive'], $copy['default'], $copy['dependency']);
			$copy['id']         = $key;
			$copy['device']     = $device;
			$copy['csfDefault'] = '';
			$out[$key]          = $copy;
		}

		return $out;
	}

	/**
	 * Resolve a value that may be authored as a callable (CSF allows both).
	 */
	private static function resolve($value): string
	{
		if (is_callable($value) && !is_string($value)) {
			return (string) call_user_func($value);
		}

		return (string) $value;
	}

	/**
	 * Capture a `callback` field's server-rendered output.
	 */
	private static function callback(array $field): string
	{
		if (empty($field['function']) || !is_callable($field['function'])) {
			return '';
		}

		ob_start();
		call_user_func($field['function'], $field);
		$html = ob_get_clean();

		return is_string($html) ? $html : '';
	}

	/**
	 * Strip everything that cannot be JSON-encoded, for the browser payload.
	 *
	 * `sanitize` and `validate` are PHP callables and `csfDefault` is only for
	 * seeding, so all three stay on the server; the
	 * UI gets the per-type validation rules from the schema instead and
	 * implements them independently (7.15).
	 */
	public static function for_client(array $schema): array
	{
		foreach ($schema['sections'] as $s => $section) {
			foreach ($section['fields'] as $f => $field) {
				$schema['sections'][$s]['fields'][$f] = self::strip($field);
			}
		}

		return $schema;
	}

	/**
	 * Recursively drop server-only keys from one field.
	 */
	private static function strip(array $field): array
	{
		unset($field['sanitize'], $field['validate'], $field['csfDefault'], $field['sourceArgs']);

		if (!empty($field['fields'])) {
			foreach ($field['fields'] as $index => $child) {
				$field['fields'][$index] = self::strip($child);
			}
		}

		return $field;
	}

	/**
	 * The authoring type => core type table, filterable.
	 *
	 * A host that ships its own field type (a JS component registered with
	 * bfields.registerField, a PHP sanitizer on bfields_sanitize_{type}) maps
	 * it here so it is not treated as unknown.
	 *
	 * @return array<string, string>
	 */
	public static function type_map(): array
	{
		static $map = null;

		if (null === $map) {
			/**
			 * Filter the authoring type => core renderer type table.
			 *
			 * @param array<string, string> $map TYPE_MAP.
			 */
			$map = (array) apply_filters('bfields_type_map', self::TYPE_MAP);
		}

		return $map;
	}

	/**
	 * The type the codec and the sanitizer treat a field as.
	 *
	 * Its own type for every Codestar type. A host type mapped onto a core
	 * renderer with bfields_type_map (3D Viewer Pro's
	 * `bp3d_responsive_dimensions` => `dimension`) is stored the way that
	 * renderer's Codestar type is. The mapping picks the component, and the
	 * component writes the core's shape: left on the identity codec, a
	 * dimension would skip its blank shape and a repeater would write the
	 * UI's row `__id`s into the database.
	 *
	 * @param array $field Normalised schema field.
	 */
	public static function codec_type(array $field): string
	{
		$type = (string) $field['type'];

		if (isset(self::TYPE_MAP[$type]) || !isset($field['core'], self::CORE_CODEC[$field['core']])) {
			return $type;
		}

		return self::CORE_CODEC[$field['core']];
	}

	/**
	 * Does any field in the schema (at any depth) have one of these types?
	 *
	 * @param string[] $types Authoring types.
	 */
	public static function uses_types(array $schema, array $types): bool
	{
		$walk = static function (array $fields) use (&$walk, $types): bool {
			foreach ($fields as $field) {
				if (in_array($field['type'], $types, true)) {
					return true;
				}
				if (!empty($field['fields']) && $walk($field['fields'])) {
					return true;
				}
			}
			return false;
		};

		foreach ($schema['sections'] as $section) {
			if ($walk($section['fields'])) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Every field id the schema declares, in order.
	 *
	 * This is the "declared set" the save merge writes (7.3): keys outside it
	 * are left untouched in storage, never dropped.
	 */
	public static function declared_ids(array $schema): array
	{
		$ids = array();

		foreach ($schema['sections'] as $section) {
			foreach ($section['fields'] as $field) {
				// Display types hold no value; `pro` fields are rendered locked
				// and excluded from save so placeholder ids stay out of the data.
				if ('' === $field['id'] || $field['display'] || $field['pro']) {
					continue;
				}
				$ids[] = $field['id'];

				foreach (array_keys(self::device_fields($field)) as $key) {
					$ids[] = $key;
				}
			}
		}

		return array_values(array_unique($ids));
	}

	/**
	 * Map of field id => normalised field, for the codec and sanitizer.
	 */
	public static function field_index(array $schema): array
	{
		$index = array();

		foreach ($schema['sections'] as $section) {
			foreach ($section['fields'] as $field) {
				if ('' !== $field['id'] && !$field['display'] && !$field['pro']) {
					$index[$field['id']] = $field;
					$index += self::device_fields($field);
				}
			}
		}

		return $index;
	}

	/**
	 * Default value for every declared field — what `save_defaults` seeds (7.5).
	 */
	public static function defaults(array $schema): array
	{
		$defaults = array();

		foreach (self::field_index($schema) as $id => $field) {
			// A device key has no default: unset means "same as the device
			// above", and seeding it would pin today's desktop value.
			if (array_key_exists('default', $field) && empty($field['device'])) {
				$defaults[$id] = $field['default'];
			}
		}

		return $defaults;
	}

	/**
	 * Section ids and their legacy `#tab=` slugs, for the router's aliases.
	 */
	public static function section_aliases(array $schema): array
	{
		$aliases = array();

		foreach ($schema['sections'] as $section) {
			if ('' !== $section['slug']) {
				$aliases[$section['slug']] = $section['id'];
			}
		}

		return $aliases;
	}
}
