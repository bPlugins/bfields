<?php
/**
 * Reference host file: Modern (bfields) or Classic (Codestar), per site and per screen.
 *
 * Distilled from 3D Viewer Premium's inc/Base/AdminUi.php. Copy it, then replace
 * `Prefix` (namespace), `PREFIX_` (constant) and `{prefix}` (option, action,
 * filter and storage-key names) with your plugin's. Both interfaces edit the
 * same stored arrays; only the screen changes.
 *
 * Boot, in the main plugin file, after Codestar (it stays loaded in both modes):
 *
 *   require_once __DIR__ . '/lib/bfields/php/bootstrap.php';
 *   (new \Prefix\Admin\AdminUi())->register();   // at load time, not on init
 */

namespace Prefix\Admin;

if (!defined('ABSPATH')) {
    exit;
}

final class AdminUi
{
    // Its own option: inside the settings row, a Codestar save or Reset All could drop it.
    const OPTION = '{prefix}_admin_ui';
    const MODERN = 'modern';
    const CLASSIC = 'classic';
    const ACTION = '{prefix}_switch_admin_ui';
    const CAPABILITY = 'manage_options';

    /** Storage key => surface name, for the per-surface filter. */
    const SURFACES = [
        '_{prefix}_settings_' => 'settings',
        '_{prefix}_meta_' => 'editor',
    ];

    /** Where the switch lands when there is no redirect_to and no Referer. */
    const HOME = 'admin.php?page={prefix}-settings';

    /** @var string|null */
    private static $mode = null;

    public function register(): void
    {
        // Before any schema is built: bfields caches the type map.
        add_filter('bfields_type_map', [self::class, 'typeMap']);
        add_filter('bfields_fallback_url', [self::class, 'fallbackUrl'], 10, 2);
        add_filter('bfields_schema', [self::class, 'schema'], 10, 2);

        add_action('admin_post_' . self::ACTION, [$this, 'handleSwitch']);
        add_action('admin_notices', [$this, 'notice']);
    }

    /** Site mode, then the per-surface filter; Classic whenever bfields did not boot. */
    public static function mode(string $surface = ''): string
    {
        $mode = self::siteMode();

        if ('' !== $surface) {
            $mode = self::normalize(apply_filters('{prefix}_admin_ui_surface', $mode, $surface)) ?: $mode;
        }

        return self::MODERN === $mode && !self::bfieldsReady() ? self::CLASSIC : $mode;
    }

    /** Option, then constant, then `_default` filter (nothing chosen), then the locking filter. */
    public static function siteMode(): string
    {
        if (null !== self::$mode) {
            return self::$mode;
        }

        $mode = self::chosen();

        if (defined('PREFIX_ADMIN_UI') && self::normalize(PREFIX_ADMIN_UI)) {
            $mode = self::normalize(PREFIX_ADMIN_UI);
        }

        if ('' === $mode) {
            $mode = self::normalize(apply_filters('{prefix}_admin_ui_default', self::MODERN)) ?: self::MODERN;
        }

        $mode = self::normalize(apply_filters('{prefix}_admin_ui', $mode)) ?: $mode;

        return self::$mode = $mode;
    }

    /** What an admin picked, or '' when nobody has chosen yet. */
    public static function chosen(): string
    {
        return self::normalize(get_option(self::OPTION, ''));
    }

    /** 'filter' or 'constant' when the on-screen switch cannot change the mode. */
    public static function lockedBy(): string
    {
        if (has_filter('{prefix}_admin_ui')) {
            return 'filter';
        }

        return defined('PREFIX_ADMIN_UI') && self::normalize(PREFIX_ADMIN_UI) ? 'constant' : '';
    }

    public static function bfieldsReady(): bool
    {
        return did_action('bfields_loaded') > 0 && class_exists('BFields\\Compat\\Codestar', false);
    }

    /** Register an admin-only screen in bfields' REST requests too (save route, option search). */
    public static function isBfieldsRestRequest(string $unique): bool
    {
        return self::MODERN === self::mode(self::SURFACES[$unique] ?? '')
            && function_exists('bfields_is_rest_request')
            && bfields_is_rest_request($unique);
    }

    /** Custom Codestar types onto a core renderer; they are then stored as that core's Codestar type. */
    public static function typeMap(array $map): array
    {
        return $map + ['{prefix}_responsive_dimensions' => 'dimension'];
    }

    /** The fallback notice's button. Without a URL the notice has no button. */
    public static function fallbackUrl($url, $unique)
    {
        if (!isset(self::SURFACES[$unique]) || !current_user_can(self::CAPABILITY) || '' !== self::lockedBy()) {
            return $url;
        }

        return self::switchUrl(self::CLASSIC, self::here());
    }

