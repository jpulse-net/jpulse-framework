#!/usr/bin/env node
/**
 * @name            jPulse Framework / Bin / Test CLI Tools
 * @tagline         Test script for CLI tools validation
 * @description     Tests setup and sync CLI tools in isolated environment
 * @file            bin/test-cli.js
 * @version         0.5.5
 * @release         2025-09-12
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const testDir = path.join(process.cwd(), 'test-site-temp');

/**
 * Clean up test directory
 */
function cleanup() {
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
}

/**
 * Test CLI tools
 */
function testCLI() {
    console.log('🧪 Testing jPulse CLI tools...');

    try {
        // Cleanup any existing test directory
        cleanup();

        // Create test directory
        fs.mkdirSync(testDir);
        process.chdir(testDir);

        console.log('📁 Created test directory:', testDir);

        // Test setup command
        console.log('🚀 Testing jpulse-setup...');
        execSync('node ../bin/setup.js', { stdio: 'inherit' });

        // Verify setup results
        const expectedFiles = [
            'package.json',
            'webapp/app.js',
            'webapp/controller',
            'site/webapp',
            'site/README.md'
        ];

        for (const file of expectedFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Expected file/directory not found: ${file}`);
            }
        }

        console.log('✅ Setup test passed');

        // Test that setup prevents double initialization
        console.log('🔒 Testing setup prevention...');
        try {
            execSync('node ../bin/setup.js', { stdio: 'pipe' });
            throw new Error('Setup should have failed on existing site');
        } catch (error) {
            const errorOutput = error.stderr?.toString() || error.stdout?.toString() || '';
            if (!errorOutput.includes('Site already exists')) {
                throw new Error(`Unexpected error: ${errorOutput}`);
            }
            console.log('✅ Setup prevention test passed');
        }

        console.log('🎉 All CLI tests passed!');

    } catch (error) {
        console.error('❌ CLI test failed:', error.message);
        process.exit(1);
    } finally {
        // Cleanup
        process.chdir('..');
        cleanup();
        console.log('🧹 Cleaned up test directory');
    }
}

testCLI();

// EOF bin/test-cli.js
