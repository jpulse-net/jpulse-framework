/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Bin / Plugin Bundle CLI
 * @tagline         Local-path install, pack-to round trip, and publish rules for plugin bundles
 * @description     Spawns the CLI in isolated temp projects so the live .jpulse/ tree is never touched
 * @file            webapp/tests/unit/bin/plugin-bundle-cli.test.js
 * @version         2.0.5
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { assembleBundlePackage } from '../../../utils/plugin-package.js';

const CLI = path.resolve(process.cwd(), 'bin/plugin-manager-cli.js');

function writeJson(filePath, obj) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 4) + '\n');
}

function writePlugin(dir, name, extra = {}) {
    writeJson(path.join(dir, 'plugin.json'), {
        name,
        version: extra.version || '1.0.0',
        summary: extra.summary || `${name} summary`,
        author: extra.author || 'Test <test@example.com>',
        jpulseVersion: extra.jpulseVersion || '>=1.3.0',
        autoEnable: extra.autoEnable ?? true,
        npmPackage: extra.npmPackage,
        bundle: extra.bundle,
        dependencies: extra.dependencies || { npm: {}, plugins: extra.pluginDeps || {} }
    });
    fs.mkdirSync(path.join(dir, 'webapp'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'webapp', 'marker.txt'), name);
}

function makeSiteProject(root) {
    fs.mkdirSync(path.join(root, 'site', 'webapp'), { recursive: true });
    fs.writeFileSync(path.join(root, 'site', 'webapp', 'app.conf'), '{\n}\n');
    fs.mkdirSync(path.join(root, 'plugins'), { recursive: true });
}

