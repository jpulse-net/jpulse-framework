/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / SymlinkManager
 * @tagline         Unit tests for SymlinkManager docs symlink creation messages
 * @description     Tests that directory blockers return actionable messages (empty vs non-empty, .DS_Store ignored)
 * @file            webapp/tests/unit/utils/symlink-manager.test.js
 * @version         1.4.11
 * @release         2026-01-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 2.2, GPT-5.2
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import SymlinkManager from '../../../utils/symlink-manager.js';

describe('SymlinkManager.createPluginDocsSymlink()', () => {
    let tmpRoot;
    let originalAppConfig;

    beforeEach(() => {
        originalAppConfig = global.appConfig;

        tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jpulse-symlink-test-'));

        global.appConfig = {
            system: {
                projectRoot: tmpRoot,
                appDir: tmpRoot,
                siteDir: path.join(tmpRoot, 'site')
            }
        };

        // Ensure framework context (docs/installed-plugins)
        fs.mkdirSync(path.join(tmpRoot, 'docs', 'installed-plugins'), { recursive: true });
    });

    afterEach(() => {
        try {
            fs.rmSync(tmpRoot, { recursive: true, force: true });
        } catch (e) {
            // ignore
        }
        global.appConfig = originalAppConfig;
    });

    test('should return actionable message when docs path exists as empty directory', () => {
        const pluginName = 'test-plugin';
        const pluginPath = path.join(tmpRoot, 'plugins', pluginName);
        fs.mkdirSync(path.join(pluginPath, 'docs'), { recursive: true });

        // Blocker: empty directory at docs/installed-plugins/test-plugin
        const blockerDir = path.join(tmpRoot, 'docs', 'installed-plugins', pluginName);
        fs.mkdirSync(blockerDir, { recursive: true });

        const result = SymlinkManager.createPluginDocsSymlink(pluginName, pluginPath);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Docs path exists as directory');
        expect(result.message).toContain('Directory is empty; remove it to allow docs symlink creation.');
    });

    test('should ignore .DS_Store and treat directory as empty', () => {
        const pluginName = 'dsstore-only-plugin';
        const pluginPath = path.join(tmpRoot, 'plugins', pluginName);
        fs.mkdirSync(path.join(pluginPath, 'docs'), { recursive: true });

        const blockerDir = path.join(tmpRoot, 'docs', 'installed-plugins', pluginName);
        fs.mkdirSync(blockerDir, { recursive: true });
        fs.writeFileSync(path.join(blockerDir, '.DS_Store'), 'x');

        const result = SymlinkManager.createPluginDocsSymlink(pluginName, pluginPath);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Directory is empty; remove it to allow docs symlink creation.');
    });

    test('should return actionable message when docs path exists as non-empty directory', () => {
        const pluginName = 'non-empty-plugin';
        const pluginPath = path.join(tmpRoot, 'plugins', pluginName);
        fs.mkdirSync(path.join(pluginPath, 'docs'), { recursive: true });

        const blockerDir = path.join(tmpRoot, 'docs', 'installed-plugins', pluginName);
        fs.mkdirSync(blockerDir, { recursive: true });
        fs.writeFileSync(path.join(blockerDir, 'keep.txt'), 'keep');

        const result = SymlinkManager.createPluginDocsSymlink(pluginName, pluginPath);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Docs path exists as directory');
        expect(result.message).toContain('Directory contains 1 item(s); remove/rename it to allow docs symlink creation.');
    });
});

// EOF webapp/tests/unit/utils/symlink-manager.test.js
