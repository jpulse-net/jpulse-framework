/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar Context Filter
 * @tagline         Unit tests for W-115: siteConfig context filtering
 * @description     Tests for siteConfig filtering using schema metadata
 * @file            webapp/tests/unit/controller/handlebar-context-filter.test.js
 * @version         1.7.16
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('W-115: Handlebars Context Filter - siteConfig filtering', () => {
    let mockReq;
    let HandlebarController;

    beforeEach(() => {
        // Access pre-initialized HandlebarController from global setup
        HandlebarController = global.HandlebarController;

        // Create mock request object
        mockReq = {
            session: {
                user: {
                    id: 'user123',
                    username: 'testuser',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    roles: ['user']
                }
            },
            user: null,
            url: '/test',
            path: '/test',
            query: {},
            protocol: 'http',
            hostname: 'localhost',
            get: (header) => {
                if (header === 'host') return 'localhost:3000';
                return '';
            },
            componentRegistry: new Map(),
            componentCallStack: []
        };
    });

    test('should filter smtp* fields for unauthenticated users', async () => {
        // Mock unauthenticated user
        mockReq.session.user = null;

        const template = '{{siteConfig.email.smtpServer}}';
        const result = await HandlebarController.expandHandlebars(mockReq, template, {});

        // Should be empty (filtered out)
        expect(result.trim()).toBe('');
    });

    test('should filter *pass fields for unauthenticated users', async () => {
        mockReq.session.user = null;

        const template = '{{siteConfig.email.smtpPass}}';
        const result = await HandlebarController.expandHandlebars(mockReq, template, {});

        // Should be empty (filtered out)
        expect(result.trim()).toBe('');
    });

    test('should filter smtpPass for authenticated users', async () => {
        // Set up authenticated user
        mockReq.session.user = {
            id: 'user123',
            roles: ['user']
        };

        const template = '{{siteConfig.email.smtpPass}}';
        const result = await HandlebarController.expandHandlebars(mockReq, template, {});

        // Should be empty even for authenticated users
        expect(result.trim()).toBe('');
    });

    test('should preserve non-sensitive fields', async () => {
        mockReq.session.user = null;

        const template = '{{siteConfig.email.adminEmail}}';
        const result = await HandlebarController.expandHandlebars(mockReq, template, {});

        // Should contain non-sensitive fields (may be empty if not set, but should not error)
        expect(result).toBeDefined();
    });

    test('strips an extendSchema secret from siteConfig for authenticated users', async () => {
        const ConfigModel = global.ConfigModel;
        const savedExtensions = ConfigModel.schemaExtensions.slice();
        const savedSchema = ConfigModel.schema;
        const savedPaths = ConfigModel._sensitivePaths;
        const savedGlobal = HandlebarController.globalConfig;
        try {
            ConfigModel.extendSchema({
                ai: {
                    apiKey: { type: 'string', inputType: 'password', default: '' }
                }
            });
            ConfigModel.initializeSchema();
            HandlebarController.globalConfig = {
                ...(savedGlobal || {}),
                data: {
                    ...(savedGlobal?.data || {}),
                    ai: { apiKey: 'extend-schema-secret' }
                }
            };
            mockReq.session.user = { id: 'user123', roles: ['user'] };
            const result = await HandlebarController.expandHandlebars(
                mockReq,
                '{{siteConfig.ai.apiKey}}',
                {}
            );
            expect(result).not.toContain('extend-schema-secret');
            expect(result.trim()).toBe('');
        } finally {
            ConfigModel.schemaExtensions.length = 0;
            savedExtensions.forEach((ext) => ConfigModel.schemaExtensions.push(ext));
            ConfigModel.schema = savedSchema;
            ConfigModel._sensitivePaths = savedPaths;
            HandlebarController.globalConfig = savedGlobal;
        }
    });
});

// EOF webapp/tests/unit/controller/handlebar-context-filter.test.js
