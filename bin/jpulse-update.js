#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / jPulse Framework Update
 * @tagline         Framework update synchronization CLI tool
 * @description     Updates local framework files from installed package
 * @file            bin/jpulse-update.js
 * @version         0.8.2
 * @release         2025-09-29
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { CONFIG_REGISTRY, buildCompleteConfig, expandAllVariables } from './config-registry.js';

/**
 * Copy directory recursively, preserving existing files
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function syncDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            syncDirectory(srcPath, destPath);
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
    const nodeModulesPath = path.join(process.cwd(), 'node_modules/@peterthoeny/jpulse-framework');

    if (!fs.existsSync(nodeModulesPath)) {
        throw new Error('@peterthoeny/jpulse-framework package not found. Run "npm install @peterthoeny/jpulse-framework" first.');
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
 * Main sync function
 */
function sync() {
    console.log('🔄 Syncing jPulse Framework files...');

    // Check if site is initialized
    if (!fs.existsSync('webapp') || !fs.existsSync('package.json')) {
        console.error('❌ Site not initialized. Run "npx jpulse-setup" first.');
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

            // Copy documentation to webapp/static/assets/jpulse/
            console.log('📚 Copying documentation...');
            const docsSource = path.join(frameworkPath, 'docs');
            const docsDestination = path.join('webapp', 'static', 'assets', 'jpulse');

            if (fs.existsSync(docsSource)) {
                // Ensure parent directory exists
                fs.mkdirSync(path.dirname(docsDestination), { recursive: true });

                // Remove existing docs and copy fresh
                if (fs.existsSync(docsDestination)) {
                    fs.rmSync(docsDestination, { recursive: true, force: true });
                }

                syncDirectory(docsSource, docsDestination);
                console.log('✅ Documentation copied successfully');
            } else {
                console.warn('⚠️  Documentation source not found');
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

sync();

// EOF bin/jpulse-update.js
