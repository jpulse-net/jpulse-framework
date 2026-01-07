# W-129: View: Create Themes Infrastructure

## Status
🚧 IN_PROGRESS

## Overview

Enable plugin developers and site administrators to create custom themes for the jPulse Framework. The framework ships with light (default) and dark themes, and users can select their preferred theme. Plugin developers can define new themes with auto-discovery, and themes are automatically available in the user profile theme selector.

## Problem Statement

Currently, the framework only supports a light theme, with user preference for light and non-functional dark theme. There's no mechanism for:
- Plugin developers to add custom themes
- Site administrators to create site-specific themes
- Dynamic theme discovery and loading
- Theme documentation and preview

## Solution

Implement a comprehensive theme system with:
1. **CSS Variable Standardization**: Standardize all colors and styling using CSS custom properties
2. **Theme File Structure**: Separate theme files (CSS, JSON metadata, preview images)
3. **Auto-Discovery**: Automatic theme discovery from framework, plugins, and site
4. **Dynamic Loading**: Load only the selected theme CSS at runtime
5. **Dynamic Documentation**: Auto-generated theme documentation table

---

## Architecture Decisions

### File Structure

```
webapp/view/themes/
├── light.css          (framework default theme)
├── light.json         (theme metadata)
├── light.png          (500x200 theme preview)
├── dark.css
├── dark.json
└── dark.png

plugins/ocean-theme/webapp/view/themes/
├── ocean.css
├── ocean.json
└── ocean.png

site/webapp/view/themes/
├── corporate.css      (site custom theme)
├── corporate.json
└── corporate.png
```

### Theme Metadata Location

- **Separate JSON files**: `themes/<name>.json` (not in plugin.json)
- **Rationale**: Easier maintenance, supports site themes, auto-discovery without parsing plugin.json

### CSS Loading Strategy

- **Dynamic loading**: Inject `<link>` tag in header template
- **Browser caching**: Use cache-friendly URLs with timestamps
- **Fallback**: Default to light theme if user not authenticated or theme missing
- **Implementation**: Use handlebar template with conditional loading

### Preview Images

- **Preview**: 500x200 pixels (for profile page selection & theme table)
- **Format**: PNG required
- **Required**: Yes, for all themes

### Conflict Resolution Priority

1. **Framework themes** (lowest priority)
2. **Plugin themes** (in plugin dependency order)
3. **Site themes** (highest priority, overrides everything)

---

## CSS Variable Standardization

### Standard Variable Set

All themes must define these CSS custom properties. Framework defines defaults in `:root`, themes override using `[data-theme="<name>"]` selector.

```css
/* ========================================
 * THEME CSS VARIABLES - Standard Set
 * All themes must define these variables
 * ======================================== */

:root {
    /* Background Colors */
    --jp-theme-bg-body: #f5f5f5;           /* Page background */
    --jp-theme-bg-primary: #ffffff;         /* Main content background */
    --jp-theme-bg-secondary: #f8f9fa;       /* Secondary background (cards, panels) */
    --jp-theme-bg-tertiary: #e9ecef;        /* Tertiary background (hover states) */

    /* Text Colors */
    --jp-theme-text-primary: #333333;       /* Main text color */
    --jp-theme-text-secondary: #666666;     /* Secondary text */
    --jp-theme-text-muted: #999999;         /* Muted/disabled text */
    --jp-theme-text-inverse: #ffffff;       /* Text on dark backgrounds */

    /* Border Colors */
    --jp-theme-border-color: #e0e0e0;        /* Default border */
    --jp-theme-border-light: #f0f0f0;       /* Light border */
    --jp-theme-border-dark: #cccccc;         /* Dark border */

    /* Semantic Colors (used by buttons, badges, alerts) */
    --jp-theme-color-primary: #007acc;      /* Primary action color */
    --jp-theme-color-primary-hover: #0056b3; /* Primary hover */
    --jp-theme-color-primary-dark: #005999;  /* Primary dark variant */

    --jp-theme-color-secondary: #6c757d;     /* Secondary color */
    --jp-theme-color-secondary-hover: #545b62;

    --jp-theme-color-success: #28a745;       /* Success state */
    --jp-theme-color-success-hover: #1e7e34;
    --jp-theme-color-success-bg: #d4edda;   /* Success background */
    --jp-theme-color-success-text: #155724; /* Success text */

    --jp-theme-color-danger: #dc3545;       /* Error/danger state */
    --jp-theme-color-danger-hover: #c82333;
    --jp-theme-color-danger-bg: #f8d7da;     /* Error background */
    --jp-theme-color-danger-text: #721c24;   /* Error text */

    --jp-theme-color-warning: #ffc107;      /* Warning state */
    --jp-theme-color-warning-hover: #e0a800;
    --jp-theme-color-warning-bg: #fff3cd;    /* Warning background */
    --jp-theme-color-warning-text: #856404;   /* Warning text */

    --jp-theme-color-info: #17a2b8;         /* Info state */
    --jp-theme-color-info-hover: #138496;
    --jp-theme-color-info-bg: #d1ecf1;       /* Info background */
    --jp-theme-color-info-text: #0c5460;    /* Info text */

    /* Header/Navigation */
    --jp-theme-header-bg: linear-gradient(135deg, #007acc, #005999);
    --jp-theme-header-text: #ffffff;
    --jp-theme-header-shadow: rgba(0,0,0,0.15);

    /* Shadows */
    --jp-theme-shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
    --jp-theme-shadow-md: 0 2px 10px rgba(0,0,0,0.1);
    --jp-theme-shadow-lg: 0 4px 12px rgba(0,0,0,0.15);

    /* Status Badge Colors */
    --jp-theme-status-active-bg: #d4edda;
    --jp-theme-status-active-text: #155724;
    --jp-theme-status-inactive-bg: #f8d7da;
    --jp-theme-status-inactive-text: #721c24;
    --jp-theme-status-pending-bg: #fff3cd;
    --jp-theme-status-pending-text: #856404;

    /* Role Badge Colors */
    --jp-theme-role-root-bg: #dc3545;
    --jp-theme-role-admin-bg: #fd7e14;
    --jp-theme-role-user-bg: #007acc;
    --jp-theme-role-text: #ffffff;
}
```

### Theme File Example

