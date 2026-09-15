/**
 * @name            jPulse Framework / WebApp / Utils / Plugin Package
 * @tagline         Shared plugin package shape, dependency, and bundle helpers
 * @description     Detects single-plugin vs bundle install layout, normalizes
 *                  dependencies.plugins values, and validates bundle.members
 * @file            webapp/utils/plugin-package.js
 * @version         2.0.1
 * @release         2026-09-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import fs from 'fs';
import path from 'path';

const PLUGIN_NAME_RE = /^[a-z0-9-]+$/;

/**
 * Normalize a dependencies.plugins value to { version, npmPackage }.
 * String form is load-order / enable only. Object form may add npmPackage for install.
 * @param {string|object|undefined} depValue
 * @returns {{ version: string|null, npmPackage: string|null }}
 */
export function normalizePluginDependency(depValue) {
    if (typeof depValue === 'string') {
        return { version: depValue, npmPackage: null };
    }
    if (depValue && typeof depValue === 'object' && !Array.isArray(depValue)) {
        return {
            version: typeof depValue.version === 'string' ? depValue.version : null,
            npmPackage: typeof depValue.npmPackage === 'string' ? depValue.npmPackage : null
        };
    }
    return { version: null, npmPackage: null };
}

/**
 * Validate one dependencies.plugins entry.
 * @param {string} depName
 * @param {string|object} depValue
 * @returns {string[]} Error messages
 */
export function validatePluginDependencyEntry(depName, depValue) {
    const errors = [];
    if (typeof depValue === 'string') {
        return errors;
    }
    if (!depValue || typeof depValue !== 'object' || Array.isArray(depValue)) {
        errors.push(`dependencies.plugins.${depName} must be a version string or { version, npmPackage }`);
        return errors;
    }
    if (typeof depValue.version !== 'string' || !depValue.version) {
        errors.push(`dependencies.plugins.${depName} is missing required field: version`);
    }
    if (depValue.npmPackage !== undefined && typeof depValue.npmPackage !== 'string') {
        errors.push(`dependencies.plugins.${depName}.npmPackage must be a string`);
    }
    return errors;
}

/**
 * Validate bundle.members on a plugin.json object.
 * @param {object} pluginJson
 * @returns {string[]} Error messages
 */
export function validateBundleMembers(pluginJson) {
    const errors = [];
    if (pluginJson.bundle === undefined) {
        return errors;
    }
    if (!pluginJson.bundle || typeof pluginJson.bundle !== 'object' || Array.isArray(pluginJson.bundle)) {
        errors.push('bundle must be an object');
        return errors;
    }
    if (pluginJson.bundle.members === undefined) {
        return errors;
    }
    if (!Array.isArray(pluginJson.bundle.members)) {
        errors.push('bundle.members must be an array of plugin names');
        return errors;
    }
    const seen = new Set();
    for (const member of pluginJson.bundle.members) {
        if (typeof member !== 'string' || !PLUGIN_NAME_RE.test(member)) {
            errors.push(`bundle.members entry must be a plugin name (lowercase alphanumeric with hyphens): ${JSON.stringify(member)}`);
            continue;
        }
        if (pluginJson.name && member === pluginJson.name) {
            errors.push('bundle.members must not include the primary plugin name');
        }
        if (seen.has(member)) {
            errors.push(`bundle.members lists '${member}' more than once`);
        }
        seen.add(member);
    }
    return errors;
}

/**
 * CLI-style plugin.json validation (required name/version, recommended fields,
 * bundle.members, object-form dependencies.plugins).
 * @param {object} pluginJson
 * @param {string} [pluginPath]
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validatePluginJson(pluginJson, pluginPath) {
    const errors = [];
    const warnings = [];
    void pluginPath;

    if (!pluginJson.name) {
        errors.push('Missing required field: name');
    } else if (!PLUGIN_NAME_RE.test(pluginJson.name)) {
        errors.push('Invalid name: must be lowercase alphanumeric with hyphens');
    }

    if (!pluginJson.version) {
        errors.push('Missing required field: version');
    } else if (!/^\d+\.\d+\.\d+/.test(pluginJson.version)) {
        warnings.push('Version should follow semver format (e.g., 1.0.0)');
    }

    if (!pluginJson.summary) {
        warnings.push('Missing recommended field: summary');
    }
    if (!pluginJson.author) {
        warnings.push('Missing recommended field: author');
    }
    if (!pluginJson.jpulseVersion) {
        warnings.push('Missing recommended field: jpulseVersion');
    }

    if (pluginJson.config?.schema) {
        if (!Array.isArray(pluginJson.config.schema)) {
            errors.push('config.schema must be an array');
        }
    }

    errors.push(...validateBundleMembers(pluginJson));

    const pluginDeps = pluginJson.dependencies?.plugins;
    if (pluginDeps !== undefined) {
        if (!pluginDeps || typeof pluginDeps !== 'object' || Array.isArray(pluginDeps)) {
            errors.push('dependencies.plugins must be an object');
        } else {
            for (const [depName, depValue] of Object.entries(pluginDeps)) {
                errors.push(...validatePluginDependencyEntry(depName, depValue));
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Detect whether a fetched or local source root is a single plugin, a bundle, or invalid.
 * @param {string} sourceRoot
 * @returns {{ type: 'single'|'bundle'|'invalid', members?: object[], error?: string }}
 */
