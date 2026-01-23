/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar Context Caching
 * @tagline         Unit tests for W-116: context caching optimization
 * @description     Tests for baseContext caching across nested template expansions
 * @file            webapp/tests/unit/controller/handlebar-context-caching.test.js
 * @version         1.4.17
 * @release         2026-01-23
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('W-116: Handlebars Context Caching - baseContext optimization', () => {
    let mockReq;
    let HandlebarController;
    let originalBuildInternalContext;
    let buildInternalContextCallCount;

    beforeEach(() => {
        // Access pre-initialized HandlebarController from global setup
        HandlebarController = global.HandlebarController;

        // Spy on _buildInternalContext to count calls
        buildInternalContextCallCount = 0;
        originalBuildInternalContext = HandlebarController._buildInternalContext;
        HandlebarController._buildInternalContext = jest.fn(async (req) => {
            buildInternalContextCallCount++;
            return originalBuildInternalContext.call(HandlebarController, req);
        });

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

    afterEach(() => {
        // Restore original implementation
        HandlebarController._buildInternalContext = originalBuildInternalContext;
    });

    test('should call _buildInternalContext only once per request', async () => {
        const template = 'Hello {{user.firstName}}!';
        await HandlebarController.expandHandlebars(mockReq, template, {});

        // Should be called exactly once
        expect(buildInternalContextCallCount).toBe(1);
    });

    test('should cache baseContext on req.baseContext', async () => {
        const template = 'Hello {{user.firstName}}!';
        await HandlebarController.expandHandlebars(mockReq, template, {});

        // req.baseContext should be set
        expect(mockReq.baseContext).toBeDefined();
        expect(mockReq.baseContext.user).toBeDefined();
        expect(mockReq.baseContext.user.firstName).toBe('John');
    });

    test('should reuse cached context across nested calls', async () => {
        // Template with nested expansion (simulating {{file.include}})
        const template = '{{user.firstName}} - nested expansion';

        // First call (depth 0) - should build context
        await HandlebarController.expandHandlebars(mockReq, template, {});
        expect(buildInternalContextCallCount).toBe(1);

        // Simulate nested call (depth 1) - should reuse cached context
        await HandlebarController._expandHandlebars(mockReq, '{{user.lastName}}', {}, 1);

        // Should still be 1 (no additional call)
        expect(buildInternalContextCallCount).toBe(1);
    });

    test('should allow additionalContext to override cached properties', async () => {
        const template = 'Hello {{user.firstName}}!';
        const additionalContext = {
            user: {
                firstName: 'Jane'
            }
        };

        const result = await HandlebarController.expandHandlebars(mockReq, template, additionalContext);

        // Should use overridden value
        expect(result).toBe('Hello Jane!');

        // But baseContext should still have original value
        expect(mockReq.baseContext.user.firstName).toBe('John');
    });

    test('should handle multiple sequential requests independently', async () => {
        // First request
        const template1 = 'Hello {{user.firstName}}!';
        await HandlebarController.expandHandlebars(mockReq, template1, {});
        expect(buildInternalContextCallCount).toBe(1);

        // Second request with new mock (simulating different HTTP request)
        const mockReq2 = {
            ...mockReq,
            session: {
                user: {
                    ...mockReq.session.user,
                    firstName: 'Jane'
                }
            },
            componentRegistry: new Map(),
            componentCallStack: []
        };

        const template2 = 'Hello {{user.firstName}}!';
        await HandlebarController.expandHandlebars(mockReq2, template2, {});

        // Should call _buildInternalContext again for new request
        expect(buildInternalContextCallCount).toBe(2);

        // Each request should have its own cached context
        expect(mockReq.baseContext.user.firstName).toBe('John');
        expect(mockReq2.baseContext.user.firstName).toBe('Jane');
    });

    test('should preserve context._handlebar utilities across nested calls', async () => {
        // Template that uses nested expansion
        const template = '{{user.firstName}}';

        const result = await HandlebarController.expandHandlebars(mockReq, template, {});

        // Verify result
        expect(result).toBe('John');

        // Verify baseContext was cached
        expect(mockReq.baseContext).toBeDefined();

        // _handlebar should NOT be in baseContext (it's added per call in _expandHandlebars)
        expect(mockReq.baseContext._handlebar).toBeUndefined();
    });

    test('should rebuild context if baseContext is missing (fallback)', async () => {
        // Simulate direct call to _expandHandlebars without going through expandHandlebars
        const template = '{{user.firstName}}';

        // Call _expandHandlebars directly (depth 1, no baseContext set)
        const result = await HandlebarController._expandHandlebars(mockReq, template, {}, 1);

        // Should still work by rebuilding context
        expect(result).toBe('John');

        // Should have called _buildInternalContext
        expect(buildInternalContextCallCount).toBeGreaterThan(0);
    });
});

// EOF webapp/tests/unit/controller/handlebar-context-caching.test.js