**`webapp/view/themes/dark.css`:**
```css
/* Dark theme overrides */
[data-theme="dark"] {
    --jp-theme-bg-body: #1a1a1a;
    --jp-theme-bg-primary: #2d3748;
    --jp-theme-bg-secondary: #4a5568;
    --jp-theme-bg-tertiary: #1a202c;
    --jp-theme-text-primary: #f7fafc;
    --jp-theme-text-secondary: #cbd5e0;
    --jp-theme-text-muted: #a0aec0;
    --jp-theme-text-inverse: #1a1a1a;
    --jp-theme-border-color: #4a5568;
    --jp-theme-border-light: #2d3748;
    --jp-theme-border-dark: #718096;
    --jp-theme-color-primary: #4299e1;
    --jp-theme-color-primary-hover: #3182ce;
    --jp-theme-color-primary-dark: #2c5282;
    --jp-theme-header-bg: linear-gradient(135deg, #2d3748, #1a202c);
    --jp-theme-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --jp-theme-shadow-md: 0 2px 10px rgba(0,0,0,0.3);
    --jp-theme-shadow-lg: 0 4px 12px rgba(0,0,0,0.4);
    /* ... override all other variables ... */
}
```

---

## Theme Metadata Structure

### Framework Theme JSON

**`webapp/view/themes/light.json`:**
```json
{
    "name": "light",
    "label": "Light",
    "description": "Default light theme with clean, bright colors",
    "author": "jPulse Framework",
    "version": "1.0.0",
    "source": "framework"
}
```

**`webapp/view/themes/dark.json`:**
```json
{
    "name": "dark",
    "label": "Dark",
    "description": "Dark theme for low-light environments",
    "author": "jPulse Framework",
    "version": "1.0.0",
    "source": "framework"
}
```

### Plugin Theme JSON

**Plugin naming convention**: Plugin name must be `{theme-name}-theme` (e.g., `ocean-theme`)

**Theme files**: Use theme name without `-theme` suffix (e.g., `ocean.css`, `ocean.json`, `ocean.png`)

**`plugins/ocean-theme/webapp/view/themes/ocean.json`:**
```json
{
    "name": "ocean",
    "label": "Ocean Blue",
    "description": "Deep blue theme inspired by the ocean depths",
    "author": "Plugin Author Name",
    "version": "1.0.0",
    "source": "plugin",
    "pluginName": "ocean-theme"
}
```

**CSS selector**: `[data-theme="ocean"]` (uses theme name, not plugin name)

### Site Theme JSON

**`site/webapp/view/themes/corporate.json`:**
```json
{
    "name": "corporate",
    "label": "Corporate",
    "description": "Professional corporate theme with brand colors",
    "author": "Site Administrator",
    "version": "1.0.0",
    "source": "site"
}
```

### Required Fields

All fields are required in theme JSON files:
- `name` - Theme name (must match filename without `.json`)
- `label` - Human-readable theme name
- `description` - Theme description
- `author` - Theme author name
- `version` - Version string (semantic versioning recommended)
- `source` - Source type: `"framework"`, `"plugin"`, or `"site"`

**Note**: `preview` field is omitted - preview image filename is derived from `name` as `{name}.png` (e.g., `light.png`, `ocean.png`)

---

## Theme Manager

### Implementation: `webapp/utils/theme-manager.js`

Uses `PathResolver` for directory discovery (following `ViewController` pattern) and `cache-manager` for performance.

### Architecture Overview

**Class Structure**:
- Static class (no instances)
- Follows pattern of `PathResolver`, `CacheManager`, `PluginManager`
- Initialized during bootstrap
- Available globally as `global.ThemeManager`

**Key Methods**:
- `initialize()` - Register cache, called during bootstrap
- `discoverThemes()` - Discover all themes from framework/plugins/site
- `getThemeNames()` - Get theme names for schema enum
- `getCacheStats()` - Get cache statistics for monitoring

**Dependencies**:
- `PathResolver` - For directory discovery
- `cache-manager` - For JSON file caching
- `LogController` - For logging
- `global.PluginManager` - For plugin list

### Design Decisions

1. **PathResolver.listFiles() Usage**:
   - Returns relative paths from `view/` directory
   - Handles priority automatically: site > plugins > framework
   - Returns paths like `themes/light.json`, `themes/dark.json`
   - No need to manually check each location

2. **Path Resolution for JSON Files**:
   - `PathResolver.listFiles()` returns relative paths
   - Must convert to absolute paths for file reading
   - Use `PathResolver.resolveModuleWithPlugins()` for absolute path resolution
   - Or construct absolute path using `appConfig.system.appDir` and detected source

3. **Cache Strategy**:
   - JSON files cached via `cache-manager` (same as ViewController)
   - Cache invalidated on file change (automatic via cache-manager)
   - No need to cache discovered theme list (re-discover on each call, but JSON files are cached)

4. **Error Handling**:
   - Invalid JSON: Log error, skip theme, continue discovery
   - Missing required fields: Log warning, use defaults, include theme
   - Missing CSS/PNG files: Not validated during discovery (validated on use)
   - Duplicate theme names: Later source overwrites earlier (by design)

5. **Validation**:
   - Theme name must match filename (e.g., `light.json` → name: "light")
   - Required fields: `name`, `label` (others optional)
   - Theme name validation: alphanumeric, dash, underscore only (same as plugin names)
   - Source detection: automatic from path, but can be overridden in JSON

6. **PathResolver.listFiles() Details**:
   - **modulePath**: `'view/themes/*.json'` (relative from `webapp/` directory)
   - **matchFunction**: `(filePath, pattern) => boolean`
     - `filePath`: Relative path from `view/` (e.g., `'themes/light.json'`)
     - `pattern`: The pattern string (not used in simple case)
     - Returns: `true` if file matches pattern
   - **readDirFunction**: `(dirPath, basePath, pattern) => string[]`
     - `dirPath`: Absolute path to directory (e.g., `/path/to/webapp/view/themes`)
     - `basePath`: Same as dirPath (for recursive calls, not used in simple case)
     - `pattern`: The pattern string (not used in simple case)
     - Returns: Array of relative paths from `view/` (e.g., `['themes/light.json']`)
   - **Return value**: Array of relative paths from `view/` directory
   - **Priority**: PathResolver handles site/plugins/framework priority automatically

7. **Path Resolution Details**:
   - `PathResolver.listFiles()` returns relative paths like `'themes/light.json'`
   - Must convert to absolute path for file reading
   - Use `PathResolver.resolveModuleWithPlugins('view/themes/light.json')` to get absolute path
   - This automatically handles priority: site > plugins > framework
   - Absolute path used for file reading and caching

