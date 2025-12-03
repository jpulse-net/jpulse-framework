/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / HookManager
 * @tagline         Unit Tests for HookManager
 * @description     Tests for plugin hook registration and execution system
 * @file            webapp/tests/unit/utils/hook-manager.test.js
 * @version         1.3.6
 * @release         2025-12-03
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Opus 4.5
 */

import HookManager from '../../../utils/hook-manager.js';

describe('HookManager', () => {
    beforeEach(() => {
        // Clear all hooks before each test
        HookManager.clear();
        // Mock LogController to prevent logging during tests
        global.LogController = {
            logInfo: jest.fn(),
            logWarning: jest.fn(),
            logError: jest.fn()
        };
    });

    afterEach(() => {
        delete global.LogController;
    });

    describe('register', () => {
        test('should register a hook handler', () => {
            const handler = jest.fn();
            HookManager.register('authBeforeLoginHook', 'test-plugin', handler);

            expect(HookManager.hasHandlers('authBeforeLoginHook')).toBe(true);
        });

        test('should register multiple handlers for same hook', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            HookManager.register('authBeforeLoginHook', 'plugin1', handler1);
            HookManager.register('authBeforeLoginHook', 'plugin2', handler2);

            const registered = HookManager.getRegisteredHooks();
            expect(registered['authBeforeLoginHook']).toHaveLength(2);
        });

        test('should sort handlers by priority (lower = earlier)', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            const handler3 = jest.fn();

            HookManager.register('authBeforeLoginHook', 'plugin1', handler1, 200);
            HookManager.register('authBeforeLoginHook', 'plugin2', handler2, 50);
            HookManager.register('authBeforeLoginHook', 'plugin3', handler3, 100);

            const registered = HookManager.getRegisteredHooks();
            expect(registered['authBeforeLoginHook'][0].plugin).toBe('plugin2');
            expect(registered['authBeforeLoginHook'][1].plugin).toBe('plugin3');
            expect(registered['authBeforeLoginHook'][2].plugin).toBe('plugin1');
        });

        test('should use default priority 100 if not specified', () => {
            const handler = jest.fn();
            HookManager.register('authBeforeLoginHook', 'test-plugin', handler);

            const registered = HookManager.getRegisteredHooks();
            expect(registered['authBeforeLoginHook'][0].priority).toBe(100);
        });

        test('should warn when registering unknown hook', () => {
            const handler = jest.fn();
            HookManager.register('unknownHook', 'test-plugin', handler);

            expect(global.LogController.logWarning).toHaveBeenCalled();
        });
    });

    describe('execute', () => {
        test('should execute handlers in priority order', async () => {
            const executionOrder = [];
            const handler1 = jest.fn().mockImplementation(() => { executionOrder.push(1); });
            const handler2 = jest.fn().mockImplementation(() => { executionOrder.push(2); });
            const handler3 = jest.fn().mockImplementation(() => { executionOrder.push(3); });

            HookManager.register('authBeforeLoginHook', 'plugin1', handler1, 300);
            HookManager.register('authBeforeLoginHook', 'plugin2', handler2, 100);
            HookManager.register('authBeforeLoginHook', 'plugin3', handler3, 200);

            await HookManager.execute('authBeforeLoginHook', {});

            expect(executionOrder).toEqual([2, 3, 1]);
        });

        test('should pass context to handlers', async () => {
            const handler = jest.fn();
            HookManager.register('authBeforeLoginHook', 'test-plugin', handler);

            const context = { user: 'test', password: '123' };
            await HookManager.execute('authBeforeLoginHook', context);

            expect(handler).toHaveBeenCalledWith(context);
        });

        test('should allow handlers to modify context', async () => {
            const handler = jest.fn().mockImplementation((ctx) => {
                return { ...ctx, modified: true };
            });
            HookManager.register('authBeforeLoginHook', 'test-plugin', handler);

            const context = { user: 'test' };
            const result = await HookManager.execute('authBeforeLoginHook', context);

            expect(result.modified).toBe(true);
        });

        test('should chain context modifications through handlers', async () => {
            const handler1 = jest.fn().mockImplementation((ctx) => ({ ...ctx, step1: true }));
            const handler2 = jest.fn().mockImplementation((ctx) => ({ ...ctx, step2: true }));

            HookManager.register('authBeforeLoginHook', 'plugin1', handler1, 50);
            HookManager.register('authBeforeLoginHook', 'plugin2', handler2, 100);

            const result = await HookManager.execute('authBeforeLoginHook', {});

            expect(result.step1).toBe(true);
            expect(result.step2).toBe(true);
        });

        test('should continue execution if handler throws error', async () => {
            const handler1 = jest.fn().mockImplementation(() => { throw new Error('Test error'); });
            const handler2 = jest.fn().mockImplementation((ctx) => ({ ...ctx, completed: true }));

            HookManager.register('authBeforeLoginHook', 'plugin1', handler1, 50);
            HookManager.register('authBeforeLoginHook', 'plugin2', handler2, 100);

            const result = await HookManager.execute('authBeforeLoginHook', {});

            expect(result.completed).toBe(true);
            expect(global.LogController.logError).toHaveBeenCalled();
        });

        test('should return original context if no handlers registered', async () => {
            const context = { user: 'test' };
            const result = await HookManager.execute('authBeforeLoginHook', context);

            expect(result).toEqual(context);
        });
    });

    describe('executeWithCancel', () => {
        test('should allow handlers to cancel operation', async () => {
            const handler = jest.fn().mockReturnValue(false);
            HookManager.register('userBeforeDeleteHook', 'test-plugin', handler);

            const result = await HookManager.executeWithCancel('userBeforeDeleteHook', {});

            expect(result.cancelled).toBe(true);
            expect(result.cancelledBy).toBe('test-plugin');
        });

        test('should stop execution after cancellation', async () => {
            const handler1 = jest.fn().mockReturnValue(false);
            const handler2 = jest.fn();

            HookManager.register('userBeforeDeleteHook', 'plugin1', handler1, 50);
            HookManager.register('userBeforeDeleteHook', 'plugin2', handler2, 100);

            await HookManager.executeWithCancel('userBeforeDeleteHook', {});

            expect(handler1).toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });

        test('should return cancelled=false if no handler cancels', async () => {
            const handler = jest.fn().mockReturnValue(undefined);
            HookManager.register('userBeforeDeleteHook', 'test-plugin', handler);

            const result = await HookManager.executeWithCancel('userBeforeDeleteHook', {});

            expect(result.cancelled).toBe(false);
        });
    });

    describe('executeFirst', () => {
        test('should return first non-null result', async () => {
            const handler1 = jest.fn().mockReturnValue(null);
            const handler2 = jest.fn().mockReturnValue('ldap');
            const handler3 = jest.fn().mockReturnValue('oauth2');

            HookManager.register('authGetProviderHook', 'plugin1', handler1, 50);
            HookManager.register('authGetProviderHook', 'plugin2', handler2, 100);
            HookManager.register('authGetProviderHook', 'plugin3', handler3, 150);

            const result = await HookManager.executeFirst('authGetProviderHook', {});

            expect(result).toBe('ldap');
            expect(handler3).not.toHaveBeenCalled();
        });

        test('should return null if no handler returns value', async () => {
            const handler = jest.fn().mockReturnValue(null);
            HookManager.register('authGetProviderHook', 'test-plugin', handler);

            const result = await HookManager.executeFirst('authGetProviderHook', {});

            expect(result).toBeNull();
        });
    });

    describe('unregister', () => {
        test('should remove all hooks for a plugin', () => {
            HookManager.register('authBeforeLoginHook', 'test-plugin', jest.fn());
            HookManager.register('authAfterLoginSuccessHook', 'test-plugin', jest.fn());
            HookManager.register('authBeforeLoginHook', 'other-plugin', jest.fn());

            HookManager.unregister('test-plugin');

            const registered = HookManager.getRegisteredHooks();
            expect(registered['authBeforeLoginHook']).toHaveLength(1);
            expect(registered['authBeforeLoginHook'][0].plugin).toBe('other-plugin');
            expect(registered['authAfterLoginSuccessHook']).toHaveLength(0);
        });
    });

    describe('hasHandlers', () => {
        test('should return true if handlers registered', () => {
            HookManager.register('authBeforeLoginHook', 'test-plugin', jest.fn());

            expect(HookManager.hasHandlers('authBeforeLoginHook')).toBe(true);
        });

        test('should return false if no handlers registered', () => {
            expect(HookManager.hasHandlers('authBeforeLoginHook')).toBe(false);
        });
    });

    describe('getAvailableHooks', () => {
        test('should return all available hooks', () => {
            const hooks = HookManager.getAvailableHooks();

            expect(hooks.authBeforeLoginHook).toBeDefined();
            expect(hooks.authAfterLoginSuccessHook).toBeDefined();
            expect(hooks.userBeforeSaveHook).toBeDefined();
        });

        test('should include description and context for each hook', () => {
            const hooks = HookManager.getAvailableHooks();

            expect(hooks.authBeforeLoginHook.description).toBeDefined();
            expect(hooks.authBeforeLoginHook.context).toBeDefined();
            expect(hooks.authBeforeLoginHook.canModify).toBeDefined();
            expect(hooks.authBeforeLoginHook.canCancel).toBeDefined();
        });
    });

    describe('getHooksByNamespace', () => {
        test('should filter hooks by namespace prefix', () => {
            const authHooks = HookManager.getHooksByNamespace('auth');
            const userHooks = HookManager.getHooksByNamespace('user');

            expect(Object.keys(authHooks).every(k => k.startsWith('auth'))).toBe(true);
            expect(Object.keys(userHooks).every(k => k.startsWith('user'))).toBe(true);
            expect(Object.keys(authHooks).length).toBeGreaterThan(0);
            expect(Object.keys(userHooks).length).toBeGreaterThan(0);
        });
    });

    describe('isValidHook', () => {
        test('should return true for valid hook names', () => {
            expect(HookManager.isValidHook('authBeforeLoginHook')).toBe(true);
            expect(HookManager.isValidHook('userAfterSaveHook')).toBe(true);
        });

        test('should return false for invalid hook names', () => {
            expect(HookManager.isValidHook('unknownHook')).toBe(false);
            expect(HookManager.isValidHook('randomName')).toBe(false);
        });
    });

    describe('getStats', () => {
        test('should return hook statistics', () => {
            HookManager.register('authBeforeLoginHook', 'plugin1', jest.fn());
            HookManager.register('authBeforeLoginHook', 'plugin2', jest.fn());
            HookManager.register('userBeforeSaveHook', 'plugin1', jest.fn());

            const stats = HookManager.getStats();

            expect(stats.available).toBeGreaterThan(0);
            expect(stats.registered).toBe(3);
            expect(stats.hooksWithHandlers).toBe(2);
        });
    });

    describe('clear', () => {
        test('should remove all registered hooks', () => {
            HookManager.register('authBeforeLoginHook', 'test-plugin', jest.fn());
            HookManager.register('userBeforeSaveHook', 'test-plugin', jest.fn());

            HookManager.clear();

            expect(HookManager.getStats().registered).toBe(0);
            expect(HookManager.getStats().hooksWithHandlers).toBe(0);
        });
    });
});

// EOF webapp/tests/unit/utils/hook-manager.test.js
