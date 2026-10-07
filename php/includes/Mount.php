<?php
/**
 * bfields — the mount node every screen prints.
 *
 * Codestar renders server HTML; React renders into an empty div. If the bundle
 * 404s behind a caching or optimisation plugin, is blocked, or throws before it
 * mounts, that div would stay empty — a locked door (4.6). <noscript> does not
 * help there: JavaScript is ON, it just never ran bfields.
 *
 * So the escape hatch is ordinary server HTML INSIDE the root. The bundle
 * removes it when it mounts; if the bundle never runs, it stays visible
 * (review 3.6). The same URL rides on `data-fallback` for the error boundary,
 * which covers a bundle that loads and then fails to render.
 *
 * It first shows a skeleton of the screen, and turns into the notice only once the bundle has
 * had its chance: when it gave up, or `bfields_fallback_delay` (5 s) after the
 * page's scripts have run. A slow page therefore never looks broken while it
 * is still loading (3D Viewer integration demo, 27 Sep 2026).
 *
 * @package BFields
 */

namespace BFields;

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Prints `.bfields-root` with its fallback notice.
 */
final class Mount
{
	/**
	 * Print the root for one screen.
	 *
	 * @param string $unique Storage key.
	 * @param string $kind   'options' | 'metabox'.
	 * @param array  $schema Normalised schema.
	 * @param array  $data   Extra data-* attributes (name => value).
	 */
	public static function render(string $unique, string $kind, array $schema, array $data = array()): void
	{
		$style = '';

		foreach ($schema['args']['brand'] as $token => $value) {
			if ('logo' === $token) {
				continue;
			}
			$style .= '--bfields-' . sanitize_key($token) . ':' . $value . ';';
		}

		$fallback = self::fallback_url($unique);
		$attrs    = '';

		$data = array_merge(array('unique' => $unique, 'kind' => $kind, 'fallback' => $fallback), $data);

		foreach ($data as $name => $value) {
			if ('' === (string) $value) {
				continue;
			}
			$attrs .= sprintf(' data-%s="%s"', sanitize_key($name), esc_attr((string) $value));
		}

		// `bfields-app` is the token + reset scope every bfields stylesheet is
		// written under (theme/base.css rule 1); `bfields-root` is the mount
		// hook the bundle looks for. The root element carries both.
		printf(
			'<div class="bfields-root bfields-app"%1$s%2$s>',
			$attrs, // Escaped above.
			'' === $style ? '' : ' style="' . esc_attr($style) . '"'
		);

		// The escape hatch has two states. The bundle removes the whole
		// `.bfields-fallback` when it mounts. Until then it shows a skeleton, because
		// the bundle mounts only when the page's scripts have all run, which on a
		// heavy admin page or a slow host can take a while, and a failure message
		// there reads as a broken screen. Only when the bundle has had its chance
		// does it say so and offer the host's switch. Both states are plain HTML
		// plus an inline style and script: they have to work when the bundle, and
		// bfields' own stylesheet, never arrive. With JavaScript off, the second
		// state shows at once.
		self::fallback_assets();

		echo '<div class="bfields-fallback">';

		echo '<div class="bfields-fallback__loading" role="status">';
		echo '<span class="screen-reader-text">' . esc_html('metabox' === $kind ? __('Loading these settings…', 'bfields') : __('Loading the settings…', 'bfields')) . '</span>';
		echo self::skeleton($kind, $schema, $data); // Static markup.
		echo '</div>';

		echo '<div class="bfields-fallback__stuck"><div class="notice notice-warning inline"><p>';

		echo esc_html(
			'metabox' === $kind
				? __('These settings are taking longer than usual to load, or they could not load on this site. Nothing has changed: saving the post will not change them.', 'bfields')
				: __('This screen is taking longer than usual to load, or it could not load on this site. Your saved settings are safe and unchanged.', 'bfields')
		);

		if ('' !== $fallback) {
			echo ' <a class="button" href="' . esc_url($fallback) . '">' . esc_html__('Switch to the classic interface', 'bfields') . '</a>';
		}

		echo '</p></div></div></div></div>';
	}

