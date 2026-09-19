/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Bin / Bump Version Bundle
 * @tagline         Bundle-aware bump-version applies the primary file list to every member
 * @description     Isolated plugin fixtures; never runs bump against the live repo
 * @file            webapp/tests/unit/bin/bump-version-bundle.test.js
 * @version         2.0.5
 * @release         2026-09-19
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { runBump } from '../../../../bin/bump-version.js';

const BUMP_CONF = [
    '{',
    "    filePatterns: ['plugin.json', 'webapp/*.js'],",
    '    fileUpdateRules: [{',
    "        pattern: 'plugin.json',",
    '        replacements: [{',
    '            from: /"version": "[\\d.]+(-[a-z]+\\.\\d+)?"/,',
    '            to: (version) => `"version": "${version}"`',
    '        }]',
    '    }],',
    '    headerUpdatePatterns: {',
    '        version: /([\\*#] @version\\s+)[\\d.]+(-[a-z]+\\.\\d+)?/,',
    '        release: /([\\*#] @release\\s+)[\\d-]+/',
    '    }',
    '}',
    ''
].join('\n');

function writePlugin(dir, name, extra = {}) {
    fs.mkdirSync(path.join(dir, 'webapp'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify({
        name,
        version: extra.version || '1.0.0',
        bundle: extra.bundle
    }, null, 4) + '\n');
    fs.writeFileSync(path.join(dir, 'webapp', 'sample.js'),
        '/**\n * @version         1.0.0\n * @release         2026-01-01\n */\nexport const name = \'' + name + '\';\n'
    );
    if (extra.withConf) {
        fs.writeFileSync(path.join(dir, 'webapp', 'bump-version.conf'), BUMP_CONF);
    }
}

describe('bump-version bundle', () => {
    let tmpDir;
    let cwd;

    beforeEach(() => {
        cwd = process.cwd();
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jpulse-bump-bundle-'));
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        process.chdir(cwd);
        console.log.mockRestore();
        console.error.mockRestore();
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('bump from a primary updates plugin.json and @version in every member', () => {
        const pluginsDir = path.join(tmpDir, 'plugins');
        writePlugin(path.join(pluginsDir, 'demo-primary'), 'demo-primary', {
            version: '1.0.0',
            bundle: { members: ['demo-secondary'] },
            withConf: true
        });
        writePlugin(path.join(pluginsDir, 'demo-secondary'), 'demo-secondary', {
            version: '1.0.0'
        });

        process.chdir(path.join(pluginsDir, 'demo-primary'));
        runBump('1.2.0', '2026-09-14');

        const primary = JSON.parse(fs.readFileSync(path.join(pluginsDir, 'demo-primary', 'plugin.json'), 'utf8'));
        const secondary = JSON.parse(fs.readFileSync(path.join(pluginsDir, 'demo-secondary', 'plugin.json'), 'utf8'));
        expect(primary.version).toBe('1.2.0');
        expect(secondary.version).toBe('1.2.0');
        expect(fs.readFileSync(path.join(pluginsDir, 'demo-primary', 'webapp', 'sample.js'), 'utf8'))
            .toMatch(/@version\s+1\.2\.0/);
        expect(fs.readFileSync(path.join(pluginsDir, 'demo-secondary', 'webapp', 'sample.js'), 'utf8'))
            .toMatch(/@version\s+1\.2\.0/);
    });

    test('a plugin without bump-version.conf prints the missing-conf message', () => {
        const pluginsDir = path.join(tmpDir, 'plugins');
        writePlugin(path.join(pluginsDir, 'lonely'), 'lonely', { version: '1.0.0' });

        process.chdir(path.join(pluginsDir, 'lonely'));
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`exit ${code}`);
        });
        expect(() => runBump('1.2.0', '2026-09-14')).toThrow(/exit 1/);
        expect(console.error.mock.calls.flat().join('\n')).toMatch(/webapp\/bump-version\.conf/);
        expect(JSON.parse(fs.readFileSync(path.join(pluginsDir, 'lonely', 'plugin.json'), 'utf8')).version)
            .toBe('1.0.0');
        exitSpy.mockRestore();
    });

    test('bump from a companion is refused and names the primary', () => {
        const pluginsDir = path.join(tmpDir, 'plugins');
        writePlugin(path.join(pluginsDir, 'demo-primary'), 'demo-primary', {
            bundle: { members: ['demo-secondary'] },
            withConf: true
        });
        writePlugin(path.join(pluginsDir, 'demo-secondary'), 'demo-secondary', {
            version: '1.0.0'
        });

        process.chdir(path.join(pluginsDir, 'demo-secondary'));
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`exit ${code}`);
        });
        expect(() => runBump('1.2.0', '2026-09-14')).toThrow(/exit 1/);
        const err = console.error.mock.calls.flat().join('\n');
        expect(err).toMatch(/webapp\/bump-version\.conf/);
        expect(err).toMatch(/demo-primary/);
        const secondary = JSON.parse(fs.readFileSync(path.join(pluginsDir, 'demo-secondary', 'plugin.json'), 'utf8'));
        expect(secondary.version).toBe('1.0.0');
        exitSpy.mockRestore();
    });

    test('a plugin with no bundle.members updates only cwd', () => {
        const pluginsDir = path.join(tmpDir, 'plugins');
        writePlugin(path.join(pluginsDir, 'auth-oauth'), 'auth-oauth', {
            version: '1.0.0',
            withConf: true
        });
        writePlugin(path.join(pluginsDir, 'other'), 'other', {
            version: '1.0.0'
        });

        process.chdir(path.join(pluginsDir, 'auth-oauth'));
        runBump('2.0.0', '2026-09-14');

        expect(JSON.parse(fs.readFileSync(path.join(pluginsDir, 'auth-oauth', 'plugin.json'), 'utf8')).version)
            .toBe('2.0.0');
        expect(JSON.parse(fs.readFileSync(path.join(pluginsDir, 'other', 'plugin.json'), 'utf8')).version)
            .toBe('1.0.0');
    });
});

// EOF webapp/tests/unit/bin/bump-version-bundle.test.js