```javascript
/**
 * @name            jPulse Framework / WebApp / Utils / Theme Manager
 * @tagline         Theme Manager for jPulse Framework
 * @description     Discovers and manages themes from framework, plugins, and site with caching
 * @file            webapp/utils/theme-manager.js
 * @version         1.4.8
 * @release         2026-01-08
 */

import PathResolver from './path-resolver.js';
import cacheManager from './cache-manager.js';
import path from 'path';
import fs from 'fs';
import LogController from '../controller/log.js';

/**
 * Theme Manager
 * Discovers themes from framework, plugins, and site
 * Priority: Framework → Plugins (dependency order) → Site
 * Uses PathResolver for directory discovery and cache-manager for performance
 */
class ThemeManager {
    /**
     * Theme cache instance (initialized in initialize())
     */
    static themeCache = null;

    /**
     * Initialize theme manager
     * Called during bootstrap
     */
    static initialize() {
        // Register cache with cache-manager (following ViewController pattern)
        const cacheConfig = global.appConfig?.utils?.theme?.cache || {
            enabled: true,
            checkInterval: 5 // Check for theme changes every 5 minutes
        };

        // In test mode, disable caching
        if (process.env.NODE_ENV === 'test' || global.isTestEnvironment) {
            cacheConfig.enabled = false;
        }

        this.themeCache = cacheManager.register(cacheConfig, 'ThemeCache');
        LogController.logInfo(null, 'theme-manager.initialize', 'ThemeManager initialized with caching');
    }

    /**
     * Discover all available themes
     * Uses PathResolver.listFiles() to discover theme JSON files
     * @returns {Array<Object>} Array of theme objects with metadata
     */
    static discoverThemes() {
        const themes = new Map(); // Use Map to handle overwrites

        // Use PathResolver.listFiles() to discover theme JSON files
        // Pattern: 'view/themes/*.json' (PathResolver handles site/plugins/framework priority)
        // Returns relative paths like: ['themes/light.json', 'themes/dark.json']
        const themeJsonFiles = PathResolver.listFiles(
            'view/themes/*.json',
            (filePath, pattern) => {
                // matchFunction: Check if file matches pattern
                // filePath is relative from view/ directory (e.g., 'themes/light.json')
                // pattern is 'themes/*.json' (not used in simple case, but required by API)
                return filePath.endsWith('.json') && filePath.startsWith('themes/');
            },
            (dirPath, basePath, pattern) => {
                // readDirFunction: Recursively read directory and return file paths
                // dirPath: absolute path to directory (e.g., '/path/to/webapp/view/themes')
                // basePath: same as dirPath (for recursive calls)
                // pattern: 'themes/*.json' (not used in simple case)
                const files = [];
                try {
                    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                        for (const entry of entries) {
                            if (entry.isFile() && entry.name.endsWith('.json')) {
                                // Return relative path from view/ directory
                                // PathResolver expects relative paths, not absolute
                                files.push(`themes/${entry.name}`);
                            }
                        }
                    }
                } catch (error) {
                    // Directory doesn't exist or not accessible - return empty array
                    LogController.logWarning(null, 'theme-manager.discoverThemes',
                        `Cannot read theme directory ${dirPath}: ${error.message}`);
                }
                return files;
            }
        );

        // Process discovered JSON files (relative paths from view/ directory)
        for (const relativeJsonPath of themeJsonFiles) {
            // relativeJsonPath is like 'themes/light.json' (relative from view/)
            const themeName = path.basename(relativeJsonPath, '.json');

            // Validate theme name (alphanumeric, dash, underscore only)
            if (!/^[a-zA-Z0-9_-]+$/.test(themeName)) {
                LogController.logError(null, 'theme-manager.discoverThemes',
                    `Invalid theme name: ${themeName} (must be alphanumeric, dash, or underscore only)`);
                continue;
            }

            // Resolve absolute path using PathResolver (handles site/plugins/framework priority)
            let jsonPath;
            let pluginName = null;

            try {
                // Use PathResolver.resolveModuleWithPlugins() to get absolute path
                // This automatically handles priority: site > plugins > framework
                jsonPath = PathResolver.resolveModuleWithPlugins(relativeJsonPath);

                // Extract plugin name from path if it's a plugin theme
                // (for plugin themes, we need pluginName even though source comes from JSON)
                if (jsonPath.includes('/plugins/')) {
                    const pluginMatch = jsonPath.match(/plugins\/([^/]+)\//);
                    if (pluginMatch) {
                        pluginName = pluginMatch[1];
                    }
                }
            } catch (error) {
                // File not found in any location (shouldn't happen if listFiles found it)
                LogController.logError(null, 'theme-manager.discoverThemes',
                    `Cannot resolve theme file ${relativeJsonPath}: ${error.message}`);
                continue;
            }

            // Read and parse JSON file (use cache if available)
            try {
                let jsonContent;
                if (this.themeCache && this.themeCache.config.enabled) {
                    jsonContent = this.themeCache.getFileSync(jsonPath);
                } else {
                    jsonContent = fs.readFileSync(jsonPath, 'utf8');
                }

                if (!jsonContent) {
                    LogController.logWarning(null, 'theme-manager.discoverThemes',
                        `Theme file is empty: ${jsonPath}`);
                    continue;
                }

                const metadata = JSON.parse(jsonContent);

                // Validate theme name matches filename
                if (!metadata.name || metadata.name !== themeName) {
                    LogController.logError(null, 'theme-manager.discoverThemes',
                        `Theme name mismatch in ${jsonPath}: expected "${themeName}", got "${metadata.name || 'missing'}"`);
                    continue; // Skip this theme
                }

                // Validate required fields (all fields are required)
                const requiredFields = ['name', 'label', 'description', 'author', 'version', 'source'];
                let missingFields = [];
                for (const field of requiredFields) {
                    if (!metadata[field] || metadata[field] === '') {
                        missingFields.push(field);
                    }
                }
                if (missingFields.length > 0) {
                    LogController.logError(null, 'theme-manager.discoverThemes',
                        `Theme missing required fields in ${jsonPath}: ${missingFields.join(', ')}`);
                    continue; // Skip this theme
                }

                // Build theme object (all fields required, source comes from JSON)
                const theme = {
                    name: metadata.name,
                    label: metadata.label,
                    description: metadata.description,
                    author: metadata.author,
                    version: metadata.version,
                    source: metadata.source, // Required field from JSON
                    ...metadata
                };

                if (pluginName) {
                    theme.pluginName = pluginName;
                }

                // Map handles overwrites (site > plugins > framework by PathResolver order)
                // Later themes (higher priority) overwrite earlier ones with same name
                themes.set(themeName, theme);

            } catch (error) {
                if (error instanceof SyntaxError) {
                    LogController.logError(null, 'theme-manager.discoverThemes',
                        `Invalid JSON in theme file ${jsonPath}: ${error.message}`);
                } else {
                    LogController.logError(null, 'theme-manager.discoverThemes',
                        `Error reading theme file ${jsonPath}: ${error.message}`);
                }
                // Continue with other themes (don't fail entire discovery)
            }
        }

        return Array.from(themes.values());
    }

    /**
     * Get theme names only (for schema enum)
     * Cached result for performance
     * @returns {Array<string>} Array of theme names
     */
    static getThemeNames() {
        const themes = this.discoverThemes();
        return themes.map(t => t.name).sort();
    }

    /**
     * Get cache statistics (for monitoring)
     * @returns {object} Cache statistics
     */
    static getCacheStats() {
        if (!this.themeCache) {
            return { name: 'ThemeCache', enabled: false };
        }
        return this.themeCache.getStats();
    }

    /**
     * Extend UserModel schema with discovered themes
     * Called during bootstrap after theme discovery
     * @param {object} UserModel - UserModel class to extend
     */
    static extendUserModelSchema(UserModel) {
        if (!UserModel) {
            LogController.logError(null, 'theme-manager.extendUserModelSchema',
                'UserModel not provided');
            return;
        }

        try {
            const themeNames = this.getThemeNames();
            if (themeNames.length > 0) {
                UserModel.extendSchema({
                    preferences: {
                        theme: {
                            type: 'string',
                            default: 'light',
                            enum: themeNames
                        }
                    }
                });
                LogController.logInfo(null, 'theme-manager.extendUserModelSchema',
                    `Extended UserModel schema with ${themeNames.length} theme(s): ${themeNames.join(', ')}`);
            } else {
                LogController.logWarning(null, 'theme-manager.extendUserModelSchema',
                    'No themes discovered, using default light theme');
            }
        } catch (error) {
            LogController.logError(null, 'theme-manager.extendUserModelSchema',
                `Failed to extend schema: ${error.message}`);
        }
    }
}

export default ThemeManager;
```

