#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Plugin Manager CLI
 * @tagline         Plugin management commands for jPulse Framework
 * @description     Handles plugin install, update, remove, enable, disable, list, info, publish
 * @file            bin/plugin-manager-cli.js
 * @version         1.5.0
 * @release         2026-01-25
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Opus 4
 */

import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get script file name for warning messages
const SCRIPT_FILE = 'bin/plugin-manager-cli.js';

// Error codes for programmatic handling
const ERROR_CODES = {
    PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
    INVALID_PLUGIN: 'INVALID_PLUGIN',
    VERSION_MISMATCH: 'VERSION_MISMATCH',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    NPM_ERROR: 'NPM_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR'
};

/**
 * Custom error class with code and suggestions
 */
class PluginError extends Error {
    constructor(message, code, suggestions = []) {
        super(message);
        this.name = 'PluginError';
        this.code = code;
        this.suggestions = suggestions;
    }
}

/**
 * Validate plugin.json structure and required fields
 * @param {object} pluginJson - Parsed plugin.json
 * @param {string} pluginPath - Path to plugin (for error messages)
 * @returns {object} { valid: boolean, errors: string[], warnings: string[] }
 */
function validatePluginJson(pluginJson, pluginPath) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!pluginJson.name) {
        errors.push('Missing required field: name');
    } else if (!/^[a-z0-9-]+$/.test(pluginJson.name)) {
        errors.push('Invalid name: must be lowercase alphanumeric with hyphens');
    }

    if (!pluginJson.version) {
        errors.push('Missing required field: version');
    } else if (!/^\d+\.\d+\.\d+/.test(pluginJson.version)) {
        warnings.push('Version should follow semver format (e.g., 1.0.0)');
    }

    // Recommended fields
    if (!pluginJson.summary) {
        warnings.push('Missing recommended field: summary');
    }
    if (!pluginJson.author) {
        warnings.push('Missing recommended field: author');
    }
    if (!pluginJson.jpulseVersion) {
        warnings.push('Missing recommended field: jpulseVersion');
    }

    // Validate config schema if present
    if (pluginJson.config?.schema) {
        if (!Array.isArray(pluginJson.config.schema)) {
            errors.push('config.schema must be an array');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Parse npm error output for user-friendly messages
 * @param {string} stderr - npm stderr output
 * @returns {object} { code, message, suggestion }
 */
function parseNpmError(stderr) {
    const lowerStderr = stderr.toLowerCase();

    if (lowerStderr.includes('e404') || lowerStderr.includes('not found')) {
        return {
            code: ERROR_CODES.PLUGIN_NOT_FOUND,
            message: 'Package not found in registry',
            suggestion: 'Check the package name and registry URL. For GitHub Packages, use --registry=https://npm.pkg.github.com'
        };
    }

    if (lowerStderr.includes('e401') || lowerStderr.includes('unauthorized')) {
        return {
            code: ERROR_CODES.PERMISSION_ERROR,
            message: 'Authentication required',
            suggestion: 'Run `npm login --registry=https://npm.pkg.github.com` to authenticate'
        };
    }

    if (lowerStderr.includes('e403') || lowerStderr.includes('forbidden')) {
        return {
            code: ERROR_CODES.PERMISSION_ERROR,
            message: 'Access denied',
            suggestion: 'Check your npm token permissions and package access settings'
        };
    }

    if (lowerStderr.includes('e409') || lowerStderr.includes('conflict')) {
        return {
            code: ERROR_CODES.ALREADY_EXISTS,
            message: 'Version already exists',
            suggestion: 'Bump the version in plugin.json before publishing'
        };
    }

    if (lowerStderr.includes('enotfound') || lowerStderr.includes('network') || lowerStderr.includes('etimedout')) {
        return {
            code: ERROR_CODES.NETWORK_ERROR,
            message: 'Network error',
            suggestion: 'Check your internet connection and try again'
        };
    }

    if (lowerStderr.includes('eperm') || lowerStderr.includes('eacces')) {
        return {
            code: ERROR_CODES.PERMISSION_ERROR,
            message: 'Permission denied',
            suggestion: 'Check file permissions or try running with elevated privileges'
        };
    }

    return {
        code: ERROR_CODES.NPM_ERROR,
        message: 'npm command failed',
        suggestion: null
    };
}

/**
 * Install plugin npm dependencies into the plugin directory.
 *
 * Why: the CLI installs plugin packages with `--no-save` at the site root, which can be pruned by a later
 * `npm install`. Installing runtime dependencies inside the plugin directory makes the plugin self-contained.
 *
 * This is only done in "site" context to avoid polluting the framework repo with plugin-local node_modules.
 *
 * @param {string} pluginPath - Destination path (e.g., <projectRoot>/plugins/<name>)
 * @param {object} pluginJson - Parsed plugin.json
 * @param {object} options - CLI options (may include registry)
 * @param {string} context - 'site' | 'framework' | 'unknown'
 */
function installPluginRuntimeDependencies(pluginPath, pluginJson, options, context) {
    if (context !== 'site') {
        return;
    }

    const pluginPackageJsonPath = path.join(pluginPath, 'package.json');
    const hasPackageJson = fs.existsSync(pluginPackageJsonPath);
    const npmDeps = pluginJson?.dependencies?.npm || {};

    if (!hasPackageJson && Object.keys(npmDeps).length === 0) {
        return;
    }

    console.log('  → Installing plugin npm dependencies (plugin-local node_modules)...');

    let npmCmd;
    if (hasPackageJson) {
        npmCmd = 'npm install --omit=dev --legacy-peer-deps';
    } else {
        const packageSpecs = Object.entries(npmDeps).map(([name, version]) => `${name}@${version}`);
        npmCmd = `npm install ${packageSpecs.join(' ')} --no-save --legacy-peer-deps`;
    }

    if (options?.registry) {
        npmCmd += ` --registry=${options.registry}`;
    }

    try {
        execSync(npmCmd, { cwd: pluginPath, stdio: 'pipe' });
        console.log('  ✓ Installed plugin npm dependencies');
    } catch (error) {
        const stderr = error.stderr?.toString() || error.message;
        const parsed = parseNpmError(stderr);
        const suggestions = parsed.suggestion ? [parsed.suggestion] : [];
        throw new PluginError(
            `Plugin npm dependency install failed: ${parsed.message}`,
            parsed.code,
            suggestions
        );
    }
}

/**
 * Detect project root and context
 * @returns {object} { projectRoot, pluginsDir, registryPath, context }
 */
function detectPaths() {
    const cwd = process.cwd();

    // Try to find plugins directory
    let projectRoot = cwd;
    let context = 'unknown';

    // Check if we're in a site (has site/webapp/app.conf)
    if (fs.existsSync(path.join(cwd, 'site/webapp/app.conf'))) {
        projectRoot = cwd;
        context = 'site';
    }
    // Check if we're in framework repo (has webapp/app.conf directly)
    else if (fs.existsSync(path.join(cwd, 'webapp/app.conf'))) {
        projectRoot = cwd;
        context = 'framework';
    }

    const pluginsDir = path.join(projectRoot, 'plugins');
    const jpulseDir = path.join(projectRoot, '.jpulse');
    const registryPath = path.join(jpulseDir, 'plugins.json');

    return { projectRoot, pluginsDir, jpulseDir, registryPath, context };
}

/**
 * Load plugin registry from .jpulse/plugins.json
 * @param {string} registryPath - Path to plugins.json
 * @returns {object} Registry object
 */
function loadRegistry(registryPath) {
    if (fs.existsSync(registryPath)) {
        try {
            return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        } catch (error) {
            // Ignore parse errors, return empty registry
        }
    }
    return { plugins: [], loadOrder: [], lastScan: null };
}

/**
 * Discover plugins in plugins/ directory
 * @param {string} pluginsDir - Path to plugins directory
 * @param {object} registry - Loaded registry for enabled status
 * @returns {object[]} Array of plugin info objects
 */
function discoverPlugins(pluginsDir, registry) {
    const plugins = [];

    if (!fs.existsSync(pluginsDir)) {
        return plugins;
    }

    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }

        const pluginName = entry.name;
        const pluginPath = path.join(pluginsDir, pluginName);
        const pluginJsonPath = path.join(pluginPath, 'plugin.json');

        // Skip if no plugin.json
        if (!fs.existsSync(pluginJsonPath)) {
            continue;
        }

        try {
            const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));

            // Get enabled status from registry
            const registryEntry = registry.plugins?.find(p => p.name === pluginName);
            const enabled = registryEntry?.enabled ?? pluginJson.autoEnable ?? true;

            plugins.push({
                name: pluginName,
                version: pluginJson.version || '0.0.0',
                icon: pluginJson.icon || '🔌',
                summary: pluginJson.summary || '',
                description: pluginJson.description || '',
                author: pluginJson.author || '',
                jpulseVersion: pluginJson.jpulseVersion || '',
                autoEnable: pluginJson.autoEnable ?? true,
                enabled: enabled,
                npmPackage: pluginJson.npmPackage || '',
                dependencies: pluginJson.dependencies || {},
                config: pluginJson.config || {},
                path: pluginPath,
                source: registryEntry?.source || 'local',
                installedAt: registryEntry?.installedAt || null,
                enabledAt: registryEntry?.enabledAt || null
            });
        } catch (error) {
            // Skip plugins with invalid JSON
            console.error(`⚠️  WARNING: Failed to parse plugin.json for ${pluginName}: ${error.message} [${SCRIPT_FILE}]`);
        }
    }

    return plugins;
}

