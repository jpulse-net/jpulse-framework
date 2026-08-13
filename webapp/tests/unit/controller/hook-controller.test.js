/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Hook
 * @tagline         Unit tests for HookController admin API
 * @description     Covers GET /api/1/hook and GET /api/1/hook/:name
 * @file            webapp/tests/unit/controller/hook-controller.test.js
 * @version         1.7.13
 * @release         2026-08-13
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

TestUtils.setupGlobalMocksWithConsolidatedConfig();

jest.mock('../../../controller/log.js');

let HookController, HookManager;

describe('HookController', () => {
    beforeAll(async () => {
        HookController = (await import('../../../controller/hook.js')).default;
        HookManager = (await import('../../../utils/hook-manager.js')).default;
        global.HookManager = HookManager;
    });

    let mockReq, mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        HookManager.clear();
        mockReq = {
            params: {},
            query: {},
            session: { user: { username: 'admin' } },
            originalUrl: '/api/1/hook'
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('list() returns hooks and audit', async () => {
        await HookController.list(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                hooks: expect.any(Array),
                audit: expect.objectContaining({
                    defined: expect.any(Number),
                    findings: expect.any(Array)
                })
            })
        }));
        const payload = mockRes.json.mock.calls[0][0];
        expect(payload.data.hooks.some(hook => hook.name === 'onAuthBeforeLogin')).toBe(true);
    });

    test('get() returns a known hook', async () => {
        mockReq.params.name = 'onAuthBeforeLogin';
        await HookController.get(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                name: 'onAuthBeforeLogin',
                defined: true
            })
        }));
    });

    test('get() returns 404 for an unknown hook with no handlers', async () => {
        mockReq.params.name = 'onDoesNotExist';
        mockReq.originalUrl = '/api/1/hook/onDoesNotExist';
        await HookController.get(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            code: 'HOOK_NOT_FOUND',
            error: expect.stringContaining('onDoesNotExist')
        }));
    });
});

// EOF webapp/tests/unit/controller/hook-controller.test.js
