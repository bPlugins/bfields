/**
 * bfields — `content`, `notice`, `callback`, `heading`, `subheading`,
 * `submessage`.
 *
 * `notice` renders the design's `.bp3d-infobar` — the pale blue bar with a
 * leading icon that sits under the MIME grid in the Figma export. `heading`
 * and `subheading` render its `.bp3d-section-title` ("3D Viewer Settings" at
 * the top of the Shortcode Generator tab), the only in-form heading it draws.
 *
 * These hold no value and are never written (3.1). The HTML was authored in PHP
 * and has already been through wp_kses_post on the server, which is why it can
 * be injected here — the browser is not trusted to sanitize anything (4.0).
 */

import { Info, AlertTriangle, Check } from '../core/icons';
import type { FieldComponentProps } from '../core/registry';

const NOTICE_ICON = {
	info: Info,
	warning: AlertTriangle,
	danger: AlertTriangle,
	success: Check,
} as const;

export default function Display({ field }: FieldComponentProps) {
	const { html, style, level } = field.props;

	if (field.type === 'heading' || field.type === 'subheading') {
		const Tag = (level === 4 ? 'h4' : 'h3') as 'h3' | 'h4';
		return <Tag className="bfields-section-title">{field.title}</Tag>;
	}

	if (field.type === 'notice' || field.type === 'submessage') {
		const tone = (style ?? 'info') as keyof typeof NOTICE_ICON;
		const Icon = NOTICE_ICON[tone] ?? Info;

		return (
			<div
				className={`bfields-infobar bfields-infobar--${tone}`}
				role={tone === 'danger' ? 'alert' : 'status'}
			>
				<Icon size={18} />
				<span dangerouslySetInnerHTML={{ __html: html ?? '' }} />
			</div>
		);
	}

	// `callback` fields are mount points other scripts target by id — the live
	// preview roots among them (7.7) — so their markup is left exactly as PHP
	// rendered it.
	return (
		<div
			className={`bfields-content bfields-content--${field.type}`}
			dangerouslySetInnerHTML={{ __html: html ?? '' }}
		/>
	);
}
