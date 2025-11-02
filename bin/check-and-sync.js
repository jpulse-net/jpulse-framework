#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Check and Sync
 * @tagline         Automatic framework sync on package update
 * @description     Detects framework package updates and automatically syncs files
 * @file            bin/check-and-sync.js
 * @version         1.0.1
 * @release         2025-11-02
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get framework version from installed package
 */
function getInstalledFrameworkVersion() {
    const packagePath = path.join(process.cwd(), 'node_modules/@jpulse-net/jpulse-framework/package.json');
    if (!fs.existsSync(packagePath)) {
        return null;
    }
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
}

/**
 * Get last known framework version (stored in webapp)
 */
function getLastKnownFrameworkVersion() {
    const attentionPath = path.join(process.cwd(), 'webapp/ATTENTION_README.txt');
    if (!fs.existsSync(attentionPath)) {
        return null;
    }

    const content = fs.readFileSync(attentionPath, 'utf8');
    const versionMatch = content.match(/Framework: v([\d.]+)/);
    return versionMatch ? versionMatch[1] : null;
}

/**
 * Store current framework version for next check
 */
function storeFrameworkVersion(version) {
    // This will be updated by jpulse-update, so we don't need to store it here
    // The version is already tracked in webapp/ATTENTION_README.txt
}

/**
 * Main check and sync function
 */
function checkAndSync() {
    // Only run if this is a jPulse site
    if (!fs.existsSync('webapp') || !fs.existsSync('package.json')) {
        // Not a jPulse site, silently exit
        return;
    }

    // Check if framework package is installed
    const installedVersion = getInstalledFrameworkVersion();
    if (!installedVersion) {
        // Framework not installed, silently exit
        return;
    }

    // Get last known version
    const lastKnownVersion = getLastKnownFrameworkVersion();

    // If versions don't match (or no last known version), sync is needed
    if (lastKnownVersion !== installedVersion) {
        console.log(`🔄 jPulse Framework updated (${lastKnownVersion || 'new'} → ${installedVersion})`);
        console.log('📁 Syncing framework files...');

        try {
            // Run jpulse-update to sync files
            execSync('npm run jpulse-update', { stdio: 'inherit' });
            console.log('✅ Framework sync complete!');
        } catch (error) {
            console.error('❌ Framework sync failed:', error.message);
            console.error('💡 Run "npm run jpulse-update" manually to sync files');
            // Don't exit with error - allow npm update to complete
        }
    }
    // If versions match, silently exit (no sync needed)
}

checkAndSync();

// EOF bin/check-and-sync.js
