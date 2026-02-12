# jPulse Docs / Plugins / Creating Themes v1.6.15

This guide explains how to create **custom themes** for jPulse.

## Key idea

The framework UI uses **CSS variables** (`--jp-theme-*`) defined in `webapp/view/jpulse-common.css`.
A theme overrides those variables via a selector like:

```css
[data-theme="my-theme"] {
    --jp-theme-bg-body: #111827;
    --jp-theme-text-primary: #f7fafc;
}
```

The active theme is selected by the `data-theme` attribute on the `<html>` element.

## Theme files

A theme is a trio of files in a `themes/` folder:

- `themes/<name>.css`
  - Must contain `[data-theme="<name>"] { ... }` overrides
- `themes/<name>.json`
  - Theme metadata (required fields, see below)
- `themes/<name>.png`
  - Preview image (required), size **500x200**

## Creating preview screenshots (500x200)

Theme previews are used in the documentation and in `/jpulse-examples/themes.shtml`.

Recommended workflow:

1. Open [Themes Examples](/jpulse-examples/themes.shtml)
2. In **Theme Selector (temporary switch)**, select your theme.
3. In **Theme Preview Canvas (500×200)**:
   - Ensure browser zoom is **100%**
   - Ensure the preview is “clean”: no open dropdowns, no tooltips, no hover state
4. Capture a screenshot of the preview canvas only and save it as:
   - `themes/<name>.png`

Notes:

- The preview canvas is designed so you can crop precisely to **500x200**.
- Use the same preview content across themes for consistent comparisons.

### Where to put themes

Themes are discovered from these locations:

- **Framework**: `webapp/view/themes/`
- **Site**: `site/webapp/view/themes/`
- **Plugin**: `plugins/<plugin-name>/webapp/view/themes/`

Theme resolution priority is:

**site → plugins (in plugin load order) → framework**

## Theme metadata (`themes/<name>.json`)

All fields are required:

```json
{
    "name": "my-theme",
    "label": "My Theme",
    "description": "Short description shown in the profile selector and docs table",
    "author": "Your Name or Company",
    "version": "1.0.0",
    "source": "site"
}
```

Notes:

- `name` must match the filename (e.g., `my-theme.json` must contain `"name": "my-theme"`).
- `source` must be one of: `framework`, `plugin`, `site`.
- For plugin themes, you can optionally add `"pluginName": "<plugin-name>"` for documentation display.

## Tips for good themes

- use the `webapp/view/themes/dark.*` files as a template for your own theme
- **Override variables only** (don’t restyle components directly) unless you have a strong reason.
- Always set `--jp-theme-color-scheme` (e.g., `dark`) in dark themes to improve native form controls.
- Test common pages in both desktop and mobile layouts.

## See also

- [Themes](../themes.md)
- [Style Reference](../style-reference.md)
- [Themes Examples](/jpulse-examples/themes.shtml)