/**
 * Resolve plugin source to npm package name
 * @param {string} source - Plugin source (name, npm package, path, etc.)
 * @returns {object} { type, packageName, version, localPath }
 */
function resolvePluginSource(source) {
    // Local path (starts with . or /)
    if (source.startsWith('./') || source.startsWith('/') || source.startsWith('../')) {
        return {
            type: 'local',
            packageName: null,
            version: null,
            localPath: path.resolve(source)
        };
    }

    // Local tarball (.tgz file)
    if (source.endsWith('.tgz')) {
        return {
            type: 'tarball',
            packageName: null,
            version: null,
            localPath: path.resolve(source)
        };
    }

    // GitHub shorthand (github:org/repo)
    if (source.startsWith('github:')) {
        const repo = source.replace('github:', '');
        return {
            type: 'github',
            packageName: `github:${repo}`,
            version: null,
            localPath: null
        };
    }

    // Git URL
    if (source.startsWith('git+') || source.startsWith('git://')) {
        return {
            type: 'git',
            packageName: source,
            version: null,
            localPath: null
        };
    }

    // Scoped npm package (@org/package or @org/package@version)
    if (source.startsWith('@')) {
        const match = source.match(/^(@[^@]+)(?:@(.+))?$/);
        if (match) {
            return {
                type: 'npm',
                packageName: match[1],
                version: match[2] || null,
                localPath: null
            };
        }
    }

    // Simple name (auth-mfa or auth-mfa@version) -> @jpulse-net/plugin-{name}
    const match = source.match(/^([a-z0-9-]+)(?:@(.+))?$/i);
    if (match) {
        const name = match[1];
        const version = match[2] || null;
        return {
            type: 'npm',
            packageName: `@jpulse-net/plugin-${name}`,
            version: version,
            localPath: null
        };
    }

    // Fallback - treat as npm package
    return {
        type: 'npm',
        packageName: source,
        version: null,
        localPath: null
    };
}

/**
 * Save plugin registry
 * @param {string} registryPath - Path to plugins.json
 * @param {object} registry - Registry object to save
 */
