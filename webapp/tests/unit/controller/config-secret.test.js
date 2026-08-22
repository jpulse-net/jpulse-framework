/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Config Secret
 * @tagline         Unit tests for W-210 config secret reveal
 * @description     Tests ConfigController.getSecret path validation, masking of logs, and audit
 * @file            webapp/tests/unit/controller/config-secret.test.js
 * @version         1.7.16
 * @release         2026-08-22
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

describe('ConfigController.getSecret (W-210)', () => {
    let mockReq;
    let mockRes;
    let findByIdSpy;
    let logRevealSpy;
    let logRequestSpy;
    let logInfoSpy;
    let logErrorSpy;

    beforeEach(() => {
        ConfigController.defaultDocName = ConfigController.defaultDocName || 'global';
        mockReq = {
            params: { id: 'global' },
            query: {},
            originalUrl: '/api/1/config/global/secret',
            session: { user: { id: 'admin-1', username: 'admin' } }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            set: jest.fn()
        };
        findByIdSpy = jest.spyOn(ConfigModel, 'findById');
        logRevealSpy = jest.spyOn(LogController, 'logReveal').mockResolvedValue({ data: { action: 'read' } });
        logRequestSpy = jest.spyOn(LogController, 'logRequest').mockImplementation(() => {});
        logInfoSpy = jest.spyOn(LogController, 'logInfo').mockImplementation(() => {});
        logErrorSpy = jest.spyOn(LogController, 'logError').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('rejects a missing path', async () => {
        await ConfigController.getSecret(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json.mock.calls[0][0].code).toBe('MISSING_PATH');
        expect(findByIdSpy).not.toHaveBeenCalled();
        expect(logRevealSpy).not.toHaveBeenCalled();
    });

    test('rejects a non-sensitive path', async () => {
        mockReq.query.path = 'email.adminEmail';
        await ConfigController.getSecret(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json.mock.calls[0][0].code).toBe('INVALID_SECRET_PATH');
        expect(findByIdSpy).not.toHaveBeenCalled();
        expect(logRevealSpy).not.toHaveBeenCalled();
    });

    test('returns the stored value and writes an audit entry without logging the secret', async () => {
        const secret = 'plaintext-smtp-secret';
        mockReq.query.path = 'email.smtpPass';
        findByIdSpy.mockResolvedValue({
            _id: 'global',
            data: { email: { smtpPass: secret, adminEmail: 'admin@example.com' } }
        });

        await ConfigController.getSecret(mockReq, mockRes);

        expect(findByIdSpy).toHaveBeenCalledWith('global', true);
        expect(logRevealSpy).toHaveBeenCalledWith(mockReq, 'config', 'global', 'email.smtpPass');
        expect(mockRes.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: { path: 'email.smtpPass', value: secret }
        }));

        const logged = [
            ...logRequestSpy.mock.calls,
            ...logInfoSpy.mock.calls,
            ...logErrorSpy.mock.calls
        ].map((args) => args.join(' ')).join(' ');
        expect(logged).not.toContain(secret);
        expect(logged).toContain('email.smtpPass');
    });

    test('accepts a document-relative path and resolves _default', async () => {
        mockReq.params.id = '_default';
        mockReq.query.path = 'data.manifest.license.key';
        findByIdSpy.mockResolvedValue({
            _id: 'global',
            data: { manifest: { license: { key: 'lic-123' } } }
        });

        await ConfigController.getSecret(mockReq, mockRes);

        expect(findByIdSpy).toHaveBeenCalledWith('global', true);
        expect(logRevealSpy).toHaveBeenCalledWith(mockReq, 'config', 'global', 'manifest.license.key');
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: { path: 'manifest.license.key', value: 'lic-123' }
        }));
    });
});

// EOF webapp/tests/unit/controller/config-secret.test.js