export function detectPluginPackageShape(sourceRoot) {
    if (!sourceRoot || !fs.existsSync(sourceRoot)) {
        return { type: 'invalid', error: `Not a valid jPulse plugin: path not found: ${sourceRoot}` };
    }

    const rootPluginJson = path.join(sourceRoot, 'plugin.json');
    const pluginsDir = path.join(sourceRoot, 'plugins');
    const members = [];

    if (fs.existsSync(pluginsDir) && fs.statSync(pluginsDir).isDirectory()) {
        const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            const memberPath = path.join(pluginsDir, entry.name);
            const memberJsonPath = path.join(memberPath, 'plugin.json');
            if (!fs.existsSync(memberJsonPath)) {
                continue;
            }
            let pluginJson;
            try {
                pluginJson = JSON.parse(fs.readFileSync(memberJsonPath, 'utf8'));
            } catch (error) {
                return {
                    type: 'invalid',
                    error: `Invalid plugin.json in plugins/${entry.name}: ${error.message}`
                };
            }
            members.push({
                name: pluginJson.name || entry.name,
                path: memberPath,
                pluginJson
            });
        }
    }

    const hasRoot = fs.existsSync(rootPluginJson);
    if (hasRoot && members.length > 0) {
        return {
            type: 'invalid',
            error: 'Package has both a root plugin.json and plugins/*/plugin.json. Use one shape: a single plugin (root plugin.json) or a bundle (plugins/<name>/plugin.json only).'
        };
    }
    if (members.length > 0) {
        return { type: 'bundle', members };
    }
    if (hasRoot) {
        let pluginJson;
        try {
            pluginJson = JSON.parse(fs.readFileSync(rootPluginJson, 'utf8'));
        } catch (error) {
            return { type: 'invalid', error: `Invalid plugin.json: ${error.message}` };
        }
        return {
            type: 'single',
            members: [{
                name: pluginJson.name,
                path: sourceRoot,
                pluginJson
            }]
        };
    }
    return {
        type: 'invalid',
        error: 'Not a valid jPulse plugin: missing plugin.json'
    };
}

/**
 * Find the primary plugin that lists `companionName` in bundle.members.
 * @param {string} pluginsDir - Directory containing sibling plugin folders
 * @param {string} companionName
 * @returns {string|null} Primary plugin name
 */
export function findBundlePrimaryForCompanion(pluginsDir, companionName) {
    if (!pluginsDir || !companionName || !fs.existsSync(pluginsDir)) {
        return null;
    }
    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }
        const jsonPath = path.join(pluginsDir, entry.name, 'plugin.json');
        if (!fs.existsSync(jsonPath)) {
            continue;
        }
        try {
            const pluginJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const members = pluginJson.bundle?.members;
            if (Array.isArray(members) && members.includes(companionName)) {
                return pluginJson.name || entry.name;
            }
        } catch (error) {
            // skip unreadable siblings
        }
    }
    return null;
}

/**
 * Plan which plugin dependencies still need an npm fetch.
 * Does not guess @jpulse-net/plugin-<name> when npmPackage is absent.
 * @param {object[]} pluginJsons - plugin.json objects of newly installed members
 * @param {object} options
 * @param {function(string): boolean} options.isInstalled - true if plugins/<name> exists
 * @param {Set<string>} [options.inFlightPackages]
 * @returns {{ fetches: { depName: string, npmPackage: string }[], errors: string[], circular: string[] }}
 */
export function planPluginDependencyInstalls(pluginJsons, options) {
    const isInstalled = options.isInstalled;
    const inFlightPackages = options.inFlightPackages || new Set();
    const fetches = [];
    const errors = [];
    const circular = [];
    const seenFetch = new Set();

    for (const pluginJson of pluginJsons) {
        const deps = pluginJson.dependencies?.plugins || {};
        for (const [depName, depValue] of Object.entries(deps)) {
            if (isInstalled(depName)) {
                continue;
            }
            const spec = normalizePluginDependency(depValue);
            if (!spec.npmPackage) {
                errors.push(depName);
                continue;
            }
            if (inFlightPackages.has(spec.npmPackage)) {
                circular.push(spec.npmPackage);
                continue;
            }
            if (seenFetch.has(spec.npmPackage)) {
                continue;
            }
            seenFetch.add(spec.npmPackage);
            fetches.push({ depName, npmPackage: spec.npmPackage });
        }
    }

    return { fetches, errors, circular };
}