### Bootstrap Integration

Add to `webapp/utils/bootstrap.js` after UserModel schema initialization:

**Exact Placement**: After Step 16 (UserModel schema initialization), before Step 17 (ConfigController)

**Implementation** (keep bootstrap code minimal):
```javascript
// Step 16.1: Initialize Theme Manager (W-129 - after plugins loaded, before schema finalization)
const ThemeManagerModule = await import('./theme-manager.js');
ThemeManagerModule.default.initialize();
global.ThemeManager = ThemeManagerModule.default;
bootstrapLog('✅ ThemeManager: Initialized');

// Step 16.2: Extend UserModel schema with discovered themes
global.ThemeManager.extendUserModelSchema(UserModel);
bootstrapLog('✅ ThemeManager: Schema extended');
```

**Error Handling** (handled inside ThemeManager methods):
- ThemeManager initialization failure → Logged inside `initialize()`, continue bootstrap
- Schema extension failure → Logged inside `extendUserModelSchema()`, continue bootstrap
- No themes discovered → Logged inside `extendUserModelSchema()`, use default light

**Dependencies**:
- Requires: `UserModel` (already available from Step 16)
- Requires: `PluginManager` (already initialized in Step 6)
- Requires: `PathResolver` (already available)
- Requires: `cache-manager` (already available)

---

## Header Template Update

### Implementation: `webapp/view/jpulse-header.tmpl`

Add theme CSS loading after framework CSS. Theme CSS is loaded dynamically (not appended like `jpulse-common.css`).

### Implementation Details

**Location**: After `jpulse-common.css` link, before component libraries

**Implementation**:
```handlebars
<!-- jPulse Component Library - Framework Core + Site (W-098 append mode) -->
<link rel="stylesheet" href="/jpulse-common.css?t={{file.timestamp "jpulse-common.css"}}">

<!-- Theme CSS - Load user-selected theme (W-129) -->
<link rel="stylesheet" href="/themes/{{default user.preferences.theme "light"}}.css?t={{file.timestamp (concat "themes/" (default user.preferences.theme "light") ".css")}}">
```

**Note**: Unauthenticated users have empty preferences, so we need to check for authentication and provide fallback to `'light'` theme.

### Helper Implementations

**Add to `webapp/controller/handlebar.js`**:

#### Concat Helper

```javascript
/**
 * W-129: Concat helper - concatenate strings
 * Usage: {{concat "themes/" user.preferences.theme ".css"}}
 * @param {object} parsedArgs - Parsed arguments
 * @param {object} currentContext - Current context
 * @returns {string} Concatenated string
 */
function _handleConcat(parsedArgs, currentContext) {
    const args = parsedArgs._args || [];
    return args.map(arg => {
        // Evaluate each argument (could be string literal or context property)
        if (typeof arg === 'string') {
            return arg;
        }
        // If it's a property path, evaluate it
        return _evaluatePropertyPath(arg, currentContext) || '';
    }).join('');
}

// Register in helper registry
helpers['concat'] = _handleConcat;
```

#### Default Helper (First Non-Empty)

```javascript
/**
 * W-129: Default helper - return first non-empty value
 * Usage: {{default user.preferences.theme "light"}}
 * Returns the first argument that is truthy and non-empty string, or the last argument as fallback
 * @param {object} parsedArgs - Parsed arguments
 * @param {object} currentContext - Current context
 * @returns {string} First non-empty value or last argument
 */
function _handleDefault(parsedArgs, currentContext) {
    const args = parsedArgs._args || [];
    if (args.length === 0) {
        return '';
    }

    // Evaluate each argument and return first non-empty
    for (let i = 0; i < args.length - 1; i++) {
        const arg = args[i];
        let value;

        if (typeof arg === 'string') {
            value = arg;
        } else {
            // Evaluate property path
            value = _evaluatePropertyPath(arg, currentContext);
        }

        // Return first non-empty string (truthy and not empty string)
        if (value && value !== '') {
            return String(value);
        }
    }

    // Return last argument as fallback (always return something)
    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'string') {
        return lastArg;
    }
    const lastValue = _evaluatePropertyPath(lastArg, currentContext);
    return lastValue ? String(lastValue) : '';
}

// Register in helper registry
helpers['default'] = _handleDefault;
```

### Theme Application Mechanism

**CSS Variable Application**: Themes use `[data-theme="<name>"]` selector to override CSS variables.

**HTML Attribute Setting**: The `data-theme` attribute must be set on `<html>` or `<body>` element.

**Implementation**: Add to `jpulse-header.tmpl` or `jpulse-footer.tmpl`:

```handlebars
<!-- In <html> tag or <body> tag -->
<html lang="{{default user.preferences.language "en"}}" data-theme="{{default user.preferences.theme "light"}}">
```

