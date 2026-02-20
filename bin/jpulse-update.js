#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / jPulse Framework Update
 * @tagline         Framework update synchronization CLI tool
 * @description     Updates local framework files from installed package
 * @file            bin/jpulse-update.js
 * @version         1.6.20
 * @release         2026-02-20
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.2, Claude Sonnet 4.5
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { CONFIG_REGISTRY, buildCompleteConfig, expandAllVariables } from './config-registry.js';

/**
 * Load and parse .markdown file [ignore] section
 * @param {string} baseDir - Base directory containing .markdown
 * @returns {Array} Array of ignore pattern objects {pattern, regex, isDirectory}
 */
function loadMarkdownIgnorePatterns(baseDir) {
    const configFile = path.join(baseDir, '.markdown');
    const ignorePatterns = [];

    try {
        const content = fs.readFileSync(configFile, 'utf8');
        const lines = content.split('\n');
        let currentSection = null;

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }

            // Check for section header
            const sectionMatch = trimmedLine.match(/^\[([\w-]+)\]$/);
            if (sectionMatch) {
                currentSection = sectionMatch[1];
                continue;
            }

            // Parse ignore patterns
            if (currentSection === 'ignore') {
                const pattern = trimmedLine;
                try {
                    // Convert glob pattern to regex
                    let regexPattern = pattern
                        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                        .replace(/\*/g, '.*')
                        .replace(/\?/g, '.');

                    const isDirectory = pattern.endsWith('/');
                    if (isDirectory) {
                        regexPattern = regexPattern.slice(0, -1);
                    }

                    ignorePatterns.push({
                        pattern: pattern,
                        regex: new RegExp(`^${regexPattern}$`),
                        isDirectory: isDirectory
                    });
                } catch (regexError) {
                    // Skip invalid regex patterns
                    continue;
                }
            }
        }
    } catch (error) {
        // No .markdown file or error - return empty array (no filtering)
    }

    return ignorePatterns;
}

/**
 * Check if a file or directory should be ignored
 * @param {string} relativePath - Relative path from baseDir
 * @param {boolean} isDirectory - Whether this is a directory
 * @param {Array} ignorePatterns - Array of ignore pattern objects
 * @returns {boolean} True if should be ignored
 */
