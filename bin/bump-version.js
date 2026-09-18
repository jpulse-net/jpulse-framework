#!/usr/bin/env node

/**
 * @name            jPulse Framework / Build
 * @tagline         Version bump script for jPulse Framework
 * @description     Updates version numbers and release dates across all source files
 * @file            bin/bump-version.js
 * @version         2.0.4
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 3.20, Grok 4.6
 */

import fs from 'fs';
import path from 'path';
import { findBundlePrimaryForCompanion } from '../webapp/utils/plugin-package.js';

/**
 * Find bump-version configuration file based on context
 */
function findBumpConfig() {
    // Framework: has bin/jpulse-framework.js
    if (fs.existsSync('bin/jpulse-framework.js')) {
        const frameworkConfig = 'bin/bump-version.conf';
        if (fs.existsSync(frameworkConfig)) {
            return frameworkConfig;
        }
        return null; // Show instructions
    }

    // Plugin: has plugin.json in current directory
    if (fs.existsSync('plugin.json')) {
        const pluginConfig = 'webapp/bump-version.conf';
        if (fs.existsSync(pluginConfig)) {
            return pluginConfig;
        }
        return null; // Show instructions
    }

    // Site: everything else
    const siteConfig = 'site/webapp/bump-version.conf';
    if (fs.existsSync(siteConfig)) {
        return siteConfig;
    }
    return null; // Show instructions
}

/**
 * Load configuration from file
 */
function loadBumpConfig() {
    const configPath = findBumpConfig();

    if (!configPath) {
        showConfigInstructions();
        return null;
    }

    try {
        const content = fs.readFileSync(configPath, 'utf8');
        return new Function(`return (${content})`)();
    } catch (error) {
        console.error(`❌ Error loading ${configPath}: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Detect execution context
 */
function detectContext() {
    // Framework: has bin/jpulse-framework.js
    if (fs.existsSync('bin/jpulse-framework.js')) {
        return 'framework';
    }
    // Plugin: has plugin.json in current directory
    if (fs.existsSync('plugin.json')) {
        return 'plugin';
    }
    // Site: everything else
    return 'site';
}

/**
 * Show error when configuration file is missing
 */
function showConfigInstructions() {
    const context = detectContext();
    let configPath;
    switch (context) {
        case 'framework':
            configPath = 'bin/bump-version.conf';
            break;
        case 'plugin':
            configPath = 'webapp/bump-version.conf';
            break;
        default:
            configPath = 'site/webapp/bump-version.conf';
    }

    console.error(`\n❌ Configuration file not found: ${configPath}`);
    console.error('');
    if (context === 'plugin') {
        const companionOf = findCompanionPrimaryName();
        if (companionOf) {
            console.error(`This plugin is a bundle companion of '${companionOf}'.`);
            console.error(`Run bump-version from plugins/${companionOf}/ (the file list lives only on the primary).`);
            return;
        }
    }
    console.error('💡 Create the configuration file before using bump-version.');
    if (context === 'site') {
        console.error('📖 See https://your-domain/jpulse/getting-started#version-management for configuration file format.');
        console.error(`💡 Or copy from template: cp node_modules/@jpulse-net/jpulse-framework/templates/webapp/bump-version.conf.tmpl ${configPath}`);
    } else if (context === 'plugin') {
        console.error('📖 See the hello-world plugin for an example configuration.');
        console.error(`💡 Or copy from framework: cp ../../plugins/hello-world/webapp/bump-version.conf ${configPath}`);
    }
}

/**
 * If cwd is a bundle companion, return the primary's name; otherwise null.
 * @returns {string|null}
 */
function findCompanionPrimaryName() {
    if (!fs.existsSync('plugin.json')) {
        return null;
    }
    try {
        const pluginJson = JSON.parse(fs.readFileSync('plugin.json', 'utf8'));
        const isPrimary = Array.isArray(pluginJson.bundle?.members) && pluginJson.bundle.members.length > 0;
        if (isPrimary) {
            return null;
        }
        return findBundlePrimaryForCompanion(path.resolve('..'), pluginJson.name);
    } catch (error) {
        return null;
    }
}

function parseBumpArgs(argv) {
    const newVersion = argv[2];
    const providedDate = argv[3];
    const newDate = providedDate || new Date().toISOString().split('T')[0];

    if (!newVersion) {
        const configPath = findBumpConfig();
        if (!configPath) {
            showConfigInstructions();
            process.exit(1);
        }
        console.error('❌ Please provide a new version number');
        console.error('Usage: npx jpulse bump-version <new-version> [new-date]');
        console.error('Example: npx jpulse bump-version 1.0.1');
        console.error('Example: npx jpulse bump-version 1.0.1 2025-01-27');
        console.error('Note: If no date is provided, today\'s date will be used automatically');
        process.exit(1);
    }

    if (!/^\d+\.\d+\.\d+(-[a-z]+\.\d+)?$/.test(newVersion)) {
        console.error('❌ Invalid version format. Use semantic versioning (e.g., 1.0.1, or 1.0.1-rc.1)');
        process.exit(1);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        console.error('❌ Invalid date format. Use YYYY-MM-DD format (e.g., 2025-01-27)');
        process.exit(1);
    }

    return { newVersion, providedDate, newDate };
}

let conf;
let newVersion;
let newDate;
let updatedFiles = 0;
let errors = 0;

// Function to match file against pattern (simple glob-like matching)
function matchesPattern(filePath, pattern) {
    // Convert glob pattern to regex
    const regex = pattern
        .replace(/\./g, '\\.')           // Escape dots first
        .replace(/\*\*/g, '__DOUBLESTAR__')  // Temporary placeholder for **
        .replace(/\*/g, '[^/]*')         // * matches any characters except /
        .replace(/__DOUBLESTAR__/g, '.*'); // ** matches any characters including /

    return new RegExp(`^${regex}$`).test(filePath);
}

// Hardcoded site paths to skip (framework-shipped examples, not site-owned)
const SITE_SKIP_PATTERNS = [
    'site/webapp/controller/hello*.js',
    'site/webapp/model/hello*.js',
    'site/webapp/view/hello**',
    'site/webapp/view/jpulse-common.js.tmpl',
    'site/webapp/view/jpulse-common.css.tmpl',
    'site/webapp/view/jpulse-navigation.js.tmpl',
    'site/webapp/app.conf.tmpl',
];

function isSiteSkipPath(filePath) {
    return SITE_SKIP_PATTERNS.some(pattern => matchesPattern(filePath, pattern));
}

/**
 * Discover files under rootDir. Patterns and rules match paths relative to that root.
 * @param {string} rootDir
 * @returns {{ absPath: string, relativePath: string }[]}
 */
function discoverFiles(rootDir = '.') {
    const configPath = findBumpConfig();
    const isSiteContext = configPath === 'site/webapp/bump-version.conf';
    const files = [];
    function scanDirectory(currentDir) {
        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
                if (entry.isDirectory()) {
                    scanDirectory(fullPath);
                } else if (entry.isFile()) {
                    const shouldInclude = conf.filePatterns.some(pattern =>
                        matchesPattern(relativePath, pattern)
                    );
                    const skipSiteHello = isSiteContext && isSiteSkipPath(relativePath);
                    if (shouldInclude && !skipSiteHello) {
                        files.push({ absPath: fullPath, relativePath });
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Error scanning directory ${currentDir}:`, error.message);
        }
    }
    scanDirectory(rootDir);
    return files;
}

