/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Bin / Site Gitignore
 * @tagline         Unit tests for ensureSiteGitignore write/append/no-op
 * @description     Writes the full template when missing; appends the plugin-runtime
 *                  block when a customized file lacks it; second run is unchanged
 * @file            webapp/tests/unit/bin/site-gitignore.test.js
 * @version         2.0.4
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.15, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
    ensureSiteGitignore,
    hasPluginRuntimeBlock
} from '../../../../bin/site-gitignore.js';

describe('ensureSiteGitignore()', () => {
    let tmpRoot;
    let templatePath;

    beforeEach(() => {
        tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jpulse-site-gitignore-'));
        templatePath = path.join(process.cwd(), 'templates', 'site.gitignore');
    });

    afterEach(() => {
        try {
            fs.rmSync(tmpRoot, { recursive: true, force: true });
        } catch (e) {
            // ignore
        }
    });

    test('writes the full template when .gitignore is missing', () => {
        const result = ensureSiteGitignore(tmpRoot, { templatePath });
        expect(result.action).toBe('created');
        const written = fs.readFileSync(path.join(tmpRoot, '.gitignore'), 'utf8');
        const template = fs.readFileSync(templatePath, 'utf8');
        expect(written).toBe(template);
        expect(hasPluginRuntimeBlock(written)).toBe(true);
        expect(written).toContain('site/webapp/app-secret.conf');
        expect(written).not.toMatch(/^site\/webapp\/app\.conf$/m);
    });

    test('appends the plugin-runtime block when a customized file lacks it', () => {
        const existing = '# my site\nnode_modules/\n.env\n';
        fs.writeFileSync(path.join(tmpRoot, '.gitignore'), existing);

        const result = ensureSiteGitignore(tmpRoot, { templatePath });
        expect(result.action).toBe('appended');
        const written = fs.readFileSync(path.join(tmpRoot, '.gitignore'), 'utf8');
        expect(written.startsWith(existing)).toBe(true);
        expect(hasPluginRuntimeBlock(written)).toBe(true);
        expect(written).toContain('# my site');
        expect(written).toContain('webapp/static/plugins/*');
        expect(written).toContain('!webapp/static/plugins/.gitkeep');
        expect(written).toContain('webapp/static/assets/jpulse-docs/installed-plugins/*');
        expect(written).toContain('!webapp/static/assets/jpulse-docs/installed-plugins/README.md');
    });

    test('second run is a no-op', () => {
        ensureSiteGitignore(tmpRoot, { templatePath });
        const first = fs.readFileSync(path.join(tmpRoot, '.gitignore'), 'utf8');
        const result = ensureSiteGitignore(tmpRoot, { templatePath });
        expect(result.action).toBe('unchanged');
        expect(fs.readFileSync(path.join(tmpRoot, '.gitignore'), 'utf8')).toBe(first);
    });

    test('append then second run is a no-op', () => {
        fs.writeFileSync(path.join(tmpRoot, '.gitignore'), 'node_modules/\n');
        expect(ensureSiteGitignore(tmpRoot, { templatePath }).action).toBe('appended');
        const afterAppend = fs.readFileSync(path.join(tmpRoot, '.gitignore'), 'utf8');
        expect(ensureSiteGitignore(tmpRoot, { templatePath }).action).toBe('unchanged');
        expect(fs.readFileSync(path.join(tmpRoot, '.gitignore'), 'utf8')).toBe(afterAppend);
    });
});

// EOF webapp/tests/unit/bin/site-gitignore.test.js