function shouldIgnore(relativePath, isDirectory, ignorePatterns) {
    if (!ignorePatterns || ignorePatterns.length === 0) {
        return false;
    }

    for (const pattern of ignorePatterns) {
        if (pattern.isDirectory) {
            const dirPath = pattern.pattern.slice(0, -1); // Remove trailing /

            // Exact directory match
            if (isDirectory && relativePath === dirPath) {
                return true;
            }

            // File or subdirectory inside ignored directory
            if (relativePath.startsWith(dirPath + '/')) {
                return true;
            }
        } else {
            // File pattern - only match files
            if (!isDirectory && pattern.regex.test(relativePath)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Copy directory recursively with optional filtering
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 * @param {string} baseDir - Base directory for relative path calculation (for filtering)
 * @param {Function} shouldSkip - Optional function(relativePath, isDirectory) => boolean
 */
function syncDirectory(src, dest, baseDir = null, shouldSkip = null) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        // Skip symlinks (they're already resolved to actual files in the package)
        if (entry.isSymbolicLink()) {
            console.log(`⏭️  Skipping symlink: ${entry.name}`);
            continue;
        }

        // Calculate relative path for filtering
        const relativePath = baseDir ? path.relative(baseDir, srcPath).replace(/\\/g, '/') : entry.name;
        const isDirectory = entry.isDirectory();

        // Apply filter if provided
        if (shouldSkip && shouldSkip(relativePath, isDirectory)) {
            console.log(`⏭️  Skipping ignored: ${relativePath}`);
            continue;
        }

        if (isDirectory) {
            syncDirectory(srcPath, destPath, baseDir, shouldSkip);
        } else {
            // Always overwrite framework files
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Find framework package location
 */
function findFrameworkPackage() {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules/@jpulse-net/jpulse-framework');

    if (!fs.existsSync(nodeModulesPath)) {
        throw new Error('@jpulse-net/jpulse-framework package not found. Run "npm install @jpulse-net/jpulse-framework" first.');
    }

    return nodeModulesPath;
}

/**
 * Get framework version info
 */
function getVersionInfo(packagePath) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8'));
    return {
        version: packageJson.version,
        name: packageJson.name
    };
}

/**
 * Update framework package
 * @param {string|null} versionArg - Optional version argument (e.g., "@jpulse-net/jpulse-framework@1.0.0-rc.1")
 */
function updatePackage(versionArg) {
    if (versionArg) {
        // Parse version argument
        const match = versionArg.match(/^@jpulse-net\/jpulse-framework@(.+)$/);
        if (!match) {
            console.error('❌ Invalid version format.');
            console.error('Usage: npx jpulse update [@jpulse-net/jpulse-framework@version]');
            console.error('Example: npx jpulse update');
            console.error('Example: npx jpulse update @jpulse-net/jpulse-framework@1.0.0-rc.1');
            process.exit(1);
        }
        const version = match[1];
        console.log(`📦 Installing @jpulse-net/jpulse-framework@${version}...`);
        execSync(`npm install @jpulse-net/jpulse-framework@${version}`, { stdio: 'inherit' });
    } else {
        // Update to latest
        console.log('📦 Updating @jpulse-net/jpulse-framework to latest...');
        execSync('npm update @jpulse-net/jpulse-framework', { stdio: 'inherit' });
    }
}

/**
 * Check if running in framework dev repository (not a site)
 */
function isFrameworkDevRepo() {
    // Check if this is the framework package itself (not a site using it)
    // The framework's package.json has name "@jpulse-net/jpulse-framework"
    // A site's package.json will have a different name (their site ID)
    if (fs.existsSync('package.json')) {
        try {
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            if (pkg.name === '@jpulse-net/jpulse-framework') {
                return true;
            }
        } catch (error) {
            // Ignore parse errors, fall through to false
        }
    }
    return false;
}

/**
 * Main sync function
 */
function sync() {
    console.log('🔄 Syncing jPulse Framework files...');

    // Check if site is initialized
    if (!fs.existsSync('webapp') || !fs.existsSync('package.json')) {
        console.error('❌ Site not initialized. Run "npx jpulse configure" first.');
        process.exit(1);
    }

    try {
        // Find framework package
        const frameworkPath = findFrameworkPackage();
        const versionInfo = getVersionInfo(frameworkPath);

        console.log(`📦 Found ${versionInfo.name} v${versionInfo.version}`);

        // Backup existing webapp (optional safety measure)
        const backupPath = `webapp.backup.${Date.now()}`;
        if (fs.existsSync('webapp')) {
            console.log('💾 Creating backup...');
            fs.renameSync('webapp', backupPath);
        }

        try {
            // Sync framework files
            console.log('📁 Updating framework files...');
            const webappSrc = path.join(frameworkPath, 'webapp');
            syncDirectory(webappSrc, 'webapp');

            // Update ATTENTION_README.txt with current framework version
            console.log('📋 Updating webapp/ATTENTION_README.txt...');
            const attentionTemplate = path.join(frameworkPath, 'templates', 'webapp', 'ATTENTION_README.txt.tmpl');
            if (fs.existsSync(attentionTemplate)) {
                const templateContent = fs.readFileSync(attentionTemplate, 'utf8');
                // Create minimal config for template expansion
                const config = {
                    JPULSE_DOMAIN_NAME: 'your-domain',
                    SITE_NAME: 'Your jPulse Site',
                    JPULSE_FRAMEWORK_VERSION: versionInfo.version
                };
                // Use unified template expansion - no more manual .replace() chains!
                const expandedContent = expandAllVariables(templateContent, config);
                fs.writeFileSync('webapp/ATTENTION_README.txt', expandedContent);
            }

            // Update LICENSE file (verbatim - no template processing)
            console.log('📋 Updating LICENSE...');
            const licensePath = path.join(frameworkPath, 'LICENSE');
            if (fs.existsSync(licensePath)) {
                fs.copyFileSync(licensePath, 'LICENSE');
            }

            // Copy documentation to webapp/static/assets/jpulse-docs/
            // Filter based on .markdown [ignore] section to exclude files that shouldn't be in site deployments
            console.log('📚 Copying documentation...');
            const docsSource = path.join(frameworkPath, 'docs');
            const docsDestination = path.join('webapp', 'static', 'assets', 'jpulse-docs');

            if (fs.existsSync(docsSource)) {
                // Ensure parent directory exists
                fs.mkdirSync(path.dirname(docsDestination), { recursive: true });

                // Remove existing docs and copy fresh
                // Use lstat to detect symlinks without following them
                try {
                    const stats = fs.lstatSync(docsDestination);
                    // If we get here, something exists (file, directory, or symlink)
                    fs.rmSync(docsDestination, { recursive: true, force: true });
                } catch (error) {
                    // Path doesn't exist, which is fine
                    if (error.code !== 'ENOENT') {
                        throw error;
                    }
                }

                // Load ignore patterns from .markdown file
                const ignorePatterns = loadMarkdownIgnorePatterns(docsSource);

                // Create filter function
                const shouldSkip = (relativePath, isDirectory) => {
                    return shouldIgnore(relativePath, isDirectory, ignorePatterns);
                };

                // Copy with filtering based on .markdown [ignore] section
                syncDirectory(docsSource, docsDestination, docsSource, shouldSkip);
                console.log('✅ Documentation copied successfully');
            } else {
                console.warn('⚠️  Documentation source not found');
            }

            // Sync hello-world plugin
            console.log('🔌 Updating hello-world plugin...');
            const pluginSource = path.join(frameworkPath, 'plugins', 'hello-world');
            const pluginDestination = path.join('plugins', 'hello-world');

            if (fs.existsSync(pluginSource)) {
                // Ensure plugins directory exists
                fs.mkdirSync('plugins', { recursive: true });

                // Remove existing plugin and copy fresh
                if (fs.existsSync(pluginDestination)) {
                    fs.rmSync(pluginDestination, { recursive: true, force: true });
                }

                // Sync plugin directory
                syncDirectory(pluginSource, pluginDestination);
                console.log('✅ hello-world plugin updated successfully');
            } else {
                console.warn('⚠️  hello-world plugin not found in framework package');
            }

            // Remove backup on success
            if (fs.existsSync(backupPath)) {
                fs.rmSync(backupPath, { recursive: true, force: true });
            }

            console.log('✅ Framework sync complete!');
            console.log(`📊 Updated to ${versionInfo.name} v${versionInfo.version}`);
            console.log('');
            console.log('💡 Review changes with: git diff webapp/');
            console.log('🚀 Restart your application to use updated framework');

        } catch (syncError) {
            // Restore backup on failure
            if (fs.existsSync(backupPath)) {
                console.log('🔄 Restoring backup due to sync failure...');
                if (fs.existsSync('webapp')) {
                    fs.rmSync('webapp', { recursive: true, force: true });
                }
                fs.renameSync(backupPath, 'webapp');
            }
            throw syncError;
        }

    } catch (error) {
        console.error('❌ Sync failed:', error.message);
        process.exit(1);
    }
}

// Parse command line arguments
const versionArg = process.argv[2] || null;

// Check if running in framework dev repo BEFORE doing anything
if (isFrameworkDevRepo()) {
    console.error('❌ ERROR: Running in jPulse Framework development repository');
    console.error('');
    console.error('💡 This script is for site installations, not framework development.');
    console.error('');
    console.error('To update a site:');
    console.error('  1. Navigate to your site directory: cd /path/to/my-site');
    console.error('  2. Run: npx jpulse update');
    console.error('');
    console.error('For framework development:');
    console.error('  - Changes here are already in use (no update needed)');
    console.error('  - Run: npm test');
    process.exit(1);
}

// Update package first, then sync files
updatePackage(versionArg);
sync();

// EOF bin/jpulse-update.js
