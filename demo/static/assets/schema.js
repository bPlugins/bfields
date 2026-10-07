/*
 * bfields demo — the static preview's schema. GENERATED, do not edit.
 *
 * Dumped from a live install by demo/static/dump-schema.php, which is what
 * keeps this preview honest: it is the same JSON document PHP sends to the
 * React body, field for field, default for default.
 *
 *   wp eval-file demo/static/dump-schema.php
 */

window.BFIELDS_STATIC = {
    "settings": {
        "schema": 1,
        "unique": "_bfields_demo_settings_",
        "kind": "options",
        "args": {
            "title": "3D Viewer Settings",
            "menuTitle": "Settings",
            "menuSlug": "bfields-demo-settings",
            "saveDefaults": true,
            "showResetAll": true,
            "showResetSection": true,
            "showSearch": true,
            "stickyTabs": true,
            "tabsPosition": "left",
            "tabsSwitcher": true,
            "resizable": true,
            "showFormWarning": true,
            "showRestore": false,
            "dataType": "serialize",
            "database": "",
            "context": "normal",
            "brand": {
                "primary": "#1b5cf0",
                "save": "#3b52f6"
            }
        },
        "sections": [
            {
                "id": "general-settings",
                "slug": "general-settings",
                "title": "General Settings",
                "icon": "fas fa-cog",
                "layout": "rows",
                "fields": [
                    {
                        "id": "allowed_mime_types",
                        "type": "checkbox",
                        "core": "choice",
                        "title": "Allowed Mime Types",
                        "subtitle": "",
                        "desc": "Select which 3D model file types can be uploaded to the media library. By default, all extended mime types are disabled.",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "options": {
                                "glb": "GLB (.glb)",
                                "gltf": "GLTF (.gltf)",
                                "obj": "OBJ (.obj)",
                                "3ds": "3DS (.3ds)",
                                "step": "STEP (.step)",
                                "stl": "STL (.stl)",
                                "fbx": "FBX (.fbx)",
                                "3dml": "3DML (.3dml)",
                                "dae": "DAE (.dae)",
                                "wrl": "WRL (.wrl)",
                                "3mf": "3MF (.3mf)",
                                "mtl": "MTL (.mtl)",
                                "hdr": "HDR (.hdr)",
                                "usdz": "USDZ (.usdz)"
                            },
                            "presentation": "tiles"
                        },
                        "default": []
                    },
                    {
                        "id": "",
                        "type": "notice",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "style": "info",
                            "html": "Extended mime types are disabled by default because WordPress refuses unknown uploads for a reason. Enable only the formats your site actually serves."
                        }
                    },
                    {
                        "id": "bp3d_loader_type",
                        "type": "button_set",
                        "core": "choice",
                        "title": "Loading Spinner",
                        "subtitle": "Shown while a 3D model loads",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "loader",
                        "props": {
                            "options": {
                                "default": "Default",
                                "image": "Custom image",
                                "none": "None"
                            },
                            "presentation": "segmented"
                        },
                        "default": "default"
                    },
                    {
                        "id": "bp3d_loader_image",
                        "type": "media",
                        "core": "media",
                        "title": "Spinner Image",
                        "subtitle": "",
                        "desc": "GIF, animated WebP, SVG or PNG. The default spinner is used while this is empty.",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "image",
                        "props": {
                            "library": "image",
                            "buttonTitle": "Upload Image",
                            "presentation": "attachment"
                        },
                        "dependency": [
                            {
                                "controller": "bp3d_loader_type",
                                "condition": "==",
                                "value": "image",
                                "scope": "global"
                            }
                        ],
                        "default": {
                            "url": "",
                            "id": "",
                            "width": "",
                            "height": "",
                            "thumbnail": "",
                            "alt": "",
                            "title": "",
                            "description": ""
                        }
                    },
                    {
                        "id": "bp3d_loader_size",
                        "type": "number",
                        "core": "number",
                        "title": "Spinner Size",
                        "subtitle": "",
                        "desc": "Width of the spinner image, 24–300 px. Height follows the image.",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "unit": "px",
                            "min": 24,
                            "max": 300,
                            "presentation": "input"
                        },
                        "dependency": [
                            {
                                "controller": "bp3d_loader_type",
                                "condition": "!=",
                                "value": "none",
                                "scope": "global"
                            }
                        ],
                        "default": "100"
                    },
                    {
                        "id": "bp3d_loader_background",
                        "type": "color",
                        "core": "color",
                        "title": "Spinner Background",
                        "subtitle": "",
                        "desc": "Background of the spinner card. Use transparent for none.",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "palette",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp3d_loader_type",
                                "condition": "!=",
                                "value": "none",
                                "scope": "global"
                            }
                        ],
                        "default": "#ffffff"
                    },
                    {
                        "id": "bp3d_control_placement",
                        "type": "radio",
                        "core": "choice",
                        "title": "Control Placement",
                        "subtitle": "Where the Zoom, Fullscreen, Camera, Reset, Dimensions and AR icons sit on the viewer",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "options": {
                                "corners": "Classic corners — four fixed positions",
                                "zones": "Drag-and-drop zones — eight positions, draggable"
                            },
                            "presentation": "radio"
                        },
                        "default": "corners"
                    },
                    {
                        "id": "bp3d_control_labels",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Control Labels",
                        "subtitle": "Show a text label beside each control icon",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "eye",
                        "props": [],
                        "default": ""
                    },
                    {
                        "id": "bp3d_control_size",
                        "type": "slider",
                        "core": "number",
                        "title": "Control Size",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "unit": "px",
                            "min": 16,
                            "max": 64,
                            "step": 1,
                            "presentation": "slider"
                        },
                        "default": "32"
                    },
                    {
                        "id": "delete_data_on_uninstall",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Delete data on uninstall",
                        "subtitle": "Remove every viewer, setting and analytics row when the plugin is deleted. This cannot be undone.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "danger",
                        "icon": "",
                        "props": {
                            "textOn": "Yes",
                            "textOff": "No"
                        },
                        "default": ""
                    }
                ]
            },
            {
                "id": "analytics",
                "slug": "analytics",
                "title": "Analytics",
                "icon": "fas fa-chart-bar",
                "layout": "rows",
                "fields": [
                    {
                        "id": "analytics_enabled",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Track viewer usage",
                        "subtitle": "Counts views and interactions per viewer. No personal data is stored.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "chart",
                        "props": [],
                        "default": "1"
                    },
                    {
                        "id": "analytics_retention",
                        "type": "spinner",
                        "core": "number",
                        "title": "Keep daily rows for",
                        "subtitle": "Older rows are rolled up into monthly totals.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "unit": "days",
                            "min": 30,
                            "max": 730,
                            "step": 30,
                            "presentation": "stepper"
                        },
                        "dependency": [
                            {
                                "controller": "analytics_enabled",
                                "condition": "==",
                                "value": "1",
                                "scope": "local"
                            }
                        ],
                        "default": "180"
                    },
                    {
                        "id": "analytics_sample_rate",
                        "type": "slider",
                        "core": "number",
                        "title": "Sample rate",
                        "subtitle": "Record this share of sessions. Lower it on very high-traffic sites.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "chart",
                        "props": {
                            "unit": "%",
                            "min": 1,
                            "max": 100,
                            "step": 1,
                            "presentation": "slider"
                        },
                        "dependency": [
                            {
                                "controller": "analytics_enabled",
                                "condition": "==",
                                "value": "1",
                                "scope": "local"
                            }
                        ],
                        "default": "100"
                    },
                    {
                        "id": "analytics_export",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "CSV export",
                        "subtitle": "Available on the Pro licence.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": true,
                        "display": false,
                        "layout": "",
                        "icon": "save",
                        "props": [],
                        "default": ""
                    }
                ]
            },
            {
                "id": "preset",
                "slug": "preset",
                "title": "Preset",
                "icon": "fa fa-cubes",
                "layout": "rows",
                "fields": [
                    {
                        "id": "",
                        "type": "heading",
                        "core": "display",
                        "title": "Defaults for every new viewer",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "level": 3
                        }
                    },
                    {
                        "id": "bp3d_preset_size",
                        "type": "dimensions",
                        "core": "dimension",
                        "title": "Viewer Size",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "maximize",
                        "props": {
                            "units": [
                                "px",
                                "%",
                                "vw",
                                "vh"
                            ]
                        },
                        "default": {
                            "width": "100",
                            "height": "500",
                            "unit": "px"
                        }
                    },
                    {
                        "id": "bp3d_preset_background",
                        "type": "color",
                        "core": "color",
                        "title": "Background Color",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "palette",
                        "props": [],
                        "default": "#f5f5f5"
                    },
                    {
                        "id": "bp3d_preset_autoplay",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Autoplay",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": [],
                        "default": "1"
                    },
                    {
                        "id": "bp3d_preset_shadow",
                        "type": "slider",
                        "core": "number",
                        "title": "Shadow Intensity",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "min": 0,
                            "max": 10,
                            "step": 0.1,
                            "presentation": "slider"
                        },
                        "default": "1"
                    },
                    {
                        "id": "bp3d_preset_loading",
                        "type": "radio",
                        "core": "choice",
                        "title": "Loading Type",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "loader",
                        "props": {
                            "options": {
                                "auto": "Auto — the browser decides",
                                "lazy": "Lazy — load when scrolled into view",
                                "eager": "Eager — load immediately"
                            },
                            "presentation": "radio"
                        },
                        "default": "lazy"
                    },
                    {
                        "id": "bp3d_preset_zoom",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Enable Zoom",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "zoom-in",
                        "props": [],
                        "default": "1"
                    },
                    {
                        "id": "bp3d_preset_progressbar",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Progress Bar",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "loader",
                        "props": [],
                        "default": "1"
                    },
                    {
                        "id": "bp3d_preset_rotate",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Auto Rotate",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": [],
                        "default": ""
                    },
                    {
                        "id": "bp3d_preset_rotate_speed",
                        "type": "spinner",
                        "core": "number",
                        "title": "Auto Rotate Speed",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "unit": "deg/s",
                            "min": 1,
                            "max": 120,
                            "step": 1,
                            "presentation": "stepper"
                        },
                        "dependency": [
                            {
                                "controller": "bp3d_preset_rotate",
                                "condition": "==",
                                "value": "1",
                                "scope": "local"
                            }
                        ],
                        "default": "20"
                    },
                    {
                        "id": "bp3d_preset_rotate_delay",
                        "type": "number",
                        "core": "number",
                        "title": "Auto Rotation Delay",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "unit": "ms",
                            "presentation": "input"
                        },
                        "dependency": [
                            {
                                "controller": "bp3d_preset_rotate",
                                "condition": "==",
                                "value": "1",
                                "scope": "local"
                            }
                        ],
                        "default": "200"
                    },
                    {
                        "id": "bp3d_preset_fullscreen",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Fullscreen",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "maximize",
                        "props": [],
                        "default": "1"
                    }
                ]
            },
            {
                "id": "woocommerce-settings",
                "slug": "woocommerce-settings",
                "title": "WooCommerce Settings",
                "icon": "fas fa-shopping-cart",
                "layout": "rows",
                "fields": [
                    {
                        "id": "3d_woo_switcher",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "WooCommerce",
                        "subtitle": "Show 3D models on product pages",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "cart",
                        "props": [],
                        "default": ""
                    },
                    {
                        "id": "",
                        "type": "notice",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "style": "warning",
                            "html": "If your theme overrides the product gallery, set the selectors on the next tab before enabling this."
                        },
                        "dependency": [
                            {
                                "controller": "3d_woo_switcher",
                                "condition": "==",
                                "value": "1",
                                "scope": "local"
                            }
                        ]
                    },
                    {
                        "id": "3d_woo_position",
                        "type": "radio",
                        "core": "choice",
                        "title": "Viewer Position",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "options": {
                                "replace": "Replace the product gallery",
                                "before": "Above the product gallery",
                                "after": "Below the product gallery",
                                "tab": "In its own product tab"
                            },
                            "presentation": "radio"
                        },
                        "dependency": [
                            {
                                "controller": "3d_woo_switcher",
                                "condition": "==",
                                "value": "1",
                                "scope": "local"
                            }
                        ],
                        "default": "replace"
                    },
                    {
                        "id": "3d_woo_mobile",
                        "type": "button_set",
                        "core": "choice",
                        "title": "On Mobile Devices",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "eye",
                        "props": {
                            "options": {
                                "viewer": "3D viewer",
                                "image": "Poster image",
                                "tap": "Tap to load"
                            },
                            "presentation": "segmented"
                        },
                        "dependency": [
                            {
                                "controller": "3d_woo_switcher",
                                "condition": "==",
                                "value": "1",
                                "scope": "local"
                            }
                        ],
                        "default": "tap"
                    },
                    {
                        "id": "3d_woo_tap_text",
                        "type": "text",
                        "core": "text",
                        "title": "Tap Button Text",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "pencil",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "3d_woo_switcher",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            },
                            {
                                "controller": "3d_woo_mobile",
                                "condition": "==",
                                "value": "tap",
                                "scope": "global"
                            }
                        ],
                        "default": "Tap to view in 3D"
                    },
                    {
                        "id": "3d_woo_breakpoint",
                        "type": "number",
                        "core": "number",
                        "title": "Mobile Breakpoint",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "maximize",
                        "props": {
                            "unit": "px",
                            "presentation": "input"
                        },
                        "dependency": [
                            {
                                "controller": "3d_woo_switcher",
                                "condition": "==",
                                "value": "1",
                                "scope": "local"
                            }
                        ],
                        "default": "768"
                    },
                    {
                        "id": "3d_woo_reduce_motion",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Reduce Motion on Mobile",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "3d_woo_switcher",
                                "condition": "==",
                                "value": "1",
                                "scope": "local"
                            }
                        ],
                        "default": "1"
                    }
                ]
            },
            {
                "id": "shortcode-generator",
                "slug": "shortcode-generator",
                "title": "Shortcode Generator",
                "icon": "fas fa-code",
                "layout": "rows",
                "fields": [
                    {
                        "id": "gutenberg_enabled",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Enable Gutenberg",
                        "subtitle": "Register the 3D Viewer block in the block editor",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "code",
                        "props": [],
                        "default": "1"
                    },
                    {
                        "id": "shortcode_docs",
                        "type": "link",
                        "core": "link",
                        "title": "Documentation link",
                        "subtitle": "Shown under the generator",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "link",
                        "props": [],
                        "default": {
                            "url": "https://bplugins.com/docs/3d-viewer/",
                            "text": "Shortcode reference",
                            "target": "_blank"
                        }
                    },
                    {
                        "id": "shortcode_defaults",
                        "type": "fieldset",
                        "core": "fieldset",
                        "title": "Generated shortcode defaults",
                        "subtitle": "Pre-filled whenever the generator writes a shortcode",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "layers",
                        "props": [],
                        "fields": [
                            {
                                "id": "width",
                                "type": "text",
                                "core": "text",
                                "title": "Width",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": [],
                                "default": "100%"
                            },
                            {
                                "id": "height",
                                "type": "text",
                                "core": "text",
                                "title": "Height",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": [],
                                "default": "500px"
                            },
                            {
                                "id": "class",
                                "type": "text",
                                "core": "text",
                                "title": "Extra class",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": [],
                                "default": ""
                            }
                        ],
                        "default": {
                            "width": "100%",
                            "height": "500px",
                            "class": ""
                        }
                    }
                ]
            },
            {
                "id": "woocommerce-selectors",
                "slug": "woocommerce-selectors",
                "title": "WooCommerce Selectors",
                "icon": "fas fa-eye",
                "layout": "rows",
                "fields": [
                    {
                        "id": "",
                        "type": "notice",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "style": "info",
                            "html": "Only change these if your theme replaces the default WooCommerce gallery markup."
                        }
                    },
                    {
                        "id": "woo_gallery_selector",
                        "type": "text",
                        "core": "text",
                        "title": "Gallery Selector",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "code",
                        "props": {
                            "placeholder": ".woocommerce-product-gallery"
                        },
                        "default": ".woocommerce-product-gallery"
                    },
                    {
                        "id": "woo_gallery_item_selector",
                        "type": "text",
                        "core": "text",
                        "title": "Gallery Item Selector",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "code",
                        "props": {
                            "placeholder": ".woocommerce-product-gallery__image"
                        },
                        "default": ".woocommerce-product-gallery__image"
                    },
                    {
                        "id": "woo_gallery_item_active_selector",
                        "type": "text",
                        "core": "text",
                        "title": "Gallery Item Active Selector",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "code",
                        "props": {
                            "placeholder": ".flex-active-slide"
                        },
                        "default": ".flex-active-slide"
                    },
                    {
                        "id": "woo_gallery_thumb_selector",
                        "type": "text",
                        "core": "text",
                        "title": "Gallery Thumbnail Item Selector",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "code",
                        "props": {
                            "placeholder": ".flex-control-nav li"
                        },
                        "default": ".flex-control-nav li"
                    },
                    {
                        "id": "woo_gallery_trigger_selector",
                        "type": "text",
                        "core": "text",
                        "title": "Gallery Trigger Selector",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "code",
                        "props": {
                            "placeholder": ".woocommerce-product-gallery__trigger"
                        },
                        "default": ".woocommerce-product-gallery__trigger"
                    },
                    {
                        "id": "custom_css",
                        "type": "code_editor",
                        "core": "code",
                        "title": "Custom CSS",
                        "subtitle": "Loaded on every page that renders a viewer.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "code",
                        "props": [],
                        "default": ""
                    }
                ]
            }
        ]
    },
    "viewer": {
        "schema": 1,
        "unique": "_bfields_demo_viewer_",
        "kind": "metabox",
        "args": {
            "title": "3D Viewer Settings",
            "menuTitle": "",
            "menuSlug": "",
            "saveDefaults": true,
            "showResetAll": true,
            "showResetSection": true,
            "showSearch": false,
            "stickyTabs": true,
            "tabsPosition": "left",
            "tabsSwitcher": true,
            "resizable": true,
            "showFormWarning": true,
            "showRestore": false,
            "dataType": "serialize",
            "database": "",
            "context": "normal",
            "brand": []
        },
        "sections": [
            {
                "id": "model",
                "slug": "model",
                "title": "Model",
                "icon": "fa fa-cube",
                "layout": "cards",
                "fields": [
                    {
                        "id": "currentViewer",
                        "type": "button_set",
                        "core": "choice",
                        "title": "Viewer Mode",
                        "subtitle": "Choose between Lite and Advanced viewer modes.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "mode-grid",
                        "icon": "layers",
                        "props": {
                            "options": {
                                "modelViewer": "Lite",
                                "O3DViewer": "Advanced"
                            },
                            "optionMeta": {
                                "modelViewer": {
                                    "icon": "zap",
                                    "tag": "Recommended",
                                    "perks": [
                                        "Faster loading",
                                        "Smaller size"
                                    ]
                                },
                                "O3DViewer": {
                                    "icon": "sliders",
                                    "perks": [
                                        "More features",
                                        "Customization"
                                    ]
                                }
                            },
                            "presentation": "cards"
                        },
                        "default": "modelViewer"
                    },
                    {
                        "id": "bp_3d_model_type",
                        "type": "button_set",
                        "core": "choice",
                        "title": "Model Type",
                        "subtitle": "One model, or a list the viewer cycles through",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "layers",
                        "props": {
                            "options": {
                                "msimple": "Simple",
                                "mcycle": "Cycle"
                            },
                            "presentation": "segmented"
                        },
                        "default": "msimple"
                    },
                    {
                        "id": "bp_3d_src_type",
                        "type": "button_set",
                        "core": "choice",
                        "title": "Model Source Type",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "image",
                        "props": {
                            "options": {
                                "upload": "Upload",
                                "link": "Link"
                            },
                            "presentation": "segmented"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "local"
                            }
                        ],
                        "default": "upload"
                    },
                    {
                        "id": "bp_3d_src",
                        "type": "upload",
                        "core": "media",
                        "title": "3D Source",
                        "subtitle": "Select the source URL or upload a 3D model file.",
                        "desc": "Or upload a file from your media library. You can also use a direct URL to your 3D model.",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "link",
                        "props": {
                            "placeholder": "https://example.com/model.glb",
                            "buttonTitle": "Upload Source",
                            "presentation": "url"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "bp_3d_src_type",
                                "condition": "==",
                                "value": "upload",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_src_link",
                        "type": "text",
                        "core": "text",
                        "title": "3D Source",
                        "subtitle": "Paste a valid model URL",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "link",
                        "props": {
                            "placeholder": "https://example.com/model.glb"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "bp_3d_src_type",
                                "condition": "==",
                                "value": "link",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_decoder",
                        "type": "select",
                        "core": "choice",
                        "title": "Decoder",
                        "subtitle": "Choose a decoder to decode the 3D model.",
                        "desc": "Select a decoder if your 3D model requires one (e.g., Draco, KTX).",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "terminal",
                        "props": {
                            "options": {
                                "": "None",
                                "draco": "Draco",
                                "ktx": "KTX"
                            },
                            "presentation": "select"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "local"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_poster",
                        "type": "media",
                        "core": "media",
                        "title": "Poster Image",
                        "subtitle": "Display a poster image until the model is loaded.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "image",
                        "props": {
                            "placeholder": "Recommended size: 800 × 600px (JPG, PNG)",
                            "library": "image",
                            "buttonTitle": "Upload Poster",
                            "presentation": "attachment"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            }
                        ],
                        "default": {
                            "url": "",
                            "id": "",
                            "width": "",
                            "height": "",
                            "thumbnail": "",
                            "alt": "",
                            "title": "",
                            "description": ""
                        }
                    },
                    {
                        "id": "bp_3d_models",
                        "type": "group",
                        "core": "repeater",
                        "title": "3D Cycle Models",
                        "subtitle": "Cycling between 3D models",
                        "desc": "Use Multiple Model in a row.",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "layers",
                        "props": {
                            "buttonTitle": "Add New Model",
                            "titlePrefix": "Model",
                            "titleNumber": true,
                            "presentation": "collapsible"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "mcycle",
                                "scope": "local"
                            }
                        ],
                        "fields": [
                            {
                                "id": "model_link",
                                "type": "upload",
                                "core": "media",
                                "title": "3D Source",
                                "subtitle": "The 3D model file to display in the viewer.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "placeholder": "Upload or paste a model URL",
                                    "presentation": "url"
                                },
                                "default": ""
                            },
                            {
                                "id": "poster_src",
                                "type": "upload",
                                "core": "media",
                                "title": "3D Poster",
                                "subtitle": "Shown while the model loads, in either viewer.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "placeholder": "Upload or paste an image URL",
                                    "presentation": "url"
                                },
                                "default": ""
                            },
                            {
                                "id": "model-viewer-note",
                                "type": "submessage",
                                "core": "display",
                                "title": "",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": true,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "style": "warning",
                                    "html": "<strong>Lite Viewer only</strong> &mdash; every option below this line is ignored when this model uses the Advanced Viewer."
                                }
                            },
                            {
                                "id": "environment_preset",
                                "type": "select",
                                "core": "choice",
                                "title": "Environment Preset",
                                "subtitle": "Built-in lighting used when no environment image is set",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "options": {
                                        "": "Neutral (default)",
                                        "legacy": "Legacy",
                                        "custom": "Custom image"
                                    },
                                    "presentation": "select"
                                },
                                "default": "custom"
                            },
                            {
                                "id": "environment_image_src",
                                "type": "upload",
                                "core": "media",
                                "title": "Environment Image",
                                "subtitle": "Improves lighting and reflections on the model.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "placeholder": "Upload or paste an image URL",
                                    "presentation": "url"
                                },
                                "dependency": [
                                    {
                                        "controller": "environment_preset",
                                        "condition": "==",
                                        "value": "custom",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "use_environment_as_skybox",
                                "type": "switcher",
                                "core": "toggle",
                                "title": "Use Environment as Skybox",
                                "subtitle": "Paints the environment image behind the model instead of a separate skybox image.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": [],
                                "default": ""
                            },
                            {
                                "id": "skybox_image_src",
                                "type": "upload",
                                "core": "media",
                                "title": "Skybox Image",
                                "subtitle": "The background behind the model, which also lights it.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "placeholder": "Upload or paste an image URL",
                                    "presentation": "url"
                                },
                                "default": ""
                            },
                            {
                                "id": "skybox_height",
                                "type": "text",
                                "core": "text",
                                "title": "Skybox Height",
                                "subtitle": "Camera height inside the skybox, e.g. 1.6m",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "placeholder": "0m"
                                },
                                "default": ""
                            },
                            {
                                "id": "tone_mapping",
                                "type": "select",
                                "core": "choice",
                                "title": "Tone Mapping",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "options": {
                                        "": "Default",
                                        "neutral": "Neutral",
                                        "aces": "ACES",
                                        "agx": "agX"
                                    },
                                    "presentation": "select"
                                },
                                "default": ""
                            },
                            {
                                "id": "exposure",
                                "type": "slider",
                                "core": "number",
                                "title": "Exposure",
                                "subtitle": "Brightness for Model",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "min": 0.1,
                                    "max": 10,
                                    "step": 0.1,
                                    "presentation": "slider"
                                },
                                "dependency": [
                                    {
                                        "controller": "currentViewer",
                                        "condition": "==",
                                        "value": "modelViewer",
                                        "scope": "global"
                                    }
                                ],
                                "default": "1"
                            },
                            {
                                "id": "enable_ar",
                                "type": "switcher",
                                "core": "toggle",
                                "title": "Enable AR",
                                "subtitle": "Let visitors place the model in their own room on supported devices.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": [],
                                "default": ""
                            },
                            {
                                "id": "model_iso_src",
                                "type": "upload",
                                "core": "media",
                                "title": "3D Source for iOS (Optional)",
                                "subtitle": "The .usdz file Apple devices use for AR.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "placeholder": "Upload or paste a model URL",
                                    "presentation": "url"
                                },
                                "dependency": [
                                    {
                                        "controller": "enable_ar",
                                        "condition": "==",
                                        "value": "1",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "ar_placement",
                                "type": "button_set",
                                "core": "choice",
                                "title": "AR Placement",
                                "subtitle": "On the floor, or hung on a wall.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "options": {
                                        "floor": "Floor",
                                        "wall": "Wall"
                                    },
                                    "presentation": "segmented"
                                },
                                "dependency": [
                                    {
                                        "controller": "enable_ar",
                                        "condition": "==",
                                        "value": "1",
                                        "scope": "local"
                                    }
                                ],
                                "default": "floor"
                            },
                            {
                                "id": "ar_mode",
                                "type": "button_set",
                                "core": "choice",
                                "title": "AR Mode",
                                "subtitle": "Quick Look is for iOS; the others run AR on supported Android devices.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "options": {
                                        "webxr": "WebXR",
                                        "scene-viewer": "Scene Viewer",
                                        "quick-look": "Quick Look"
                                    },
                                    "presentation": "segmented"
                                },
                                "dependency": [
                                    {
                                        "controller": "enable_ar",
                                        "condition": "==",
                                        "value": "1",
                                        "scope": "local"
                                    }
                                ],
                                "default": "webxr"
                            },
                            {
                                "id": "real_size",
                                "type": "fieldset",
                                "core": "fieldset",
                                "title": "Real Size (Optional)",
                                "subtitle": "Only if this 3D file was exported at the wrong scale",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": [],
                                "dependency": [
                                    {
                                        "controller": "currentViewer",
                                        "condition": "==",
                                        "value": "modelViewer",
                                        "scope": "global"
                                    },
                                    {
                                        "controller": "bp_3d_dimensions_mode",
                                        "condition": "!=",
                                        "value": "off",
                                        "scope": "global"
                                    }
                                ],
                                "fields": [
                                    {
                                        "id": "width",
                                        "type": "number",
                                        "core": "number",
                                        "title": "Width",
                                        "subtitle": "",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "presentation": "input"
                                        },
                                        "default": ""
                                    },
                                    {
                                        "id": "height",
                                        "type": "number",
                                        "core": "number",
                                        "title": "Height",
                                        "subtitle": "",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "presentation": "input"
                                        },
                                        "default": ""
                                    },
                                    {
                                        "id": "depth",
                                        "type": "number",
                                        "core": "number",
                                        "title": "Depth",
                                        "subtitle": "",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "presentation": "input"
                                        },
                                        "default": ""
                                    }
                                ],
                                "default": {
                                    "width": "",
                                    "height": "",
                                    "depth": ""
                                }
                            },
                            {
                                "id": "hotspots",
                                "type": "group",
                                "core": "repeater",
                                "title": "Hotspots/Annotations",
                                "subtitle": "Adds interactive hotspots to the model for displaying information or actions.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "buttonTitle": "Add Hotspot",
                                    "titlePrefix": "Hotspot",
                                    "titleNumber": true,
                                    "presentation": "collapsible"
                                },
                                "fields": [
                                    {
                                        "id": "title",
                                        "type": "text",
                                        "core": "text",
                                        "title": "Name",
                                        "subtitle": "Shown on the pin, and as the card's heading when the pin is a badge icon.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": [],
                                        "default": ""
                                    },
                                    {
                                        "id": "type",
                                        "type": "select",
                                        "core": "choice",
                                        "title": "Type",
                                        "subtitle": "What this hotspot does when clicked, and which fields it offers.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "options": {
                                                "info": "Info",
                                                "link": "Link",
                                                "image": "Image",
                                                "waypoint": "Waypoint",
                                                "animation": "Animation",
                                                "video": "Video",
                                                "product": "Product"
                                            },
                                            "presentation": "select"
                                        },
                                        "default": "info"
                                    },
                                    {
                                        "id": "display",
                                        "type": "select",
                                        "core": "choice",
                                        "title": "Display",
                                        "subtitle": "How this hotspot shows its content. Popup is ignored for Link and Animation, whose click already does something else.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "options": {
                                                "": "Use viewer setting",
                                                "always": "Always visible",
                                                "hover": "Tooltip on hover",
                                                "popup": "Popup",
                                                "none": "Pin only (no content)"
                                            },
                                            "presentation": "select"
                                        },
                                        "dependency": [
                                            {
                                                "controller": "type",
                                                "condition": "!=",
                                                "value": "waypoint",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "pinIcon",
                                        "type": "select",
                                        "core": "choice",
                                        "title": "Pin Icon",
                                        "subtitle": "What the pin shows: the hotspot's name as a label, one of the badge icons, or your own picture.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "options": {
                                                "": "Use viewer setting",
                                                "text": "Text (name)",
                                                "info": "Info",
                                                "plus": "Plus",
                                                "dot": "Dot",
                                                "number": "Number",
                                                "link": "Link",
                                                "play": "Play",
                                                "cart": "Cart",
                                                "question": "Question",
                                                "custom": "Custom image"
                                            },
                                            "presentation": "select"
                                        },
                                        "default": ""
                                    },
                                    {
                                        "id": "customIcon",
                                        "type": "upload",
                                        "core": "media",
                                        "title": "Pin Image",
                                        "subtitle": "Drawn inside the pin badge instead of an icon. A small square picture works best.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "library": "image",
                                            "presentation": "url"
                                        },
                                        "dependency": [
                                            {
                                                "controller": "pinIcon",
                                                "condition": "==",
                                                "value": "custom",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "desc",
                                        "type": "textarea",
                                        "core": "text",
                                        "title": "Description",
                                        "subtitle": "The text inside the card. Hidden when Display is set to Pin only.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "multiline": true
                                        },
                                        "dependency": [
                                            {
                                                "controller": "type",
                                                "condition": "!=",
                                                "value": "waypoint",
                                                "scope": "local"
                                            },
                                            {
                                                "controller": "display",
                                                "condition": "!=",
                                                "value": "none",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "linkUrl",
                                        "type": "text",
                                        "core": "text",
                                        "title": "Link URL",
                                        "subtitle": "",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "placeholder": "https://example.com"
                                        },
                                        "dependency": [
                                            {
                                                "controller": "type",
                                                "condition": "==",
                                                "value": "link",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "linkText",
                                        "type": "text",
                                        "core": "text",
                                        "title": "Link Button Text",
                                        "subtitle": "",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "placeholder": "Visit Link"
                                        },
                                        "dependency": [
                                            {
                                                "controller": "type",
                                                "condition": "==",
                                                "value": "link",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "openInNewTab",
                                        "type": "switcher",
                                        "core": "toggle",
                                        "title": "Open in new tab",
                                        "subtitle": "",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": [],
                                        "dependency": [
                                            {
                                                "controller": "type",
                                                "condition": "==",
                                                "value": "link",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "imageUrl",
                                        "type": "upload",
                                        "core": "media",
                                        "title": "Image",
                                        "subtitle": "Shown above the description in the card styles.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "library": "image",
                                            "presentation": "url"
                                        },
                                        "dependency": [
                                            {
                                                "controller": "type",
                                                "condition": "==",
                                                "value": "image",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "imageAlt",
                                        "type": "text",
                                        "core": "text",
                                        "title": "Image Alt Text",
                                        "subtitle": "Falls back to the hotspot name.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": [],
                                        "dependency": [
                                            {
                                                "controller": "type",
                                                "condition": "==",
                                                "value": "image",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "animationName",
                                        "type": "text",
                                        "core": "text",
                                        "title": "Animation Name",
                                        "subtitle": "The clip to play, exactly as it is named in the model.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": [],
                                        "dependency": [
                                            {
                                                "controller": "type",
                                                "condition": "==",
                                                "value": "animation",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "animationRepeat",
                                        "type": "select",
                                        "core": "choice",
                                        "title": "Repeat",
                                        "subtitle": "",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "options": {
                                                "once": "Once",
                                                "loop": "Loop until clicked again",
                                                "pingpong": "Back and forth until clicked again"
                                            },
                                            "presentation": "select"
                                        },
                                        "dependency": [
                                            {
                                                "controller": "type",
                                                "condition": "==",
                                                "value": "animation",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": "once"
                                    },
                                    {
                                        "id": "videoUrl",
                                        "type": "text",
                                        "core": "text",
                                        "title": "Video URL",
                                        "subtitle": "YouTube, Vimeo, or a direct MP4, WebM or OGG file.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "placeholder": "https://www.youtube.com/watch?v=..."
                                        },
                                        "dependency": [
                                            {
                                                "controller": "type",
                                                "condition": "==",
                                                "value": "video",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "productId",
                                        "type": "select",
                                        "core": "choice",
                                        "title": "Product",
                                        "subtitle": "The card is built from this product when the visitor opens it.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": {
                                            "optionsSource": "posts",
                                            "searchable": true,
                                            "placeholder": "Search products",
                                            "presentation": "select"
                                        },
                                        "dependency": [
                                            {
                                                "controller": "type",
                                                "condition": "==",
                                                "value": "product",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "editManually",
                                        "type": "switcher",
                                        "core": "toggle",
                                        "title": "Edit Manually",
                                        "subtitle": "Show the coordinates the Visual Editor wrote, to copy them to another viewer or fine-tune them.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "",
                                        "icon": "",
                                        "props": [],
                                        "default": ""
                                    },
                                    {
                                        "id": "position",
                                        "type": "text",
                                        "core": "text",
                                        "title": "Hotspot Position",
                                        "subtitle": "Where the pin sits on the model.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "selector",
                                        "icon": "",
                                        "props": [],
                                        "dependency": [
                                            {
                                                "controller": "editManually",
                                                "condition": "==",
                                                "value": "true",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "normal",
                                        "type": "text",
                                        "core": "text",
                                        "title": "Hotspot Normal",
                                        "subtitle": "Which way the pin faces.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "selector",
                                        "icon": "",
                                        "props": [],
                                        "dependency": [
                                            {
                                                "controller": "editManually",
                                                "condition": "==",
                                                "value": "true",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "orbit",
                                        "type": "text",
                                        "core": "text",
                                        "title": "Camera Orbit",
                                        "subtitle": "Where the camera moves when the pin is clicked.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "selector",
                                        "icon": "",
                                        "props": [],
                                        "dependency": [
                                            {
                                                "controller": "editManually",
                                                "condition": "==",
                                                "value": "true",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "target",
                                        "type": "text",
                                        "core": "text",
                                        "title": "Camera Target",
                                        "subtitle": "What the camera looks at when the pin is clicked.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "selector",
                                        "icon": "",
                                        "props": [],
                                        "dependency": [
                                            {
                                                "controller": "editManually",
                                                "condition": "==",
                                                "value": "true",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    },
                                    {
                                        "id": "fov",
                                        "type": "text",
                                        "core": "text",
                                        "title": "FOV (Field Of View)",
                                        "subtitle": "How far the camera zooms when the pin is clicked.",
                                        "desc": "",
                                        "before": "",
                                        "after": "",
                                        "class": "",
                                        "pro": false,
                                        "display": false,
                                        "layout": "selector",
                                        "icon": "",
                                        "props": [],
                                        "dependency": [
                                            {
                                                "controller": "editManually",
                                                "condition": "==",
                                                "value": "true",
                                                "scope": "local"
                                            }
                                        ],
                                        "default": ""
                                    }
                                ],
                                "default": []
                            },
                            {
                                "id": "initial_view",
                                "type": "text",
                                "core": "text",
                                "title": "Initial View",
                                "subtitle": "Paste the Initial View JSON copied from the Visual Editor: the camera angle the model opens at.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "placeholder": "Paste here Initial View JSON data"
                                },
                                "default": "[]"
                            },
                            {
                                "id": "invalid",
                                "type": "content",
                                "core": "display",
                                "title": "",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": true,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "html": "<p>Use the Visual Editor to add and position hotspots on your 3D model in a visual interface.</p><a class=\"button button-primary\" target=\"_blank\" rel=\"noopener\" href=\"http://dev.local/wp-admin/admin.php?page=3d-viewer-visual-editor\">Open Visual Editor</a>"
                                }
                            }
                        ],
                        "default": []
                    },
                    {
                        "id": "bp_3d_posters",
                        "type": "group",
                        "core": "repeater",
                        "title": "Poster Images (Deprecated)",
                        "subtitle": "Use multiple images for poster image. If you don't want to use just leave it empty.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "image",
                        "props": {
                            "buttonTitle": "Add New Poster Images",
                            "presentation": "collapsible"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "mcycle",
                                "scope": "global"
                            }
                        ],
                        "fields": [
                            {
                                "id": "poster_img",
                                "type": "upload",
                                "core": "media",
                                "title": "Poster Image",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "library": "image",
                                    "presentation": "url"
                                },
                                "default": ""
                            }
                        ],
                        "default": []
                    },
                    {
                        "id": "initial_view",
                        "type": "text",
                        "core": "text",
                        "title": "Initial View",
                        "subtitle": "Defines the initial camera angle and orientation of the model when the viewer first loads.",
                        "desc": "Paste the Initial View JSON data copied from the Visual editor. Initial View allow you to set the initial view of your 3D model.",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "eye",
                        "props": {
                            "placeholder": "Paste here Initial View JSON data"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "[]"
                    },
                    {
                        "id": "invalid",
                        "type": "content",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "html": "<p>Use the Visual Editor to add hotspots or set initial view on your 3D model in a visual interface.</p><a class=\"button button-primary\" target=\"_blank\" rel=\"noopener\" href=\"http://dev.local/wp-admin/admin.php?page=3d-viewer-visual-editor\">Open Visual Editor</a>"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "local"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "local"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "lighting-environment",
                "slug": "lighting-environment",
                "title": "Lighting & Environment",
                "icon": "fa fa-sun",
                "layout": "rows",
                "fields": [
                    {
                        "id": "",
                        "type": "notice",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "style": "info",
                            "html": "Multiple models set their own lighting: open each model in the list on the Model tab."
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "mcycle",
                                "scope": "global"
                            }
                        ]
                    },
                    {
                        "id": "",
                        "type": "notice",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "style": "info",
                            "html": "Lighting and environment apply to the Lite Viewer only."
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "O3DViewer",
                                "scope": "global"
                            }
                        ]
                    },
                    {
                        "id": "bp_3d_environment_preset",
                        "type": "select",
                        "core": "choice",
                        "title": "Environment Preset",
                        "subtitle": "Uses one of the viewer's built-in lighting environments. Ignored when an Environment Image is uploaded below.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sun",
                        "props": {
                            "options": {
                                "": "Neutral (default)",
                                "legacy": "Legacy",
                                "custom": "Custom image"
                            },
                            "presentation": "select"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "custom"
                    },
                    {
                        "id": "bp_3d_environment_image",
                        "type": "upload",
                        "core": "media",
                        "title": "Environment Image",
                        "subtitle": "Sets an environment image to improve lighting and reflections on the model.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "image",
                        "props": {
                            "library": "image",
                            "buttonTitle": "Upload",
                            "presentation": "url"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            },
                            {
                                "controller": "bp_3d_environment_preset",
                                "condition": "==",
                                "value": "custom",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_use_environment_as_skybox",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Use Environment as Skybox",
                        "subtitle": "Paints the environment image behind the model instead of using a separate skybox image.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "layers",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_skybox_image",
                        "type": "upload",
                        "core": "media",
                        "title": "HDR Skybox Image",
                        "subtitle": "Sets a skybox image that appears as the background and provides environmental lighting for the model.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "image",
                        "props": {
                            "library": "image",
                            "buttonTitle": "Upload",
                            "presentation": "url"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_skybox_height",
                        "type": "text",
                        "core": "text",
                        "title": "Skybox Height",
                        "subtitle": "Raises the camera inside the skybox so the model sits on the ground plane instead of floating. Leave empty for the default.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "placeholder": "0m"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_tone_mapping",
                        "type": "select",
                        "core": "choice",
                        "title": "Tone Mapping",
                        "subtitle": "Changes how highlights roll off. 'Default' leaves the viewer's own choice in place.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "palette",
                        "props": {
                            "options": {
                                "": "Default",
                                "neutral": "Neutral",
                                "aces": "ACES",
                                "agx": "agX"
                            },
                            "presentation": "select"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    }
                ]
            },
            {
                "id": "ar",
                "slug": "ar",
                "title": "AR",
                "icon": "fa fa-camera",
                "layout": "rows",
                "fields": [
                    {
                        "id": "",
                        "type": "notice",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "style": "info",
                            "html": "Multiple models set their own AR: open each model in the list on the Model tab."
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "mcycle",
                                "scope": "global"
                            }
                        ]
                    },
                    {
                        "id": "",
                        "type": "notice",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "style": "info",
                            "html": "AR is available on the Lite Viewer only."
                        },
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "O3DViewer",
                                "scope": "global"
                            }
                        ]
                    },
                    {
                        "id": "bp_3d_enable_ar",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Enable AR",
                        "subtitle": "Enables AR (Augmented Reality) so visitors can view the 3D model in their real environment.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "phone",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "model_iso_src",
                        "type": "upload",
                        "core": "media",
                        "title": "3D Source for iOS (Optional)",
                        "subtitle": "Specifies the iOS-specific model file (.usdz) used for viewing the 3D model in AR on Apple devices.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "upload",
                        "props": {
                            "placeholder": "Upload or paste a model URL",
                            "presentation": "url"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_enable_ar",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "ar_placement",
                        "type": "button_set",
                        "core": "choice",
                        "title": "AR Placement",
                        "subtitle": "Defines how the model is placed in AR. Choose 'floor' to place the model on the ground or 'wall' to attach it to a vertical surface.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "options": {
                                "floor": "Floor",
                                "wall": "Wall"
                            },
                            "presentation": "segmented"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_enable_ar",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "floor"
                    },
                    {
                        "id": "ar_mode",
                        "type": "button_set",
                        "core": "choice",
                        "title": "AR Mode",
                        "subtitle": "Selects the AR viewing mode. 'Quick Look' is used for iOS devices, while other modes enable AR on supported Android devices.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "phone",
                        "props": {
                            "options": {
                                "webxr": "WebXR",
                                "scene-viewer": "Scene Viewer",
                                "quick-look": "Quick Look"
                            },
                            "presentation": "segmented"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_enable_ar",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "webxr"
                    }
                ]
            },
            {
                "id": "options",
                "slug": "options",
                "title": "Options",
                "icon": "fa fa-cog",
                "layout": "rows",
                "fields": [
                    {
                        "id": "bp_camera_control",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Moving Controls",
                        "subtitle": "Allows users to rotate, pan, and interact with the model using a mouse or touch input.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": [],
                        "default": "1"
                    },
                    {
                        "id": "bp_3d_zooming",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Enable Zoom",
                        "subtitle": "Enable or Disable Zooming Behaviour",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "zoom-in",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_camera_control",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            }
                        ],
                        "default": "1"
                    },
                    {
                        "id": "bp_3d_fullscreen",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Full Screen Button",
                        "subtitle": "Show/Hide Full Screen Button",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "maximize",
                        "props": [],
                        "default": "1"
                    },
                    {
                        "id": "bp_3d_zoom_in_out_btn",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Zoom In/Out Button",
                        "subtitle": "Show/Hide Zoom In/Out Button",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "zoom-out",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_camera_control",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            },
                            {
                                "controller": "bp_3d_zooming",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            }
                        ],
                        "default": "1"
                    },
                    {
                        "id": "bp_3d_camera_btn",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Camera Button",
                        "subtitle": "Show/Hide Camera Button",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "camera",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_download_btn",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "3D File Download Button",
                        "subtitle": "Show/Hide 3D File Download Button",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "download",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_loading",
                        "type": "radio",
                        "core": "choice",
                        "title": "Loading Type",
                        "subtitle": "Choose Loading type, default: \"Auto\"",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "loader",
                        "props": {
                            "options": {
                                "auto": "Auto",
                                "lazy": "Lazy",
                                "eager": "Eager"
                            },
                            "presentation": "radio"
                        },
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "auto"
                    },
                    {
                        "id": "bp_3d_progressbar",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Progressbar",
                        "subtitle": "Show/Hide Progressbar",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "1"
                    },
                    {
                        "id": "3d_exposure",
                        "type": "slider",
                        "core": "number",
                        "title": "Exposure",
                        "subtitle": "Brightness for Model",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sun",
                        "props": {
                            "min": 0.1,
                            "max": 5,
                            "step": 0.1,
                            "presentation": "slider"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "!=",
                                "value": "mcycle",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "1"
                    },
                    {
                        "id": "3d_shadow_intensity",
                        "type": "slider",
                        "core": "number",
                        "title": "Shadow Intensity",
                        "subtitle": "Shadow Intensity for Model",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "cloud-drizzle",
                        "props": {
                            "min": 0,
                            "max": 10,
                            "step": 0.1,
                            "presentation": "slider"
                        },
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "1"
                    },
                    {
                        "id": "bp_3d_autoplay",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Autoplay",
                        "subtitle": "Automatically starts model animation when the viewer loads.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "zap",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_rotate",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Auto Rotate",
                        "subtitle": "Turn the model slowly until a visitor takes over",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "refresh",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "3d_rotate_speed",
                        "type": "spinner",
                        "core": "number",
                        "title": "Auto Rotate Speed",
                        "subtitle": "Controls how fast the model rotates automatically. Higher values mean faster rotation.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "unit": "deg/s",
                            "min": 0,
                            "max": 180,
                            "presentation": "stepper"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_rotate",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "30"
                    },
                    {
                        "id": "3d_rotate_delay",
                        "type": "number",
                        "core": "number",
                        "title": "Auto Rotation Delay",
                        "subtitle": "Sets the delay time before automatic rotation starts after the model loads or after user interaction stops.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "unit": "ms",
                            "presentation": "input"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_rotate",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "3000"
                    },
                    {
                        "id": "3d_zoom_level",
                        "type": "spinner",
                        "core": "number",
                        "title": "Zoom Level",
                        "subtitle": "Controls the zoom level of the model. Higher values mean closer zoom.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "zoom-in",
                        "props": {
                            "min": 0.5,
                            "max": 5,
                            "step": 0.1,
                            "presentation": "stepper"
                        },
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "1"
                    },
                    {
                        "id": "lockXAxisRotation",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Lock Left-Right Rotation",
                        "subtitle": "Prevents the model from rotating along the X axis. Only one lock (Left-Right or Up-Down) works at a time.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "lockYAxisRotation",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Lock Up-Down Rotation",
                        "subtitle": "Prevents the model from rotating along the Y axis. Only one lock (Left-Right or Up-Down) works at a time.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_reset_view_btn",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Reset View Button",
                        "subtitle": "Restores the initial camera angle and target.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "reset",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "show_thumbs",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Show Thumbnail List",
                        "subtitle": "Displays pagination thumbnails when multiple models are available.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "grid",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "mcycle",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "show_arrows",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Show Arrows",
                        "subtitle": "Shows navigation controls for switching between multiple models.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "mcycle",
                                "scope": "global"
                            }
                        ],
                        "default": "1"
                    },
                    {
                        "id": "bp_model_progress_percent",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Show Progress Percent",
                        "subtitle": "Shows the loading percentage while the 3D model is being loaded.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "loader",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_variant",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Enable Variant Selector",
                        "subtitle": "Shows a dropdown of the KHR_materials_variants defined in the model. Nothing appears if the file has none.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "palette",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_animation",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Enable Animation Selector",
                        "subtitle": "Shows a dropdown of the animations defined in the model. Nothing appears if the file has none.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "zap",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_selected_animation",
                        "type": "text",
                        "core": "text",
                        "title": "Set Animation",
                        "subtitle": "Exact animation name from the 3D file. Leave empty to play the first one.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "pencil",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_animation",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    }
                ]
            },
            {
                "id": "advanced-viewer",
                "slug": "advanced-viewer",
                "title": "Advanced Viewer",
                "icon": "fa fa-diamond",
                "layout": "rows",
                "fields": [
                    {
                        "id": "",
                        "type": "notice",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "style": "info",
                            "html": "These options apply to the Advanced Viewer. Switch Viewer Mode to Advanced on the Model tab to use them."
                        },
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ]
                    },
                    {
                        "id": "bp_3d_show_edge",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Show Edge",
                        "subtitle": "Draws outlines on the model where two surfaces meet at a sharp angle.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "box",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "O3DViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_edge_color",
                        "type": "color",
                        "core": "color",
                        "title": "Edge Color",
                        "subtitle": "Colour of the outlines drawn on the model.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "palette",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_show_edge",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            }
                        ],
                        "default": "#000000"
                    },
                    {
                        "id": "bp_3d_edge_threshold",
                        "type": "slider",
                        "core": "number",
                        "title": "Edge Threshold",
                        "subtitle": "Edges are drawn only where two surfaces meet at a sharper angle than this. Lower values show more edges; 0 outlines every triangle.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "min": 0,
                            "max": 90,
                            "step": 1,
                            "presentation": "slider"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_show_edge",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            }
                        ],
                        "default": "1"
                    }
                ]
            },
            {
                "id": "mobile",
                "slug": "mobile",
                "title": "Mobile",
                "icon": "fa fa-mobile",
                "layout": "rows",
                "fields": [
                    {
                        "id": "bp_3d_mobile_image_mode",
                        "type": "button_set",
                        "core": "choice",
                        "title": "On Mobile Devices",
                        "subtitle": "Needs a poster image. 'Image, tap to load' shows a View in 3D button; 'Image only' never loads the model on mobile. Works with both viewers.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "phone",
                        "props": {
                            "options": {
                                "off": "Load 3D model",
                                "tap": "Image, tap to load",
                                "static": "Image only"
                            },
                            "presentation": "segmented"
                        },
                        "default": "off"
                    },
                    {
                        "id": "bp_3d_mobile_tap_label",
                        "type": "text",
                        "core": "text",
                        "title": "Tap Button Text",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "pencil",
                        "props": {
                            "placeholder": "View in 3D"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_mobile_image_mode",
                                "condition": "==",
                                "value": "tap",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_mobile_breakpoint",
                        "type": "number",
                        "core": "number",
                        "title": "Mobile Breakpoint",
                        "subtitle": "Screens up to this width count as mobile. Touch-only devices are judged by their shorter edge, so a phone in landscape still counts.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "tablet",
                        "props": {
                            "unit": "px",
                            "presentation": "input"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_mobile_image_mode",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            }
                        ],
                        "default": "768"
                    },
                    {
                        "id": "bp_3d_mobile_reduce_motion",
                        "type": "switcher",
                        "core": "toggle",
                        "title": "Reduce Motion on Mobile",
                        "subtitle": "Turns off the model animation and Auto Rotate on phones, and for visitors whose device asks for reduced motion. Visitors can still rotate and zoom.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "refresh",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    }
                ]
            },
            {
                "id": "controls",
                "slug": "controls",
                "title": "Controls",
                "icon": "fa fa-sliders",
                "layout": "rows",
                "fields": [
                    {
                        "id": "bp_3d_control_labels",
                        "type": "button_set",
                        "core": "choice",
                        "title": "Control Labels",
                        "subtitle": "Show each control's name next to its icon. Screen readers announce the name in every mode.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "info",
                        "props": {
                            "options": {
                                "off": "Off",
                                "tooltip": "Tooltip",
                                "inline": "Inline text"
                            },
                            "presentation": "segmented"
                        },
                        "default": "off"
                    },
                    {
                        "id": "bp_3d_control_corner_zoom",
                        "type": "select",
                        "core": "choice",
                        "title": "Zoom in / out position",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "options": {
                                "top-left": "Top left",
                                "top-right": "Top right",
                                "bottom-left": "Bottom left",
                                "bottom-right": "Bottom right"
                            },
                            "presentation": "select"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_zoom_in_out_btn",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            }
                        ],
                        "default": "bottom-right"
                    },
                    {
                        "id": "bp_3d_control_corner_fullscreen",
                        "type": "select",
                        "core": "choice",
                        "title": "Fullscreen position",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "options": {
                                "top-left": "Top left",
                                "top-right": "Top right",
                                "bottom-left": "Bottom left",
                                "bottom-right": "Bottom right"
                            },
                            "presentation": "select"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_fullscreen",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            }
                        ],
                        "default": "bottom-right"
                    },
                    {
                        "id": "bp_3d_control_corner_camera",
                        "type": "select",
                        "core": "choice",
                        "title": "Capture image position",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "options": {
                                "top-left": "Top left",
                                "top-right": "Top right",
                                "bottom-left": "Bottom left",
                                "bottom-right": "Bottom right"
                            },
                            "presentation": "select"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_camera_btn",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "bottom-left"
                    },
                    {
                        "id": "bp_3d_control_corner_download",
                        "type": "select",
                        "core": "choice",
                        "title": "Download model position",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "options": {
                                "top-left": "Top left",
                                "top-right": "Top right",
                                "bottom-left": "Bottom left",
                                "bottom-right": "Bottom right"
                            },
                            "presentation": "select"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_download_btn",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "bottom-left"
                    },
                    {
                        "id": "bp_3d_control_corner_reset",
                        "type": "select",
                        "core": "choice",
                        "title": "Reset view position",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "options": {
                                "top-left": "Top left",
                                "top-right": "Top right",
                                "bottom-left": "Bottom left",
                                "bottom-right": "Bottom right"
                            },
                            "presentation": "select"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_reset_view_btn",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "bottom-left"
                    },
                    {
                        "id": "bp_3d_control_corner_dimensions",
                        "type": "select",
                        "core": "choice",
                        "title": "Dimensions position",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "options": {
                                "top-left": "Top left",
                                "top-right": "Top right",
                                "bottom-left": "Bottom left",
                                "bottom-right": "Bottom right"
                            },
                            "presentation": "select"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_dimensions_mode",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "bottom-left"
                    },
                    {
                        "id": "bp_3d_control_corner_ar",
                        "type": "select",
                        "core": "choice",
                        "title": "View in AR position",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "options": {
                                "top-left": "Top left",
                                "top-right": "Top right",
                                "bottom-left": "Bottom left",
                                "bottom-right": "Bottom right"
                            },
                            "presentation": "select"
                        },
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "bottom-left"
                    },
                    {
                        "id": "bp_3d_control_text_zoomIn",
                        "type": "text",
                        "core": "text",
                        "title": "Zoom in label",
                        "subtitle": "Leave empty to use the translated default.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "pencil",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_control_labels",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_control_text_zoomOut",
                        "type": "text",
                        "core": "text",
                        "title": "Zoom out label",
                        "subtitle": "Leave empty to use the translated default.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "pencil",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_control_labels",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_control_text_fullscreen",
                        "type": "text",
                        "core": "text",
                        "title": "Fullscreen label",
                        "subtitle": "Leave empty to use the translated default.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "pencil",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_control_labels",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_control_text_camera",
                        "type": "text",
                        "core": "text",
                        "title": "Capture image label",
                        "subtitle": "Leave empty to use the translated default.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "pencil",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_control_labels",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_control_text_download",
                        "type": "text",
                        "core": "text",
                        "title": "Download model label",
                        "subtitle": "Leave empty to use the translated default.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "pencil",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_control_labels",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_control_text_reset",
                        "type": "text",
                        "core": "text",
                        "title": "Reset view label",
                        "subtitle": "Leave empty to use the translated default.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "pencil",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_control_labels",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_control_text_dimensions",
                        "type": "text",
                        "core": "text",
                        "title": "Dimensions label",
                        "subtitle": "Leave empty to use the translated default.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "pencil",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_control_labels",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_control_text_ar",
                        "type": "text",
                        "core": "text",
                        "title": "View in AR label",
                        "subtitle": "Leave empty to use the translated default.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "pencil",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_control_labels",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    }
                ]
            },
            {
                "id": "dimensions",
                "slug": "dimensions",
                "title": "Dimensions",
                "icon": "maximize",
                "layout": "rows",
                "fields": [
                    {
                        "id": "",
                        "type": "notice",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "style": "info",
                            "html": "Dimensions are drawn by the Lite Viewer only."
                        },
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "O3DViewer",
                                "scope": "global"
                            }
                        ]
                    },
                    {
                        "id": "bp_3d_dimensions_mode",
                        "type": "button_set",
                        "core": "choice",
                        "title": "Show Dimensions",
                        "subtitle": "Draws measurement lines around the model with real-world labels. 'Ruler button' hides them behind a button visitors press; 'Always on' shows them from the moment the model loads.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "maximize",
                        "props": {
                            "options": {
                                "off": "Off",
                                "button": "Ruler button",
                                "always": "Always on"
                            },
                            "presentation": "segmented"
                        },
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "off"
                    },
                    {
                        "id": "bp_3d_dimension_unit",
                        "type": "select",
                        "core": "choice",
                        "title": "Dimension Unit",
                        "subtitle": "Unit the measurements are shown in. Also the unit the Real Size fields expect.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "options": {
                                "mm": "Millimetres (mm)",
                                "cm": "Centimetres (cm)",
                                "m": "Metres (m)",
                                "in": "Inches (in)",
                                "ft": "Feet (ft)"
                            },
                            "presentation": "select"
                        },
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            },
                            {
                                "controller": "bp_3d_dimensions_mode",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            }
                        ],
                        "default": "cm"
                    },
                    {
                        "id": "bp_3d_dimension_color",
                        "type": "color",
                        "core": "color",
                        "title": "Dimension Line Colour",
                        "subtitle": "Colour of the dimension lines, corner dots and label text. Leave empty for the default.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "palette",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            },
                            {
                                "controller": "bp_3d_dimensions_mode",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "real_size",
                        "type": "fieldset",
                        "core": "fieldset",
                        "title": "Real Size (Optional)",
                        "subtitle": "Type the product's real size if the 3D file was exported at the wrong scale. Fill one axis and the others scale to match; leave all three empty to use the size measured from the file.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "box",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            },
                            {
                                "controller": "bp_3d_dimensions_mode",
                                "condition": "!=",
                                "value": "off",
                                "scope": "global"
                            }
                        ],
                        "fields": [
                            {
                                "id": "width",
                                "type": "number",
                                "core": "number",
                                "title": "Width",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "presentation": "input"
                                },
                                "default": ""
                            },
                            {
                                "id": "height",
                                "type": "number",
                                "core": "number",
                                "title": "Height",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "presentation": "input"
                                },
                                "default": ""
                            },
                            {
                                "id": "depth",
                                "type": "number",
                                "core": "number",
                                "title": "Depth",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "presentation": "input"
                                },
                                "default": ""
                            }
                        ],
                        "default": {
                            "width": "",
                            "height": "",
                            "depth": ""
                        }
                    }
                ]
            },
            {
                "id": "hotspots",
                "slug": "hotspots",
                "title": "Hotspots",
                "icon": "move",
                "layout": "rows",
                "fields": [
                    {
                        "id": "",
                        "type": "notice",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "style": "info",
                            "html": "Multiple models set their own hotspots: open each model in the list on the Model tab."
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "mcycle",
                                "scope": "global"
                            }
                        ]
                    },
                    {
                        "id": "",
                        "type": "notice",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "style": "info",
                            "html": "Hotspots are drawn by the Lite Viewer only."
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "O3DViewer",
                                "scope": "global"
                            }
                        ]
                    },
                    {
                        "id": "hotspots",
                        "type": "group",
                        "core": "repeater",
                        "title": "Hotspots",
                        "subtitle": "Adds interactive hotspots to the model for displaying information or actions.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "buttonTitle": "Add Hotspot",
                            "titlePrefix": "Hotspot",
                            "titleNumber": true,
                            "presentation": "collapsible"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "fields": [
                            {
                                "id": "title",
                                "type": "text",
                                "core": "text",
                                "title": "Name",
                                "subtitle": "Shown on the pin, and as the card's heading when the pin is a badge icon.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": [],
                                "default": ""
                            },
                            {
                                "id": "type",
                                "type": "select",
                                "core": "choice",
                                "title": "Type",
                                "subtitle": "What this hotspot does when clicked, and which fields it offers.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "options": {
                                        "info": "Info",
                                        "link": "Link",
                                        "image": "Image",
                                        "waypoint": "Waypoint",
                                        "animation": "Animation",
                                        "video": "Video",
                                        "product": "Product"
                                    },
                                    "presentation": "select"
                                },
                                "default": "info"
                            },
                            {
                                "id": "display",
                                "type": "select",
                                "core": "choice",
                                "title": "Display",
                                "subtitle": "How this hotspot shows its content. Popup is ignored for Link and Animation, whose click already does something else.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "options": {
                                        "": "Use viewer setting",
                                        "always": "Always visible",
                                        "hover": "Tooltip on hover",
                                        "popup": "Popup",
                                        "none": "Pin only (no content)"
                                    },
                                    "presentation": "select"
                                },
                                "dependency": [
                                    {
                                        "controller": "type",
                                        "condition": "!=",
                                        "value": "waypoint",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "pinIcon",
                                "type": "select",
                                "core": "choice",
                                "title": "Pin Icon",
                                "subtitle": "What the pin shows: the hotspot's name as a label, one of the badge icons, or your own picture.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "options": {
                                        "": "Use viewer setting",
                                        "text": "Text (name)",
                                        "info": "Info",
                                        "plus": "Plus",
                                        "dot": "Dot",
                                        "number": "Number",
                                        "link": "Link",
                                        "play": "Play",
                                        "cart": "Cart",
                                        "question": "Question",
                                        "custom": "Custom image"
                                    },
                                    "presentation": "select"
                                },
                                "default": ""
                            },
                            {
                                "id": "customIcon",
                                "type": "upload",
                                "core": "media",
                                "title": "Pin Image",
                                "subtitle": "Drawn inside the pin badge instead of an icon. A small square picture works best.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "library": "image",
                                    "presentation": "url"
                                },
                                "dependency": [
                                    {
                                        "controller": "pinIcon",
                                        "condition": "==",
                                        "value": "custom",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "desc",
                                "type": "textarea",
                                "core": "text",
                                "title": "Description",
                                "subtitle": "The text inside the card. Hidden when Display is set to Pin only.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "multiline": true
                                },
                                "dependency": [
                                    {
                                        "controller": "type",
                                        "condition": "!=",
                                        "value": "waypoint",
                                        "scope": "local"
                                    },
                                    {
                                        "controller": "display",
                                        "condition": "!=",
                                        "value": "none",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "linkUrl",
                                "type": "text",
                                "core": "text",
                                "title": "Link URL",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "placeholder": "https://example.com"
                                },
                                "dependency": [
                                    {
                                        "controller": "type",
                                        "condition": "==",
                                        "value": "link",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "linkText",
                                "type": "text",
                                "core": "text",
                                "title": "Link Button Text",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "placeholder": "Visit Link"
                                },
                                "dependency": [
                                    {
                                        "controller": "type",
                                        "condition": "==",
                                        "value": "link",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "openInNewTab",
                                "type": "switcher",
                                "core": "toggle",
                                "title": "Open in new tab",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": [],
                                "dependency": [
                                    {
                                        "controller": "type",
                                        "condition": "==",
                                        "value": "link",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "imageUrl",
                                "type": "upload",
                                "core": "media",
                                "title": "Image",
                                "subtitle": "Shown above the description in the card styles.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "library": "image",
                                    "presentation": "url"
                                },
                                "dependency": [
                                    {
                                        "controller": "type",
                                        "condition": "==",
                                        "value": "image",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "imageAlt",
                                "type": "text",
                                "core": "text",
                                "title": "Image Alt Text",
                                "subtitle": "Falls back to the hotspot name.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": [],
                                "dependency": [
                                    {
                                        "controller": "type",
                                        "condition": "==",
                                        "value": "image",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "animationName",
                                "type": "text",
                                "core": "text",
                                "title": "Animation Name",
                                "subtitle": "The clip to play, exactly as it is named in the model.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": [],
                                "dependency": [
                                    {
                                        "controller": "type",
                                        "condition": "==",
                                        "value": "animation",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "animationRepeat",
                                "type": "select",
                                "core": "choice",
                                "title": "Repeat",
                                "subtitle": "",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "options": {
                                        "once": "Once",
                                        "loop": "Loop until clicked again",
                                        "pingpong": "Back and forth until clicked again"
                                    },
                                    "presentation": "select"
                                },
                                "dependency": [
                                    {
                                        "controller": "type",
                                        "condition": "==",
                                        "value": "animation",
                                        "scope": "local"
                                    }
                                ],
                                "default": "once"
                            },
                            {
                                "id": "videoUrl",
                                "type": "text",
                                "core": "text",
                                "title": "Video URL",
                                "subtitle": "YouTube, Vimeo, or a direct MP4, WebM or OGG file.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "placeholder": "https://www.youtube.com/watch?v=..."
                                },
                                "dependency": [
                                    {
                                        "controller": "type",
                                        "condition": "==",
                                        "value": "video",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "productId",
                                "type": "select",
                                "core": "choice",
                                "title": "Product",
                                "subtitle": "The card is built from this product when the visitor opens it.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": {
                                    "optionsSource": "posts",
                                    "searchable": true,
                                    "placeholder": "Search products",
                                    "presentation": "select"
                                },
                                "dependency": [
                                    {
                                        "controller": "type",
                                        "condition": "==",
                                        "value": "product",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "editManually",
                                "type": "switcher",
                                "core": "toggle",
                                "title": "Edit Manually",
                                "subtitle": "Show the coordinates the Visual Editor wrote, to copy them to another viewer or fine-tune them.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "",
                                "icon": "",
                                "props": [],
                                "default": ""
                            },
                            {
                                "id": "position",
                                "type": "text",
                                "core": "text",
                                "title": "Hotspot Position",
                                "subtitle": "Where the pin sits on the model.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "selector",
                                "icon": "",
                                "props": [],
                                "dependency": [
                                    {
                                        "controller": "editManually",
                                        "condition": "==",
                                        "value": "true",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "normal",
                                "type": "text",
                                "core": "text",
                                "title": "Hotspot Normal",
                                "subtitle": "Which way the pin faces.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "selector",
                                "icon": "",
                                "props": [],
                                "dependency": [
                                    {
                                        "controller": "editManually",
                                        "condition": "==",
                                        "value": "true",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "orbit",
                                "type": "text",
                                "core": "text",
                                "title": "Camera Orbit",
                                "subtitle": "Where the camera moves when the pin is clicked.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "selector",
                                "icon": "",
                                "props": [],
                                "dependency": [
                                    {
                                        "controller": "editManually",
                                        "condition": "==",
                                        "value": "true",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "target",
                                "type": "text",
                                "core": "text",
                                "title": "Camera Target",
                                "subtitle": "What the camera looks at when the pin is clicked.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "selector",
                                "icon": "",
                                "props": [],
                                "dependency": [
                                    {
                                        "controller": "editManually",
                                        "condition": "==",
                                        "value": "true",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            },
                            {
                                "id": "fov",
                                "type": "text",
                                "core": "text",
                                "title": "FOV (Field Of View)",
                                "subtitle": "How far the camera zooms when the pin is clicked.",
                                "desc": "",
                                "before": "",
                                "after": "",
                                "class": "",
                                "pro": false,
                                "display": false,
                                "layout": "selector",
                                "icon": "",
                                "props": [],
                                "dependency": [
                                    {
                                        "controller": "editManually",
                                        "condition": "==",
                                        "value": "true",
                                        "scope": "local"
                                    }
                                ],
                                "default": ""
                            }
                        ],
                        "default": []
                    },
                    {
                        "id": "hotspot_style",
                        "type": "button_set",
                        "core": "choice",
                        "title": "Default Hotspot Style",
                        "subtitle": "The starting look for every hotspot on this viewer. Any hotspot can override it with its own Display and Pin Icon.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "mode-grid",
                        "icon": "palette",
                        "props": {
                            "options": {
                                "style-1": "Simple Tag (Text Only)",
                                "style-2": "Always Visible Card",
                                "style-3": "Hover Popup Card",
                                "style-4": "Minimal Icon Badge"
                            },
                            "presentation": "cards"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "style-1"
                    },
                    {
                        "id": "bp_3d_pin_size",
                        "type": "slider",
                        "core": "number",
                        "title": "Pin Size",
                        "subtitle": "Diameter of the hotspot badge, in pixels. Text pins are unaffected.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "unit": "px",
                            "min": 16,
                            "max": 64,
                            "step": 1,
                            "presentation": "slider"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "28"
                    },
                    {
                        "id": "bp_3d_pin_color",
                        "type": "color",
                        "core": "color",
                        "title": "Pin Icon Colour",
                        "subtitle": "Colour of the icon inside the badge, and of the label on a text pin.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "palette",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "#15171a"
                    },
                    {
                        "id": "bp_3d_pin_background",
                        "type": "color",
                        "core": "color",
                        "title": "Pin Background",
                        "subtitle": "Colour of the badge behind the icon, and of the pill behind a text pin.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "palette",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "msimple",
                                "scope": "global"
                            },
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": "#ffffff"
                    }
                ]
            },
            {
                "id": "style",
                "slug": "style",
                "title": "Style",
                "icon": "fa fa-paint-brush",
                "layout": "rows",
                "fields": [
                    {
                        "id": "bp_3d_width",
                        "type": "dimensions",
                        "core": "dimension",
                        "title": "Width",
                        "subtitle": "Set the width of the 3D viewer. You can use values like %, px, or vw for responsive layouts.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "units": [
                                "%",
                                "px",
                                "vw"
                            ],
                            "height": false
                        },
                        "responsive": {
                            "mode": "nested",
                            "keys": {
                                "tablet": "tablet",
                                "mobile": "mobile"
                            }
                        },
                        "default": {
                            "width": "100",
                            "unit": "%"
                        }
                    },
                    {
                        "id": "bp_3d_height",
                        "type": "dimensions",
                        "core": "dimension",
                        "title": "Height",
                        "subtitle": "Set the height of the 3D viewer. Adjust this to control how much vertical space the model occupies.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "zoom-in",
                        "props": {
                            "units": [
                                "px",
                                "em",
                                "pt"
                            ],
                            "width": false
                        },
                        "responsive": {
                            "mode": "nested",
                            "keys": {
                                "tablet": "tablet",
                                "mobile": "mobile"
                            }
                        },
                        "default": {
                            "height": "320",
                            "unit": "px"
                        }
                    },
                    {
                        "id": "bp_3d_align",
                        "type": "button_set",
                        "core": "choice",
                        "title": "Align",
                        "subtitle": "Controls the alignment of the 3D viewer within its container, such as left, center, or right.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "maximize",
                        "props": {
                            "options": {
                                "start": "Left",
                                "center": "Center",
                                "end": "Right"
                            },
                            "presentation": "segmented"
                        },
                        "responsive": {
                            "mode": "suffix",
                            "keys": {
                                "tablet": "bp_3d_align_tablet",
                                "mobile": "bp_3d_align_mobile"
                            }
                        },
                        "default": "center"
                    },
                    {
                        "id": "bp_model_bg",
                        "type": "color",
                        "core": "color",
                        "title": "Background Color",
                        "subtitle": "Set background color for 3d model. If you don't need just leave blank. Default: 'transparent color'",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "zoom-out",
                        "props": [],
                        "default": "transparent"
                    },
                    {
                        "id": "bp_model_bg_image",
                        "type": "upload",
                        "core": "media",
                        "title": "Background Image",
                        "subtitle": "Shown behind the model. The background colour is ignored while an image is set.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "image",
                        "props": {
                            "library": "image",
                            "buttonTitle": "Upload",
                            "presentation": "url"
                        },
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            }
                        ],
                        "default": ""
                    },
                    {
                        "id": "bp_3d_thumb_size",
                        "type": "text",
                        "core": "text",
                        "title": "Thumb Size",
                        "subtitle": "Size of each thumbnail in the model list, e.g. 70px",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "grid",
                        "props": {
                            "placeholder": "70px"
                        },
                        "dependency": [
                            {
                                "controller": "bp_3d_model_type",
                                "condition": "==",
                                "value": "mcycle",
                                "scope": "global"
                            }
                        ],
                        "default": "70px"
                    },
                    {
                        "id": "bp_model_progressbar_color",
                        "type": "color",
                        "core": "color",
                        "title": "Progressbar Color",
                        "subtitle": "Changes the color of the loading progress bar shown while the model is loading.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "palette",
                        "props": [],
                        "dependency": [
                            {
                                "controller": "currentViewer",
                                "condition": "==",
                                "value": "modelViewer",
                                "scope": "global"
                            },
                            {
                                "controller": "bp_3d_progressbar",
                                "condition": "==",
                                "value": "1",
                                "scope": "global"
                            }
                        ],
                        "default": "rgba(0, 0, 0, 0.4)"
                    },
                    {
                        "id": "bp_3d_control_size",
                        "type": "number",
                        "core": "number",
                        "title": "Control Size",
                        "subtitle": "Width and height of each control button. Inline labels keep this height and grow sideways.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "attributes": {
                                "min": 24,
                                "max": 64,
                                "step": 1
                            },
                            "unit": "px",
                            "presentation": "input"
                        },
                        "default": "35"
                    },
                    {
                        "id": "bp_3d_control_gap",
                        "type": "number",
                        "core": "number",
                        "title": "Control Spacing",
                        "subtitle": "Space between controls stacked in the same corner.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "sliders",
                        "props": {
                            "attributes": {
                                "min": 0,
                                "max": 40,
                                "step": 1
                            },
                            "unit": "px",
                            "presentation": "input"
                        },
                        "default": "10"
                    },
                    {
                        "id": "bp_3d_control_offset",
                        "type": "number",
                        "core": "number",
                        "title": "Control Edge Offset",
                        "subtitle": "Distance from the viewer edge to the controls.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "move",
                        "props": {
                            "attributes": {
                                "min": 0,
                                "max": 60,
                                "step": 1
                            },
                            "unit": "px",
                            "presentation": "input"
                        },
                        "default": "10"
                    },
                    {
                        "id": "bp_3d_padding",
                        "type": "spacing",
                        "core": "spacing",
                        "title": "Padding",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "maximize",
                        "props": {
                            "units": [
                                "px",
                                "em",
                                "rem",
                                "%"
                            ]
                        },
                        "default": {
                            "top": "",
                            "right": "",
                            "bottom": "",
                            "left": "",
                            "unit": "px"
                        }
                    }
                ]
            },
            {
                "id": "additional",
                "slug": "additional",
                "title": "Additional",
                "icon": "fa fa-code",
                "layout": "rows",
                "fields": [
                    {
                        "id": "css",
                        "type": "code_editor",
                        "core": "code",
                        "title": "Custom CSS",
                        "subtitle": "Add your own CSS to style the 3D viewer. Use the Additional ID below as the wrapper selector.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "code",
                        "props": {
                            "settings": {
                                "theme": "mbo",
                                "mode": "css"
                            }
                        },
                        "default": ""
                    },
                    {
                        "id": "additional_id",
                        "type": "text",
                        "core": "text",
                        "title": "Additional ID",
                        "subtitle": "Adds a custom HTML ID to the 3D viewer wrapper. Useful for targeting the viewer with CSS or JavaScript.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "code",
                        "props": [],
                        "default": ""
                    },
                    {
                        "id": "additional_class",
                        "type": "text",
                        "core": "text",
                        "title": "Additional Class",
                        "subtitle": "Adds custom CSS class names to the 3D viewer wrapper for advanced styling or scripting.",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": false,
                        "layout": "",
                        "icon": "code",
                        "props": [],
                        "default": ""
                    }
                ]
            },
            {
                "id": "preview",
                "slug": "preview",
                "title": "Preview",
                "icon": "fas fa-eye",
                "layout": "rows",
                "fields": [
                    {
                        "id": "",
                        "type": "callback",
                        "core": "display",
                        "title": "",
                        "subtitle": "",
                        "desc": "",
                        "before": "",
                        "after": "",
                        "class": "",
                        "pro": false,
                        "display": true,
                        "layout": "",
                        "icon": "",
                        "props": {
                            "html": "<div id=\"bfields-demo-stage\" class=\"bfields-demo-stage-mount\"></div>"
                        }
                    }
                ]
            }
        ]
    }
};
