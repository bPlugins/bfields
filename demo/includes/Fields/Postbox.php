<?php
/**
 * bfields demo — the plain postbox's field set.
 *
 * Not a 3D Viewer screen. A handful of fields, one of each storage shape the
 * framework's meta box path has to round-trip — a scalar, a switcher, a
 * select, a responsive `dimensions` (tablet nests inside the object), a group
 * row, and a field with a `validate` callback (inside a `field_group` card,
 * which changes nothing stored) — registered through the same
 * Codestar facade as everything else, WITHOUT `'render' => false`.
 *
 * tests/e2e/metabox-save.mjs drives this screen; the ids and defaults below
 * are what it asserts against.
 *
 * @package BFieldsDemo
 */

namespace BFieldsDemo\Fields;

use BFields\Compat\Codestar;

use const BFieldsDemo\POSTBOX_KEY;
use const BFieldsDemo\POSTBOX_TYPE;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * The "bfields Postbox" meta box.
 */
final class Postbox
{
	public static function register(): void
	{
		Codestar::createMetabox(POSTBOX_KEY, array(
			'title'     => __('bfields Postbox', 'bfields-demo'),
			'post_type' => POSTBOX_TYPE,
			'context'   => 'normal',
		));

		Codestar::createSection(POSTBOX_KEY, array(
			'title'  => __('General', 'bfields-demo'),
			'icon'   => 'fas fa-cog',
			'fields' => array(
				array(
					'id'      => 'label',
					'type'    => 'text',
					'title'   => __('Label', 'bfields-demo'),
					'default' => 'Hello',
				),
				array(
					'id'      => 'enabled',
					'type'    => 'switcher',
					'title'   => __('Enabled', 'bfields-demo'),
					'default' => false,
				),
				array(
					'id'      => 'align',
					'type'    => 'select',
					'title'   => __('Alignment', 'bfields-demo'),
					'options' => array(
						'left'   => __('Left', 'bfields-demo'),
						'center' => __('Center', 'bfields-demo'),
						'right'  => __('Right', 'bfields-demo'),
					),
					'default' => 'center',
				),
				array(
					'id'         => 'size',
					'type'       => 'dimensions',
					'title'      => __('Size', 'bfields-demo'),
					'responsive' => true,
					'default'    => array('width' => '100', 'height' => '50', 'unit' => 'px'),
				),
				array(
					'id'           => 'items',
					'type'         => 'group',
					'title'        => __('Items', 'bfields-demo'),
					'button_title' => __('Add Item', 'bfields-demo'),
					'fields'       => array(
						array(
							'id'    => 'item_label',
							'type'  => 'text',
							'title' => __('Item Label', 'bfields-demo'),
						),
					),
					'default'      => array(array('item_label' => 'First')),
				),
				// A field_group: a card around three fields that are still stored
				// flat, at the top of the row (metabox-save.mjs checks the bytes).
				array(
					'id'       => 'extras_group',
					'type'     => 'field_group',
					'title'    => __('Extras', 'bfields-demo'),
					'subtitle' => __('Grouped for display only.', 'bfields-demo'),
					'icon'     => 'sliders',
					'fields'   => array(
						array(
							'id'       => 'code',
							'type'     => 'text',
							'title'    => __('Code', 'bfields-demo'),
							'subtitle' => __('Anything but "invalid".', 'bfields-demo'),
							'default'  => 'ok',
							'validate' => array(self::class, 'validate_code'),
						),
						array(
							'id'      => 'tint',
							'type'    => 'color',
							'title'   => __('Tint', 'bfields-demo'),
							'default' => 'rgba(0, 0, 0, 0.4)',
						),
						array(
							'id'         => 'related',
							'type'       => 'select',
							'title'      => __('Related Post', 'bfields-demo'),
							'options'    => 'posts',
							'query_args' => array('post_type' => 'post', 'post_status' => 'publish'),
							'chosen'     => true,
							'ajax'       => true,
							'default'    => '',
						),
					),
				),
			),
		));
	}

	/**
	 * Codestar's `validate` contract: a message rejects the value, and the
	 * stored one is kept.
	 *
	 * @param mixed $value Value as it would be stored.
	 * @return string '' when valid.
	 */
	public static function validate_code($value): string
	{
		return 'invalid' === $value ? __('"invalid" is not an accepted code.', 'bfields-demo') : '';
	}
}
