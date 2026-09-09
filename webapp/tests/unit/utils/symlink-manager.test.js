/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / SymlinkManager
 * @tagline         Unit tests for SymlinkManager docs symlink creation messages
 * @description     Tests that directory blockers return actionable messages (empty vs non-empty, .DS_Store ignored)
 * @file            webapp/tests/unit/utils/symlink-manager.test.js
 * @version         1.8.0
 * @release         2026-09-08
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

describe('SymlinkManager.removeStalePluginSymlinks()', () => {
    let tmpRoot;
    let originalAppConfig;

    beforeEach(() => {
        originalAppConfig = global.appConfig;
        tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jpulse-symlink-stale-'));
        global.appConfig = {
            system: {
                projectRoot: tmpRoot,
                appDir: tmpRoot,
                siteDir: path.join(tmpRoot, 'site')
            }
        };
        fs.mkdirSync(path.join(tmpRoot, 'docs', 'plugins'), { recursive: true });
        fs.mkdirSync(path.join(tmpRoot, 'docs', 'installed-plugins'), { recursive: true });
        fs.mkdirSync(path.join(tmpRoot, 'webapp', 'static', 'plugins'), { recursive: true });
        fs.writeFileSync(path.join(tmpRoot, 'webapp', 'static', 'plugins', '.gitkeep'), '');
        fs.writeFileSync(path.join(tmpRoot, 'docs', 'installed-plugins', 'README.md'), '# Installed');
    });

    afterEach(() => {
        try {
            fs.rmSync(tmpRoot, { recursive: true, force: true });
        } catch (e) {
            // ignore
        }
        global.appConfig = originalAppConfig;
    });

    function addPluginDirs(name) {
        const staticTarget = path.join(tmpRoot, 'plugins', name, 'webapp', 'static');
        const docsTarget = path.join(tmpRoot, 'plugins', name, 'docs');
        fs.mkdirSync(staticTarget, { recursive: true });
        fs.mkdirSync(docsTarget, { recursive: true });
        return { staticTarget, docsTarget };
    }

    test('removes leftover static and docs links for a disabled plugin', () => {
        const keep = addPluginDirs('keep-me');
        const stale = addPluginDirs('stale-me');
        fs.symlinkSync(
            path.relative(path.join(tmpRoot, 'webapp', 'static', 'plugins'), keep.staticTarget),
            path.join(tmpRoot, 'webapp', 'static', 'plugins', 'keep-me')
        );
        fs.symlinkSync(
            path.relative(path.join(tmpRoot, 'webapp', 'static', 'plugins'), stale.staticTarget),
            path.join(tmpRoot, 'webapp', 'static', 'plugins', 'stale-me')
        );
        fs.symlinkSync(
            path.relative(path.join(tmpRoot, 'docs', 'installed-plugins'), keep.docsTarget),
            path.join(tmpRoot, 'docs', 'installed-plugins', 'keep-me')
        );
        fs.symlinkSync(
            path.relative(path.join(tmpRoot, 'docs', 'installed-plugins'), stale.docsTarget),
            path.join(tmpRoot, 'docs', 'installed-plugins', 'stale-me')
        );

        const result = SymlinkManager.removeStalePluginSymlinks(['keep-me']);
        expect(result.removed).toBe(2);
        expect(result.failed).toBe(0);
        expect(fs.lstatSync(path.join(tmpRoot, 'webapp', 'static', 'plugins', 'keep-me')).isSymbolicLink()).toBe(true);
        expect(fs.existsSync(path.join(tmpRoot, 'webapp', 'static', 'plugins', 'stale-me'))).toBe(false);
        expect(fs.lstatSync(path.join(tmpRoot, 'docs', 'installed-plugins', 'keep-me')).isSymbolicLink()).toBe(true);
        expect(fs.existsSync(path.join(tmpRoot, 'docs', 'installed-plugins', 'stale-me'))).toBe(false);
        expect(fs.existsSync(path.join(tmpRoot, 'webapp', 'static', 'plugins', '.gitkeep'))).toBe(true);
        expect(fs.existsSync(path.join(tmpRoot, 'docs', 'installed-plugins', 'README.md'))).toBe(true);
    });

    test('does not delete a real directory that is not a symlink', () => {
        const realDir = path.join(tmpRoot, 'webapp', 'static', 'plugins', 'real-dir');
        fs.mkdirSync(realDir, { recursive: true });
        fs.writeFileSync(path.join(realDir, 'keep.txt'), 'x');

        const result = SymlinkManager.removeStalePluginSymlinks([]);
        expect(result.removed).toBe(0);
        expect(fs.existsSync(path.join(realDir, 'keep.txt'))).toBe(true);
    });
});

// EOF webapp/tests/unit/utils/symlink-manager.test.js