Or via JavaScript in footer:
```javascript
// Apply theme attribute (fallback to light for unauthenticated users)
(function() {
    const theme = '{{default user.preferences.theme "light"}}';
    document.documentElement.setAttribute('data-theme', theme);
})();
```

**Fallback Strategy**:
1. If user not authenticated → `light` theme (default)
2. If user authenticated but no `preferences.theme` → `light` theme (default)
3. If selected theme missing → `light` theme (CSS file 404, but page still works)
4. If theme CSS fails to load → Page uses framework defaults (graceful degradation)

---

## Dynamic Themes Table

### Implementation: `webapp/controller/markdown.js`

Add to `DYNAMIC_CONTENT_REGISTRY`:

```javascript
static DYNAMIC_CONTENT_REGISTRY = {
    // ... existing generators ...

    // W-129: Themes dynamic content generators
    'themes-list-table': {
        description: 'Markdown table of available themes',
        params: '`source` (optional: "framework", "plugin", "site")',
        generator: async (params) => MarkdownController._generateThemesTable(params),
    },
    'themes-list': {
        description: 'Bullet list of available themes',
        params: '`source` (optional: "framework", "plugin", "site")',
        generator: async (params) => MarkdownController._generateThemesList(params),
    },
    'themes-count': {
        description: 'Count of available themes',
        params: '`source` (optional: "framework", "plugin", "site")',
        generator: async (params) => {
            const ThemeManager = (await import('../utils/theme-manager.js')).default;
            const themes = ThemeManager.discoverThemes();
            const filtered = params.source
                ? themes.filter(t => t.source === params.source)
                : themes;
            return `${filtered.length}`;
        },
    },
};
```

### Generate Themes Table Method

```javascript
/**
 * W-129: Generate markdown table of available themes
 * Used for dynamic content: %DYNAMIC{themes-list-table}%
 * @param {object} params - Optional parameters
 *   - source: filter by "framework", "plugin", or "site"
 * @returns {string} Markdown table
 * @private
 */
static async _generateThemesTable(params = {}) {
    const ThemeManager = (await import('../utils/theme-manager.js')).default;
    if (!ThemeManager) {
        return '_ThemeManager not initialized._';
    }

    let themes = ThemeManager.discoverThemes();

    // Filter by source if specified
    if (params.source) {
        themes = themes.filter(t => t.source === params.source);
    }

    // Sort by source (framework first), then by name
    themes.sort((a, b) => {
        const sourceOrder = { framework: 0, plugin: 1, site: 2 };
        const sourceDiff = (sourceOrder[a.source] || 99) - (sourceOrder[b.source] || 99);
        if (sourceDiff !== 0) return sourceDiff;
        return a.name.localeCompare(b.name);
    });

    if (themes.length === 0) {
        return '_No themes match the criteria._';
    }

    let md = '| Preview | Theme | Label | Description | Author | Source |\n';
    md += '|---------|-------|-------|-------------|--------|--------|\n';

    for (const theme of themes) {
        const previewPath = `/themes/${theme.name}.png`;
        // Use markdown image syntax with link to full preview
        const preview = `[![${theme.label}](${previewPath})](${previewPath})`;
        const themeName = `\`${theme.name}\``;
        const label = theme.label;
        const description = theme.description;
        const author = theme.author;
        const source = theme.source === 'framework' ? 'Framework'
                     : theme.source === 'plugin' ? `Plugin: ${theme.pluginName || '—'}`
                     : theme.source === 'site' ? 'Site'
                     : '—';

        md += `| ${preview} | ${themeName} | ${label} | ${description} | ${author} | ${source} |\n`;
    }

    return md;
}
```

### Generate Themes List Method

```javascript
/**
 * W-129: Generate markdown list of available themes
 * Used for dynamic content: %DYNAMIC{themes-list}%
 * @param {object} params - Optional parameters
 *   - source: filter by "framework", "plugin", or "site"
 * @returns {string} Markdown list
 * @private
 */
