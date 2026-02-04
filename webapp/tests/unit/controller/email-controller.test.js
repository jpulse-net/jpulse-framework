/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Email Controller
 * @tagline         Unit tests for Email Controller
 * @description     Minimal unit tests for EmailController basic functionality
 * @file            webapp/tests/unit/controller/email-controller.test.js
 * @version         1.6.7
 * @release         2026-02-04
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

// Set up global appConfig BEFORE any dynamic imports
TestUtils.setupGlobalMocksWithConsolidatedConfig();

// Mock nodemailer
jest.mock('nodemailer', () => {
    const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({
            messageId: 'test-message-id-123'
        }),
        verify: jest.fn().mockResolvedValue(true)
    };
    return {
        default: {
            createTransport: jest.fn().mockReturnValue(mockTransporter)
        }
    };
});

// Mock dependencies
jest.mock('../../../model/config.js');
jest.mock('../../../controller/config.js');
jest.mock('../../../controller/log.js');
jest.mock('../../../controller/handlebar.js');
jest.mock('../../../utils/path-resolver.js');

describe('EmailController', () => {
    let EmailController, ConfigModel, ConfigController, LogController;

    beforeAll(async () => {
        EmailController = (await import('../../../controller/email.js')).default;
        ConfigModel = (await import('../../../model/config.js')).default;
        ConfigController = (await import('../../../controller/config.js')).default;
        LogController = (await import('../../../controller/log.js')).default;
    });

    beforeEach(() => {
        // Reset EmailController state
        EmailController.transporter = null;
        EmailController.config = null;
        EmailController.initialized = false;
    });

    describe('isConfigured()', () => {
        test('should return false when not initialized', () => {
            expect(EmailController.isConfigured()).toBe(false);
        });

        test('should return false when config is missing', () => {
            EmailController.initialized = true;
            EmailController.config = null;
            EmailController.transporter = {};
            expect(EmailController.isConfigured()).toBe(false);
        });

        test('should return false when adminEmail is missing', () => {
            EmailController.initialized = true;
            EmailController.config = { adminEmail: '' };
            EmailController.transporter = {};
            expect(EmailController.isConfigured()).toBe(false);
        });

        test('should return true when properly configured', () => {
            EmailController.initialized = true;
            EmailController.config = { adminEmail: 'admin@example.com' };
            EmailController.transporter = {};
            expect(EmailController.isConfigured()).toBe(true);
        });

        test('should return boolean (not string)', () => {
            EmailController.initialized = true;
            EmailController.config = { adminEmail: 'admin@example.com' };
            EmailController.transporter = {};
            const result = EmailController.isConfigured();
            expect(typeof result).toBe('boolean');
            expect(result).toBe(true);
        });
    });

    // W-112: getHealthStatus() removed - replaced by getMetrics() for metrics API
    // The /api/1/health/status endpoint (for load balancers) doesn't use getHealthStatus()

    describe('_getI18nKey()', () => {
        test('should map error codes to i18n keys', () => {
            expect(EmailController._getI18nKey('EMAIL_NOT_CONFIGURED')).toBe('controller.email.notConfigured');
            expect(EmailController._getI18nKey('EMAIL_SEND_FAILED')).toBe('controller.email.sendFailed');
            expect(EmailController._getI18nKey('MISSING_FIELDS')).toBe('controller.email.missingFields');
            expect(EmailController._getI18nKey('INVALID_RECIPIENT')).toBe('controller.email.invalidRecipient');
        });

        test('should return default i18n key for unknown error codes', () => {
            expect(EmailController._getI18nKey('UNKNOWN_ERROR')).toBe('controller.email.internalError');
        });
    });
});

// EOF webapp/tests/unit/controller/email-controller.test.js
