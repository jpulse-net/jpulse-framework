/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Config Masked Reads
 * @tagline         Unit tests for masked config API reads and sanitized request logs
 * @description     Admin and non-admin GET responses carry the mask, never the secret;
 *                  create/update request logs are masked the same way
 * @file            webapp/tests/unit/controller/config-masked-reads.test.js
 * @version         1.7.14
 * @release         2026-08-14
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import ConfigController from '../../../controller/config.js';
import ConfigModel from '../../../model/config.js';
import LogController from '../../../controller/log.js';
import AuthController from '../../../controller/auth.js';

const SECRET = 'plaintext-smtp-secret';

function rawDoc() {
    return {
        _id: 'global',
        data: {
            email: { smtpPass: SECRET, adminEmail: 'admin@example.com' },
            manifest: { license: { key: 'lic-secret' } }
        }
    };
}

describe('ConfigController masked reads (W-210)', () => {
    let mockReq;
    let mockRes;
    let findByIdSpy;
    let logRequestSpy;
    let isAdminSpy;

    beforeEach(() => {
        ConfigController.defaultDocName = ConfigController.defaultDocName || 'global';
        mockReq = {
            params: { id: 'global' },
            query: {},
            body: {},
            originalUrl: '/api/1/config/global',
            session: { user: { id: 'admin-1', username: 'admin', roles: ['admin'] } }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            set: jest.fn()
        };
        findByIdSpy = jest.spyOn(ConfigModel, 'findById');
        logRequestSpy = jest.spyOn(LogController, 'logRequest').mockImplementation(() => {});
        jest.spyOn(LogController, 'logInfo').mockImplementation(() => {});
        jest.spyOn(LogController, 'logError').mockImplementation(() => {});
        isAdminSpy = jest.spyOn(AuthController, 'isAdmin');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('admin GET returns the mask, not the stored secret', async () => {
        isAdminSpy.mockReturnValue(true);
        findByIdSpy.mockResolvedValue(rawDoc());

        await ConfigController.get(mockReq, mockRes);

        expect(findByIdSpy).toHaveBeenCalledWith('global', true);
        const payload = mockRes.json.mock.calls[0][0];
        expect(payload.success).toBe(true);
        expect(payload.data.data.email.smtpPass).toBe(ConfigModel.SENSITIVE_MASK);
        expect(payload.data.data.manifest.license.key).toBe(ConfigModel.SENSITIVE_MASK);
        expect(JSON.stringify(payload)).not.toContain(SECRET);
        expect(JSON.stringify(payload)).not.toContain('lic-secret');
    });

    test('non-admin GET is also masked', async () => {
        isAdminSpy.mockReturnValue(false);
        findByIdSpy.mockResolvedValue(rawDoc());

        await ConfigController.get(mockReq, mockRes);

        expect(findByIdSpy).toHaveBeenCalledWith('global', false);
        const payload = mockRes.json.mock.calls[0][0];
        expect(payload.data.data.email.smtpPass).toBe(ConfigModel.SENSITIVE_MASK);
        expect(JSON.stringify(payload)).not.toContain(SECRET);
    });

    test('update request log does not contain the submitted secret', async () => {
        mockReq.body = {
            data: { email: { smtpPass: SECRET, smtpServer: 'smtp.example.com' } }
        };
        findByIdSpy.mockResolvedValue(null);

        await ConfigController.update(mockReq, mockRes);

        const logged = logRequestSpy.mock.calls.map((args) => args.join(' ')).join(' ');
        expect(logged).toContain('config.update');
        expect(logged).not.toContain(SECRET);
        expect(logged).toContain(ConfigModel.SENSITIVE_MASK);
    });
});

// EOF webapp/tests/unit/controller/config-masked-reads.test.js
