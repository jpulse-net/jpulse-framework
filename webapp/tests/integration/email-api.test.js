/**
 * @name            jPulse Framework / WebApp / Tests / Integration / Email API
 * @tagline         Integration tests for Email API endpoints
 * @description     Minimal integration tests for email API endpoint
 * @file            webapp/tests/integration/email-api.test.js
 * @version         1.3.3
 * @release         2025-12-01
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import TestUtils from '../helpers/test-utils.js';

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

describe('Email API Integration Tests', () => {
    let EmailController, AuthController;

    beforeAll(async () => {
        // Ensure global config is available
        if (!global.appConfig) {
            global.appConfig = TestUtils.getConsolidatedConfig();
        }

        EmailController = (await import('../../controller/email.js')).default;
        AuthController = (await import('../../controller/auth.js')).default;
    });

    describe('EmailController Structure', () => {
        test('should have EmailController defined', () => {
            expect(EmailController).toBeDefined();
        });

        test('should have required static methods', () => {
            expect(typeof EmailController.initialize).toBe('function');
            expect(typeof EmailController.isConfigured).toBe('function');
            expect(typeof EmailController.getHealthStatus).toBe('function');
            expect(typeof EmailController.sendEmail).toBe('function');
            expect(typeof EmailController.sendEmailFromTemplate).toBe('function');
            expect(typeof EmailController.sendAdminNotification).toBe('function');
            expect(typeof EmailController.apiSend).toBe('function');
            expect(typeof EmailController._getI18nKey).toBe('function');
        });
    });

    describe('Health Status Integration', () => {
        test('should return proper health status structure', () => {
            const status = EmailController.getHealthStatus();
            
            expect(status).toHaveProperty('status');
            expect(status).toHaveProperty('configured');
            expect(status).toHaveProperty('message');
            expect(status).toHaveProperty('details');
            
            expect(typeof status.status).toBe('string');
            expect(typeof status.configured).toBe('boolean');
            expect(typeof status.message).toBe('string');
            expect(typeof status.details).toBe('object');
        });

        test('should have configured as boolean (not string)', () => {
            const status = EmailController.getHealthStatus();
            expect(typeof status.configured).toBe('boolean');
        });
    });

    describe('Error Code Mapping', () => {
        test('should map all known error codes', () => {
            const errorCodes = [
                'EMAIL_NOT_CONFIGURED',
                'EMAIL_SEND_FAILED',
                'MISSING_FIELDS',
                'INVALID_RECIPIENT',
                'TEMPLATE_ERROR',
                'REQUEST_REQUIRED'
            ];

            errorCodes.forEach(code => {
                const key = EmailController._getI18nKey(code);
                expect(typeof key).toBe('string');
                expect(key).toContain('controller.email.');
            });
        });
    });
});

// EOF webapp/tests/integration/email-api.test.js