/**
 * Plugin-context roots: the primary (cwd) plus each bundle.members sibling.
 * Refuses when cwd is a companion.
 * @returns {string[]}
 */
function resolveBumpRoots() {
    if (detectContext() !== 'plugin') {
        return ['.'];
    }
    if (!fs.existsSync('plugin.json')) {
        return ['.'];
    }
    let pluginJson;
    try {
        pluginJson = JSON.parse(fs.readFileSync('plugin.json', 'utf8'));
    } catch (error) {
        console.error(`❌ Error reading plugin.json: ${error.message}`);
        process.exit(1);
    }

    const pluginsDir = path.resolve('..');
    const primary = findBundlePrimaryForCompanion(pluginsDir, pluginJson.name);
    const isPrimary = Array.isArray(pluginJson.bundle?.members) && pluginJson.bundle.members.length > 0;
    if (primary && !isPrimary) {
        console.error(`❌ Plugin '${pluginJson.name}' is a bundle companion of '${primary}'.`);
        console.error(`   Run bump-version from plugins/${primary}/ (the file list lives only on the primary).`);
        process.exit(1);
    }

    const roots = ['.'];
    if (isPrimary) {
        for (const member of pluginJson.bundle.members) {
            const memberDir = path.join('..', member);
            if (!fs.existsSync(path.join(memberDir, 'plugin.json'))) {
                console.error(`❌ Bundle member '${member}' not found at ${path.resolve(memberDir)}`);
                process.exit(1);
            }
            roots.push(memberDir);
        }
    }
    return roots;
}

