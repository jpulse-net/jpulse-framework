/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / HookManager
 * @tagline         Unit Tests for HookManager
 * @description     Tests for plugin hook registration and execution system
 * @file            webapp/tests/unit/utils/hook-manager.test.js
 * @version         1.4.15
 * @release         2026-01-15
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
            HookManager.register('onAuthBeforeLogin', 'test-plugin', handler);

            expect(HookManager.hasHandlers('onAuthBeforeLogin')).toBe(true);
        });

        test('should register multiple handlers for same hook', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            HookManager.register('onAuthBeforeLogin', 'plugin1', handler1);
            HookManager.register('onAuthBeforeLogin', 'plugin2', handler2);

            const registered = HookManager.getRegisteredHooks();
            expect(registered['onAuthBeforeLogin']).toHaveLength(2);
        });

        test('should sort handlers by priority (lower = earlier)', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            const handler3 = jest.fn();

            HookManager.register('onAuthBeforeLogin', 'plugin1', handler1, 200);
            HookManager.register('onAuthBeforeLogin', 'plugin2', handler2, 50);
            HookManager.register('onAuthBeforeLogin', 'plugin3', handler3, 100);

            const registered = HookManager.getRegisteredHooks();
            expect(registered['onAuthBeforeLogin'][0].plugin).toBe('plugin2');
            expect(registered['onAuthBeforeLogin'][1].plugin).toBe('plugin3');
            expect(registered['onAuthBeforeLogin'][2].plugin).toBe('plugin1');
        });

        test('should use default priority 100 if not specified', () => {
            const handler = jest.fn();
            HookManager.register('onAuthBeforeLogin', 'test-plugin', handler);

            const registered = HookManager.getRegisteredHooks();
            expect(registered['onAuthBeforeLogin'][0].priority).toBe(100);
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

            HookManager.register('onAuthBeforeLogin', 'plugin1', handler1, 300);
            HookManager.register('onAuthBeforeLogin', 'plugin2', handler2, 100);
            HookManager.register('onAuthBeforeLogin', 'plugin3', handler3, 200);

            await HookManager.execute('onAuthBeforeLogin', {});

            expect(executionOrder).toEqual([2, 3, 1]);
        });

        test('should pass context to handlers', async () => {
            const handler = jest.fn();
            HookManager.register('onAuthBeforeLogin', 'test-plugin', handler);

            const context = { user: 'test', password: '123' };
            await HookManager.execute('onAuthBeforeLogin', context);

            expect(handler).toHaveBeenCalledWith(context);
        });

        test('should allow handlers to modify context', async () => {
            const handler = jest.fn().mockImplementation((ctx) => {
                return { ...ctx, modified: true };
            });
            HookManager.register('onAuthBeforeLogin', 'test-plugin', handler);

            const context = { user: 'test' };
            const result = await HookManager.execute('onAuthBeforeLogin', context);

            expect(result.modified).toBe(true);
        });

        test('should chain context modifications through handlers', async () => {
            const handler1 = jest.fn().mockImplementation((ctx) => ({ ...ctx, step1: true }));
            const handler2 = jest.fn().mockImplementation((ctx) => ({ ...ctx, step2: true }));

            HookManager.register('onAuthBeforeLogin', 'plugin1', handler1, 50);
            HookManager.register('onAuthBeforeLogin', 'plugin2', handler2, 100);

            const result = await HookManager.execute('onAuthBeforeLogin', {});

            expect(result.step1).toBe(true);
            expect(result.step2).toBe(true);
        });

        test('should continue execution if handler throws error', async () => {
            const handler1 = jest.fn().mockImplementation(() => { throw new Error('Test error'); });
            const handler2 = jest.fn().mockImplementation((ctx) => ({ ...ctx, completed: true }));

            HookManager.register('onAuthBeforeLogin', 'plugin1', handler1, 50);
            HookManager.register('onAuthBeforeLogin', 'plugin2', handler2, 100);

            const result = await HookManager.execute('onAuthBeforeLogin', {});

            expect(result.completed).toBe(true);
            expect(global.LogController.logError).toHaveBeenCalled();
        });

        test('should return original context if no handlers registered', async () => {
            const context = { user: 'test' };
            const result = await HookManager.execute('onAuthBeforeLogin', context);

            expect(result).toEqual(context);
        });
    });

    describe('executeWithCancel', () => {
        test('should allow handlers to cancel operation', async () => {
            const handler = jest.fn().mockReturnValue(false);
            HookManager.register('onUserBeforeDelete', 'test-plugin', handler);

            const result = await HookManager.executeWithCancel('onUserBeforeDelete', {});

            expect(result.cancelled).toBe(true);
            expect(result.cancelledBy).toBe('test-plugin');
        });

        test('should stop execution after cancellation', async () => {
            const handler1 = jest.fn().mockReturnValue(false);
            const handler2 = jest.fn();

            HookManager.register('onUserBeforeDelete', 'plugin1', handler1, 50);
            HookManager.register('onUserBeforeDelete', 'plugin2', handler2, 100);

            await HookManager.executeWithCancel('onUserBeforeDelete', {});

            expect(handler1).toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });

        test('should return cancelled=false if no handler cancels', async () => {
            const handler = jest.fn().mockReturnValue(undefined);
            HookManager.register('onUserBeforeDelete', 'test-plugin', handler);

            const result = await HookManager.executeWithCancel('onUserBeforeDelete', {});

            expect(result.cancelled).toBe(false);
        });
    });

    describe('executeFirst', () => {
        test('should return first non-null result', async () => {
            const handler1 = jest.fn().mockReturnValue(null);
            const handler2 = jest.fn().mockReturnValue('ldap');
            const handler3 = jest.fn().mockReturnValue('oauth2');

            HookManager.register('onAuthBeforeLogin', 'plugin1', handler1, 50);
            HookManager.register('onAuthBeforeLogin', 'plugin2', handler2, 100);
            HookManager.register('onAuthBeforeLogin', 'plugin3', handler3, 150);

            const result = await HookManager.executeFirst('onAuthBeforeLogin', {});

            expect(result).toBe('ldap');
            expect(handler3).not.toHaveBeenCalled();
        });

        test('should return null if no handler returns value', async () => {
            const handler = jest.fn().mockReturnValue(null);
            HookManager.register('onAuthBeforeLogin', 'test-plugin', handler);

            const result = await HookManager.executeFirst('onAuthBeforeLogin', {});

            expect(result).toBeNull();
        });
    });

    describe('unregister', () => {
        test('should remove all hooks for a plugin', () => {
            HookManager.register('onAuthBeforeLogin', 'test-plugin', jest.fn());
            HookManager.register('onAuthAfterLogin', 'test-plugin', jest.fn());
            HookManager.register('onAuthBeforeLogin', 'other-plugin', jest.fn());

            HookManager.unregister('test-plugin');

            const registered = HookManager.getRegisteredHooks();
            expect(registered['onAuthBeforeLogin']).toHaveLength(1);
            expect(registered['onAuthBeforeLogin'][0].plugin).toBe('other-plugin');
            expect(registered['onAuthAfterLogin']).toHaveLength(0);
        });
    });

    describe('hasHandlers', () => {
        test('should return true if handlers registered', () => {
            HookManager.register('onAuthBeforeLogin', 'test-plugin', jest.fn());

            expect(HookManager.hasHandlers('onAuthBeforeLogin')).toBe(true);
        });

        test('should return false if no handlers registered', () => {
            expect(HookManager.hasHandlers('onAuthBeforeLogin')).toBe(false);
        });
    });

    describe('getAvailableHooks', () => {
        test('should return all available hooks', () => {
            const hooks = HookManager.getAvailableHooks();

            expect(hooks.onAuthBeforeLogin).toBeDefined();
            expect(hooks.onAuthAfterLogin).toBeDefined();
            expect(hooks.onUserBeforeSave).toBeDefined();
        });

        test('should include description and context for each hook', () => {
            const hooks = HookManager.getAvailableHooks();

            expect(hooks.onAuthBeforeLogin.description).toBeDefined();
            expect(hooks.onAuthBeforeLogin.context).toBeDefined();
            expect(hooks.onAuthBeforeLogin.canModify).toBeDefined();
            expect(hooks.onAuthBeforeLogin.canCancel).toBeDefined();
        });
    });

    describe('getHooksByNamespace', () => {
        test('should filter hooks by namespace prefix (Phase 8 naming)', () => {
            const authHooks = HookManager.getHooksByNamespace('onAuth');
            const userHooks = HookManager.getHooksByNamespace('onUser');

            expect(Object.keys(authHooks).every(k => k.startsWith('onAuth'))).toBe(true);
            expect(Object.keys(userHooks).every(k => k.startsWith('onUser'))).toBe(true);
            expect(Object.keys(authHooks).length).toBeGreaterThan(0);
            expect(Object.keys(userHooks).length).toBeGreaterThan(0);
        });
    });

    describe('isValidHook', () => {
        test('should return true for valid hook names', () => {
            expect(HookManager.isValidHook('onAuthBeforeLogin')).toBe(true);
            expect(HookManager.isValidHook('onUserAfterSave')).toBe(true);
        });

        test('should return false for invalid hook names', () => {
            expect(HookManager.isValidHook('unknownHook')).toBe(false);
            expect(HookManager.isValidHook('randomName')).toBe(false);
        });
    });

    describe('getMetrics', () => {
        test('should return hook metrics', () => {
            HookManager.register('onAuthBeforeLogin', 'plugin1', jest.fn());
            HookManager.register('onAuthBeforeLogin', 'plugin2', jest.fn());
            HookManager.register('onUserBeforeSave', 'plugin1', jest.fn());

            const metrics = HookManager.getMetrics();

            expect(metrics.stats.available).toBeGreaterThan(0);
            expect(metrics.stats.registered).toBe(3);
            expect(metrics.stats.hooksWithHandlers).toBe(2);
        });
    });

    describe('clear', () => {
        test('should remove all registered hooks', () => {
            HookManager.register('onAuthBeforeLogin', 'test-plugin', jest.fn());
            HookManager.register('onUserBeforeSave', 'test-plugin', jest.fn());

            HookManager.clear();

            expect(HookManager.getMetrics().stats.registered).toBe(0);
            expect(HookManager.getMetrics().stats.hooksWithHandlers).toBe(0);
        });
    });

    // Phase 8: Multi-step authentication hooks
    describe('Phase 8: Multi-step authentication hooks', () => {
        test('onAuthGetSteps should be available', () => {
            const hooks = HookManager.getAvailableHooks();
            expect(hooks).toHaveProperty('onAuthGetSteps');
            expect(hooks.onAuthGetSteps.description).toBeDefined();
        });

        test('onAuthValidateStep should be available', () => {
            const hooks = HookManager.getAvailableHooks();
            expect(hooks).toHaveProperty('onAuthValidateStep');
            expect(hooks.onAuthValidateStep.description).toBeDefined();
        });

        test('onAuthGetWarnings should be available', () => {
            const hooks = HookManager.getAvailableHooks();
            expect(hooks).toHaveProperty('onAuthGetWarnings');
            expect(hooks.onAuthGetWarnings.description).toBeDefined();
        });

        test('onAuthGetSteps should accumulate requiredSteps from multiple plugins', async () => {
            const handler1 = jest.fn().mockImplementation((context) => {
                context.requiredSteps.push({ step: 'mfa', priority: 100 });
                return context;
            });
            const handler2 = jest.fn().mockImplementation((context) => {
                context.requiredSteps.push({ step: 'email-verify', priority: 50 });
                return context;
            });

            HookManager.register('onAuthGetSteps', 'mfa-plugin', handler1);
            HookManager.register('onAuthGetSteps', 'email-plugin', handler2);

            const context = { user: { id: '123' }, completedSteps: [], requiredSteps: [] };
            const result = await HookManager.execute('onAuthGetSteps', context);

            expect(result.requiredSteps).toHaveLength(2);
            expect(result.requiredSteps.some(s => s.step === 'mfa')).toBe(true);
            expect(result.requiredSteps.some(s => s.step === 'email-verify')).toBe(true);
        });

        test('onAuthValidateStep should set valid=true on successful step', async () => {
            const handler = jest.fn().mockImplementation((context) => {
                if (context.step === 'mfa' && context.stepData.code === '123456') {
                    context.valid = true;
                }
                return context;
            });

            HookManager.register('onAuthValidateStep', 'mfa-plugin', handler);

            const context = { step: 'mfa', stepData: { code: '123456' }, valid: false };
            const result = await HookManager.execute('onAuthValidateStep', context);

            expect(result.valid).toBe(true);
        });

        test('onAuthGetWarnings should accumulate warnings', async () => {
            const handler = jest.fn().mockImplementation((context) => {
                context.warnings.push({
                    type: 'mfa-not-enabled',
                    message: 'Please enable 2FA'
                });
                return context;
            });

            HookManager.register('onAuthGetWarnings', 'mfa-plugin', handler);

            const context = { user: { id: '123' }, warnings: [] };
            const result = await HookManager.execute('onAuthGetWarnings', context);

            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0].type).toBe('mfa-not-enabled');
        });
    });
});

// EOF webapp/tests/unit/utils/hook-manager.test.js