/**
 * Missing-dependency message for enable / CLI, including npmPackage when known.
 * @param {string} depName
 * @param {string|null} npmPackage
 * @returns {string}
 */
export function formatMissingPluginDependency(depName, npmPackage) {
    if (npmPackage) {
        return `Missing required dependency: ${depName} (install ${npmPackage})`;
    }
    return `Missing required dependency: ${depName}`;
}

/**
 * Copy a directory tree, skipping .git and optional extra directory names.
 * @param {string} src
 * @param {string} dest
 * @param {object} [options]
 * @param {string[]} [options.skipDirNames]
 * @param {string[]} [options.skipPaths] - Absolute paths to skip; required when dest is inside src
 */
export function copyDirRecursive(src, dest, options = {}) {
    const skipDirNames = new Set(['.git', ...(options.skipDirNames || [])]);
    const skipPaths = new Set((options.skipPaths || []).map(p => path.resolve(p)));
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (skipPaths.has(path.resolve(srcPath))) {
            continue;
        }
        if (entry.isDirectory()) {
            if (skipDirNames.has(entry.name)) {
                continue;
            }
            copyDirRecursive(srcPath, destPath, options);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Resolve a bundle's members: the primary plus each companion directory.
 * @param {string} primaryDir
 * @param {object} primaryJson
 * @param {string[]} memberNames
 * @param {string} pluginsDir
 * @returns {{ name: string, dir: string, pluginJson: object, isPrimary: boolean }[]}
 */
export function resolveBundleMembers(primaryDir, primaryJson, memberNames, pluginsDir) {
    const members = [{
        name: primaryJson.name,
        dir: primaryDir,
        pluginJson: primaryJson,
        isPrimary: true
    }];
    for (const memberName of memberNames) {
        const memberDir = path.join(pluginsDir, memberName);
        const memberJsonPath = path.join(memberDir, 'plugin.json');
        if (!fs.existsSync(memberJsonPath)) {
            throw new Error(`Bundle member '${memberName}' not found at plugins/${memberName}/`);
        }
        const memberJson = JSON.parse(fs.readFileSync(memberJsonPath, 'utf8'));
        members.push({
            name: memberJson.name || memberName,
            dir: memberDir,
            pluginJson: memberJson,
            isPrimary: false
        });
    }
    return members;
}

/**
 * Normalize one copied member inside a package tree.
 * A companion never carries a package.json into the package: the primary's is
 * the package manifest, and a stray one would make install run npm there.
 * @param {string} memberDest
 * @param {object} member
 * @param {string} version - Primary version; one package, one version
 */
function finalizeBundleMemberCopy(memberDest, member, version) {
    if (!member.isPrimary) {
        const strayPackageJson = path.join(memberDest, 'package.json');
        if (fs.existsSync(strayPackageJson)) {
            fs.rmSync(strayPackageJson);
        }
    }
    if (member.pluginJson.version !== version) {
        const staged = { ...member.pluginJson, version };
        fs.writeFileSync(path.join(memberDest, 'plugin.json'), JSON.stringify(staged, null, 4) + '\n');
    }
}

/**
 * Stage bundle members inside the primary directory so a plain `npm publish`
 * (or `npm pack`) from that directory produces the bundle layout.
 *
 * npm builds its file list after `prepack` runs, so files created here are
 * packed. The primary's package.json needs `"files": ["plugins"]` to keep the
 * root plugin.json out of the tarball - a package with both shapes is refused
 * at install time.
 *
 * @param {string} primaryDir - Plugin directory (npm runs prepack with this cwd)
 * @param {string} pluginsDir - Directory holding sibling plugins
 * @returns {{ stagingDir: string, members: string[], version: string }|null} null when not a bundle primary
 */
export function stageBundleForPack(primaryDir, pluginsDir) {
    const pluginJsonPath = path.join(primaryDir, 'plugin.json');
    if (!fs.existsSync(pluginJsonPath)) {
        // Already an assembled bundle tree (the CLI publish path) - nothing to do
        return null;
    }
    const primaryJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
    const memberNames = primaryJson.bundle?.members;
    if (!Array.isArray(memberNames) || memberNames.length === 0) {
        return null;
    }

    const stagingDir = path.join(primaryDir, 'plugins');
    fs.rmSync(stagingDir, { recursive: true, force: true });

    const members = resolveBundleMembers(primaryDir, primaryJson, memberNames, pluginsDir);
    for (const member of members) {
        const memberDest = path.join(stagingDir, member.name);
        copyDirRecursive(member.dir, memberDest, {
            skipDirNames: ['node_modules'],
            skipPaths: [stagingDir]
        });
        finalizeBundleMemberCopy(memberDest, member, primaryJson.version);
    }

    return {
        stagingDir,
        members: members.map(m => m.name),
        version: primaryJson.version
    };
}

/**
 * Remove the staging directory written by stageBundleForPack (npm postpack).
 * Refuses to delete a plugins/ directory that does not match this bundle, so a
 * plugin that legitimately ships one is never destroyed.
 * @param {string} primaryDir
 * @returns {boolean} true when a staging directory was removed
 */
export function unstageBundleAfterPack(primaryDir) {
    const stagingDir = path.join(primaryDir, 'plugins');
    const pluginJsonPath = path.join(primaryDir, 'plugin.json');
    if (!fs.existsSync(stagingDir) || !fs.existsSync(pluginJsonPath)) {
        return false;
    }
    const primaryJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
    const expected = new Set([primaryJson.name, ...(primaryJson.bundle?.members || [])]);
    const actual = fs.readdirSync(stagingDir);
    if (actual.length === 0 || actual.some(name => !expected.has(name))) {
        return false;
    }
    fs.rmSync(stagingDir, { recursive: true, force: true });
    return true;
}

/**
 * Write a bundle package tree: root package.json + plugins/<member>/, no root plugin.json.
 * @param {string} primaryDir
 * @param {object} primaryJson
 * @param {string[]} memberNames
 * @param {string} pluginsDir
 * @param {string} destDir
 * @param {object} [options]
 * @param {boolean} [options.syncSourceVersions]
 * @param {function} [options.log]
 * @returns {{ packageJson: object, members: string[] }}
 */
export function assembleBundlePackage(primaryDir, primaryJson, memberNames, pluginsDir, destDir, options = {}) {
    const log = options.log || (() => {});
    const members = resolveBundleMembers(primaryDir, primaryJson, memberNames, pluginsDir);

    if (options.syncSourceVersions) {
        for (const member of members) {
            if (member.pluginJson.version !== primaryJson.version) {
                log(`  → Syncing plugins/${member.name}/plugin.json version ${member.pluginJson.version} → ${primaryJson.version}`);
                member.pluginJson.version = primaryJson.version;
                fs.writeFileSync(path.join(member.dir, 'plugin.json'), JSON.stringify(member.pluginJson, null, 4) + '\n');
                log(`  ✓ Updated plugins/${member.name}/plugin.json version`);
            }
        }
    }

    fs.mkdirSync(destDir, { recursive: true });

    const primaryPackageJsonPath = path.join(primaryDir, 'package.json');
    let packageJson;
    if (fs.existsSync(primaryPackageJsonPath)) {
        packageJson = JSON.parse(fs.readFileSync(primaryPackageJsonPath, 'utf8'));
        if (packageJson.version !== primaryJson.version) {
            packageJson.version = primaryJson.version;
            if (options.syncSourceVersions) {
                fs.writeFileSync(primaryPackageJsonPath, JSON.stringify(packageJson, null, 4) + '\n');
                log('  ✓ Updated package.json version');
            }
        }
    } else {
        packageJson = {
            name: primaryJson.npmPackage || `@jpulse-net/plugin-${primaryJson.name}`,
            version: primaryJson.version,
            description: primaryJson.summary || '',
            keywords: ['jpulse', 'jpulse-plugin'],
            license: 'BSL-1.1'
        };
    }
    packageJson.name = packageJson.name || primaryJson.npmPackage || `@jpulse-net/plugin-${primaryJson.name}`;
    packageJson.version = primaryJson.version;
    fs.writeFileSync(path.join(destDir, 'package.json'), JSON.stringify(packageJson, null, 4) + '\n');

    for (const member of members) {
        const memberDest = path.join(destDir, 'plugins', member.name);
        copyDirRecursive(member.dir, memberDest, {
            skipDirNames: ['node_modules'],
            skipPaths: [destDir]
        });
        finalizeBundleMemberCopy(memberDest, member, primaryJson.version);
    }

    return { packageJson, members: members.map(m => m.name) };
}

export default {
    normalizePluginDependency,
    validatePluginDependencyEntry,
    validateBundleMembers,
    validatePluginJson,
    detectPluginPackageShape,
    findBundlePrimaryForCompanion,
    planPluginDependencyInstalls,
    formatMissingPluginDependency,
    copyDirRecursive,
    resolveBundleMembers,
    stageBundleForPack,
    unstageBundleAfterPack,
    assembleBundlePackage
};

// EOF webapp/utils/plugin-package.js