    /** Display-only hints (`layout`, `subtitle`): bfields never stores them. */
    public static function schema(array $schema, $unique): array
    {
        if (!isset(self::SURFACES[$unique])) {
            return $schema;
        }

        foreach ($schema['sections'] as $s => $section) {
            foreach ($section['fields'] as $f => $field) {
                if ('delete_data_on_uninstall' === $field['id']) {
                    $schema['sections'][$s]['fields'][$f]['layout'] = 'danger';
                }
            }
        }

        return $schema;
    }

    public static function switchUrl(string $to, string $redirect = ''): string
    {
        $args = ['action' => self::ACTION, 'ui' => $to];

        if ('' !== $redirect) {
            $args['redirect_to'] = rawurlencode($redirect); // PHP decodes it once into $_GET.
        }

        return wp_nonce_url(add_query_arg($args, admin_url('admin-post.php')), self::ACTION);
    }

    /** A plain nonce link, so it works with no JavaScript: exactly when a blocked bundle needs it. */
    public function handleSwitch(): void
    {
        check_admin_referer(self::ACTION);

        if (!current_user_can(self::CAPABILITY)) {
            wp_die(esc_html__('You do not have permission to change the admin interface.', '{prefix}'), 403);
        }

        $to = self::normalize(isset($_GET['ui']) ? sanitize_key(wp_unslash($_GET['ui'])) : '');

        if ('' === $to) {
            wp_die(esc_html__('Unknown admin interface.', '{prefix}'), 400);
        }

        update_option(self::OPTION, $to);

        $fallback = admin_url(self::HOME);
        $target = isset($_GET['redirect_to']) ? (string) wp_unslash($_GET['redirect_to']) : (string) wp_get_referer();
        $target = '' === trim($target) ? $fallback : wp_validate_redirect($target, $fallback);

        wp_safe_redirect(add_query_arg('{prefix}_admin_ui_switched', $to, $target));
        exit;
    }

    /** First row of the settings page: a `content` field with no id, so neither framework stores it. */
    public static function switchField(): array
    {
        $modern = self::MODERN === self::mode('settings');
        $locked = self::lockedBy();

        if ('' !== $locked) {
            $button = '<p><em>' . esc_html(
                'constant' === $locked
                    ? __('The interface is set by a constant in wp-config.php.', '{prefix}')
                    : __('The interface is set by a filter.', '{prefix}')
            ) . '</em></p>';
        } elseif (!$modern && !self::bfieldsReady()) {
            $button = '<p><em>' . esc_html__('The new interface could not be loaded on this site, so the classic one is used.', '{prefix}') . '</em></p>';
        } else {
            $button = sprintf(
                '<p><a class="button%s" href="%s">%s</a></p>',
                $modern ? '' : ' button-primary',
                esc_url(self::switchUrl($modern ? self::CLASSIC : self::MODERN, self::here())),
                $modern ? esc_html__('Switch to the classic interface', '{prefix}') : esc_html__('Try the new interface', '{prefix}')
            );
        }

        return [
            'type' => 'content',
            'title' => __('Admin interface', '{prefix}'),
            'content' => '<div class="{prefix}-admin-ui-switch">' . $button . '</div>',
        ];
    }

    /** Shown until an admin picks an interface; either button records the choice. */
    public function notice(): void
    {
        if (!current_user_can(self::CAPABILITY) || '' !== self::chosen() || '' !== self::lockedBy()
            || self::MODERN !== self::siteMode() || !self::bfieldsReady() || '' === self::screenSurface()) {
            return;
        }

        printf(
            '<div class="notice notice-info"><p>%s</p><p><a class="button button-primary" href="%s">%s</a> <a class="button" href="%s">%s</a></p></div>',
            esc_html__('This plugin has a new interface. Your settings have not changed, and you can switch back at any time.', '{prefix}'),
            esc_url(self::switchUrl(self::MODERN, self::here())),
            esc_html__('Keep the new interface', '{prefix}'),
            esc_url(self::switchUrl(self::CLASSIC, self::here())),
            esc_html__('Switch to the classic interface', '{prefix}')
        );
    }

    /** The surface the current screen edits, or ''. Adjust to your screen ids and post types. */
    public static function screenSurface(): string
    {
        $screen = function_exists('get_current_screen') ? get_current_screen() : null;

        if (!$screen) {
            return '';
        }

        if (false !== strpos((string) $screen->id, '{prefix}-settings')) {
            return 'settings';
        }

        return 'post' === $screen->base && '{prefix}_post_type' === $screen->post_type ? 'editor' : '';
    }

    private static function here(): string
    {
        return isset($_SERVER['REQUEST_URI']) ? (string) wp_unslash($_SERVER['REQUEST_URI']) : '';
    }

    private static function normalize($mode): string
    {
        return in_array($mode, [self::MODERN, self::CLASSIC], true) ? $mode : '';
    }
}