function saveRegistry(registryPath, registry) {
    const jpulseDir = path.dirname(registryPath);
    if (!fs.existsSync(jpulseDir)) {
        fs.mkdirSync(jpulseDir, { recursive: true });
    }
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 4));
}

/**
 * Copy directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            // Skip .git directories
            if (entry.name === '.git') {
                continue;
            }
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Check jPulse version compatibility
 * @param {string} requiredVersion - Required version string (e.g., ">=1.3.8")
 * @param {string} currentVersion - Current jPulse version
 * @returns {boolean} True if compatible
 */
function checkVersionCompatibility(requiredVersion, currentVersion) {
    if (!requiredVersion) {
        return true;
    }

    // Parse requirement (e.g., ">=1.3.8")
    const match = requiredVersion.match(/^([<>=]+)?(.+)$/);
    if (!match) {
        return true;
    }

    const operator = match[1] || '>=';
    const required = match[2];

    // Simple version comparison
    const parseVersion = (v) => v.split('.').map(n => parseInt(n, 10) || 0);
    const reqParts = parseVersion(required);
    const curParts = parseVersion(currentVersion);

    // Compare version parts
    for (let i = 0; i < 3; i++) {
        const req = reqParts[i] || 0;
        const cur = curParts[i] || 0;

        if (operator === '>=' || operator === '>') {
            if (cur > req) return true;
            if (cur < req) return false;
        } else if (operator === '<=' || operator === '<') {
            if (cur < req) return true;
            if (cur > req) return false;
        } else if (operator === '=') {
            if (cur !== req) return false;
        }
    }

    // Equal versions
    return operator !== '>' && operator !== '<';
}

/**
 * Get current jPulse framework version
 * @param {string} projectRoot - Project root directory
 * @returns {string} Version string
 */
function getFrameworkVersion(projectRoot) {
    // Try to read from package.json
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            // For framework repo, use version directly
            if (pkg.name === '@jpulse-net/jpulse-framework') {
                return pkg.version;
            }
        } catch (error) {
            // Ignore
        }
    }

    // For sites, read actual installed version from node_modules
    const installedPackageJson = path.join(projectRoot, 'node_modules', '@jpulse-net', 'jpulse-framework', 'package.json');
    if (fs.existsSync(installedPackageJson)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(installedPackageJson, 'utf8'));
            if (pkg.version) {
                return pkg.version;
            }
        } catch (error) {
            // Ignore
        }
    }

    return '1.3.8'; // Default fallback
}

/**
 * Plugin Manager CLI
 * Handles all `npx jpulse plugin` subcommands
 */
class PluginCLI {

    /**
     * Main entry point
     * @param {string[]} args - Command line arguments (after 'plugin')
     */
    static async run(args) {
        const action = args[0];
        const target = args[1];
        const options = this.parseOptions(args.slice(1));

        try {
            switch (action) {
                case 'list':
                    return await this.list(options);
                case 'info':
                    return await this.info(target, options);
                case 'install':
                    return await this.install(target, options);
                case 'update':
                    return await this.update(target, options);
                case 'remove':
                case 'uninstall':
                    return await this.remove(target, options);
                case 'enable':
                    return await this.enable(target, options);
                case 'disable':
                    return await this.disable(target, options);
                case 'publish':
                    return await this.publish(target, options);
                case 'help':
                case '--help':
                case '-h':
                    return this.showHelp();
                case '--version':
                case '-v':
                    return this.showVersion();
                default:
                    this.showHelp();
                    process.exit(action ? 1 : 0);
            }
        } catch (error) {
            console.error('');
            console.error(`❌ Error: ${error.message}`);

            // Show suggestions if available
            if (error instanceof PluginError && error.suggestions.length > 0) {
                console.error('');
                console.error('Suggestions:');
                for (const suggestion of error.suggestions) {
                    console.error(`  • ${suggestion}`);
                }
            }

            // Show error code for debugging
            if (error instanceof PluginError && error.code) {
                console.error('');
                console.error(`Error code: ${error.code}`);
            }

            console.error('');
            process.exit(1);
        }
    }

    /**
     * Parse command line options
     * @param {string[]} args - Arguments to parse
     * @returns {object} Parsed options
     */
    static parseOptions(args) {
        const options = {
            all: false,
            json: false,
            force: false,
            enable: null,      // null = use plugin default, true = force enable, false = force disable
            registry: null,
            tag: null
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (arg === '--all' || arg === '-a') {
                options.all = true;
            } else if (arg === '--json') {
                options.json = true;
            } else if (arg === '--force' || arg === '-f') {
                options.force = true;
            } else if (arg === '--enable') {
                options.enable = true;
            } else if (arg === '--no-enable') {
                options.enable = false;
            } else if (arg === '--registry' && args[i + 1]) {
                options.registry = args[++i];
            } else if (arg.startsWith('--registry=')) {
                options.registry = arg.split('=')[1];
            } else if (arg === '--tag' && args[i + 1]) {
                options.tag = args[++i];
            } else if (arg.startsWith('--tag=')) {
                options.tag = arg.split('=')[1];
            }
        }

        return options;
    }

    /**
     * Show help message
     */
    static showHelp() {
        console.log(`
jPulse Plugin Manager

Usage: npx jpulse plugin <action> [name] [options]

Actions:
  list [--all] [--json]     List installed plugins
  info <name>               Show detailed plugin information
  install <source>          Install plugin from npm, git, or local path
  update [name]             Update plugin(s) to latest version
  remove <name>             Remove an installed plugin
  enable <name>             Enable a disabled plugin
  disable <name>            Disable an enabled plugin
  publish <name>            Publish plugin to npm registry

Options:
  --help, -h                Show this help message
  --version, -v             Show CLI version
  --all, -a                 Include disabled plugins in list
  --json                    Output as JSON
  --force, -f               Skip confirmations
  --enable                  Enable plugin after install
  --no-enable               Don't enable plugin after install
  --registry=<url>          Use custom npm registry
  --tag=<tag>               Publish with specific tag

Examples:
  npx jpulse plugin list
  npx jpulse plugin list --all
  npx jpulse plugin info auth-mfa
  npx jpulse plugin install auth-mfa
  npx jpulse plugin install @jpulse-net/plugin-auth-mfa@1.0.0
  npx jpulse plugin update
  npx jpulse plugin update auth-mfa
  npx jpulse plugin enable auth-mfa
  npx jpulse plugin disable auth-mfa
  npx jpulse plugin remove auth-mfa
  npx jpulse plugin publish auth-mfa

Note: Plugins can also be managed via Admin UI at /admin/plugins
`);
    }

