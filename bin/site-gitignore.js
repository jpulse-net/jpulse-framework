/**
 * @name            jPulse Framework / Bin / Site Gitignore
 * @tagline         Ensure a site .gitignore ignores generated plugin links
 * @description     Writes templates/site.gitignore when missing; appends the
 *                  plugin-runtime ignore block when a customized file lacks it
 * @file            bin/site-gitignore.js
 * @version         2.0.5
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.15, Grok 4.6
 */

import fs from 'fs';
import path from 'path';

const PLUGIN_RUNTIME_PATTERNS = [
    'webapp/static/plugins/*',
    'webapp/static/assets/jpulse-docs/installed-plugins/*'
];

const PLUGIN_RUNTIME_BLOCK = [
    '',
    '# Plugin runtime links (created on start; do not commit)',
    'webapp/static/plugins/*',
    '!webapp/static/plugins/.gitkeep',
    'webapp/static/assets/jpulse-docs/installed-plugins/*',
    '!webapp/static/assets/jpulse-docs/installed-plugins/README.md',
    ''
].join('\n');

/**
 * True when the file already ignores both generated plugin-link directories.
 * @param {string} content
 * @returns {boolean}
 */
export function hasPluginRuntimeBlock(content) {
    const lines = new Set(
        content.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    );
    return PLUGIN_RUNTIME_PATTERNS.every(pattern => lines.has(pattern));
}

/**
 * Write the full site .gitignore if missing; append the plugin-runtime block
 * if a customized file lacks those patterns. Never overwrites a customized file.
 *
 * @param {string} [siteRoot=process.cwd()] - Site project root
 * @param {object} [options]
 * @param {string} [options.templatePath] - Path to templates/site.gitignore (required to create)
 * @returns {{ action: 'created'|'appended'|'unchanged', path: string }}
 */
export function ensureSiteGitignore(siteRoot = process.cwd(), options = {}) {
    const gitignorePath = path.join(siteRoot, '.gitignore');
    const templatePath = options.templatePath;

    if (!fs.existsSync(gitignorePath)) {
        if (!templatePath) {
            throw new Error('ensureSiteGitignore: templatePath is required when creating .gitignore');
        }
        const template = fs.readFileSync(templatePath, 'utf8');
        fs.writeFileSync(gitignorePath, template);
        return { action: 'created', path: gitignorePath };
    }

    const existing = fs.readFileSync(gitignorePath, 'utf8');
    if (hasPluginRuntimeBlock(existing)) {
        return { action: 'unchanged', path: gitignorePath };
    }

    const prefix = existing.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(gitignorePath, existing + prefix + PLUGIN_RUNTIME_BLOCK);
    return { action: 'appended', path: gitignorePath };
}

// EOF bin/site-gitignore.js