function runCli(cwd, args) {
    try {
        const stdout = execFileSync(process.execPath, [CLI, ...args], {
            cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
        return { status: 0, stdout, stderr: '' };
    } catch (error) {
        return {
            status: error.status || 1,
            stdout: error.stdout || '',
            stderr: error.stderr || error.message
        };
    }
}

describe('plugin bundle CLI', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jpulse-plugin-bundle-cli-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('single-plugin local install copies one directory', () => {
        const site = path.join(tmpDir, 'site-a');
        makeSiteProject(site);
        const src = path.join(tmpDir, 'auth-oauth');
        writePlugin(src, 'auth-oauth', { autoEnable: false, npmPackage: '@jpulse-net/plugin-auth-oauth' });

        const result = runCli(site, ['install', src, '--no-deps']);
        expect(result.status).toBe(0);
        expect(fs.existsSync(path.join(site, 'plugins', 'auth-oauth', 'plugin.json'))).toBe(true);
        expect(fs.readdirSync(path.join(site, 'plugins'))).toEqual(['auth-oauth']);
        const registry = JSON.parse(fs.readFileSync(path.join(site, '.jpulse', 'plugins.json'), 'utf8'));
        expect(registry.plugins).toHaveLength(1);
        expect(registry.plugins[0].name).toBe('auth-oauth');
        expect(registry.plugins[0].enabled).toBe(false);
    });

    test('bundle local install expands two members and honors autoEnable', () => {
        const site = path.join(tmpDir, 'site-b');
        makeSiteProject(site);
        const bundle = path.join(tmpDir, 'bundle');
        writePlugin(path.join(bundle, 'plugins', 'demo-primary'), 'demo-primary', {
            autoEnable: true,
            npmPackage: '@jpulse-net/plugin-demo-primary'
        });
        writePlugin(path.join(bundle, 'plugins', 'demo-secondary'), 'demo-secondary', {
            autoEnable: false,
            npmPackage: '@jpulse-net/plugin-demo-primary'
        });

        const result = runCli(site, ['install', bundle, '--no-deps']);
        expect(result.status).toBe(0);
        expect(fs.readdirSync(path.join(site, 'plugins')).sort()).toEqual(['demo-primary', 'demo-secondary']);
        const registry = JSON.parse(fs.readFileSync(path.join(site, '.jpulse', 'plugins.json'), 'utf8'));
        const byName = Object.fromEntries(registry.plugins.map(p => [p.name, p]));
        expect(byName['demo-primary'].enabled).toBe(true);
        expect(byName['demo-secondary'].enabled).toBe(false);
    });

    test('root plugin.json plus plugins/*/plugin.json is an error', () => {
        const site = path.join(tmpDir, 'site-c');
        makeSiteProject(site);
        const bad = path.join(tmpDir, 'both');
        writePlugin(bad, 'oops');
        writePlugin(path.join(bad, 'plugins', 'demo-primary'), 'demo-primary');

        const result = runCli(site, ['install', bad, '--no-deps']);
        expect(result.status).not.toBe(0);
        expect(result.stderr + result.stdout).toMatch(/both a root plugin\.json/);
    });

    test('missing string-form plugin dependency fails and does not guess a package', () => {
        const site = path.join(tmpDir, 'site-d');
        makeSiteProject(site);
        const src = path.join(tmpDir, 'provider');
        writePlugin(src, 'provider', {
            pluginDeps: { 'ai-core': '>=1.0.0' }
        });

        const result = runCli(site, ['install', src]);
        expect(result.status).not.toBe(0);
        expect(result.stderr + result.stdout).toMatch(/ai-core/);
        expect(fs.existsSync(path.join(site, 'plugins', 'ai-core'))).toBe(false);
    });

    test('--no-deps skips a missing plugin dependency', () => {
        const site = path.join(tmpDir, 'site-e');
        makeSiteProject(site);
        const src = path.join(tmpDir, 'provider-nodeps');
        writePlugin(src, 'provider-nodeps', {
            pluginDeps: { 'ai-core': { version: '>=1.0.0', npmPackage: '@jpulse-net/plugin-ai-core' } }
        });

        const result = runCli(site, ['install', src, '--no-deps']);
        expect(result.status).toBe(0);
        expect(fs.existsSync(path.join(site, 'plugins', 'provider-nodeps', 'plugin.json'))).toBe(true);
        expect(fs.existsSync(path.join(site, 'plugins', 'ai-core'))).toBe(false);
    });

    test('publish --pack-to of a primary assembles the bundle and installs back', () => {
        const srcSite = path.join(tmpDir, 'src-site');
        makeSiteProject(srcSite);
        writePlugin(path.join(srcSite, 'plugins', 'demo-primary'), 'demo-primary', {
            version: '1.2.0',
            npmPackage: '@jpulse-net/plugin-demo-primary',
            bundle: { members: ['demo-secondary'] }
        });
        writePlugin(path.join(srcSite, 'plugins', 'demo-secondary'), 'demo-secondary', {
            version: '1.0.0',
            npmPackage: '@jpulse-net/plugin-demo-primary'
        });

        const packDir = path.join(tmpDir, 'packed');
        const packResult = runCli(srcSite, ['publish', 'demo-primary', `--pack-to=${packDir}`]);
        expect(packResult.status).toBe(0);

        expect(fs.existsSync(path.join(packDir, 'plugin.json'))).toBe(false);
        expect(fs.existsSync(path.join(packDir, 'package.json'))).toBe(true);
        const pkg = JSON.parse(fs.readFileSync(path.join(packDir, 'package.json'), 'utf8'));
        expect(pkg.name).toBe('@jpulse-net/plugin-demo-primary');
        expect(pkg.version).toBe('1.2.0');
        expect(fs.existsSync(path.join(packDir, 'plugins', 'demo-primary', 'plugin.json'))).toBe(true);
        expect(fs.existsSync(path.join(packDir, 'plugins', 'demo-secondary', 'plugin.json'))).toBe(true);

        const secondary = JSON.parse(fs.readFileSync(
            path.join(srcSite, 'plugins', 'demo-secondary', 'plugin.json'), 'utf8'
        ));
        expect(secondary.version).toBe('1.2.0');

        const destSite = path.join(tmpDir, 'dest-site');
        makeSiteProject(destSite);
        const installResult = runCli(destSite, ['install', packDir, '--no-deps']);
        expect(installResult.status).toBe(0);
        expect(fs.readdirSync(path.join(destSite, 'plugins')).sort()).toEqual([
            'demo-primary',
            'demo-secondary'
        ]);
    });

    test('publish of a companion is refused and names the primary', () => {
        const srcSite = path.join(tmpDir, 'src-site-2');
        makeSiteProject(srcSite);
        writePlugin(path.join(srcSite, 'plugins', 'demo-primary'), 'demo-primary', {
            npmPackage: '@jpulse-net/plugin-demo-primary',
            bundle: { members: ['demo-secondary'] }
        });
        writePlugin(path.join(srcSite, 'plugins', 'demo-secondary'), 'demo-secondary', {
            npmPackage: '@jpulse-net/plugin-demo-primary'
        });

        const result = runCli(srcSite, ['publish', 'demo-secondary']);
        expect(result.status).not.toBe(0);
        expect(result.stderr + result.stdout).toMatch(/companion of 'demo-primary'/);
    });

    test('publish --dry-run does not write source versions', () => {
        const srcSite = path.join(tmpDir, 'src-site-3');
        makeSiteProject(srcSite);
        writePlugin(path.join(srcSite, 'plugins', 'demo-primary'), 'demo-primary', {
            version: '2.0.0',
            npmPackage: '@jpulse-net/plugin-demo-primary',
            bundle: { members: ['demo-secondary'] }
        });
        writePlugin(path.join(srcSite, 'plugins', 'demo-secondary'), 'demo-secondary', {
            version: '1.0.0',
            npmPackage: '@jpulse-net/plugin-demo-primary'
        });

        const result = runCli(srcSite, ['publish', 'demo-primary', '--dry-run']);
        expect(result.status).toBe(0);
        const secondary = JSON.parse(fs.readFileSync(
            path.join(srcSite, 'plugins', 'demo-secondary', 'plugin.json'), 'utf8'
        ));
        expect(secondary.version).toBe('1.0.0');
    });

    test('plain npm pack of a wired primary produces the bundle tarball shape', () => {
        const pluginsDir = path.join(tmpDir, 'npm-pack-site', 'plugins');
        const primaryDir = path.join(pluginsDir, 'demo-primary');
        writePlugin(primaryDir, 'demo-primary', {
            version: '1.4.0',
            npmPackage: '@scope/plugin-demo-primary',
            bundle: { members: ['demo-secondary'] }
        });
        writePlugin(path.join(pluginsDir, 'demo-secondary'), 'demo-secondary', {
            version: '1.4.0',
            npmPackage: '@scope/plugin-demo-primary'
        });
        writeJson(path.join(primaryDir, 'package.json'), {
            name: '@scope/plugin-demo-primary',
            version: '1.4.0',
            private: true,
            files: ['plugins'],
            scripts: {
                prepack: `node ${JSON.stringify(CLI)} stage-bundle`,
                postpack: `node ${JSON.stringify(CLI)} unstage-bundle`
            }
        });

        execFileSync('npm', ['pack'], { cwd: primaryDir, stdio: 'pipe' });
        const tarball = fs.readdirSync(primaryDir).find(f => f.endsWith('.tgz'));
        expect(tarball).toBeDefined();

        const listing = execFileSync('tar', ['-tzf', tarball], {
            cwd: primaryDir,
            encoding: 'utf8'
        }).trim().split('\n').map(line => line.replace(/^package\//, '')).sort();

        expect(listing).toContain('package.json');
        expect(listing).toContain('plugins/demo-primary/plugin.json');
        expect(listing).toContain('plugins/demo-secondary/plugin.json');
        expect(listing).not.toContain('plugin.json');
        expect(listing.some(f => f.startsWith('webapp/'))).toBe(false);

        // postpack removed the staging tree, so the source is unchanged
        expect(fs.existsSync(path.join(primaryDir, 'plugins'))).toBe(false);
        expect(fs.existsSync(path.join(primaryDir, 'plugin.json'))).toBe(true);
    }, 120000);

    test('assembleBundlePackage writes root package.json and no root plugin.json', () => {
        const pluginsDir = path.join(tmpDir, 'plugins');
        writePlugin(path.join(pluginsDir, 'demo-primary'), 'demo-primary', {
            version: '3.0.0',
            npmPackage: '@jpulse-net/plugin-demo-primary'
        });
        writePlugin(path.join(pluginsDir, 'demo-secondary'), 'demo-secondary', {
            version: '3.0.0',
            npmPackage: '@jpulse-net/plugin-demo-primary'
        });
        const dest = path.join(tmpDir, 'out');
        const primaryJson = JSON.parse(fs.readFileSync(
            path.join(pluginsDir, 'demo-primary', 'plugin.json'), 'utf8'
        ));
        assembleBundlePackage(
            path.join(pluginsDir, 'demo-primary'),
            primaryJson,
            ['demo-secondary'],
            pluginsDir,
            dest,
            { syncSourceVersions: false }
        );
        expect(fs.existsSync(path.join(dest, 'plugin.json'))).toBe(false);
        expect(fs.existsSync(path.join(dest, 'package.json'))).toBe(true);
        expect(fs.existsSync(path.join(dest, 'plugins', 'demo-primary'))).toBe(true);
        expect(fs.existsSync(path.join(dest, 'plugins', 'demo-secondary'))).toBe(true);
    });
});

// EOF webapp/tests/unit/bin/plugin-bundle-cli.test.js
