import type React from 'react';
import { __ } from '@wordpress/i18n';

import { HERO_IMAGE } from '../lib/images';
import { RefreshCw, ZoomIn, ZoomOut, Search, type IconProps } from './icons';

/* Pieces the dashboard screens share. */

type Pos = React.CSSProperties;

/*
 * The decorative right half of every hero: two blurred ellipses behind the
 * headphones render, plus the 360° pill, and whatever else the screen passes
 * in (viewer chips, thumbnails). Positions are per screen, in the file's
 * frame — Welcome's hero is the 815px left column, the others span the full
 * 1185px — and the stage holding them slides right when the hero is wider.
 */
export const HeroArt: React.FC<{
    blobs: [Pos, Pos];
    model: Pos;
    degree: Pos;
    large?: boolean;
    children?: React.ReactNode;
}> = ({ blobs, model, degree, large = false, children }) => (
    <div className="bp3d-dash-hero__art" aria-hidden="true">
        <span className="bp3d-dash-hero__blob bp3d-dash-hero__blob--a" style={blobs[0]} aria-hidden="true" />
        <span className="bp3d-dash-hero__blob bp3d-dash-hero__blob--b" style={blobs[1]} aria-hidden="true" />
        <div className="bp3d-dash-hero__model" style={model}>
            <img src={HERO_IMAGE} alt="" />
        </div>
        <span className={large ? 'bp3d-dash-degree bp3d-dash-degree--lg' : 'bp3d-dash-degree'} style={degree}>
            360°
        </span>
        {children}
    </div>
);

/*
 * Rotate / zoom-in / zoom-out chips. Each glyph is drawn at its own size and
 * weight in the file (they are three different icon sets' boxes), so the
 * sizes are passed per icon rather than derived from the chip. They are
 * artwork, not controls — there is no model behind them to rotate.
 */
export const ViewerControls: React.FC<{ style: Pos; icons: [IconProps, IconProps, IconProps]; large?: boolean }> = ({
    style,
    icons,
    large = false,
}) => {
    const [r, zi, zo] = icons;

    return (
        <div className={large ? 'bp3d-dash-ctrls bp3d-dash-ctrls--lg' : 'bp3d-dash-ctrls'} style={style} aria-hidden="true">
            <span className="bp3d-dash-ctrl"><RefreshCw {...r} /></span>
            <span className="bp3d-dash-ctrl"><ZoomIn {...zi} /></span>
            <span className="bp3d-dash-ctrl"><ZoomOut {...zo} /></span>
        </div>
    );
};

export const Tag: React.FC<{ children: React.ReactNode; bg?: string; color?: string; className?: string }> = ({
    children,
    bg,
    color,
    className = '',
}) => (
    <span className={`bp3d-dash-tag ${className}`} style={{ background: bg, color }}>
        {children}
    </span>
);

export const SearchField: React.FC<{
    placeholder: string;
    iconSize: number;
    weight: number;
    value: string;
    onChange: (value: string) => void;
}> = ({ placeholder, iconSize, weight, value, onChange }) => (
    <label className="bp3d-dash-search">
        <Search size={iconSize} weight={weight} />
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={placeholder.replace(/\.+$/, '')}
        />
    </label>
);

/** The two status pills every hero opens with. */
export const StatusTags: React.FC = () => (
    <div className="bp3d-dash-tags">
        <Tag className="bp3d-dash-tag--pill" color="#10b981">{__('Plugin Active', '3d-viewer')}</Tag>
        <Tag className="bp3d-dash-tag--pill" color="#475569">{__('Free Plan', '3d-viewer')}</Tag>
    </div>
);

/** Props for a link that leaves wp-admin. */
export const external = { target: '_blank', rel: 'noreferrer' } as const;
