# jPulse Docs / Themes v1.6.16

jPulse supports **theme switching** using CSS variables.

## Available themes

%DYNAMIC{themes-count}% themes are available:

%DYNAMIC{themes-list-table}%

## Theme preference of Users

A user can select their preferred theme in the [User Profile](/user/profile.shtml) page. Unless logged in, the default **%DYNAMIC{themes-default}%** theme is shown.

## Theme file locations and priority

Theme files are discovered from these locations (highest priority first):

- **site**: `site/webapp/view/themes/`
- **plugins**: `plugins/<plugin-name>/webapp/view/themes/`
- **framework**: `webapp/view/themes/`

## Theme structure

Each theme is a set of three files (same base name):

- **CSS**: `themes/<name>.css`
- **Metadata**: `themes/<name>.json`
- **Preview**: `themes/<name>.png` (500x200)

All metadata fields are required:

- `name`, `label`, `description`, `author`, `version`, `source`

## Creating a theme

See: [Creating Themes](plugins/creating-themes.md)

## See also

- [Style Reference](style-reference.md)
- [Themes Examples](/jpulse-examples/themes.shtml)