    /**
     * Show version
     */
    static showVersion() {
        console.log('jPulse Plugin Manager v1.3.8');
    }

    // ========================================================================
    // Command Implementations
    // ========================================================================

    /**
     * List installed plugins
     * @param {object} options - Command options
     */
    static async list(options) {
        const { pluginsDir, registryPath } = detectPaths();
        const registry = loadRegistry(registryPath);
        const plugins = discoverPlugins(pluginsDir, registry);

        // Filter by enabled status unless --all
        const filteredPlugins = options.all
            ? plugins
            : plugins.filter(p => p.enabled);

        // JSON output
        if (options.json) {
            console.log(JSON.stringify(filteredPlugins, null, 2));
            return;
        }

        // Table output
        console.log('');
        console.log('jPulse Plugins');
        console.log('');

        if (filteredPlugins.length === 0) {
            console.log('  No plugins found.');
            if (!options.all) {
                console.log('  Use --all to include disabled plugins.');
            }
            console.log('');
            return;
        }

        // Calculate column widths
        const nameWidth = Math.max(16, ...filteredPlugins.map(p => p.name.length)) + 2;
        const versionWidth = 10;
        const statusWidth = 10;

        // Header
        const header = `  ${'Name'.padEnd(nameWidth)}${'Version'.padEnd(versionWidth)}${'Status'.padEnd(statusWidth)}Source`;
        console.log(header);
        console.log('  ' + '─'.repeat(header.length - 2));

        // Rows
        for (const plugin of filteredPlugins) {
            const status = plugin.enabled ? 'enabled' : 'disabled';
            const source = plugin.npmPackage || 'local';
            console.log(`  ${plugin.name.padEnd(nameWidth)}${plugin.version.padEnd(versionWidth)}${status.padEnd(statusWidth)}${source}`);
        }

        console.log('');
        const enabledCount = plugins.filter(p => p.enabled).length;
        const disabledCount = plugins.length - enabledCount;
        console.log(`Total: ${plugins.length} plugin(s) (${enabledCount} enabled, ${disabledCount} disabled)`);
        console.log('');
    }

    /**
     * Show plugin info
     * @param {string} name - Plugin name
     * @param {object} options - Command options
     */
    static async info(name, options) {
        if (!name || name.startsWith('-')) {
            throw new Error('Plugin name is required. Usage: npx jpulse plugin info <name>');
        }

        const { pluginsDir, registryPath } = detectPaths();
        const registry = loadRegistry(registryPath);
        const plugins = discoverPlugins(pluginsDir, registry);

        // Find plugin by name
        const plugin = plugins.find(p => p.name === name);

        if (!plugin) {
            throw new PluginError(
                `Plugin '${name}' not found in plugins/ directory.`,
                ERROR_CODES.PLUGIN_NOT_FOUND,
                [
                    `Run 'npx jpulse plugin list --all' to see installed plugins`,
                    `Run 'npx jpulse plugin install ${name}' to install it`
                ]
            );
        }

        // JSON output
        if (options.json) {
            console.log(JSON.stringify(plugin, null, 2));
            return;
        }

        // Formatted output
        console.log('');
        console.log(`Plugin: ${plugin.name}`);
        console.log('');
        console.log(`  Name:           ${plugin.name}`);
        console.log(`  Version:        ${plugin.version}`);
        console.log(`  Status:         ${plugin.enabled ? 'enabled' : 'disabled'}`);
        console.log(`  Auto-Enable:    ${plugin.autoEnable ? 'yes' : 'no'}`);
        console.log(`  Source:         ${plugin.npmPackage || 'local'}`);
        console.log('');

        if (plugin.summary) {
            console.log(`  Summary:        ${plugin.summary}`);
        }
        if (plugin.author) {
            console.log(`  Author:         ${plugin.author}`);
        }
        if (plugin.jpulseVersion) {
            console.log(`  jPulse Version: ${plugin.jpulseVersion}`);
        }
        console.log('');

        // Dependencies
        const npmDeps = plugin.dependencies?.npm || {};
        const pluginDeps = plugin.dependencies?.plugins || {};
        const npmDepsList = Object.entries(npmDeps).map(([k, v]) => `${k}@${v}`).join(', ');
        const pluginDepsList = Object.keys(pluginDeps).join(', ');

        console.log('  Dependencies:');
        console.log(`    npm:          ${npmDepsList || '(none)'}`);
        console.log(`    plugins:      ${pluginDepsList || '(none)'}`);
        console.log('');

        // Config schema info
        const configFields = plugin.config?.schema?.filter(f => f.id) || [];
        if (configFields.length > 0) {
            console.log('  Configuration:');
            const tabs = [...new Set(configFields.map(f => f.tab || 'General'))];
            console.log(`    Tabs:         ${tabs.join(', ')}`);
            console.log(`    Fields:       ${configFields.length}`);
            console.log('');
        }

        // Location and timestamps
        console.log(`  Location:       ${plugin.path}`);
        if (plugin.installedAt) {
            console.log(`  Installed:      ${plugin.installedAt}`);
        }
        if (plugin.enabledAt) {
            console.log(`  Enabled:        ${plugin.enabledAt}`);
        }
        console.log('');
    }