static async _generateThemesList(params = {}) {
    const ThemeManager = (await import('../utils/theme-manager.js')).default;
    if (!ThemeManager) {
        return '_ThemeManager not initialized._';
    }

    let themes = ThemeManager.discoverThemes();

    // Filter by source if specified
    if (params.source) {
        themes = themes.filter(t => t.source === params.source);
    }

    // Sort by source, then by name
    themes.sort((a, b) => {
        const sourceOrder = { framework: 0, plugin: 1, site: 2 };
        const sourceDiff = (sourceOrder[a.source] || 99) - (sourceOrder[b.source] || 99);
        if (sourceDiff !== 0) return sourceDiff;
        return a.name.localeCompare(b.name);
    });

    if (themes.length === 0) {
        return '_No themes match the criteria._';
    }

    let md = '';
    for (const theme of themes) {
        const previewPath = `/themes/${theme.name}.png`;
        const source = theme.source === 'framework' ? '_(Framework)_'
                     : theme.source === 'plugin' ? `_(Plugin: ${theme.pluginName || 'unknown'})_`
                     : theme.source === 'site' ? '_(Site)_'
                     : '';
        const description = theme.description ? ` - ${theme.description}` : '';

        md += `- ![${theme.label}](${previewPath}) **\`${theme.name}\`** (${theme.label})${source}${description}\n`;
    }

    return md;
}
```

---

## Static File Serving

**Path resolution for all files in `view/` path is already handled automatically**:
- `.shtml` and `.tmpl` files are always served by ViewController
- `.css` and `.js` files are served by ViewController in dev, and nginx in prod
- Files are served with proper override replacement (`.shtml`, `.tmpl`), or append mode (`.css`, `.js`)

**Theme files work automatically**:
- `/themes/light.css` → `view/themes/light.css` (resolved via PathResolver)
- `/themes/light.json` → `view/themes/light.json` (resolved via PathResolver)
- `/themes/light.png` → `view/themes/light.png` (resolved via PathResolver)

**Path Resolution Priority** (automatic via PathResolver):
1. `site/webapp/view/themes/*` (highest priority)
2. `plugins/[name]/webapp/view/themes/*` (in plugin dependency order)
3. `webapp/view/themes/*` (framework fallback)

**No additional route configuration needed** - theme files work automatically through existing view controller.

---

## Implementation Phases

### Phase 1: Foundation (2-3 days)

**Objective**: Standardize CSS variables and create framework themes

**Tasks**:
1. **CSS Variable Standardization**
   - **Audit**: Search `webapp/view/jpulse-common.css` for all `#` color values, `rgb()`, `rgba()` calls
   - **Create variable list**: Map each color to semantic variable name
   - **Add variables**: Add all CSS variables to `:root` selector at top of `jpulse-common.css`
   - **Set defaults**: Use current light theme colors as default values
   - **Replace systematically**:
     - Start with background colors (body, main, cards)
     - Then text colors (primary, secondary, muted)
     - Then border colors
     - Then semantic colors (buttons, badges, alerts)
     - Finally shadows and gradients
   - **Test incrementally**: After each section, test pages render correctly
   - **Verify**: All components use variables, no hardcoded colors remain

2. **Framework Theme Files**
   - **Create light theme**: `webapp/view/themes/light.css` (can be empty, uses `:root` defaults)
   - **Create dark theme**: `webapp/view/themes/dark.css` (full overrides using `[data-theme="dark"]`)
   - **Create metadata files**:
     - `webapp/view/themes/light.json` (with all required fields)
     - `webapp/view/themes/dark.json` (with all required fields)
   - **Create preview images**:
     - `webapp/view/themes/light.png` (500x200, screenshot of light theme)
     - `webapp/view/themes/dark.png` (500x200, screenshot of dark theme)
   - **Test theme files**: Verify all files are readable and valid

3. **Header Template Update**
   - **Implement concat helper**: Add `concat` helper in `handlebar.js` (simple string concatenation)
   - **Add theme CSS link**: Insert after `jpulse-common.css` link
   - **Add data-theme attribute**: Set on `<html>` or `<body>` tag
   - **Test scenarios**:
     - Unauthenticated user → light theme
     - Authenticated user with light preference → light theme
     - Authenticated user with dark preference → dark theme
     - Authenticated user with missing theme → light theme (fallback)
     - Missing theme CSS file → graceful degradation

4. **Theme Application & Testing**
   - **Verify data-theme attribute**: Check it's set correctly on page load
   - **Test CSS variable application**: Verify dark theme variables override light theme
   - **Test all components**: Verify buttons, cards, forms, alerts work in both themes
   - **Test responsive design**: Verify themes work on mobile/tablet/desktop
   - **Test browser compatibility**: Verify CSS variables work in target browsers

**Deliverables**:
- ✅ Standardized CSS variables in `jpulse-common.css`
- ✅ Light and dark theme files (CSS, JSON, PNG)
- ✅ Theme loading in header template
- ✅ All components use CSS variables

---

### Phase 2: Theme Discovery & Plugin Support (2-3 days)

**Objective**: Enable plugin and site themes with auto-discovery

**Tasks**:
1. **Theme Manager Implementation**
   - **Create file**: `webapp/utils/theme-manager.js`
   - **Implement initialize()**: Register with cache-manager, configure cache settings
   - **Implement discoverThemes()**:
     - Use `PathResolver.listFiles()` with proper matchFunction and readDirFunction
     - Parse JSON files with error handling
     - Validate theme names and required fields
     - Build theme objects with source detection
   - **Implement getThemeNames()**: Return sorted array of theme names
   - **Implement getCacheStats()**: Return cache statistics for monitoring
   - **Add JSDoc comments**: Document all methods with examples
   - **Test discovery**:
     - Framework themes discovered
     - Plugin themes discovered (create test plugin)
     - Site themes discovered (create test site theme)
     - Priority resolution (site overrides plugin overrides framework)

2. **Bootstrap Integration**
   - **Add Step 16.1**: Initialize ThemeManager after UserModel available, before schema finalization
   - **Add Step 16.2**: Extend UserModel schema with discovered themes
   - **Error handling**: If no themes discovered, log warning but don't fail bootstrap
   - **Test bootstrap**: Verify themes discovered and schema extended
   - **Test enum API**: Verify `/api/1/user/enums?fields=preferences.theme` returns theme names
   - **Test schema extension**: Verify `UserModel.getEnums()` includes themes

3. **Dynamic Themes Table**
   - **Add to DYNAMIC_CONTENT_REGISTRY**: Three generators (table, list, count)
   - **Implement _generateThemesTable()**:
     - Handle source filtering
     - Sort by source then name
     - Format markdown table with preview images
     - Handle empty results
   - **Implement _generateThemesList()**:
     - Handle source filtering
     - Format markdown list with preview images
     - Handle empty results
   - **Test generators**:
     - All themes
     - Filtered by source
     - Empty results
     - Invalid source parameter

4. **Documentation**
   - **Create docs/themes.md**:
     - Overview of theme system
     - Dynamic themes table
     - Sections for framework/plugin/site themes
     - How to select theme
   - **Create docs/plugins/creating-themes.md**:
     - Step-by-step guide
     - CSS variable reference (complete list)
     - JSON metadata structure
     - Preview image requirements
     - File structure
     - Testing checklist
   - **Update docs/style-reference.md**:
     - Add theme system section
     - Document CSS variables
     - Show theme file examples
   - **Update docs/api-reference.md**:
     - Document theme metadata in enums API
     - Show example responses

5. **Example Plugin Theme**
   - **Create test plugin**: `plugins/test-theme/` with minimal structure
   - **Add theme files**: CSS, JSON, PNG
   - **Test discovery**: Verify plugin theme discovered
   - **Test loading**: Verify theme CSS loads correctly
   - **Test profile dropdown**: Verify theme appears in user profile
   - **Test selection**: Verify user can select and apply theme
   - **Document example**: Use as reference in plugin developer guide

**Deliverables**:
- ✅ Theme manager service
- ✅ Bootstrap integration
- ✅ Dynamic themes table generator
- ✅ Plugin developer documentation
- ✅ Example plugin theme

---

### Phase 3: Enhanced UX (1 day, optional)

**Objective**: Improve theme selection experience

**Tasks**:
1. **Theme Metadata API**
   - Extend `/api/1/user/enums` to return full theme metadata
   - Include preview image URLs
   - Test API returns correct data

2. **Profile Page Enhancements**
   - Show theme previews (500x200 image) next to select theme dropdown
   - Group themes by source (Built-in, Plugins, Site)
   - Improve theme selection UI

**Deliverables**:
- ✅ Enhanced theme metadata API
- ✅ Improved profile page theme selector

---

## Testing Checklist

### Phase 1 Testing
- [ ] Light theme loads for unauthenticated users
- [ ] User-selected theme loads for authenticated users
- [ ] Theme fallback to light if selected theme missing
- [ ] All CSS variables work across all components
- [ ] Dark theme renders correctly
- [ ] Theme CSS files are cached properly
- [ ] Theme preview images display correctly

### Phase 2 Testing

**Theme Discovery**:
- [ ] Framework themes discovered correctly (light, dark)
- [ ] Plugin themes discovered and available
- [ ] Site themes discovered and available
- [ ] Site themes override plugin themes (priority)
- [ ] Plugin themes override framework themes (priority)
- [ ] Invalid JSON files skipped (error logged, discovery continues)
- [ ] Invalid theme names skipped (error logged, theme skipped)
- [ ] Missing JSON files handled (theme not discovered, no error)

**Schema Integration**:
- [ ] Theme names appear in `UserModel` schema enum
- [ ] Theme names appear in `/api/1/user/enums?fields=preferences.theme`
- [ ] Schema extension doesn't break existing functionality
- [ ] Default theme ('light') always available
- [ ] Invalid theme selection rejected by API validation

**User Interface**:
- [ ] Theme dropdown populated dynamically from enum
- [ ] All discovered themes appear in dropdown
- [ ] Theme selection saves correctly
- [ ] Theme selection persists across sessions
- [ ] Theme preview images display in profile page (if implemented)

**Dynamic Content**:
- [ ] `%DYNAMIC{themes-list-table}%` generates correct table
- [ ] `%DYNAMIC{themes-list}%` generates correct list
- [ ] `%DYNAMIC{themes-count}%` returns correct count
- [ ] Source filtering works (`source="framework"`, `source="plugin"`, `source="site"`)
- [ ] Empty results handled correctly (shows "_No themes match the criteria._")
- [ ] Preview images display in markdown table
- [ ] Theme metadata displayed correctly (name, label, description, author, source)

**Example Plugin**:
- [ ] Test plugin theme discovered
- [ ] Test plugin theme CSS loads correctly
- [ ] Test plugin theme appears in profile dropdown
- [ ] Test plugin theme can be selected and applied
- [ ] Test plugin theme preview image displays
- [ ] Test plugin theme appears in dynamic table

### Phase 3 Testing
- [ ] Theme metadata API returns correct data
- [ ] Theme previews display in profile page
- [ ] Theme grouping works correctly

---

## Documentation Requirements

### Plugin Developer Guide

**File**: `docs/plugins/creating-themes.md`

**Content**:
- How to create a theme plugin
- CSS variable reference (complete list)
- Theme metadata JSON structure
- Preview image requirements (500x200)
- File structure and naming conventions
- Testing your theme
- Example theme implementation

### Theme Documentation Page

**File**: `docs/themes.md`

**Content**:
- Overview of theme system
- Dynamic themes table: `%DYNAMIC{themes-list-table}%`
- Framework themes section
- Plugin themes section
- Site themes section
- How to select a theme
- Creating custom themes link

### Style Reference Update

**File**: `docs/style-reference.md`

**Content**:
- Theme system section
- CSS variable documentation
- Theme file structure
- How themes work

### API Reference Update

**File**: `docs/api-reference.md`

**Content**:
- Theme metadata in `/api/1/user/enums` response
- Example response showing theme enum values
- Theme selection via `/api/1/user` PUT endpoint

**API Endpoint Details**:

**GET `/api/1/user/enums?fields=preferences.theme`**:
```json
{
    "success": true,
    "data": {
        "preferences.theme": ["light", "dark", "ocean", "corporate"]
    }
}
```

**PUT `/api/1/user`** (update theme preference):
```json
{
    "preferences": {
        "theme": "dark"
    }
}
```

**Response**:
```json
{
    "success": true,
    "message": "User updated successfully",
    "data": {
        "preferences": {
            "theme": "dark"
        }
    }
}
```

**Validation**:
- Theme must be in enum (validated by UserModel)
- Invalid theme returns 400 error with message
- Theme preference saved to user document
- Next page load uses new theme

---

## Usage Examples

### Dynamic Content Tokens

```markdown
<!-- All themes -->
%DYNAMIC{themes-list-table}%

<!-- Only framework themes -->
%DYNAMIC{themes-list-table source="framework"}%

<!-- Only plugin themes -->
%DYNAMIC{themes-list-table source="plugin"}%

<!-- Only site themes -->
%DYNAMIC{themes-list-table source="site"}%

<!-- Bullet list format -->
%DYNAMIC{themes-list}%

<!-- Count -->
There are %DYNAMIC{themes-count}% themes available.
```

### Creating a Plugin Theme

**Step 1: Create Plugin Structure**

**Important naming convention**:
- Plugin name must be `{theme-name}-theme` (e.g., `ocean-theme`)
- Theme files use theme name without `-theme` suffix (e.g., `ocean.css`, `ocean.json`, `ocean.png`)
- CSS selector uses theme name: `[data-theme="ocean"]`

```
plugins/ocean-theme/
├── plugin.json          (standard plugin metadata)
├── webapp/
│   └── view/
│       └── themes/
│           ├── ocean.css
│           ├── ocean.json
│           └── ocean.png
```

**Step 2: Define Theme CSS**
Create `plugins/ocean-theme/webapp/view/themes/ocean.css`:
```css
/* Ocean Theme */
[data-theme="ocean"] {
    /* Background Colors */
    --jp-theme-bg-body: #f0f0f0;
    --jp-theme-bg-primary: #ffffff;
    --jp-theme-bg-secondary: #f8f8f8;
    --jp-theme-bg-tertiary: #e8e8e8;

    /* Text Colors */
    --jp-theme-text-primary: #222222;
    --jp-theme-text-secondary: #555555;
    --jp-theme-text-muted: #888888;
    --jp-theme-text-inverse: #ffffff;

    /* Border Colors */
    --jp-theme-border-color: #dddddd;
    --jp-theme-border-light: #eeeeee;
    --jp-theme-border-dark: #bbbbbb;

    /* Primary Color */
    --jp-theme-color-primary: #0066cc;
    --jp-theme-color-primary-hover: #0052a3;
    --jp-theme-color-primary-dark: #004080;

    /* ... override all other variables ... */

    /* Header */
    --jp-theme-header-bg: linear-gradient(135deg, #0066cc, #004080);
    --jp-theme-header-text: #ffffff;

    /* Shadows */
    --jp-theme-shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
    --jp-theme-shadow-md: 0 2px 10px rgba(0,0,0,0.12);
    --jp-theme-shadow-lg: 0 4px 12px rgba(0,0,0,0.15);
}
```

**Step 3: Define Theme Metadata**
Create `plugins/ocean-theme/webapp/view/themes/ocean.json`:
```json
{
    "name": "ocean",
    "label": "Ocean Blue",
    "description": "Deep blue theme inspired by the ocean depths",
    "author": "Your Name",
    "version": "1.0.0",
    "source": "plugin",
    "pluginName": "ocean-theme"
}
```

**Important**:
- `name` must match filename (without `.json`) and must be theme name without `-theme` suffix
- `name` is used in CSS selector: `[data-theme="ocean"]`
- `pluginName` is the full plugin name: `ocean-theme`
- All fields are required (no optional fields)
- `preview` field is omitted - preview image filename is derived as `{name}.png` (e.g., `ocean.png`)

**Step 4: Create Preview Image**
Create `plugins/ocean-theme/webapp/view/themes/ocean.png`:
- Size: 500x200 pixels
- Format: PNG
- Content: Screenshot of theme applied to a sample page
- Shows: Header, main content area, buttons, cards (representative sample)

**Step 5: Enable Plugin**
- Plugin automatically discovered on next app start
- Theme automatically discovered when plugin is enabled
- Theme appears in user profile dropdown as "Ocean Blue"
- No code changes needed!

**Step 6: Test Theme**
- Select "Ocean Blue" theme in user profile
- Verify CSS loads correctly (`/themes/ocean.css`)
- Verify `data-theme="ocean"` attribute is set on page
- Verify all components render correctly
- Verify preview image displays (`/themes/ocean.png`)
- Test in multiple browsers

---

## Scope Assessment

**Difficulty**: Medium-High (4-6 days)

**Breakdown**:
- Phase 1: 2-3 days (CSS standardization is extensive)
- Phase 2: 2-3 days (discovery, integration, documentation)
- Phase 3: 1 day (optional enhancements)

**Complexity Factors**:
- ✅ Low: Schema extension mechanism exists
- ⚠️ Medium: CSS variable standardization (many components to update)
- ✅ Low: Plugin discovery (follows existing patterns)
- ⚠️ Medium: Testing (ensure themes work across all components)

**Risks**:
- CSS variable migration may miss some hardcoded colors
- Theme conflicts need clear resolution (handled by priority)
- Performance: many themes could increase CSS size (mitigated by loading only selected theme)

---

## Success Criteria

1. ✅ Framework themes (light/dark) work correctly
2. ✅ Plugin themes auto-discovered and available
3. ✅ Site themes override plugin themes
4. ✅ Users can select themes in profile
5. ✅ Theme selection persists across sessions
6. ✅ Dynamic themes table generates correctly
7. ✅ All components use CSS variables
8. ✅ Documentation complete and accurate
9. ✅ Example plugin theme works end-to-end

---

## Related Work Items

- **W-098**: Framework/site separation (append mode) - CSS loading pattern
- **W-104**: Dynamic markdown content - Dynamic table pattern
- **W-116**: Handlebars plugin interface - Auto-discovery pattern
- **W-107**: User profiles data-driven - Schema extension pattern
- **W-037**: view: create themes (cancelled)

---

## Implementation Notes

### File Loading Strategy

**Theme CSS Files**:
- Loaded dynamically via `<link>` tag (not appended like `jpulse-common.css`)
- Only selected theme CSS loaded to browser (performance optimization)
- Each theme CSS file is separate (no concatenation)
- Browser caches CSS files (timestamp ensures fresh on change)

**Theme JSON Files**:
- Cached server-side via `cache-manager.js` (same as ViewController)
- Re-discovered on each `discoverThemes()` call (but JSON content is cached)
- Not served to browser (internal use only)

**Theme PNG Files**:
- Served as static assets via ViewController or static middleware
- Browser caches images (timestamp in URL for cache busting if needed)
- Required per spec, but theme works without preview image

### Priority Resolution

**Theme Discovery Priority**:
1. Framework themes (lowest priority, loaded first)
2. Plugin themes (in plugin dependency order, overwrite framework)
3. Site themes (highest priority, overwrite everything)

**File Resolution Priority** (via PathResolver):
- Same as view resolution: site > plugins > framework
- Automatic via `PathResolver.resolveModuleWithPlugins()`
- No manual priority handling needed

### SVG Icons

**Current Status**: SVG icons already work with light on dark and dark on light themes
- **No changes needed** for SVG icon theming
- Icons use currentColor or explicit colors that work in both themes
- Framework handles icon colors automatically

### Cache Strategy

**Server-Side Caching**:
- Theme JSON files cached via `cache-manager`
- Cache auto-refreshes every `checkInterval` minutes (default: 5)
- Changed files automatically re-read
- Cache cleared on app restart

**Browser Caching**:
- CSS files cached by browser
- Timestamp in URL ensures fresh on file change
- PNG files cached by browser
- No manual cache clearing needed

### Error Handling Philosophy

**Fail Gracefully**:
- Invalid theme JSON → Skip theme, continue discovery
- Missing theme CSS → Fallback to light theme, no page break
- Missing preview image → Theme works, just no preview
- Invalid theme name → Skip theme, log error

**User Experience**:
- Theme selection always works (fallback to light)
- Page always renders (graceful degradation)
- Errors logged but don't break functionality

### Performance Considerations

**Discovery Performance**:
- Called once during bootstrap
- Called when generating dynamic content
- JSON files cached, so re-discovery is fast
- No filesystem I/O on cached files

**Runtime Performance**:
- Only selected theme CSS loaded (not all themes)
- CSS file size: typically 5-20KB per theme
- Negligible impact on page load time
- Browser caches CSS (subsequent loads instant)

**Memory Usage**:
- Theme metadata: ~1KB per theme
- Theme cache: ~50KB for 50 themes
- Negligible memory footprint

### Security Considerations

**Theme Name Validation**:
- Alphanumeric, dash, underscore only
- Prevents path traversal attacks
- Prevents filesystem issues

**File Path Resolution**:
- Uses `PathResolver` (already secure)
- No user-controlled paths
- Relative paths only

**JSON Parsing**:
- Standard `JSON.parse()` (safe)
- No code execution
- Invalid JSON handled gracefully

### Testing Strategy

**Unit Tests**:
- Test `ThemeManager.discoverThemes()` with mock files
- Test `ThemeManager.getThemeNames()` returns correct array
- Test error handling (invalid JSON, missing files)
- Test priority resolution (site > plugins > framework)

**Integration Tests**:
- Test bootstrap integration (themes discovered, schema extended)
- Test API endpoint (`/api/1/user/enums` returns themes)
- Test theme selection (user can select, preference saved)
- Test theme loading (CSS loads correctly, applies correctly)

**Manual Testing**:
- Test all components in light theme
- Test all components in dark theme
- Test theme switching (light → dark → light)
- Test theme fallback (missing theme → light)
- Test plugin theme discovery and loading
- Test site theme discovery and loading
- Test dynamic themes table generation