// Function to update file content based on rules
function updateFileContent(filePath, content) {
    let updatedContent = content;
    let hasChanges = false;

    // Find matching update rules
    const matchingRules = conf.fileUpdateRules.filter(rule =>
        matchesPattern(filePath, rule.pattern)
    );
    for (const rule of matchingRules) {
        for (const replacement of rule.replacements) {
            // Check scope - default to 'version' if not specified
            const scope = replacement.scope || 'version';
            const valueToUse = scope === 'version' ? newVersion : newDate;

            const newContent = updatedContent.replace(replacement.from, (...args) => {
                // args = [fullMatch, captureGroup1, captureGroup2, ..., offset, string]
                // For capture group support, pass the appropriate value as first arg, then all match args
                return replacement.to(valueToUse, ...args);
            });
            if (newContent !== updatedContent) {
                updatedContent = newContent;
                hasChanges = true;
            }
        }
    }
    return { content: updatedContent, hasChanges };
}

// Function to update headers in source files
function updateFileHeaders(filePath, content) {
    let updatedContent = content;
    let hasChanges = false;

    // Update version in header using capture group
    if (conf.headerUpdatePatterns.version.test(updatedContent)) {
        updatedContent = updatedContent.replace(
            conf.headerUpdatePatterns.version,
            '$1' + newVersion
        );
        hasChanges = true;
    }

    // Update release date in header using capture group
    if (conf.headerUpdatePatterns.release.test(updatedContent)) {
        updatedContent = updatedContent.replace(
            conf.headerUpdatePatterns.release,
            '$1' + newDate
        );
        hasChanges = true;
    }

    return { content: updatedContent, hasChanges };
}

function processFilesInRoot(rootDir) {
    const discoveredFiles = discoverFiles(rootDir);
    console.log(`📁 ${path.resolve(rootDir)}: ${discoveredFiles.length} files`);
    for (const file of discoveredFiles) {
        try {
            if (!fs.existsSync(file.absPath)) {
                continue;
            }
            const originalContent = fs.readFileSync(file.absPath, 'utf8');
            let { content: updatedContent, hasChanges: contentChanged } = updateFileContent(file.relativePath, originalContent);
            let { content: finalContent, hasChanges: headerChanged } = updateFileHeaders(file.relativePath, updatedContent);
            const hasAnyChanges = contentChanged || headerChanged;
            if (hasAnyChanges) {
                fs.writeFileSync(file.absPath, finalContent, 'utf8');
                console.log(`✅ Updated: ${path.relative('.', file.absPath) || file.relativePath}`);
                updatedFiles++;
            } else {
                console.log(`ℹ️  No changes needed: ${path.relative('.', file.absPath) || file.relativePath}`);
            }
        } catch (error) {
            console.error(`❌ Error processing ${file.absPath}:`, error.message);
            errors++;
        }
    }
}

/**
 * Run a version bump. cwd determines framework / plugin / site context.
 * @param {string} versionArg
 * @param {string} [dateArg]
 */
export function runBump(versionArg, dateArg) {
    const parsed = parseBumpArgs(['node', 'bump-version.js', versionArg, dateArg].filter(v => v !== undefined));
    newVersion = parsed.newVersion;
    newDate = parsed.newDate;
    updatedFiles = 0;
    errors = 0;

    conf = loadBumpConfig();
    if (!conf) {
        process.exit(1);
    }

    const roots = resolveBumpRoots();

    if (!parsed.providedDate) {
        console.log(`📅 No date provided, using today's date: ${newDate}`);
    }

    console.log(`🚀 Bumping version to ${newVersion} with release date ${newDate}...`);
    console.log('🔍 Discovering files...');
    for (const root of roots) {
        processFilesInRoot(root);
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Files updated: ${updatedFiles}`);
    if (errors > 0) {
        console.log(`❌ Errors: ${errors}`);
    }

    if (errors === 0) {
        console.log('\n🎉 Version bump completed successfully!');
        console.log(`📝 Don't forget to:`);
        console.log(`   - Run tests: npm test`);
        console.log(`   - Update CHANGELOG.md (if you have one)`);
        console.log(`   - Commit changes: git add . && git commit -m "Bump version to ${newVersion}"`);
        console.log(`   - Tag release: git tag v${newVersion}`);
    } else {
        console.log('\n⚠️  Version bump completed with errors. Please review the output above.');
        process.exit(1);
    }

    return { updatedFiles, errors };
}

const invokedAs = process.argv[1] ? path.basename(process.argv[1]) : '';
if (invokedAs === 'bump-version.js') {
    const parsed = parseBumpArgs(process.argv);
    runBump(parsed.newVersion, parsed.providedDate);
}

// EOF bin/bump-version.js