    /**
     * Install a plugin
     * @param {string} source - Plugin source (name, npm package, git URL, or local path)
     * @param {object} options - Command options
     */
    static async install(source, options) {
        if (!source || source.startsWith('-')) {
            throw new Error('Plugin source is required. Usage: npx jpulse plugin install <source>');
        }

        const { projectRoot, pluginsDir, jpulseDir, registryPath, context } = detectPaths();
        const resolved = resolvePluginSource(source);

        console.log('');
        console.log(`Installing plugin from ${resolved.type}: ${resolved.packageName || resolved.localPath || source}`);
        console.log('');

        // Ensure directories exist
        if (!fs.existsSync(pluginsDir)) {
            fs.mkdirSync(pluginsDir, { recursive: true });
        }
        if (!fs.existsSync(jpulseDir)) {
            fs.mkdirSync(jpulseDir, { recursive: true });
        }

        let pluginJson;
        let pluginName;
        let installedFrom;
        let destPath;

        if (resolved.type === 'local') {
            // Local path install - copy directly to plugins/
            const sourcePath = resolved.localPath;

            if (!fs.existsSync(sourcePath)) {
                throw new PluginError(
                    `Local path not found: ${sourcePath}`,
                    ERROR_CODES.PLUGIN_NOT_FOUND,
                    ['Check that the path exists and is accessible']
                );
            }

            const pluginJsonPath = path.join(sourcePath, 'plugin.json');
            if (!fs.existsSync(pluginJsonPath)) {
                throw new Error(`Not a valid plugin: missing plugin.json at ${sourcePath}`);
            }

            pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));

            // Validate plugin.json
            const validation = validatePluginJson(pluginJson, sourcePath);
            if (!validation.valid) {
                throw new PluginError(
                    `Invalid plugin.json: ${validation.errors.join(', ')}`,
                    ERROR_CODES.VALIDATION_ERROR,
                    ['Fix the errors in plugin.json and try again']
                );
            }
            if (validation.warnings.length > 0) {
                for (const warning of validation.warnings) {
                    console.log(`⚠️  WARNING: ${warning} [${SCRIPT_FILE}]`);
                }
            }

            pluginName = pluginJson.name;
            installedFrom = 'local';

            destPath = path.join(pluginsDir, pluginName);

            console.log(`  ✓ Validated plugin.json`);

            // Check if already exists
            if (fs.existsSync(destPath) && !options.force) {
                throw new PluginError(
                    `Plugin '${pluginName}' already exists at plugins/${pluginName}/`,
                    ERROR_CODES.ALREADY_EXISTS,
                    [
                        `Use --force to overwrite the existing plugin`,
                        `Or run 'npx jpulse plugin update ${pluginName}' to update`
                    ]
                );
            }

