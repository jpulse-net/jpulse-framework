#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / jPulse Framework Update
 * @tagline         Framework update synchronization CLI tool
 * @description     Updates local framework files from installed package
 * @file            bin/jpulse-update.js
 * @version         1.3.12
 * @release         2025-12-08
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { CONFIG_REGISTRY, buildCompleteConfig, expandAllVariables } from './config-registry.js';

/**
 * Load and parse .jpulse-ignore file for a directory
 * @param {string} baseDir - Base directory containing .jpulse-ignore
 * @returns {Array} Array of ignore pattern objects
 */
function loadIgnorePatterns(baseDir) {
    const ignoreFile = path.join(baseDir, '.jpulse-ignore');

    try {
        const content = fs.readFileSync(ignoreFile, 'utf8');
        const patterns = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(pattern => {
                // Convert glob pattern to regex
                // Escape special regex chars except * and ?
                let regexPattern = pattern
                    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*')
                    .replace(/\?/g, '.');

                // Handle directory patterns (ending with /)
                const isDirectory = pattern.endsWith('/');
                if (isDirectory) {
                    regexPattern = regexPattern.slice(0, -1); // Remove trailing /
                }

                return {
                    pattern: pattern,
                    regex: new RegExp(`^${regexPattern}$`),
                    isDirectory: isDirectory
                };
            });

        return patterns;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return []; // No ignore file, no patterns
        }
        throw error;
    }
}

/**
 * Check if a file or directory should be ignored
 * @param {string} relativePath - Relative path from base directory
 * @param {boolean} isDirectory - Whether the path is a directory
 * @param {Array} ignorePatterns - Array of ignore pattern objects
 * @returns {boolean} True if should be ignored
 */
function shouldIgnore(relativePath, isDirectory, ignorePatterns) {
    for (const pattern of ignorePatterns) {
        // For directory patterns (ending with /), check both exact match and subdirectory match
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
            // File patterns - only match files
            if (!isDirectory && pattern.regex.test(relativePath)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Copy directory recursively, preserving existing files
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 * @param {string} baseDir - Base directory for relative path calculation (for ignore patterns)
 * @param {Array} ignorePatterns - Ignore patterns (optional)
 */
function syncDirectory(src, dest, baseDir = null, ignorePatterns = null) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        // Calculate relative path for ignore pattern checking
        let relativePath = null;
        if (baseDir && ignorePatterns) {
            relativePath = path.relative(baseDir, srcPath).replace(/\\/g, '/');
            if (shouldIgnore(relativePath, entry.isDirectory(), ignorePatterns)) {
                console.log(`⏭️  Skipping ignored: ${relativePath}`);
                continue;
            }
        }

        if (entry.isDirectory()) {
            syncDirectory(srcPath, destPath, baseDir, ignorePatterns);
        } else if (entry.isSymbolicLink()) {
            // Skip symlinks - we handle jpulse docs separately
            console.log(`⏭️  Skipping symlink: ${entry.name}`);
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

            // Copy documentation to webapp/static/assets/jpulse-docs/
            console.log('📚 Copying documentation...');
            const docsSource = path.join(frameworkPath, 'docs');
            const docsDestination = path.join('webapp', 'static', 'assets', 'jpulse-docs');

            if (fs.existsSync(docsSource)) {
                // Ensure parent directory exists
                fs.mkdirSync(path.dirname(docsDestination), { recursive: true });

                // Remove existing docs and copy fresh
                if (fs.existsSync(docsDestination)) {
                    fs.rmSync(docsDestination, { recursive: true, force: true });
                }

                // Load ignore patterns from .jpulse-ignore file
                const ignorePatterns = loadIgnorePatterns(docsSource);
                if (ignorePatterns.length > 0) {
                    console.log(`📋 Found ${ignorePatterns.length} ignore pattern(s) in .jpulse-ignore`);
                }

                // Sync docs with ignore pattern support
                syncDirectory(docsSource, docsDestination, docsSource, ignorePatterns);
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

// Update package first, then sync files
updatePackage(versionArg);
sync();

// EOF bin/jpulse-update.js
