<?php
/**
 * Reference host file: the one place a plugin registers its admin screens.
 *
 * Distilled from 3D Viewer Premium's inc/Helper/Registrar.php. Copy it next to
 * AdminUi.php and replace `Prefix` / `{prefix}` with your plugin's names.
 *
 * Field files keep their Codestar arrays and call these methods in place of
 * `\CSF::`. Each screen goes, whole, to the interface AdminUi picks, and both
 * read the same arrays (one schema per key, README invariant 7). Register in
 * bfields' REST requests too:
 *
 *   if (is_admin() || AdminUi::isBfieldsRestRequest('_{prefix}_meta_')) {
 *       Registrar::createMetabox('_{prefix}_meta_', [...]);
 *   }
 */

namespace Prefix\Admin;

if (!defined('ABSPATH')) {
    exit;
}

final class Registrar
{
    /** Rows the free field sets lock with this class become `pro`: shown locked, left out of the save. */
    const PRO_CLASS = '{prefix}-readonly';

    /** Custom types mapped onto `dimension` in AdminUi::typeMap(); they get `'responsive' => true`. */
    const RESPONSIVE_TYPES = ['{prefix}_responsive_dimensions'];

    /** The settings screen that carries the interface switch as its first row. */
    const SETTINGS = '_{prefix}_settings_';

    /** @var array<string, bool> Decided once per key per request. */
    private static $modern = [];

    /** @var array<string, bool> */
    private static $sections = [];

    public static function createOptions(string $unique, array $args = []): void
    {
        if (self::modern($unique)) {
            \BFields\Compat\Codestar::createOptions($unique, $args + [
                // Codestar shows search unless told otherwise; bfields does not.
                'show_search' => true,
            ]);
            return;
        }

        \CSF::createOptions($unique, $args);
    }

    public static function createMetabox(string $unique, array $args = []): void
    {
        if (self::modern($unique)) {
            \BFields\Compat\Codestar::createMetabox($unique, $args);
            return;
        }

        \CSF::createMetabox($unique, $args);
    }

    public static function createSection(string $unique, array $section = []): void
    {
        if (self::SETTINGS === $unique && empty(self::$sections[$unique])) {
            $section['fields'] = array_merge([AdminUi::switchField()], (array) ($section['fields'] ?? []));
        }

        self::$sections[$unique] = true;

        if (self::modern($unique)) {
            if (!empty($section['fields']) && is_array($section['fields'])) {
                // An older bfields copy may have won arbitration: it has no field_group.
                if (!defined('BFIELDS_VERSION') || version_compare(BFIELDS_VERSION, '1.1.0', '<')) {
                    $section['fields'] = self::unwrapGroups($section['fields']);
                }
                $section['fields'] = self::modernFields($section['fields']);
            }
            \BFields\Compat\Codestar::createSection($unique, $section);
            return;
        }

        // Codestar has no field_group: it would drop every grouped field on save.
        if (!empty($section['fields']) && is_array($section['fields'])) {
            $section['fields'] = self::unwrapGroups($section['fields']);
        }

        \CSF::createSection($unique, $section);
    }

    /** Splices every bfields `field_group`'s children where the group stood; a list without groups comes back unchanged. */
    private static function unwrapGroups(array $fields): array
    {
        if (!self::hasGroup($fields)) {
            return $fields;
        }

        $out = [];
        foreach ($fields as $field) {
            if (is_array($field) && ($field['type'] ?? '') === 'field_group') {
                $children = self::inheritDependency(is_array($field['fields'] ?? null) ? $field['fields'] : [], $field['dependency'] ?? null);
                foreach (self::unwrapGroups($children) as $child) {
                    $out[] = $child;
                }
                continue;
            }

            if (is_array($field) && !empty($field['fields']) && is_array($field['fields'])) {
                $field['fields'] = self::unwrapGroups($field['fields']);
            }
            $out[] = $field;
        }

        return $out;
    }

    /** A group's rule is ANDed onto each child's own (Schema::inherit_dependency()), so Classic hides what the card would. */
    private static function inheritDependency(array $children, $dependency): array
    {
        if (!is_array($dependency) || [] === $dependency) {
            return $children;
        }

        foreach ($children as $i => $child) {
            if (!is_array($child)) {
                continue;
            }
            $children[$i]['dependency'] = empty($child['dependency']) || !is_array($child['dependency'])
                ? $dependency
                : array_merge(self::ruleList($dependency), self::ruleList($child['dependency']));
        }

        return $children;
    }

    /** A dependency as a rule list read the way CSF::field() reads it: a single rule's empty parts print as '', unset flags stay unset. */
    private static function ruleList(array $dependency): array
    {
        $single = !(isset($dependency[0]) && is_array($dependency[0]));
        $list = [];

        foreach ($single ? [$dependency] : $dependency as $rule) {
            if (!is_array($rule)) {
                continue;
            }
            $out = [];
            for ($k = 0; $k < 3; $k++) {
                $out[] = $single ? (!empty($rule[$k]) ? $rule[$k] : '') : ($rule[$k] ?? '');
            }
            foreach ([3, 4] as $k) {
                if (!empty($rule[$k])) {
                    $out[$k] = $rule[$k];
                }
            }
            $list[] = $out;
        }

        return $list;
    }

    private static function hasGroup(array $fields): bool
    {
        foreach ($fields as $field) {
            if (!is_array($field)) {
                continue;
            }
            if (($field['type'] ?? '') === 'field_group' || (!empty($field['fields']) && is_array($field['fields']) && self::hasGroup($field['fields']))) {
                return true;
            }
        }

        return false;
    }

    /** Does bfields own this screen in this request? */
    public static function modern(string $unique): bool
    {
        if (!isset(self::$modern[$unique])) {
            self::$modern[$unique] = AdminUi::MODERN === AdminUi::mode(AdminUi::SURFACES[$unique] ?? '');
        }

        return self::$modern[$unique];
    }

    /** Modern-only keys, at any depth. Codestar never sees them. */
    private static function modernFields(array $fields): array
    {
        foreach ($fields as $i => $field) {
            if (!is_array($field)) {
                continue;
            }

            if (in_array($field['type'] ?? '', self::RESPONSIVE_TYPES, true)) {
                $fields[$i]['responsive'] = true;
            }

            if (isset($field['class']) && is_string($field['class']) && preg_match('/(^|\s)' . preg_quote(self::PRO_CLASS, '/') . '(\s|$)/', $field['class'])) {
                $fields[$i]['pro'] = true;
            }

            if (!empty($field['fields']) && is_array($field['fields'])) {
                $fields[$i]['fields'] = self::modernFields($field['fields']);
            }
        }

        return $fields;
    }
}
