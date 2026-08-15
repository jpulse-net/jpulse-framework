/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Hook Definitions
 * @tagline         Catalog honesty: every non-planned framework hook has a fire site
 * @description     Walks framework source and asserts each owner:'framework' definition that
 *                  is not marked planned has a matching execute/executeFirst/executeForPlugin
 *                  call site, so the catalog cannot silently lie about hooks that never fire.
 * @file            webapp/tests/unit/utils/hook-definitions.test.js
 * @version         1.7.15
 * @release         2026-08-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import HookManager from '../../../utils/hook-manager.js';

const webappDir = path.resolve(process.cwd(), 'webapp');

function collectJsFiles(dir, acc = []) {
    for (const entry of fs.readdirSync(dir)) {
        if (entry === 'tests' || entry === 'node_modules') {
            continue;
        }
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) {
            collectJsFiles(full, acc);
        } else if (entry.endsWith('.js') && entry !== 'hook-definitions.js') {
            acc.push(full);
        }
    }
    return acc;
}

describe('framework hook catalog honesty', () => {
    test('every non-planned framework definition has an execute* fire site', () => {
        const sources = collectJsFiles(webappDir).map(file => fs.readFileSync(file, 'utf8'));
        const missing = [];

        for (const definition of HookManager.definitions.values()) {
            if (definition.owner !== 'framework' || definition.stability === 'planned') {
                continue;
            }
            const fire = new RegExp(
                `execute(?:First|ForPlugin)?\\s*\\(\\s*['"]${definition.name}['"]`
            );
            const fired = sources.some(source => fire.test(source));
            if (!fired) {
                missing.push(definition.name);
            }
        }

        expect(missing).toEqual([]);
    });
});

// EOF webapp/tests/unit/utils/hook-definitions.test.js
