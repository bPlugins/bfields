/*
 * bfields demo — the static preview's renderer.
 *
 * WHAT THIS IS. A vanilla renderer that reads the SAME JSON schema
 * PHP sends to the React body (assets/schema.js, dumped from a live install)
 * and produces the SAME class names the React components produce, against the
 * SAME compiled stylesheet the plugin ships. No build step, no framework, no
 * server: open the .html file and it runs.
 *
 * WHAT IT IS NOT. It is not a second implementation of bfields, and nothing in
 * it is shared with the plugin. It exists so the screens can be shown to people
 * who do not have a WordPress install — a design review, a client, a ticket.
 * If it disagrees with the plugin, the plugin is right.
 *
 * Why a renderer rather than hand-written HTML: the two screens are 80 fields.
 * Hand-writing them would be a copy that silently rots the first time a field
 * changes; reading the real schema cannot.
 */

(function () {
	'use strict';

	/* ==================================================================
	   Tiny hyperscript
	   ================================================================== */

	/**
	 * h('div', {class: 'x', onclick: fn}, child, child) -> Element
	 *
	 * `html: '<b>…</b>'` sets innerHTML, for the schema's already-escaped
	 * strings (PHP ran wp_kses_post over every one of them before it wrote the
	 * JSON — see Schema::props).
	 */
	function h(tag, attrs, ...children) {
		const node =
			tag === 'svg' || tag === 'path' || tag === 'circle'
				? document.createElementNS('http://www.w3.org/2000/svg', tag)
				: document.createElement(tag);

		Object.entries(attrs || {}).forEach(function ([key, value]) {
			if (value === null || value === undefined || value === false) {
				return;
			}

			if (key === 'html') {
				node.innerHTML = value;
			} else if (key === 'style' && typeof value === 'object') {
				Object.entries(value).forEach(function ([property, setting]) {
					node.style.setProperty(property, setting);
				});
			} else if (key.startsWith('on') && typeof value === 'function') {
				node.addEventListener(key.slice(2), value);
			} else if (value === true) {
				node.setAttribute(key, '');
			} else {
				node.setAttribute(key, value);
			}
		});

		children.flat(Infinity).forEach(function (child) {
			if (child === null || child === undefined || child === false) {
				return;
			}

			node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
		});

		return node;
	}

	/* ==================================================================
	   Icons — ui/core/icons.tsx, lifted by dump-icons.mjs
	   ================================================================== */

	function icon(name, size, stroke) {
		const cleaned = String(name || '')
			.trim()
			.toLowerCase()
			.replace(/^(fa[srlbd]?|dashicons)[\s-]+/, '')
			.replace(/^fa-/, '')
			.replace(/^admin-/, '')
			.trim();

		const key =
			(window.BFIELDS_ICONS[name] ? name : null) ||
			window.BFIELDS_ICON_MAP[cleaned] ||
			window.BFIELDS_ICON_MAP[window.BFIELDS_ICON_ALIASES[cleaned]] ||
			window.BFIELDS_ICON_MAP.box;

		const drawing = window.BFIELDS_ICONS[key];

		const svg =
			'<svg width="' + (size || drawing.size) + '" height="' + (size || drawing.size) + '"' +
			' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (stroke || 2) + '"' +
			' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
			drawing.svg +
			'</svg>';

		const holder = h('span', { class: 'bfields-demo-icon', html: svg });

		return holder.firstChild;
	}

	/* ==================================================================
	   Dependency engine — the spec ui/core/dependency.ts implements
	   ================================================================== */

	function checkBoolean(value) {
		if (value === true || value === 1 || value === '1' || value === 'true') {
			return true;
		}

		if (
			value === false || value === 0 || value === '0' ||
			value === 'false' || value === null || value === undefined
		) {
			return false;
		}

		return value;
	}

	function looseEquals(a, b) {
		if (Array.isArray(a)) {
			return looseEquals(a.join(','), b);
		}

		if (Array.isArray(b)) {
			return looseEquals(a, b.join(','));
		}

		/* eslint-disable-next-line eqeqeq */
		return a == b;
	}

	function inList(wanted, current, want) {
		const list = String(wanted).split(',').map(function (item) { return item.trim(); });
		const held = Array.isArray(current) ? current.map(String) : [String(current)];
		const hit = held.some(function (item) { return list.indexOf(item) !== -1; });

		return want ? hit : !hit;
	}

	function evaluate(condition, wanted, current) {
		switch (condition) {
			case '==':
			case '=':
				return looseEquals(checkBoolean(wanted), checkBoolean(current));
			case '!=':
				return !looseEquals(checkBoolean(wanted), checkBoolean(current));
			case '>=': return Number(current) >= Number(wanted);
			case '<=': return Number(current) <= Number(wanted);
			case '>': return Number(current) > Number(wanted);
			case '<': return Number(current) < Number(wanted);
			case 'any': return inList(wanted, current, true);
			case 'not-any': return inList(wanted, current, false);
			// A field must never be hidden by a rule the engine cannot evaluate.
			case '()': return true;
			default: return false;
		}
	}

	function isVisible(rules, values, row) {
		if (!rules || rules.length === 0) {
			return true;
		}

		return rules.every(function (rule) {
			const current =
				rule.scope !== 'global' && row && Object.prototype.hasOwnProperty.call(row, rule.controller)
					? row[rule.controller]
					: values[rule.controller];

			return evaluate(rule.condition, rule.value, current);
		});
	}

	/* ==================================================================
	   Values
	   ================================================================== */

	const truthy = function (value) {
		return ['1', 'true', 'yes', 'on', true, 1].indexOf(value) !== -1;
	};

	const clone = function (value) {
		return JSON.parse(JSON.stringify(value === undefined ? null : value));
	};

	/** Seed a screen's state from the schema's own defaults, as PHP seeds it. */
	function seed(schema) {
		const values = {};

		schema.sections.forEach(function (section) {
			section.fields.forEach(function (field) {
				if (!field.id || field.display || field.pro) {
					return;
				}

				values[field.id] = clone(field.default);
			});
		});

		return values;
	}

	function blankRow(fields) {
		const row = {};

		fields.forEach(function (child) {
			if (!child.id || child.display) {
				return;
			}

			row[child.id] = clone(child.default);
		});

		return row;
	}

	/* ==================================================================
	   Controls — one per core type, same markup as ui/fields/*.tsx
	   ================================================================== */

	function options(raw) {
		if (!raw) {
			return [];
		}

		if (Array.isArray(raw)) {
			return raw.map(function (label) { return { key: String(label), label: String(label) }; });
		}

		return Object.entries(raw).map(function ([key, label]) { return { key: key, label: String(label) }; });
	}

	function toggle(field, value, set) {
		const on = truthy(value);
		const danger = field.layout === 'danger';
		const off = field.type === 'checkbox' && !field.props.options ? '' : '0';

		return h(
			'button',
			{
				type: 'button',
				role: 'switch',
				'aria-checked': String(on),
				'aria-label': field.title || null,
				class:
					'bfields-toggle' +
					(on ? ' bfields-toggle--on' : '') +
					(danger && !on ? ' bfields-toggle--danger' : ''),
				onclick: function () { set(on ? off : '1'); },
			},
			h('span', { class: 'bfields-toggle__track' }),
			h('span', { class: 'bfields-toggle__label' },
				on
					? (field.props.textOn || 'Enabled')
					: (field.props.textOff || (danger ? 'No' : 'Disabled')))
		);
	}

	function splitTile(label) {
		const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(label);

		return match ? { name: match[1], ext: match[2] } : { name: label, ext: '' };
	}

	function choice(field, value, set) {
		const list = options(field.props.options);
		const multiple = Boolean(field.props.multiple) || field.type === 'checkbox';
		// Checklist.tsx's isChecklist(): `'layout' => 'checklist'` asks for the list.
		const presentation = multiple && field.layout === 'checklist' ? 'checklist' : (field.props.presentation || 'select');

		const selected = multiple
			? (Array.isArray(value) ? value.map(String) : [])
			: [value === null || value === undefined ? '' : String(value)];

		const has = function (key) { return selected.indexOf(key) !== -1; };

		const pick = function (key) {
			if (!multiple) {
				set(key);
				return;
			}

			set(has(key) ? selected.filter(function (item) { return item !== key; }) : selected.concat([key]));
		};

		if (presentation === 'select') {
			const select = h('select', {
				class: 'bfields-select',
				multiple: multiple,
				onchange: function (event) {
					set(multiple
						? Array.from(event.target.selectedOptions).map(function (option) { return option.value; })
						: event.target.value);
				},
			}, list.map(function (option) {
				return h('option', { value: option.key, selected: has(option.key) }, option.label);
			}));

			return select;
		}

		if (presentation === 'segmented') {
			return h('div', { class: 'bfields-segmented', role: multiple ? 'group' : 'radiogroup' },
				list.map(function (option) {
					return h('button', {
						type: 'button',
						'aria-pressed': String(has(option.key)),
						onclick: function () { pick(option.key); },
					}, option.label);
				}));
		}

		if (presentation === 'cards') {
			// The mode grid — ui/fields/Choice.tsx's `cards` branch. The
			// per-option icon, tag and perks come from the field's own
			// `option_meta`; an option without one renders as the plain card.
			const meta = field.props.optionMeta || {};

			return h('div', {
				class: 'bfields-mode-grid',
				role: multiple ? 'group' : 'radiogroup',
				'aria-label': field.title || null,
			}, list.map(function (option) {
				const on = has(option.key);
				const chrome = meta[option.key] || {};

				return h('button', {
					type: 'button',
					role: multiple ? 'checkbox' : 'radio',
					'aria-checked': String(on),
					class: [
						'bfields-mode',
						chrome.tag ? '' : 'bfields-mode--plain',
						on ? 'bfields-mode--on' : '',
					].filter(Boolean).join(' '),
					onclick: function () { pick(option.key); },
				},
				h('span', { class: 'bfields-mode__icon' }, icon(chrome.icon || field.icon, 18)),
				h('span', { class: 'bfields-mode__body' },
					h('span', { class: 'bfields-mode__name' },
						option.label,
						chrome.tag ? h('span', { class: 'bfields-mode__tag' }, chrome.tag) : null),
					(chrome.perks || []).length
						? h('span', { class: 'bfields-mode__perks' },
							chrome.perks.map(function (perk) { return h('span', {}, '\u2713 ' + perk); }))
						: null),
				h('span', { class: 'bfields-mode__radio' }));
			}));
		}

		if (presentation === 'images') {
			// ui/fields/claude/ImageTiles.tsx — the tile card with an image in
			// each tile, and no bulk actions.
			return h('div', { class: 'bfields-subcard' },
				h('div', { class: 'bfields-subcard__head' },
					h('div', {},
						h('h3', { class: 'bfields-subcard__title' }, field.title),
						field.desc ? h('p', { class: 'bfields-subcard__desc', html: field.desc }) : null)),
				h('div', {
					class: 'bfields-mime-grid',
					role: multiple ? 'group' : 'radiogroup',
					'aria-label': field.title || null,
				}, list.map(function (option) {
					const on = has(option.key);

					return h('button', {
						type: 'button',
						role: multiple ? 'checkbox' : 'radio',
						'aria-checked': String(on),
						class: 'bfields-mime' + (on ? ' bfields-mime--on' : ''),
						onclick: function () { pick(option.key); },
					},
					h('span', { class: 'bfields-mime__box' }, on ? icon('check', 12) : null),
					h('img', { src: option.label, alt: '', class: 'bfields-mime__image' }));
				})));
		}

		if (presentation === 'tiles') {
			// The tile grid is a full-width CARD, not a row control: its own
			// title, description and Select All. FieldRenderer renders the
			// field bare and this card IS the row.
			return h('div', { class: 'bfields-subcard' },
				h('div', { class: 'bfields-subcard__head' },
					h('div', {},
						h('h3', { class: 'bfields-subcard__title' }, field.title),
						field.desc ? h('p', { class: 'bfields-subcard__desc', html: field.desc }) : null),
					multiple && list.length > 3
						? h('div', { class: 'bfields-linkbtns' },
							h('button', {
								type: 'button',
								class: 'bfields-linkbtn',
								onclick: function () { set(list.map(function (option) { return option.key; })); },
							}, 'Select All'),
							h('button', {
								type: 'button',
								class: 'bfields-linkbtn bfields-linkbtn--muted',
								onclick: function () { set([]); },
							}, 'Deselect All'))
						: null),
				h('div', {
					class: 'bfields-mime-grid',
					role: multiple ? 'group' : 'radiogroup',
					'aria-label': field.title || null,
				},
					list.map(function (option) {
						const parts = splitTile(option.label);
						const on = has(option.key);

						return h('button', {
							type: 'button',
							role: multiple ? 'checkbox' : 'radio',
							'aria-checked': String(on),
							class: 'bfields-mime' + (on ? ' bfields-mime--on' : ''),
							onclick: function () { pick(option.key); },
						},
						h('span', { class: 'bfields-mime__box' }, on ? icon('check', 12) : null),
						h('span', {},
							h('strong', { style: { 'font-weight': '600' } }, parts.name),
							parts.ext ? h('span', { class: 'bfields-mime__ext' }, ' (' + parts.ext + ')') : null));
					})));
		}

		if (multiple) {
			// ui/fields/Checklist.tsx — the tile's 20px tick box without the
			// tile; two columns above eight options.
			return h('div', {
				class: 'bfields-checklist' + (list.length > 8 ? ' bfields-checklist--columns' : ''),
				role: 'group',
				'aria-label': field.title || null,
			}, list.map(function (option) {
				const on = has(option.key);

				return h('button', {
					type: 'button',
					role: 'checkbox',
					'aria-checked': String(on),
					class: 'bfields-checklist__item' + (on ? ' bfields-checklist__item--on' : ''),
					onclick: function () { pick(option.key); },
				},
				h('span', { class: 'bfields-checklist__box', 'aria-hidden': 'true' }, on ? icon('check', 12) : null),
				h('span', { class: 'bfields-checklist__label' }, option.label));
			}));
		}

		// radio — the custom dot from the design, not a native input, always
		// inline: long labels wrap rather than stacking.
		return h('div', {
			class: 'bfields-radios',
			role: 'radiogroup',
			'aria-label': field.title || null,
		}, list.map(function (option) {
			const on = has(option.key);

			return h('button', {
				type: 'button',
				role: 'radio',
				'aria-checked': String(on),
				class: 'bfields-radio' + (on ? ' bfields-radio--on' : ''),
				onclick: function () { pick(option.key); },
			},
			h('span', { class: 'bfields-radio__dot' }),
			option.label);
		}));
	}

	/**
	 * A field's authored `attributes`, as the React components spread them onto
	 * the input. Only plain values: an attribute object is HTML, not props.
	 */
	function attributes(field) {
		const out = {};

		Object.entries(field.props.attributes || {}).forEach(function ([key, value]) {
			if (['string', 'number', 'boolean'].indexOf(typeof value) !== -1 && !key.startsWith('on')) {
				out[key] = value;
			}
		});

		return out;
	}

	function text(field, value, set, path) {
		const current = typeof value === 'string' ? value : '';

		if (field.props.multiline) {
			// ui/fields/Textarea.tsx — grows to six lines, then scrolls.
			const rows = Math.min(6, Math.max(1, Number((field.props.attributes && field.props.attributes.rows) || 3) || 3));
			const fit = function (area) {
				const style = getComputedStyle(area);
				const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
				const max = parseFloat(style.maxHeight);

				area.style.height = 'auto';
				area.style.height = (area.scrollHeight + border) + 'px';
				area.style.overflowY = isFinite(max) && area.scrollHeight + border > max ? 'auto' : 'hidden';
			};
			const area = h('textarea', {
				class: 'bfields-textarea',
				rows: rows,
				style: { '--bfields-textarea-rows': String(rows) },
				placeholder: field.props.placeholder || null,
				maxlength: field.props.maxLength || null,
				'aria-label': field.title || null,
				'data-path': path,
				oninput: function (event) { fit(event.target); set(event.target.value); },
			}, current);

			window.requestAnimationFrame(function () { if (area.isConnected) { fit(area); } });

			return area;
		}

		if (field.layout === 'selector') {
			const input = h('input', {
				type: 'text',
				value: current,
				spellcheck: 'false',
				placeholder: typeof field.props.placeholder === 'string' ? field.props.placeholder : null,
				size: Math.max(1, String(current || field.props.placeholder || '').length),
				'aria-label': field.title || 'Selector',
				'data-path': path,
				oninput: function (event) { set(event.target.value); },
			});

			const button = h('button', {
				type: 'button',
				'aria-label': 'Copy selector',
				onclick: function () {
					copy(input.value, button);
				},
			}, icon('copy', 16));

			return h('span', { class: 'bfields-selector-field' }, input, button);
		}

		return h('input', Object.assign({
			type: field.props.secret ? 'password' : 'text',
			class: 'bfields-input',
			value: current,
			placeholder: field.props.placeholder || null,
			maxlength: field.props.maxLength || null,
			'aria-label': field.title || null,
			'data-path': path,
			oninput: function (event) { set(event.target.value); },
		}, attributes(field)));
	}

	function number(field, value, set, path) {
		const props = field.props;
		const current = typeof value === 'string' ? value : String(value === undefined || value === null ? '' : value);

		if (props.presentation === 'slider') {
			// ui/fields/Number.tsx — the readout is the bare value, no unit.
			const lo = Number(props.min === undefined ? 0 : props.min);
			const hi = Number(props.max === undefined ? 100 : props.max);
			const now = current === '' ? lo : Number(current);
			const pct = hi > lo ? ((now - lo) / (hi - lo)) * 100 : 0;

			return h('div', { class: 'bfields-slider' },
				h('input', {
					type: 'range',
					value: isNaN(now) ? lo : now,
					min: lo,
					max: hi,
					step: props.step === undefined ? 1 : props.step,
					'aria-label': field.title || null,
					'data-path': path,
					style: { '--bfields-range-pct': Math.max(0, Math.min(100, pct)) + '%' },
					oninput: function (event) { set(event.target.value); },
				}),
				h('span', { class: 'bfields-slider__value' }, current));
		}

		// ui/fields/NumberInput.tsx from here down: the unit inside the field,
		// and for a spinner − and + behind hairlines, clamped to Codestar's
		// 0–100 / step 1 when the field authors none.
		const stepper = props.presentation === 'stepper';
		const finite = function (raw) {
			if (raw === undefined || raw === null || raw === '') { return undefined; }
			const n = Number(raw);
			return isFinite(n) ? n : undefined;
		};
		const bounds = stepper
			? { min: finite(props.min) ?? 0, max: finite(props.max) ?? 100, step: finite(props.step) ?? 1 }
			: { min: finite(props.min), max: finite(props.max), step: finite(props.step) ?? 1 };
		const id = 'bfields-static-' + path.replace(/[^\w-]/g, '-');

		const nudge = function (direction) {
			const next = stepValue(current, direction, bounds);

			if (next !== null && next !== current) { set(next); }
		};

		const shown = current.trim() === '' ? undefined : Number(current);
		const label = field.title || 'value';

		const step = function (direction) {
			const name = (direction > 0 ? 'Increase ' : 'Decrease ') + label;
			const limit = direction > 0 ? bounds.max : bounds.min;

			return h('button', {
				type: 'button',
				class: 'bfields-number__step',
				tabindex: '-1',
				'aria-label': name,
				'aria-controls': id,
				title: name,
				disabled: shown !== undefined && limit !== undefined && (direction > 0 ? shown >= limit : shown <= limit),
				onclick: function () { nudge(direction); },
			}, icon(direction > 0 ? 'plus' : 'minus', 16));
		};

		return h('span', {
			class: 'bfields-number' + (stepper ? ' bfields-number--stepper' : '') + (props.unit ? ' bfields-number--unit' : ''),
		},
			h('input', Object.assign({
				id: id,
				type: 'number',
				inputmode: 'decimal',
				class: 'bfields-number__input',
				value: current,
				placeholder: props.placeholder || null,
				min: stepper || props.min === undefined ? null : props.min,
				max: stepper || props.max === undefined ? null : props.max,
				step: stepper || props.step === undefined ? 'any' : props.step,
				'aria-valuemin': stepper ? bounds.min : null,
				'aria-valuemax': stepper ? bounds.max : null,
				'aria-label': field.title || null,
				'aria-describedby': props.unit ? id + '-unit' : null,
				'data-path': path,
				onkeydown: function (event) {
					const direction = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[event.key];

					if (stepper && direction !== undefined) {
						event.preventDefault();
						nudge(direction);
					}
				},
				oninput: function (event) { set(event.target.value); },
			}, attributes(field))),
			props.unit ? h('span', { id: id + '-unit', class: 'bfields-number__unit' }, props.unit) : null,
			stepper ? step(-1) : null,
			stepper ? step(1) : null);
	}

	/** NumberInput.tsx stepValue(): one step, snapped to the grid, clamped. */
	function stepValue(from, direction, bounds) {
		const current = String(from).trim() === '' ? 0 : Number(from);
		const step = bounds.step > 0 ? bounds.step : 1;

		if (!isFinite(current)) {
			return null;
		}

		const base = bounds.min === undefined ? 0 : bounds.min;
		const at = (current - base) / step;
		const onGrid = Math.abs(at - Math.round(at)) < 1e-9;
		const index = onGrid
			? Math.round(at) + direction
			: (direction > 0 ? Math.ceil(at) - 1 : Math.floor(at) + 1) + direction;
		let next = base + index * step;

		if (bounds.min !== undefined && next < bounds.min) { next = bounds.min; }
		if (bounds.max !== undefined && next > bounds.max) { next = bounds.max; }

		const places = function (n) {
			const parts = String(n).toLowerCase().split('e');
			return Math.max(0, ((parts[0].split('.')[1] || '').length) - Number(parts[1] || 0));
		};

		return String(Number(next.toFixed(Math.max(places(step), places(base)))));
	}

	/** The native colour input only speaks #rrggbb; expand #rgb for it. */
	function toPickerValue(text) {
		if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)) {
			return '#ffffff';
		}

		if (text.length === 4) {
			return ('#' + text[1] + text[1] + text[2] + text[2] + text[3] + text[3]).toLowerCase();
		}

		return text.toLowerCase();
	}

	function colour(field, value, set, path) {
		// ui/fields/Color.tsx — one bordered label: swatch, "Select Color", and
		// the native picker laid over it at zero opacity. There is no text box.
		const current = typeof value === 'string' ? value : '';
		const empty = current === '' || current.toLowerCase() === 'transparent';

		// The static page keeps the native picker over the button; the panel
		// (ColorPanel.tsx) needs the bundle.
		return h('span', { class: 'bfields-color' }, h('label', { class: 'bfields-colorpick', title: current || 'Default' },
			h('span', {
				class: 'bfields-colorpick__swatch' + (empty ? ' bfields-colorpick__swatch--empty' : ''),
				style: empty ? null : { background: current },
			}),
			'Select Color',
			h('input', {
				type: 'color',
				class: 'bfields-colorpick__picker',
				value: toPickerValue(current),
				'aria-label': field.title || 'Colour',
				'data-path': path,
				// `change`, not `input`: a re-render per drag step would close
				// the OS picker under the cursor.
				onchange: function (event) { set(event.target.value); },
			})));
	}

	function dimension(field, value, set, path, screen) {
		// ui/fields/Dimension.tsx — inputs, the unit select, the link button.
		const current = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
		const units = field.props.units || ['px', '%', 'em', 'rem', 'vw', 'vh'];
		const showWidth = field.props.width !== false;
		const showHeight = field.props.height !== false;
		const bothAxes = showWidth && showHeight;
		const linked = Boolean(screen.linked[path]);

		const patch = function (next) {
			set(Object.assign({}, current, next));
		};

		const setAxis = function (axis, next) {
			const other = axis === 'width' ? 'height' : 'width';
			const from = Number(current[axis]);
			const to = Number(next);
			const pair = Number(current[other]);
			const out = {};

			out[axis] = next;

			if (linked && bothAxes && from > 0 && to > 0 && pair > 0) {
				out[other] = String(Number(((pair * to) / from).toFixed(2)));
			}

			patch(out);
		};

		const axis = function (key, label) {
			return h('input', {
				type: 'number',
				class: 'bfields-input',
				value: current[key] === undefined ? '' : current[key],
				'aria-label': bothAxes ? label : (field.title || label),
				'data-path': path + '.' + key,
				oninput: function (event) { setAxis(key, event.target.value); },
			});
		};

		return h('div', { class: 'bfields-dim' },
			showWidth ? axis('width', 'Width') : null,
			showHeight ? axis('height', 'Height') : null,
			field.props.showUnits === false ? null : h('select', {
				class: 'bfields-select',
				'aria-label': field.title + ' unit',
				onchange: function (event) { patch({ unit: event.target.value }); },
			}, units.map(function (unit) {
				return h('option', { value: unit, selected: current.unit === unit }, unit);
			})),
			bothAxes ? h('button', {
				type: 'button',
				class: 'bfields-dim__link',
				'aria-pressed': String(linked),
				title: 'Keep width and height in proportion',
				onclick: function () {
					screen.linked[path] = !linked;
					screen.render();
				},
			}, icon('chain', 14)) : null);
	}

	/** Spacing.tsx's sideLabel(): labels, then a plain-text `{side}_icon`, then the side name. */
	function spacingLabel(field, side, fallback) {
		const own = field.props.labels && field.props.labels[side];
		const raw = field.props[side + 'Icon'];
		const text = typeof raw === 'string' && raw.trim() !== '' && !/[<>]/.test(raw) ? raw.trim() : '';
		return own && text ? own + ' (' + text + ')' : (own || text || fallback);
	}

	/** The media library is a WordPress frame; a file:// page has none. */
	const NO_LIBRARY = 'The media library only exists inside wp-admin. Paste a URL instead.';

	const EMPTY_MEDIA = { url: '', id: '', width: '', height: '', thumbnail: '', alt: '', title: '', description: '' };

	function fileName(url) {
		const base = (String(url).split(/[?#]/)[0] || '').split('/').pop() || '';

		try {
			return decodeURIComponent(base);
		} catch (error) {
			return base;
		}
	}

	function media(field, value, set, path, card) {
		const isUrl = field.type === 'upload';
		const held = !isUrl && value && typeof value === 'object' ? value : {};
		const current = isUrl ? (typeof value === 'string' ? value : '') : String(held.url || '');

		const emit = function (url) {
			if (isUrl) {
				set(url);
				return;
			}

			// Patch onto whatever is held so key order survives.
			set(Object.assign({}, held, { url: url }));
		};

		// Media.tsx removedValue(): '' for upload, Codestar's empty 8-key array for media.
		const remove = function () {
			set(isUrl ? '' : Object.assign({}, EMPTY_MEDIA));
		};

		const isImage = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(current);
		const label = field.props.buttonTitle || 'Upload';

		// In a card section, media gets the design's two bigger treatments —
		// the source field-row and the poster block. Same branch as
		// ui/fields/Media.tsx. Every Upload button is disabled here and says
		// why in its title.
		if (card && isUrl) {
			return h('div', { class: 'bfields-field-row' },
				h('input', {
					type: 'text',
					class: 'bfields-input',
					value: current,
					placeholder: field.props.placeholder || 'https://example.com/model.glb',
					'data-path': path,
					oninput: function (event) { emit(event.target.value); },
				}),
				h('button', {
					type: 'button',
					class: 'bfields-btn bfields-btn--soft',
					title: NO_LIBRARY,
					disabled: true,
				}, icon('upload', 17), label));
		}

		if (card) {
			const named = current
				? (held.title || current.split('/').pop() || current)
				: 'No image selected';

			return h('div', { class: 'bfields-poster' },
				h('span', { class: 'bfields-poster__thumb' },
					current && isImage
						? h('img', { src: held.thumbnail || current, alt: '' })
						: icon('image', 20)),
				h('div', { class: 'bfields-poster__main' },
					h('p', { class: 'bfields-poster__name' }, named),
					h('p', { class: 'bfields-poster__meta' },
						current && held.width && held.height
							? held.width + ' × ' + held.height + 'px'
							: (field.props.placeholder || 'JPG, PNG, WebP or SVG'))),
				h('button', {
					type: 'button',
					class: 'bfields-btn bfields-btn--primary',
					title: NO_LIBRARY,
					disabled: true,
				}, icon('upload', 17), label),
				current
					? h('button', {
						type: 'button',
						class: 'bfields-btn bfields-btn--link',
						onclick: remove,
					}, 'Remove')
					: null);
		}

		// ui/fields/MediaInline.tsx — the row version.
		const removeButton = current
			? h('button', {
				type: 'button',
				class: 'bfields-media__remove',
				'aria-label': 'Remove ' + (field.title || 'file'),
				onclick: remove,
			}, 'Remove')
			: null;

		if (isUrl) {
			return h('div', { class: 'bfields-media bfields-media--url' },
				current && isImage
					? h('span', { class: 'bfields-media__chip' }, h('img', { src: current, alt: '' }))
					: null,
				h('input', {
					type: 'text',
					class: 'bfields-input bfields-media__input',
					value: current,
					placeholder: field.props.placeholder || 'Not selected',
					spellcheck: 'false',
					'aria-label': field.title || null,
					'data-path': path,
					oninput: function (event) { emit(event.target.value); },
				}),
				h('button', {
					type: 'button',
					class: 'bfields-btn bfields-btn--soft bfields-media__upload',
					title: NO_LIBRARY,
					disabled: true,
				}, icon('upload', 16), label),
				removeButton);
		}

		const thumb = held.thumbnail || (isImage ? current : '');
		const name = current ? (held.title || fileName(current) || current) : 'No file selected';

		return h('div', { class: 'bfields-media bfields-media--attachment' + (current ? '' : ' is-empty') },
			h('span', { class: 'bfields-media__chip' },
				current && thumb ? h('img', { src: thumb, alt: '' }) : icon('image', 18)),
			h('span', { class: 'bfields-media__main' },
				h('span', { class: 'bfields-media__name' }, name),
				current && held.width && held.height
					? h('span', { class: 'bfields-media__meta' }, held.width + ' × ' + held.height + 'px')
					: null),
			h('button', {
				type: 'button',
				class: 'bfields-btn bfields-btn--soft bfields-media__upload',
				title: NO_LIBRARY,
				disabled: true,
			}, icon('upload', 16), current ? 'Replace' : label),
			removeButton);
	}

	function code(field, value, set, path) {
		// ui/fields/Code.tsx without wp.codeEditor: the designed textarea.
		return h('div', { class: 'bfields-code' },
			h('textarea', {
				class: 'bfields-code__input',
				rows: 12,
				spellcheck: 'false',
				placeholder: field.props.placeholder || null,
				'aria-label': field.title || null,
				'data-path': path,
				oninput: function (event) { set(event.target.value); },
			}, typeof value === 'string' ? value : ''));
	}

	function display(field) {
		if (field.type === 'heading' || field.type === 'subheading') {
			return h(field.props.level === 4 ? 'h4' : 'h3', { class: 'bfields-section-title' }, field.title);
		}

		if (field.type === 'notice' || field.type === 'submessage') {
			const tone = field.props.style || 'info';
			const glyph = tone === 'success' ? 'check' : (tone === 'info' ? 'info' : 'warning');

			return h('div', {
				class: 'bfields-infobar bfields-infobar--' + tone,
				role: tone === 'danger' ? 'alert' : 'status',
			}, icon(glyph, 18), h('span', { html: field.props.html || '' }));
		}

		return h('div', {
			class: 'bfields-content bfields-content--' + field.type,
			html: field.props.html || '',
		});
	}

	/* ---- spacing (ui/fields/), link (ui/fields/claude/), fieldset, repeater (ui/fields/) ---- */

	function spacing(field, value, set, path, screen) {
		// ui/fields/Spacing.tsx — a number box per side (label at the start,
		// a plain-text `{side}_icon` at the end, else the side's arrow), then
		// the unit select and the link button.
		const current = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
		const units = field.props.units || ['px', 'em', 'rem', '%'];
		const sides = [['top', 'Top', 'arrow-up'], ['right', 'Right', 'arrow-right'], ['bottom', 'Bottom', 'arrow-down'], ['left', 'Left', 'arrow-left']]
			.filter(function (side) { return side[0] !== 'left' || field.props.left !== false; });

		// Same starting state as the component: pressed when the stored sides
		// are already equal and not empty.
		if (screen.linked[path] === undefined) {
			const seen = sides.map(function (side) { return String(current[side[0]] === undefined ? '' : current[side[0]]); });
			screen.linked[path] = seen.every(function (v) { return v === seen[0]; }) && seen[0] !== '';
		}

		const linked = screen.linked[path];

		const setSide = function (key, next) {
			const out = Object.assign({}, current);
			(linked ? sides.map(function (side) { return side[0]; }) : [key]).forEach(function (k) { out[k] = next; });
			set(out);
		};

		const iconText = function (side) {
			const raw = field.props[side + 'Icon'];
			return typeof raw === 'string' && raw.trim() !== '' && !/[<>]/.test(raw) ? raw.trim() : '';
		};

		return h('div', { class: 'bfields-spacing', role: 'group', 'aria-label': field.title || null },
			sides.map(function (side) {
				const own = field.props.labels && field.props.labels[side[0]];
				const suffix = iconText(side[0]);

				return h('span', {
					class: 'bfields-number bfields-spacing__side' + (suffix ? ' bfields-number--unit' : ''),
					title: spacingLabel(field, side[0], side[1]),
				},
					own ? h('span', { class: 'bfields-spacing__prefix', 'aria-hidden': 'true' }, own)
						: (!suffix ? h('span', { class: 'bfields-spacing__prefix', 'aria-hidden': 'true' }, icon(side[2], 14)) : null),
					h('input', {
						type: 'number',
						inputmode: 'decimal',
						step: 'any',
						class: 'bfields-number__input bfields-spacing__input',
						value: current[side[0]] === undefined ? '' : current[side[0]],
						placeholder: field.props.placeholder && typeof field.props.placeholder === 'object' ? (field.props.placeholder[side[0]] || null) : null,
						'aria-label': spacingLabel(field, side[0], side[1]),
						'data-path': path + '.' + side[0],
						oninput: function (event) { setSide(side[0], event.target.value); },
					}),
					suffix ? h('span', { class: 'bfields-number__unit', 'aria-hidden': 'true' }, suffix) : null);
			}),
			field.props.showUnits === false ? null : h('select', {
				class: 'bfields-select bfields-spacing__unit',
				'aria-label': field.title + ' unit',
				onchange: function (event) {
					set(Object.assign({}, current, { unit: event.target.value }));
				},
			}, units.map(function (unit) {
				return h('option', { value: unit, selected: current.unit === unit }, unit);
			})),
			h('button', {
				type: 'button',
				class: 'bfields-spacing__link',
				'aria-pressed': String(linked),
				'aria-label': 'Link sides',
				title: linked ? 'Unlink sides' : 'Link sides',
				onclick: function () {
					screen.linked[path] = !linked;
					screen.render();
				},
			}, icon('chain', 14)));
	}

	function link(field, value, set, path) {
		const current = Object.assign({ url: '', text: '', target: '' },
			value && typeof value === 'object' ? value : {});

		const patch = function (key, next) {
			const out = Object.assign({}, value && typeof value === 'object' ? value : {});
			out[key] = next;
			set(out);
		};

		return h('div', { class: 'bfields-link' },
			h('input', {
				type: 'url', class: 'bfields-input', value: current.url,
				placeholder: field.props.placeholder || 'https://', 'aria-label': 'URL',
				'data-path': path + '.url',
				oninput: function (event) { patch('url', event.target.value); },
			}),
			h('input', {
				type: 'text', class: 'bfields-input', value: current.text,
				placeholder: 'Link text', 'aria-label': 'Link text',
				'data-path': path + '.text',
				oninput: function (event) { patch('text', event.target.value); },
			}),
			h('label', { class: 'bfields-link__target' },
				h('input', {
					type: 'checkbox',
					checked: current.target === '_blank',
					onchange: function (event) { patch('target', event.target.checked ? '_blank' : ''); },
				}),
				'New tab'));
	}

	function fieldset(field, value, set, path, screen) {
		// ui/fields/Fieldset.tsx — the sub-fields as a grid, patched in place;
		// nothing stored yet means every sub-field at its default.
		const children = field.fields || [];
		const current = value && typeof value === 'object' && !Array.isArray(value) ? value : blankRow(children);
		const columns = Math.min(3, Math.max(1, children.filter(function (child) { return !child.display; }).length));

		return h('fieldset', {
			class: 'bfields-fieldset',
			'aria-label': field.title || null,
			style: { '--bfields-fieldset-cols': String(columns) },
		},
			children.map(function (child) {
				return renderRow(child, screen, current, path + '.' + child.id, function (id, next) {
					const out = Object.assign({}, current);
					out[id] = next;
					set(out);
				});
			}));
	}

	/** Repeater.tsx rowTitle(): prefix and number, then the first sub-field's value. */
	function rowTitle(field, row, index) {
		const children = field.fields || [];
		const prefix = String(field.props.titlePrefix || '').trim();
		const numbered = Boolean(field.props.titleNumber);
		const first = children.find(function (child) { return child.id !== '' && !child.display; });
		let raw = first && first.core !== 'toggle' ? row[first.id] : '';
		let name = '';

		if (Array.isArray(raw)) { raw = raw[0]; }
		if (raw && typeof raw === 'object' && typeof raw.url === 'string') { raw = raw.url; }

		let text = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
		const choices = first && first.props.options;

		if (text !== '' && first && first.core === 'media') {
			text = fileName(text);
		} else if (choices && !Array.isArray(choices) && typeof choices[text] === 'string') {
			text = choices[text];
		}

		if (prefix && numbered) {
			name = prefix + ' ' + (index + 1);
		} else if (prefix) {
			name = prefix;
		} else if (numbered) {
			name = (index + 1) + '.';
		}

		if (name === '' && text === '') {
			name = 'Item ' + (index + 1);
		}

		return { name: name, value: text };
	}

	function repeater(field, value, set, path, screen) {
		// ui/fields/Repeater.tsx — rows as cards: handle, title, chevron,
		// actions; `group` rows start collapsed, a new one opens.
		const children = field.fields || [];
		const rows = Array.isArray(value) ? value : [];
		const nested = path.indexOf('.') !== -1;
		const collapsible = field.props.presentation !== 'plain';
		const maxRows = Number(field.props.maxRows || 0) || 0;
		const minRows = Number(field.props.minRows || 0) || 0;
		const canAdd = maxRows === 0 || rows.length < maxRows;
		const canRemove = rows.length > minRows;
		const own = [field.props.buttonTitle, field.props.addTitle].find(function (text) {
			return typeof text === 'string' && text.trim() !== '' && !/[<>]/.test(text);
		});
		const label = own || 'Add New';

		if (!screen.open[path]) {
			screen.open[path] = { rows: {}, tabs: {} };
		}

		const state = screen.open[path];

		// '' once the list is empty, as Repeater.tsx serializeRows().
		const emit = function (next) { set(next.length === 0 ? '' : next); };

		const plain = function (title) {
			return title.name && title.value ? title.name + ' — ' + title.value : title.name || title.value;
		};

		const tabs = children.some(function (child) { return child.props.tab; })
			? children.reduce(function (list, child) {
				const tab = child.props.tab;
				const last = list[list.length - 1];

				if (tab && (!last || tab !== last.name)) {
					list.push({ name: tab, fields: [child] });
				} else if (last) {
					last.fields.push(child);
				} else {
					list.push({ name: 'General', fields: [child] });
				}

				return list;
			}, [])
			: null;

		const addButton = h('button', {
			type: 'button',
			class: 'bfields-btn bfields-btn--soft bfields-repeater__add',
			disabled: !canAdd,
			onclick: function () {
				state.rows[rows.length] = true;
				emit(rows.concat([blankRow(children)]));
			},
		}, icon('plus', 16), label);

		let limit = null;

		if (minRows > 0 && rows.length < minRows) {
			limit = h('p', { class: 'bfields-repeater__error' },
				'Add at least ' + minRows + (minRows === 1 ? ' item.' : ' items.'));
		} else if (maxRows > 0 && rows.length >= maxRows) {
			limit = h('p', { class: 'bfields-repeater__note' },
				'You cannot add more than ' + maxRows + (maxRows === 1 ? ' item.' : ' items.'));
		}

		const iconBtn = function (name, glyph, disabled, action, extra) {
			return h('button', {
				type: 'button',
				class: 'bfields-icon-btn' + (extra ? ' ' + extra : ''),
				'aria-label': name,
				title: name,
				disabled: disabled,
				onclick: action,
			}, icon(glyph, 16));
		};

		const move = function (from, to) {
			const next = rows.slice();
			const opened = state.rows[from];

			next.splice(to, 0, next.splice(from, 1)[0]);
			state.rows[from] = state.rows[to];
			state.rows[to] = opened;
			emit(next);
		};

		const className = ['bfields-repeater', nested ? 'bfields-repeater--nested' : '', collapsible ? '' : 'bfields-repeater--plain']
			.filter(Boolean).join(' ');

		return h('div', { class: className },
			h('div', { class: 'bfields-repeater__sr', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }),
			rows.length === 0
				? h('div', { class: 'bfields-repeater__empty' },
					h('p', { class: 'bfields-repeater__hint' }, 'Nothing here yet. Use “' + label + '” to add the first one.'),
					addButton,
					limit)
				: h('ol', { class: 'bfields-repeater__list', 'aria-label': field.title || null },
					rows.map(function (row, index) {
						const expanded = !collapsible || Boolean(state.rows[index]);
						const title = rowTitle(field, row, index);
						const text = plain(title);
						const tabAt = tabs ? Math.max(0, tabs.findIndex(function (tab) { return tab.name === state.tabs[index]; })) : 0;
						const shown = tabs ? tabs[tabAt].fields : children;
						const heading = [
							title.name ? h('span', { class: 'bfields-repeater-row__name' }, title.name) : null,
							title.value ? h('span', { class: 'bfields-repeater-row__value' }, title.value) : null,
						];

						return h('li', { class: 'bfields-repeater-row' + (expanded ? ' is-open' : '') },
							h('div', { class: 'bfields-repeater-row__head' },
								iconBtn('Reorder ' + text, 'grip', rows.length < 2, null, 'bfields-repeater-row__handle'),
								collapsible
									? h('button', {
										type: 'button',
										class: 'bfields-repeater-row__toggle',
										'aria-expanded': String(expanded),
										onclick: function () {
											state.rows[index] = !expanded;
											screen.render();
										},
									},
										h('span', { class: 'bfields-repeater-row__title' }, heading),
										h('span', { class: 'bfields-repeater-row__chevron' }, icon('chevron-down', 16)))
									: h('span', { class: 'bfields-repeater-row__title bfields-repeater-row__title--plain' }, heading),
								h('div', { class: 'bfields-repeater-row__actions' },
									h('span', { class: 'bfields-repeater-row__order' },
										iconBtn('Move ' + text + ' up', 'arrow-up', index === 0, function () { move(index, index - 1); }),
										iconBtn('Move ' + text + ' down', 'arrow-down', index === rows.length - 1, function () { move(index, index + 1); })),
									iconBtn('Duplicate ' + text, 'copy', !canAdd, function () {
										const next = rows.slice();
										next.splice(index + 1, 0, clone(row));
										state.rows = {};
										state.rows[index + 1] = true;
										emit(next);
									}),
									iconBtn('Remove ' + text, 'trash', !canRemove, function () {
										state.rows = {};
										emit(rows.filter(function (_row, at) { return at !== index; }));
									}, 'bfields-repeater-row__remove'))),
							expanded
								? h('div', { class: 'bfields-repeater-row__body' },
									tabs
										? h('div', { class: 'bfields-repeater-tabs', role: 'tablist', 'aria-label': text },
											tabs.map(function (tab, at) {
												const glyph = field.props.tabIcons && field.props.tabIcons[tab.name];

												return h('button', {
													type: 'button',
													role: 'tab',
													'aria-selected': String(at === tabAt),
													tabindex: at === tabAt ? '0' : '-1',
													class: 'bfields-repeater-tab' + (at === tabAt ? ' is-active' : ''),
													onclick: function () {
														state.tabs[index] = tab.name;
														screen.render();
													},
												}, glyph ? icon(glyph, 16) : null, tab.name);
											}))
										: null,
									h('fieldset', { class: 'bfields-repeater-row__fields', role: tabs ? 'tabpanel' : null },
										shown.map(function (child) {
											return renderRow(child, screen, row, path + '.' + index + '.' + child.id,
												function (id, next) {
													const copyRows = rows.slice();
													copyRows[index] = Object.assign({}, row);
													copyRows[index][id] = next;
													emit(copyRows);
												});
										})))
								: null);
					})),
			rows.length > 0 ? h('div', { class: 'bfields-repeater__foot' }, addButton, limit) : null);
	}

	/* ==================================================================
	   Row chrome — ui/layout/FieldRenderer.tsx
	   ================================================================== */

	function control(field, screen, scope, path, set, card) {
		const value = scope[field.id];
		const write = function (next) { set(field.id, next); };

		switch (field.core) {
			case 'toggle': return toggle(field, value, write);
			case 'choice': return choice(field, value, write);
			case 'text': return text(field, value, write, path);
			case 'number': return number(field, value, write, path);
			case 'color': return colour(field, value, write, path);
			case 'dimension': return dimension(field, value, write, path, screen);
			case 'media': return media(field, value, write, path, card);
			case 'code': return code(field, value, write, path);
			case 'display': return display(field);
			case 'spacing': return spacing(field, value, write, path, screen);
			case 'link': return link(field, value, write, path);
			case 'fieldset': return fieldset(field, value, write, path, screen);
			case 'repeater': return repeater(field, value, write, path, screen);
			default:
				return h('span', { class: 'bfields-infobar bfields-infobar--warning' },
					'“' + field.type + '” cannot be edited in this interface yet.');
		}
	}

	/**
	 * One setting row: dependency gate, icon, title/desc, control.
	 *
	 * @param {object}   field  Normalised schema field.
	 * @param {object}   screen The screen state (values, open rows, render).
	 * @param {object}   scope  Row values when nested, else the screen values.
	 * @param {string}   path   Dotted path, used to restore focus after render.
	 * @param {Function} set    (id, value) writer for this scope.
	 */
	function renderRow(field, screen, scope, path, set) {
		const row = scope === screen.values ? undefined : scope;

		if (!isVisible(field.dependency, screen.values, row)) {
			return null;
		}

		// A card section draws only its TOP-LEVEL fields as cards. Sub-fields
		// inside a repeater row or a fieldset stay rows, exactly as
		// Repeater.tsx and Fieldset.tsx call FieldRenderer without a layout.
		const card = Boolean(screen.cardLayout) && row === undefined;

		const node = control(field, screen, scope, path, set, card);

		// `locked` — every component disables its own controls for a Pro field.
		if (field.pro && node instanceof Element) {
			[node].concat(Array.from(node.querySelectorAll('input, select, textarea, button')))
				.filter(function (el) { return /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName); })
				.forEach(function (el) { el.disabled = true; });
		}

		if (card && !field.display) {
			return h('div', { class: ('bfields-card ' + field.class).trim(), 'data-field': field.id },
				h('div', { class: 'bfields-card__head' },
					h('span', { class: 'bfields-card__head-icon' }, icon(field.icon, 20)),
					h('div', {},
						h('h4', { class: 'bfields-card__title' },
							field.title,
							field.pro ? h('span', { class: 'bfields-badge--pro' }, 'Pro') : null),
						field.subtitle ? h('p', { class: 'bfields-card__desc' }, field.subtitle) : null)),
				h('div', { class: 'bfields-card__control' }, node),
				field.desc ? h('p', { class: 'bfields-hint', html: field.desc }) : null);
		}

		if (field.display) {
			return h('div', { class: ('bfields-row bfields-row--display ' + field.class).trim() }, node);
		}

		// The tile grid renders its own card, head and bulk actions, so it gets
		// no row chrome — a grid squeezed into the control column looks broken.
		if ((field.props.presentation === 'tiles' && field.layout !== 'checklist') || field.props.presentation === 'images') {
			return h('div', { class: ('bfields-row--card ' + field.class).trim() }, node);
		}

		const main = h('div', { class: 'bfields-row__main' },
			h('h4', { class: 'bfields-row__title' },
				field.title,
				field.pro ? h('span', { class: 'bfields-badge--pro' }, 'Pro') : null),
			field.subtitle ? h('p', { class: 'bfields-row__desc' }, field.subtitle) : null,
			field.desc ? h('p', { class: 'bfields-row__desc', html: field.desc }) : null);

		const right = h('div', { class: 'bfields-row__control' },
			field.before ? h('span', { html: field.before }) : null,
			node,
			field.after ? h('span', { html: field.after }) : null);

		if (field.layout === 'danger') {
			return h('div', { class: 'bfields-danger-card', 'data-field': field.id },
				h('span', { class: 'bfields-danger-card__icon' }, icon('trash', 22)),
				main, right);
		}

		const spaced = field.core === 'choice' && field.props.presentation === 'radio';

		// A list or a sub-form cannot live in the row's `flex: none` control
		// column, and FieldRenderer decides that from the core rather than from
		// an authored class. Same rule here.
		const wide = ['repeater', 'fieldset'].indexOf(field.core) !== -1 ||
			(row !== undefined && field.core === 'media') ||
			(field.core === 'choice' && field.props.presentation === 'cards');
		const fill = field.core === 'code' || (field.core === 'text' && field.layout !== 'selector');

		const classes = ['bfields-row',
			spaced ? 'bfields-row--spaced' : '',
			wide ? 'bfields-row--wide' : '',
			fill ? 'bfields-row--fill' : '',
			field.core === 'code' ? 'bfields-row--code' : '',
			!wide && field.core === 'media' ? 'bfields-row--media' : '',
			field.layout === 'selector' ? 'bfields-row--selector' : '',
			field.pro ? 'bfields-row--locked' : '',
			field.class].filter(Boolean).join(' ');

		// Icon tiles are a SECTION-level decision and a top-level one: a
		// repeater row's sub-fields render without them, exactly as
		// Repeater.tsx and Fieldset.tsx call FieldRenderer without `showIcons`.
		const tiled = screen.showIcons && row === undefined;

		return h('div', { class: classes, 'data-field': field.id },
			tiled ? h('span', { class: 'bfields-row__icon' }, icon(field.icon, 18)) : null,
			main, right);
	}

	/* ==================================================================
	   Focus preservation
	   ================================================================== */

	/**
	 * A full re-render on every keystroke would drop the caret, so the focused
	 * control's path and selection are captured and restored around it. The
	 * React build does not need this — it patches the DOM rather than replacing
	 * it — which is exactly the kind of thing a static mock has to solve itself.
	 */
	function keepFocus(container, paint) {
		const active = document.activeElement;
		const path = active && active.getAttribute ? active.getAttribute('data-path') : null;
		const start = path && 'selectionStart' in active ? active.selectionStart : null;
		const end = path && 'selectionEnd' in active ? active.selectionEnd : null;

		paint();

		if (!path) {
			return;
		}

		const restored = container.querySelector('[data-path="' + path + '"]');

		if (!restored) {
			return;
		}

		restored.focus();

		if (start !== null && 'setSelectionRange' in restored) {
			try {
				restored.setSelectionRange(start, end);
			} catch (error) {
				// Number inputs throw on setSelectionRange in some browsers.
			}
		}
	}

	function copy(value, button) {
		const restore = button.innerHTML;

		const done = function () {
			button.innerHTML = '';
			button.appendChild(icon('check', 16));
			window.setTimeout(function () { button.innerHTML = restore; }, 1500);
		};

		// clipboard is undefined on file:// and http:// origins.
		if (navigator.clipboard) {
			navigator.clipboard.writeText(value).then(done, function () {});
		}
	}

	/* ==================================================================
	   Screens
	   ================================================================== */

	function createScreen(schema, container) {
		const screen = {
			schema: schema,
			values: seed(schema),
			active: schema.sections[0].id,
			search: '',
			open: {},
			linked: {},
			dirty: false,
			status: null,
			showIcons: false,
			cardLayout: false,
			render: function () {},
		};

		/** TabsLayout.tsx: the host's `tabs_position`, or the admin's flip of it. */
		const tabsKey = 'bfields-tabs:' + schema.unique;

		screen.tabsPosition = schema.args.tabsPosition === 'left' ? 'left' : 'top';

		if (schema.args.tabsSwitcher) {
			try {
				const saved = window.localStorage.getItem(tabsKey);

				if (saved === 'top' || saved === 'left') {
					screen.tabsPosition = saved;
				}
			} catch (error) {
				// Blocked storage: keep the host's default.
			}
		}

		screen.tabsSwitch = function () {
			if (!schema.args.tabsSwitcher) {
				return null;
			}

			return h('div', { class: 'bfields-tabs-switch', role: 'group', 'aria-label': 'Tab layout' },
				[['top', 'Tabs on top', 'PanelTop'], ['left', 'Tabs in a sidebar', 'PanelLeft']].map(function (option) {
					return h('button', {
						type: 'button',
						'aria-pressed': String(screen.tabsPosition === option[0]),
						'aria-label': option[1],
						title: option[1],
						onclick: function () {
							screen.tabsPosition = option[0];

							try {
								window.localStorage.setItem(tabsKey, option[0]);
							} catch (error) {
								// Blocked storage: the choice just won't stick.
							}

							screen.render();
						},
					}, icon(option[2], 18));
				}));
		};

		screen.set = function (id, value) {
			screen.values[id] = value;
			screen.dirty = true;
			screen.status = null;
			screen.render();
		};

		screen.section = function () {
			return schema.sections.find(function (item) { return item.id === screen.active; }) || schema.sections[0];
		};

		screen.body = function () {
			const section = screen.section();
			const needle = screen.search.trim().toLowerCase();

			screen.showIcons = section.fields.some(function (field) { return field.icon !== ''; });
			screen.cardLayout = section.layout === 'cards';

			const visible = section.fields.filter(function (field) {
				if (needle === '') {
					return true;
				}

				return [field.title, field.subtitle, field.desc, field.id]
					.join(' ').toLowerCase().indexOf(needle) !== -1;
			});

			const rows = visible.filter(function (field) { return field.layout !== 'danger'; });
			const cards = visible.filter(function (field) { return field.layout === 'danger'; });

			return [
				needle !== '' && visible.length === 0
					? h('p', { class: 'bfields-empty' },
						'No settings in this section match “' + screen.search.trim() + '”.')
					: null,
				rows.concat(cards).map(function (field) {
					return renderRow(field, screen, screen.values, field.id, screen.set);
				}),
			];
		};

		/**
		 * AdminShell.tsx: tabs sit on the panel's 32px inset unless they open
		 * with the full-width tile card, which carries its own padding.
		 */
		screen.flush = function () {
			const needle = screen.search.trim().toLowerCase();
			const first = screen.section().fields.filter(function (field) {
				return field.layout !== 'danger' && (needle === '' ||
					[field.title, field.subtitle, field.desc, field.id].join(' ').toLowerCase().indexOf(needle) !== -1);
			})[0];

			return first && ['tiles', 'images'].indexOf(first.props.presentation) !== -1
				? ''
				: ' bfields-settings-body--flush';
		};

		screen.tabs = function () {
			return h('div', { class: 'bfields-tabs' + (schema.args.stickyTabs ? ' bfields-tabs--sticky' : ''), role: 'tablist', 'aria-orientation': screen.tabsPosition === 'left' ? 'vertical' : 'horizontal' },
				schema.sections.map(function (item) {
					const current = item.id === screen.active;

					return h('button', {
						type: 'button',
						role: 'tab',
						'aria-selected': String(current),
						class: 'bfields-tab' + (current ? ' bfields-tab--active' : ''),
						onclick: function () {
							if (schema.args.stickyTabs) {
								revealPanel(this.parentElement);
							}

							screen.active = item.id;
							window.location.hash = 'tab=' + (item.slug || item.id);
							screen.render();
						},
					}, icon(item.icon, 17), item.title);
				}));
		};

		screen.container = container;

		return screen;
	}

	/* ---- the options screen (ui/layout/AdminShell.tsx) ---- */

	function mountSettings(container) {
		const screen = createScreen(window.BFIELDS_STATIC.settings, container);
		const brand = screen.schema.args.brand;

		Object.keys(brand).forEach(function (token) {
			if (token !== 'logo') {
				container.style.setProperty('--bfields-' + token, brand[token]);
			}
		});

		screen.render = function () {
			keepFocus(container, function () {
				container.textContent = '';

				container.appendChild(h('div', { class: 'bfields-admin' },
					h('div', { class: 'bfields-admin__inner' },
						h('div', { class: 'bfields-settings-head' },
							brand.logo
								? h('img', { class: 'bfields-settings-head__logo', src: brand.logo, alt: '' })
								: null,
							h('h1', { class: 'bfields-settings-head__title' }, screen.schema.args.title),
							screen.schema.args.showSearch
								? h('div', { class: 'bfields-search' },
									icon('search', 20),
									h('input', {
										type: 'search',
										value: screen.search,
										placeholder: 'Search settings...',
										'aria-label': 'Search settings',
										'data-path': '__search',
										oninput: function (event) {
											screen.search = event.target.value;
											screen.render();
										},
									}))
								: null,
							screen.tabsSwitch()),
						h('div', { class: 'bfields-panel' + (screen.tabsPosition === 'left' ? ' bfields-panel--sidebar' : '') },
							screen.tabs(),
							h('div', { class: 'bfields-settings-body' + screen.flush() },
								screen.body(),
								h('div', { class: 'bfields-actions' },
									screen.status
										? h('span', {
											class: 'bfields-actions__status bfields-actions__status--' + screen.status.kind,
											role: 'status',
										}, screen.status.text)
										: screen.dirty
											? h('span', {
												class: 'bfields-actions__status bfields-actions__status--dirty',
												role: 'status',
											}, 'Unsaved changes')
											: null,
									h('button', {
										type: 'button',
										class: 'bfields-btn bfields-btn--save',
										onclick: function () {
											// Nothing to save to: this page has no
											// database and says so rather than
											// pretending it wrote something.
											screen.dirty = false;
											screen.status = {
												kind: 'success',
												text: 'Static preview — nothing was saved.',
											};
											screen.render();
										},
									}, icon('save', 17), 'Save Changes'),
									screen.schema.args.showResetSection
										? h('button', {
											type: 'button',
											class: 'bfields-btn bfields-btn--reset',
											onclick: function () {
												const fresh = seed(screen.schema);

												screen.section().fields.forEach(function (field) {
													if (field.id && !field.display && !field.pro) {
														screen.values[field.id] = fresh[field.id];
													}
												});

												screen.dirty = false;
												screen.status = { kind: 'success', text: 'Section restored to its defaults.' };
												screen.render();
											},
										}, icon('reset', 17), 'Reset Section')
										: null,
									screen.schema.args.showResetAll
										? h('button', {
											type: 'button',
											class: 'bfields-btn bfields-btn--danger',
											onclick: function () {
												screen.values = seed(screen.schema);
												screen.dirty = false;
												screen.status = { kind: 'success', text: 'Every setting restored to its default.' };
												screen.render();
											},
										}, icon('trash', 17), 'Reset All')
										: null))))));
			});
		};

		const fromHash = /(?:^|&)tab=([^&]+)/.exec(window.location.hash.replace(/^#/, ''));

		if (fromHash) {
			const wanted = decodeURIComponent(fromHash[1]);
			const match = screen.schema.sections.find(function (item) {
				return item.id === wanted || item.slug === wanted;
			});

			if (match) {
				screen.active = match.id;
			}
		}

		screen.render();

		return screen;
	}

	/**
	 * A tab clicked from a stuck strip opens at its top (ui/layout/revealPanel.ts).
	 * Measured before the re-render, which replaces the strip's element.
	 */
	function revealPanel(strip) {
		const panel = strip && strip.parentElement;

		if (!panel) {
			return;
		}

		const top = parseFloat(window.getComputedStyle(strip).top) || 0;
		const box = window.getComputedStyle(panel);
		const inset = (parseFloat(box.borderTopWidth) || 0) + (parseFloat(box.paddingTop) || 0);
		const target = window.scrollY + panel.getBoundingClientRect().top + inset - top;

		if (window.scrollY > target) {
			const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			window.scrollTo({ top: target, behavior: still ? 'auto' : 'smooth' });
		}
	}

	/* ---- the editor screen (demo/ui/layout/EditorShell.tsx) ---- */

	/**
	 * What PHP hands EditorShell in the boot payload (demo Assets.php). A
	 * static page has no post, so these are the values post-new.php would
	 * send, with a made-up id in the shortcode.
	 */
	const EDITOR = {
		heading: 'Add New',
		title: '',
		shortcode: '[bfields_demo_viewer id="12"]',
		published: false,
	};

	/** Structural equality over the stored shapes — the store's isDirty(). */
	function identical(a, b) {
		if (a === b) {
			return true;
		}

		if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
			return false;
		}

		if (Array.isArray(a) !== Array.isArray(b)) {
			return false;
		}

		const keys = Object.keys(a);

		return keys.length === Object.keys(b).length && keys.every(function (key) {
			return Object.prototype.hasOwnProperty.call(b, key) && identical(a[key], b[key]);
		});
	}

	/** demo/ui/layout/model.ts — the model a viewer points at, from values. */
	function readModel(values) {
		const text = function (value) { return typeof value === 'string' ? value : ''; };

		const url = function (value) {
			if (typeof value === 'string') { return value; }
			return value && typeof value === 'object' ? String(value.url || '') : '';
		};

		const cycling = text(values.bp_3d_model_type) === 'mcycle';
		const rows = Array.isArray(values.bp_3d_models) ? values.bp_3d_models : [];

		const models = rows.map(function (row, index) {
			return {
				source: url(row.model_link),
				poster: url(row.poster_src),
				label: text(row.model_title) || String(index + 1),
			};
		});

		if (cycling) {
			return {
				cycling: true,
				source: models[0] ? models[0].source : '',
				poster: models[0] ? models[0].poster : '',
				models: models,
			};
		}

		return {
			cycling: false,
			source: text(values.bp_3d_src_type) === 'link' ? text(values.bp_3d_src_link) : url(values.bp_3d_src),
			poster: url(values.bp_3d_poster),
			models: [],
		};
	}

	function mountEditor(container) {
		const schema = window.BFIELDS_STATIC.viewer;
		const screen = createScreen(schema, container);
		const baseline = clone(screen.values);

		// Local UI state the React components keep in useState.
		const ui = {
			title: EDITOR.title,
			copied: false,
			zoom: 1,
			device: 'desktop',
			grid: false,
			current: 0,
		};

		// FieldRenderer is called with `showIcons` on every tab of the editor.
		screen.showIcons = true;

		screen.set = function (id, value) {
			screen.values[id] = value;
			screen.render();
		};

		const isStage = function (section) {
			return section.fields.some(function (field) { return field.type === 'callback'; });
		};

		const resettable = function (fields) {
			return fields.filter(function (field) {
				return field.id !== '' && !field.display && !field.pro &&
					Object.prototype.hasOwnProperty.call(field, 'default');
			});
		};

		const dirty = function () {
			return Object.keys(screen.values).some(function (id) {
				return !identical(screen.values[id], baseline[id]);
			});
		};

		/**
		 * Every button that would submit #post. There is no post to submit,
		 * so it says so in a WordPress notice above the editor — where the
		 * real screen's "Viewer published." notice lands after the redirect.
		 */
		const pretendSubmit = function (what) {
			const wrap = container.parentElement;
			let notice = wrap.querySelector('.static-submit-notice');

			if (!notice) {
				notice = h('div', { class: 'notice notice-info static-submit-notice', role: 'status' });
				wrap.insertBefore(notice, container);
			}

			notice.innerHTML = '';
			notice.appendChild(h('p', {},
				h('strong', {}, 'Static preview — nothing was ' + what + '.'),
				' There is no WordPress behind this page, so ' +
				'the post form has nowhere to go. Inside wp-admin this button submits #post.'));

			// The real screen reloads with the saved values as its baseline.
			if (what === 'saved') {
				Object.keys(screen.values).forEach(function (id) { baseline[id] = clone(screen.values[id]); });
				screen.render();
			}
		};

		const tabs = function (active) {
			return h('div', { class: 'bfields-tabs bfields-tabs--fixed' + (schema.args.stickyTabs ? ' bfields-tabs--sticky' : ''), role: 'tablist', 'aria-orientation': screen.tabsPosition === 'left' ? 'vertical' : 'horizontal' },
				schema.sections.map(function (item) {
					const current = item.id === active.id;

					return h('button', {
						type: 'button',
						role: 'tab',
						'aria-selected': String(current),
						class: 'bfields-tab' + (current ? ' bfields-tab--active' : ''),
						onclick: function () {
							if (schema.args.stickyTabs) {
								revealPanel(this.parentElement);
							}

							screen.active = item.id;
							screen.render();
						},
					}, icon(item.icon, 17), item.title);
				}));
		};

		const actions = function (section) {
			return [
				h('button', {
					type: 'button',
					class: 'bfields-btn bfields-btn--ghost',
					onclick: function () {
						// eslint-disable-next-line no-alert
						if (!window.confirm('Reset every setting on this tab to its default?')) {
							return;
						}

						resettable(section.fields).forEach(function (field) {
							screen.values[field.id] = clone(field.default);
						});

						screen.render();
					},
				}, 'Reset to Default'),

				// Only once there is something to save, as the Figma frames draw it.
				dirty()
					? h('button', {
						type: 'submit',
						name: 'save',
						value: 'save',
						class: 'bfields-btn bfields-btn--save',
						onclick: function () { pretendSubmit('saved'); },
					}, 'Save Change')
					: null,
			];
		};

		const publish = function () {
			const label = EDITOR.published ? 'Update' : 'Publish';

			return h('div', { class: 'bfields-publish' },
				h('button', {
					type: 'submit',
					name: EDITOR.published ? 'save' : 'publish',
					value: label,
					class: 'bfields-btn bfields-btn--primary',
					onclick: function () { pretendSubmit('published'); },
				}, icon('send', 17), label),
				EDITOR.published
					? null
					: h('button', {
						type: 'submit',
						name: 'save',
						value: 'Save Draft',
						class: 'bfields-btn bfields-btn--ghost',
						onclick: function () { pretendSubmit('saved'); },
					}, 'Save Draft'));
		};

		const body = function (section) {
			if (isStage(section)) {
				const styleSection = schema.sections.find(function (item) { return /style/i.test(item.title); });

				return stageCard(screen.values, ui, screen, actions(section), function () {
					if (styleSection) {
						screen.active = styleSection.id;
						screen.render();
					}
				});
			}

			screen.cardLayout = section.layout === 'cards';

			const rows = section.fields.map(function (field) {
				return renderRow(field, screen, screen.values, field.id, screen.set);
			});

			return [
				screen.cardLayout
					? rows
					: h('div', { class: 'bfields-card bfields-card--rows' },
						h('h3', { class: 'bfields-section-title' }, schema.args.title || section.title),
						rows),
				h('div', { class: 'bfields-editor__actions' }, actions(section)),
			];
		};

		screen.render = function () {
			keepFocus(container, function () {
				const section = screen.section();
				const stage = isStage(section);
				const preview = livePreview(screen.values, ui, screen);
				const heading = h('h3', { class: 'bfields-side__heading' }, 'Active Insights & Promotion');

				container.textContent = '';

				container.appendChild(h('div', {
					class: 'bfields-editor-page',
					// Enter in a text field would submit #post through its first
					// submit button, Publish. Same guard as EditorShell.
					onkeydown: function (event) {
						if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
							event.preventDefault();
						}
					},
				},
				schema.args.tabsSwitcher
					? h('div', { class: 'bfields-title-row' },
						h('h1', { class: 'bfields-title' }, EDITOR.heading),
						screen.tabsSwitch())
					: h('h1', { class: 'bfields-title' }, EDITOR.heading),
				h('input', {
					class: 'bfields-title-input',
					type: 'text',
					value: ui.title,
					placeholder: 'Add title',
					'aria-label': 'Add title',
					spellcheck: 'true',
					autocomplete: 'off',
					'data-path': '__title',
					oninput: function (event) { ui.title = event.target.value; },
				}),
				h('div', { class: 'bfields-shortcode' },
					h('span', { class: 'bfields-shortcode__hint' },
						'Copy and paste this shortcode into your posts, pages and widget'),
					h('button', {
						type: 'button',
						class: 'bfields-shortcode__chip',
						'aria-label': 'Copy shortcode',
						title: ui.copied ? 'Copied' : 'Copy',
						onclick: function () {
							// Undefined on file:// in some browsers; fail quietly.
							if (navigator.clipboard) {
								navigator.clipboard.writeText(EDITOR.shortcode).then(function () {
									ui.copied = true;
									screen.render();
									window.setTimeout(function () { ui.copied = false; screen.render(); }, 1500);
								}, function () {});
							}
						},
					}, EDITOR.shortcode, ' ', icon(ui.copied ? 'check' : 'copy', 16))),
				h('div', { class: 'bfields-panel' + (screen.tabsPosition === 'left' ? ' bfields-panel--sidebar' : ''), style: { 'margin-top': '21px' } },
					tabs(section),
					h('div', { class: 'bfields-editor' + (schema.args.stickyTabs ? ' bfields-editor--sticky' : '') },
						h('div', {}, body(section)),
						h('aside', { class: 'bfields-side' },
							stage ? [publish(), preview, heading] : [preview, heading, publish()])))));
			});
		};

		screen.render();

		return screen;
	}

	/* ---- the sidebar card (demo/ui/layout/LivePreview.tsx) ---- */

	function livePreview(values, ui, screen) {
		const model = readModel(values);
		const clamp = function (next) { return Math.min(3, Math.max(1, next)); };

		const zoomTo = function (next) {
			ui.zoom = next;
			screen.render();
		};

		const button = function (label, glyph, action, disabled) {
			return h('button', {
				type: 'button',
				class: 'bfields-icon-btn',
				'aria-label': label,
				disabled: disabled,
				onclick: action,
			}, icon(glyph, 20));
		};

		const stage = h('div', { class: 'bfields-preview__stage' },
			model.poster !== ''
				? h('img', {
					src: model.poster,
					alt: 'Poster of the 3D model',
					style: { transform: 'scale(' + ui.zoom + ')' },
				})
				: icon('box', 48, 1.25));

		return h('div', { class: 'bfields-preview' },
			h('div', { class: 'bfields-preview__head' },
				h('h3', { class: 'bfields-preview__title' }, icon('eye', 20), ' ', 'Live Preview'),
				button('Open the model file in a new tab', 'external-link', function () {
					window.open(model.source, '_blank', 'noopener');
				}, model.source === '')),
			stage,
			h('div', { class: 'bfields-preview__controls' },
				h('div', {},
					button('Reset view', 'refresh', function () { zoomTo(1); }),
					button('Zoom in', 'zoom-in', function () { zoomTo(clamp(ui.zoom + 0.25)); }),
					button('Zoom out', 'zoom-out', function () { zoomTo(clamp(ui.zoom - 0.25)); })),
				button('Fullscreen', 'maximize-2', function () {
					if (stage.requestFullscreen) {
						stage.requestFullscreen();
					}
				})));
	}

	/* ---- the Preview tab (demo/ui/layout/StageCard.tsx) ---- */

	const DEVICES = [
		{ id: 'desktop', label: 'Desktop', glyph: 'monitor', width: '100%' },
		{ id: 'tablet', label: 'Tablet', glyph: 'tablet', width: '62%' },
		{ id: 'mobile', label: 'Mobile', glyph: 'phone', width: '36%' },
	];

	function stageCard(values, ui, screen, actions, onStyle) {
		const model = readModel(values);
		const rotating = truthy(values.bp_3d_auto_rotate);
		const showing = model.cycling
			? (model.models[ui.current] ? model.models[ui.current].poster : '')
			: model.poster;
		const ready = model.source !== '';
		const width = (DEVICES.find(function (item) { return item.id === ui.device; }) || DEVICES[0]).width;

		const setUi = function (key, next) {
			ui[key] = next;
			screen.render();
		};

		const step = function (by) {
			const count = model.models.length;

			if (count > 0) {
				setUi('current', (ui.current + by + count) % count);
			}
		};

		const style = { 'max-width': width };

		if (ui.grid) {
			style['background-image'] =
				'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)';
			style['background-size'] = '24px 24px';
		}

		return h('div', { class: 'bfields-stagecard' },
			h('div', { class: 'bfields-stagecard__head' },
				h('span', { class: 'bfields-stagecard__left' },
					h('span', { class: 'bfields-dot' }),
					'Live Preview',
					ready ? h('span', { class: 'bfields-badge-ready' }, 'Ready') : null),
				h('div', { class: 'bfields-devices' },
					DEVICES.map(function (device) {
						return h('button', {
							type: 'button',
							class: 'bfields-device',
							'aria-pressed': String(ui.device === device.id),
							onclick: function () { setUi('device', device.id); },
						}, icon(device.glyph, 10), ' ', device.label);
					}))),
			h('div', { class: 'bfields-stagecard__body' },
				h('div', { class: 'bfields-stagecard__stage', style: style },
					showing !== ''
						? h('img', { src: showing, alt: 'Poster of the 3D model' })
						: icon('box', 64, 1.25),
					h('button', {
						type: 'button',
						class: 'bfields-stage-corner',
						'aria-label': 'Toggle grid',
						'aria-pressed': String(ui.grid),
						onclick: function () { setUi('grid', !ui.grid); },
					}, icon('grid', 12)),
					h('div', { class: 'bfields-stage-tools' },
						h('button', { type: 'button', 'aria-label': 'Style', onclick: onStyle }, icon('diamond', 12)),
						h('button', {
							type: 'button',
							'aria-label': 'Auto rotate',
							'aria-pressed': String(rotating),
							// IS the Auto Rotate setting — same value, same state.
							onclick: function () { screen.set('bp_3d_auto_rotate', rotating ? '0' : '1'); },
						}, icon('refresh', 12)),
						h('button', {
							type: 'button',
							'aria-label': 'Grid',
							'aria-pressed': String(ui.grid),
							onclick: function () { setUi('grid', !ui.grid); },
						}, icon('grid', 12))),
					model.cycling && model.models.length > 0
						? h('div', { class: 'bfields-variants' },
							h('button', {
								type: 'button',
								class: 'bfields-variants__nav',
								'aria-label': 'Previous model',
								onclick: function () { step(-1); },
							}, '‹'),
							h('span', { class: 'bfields-variants__deg' }, '360°'),
							model.models.map(function (item, index) {
								return h('button', {
									type: 'button',
									class: 'bfields-variant',
									'aria-pressed': String(index === ui.current),
									'aria-label': item.label,
									onclick: function () { setUi('current', index); },
								}, item.poster ? h('img', { src: item.poster, alt: '' }) : String(index + 1));
							}),
							h('button', {
								type: 'button',
								class: 'bfields-variants__nav',
								'aria-label': 'Next model',
								onclick: function () { step(1); },
							}, '›'))
						: null),
				h('p', { class: 'bfields-stagecard__note' },
					ready
						? 'Your 3D model is ready to preview. Make sure all settings are configured correctly for the best experience.'
						: 'Add a 3D model on the Model tab to preview it here.')),
			h('div', { class: 'bfields-stagecard__actions' }, actions));
	}

	/* ==================================================================
	   Boot
	   ================================================================== */

	function boot() {
		const settings = document.getElementById('bfields-static-settings');
		const viewer = document.getElementById('bfields-static-viewer');

		if (settings) {
			mountSettings(settings);
		}

		if (viewer) {
			mountEditor(viewer);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
}());
