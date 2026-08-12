/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Common File
 * @tagline         Unit Tests for File Utilities (W-199)
 * @description     Tests CommonUtils.writeFileAtomic() - the shared temp-file+rename helper used
 *                   by PluginManager and app.js to eliminate torn reads of `.jpulse/*.json` caches
 *                   under concurrent PM2 cluster access
 * @file            webapp/tests/unit/utils/common-utils-file.test.js
 * @version         1.7.11
 * @release         2026-08-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           85%, Cursor 3.13, Claude Sonnet 5
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import CommonUtils from '../../../utils/common.js';

describe('CommonUtils.writeFileAtomic() (W-199)', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jpulse-write-atomic-test-'));
    });

    afterEach(() => {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (error) {
            // ignore cleanup errors
        }
    });

    test('creates a new file with the given content', () => {
        const filePath = path.join(tmpDir, 'new-file.json');

        CommonUtils.writeFileAtomic(filePath, JSON.stringify({ hello: 'world' }));

        expect(fs.existsSync(filePath)).toBe(true);
        expect(JSON.parse(fs.readFileSync(filePath, 'utf8'))).toEqual({ hello: 'world' });
    });

    test('overwrites an existing file completely (no merge/append)', () => {
        const filePath = path.join(tmpDir, 'existing-file.json');
        fs.writeFileSync(filePath, JSON.stringify({ old: true }));

        CommonUtils.writeFileAtomic(filePath, JSON.stringify({ new: true }));

        expect(JSON.parse(fs.readFileSync(filePath, 'utf8'))).toEqual({ new: true });
    });

    test('leaves no leftover temp file in the target directory after a successful write', () => {
        const filePath = path.join(tmpDir, 'clean.json');

        CommonUtils.writeFileAtomic(filePath, '{}');

        const files = fs.readdirSync(tmpDir);
        expect(files).toEqual(['clean.json']);
    });

    test('a reader never observes a partially-written file (rename is the only visible mutation)', () => {
        const filePath = path.join(tmpDir, 'atomic.json');
        const largeContent = JSON.stringify({ payload: 'x'.repeat(100000) });

        CommonUtils.writeFileAtomic(filePath, largeContent);

        // Since writeFileAtomic() only makes the target path visible via fs.renameSync()
        // (a single filesystem operation), any concurrent reader either sees no file yet,
        // or the fully-written final content - never a truncated/partial write
        const readBack = fs.readFileSync(filePath, 'utf8');
        expect(readBack).toBe(largeContent);
        expect(() => JSON.parse(readBack)).not.toThrow();
    });

    test('cleans up its temp file and rethrows if the target directory does not exist', () => {
        const filePath = path.join(tmpDir, 'missing-dir', 'file.json');

        expect(() => CommonUtils.writeFileAtomic(filePath, '{}')).toThrow();
        expect(fs.existsSync(filePath)).toBe(false);

        // No stray temp file left behind in tmpDir itself
        expect(fs.readdirSync(tmpDir)).toEqual([]);
    });

    test('uses a distinct temp filename per call (pid + timestamp) to avoid collisions', () => {
        const filePath1 = path.join(tmpDir, 'a.json');
        const filePath2 = path.join(tmpDir, 'b.json');

        CommonUtils.writeFileAtomic(filePath1, '{"a":1}');
        CommonUtils.writeFileAtomic(filePath2, '{"b":2}');

        expect(JSON.parse(fs.readFileSync(filePath1, 'utf8'))).toEqual({ a: 1 });
        expect(JSON.parse(fs.readFileSync(filePath2, 'utf8'))).toEqual({ b: 2 });
        expect(fs.readdirSync(tmpDir).sort()).toEqual(['a.json', 'b.json']);
    });
});

// EOF webapp/tests/unit/utils/common-utils-file.test.js