	/**
	 * Grey placeholder blocks in the screen's shape: the page editor's title,
	 * tabs, cards and side column; an options page's head, tabs and rows; a
	 * meta box's tabs and rows.
	 */
	private static function skeleton(string $kind, array $schema, array $data): string
	{
		$frame    = (string) ($data['frame'] ?? '');
		$sections = isset($schema['sections']) && is_array($schema['sections']) ? $schema['sections'] : array();
		$tabs     = count($sections) > 1 ? min(6, count($sections)) : 0;
		$first    = isset($sections[0]['fields']) && is_array($sections[0]['fields']) ? count($sections[0]['fields']) : 0;
		$left     = 'left' === ($schema['args']['tabsPosition'] ?? 'top');

		$bar = static function (string $class, string $style = ''): string {
			return '<span class="bfields-skel__b ' . $class . '"' . ('' === $style ? '' : ' style="' . $style . '"') . '></span>';
		};

		$strip = '';
		for ($i = 0; $i < $tabs; $i++) {
			$strip .= $bar('bfields-skel__tab', 'width:' . (96 + ($i * 37) % 70) . 'px');
		}
		$strip = '' === $strip ? '' : '<div class="bfields-skel__tabs">' . $strip . '</div>';

		$rows = static function (int $count) use ($bar): string {
			$html = '';
			for ($i = 0; $i < $count; $i++) {
				$html .= '<div class="bfields-skel__row">' . $bar('bfields-skel__icon')
					. '<span class="bfields-skel__lines">' . $bar('bfields-skel__title', 'width:' . (22 + ($i * 13) % 18) . '%') . $bar('bfields-skel__text', 'width:' . (40 + ($i * 17) % 25) . '%') . '</span>'
					. $bar('bfields-skel__control', 'width:' . (0 === $i % 2 ? 72 : 120) . 'px') . '</div>';
			}
			return $html;
		};

		$count = max(3, min(7, $first));

		if ('page' === $frame) {
			$editor = json_decode((string) ($data['editor'] ?? ''), true);
			$editor = is_array($editor) ? $editor : array();
			$chip   = !empty($editor['shortcode']) ? $bar('bfields-skel__chip') : '';

			$cards = '';
			for ($i = 0; $i < 3; $i++) {
				$cards .= '<div class="bfields-skel__card">' . $bar('bfields-skel__title', 'width:' . (18 + $i * 6) . '%') . $bar('bfields-skel__text', 'width:' . (34 + $i * 9) . '%') . '</div>';
			}

			// The side column as EditorShell draws it: preview, Publish, Save Draft on a draft, the shortcode bar.
			$side = $bar('bfields-skel__preview') . $bar('bfields-skel__button bfields-skel__button--primary')
				. (empty($editor['published']) ? $bar('bfields-skel__button') : '')
				. ('' !== $chip ? $bar('bfields-skel__button') : '');

			$body = '<div class="bfields-skel__editor"><div class="bfields-skel__main">' . $cards . '</div><div class="bfields-skel__side">' . $side . '</div></div>';

			// The real column goes full width by setting this on <html>; the rule leaves with the fallback.
			$width = 'full' === ($schema['args']['pageWidth'] ?? '') ? '<style>:root{--bfields-page-width:none}</style>' : '';

			return $width . '<div class="bfields-skel bfields-skel--page" aria-hidden="true">'
				. '<div class="bfields-skel__head">' . $bar('bfields-skel__heading') . (!empty($schema['args']['tabsSwitcher']) ? $bar('bfields-skel__switch') : '') . '</div>'
				. '<div class="bfields-skel__input">' . $chip . '</div>'
				. '<div class="bfields-skel__panel' . ($left ? ' bfields-skel__panel--left' : '') . '">' . $strip . $body . '</div></div>';
		}

		$head = 'options' === $kind
			? '<div class="bfields-skel__head">' . $bar('bfields-skel__heading') . $bar('bfields-skel__search') . '</div>'
			: '';

		return '<div class="bfields-skel bfields-skel--' . esc_attr($kind) . '" aria-hidden="true">' . $head
			. '<div class="bfields-skel__panel' . ($left ? ' bfields-skel__panel--left' : '') . '">' . $strip . '<div class="bfields-skel__rows">' . $rows($count) . '</div></div></div>';
	}

