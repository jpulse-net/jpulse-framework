#!/usr/bin/env node

/**
 * @name            jPulse Framework / Build
 * @tagline         Version bump script for jPulse Framework
 * @description     Updates version numbers and release dates across all source files
 * @file            bin/bump-version.js
 * @version         1.0.0
 * @release         2025-11-01
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

const conf = {
    // Explicit file patterns for each directory of interest
    filePatterns: [
        // Root level files
        'package.json',
        'package-lock.json',
        'README.md',
        'babel.config.cjs',

        // Bin directory
        'bin/*.js',
        'bin/*.sh',

        // Docs directory
        'docs/*.md',
        'docs/dev/*.md',

        // WebApp directory
        'webapp/*.conf',
        'webapp/*.js',
        'webapp/controller/*.js',
        'webapp/model/*.js',
        'webapp/utils/*.js',
        'webapp/translations/*.js',
        'webapp/translations/*.conf',
        'webapp/view/*.css',
        'webapp/view/*.js',
        'webapp/view/*.tmpl',
        'webapp/view/*/*.shtml',

        // Site directory
        'site/webapp/*.conf.tmpl',
        'site/webapp/*.js',
        'site/webapp/controller/*.js',
        'site/webapp/model/*.js',
        'site/webapp/translations/*.conf',
        'site/webapp/view/*.css',
        'site/webapp/view/*.js',
        'site/webapp/view/*.tmpl',
        'site/webapp/view/**/*.css',
        'site/webapp/view/**/*.js',
        'site/webapp/view/**/*.shtml',
        'site/webapp/view/**/*.tmpl',

        // Template files
        'templates/README.md',
        'templates/**/*.md',
        'templates/**/*.sh',
        'templates/**/*.js',
        'templates/**/*.cjs',
        'templates/**/*.conf',
        'templates/**/*.tmpl',
        'templates/**/*.shtml',

        // Test files
        'webapp/tests/**/*.js',
        'webapp/tests/**/*.conf',
    ],

    // Specific file update patterns for version/content replacement
    fileUpdateRules: [
        {
            pattern: 'package.json',
            replacements: [
                { from: /"version": "[\d.]+(-[a-z]+\.\d+)?"/,
                  to: (version) => `"version": "${version}"` }
            ]
        },
        {
            pattern: 'package-lock.json',
            replacements: [
                { from: /("name": "\@jpulse-net\/jpulse-framework",\s+"version": ")[\d.]+(-[a-z]+\.\d+)?/g,
                  to: (version, match, p1) => `${p1}${version}`, scope: 'version' }
            ]
        },
        {
            pattern: 'webapp/app.conf',
            replacements: [
                { from: /(version: +['"])[\d.]+(-[a-z]+\.\d+)?/,
                  to: (version, match, p1) => `${p1}${version}`, scope: 'version' },
                { from: /(release: +['"])[\d-]+/,
                  to: (release, match, p1) => `${p1}${release}`, scope: 'release' }
            ]
        },
        {
            pattern: 'README.md',
            replacements: [
                { from: /^(# jPulse Framework v)[\d.]+(-[a-z]+\.\d+)?/m,
                  to: (version, match, p1) => `${p1}${version}` }
            ]
        },
        {
            pattern: 'docs/*.md',
            replacements: [
                { from: /^(# jPulse Framework.* v)[\d.]+(-[a-z]+\.\d+)?/m,
                  to: (version, match, p1) => `${p1}${version}` }
            ]
        },
        {
            pattern: 'docs/**/*.md',
            replacements: [
                { from: /^(# jPulse Framework.* v)[\d.]+(-[a-z]+\.\d+)?/m,
                  to: (version, match, p1) => `${p1}${version}` }
            ]
        },
        {
            pattern: 'templates/*.md',
            replacements: [
                { from: /^(# .* jPulse Framework v)[\d.]+(-[a-z]+\.\d+)?/m,
                  to: (version, match, p1) => `${p1}${version}` }
            ]
        },
        {
            pattern: 'templates/**/*.md',
            replacements: [
                { from: /^(# .*jPulse Framework v)[\d.]+(-[a-z]+\.\d+)?/m,
                  to: (version, match, p1) => `${p1}${version}` }
            ]
        },
        {
            pattern: 'webapp/view/home/index.shtml',
            replacements: [
                { from: /(jPulse Framework v)[\d.]+(-[a-z]+\.\d+)?/m,
                  to: (version, match, p1) => `${p1}${version}` },
            ]
        },
    ],

    // Header update patterns for source files
    headerUpdatePatterns: {
        version: /([\*#] @version\s+)[\d.]+(-[a-z]+\.\d+)?/, // Captures comment prefix: * @version or # @version
        release: /([\*#] @release\s+)[\d-]+/  // Captures comment prefix: * @release or # @release
    }
};

import fs from 'fs';
import path from 'path';

const newVersion = process.argv[2];
const providedDate = process.argv[3];
const newDate = providedDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

if (!newVersion) {
  console.error('❌ Please provide a new version number');
  console.error('Usage: node bin/bump-version.js <new-version> [new-date]');
  console.error('Example: node bin/bump-version.js 1.0.1');
  console.error('Example: node bin/bump-version.js 1.0.1 2025-01-27');
  console.error('Note: If no date is provided, today\'s date will be used automatically');
  process.exit(1);
}

// Show what date is being used
if (!providedDate) {
  console.log(`📅 No date provided, using today's date: ${newDate}`);
}

// Validate version format (simple check)
if (!/^\d+\.\d+\.\d+(-[a-z]+\.\d+)?$/.test(newVersion)) {
  console.error('❌ Invalid version format. Use semantic versioning (e.g., 1.0.1, or 1.0.1-rc.1)');
  process.exit(1);
}

// Validate date format (YYYY-MM-DD)
if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
  console.error('❌ Invalid date format. Use YYYY-MM-DD format (e.g., 2025-01-27)');
  process.exit(1);
}

console.log(`🚀 Bumping version to ${newVersion} with release date ${newDate}...`);

// Configuration moved to conf object above

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

// Function to discover files recursively
function discoverFiles(dir = '.') {
    const files = [];
    function scanDirectory(currentDir) {
        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                const relativePath = path.relative('.', fullPath).replace(/\\/g, '/'); // Normalize path separators
                if (entry.isDirectory()) {
                    scanDirectory(fullPath);
                } else if (entry.isFile()) {
                    // Check if file matches any pattern
                    const shouldInclude = conf.filePatterns.some(pattern => 
                        matchesPattern(relativePath, pattern)
                    );
                    if (shouldInclude) {
                        files.push(relativePath);
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Error scanning directory ${currentDir}:`, error.message);
        }
    }
    scanDirectory(dir);
    return files;
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

// Main processing function
function processFiles() {
    console.log('🔍 Discovering files...');
    const discoveredFiles = discoverFiles();
    console.log(`📁 Found ${discoveredFiles.length} files to process`);
    for (const filePath of discoveredFiles) {
        try {
            if (!fs.existsSync(filePath)) {
                continue;
            }
            const originalContent = fs.readFileSync(filePath, 'utf8');
            let { content: updatedContent, hasChanges: contentChanged } = updateFileContent(filePath, originalContent);
            let { content: finalContent, hasChanges: headerChanged } = updateFileHeaders(filePath, updatedContent);
            const hasAnyChanges = contentChanged || headerChanged;
            if (hasAnyChanges) {
                fs.writeFileSync(filePath, finalContent, 'utf8');
                console.log(`✅ Updated: ${filePath}`);
                updatedFiles++;
            } else {
                console.log(`ℹ️  No changes needed: ${filePath}`);
            }
        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error.message);
            errors++;
        }
    }
}

// Execute the main process
processFiles();

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

// EOF bin/bump-version.js
