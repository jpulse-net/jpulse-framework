#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Update
 * @tagline         Framework update wrapper with dry-run support
 * @description     Safely updates framework package and syncs files
 * @file            bin/update.js
 * @version         1.0.0-rc.2
 * @release         2025-10-27
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import { execSync } from 'child_process';

function update() {
    const isDryRun = process.argv.includes('--dry-run');

    if (isDryRun) {
        console.log('🔍 DRY RUN: jPulse Framework update simulation');
        console.log('📦 Would run: npm update @jpulse-net/jpulse-framework');
        console.log('📁 Would run: npx jpulse-sync');
        console.log('💡 No changes made (dry run mode)');
        console.log('');
        console.log('To actually update: npx jpulse-update');
        return;
    }

    try {
        console.log('🔄 Updating jPulse Framework...');

        // Update npm package
        console.log('📦 Updating framework package...');
        execSync('npm update @jpulse-net/jpulse-framework', { stdio: 'inherit' });

        // Sync framework files
        console.log('📁 Syncing framework files...');
        execSync('npx jpulse-sync', { stdio: 'inherit' });

        console.log('✅ Framework update complete!');

    } catch (error) {
        console.error('❌ Update failed:', error.message);
        process.exit(1);
    }
}

update();

// EOF bin/update.js
