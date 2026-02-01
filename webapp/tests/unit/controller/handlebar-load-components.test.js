/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar loadComponents (W-145)
 * @tagline         Unit tests for loadComponents() - load components from template without rendering
 * @description     API-style return, asset path only, nested component structure. Fixture under tests/fixtures; PathResolver mocked so loadComponents reads from disk.
 * @file            webapp/tests/unit/controller/handlebar-load-components.test.js
 * @version         1.6.4
 * @release         2026-02-01
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.4, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach, beforeAll } from '@jest/globals';

const FIXTURE_ASSET_PATH = 'assets/test-load-components.tmpl';

// Mock PathResolver so resolveAsset(fixture path) returns tests/fixtures path; load HandlebarController after so it gets the mock
jest.mock('../../../utils/path-resolver.js', () => {
    const pathModule = require('path');
    const actual = jest.requireActual('../../../utils/path-resolver.js');
    const fixtureAssetPath = 'assets/test-load-components.tmpl';
    return {
        __esModule: true,
        default: {
            ...actual.default,
            resolveAsset(assetPath) {
                if (assetPath === fixtureAssetPath) {
                    return pathModule.resolve(process.cwd(), 'webapp', 'tests', 'fixtures', 'test-load-components.tmpl');
                }
                return actual.default.resolveAsset.call(actual.default, assetPath);
            }
        }
    };
});

describe('W-145: HandlebarController.loadComponents()', () => {
    let mockReq;
    let HandlebarController;

    beforeAll(async () => {
        const handlebarModule = await import('../../../controller/handlebar.js');
        HandlebarController = handlebarModule.default;
    });

    beforeEach(() => {
        mockReq = {
            session: { user: null },
            user: null,
            url: '/test',
            protocol: 'http',
            hostname: 'localhost',
            get: (header) => (header === 'host' ? 'localhost:3000' : ''),
            t: (key) => key
        };
    });

    describe('Success: load template with components', () => {
        test('should return API-style { success: true, components }', async () => {
            const result = await HandlebarController.loadComponents(
                mockReq,
                FIXTURE_ASSET_PATH,
                { name: 'Alice', token: 'xyz123' }
            );

            expect(result).toHaveProperty('success', true);
            expect(result).toHaveProperty('components');
            expect(result).not.toHaveProperty('error');
        });

        test('should return nested structure for dot-notation components', async () => {
            const result = await HandlebarController.loadComponents(
                mockReq,
                FIXTURE_ASSET_PATH,
                { name: 'Bob', token: 'abc' }
            );

            expect(result.success).toBe(true);
            expect(result.components).toHaveProperty('email');
            expect(result.components.email).toHaveProperty('subject');
            expect(result.components.email).toHaveProperty('text');
            expect(result.components.email).toHaveProperty('html');
        });

        test('should expand context variables in components', async () => {
            const result = await HandlebarController.loadComponents(
                mockReq,
                FIXTURE_ASSET_PATH,
                { name: 'Carol', token: 'token789' }
            );

            expect(result.success).toBe(true);
            expect(result.components.email.subject).toContain('Carol');
            expect(result.components.email.text).toContain('Carol');
            expect(result.components.email.text).toContain('token789');
            expect(result.components.email.html).toContain('Carol');
            expect(result.components.email.html).toContain('token789');
        });
    });

    describe('Error handling: API-style, no throw', () => {
        test('should return { success: false, error, components: {} } for missing file', async () => {
            const result = await HandlebarController.loadComponents(
                mockReq,
                'assets/nonexistent-load-components.tmpl',
                {}
            );

            expect(result).toHaveProperty('success', false);
            expect(result).toHaveProperty('error');
            expect(result.error).toContain('Failed to load components');
            expect(result).toHaveProperty('components');
            expect(result.components).toEqual({});
        });

        test('should return { success: false, error, components: {} } for non-existent asset', async () => {
            const result = await HandlebarController.loadComponents(
                mockReq,
                'assets/definitely-not-a-file-12345.tmpl',
                {}
            );

            expect(result).toHaveProperty('success', false);
            expect(result).toHaveProperty('error');
            expect(result).toHaveProperty('components');
            expect(result.components).toEqual({});
        });
    });
});

// EOF webapp/tests/unit/controller/handlebar-load-components.test.js