	/**
	 * What switches the fallback's two states, once per page, inline.
	 *
	 * The bundle is a footer script and mounts on DOMContentLoaded, so right
	 * after that event it has either mounted a root (the fallback is gone),
	 * given up on it (the root is marked but the fallback is still there), or
	 * not run at all. The script shows the notice at once in the second case,
	 * and after `bfields_fallback_delay` in the third, which leaves room for a
	 * bundle an optimisation plugin made load late.
	 *
	 * Without the script (JavaScript off, inline scripts blocked, a script
	 * earlier on the page that never finishes loading) CSS does it: <noscript>
	 * shows the notice at once, and an animation shows it a minute after the
	 * page first drew it. A browser that cannot animate these properties shows
	 * the notice at once, which is how it always worked.
	 */
	private static function fallback_assets(): void
	{
		static $printed = false;

		if ($printed) {
			return;
		}

		$printed = true;

		/**
		 * Filter how long the fallback keeps saying "Loading" once the page's
		 * scripts have run, if the bundle has not mounted, before it offers the
		 * switch. In seconds.
		 *
		 * @param int $seconds Default 5.
		 */
		$delay = max(0, (int) apply_filters('bfields_fallback_delay', 5));

		// For when the script cannot run: counted from when the page first draws
		// the fallback, so it has to allow for a whole slow page.
		$safety = max(60, $delay);

		echo '<style id="bfields-fallback-style">'
			. '.bfields-fallback__loading{display:block;margin:12px 0;overflow:hidden;animation:bfields-fallback-loading 1ms ' . $safety . 's both}'
			. '.bfields-skel{display:flex;flex-direction:column;gap:20px}'
			. '.bfields-skel__b{display:block;border-radius:8px;background:linear-gradient(90deg,#eceef1 25%,#f6f7f9 37%,#eceef1 63%) 0 0/400% 100%;animation:bfields-skel 1.4s ease infinite}'
			. '.bfields-skel--options{padding:8px 48px 40px}'
			. '.bfields-skel__head{display:flex;align-items:center;justify-content:space-between;gap:24px}'
			. '.bfields-skel__heading{width:240px;max-width:50%;height:30px}'
			. '.bfields-skel__search{width:340px;max-width:40%;height:40px}'
			. '.bfields-skel__input{display:flex;align-items:center;justify-content:flex-end;height:52px;padding:0 8px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;box-sizing:border-box}'
			. '.bfields-skel__chip{width:220px;max-width:50%;height:36px}'
			. '.bfields-skel__switch{flex:none;width:78px;height:44px;margin-block:-4px}'
			. '.bfields-skel--page{gap:0}'
			. '.bfields-skel--page>.bfields-skel__head{margin-top:20px;align-items:flex-end}'
			. '.bfields-skel--page .bfields-skel__heading{height:36px;width:180px}'
			. '.bfields-skel--page>.bfields-skel__input{margin-top:23px}'
			. '.bfields-skel--page>.bfields-skel__panel{margin-top:21px}'
			. '.bfields-skel--page .bfields-skel__editor{padding:0 20px}'
			. '.bfields-skel--page .bfields-skel__side{width:369px;max-width:35%}'
			. '.bfields-skel__button--primary{background-image:linear-gradient(90deg,#dfe6fb 25%,#ebf0fd 37%,#dfe6fb 63%)}'
			. '.bfields-skel__panel{display:flex;flex-direction:column;gap:20px;padding:20px;border:1px solid #e5e7eb;border-radius:10px;background:#fff}'
			. '.bfields-skel__panel--left{flex-direction:row;align-items:flex-start}'
			. '.bfields-skel__tabs{display:flex;flex-wrap:wrap;gap:12px;padding:10px;border-radius:8px;background:#f5f8ff}'
			. '.bfields-skel__panel--left>.bfields-skel__tabs{flex:none;flex-direction:column;width:180px}'
			. '.bfields-skel__panel--left>.bfields-skel__tabs>.bfields-skel__tab{width:auto!important}'
			. '.bfields-skel__tab{height:40px}'
			. '.bfields-skel__rows,.bfields-skel__editor,.bfields-skel__main{flex:1;min-width:0}'
			. '.bfields-skel__row{display:flex;align-items:center;gap:18px;padding:16px 12px;border-bottom:1px solid #f1f3f5}'
			. '.bfields-skel__row:last-child{border-bottom:0}'
			. '.bfields-skel__icon{flex:none;width:40px;height:40px}'
			. '.bfields-skel__lines{flex:1;display:flex;flex-direction:column;gap:8px}'
			. '.bfields-skel__title{height:14px}'
			. '.bfields-skel__text{height:12px}'
			. '.bfields-skel__control{flex:none;height:32px}'
			. '.bfields-skel__editor{display:flex;gap:40px;align-items:flex-start}'
			. '.bfields-skel__main{display:flex;flex-direction:column;gap:16px}'
			. '.bfields-skel__card{display:flex;flex-direction:column;gap:10px;padding:20px;border:1px solid #e5e7eb;border-radius:8px}'
			. '.bfields-skel__card .bfields-skel__b+.bfields-skel__b{margin-bottom:28px}'
			. '.bfields-skel__side{flex:none;width:30%;max-width:369px;display:flex;flex-direction:column;gap:8px}'
			. '.bfields-skel__preview{height:320px;margin-bottom:6px}'
			. '.bfields-skel__button{height:45px}'
			. '@media (max-width:782px){.bfields-skel--options{padding:8px 16px 24px}.bfields-skel--page .bfields-skel__editor{padding:0}.bfields-skel__editor,.bfields-skel__panel--left{flex-direction:column}.bfields-skel__side,.bfields-skel__panel--left>.bfields-skel__tabs{width:100%;max-width:none}}'
			. '@media (prefers-reduced-motion:reduce){.bfields-skel__b{animation:none}}'
			. '@keyframes bfields-skel{from{background-position:100% 0}to{background-position:0 0}}'
			. '.bfields-fallback__stuck{overflow:hidden;animation:bfields-fallback-stuck 1ms ' . $safety . 's both}'
			. '.bfields-fallback.is-stuck .bfields-fallback__loading{display:none}'
			. '.bfields-fallback.is-stuck .bfields-fallback__stuck{animation:none}'
			. '@keyframes bfields-fallback-loading{from{max-height:300em;visibility:visible}to{max-height:0;margin:0;visibility:hidden}}'
			. '@keyframes bfields-fallback-stuck{from{max-height:0;visibility:hidden}to{max-height:40em;visibility:visible}}'
			. '</style>'
			. '<noscript><style>.bfields-fallback__loading{display:none}.bfields-fallback__stuck{animation:none}</style></noscript>';

		// setTimeout(…, 0) runs after every DOMContentLoaded listener, the
		// bundle's mountAll() included, whichever was added first.
		wp_print_inline_script_tag(
			'(function(d,w){'
				. 'function stuck(all){var f=d.querySelectorAll(".bfields-fallback"),i;'
				. 'for(i=0;i<f.length;i++){if(all||"1"===f[i].parentNode.getAttribute("data-bfields-mounted")){f[i].classList.add("is-stuck");}}}'
				. 'function check(){stuck(false);w.setTimeout(function(){stuck(true);},' . ($delay * 1000) . ');}'
				. 'if("loading"===d.readyState){d.addEventListener("DOMContentLoaded",function(){w.setTimeout(check,0);});}else{w.setTimeout(check,0);}'
				. '})(document,window);',
			array('id' => 'bfields-fallback-js')
		);
	}

	/**
	 * Where the "switch to classic" escape hatch points.
	 *
	 * The host owns the switch (3D Viewer's `bp3d_admin_ui` option, plan 4.9),
	 * so the framework has no URL of its own: '' means no button. The old
	 * default — this same page — only reloaded the broken screen.
	 */
	public static function fallback_url(string $unique): string
	{
		/**
		 * Filter the "switch to the classic interface" URL for a screen.
		 *
		 * @param string $url    Default ''. Return a URL that turns Classic mode on.
		 * @param string $unique Storage key.
		 */
		return (string) apply_filters('bfields_fallback_url', '', $unique);
	}
}