            // Copy to plugins/
            console.log(`  ✓ Copying to plugins/${pluginName}/`);
            copyDirRecursive(sourcePath, destPath);

        } else {
            // npm-based install (npm, github, git, tarball)
            const packageSpec = resolved.version
                ? `${resolved.packageName}@${resolved.version}`
                : resolved.packageName;

            console.log(`  → Fetching ${packageSpec}...`);

            // Build npm install command
            // Use --legacy-peer-deps to avoid peer dependency issues
            // (plugin peer deps on jpulse-framework may not be satisfiable during install)
            let npmCmd = `npm install ${packageSpec} --no-save --legacy-peer-deps`;
            if (options.registry) {
                npmCmd += ` --registry=${options.registry}`;
            }

            try {
                execSync(npmCmd, { cwd: projectRoot, stdio: 'pipe' });
                console.log(`  ✓ Downloaded via npm`);
            } catch (error) {
                const stderr = error.stderr?.toString() || error.message;
                const parsed = parseNpmError(stderr);
                const suggestions = parsed.suggestion ? [parsed.suggestion] : [];
                throw new PluginError(
                    `npm install failed: ${parsed.message}`,
                    parsed.code,
                    suggestions
                );
            }

            // Find the installed package in node_modules
            const nodeModulesPath = path.join(projectRoot, 'node_modules', resolved.packageName);

            if (!fs.existsSync(nodeModulesPath)) {
                throw new PluginError(
                    `Package not found in node_modules after install: ${resolved.packageName}`,
                    ERROR_CODES.NPM_ERROR,
                    ['This may be an npm caching issue. Try: npm cache clean --force']
                );
            }

            const pluginJsonPath = path.join(nodeModulesPath, 'plugin.json');
            if (!fs.existsSync(pluginJsonPath)) {
                throw new PluginError(
                    `Not a valid jPulse plugin: missing plugin.json in ${resolved.packageName}`,
                    ERROR_CODES.INVALID_PLUGIN,
                    [
                        'This npm package is not a jPulse plugin',
                        'jPulse plugins must include a plugin.json file'
                    ]
                );
            }

            pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));

            // Validate plugin.json
            const validation = validatePluginJson(pluginJson, nodeModulesPath);
            if (!validation.valid) {
                throw new PluginError(
                    `Invalid plugin.json: ${validation.errors.join(', ')}`,
                    ERROR_CODES.VALIDATION_ERROR,
                    ['The plugin has an invalid plugin.json file']
                );
            }
            if (validation.warnings.length > 0) {
                for (const warning of validation.warnings) {
                    console.log(`⚠️  WARNING: ${warning} [${SCRIPT_FILE}]`);
                }
            }

            pluginName = pluginJson.name;
            installedFrom = resolved.packageName;

            console.log(`  ✓ Validated plugin.json`);

            // Check jPulse version compatibility
            const frameworkVersion = getFrameworkVersion(projectRoot);
            if (pluginJson.jpulseVersion && !checkVersionCompatibility(pluginJson.jpulseVersion, frameworkVersion)) {
                throw new PluginError(
                    `Plugin requires jPulse ${pluginJson.jpulseVersion}, current version is ${frameworkVersion}`,
                    ERROR_CODES.VERSION_MISMATCH,
                    [
                        `Update jPulse framework to ${pluginJson.jpulseVersion} or later`,
                        `Or install an older version of this plugin compatible with ${frameworkVersion}`
                    ]
                );
            }
            console.log(`  ✓ Checked version compatibility (${pluginJson.jpulseVersion || 'any'})`);

            // Sync to plugins/
            destPath = path.join(pluginsDir, pluginName);

            if (fs.existsSync(destPath) && !options.force) {
                throw new PluginError(
                    `Plugin '${pluginName}' already exists at plugins/${pluginName}/`,
                    ERROR_CODES.ALREADY_EXISTS,
                    [
                        `Use --force to overwrite the existing plugin`,
                        `Or run 'npx jpulse plugin update ${pluginName}' to update`
                    ]
                );
            }

            console.log(`  ✓ Syncing to plugins/${pluginName}/`);
            copyDirRecursive(nodeModulesPath, destPath);
        }

        // Install plugin runtime dependencies into the plugin directory (site installs only)
        installPluginRuntimeDependencies(destPath, pluginJson, options, context);

        // Load and update registry
        const registry = loadRegistry(registryPath);
        const now = new Date().toISOString();

        // Check if plugin already in registry
        let registryEntry = registry.plugins.find(p => p.name === pluginName);
        const autoEnable = pluginJson.autoEnable ?? true;
        const shouldEnable = options.enable === true || (options.enable === null && autoEnable);

        if (!registryEntry) {
            // New plugin
            registryEntry = {
                name: pluginName,
                version: pluginJson.version,
                enabled: shouldEnable,
                autoEnable: autoEnable,
                source: installedFrom,
                installedAt: now,
                installedBy: 'cli',
                enabledAt: shouldEnable ? now : null
            };
            registry.plugins.push(registryEntry);
        } else {
            // Update existing
            registryEntry.version = pluginJson.version;
            registryEntry.source = installedFrom;
            registryEntry.installedAt = now;
            if (shouldEnable && !registryEntry.enabled) {
                registryEntry.enabled = true;
                registryEntry.enabledAt = now;
            }
        }

        // Save registry
        saveRegistry(registryPath, registry);
        console.log(`  ✓ Registered in database`);

        console.log('');
        console.log(`Plugin '${pluginName}' installed successfully!`);
        console.log('');
        console.log(`  Version:     ${pluginJson.version}`);
        console.log(`  Status:      ${shouldEnable ? 'enabled' : 'disabled'} (autoEnable: ${autoEnable ? 'yes' : 'no'})`);
        console.log(`  Location:    plugins/${pluginName}/`);
        console.log('');

        if (!shouldEnable) {
            console.log('  To enable:');
            console.log(`    npx jpulse plugin enable ${pluginName}`);
            console.log('');
            console.log('  Or configure first at:');
            console.log(`    /admin/plugins/${pluginName}`);
            console.log('');
        } else {
            console.log('  ⚠ Note: App restart may be required for full effect.');
            console.log('');
        }
    }

    /**
     * Update plugin(s)
     * @param {string} name - Plugin name (optional, updates all if omitted)
     * @param {object} options - Command options
     */
    static async update(name, options) {
        const { projectRoot, pluginsDir, registryPath, context } = detectPaths();
        const registry = loadRegistry(registryPath);
        const plugins = discoverPlugins(pluginsDir, registry);

        // Determine which plugins to update
        let pluginsToUpdate = [];

        if (name && !name.startsWith('-')) {
            // Update specific plugin
            const plugin = plugins.find(p => p.name === name);
            if (!plugin) {
                throw new PluginError(
                    `Plugin '${name}' not found.`,
                    ERROR_CODES.PLUGIN_NOT_FOUND,
                    [
                        `Run 'npx jpulse plugin list --all' to see installed plugins`,
                        `Run 'npx jpulse plugin install ${name}' to install it first`
                    ]
                );
            }
            pluginsToUpdate = [plugin];
        } else {
            // Update all plugins that have npm source
            pluginsToUpdate = plugins.filter(p => p.npmPackage);
        }

        if (pluginsToUpdate.length === 0) {
            console.log('');
            console.log('No plugins to update.');
            console.log('');
            return;
        }

        console.log('');
        console.log(`Checking ${pluginsToUpdate.length} plugin(s) for updates...`);
        console.log('');

        let updatedCount = 0;
        let failedCount = 0;

        for (const plugin of pluginsToUpdate) {
            console.log(`  ${plugin.name} (${plugin.version}):`);

            // Skip if no npm package source
            if (!plugin.npmPackage) {
                console.log(`    ⏭ Skipped (local plugin, no npm source)`);
                continue;
            }

            try {
                // Get latest version from npm
                let npmCmd = `npm view ${plugin.npmPackage} version`;
                if (options.registry) {
                    npmCmd += ` --registry=${options.registry}`;
                }

                let latestVersion;
                try {
                    latestVersion = execSync(npmCmd, { cwd: projectRoot, stdio: 'pipe' })
                        .toString().trim();
                } catch (error) {
                    console.log(`    ⚠ Could not fetch latest version from npm`);
                    failedCount++;
                    continue;
                }

                // Compare versions
                if (latestVersion === plugin.version) {
                    console.log(`    ✓ Already up to date (${plugin.version})`);
                    continue;
                }

                console.log(`    → Updating ${plugin.version} → ${latestVersion}`);

                // Fetch and install
                const packageSpec = `${plugin.npmPackage}@${latestVersion}`;
                let installCmd = `npm install ${packageSpec} --no-save --legacy-peer-deps`;
                if (options.registry) {
                    installCmd += ` --registry=${options.registry}`;
                }

                execSync(installCmd, { cwd: projectRoot, stdio: 'pipe' });

                // Get source path in node_modules
                const nodeModulesPath = path.join(projectRoot, 'node_modules', plugin.npmPackage);
                const pluginJsonPath = path.join(nodeModulesPath, 'plugin.json');

                if (!fs.existsSync(pluginJsonPath)) {
                    console.log(`    ✗ Invalid plugin package (no plugin.json)`);
                    failedCount++;
                    continue;
                }

                const newPluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));

                // Check version compatibility
                const frameworkVersion = getFrameworkVersion(projectRoot);
                if (newPluginJson.jpulseVersion && !checkVersionCompatibility(newPluginJson.jpulseVersion, frameworkVersion)) {
                    console.log(`    ✗ Requires jPulse ${newPluginJson.jpulseVersion}, current: ${frameworkVersion}`);
                    failedCount++;
                    continue;
                }

                // Sync to plugins/ (respecting preserveOnUpdate)
                const destPath = path.join(pluginsDir, plugin.name);
                const preserveOnUpdate = newPluginJson.preserveOnUpdate || [];

                // Build list of files to preserve
                const preservedFiles = new Map();
                for (const pattern of preserveOnUpdate) {
                    const filePath = path.join(destPath, pattern);
                    if (fs.existsSync(filePath)) {
                        preservedFiles.set(pattern, fs.readFileSync(filePath));
                    }
                }

                // Copy new files
                copyDirRecursive(nodeModulesPath, destPath);

                // Restore preserved files
                for (const [pattern, content] of preservedFiles) {
                    const filePath = path.join(destPath, pattern);
                    fs.writeFileSync(filePath, content);
                }

                // Ensure plugin runtime dependencies are installed after update (site installs only)
                installPluginRuntimeDependencies(destPath, newPluginJson, options, context);

                // Update registry
                const registryEntry = registry.plugins.find(p => p.name === plugin.name);
                if (registryEntry) {
                    registryEntry.version = latestVersion;
                    registryEntry.updatedAt = new Date().toISOString();
                }

                saveRegistry(registryPath, registry);

                console.log(`    ✓ Updated to ${latestVersion}`);
                updatedCount++;

            } catch (error) {
                console.log(`    ✗ Failed: ${error.message}`);
                failedCount++;
            }
        }

        console.log('');
        console.log(`Update complete: ${updatedCount} updated, ${failedCount} failed, ${pluginsToUpdate.length - updatedCount - failedCount} unchanged`);
        console.log('');

        if (updatedCount > 0) {
            console.log('  ⚠ Note: App restart may be required for updates to take effect.');
            console.log('');
        }
    }

    /**
     * Remove a plugin
     * @param {string} name - Plugin name
     * @param {object} options - Command options
     */
    static async remove(name, options) {
        if (!name || name.startsWith('-')) {
            throw new Error('Plugin name is required. Usage: npx jpulse plugin remove <name>');
        }

        const { projectRoot, pluginsDir, registryPath } = detectPaths();
        const registry = loadRegistry(registryPath);
        const plugins = discoverPlugins(pluginsDir, registry);

        // Find plugin
        const plugin = plugins.find(p => p.name === name);
        if (!plugin) {
            throw new PluginError(
                `Plugin '${name}' not found.`,
                ERROR_CODES.PLUGIN_NOT_FOUND,
                [`Run 'npx jpulse plugin list --all' to see installed plugins`]
            );
        }

        // Confirm removal unless --force
        if (!options.force) {
            console.log('');
            console.log(`About to remove plugin: ${name}`);
            console.log(`  Version:  ${plugin.version}`);
            console.log(`  Location: ${plugin.path}`);
            console.log('');
            console.log('Use --force to skip this confirmation.');
            console.log('');
            // In a real CLI we'd prompt for confirmation
            // For now, require --force
            throw new Error('Confirmation required. Use --force to remove.');
        }

        console.log('');
        console.log(`Removing plugin: ${name}`);

        // Remove from plugins/ directory
        const pluginPath = path.join(pluginsDir, name);
        if (fs.existsSync(pluginPath)) {
            fs.rmSync(pluginPath, { recursive: true, force: true });
            console.log(`  ✓ Removed plugins/${name}/`);
        }

        // Remove from node_modules if present
        if (plugin.npmPackage) {
            const nodeModulesPath = path.join(projectRoot, 'node_modules', plugin.npmPackage);
            if (fs.existsSync(nodeModulesPath)) {
                try {
                    execSync(`npm uninstall ${plugin.npmPackage}`, { cwd: projectRoot, stdio: 'pipe' });
                    console.log(`  ✓ Removed from node_modules`);
                } catch (error) {
                    // Ignore npm uninstall errors
                }
            }
        }

        // Remove from registry
        const registryIndex = registry.plugins.findIndex(p => p.name === name);
        if (registryIndex !== -1) {
            registry.plugins.splice(registryIndex, 1);
            saveRegistry(registryPath, registry);
            console.log(`  ✓ Removed from database`);
        }

        console.log('');
        console.log(`Plugin '${name}' removed successfully.`);
        console.log('');
    }

    /**
     * Enable a plugin
     * @param {string} name - Plugin name
     * @param {object} options - Command options
     */
    static async enable(name, options) {
        if (!name || name.startsWith('-')) {
            throw new Error('Plugin name is required. Usage: npx jpulse plugin enable <name>');
        }

        const { pluginsDir, registryPath } = detectPaths();
        const registry = loadRegistry(registryPath);
        const plugins = discoverPlugins(pluginsDir, registry);

        // Find plugin
        const plugin = plugins.find(p => p.name === name);
        if (!plugin) {
            throw new PluginError(
                `Plugin '${name}' not found.`,
                ERROR_CODES.PLUGIN_NOT_FOUND,
                [
                    `Run 'npx jpulse plugin list --all' to see installed plugins`,
                    `Run 'npx jpulse plugin install ${name}' to install it`
                ]
            );
        }

        if (plugin.enabled) {
            console.log('');
            console.log(`Plugin '${name}' is already enabled.`);
            console.log('');
            return;
        }

        // Update registry
        let registryEntry = registry.plugins.find(p => p.name === name);
        const now = new Date().toISOString();

        if (!registryEntry) {
            // Create new entry
            registryEntry = {
                name: name,
                version: plugin.version,
                enabled: true,
                autoEnable: plugin.autoEnable,
                source: plugin.npmPackage || 'local',
                installedAt: now,
                enabledAt: now
            };
            registry.plugins.push(registryEntry);
        } else {
            registryEntry.enabled = true;
            registryEntry.enabledAt = now;
        }

        saveRegistry(registryPath, registry);

        console.log('');
        console.log(`Plugin '${name}' enabled.`);
        console.log('');
        console.log('  ⚠ Note: App restart may be required for the plugin to load.');
        console.log('');
    }

    /**
     * Disable a plugin
     * @param {string} name - Plugin name
     * @param {object} options - Command options
     */
    static async disable(name, options) {
        if (!name || name.startsWith('-')) {
            throw new Error('Plugin name is required. Usage: npx jpulse plugin disable <name>');
        }

        const { pluginsDir, registryPath } = detectPaths();
        const registry = loadRegistry(registryPath);
        const plugins = discoverPlugins(pluginsDir, registry);

        // Find plugin
        const plugin = plugins.find(p => p.name === name);
        if (!plugin) {
            throw new PluginError(
                `Plugin '${name}' not found.`,
                ERROR_CODES.PLUGIN_NOT_FOUND,
                [`Run 'npx jpulse plugin list --all' to see installed plugins`]
            );
        }

        if (!plugin.enabled) {
            console.log('');
            console.log(`Plugin '${name}' is already disabled.`);
            console.log('');
            return;
        }

        // Update registry
        let registryEntry = registry.plugins.find(p => p.name === name);
        const now = new Date().toISOString();

        if (!registryEntry) {
            // Create new entry
            registryEntry = {
                name: name,
                version: plugin.version,
                enabled: false,
                autoEnable: plugin.autoEnable,
                source: plugin.npmPackage || 'local',
                installedAt: now,
                disabledAt: now
            };
            registry.plugins.push(registryEntry);
        } else {
            registryEntry.enabled = false;
            registryEntry.disabledAt = now;
        }

        saveRegistry(registryPath, registry);

        console.log('');
        console.log(`Plugin '${name}' disabled.`);
        console.log('');
        console.log('  Note: Plugin files remain in plugins/ directory.');
        console.log('  Use `npx jpulse plugin remove` to fully remove.');
        console.log('');
    }

    /**
     * Publish a plugin
     * @param {string} name - Plugin name
     * @param {object} options - Command options
     */
    static async publish(name, options) {
        if (!name || name.startsWith('-')) {
            throw new Error('Plugin name is required. Usage: npx jpulse plugin publish <name>');
        }

        const { pluginsDir } = detectPaths();
        const pluginPath = path.join(pluginsDir, name);

        // Check plugin exists
        if (!fs.existsSync(pluginPath)) {
            throw new PluginError(
                `Plugin '${name}' not found in plugins/ directory.`,
                ERROR_CODES.PLUGIN_NOT_FOUND,
                [`Run 'npx jpulse plugin list --all' to see installed plugins`]
            );
        }

        const pluginJsonPath = path.join(pluginPath, 'plugin.json');
        const packageJsonPath = path.join(pluginPath, 'package.json');

        if (!fs.existsSync(pluginJsonPath)) {
            throw new Error(`Plugin '${name}' is missing plugin.json.`);
        }
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error(`Plugin '${name}' is missing package.json. Cannot publish without it.`);
        }

        console.log('');
        console.log(`Publishing plugin: ${name}`);
        console.log('');

        // Read and validate files
        const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Check for version mismatch and sync
        if (pluginJson.version !== packageJson.version) {
            console.log(`  ⚠ Version mismatch: plugin.json (${pluginJson.version}) vs package.json (${packageJson.version})`);
            console.log(`    → Syncing to plugin.json version: ${pluginJson.version}`);
            packageJson.version = pluginJson.version;
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4) + '\n');
            console.log(`  ✓ Updated package.json version`);
        }

        console.log(`  Version: ${pluginJson.version}`);
        console.log(`  Package: ${packageJson.name}`);
        console.log('');

        // Build npm publish command
        let npmCmd = 'npm publish';
        if (options.registry) {
            npmCmd += ` --registry=${options.registry}`;
        }
        if (options.tag) {
            npmCmd += ` --tag=${options.tag}`;
        }

        console.log(`  → Running: ${npmCmd}`);
        console.log('');

        try {
            // Run npm publish from plugin directory
            const output = execSync(npmCmd, {
                cwd: pluginPath,
                stdio: 'pipe',
                encoding: 'utf8'
            });

            // Show npm output
            if (output) {
                const lines = output.trim().split('\n');
                for (const line of lines) {
                    console.log(`    ${line}`);
                }
            }

            console.log('');
            console.log(`  ✓ Published ${packageJson.name}@${pluginJson.version}`);

            // Suggest git tag
            console.log('');
            console.log('  To create a git tag:');
            console.log(`    cd plugins/${name}`);
            console.log(`    git tag -a v${pluginJson.version} -m "Release v${pluginJson.version}"`);
            console.log(`    git push origin v${pluginJson.version}`);
            console.log('');

        } catch (error) {
            const stderr = error.stderr?.toString() || error.stdout?.toString() || error.message;
            const parsed = parseNpmError(stderr);
            const suggestions = parsed.suggestion ? [parsed.suggestion] : [];
            throw new PluginError(
                `npm publish failed: ${parsed.message}`,
                parsed.code,
                suggestions
            );
        }
    }
}

// Run CLI
const args = process.argv.slice(2);
PluginCLI.run(args);

// EOF bin/plugin-manager-cli.js
