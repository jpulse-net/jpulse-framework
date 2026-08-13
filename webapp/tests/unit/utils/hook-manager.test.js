/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / HookManager
 * @tagline         Unit Tests for HookManager
 * @description     Tests for plugin hook registration and execution system
 * @file            webapp/tests/unit/utils/hook-manager.test.js
 * @version         1.7.13
 * @release         2026-08-13
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

        test('should not warn when registering an unknown hook - the audit reports it later', () => {
            const handler = jest.fn();
            HookManager.register('unknownHook', 'test-plugin', handler);

            expect(global.LogController.logWarning).not.toHaveBeenCalled();
            expect(HookManager.hasHandlers('unknownHook')).toBe(true);
            expect(HookManager.getHook('unknownHook').unverified).toBe(true);
        });
    });

    describe('defineHook / defineHooks', () => {
        afterEach(() => {
            HookManager.clearDefinitions();
            HookManager.seedFrameworkDefinitions();
        });

        test('description-only definition succeeds with defaults derived from mode', () => {
            const definition = HookManager.defineHook('onAiComplete', {
                description: 'Run one completion',
                owner: 'ai-core'
            });

            expect(definition.mode).toBe('execute');
            expect(definition.onError).toBe('continue');
            expect(definition.returns).toBe('context');
            expect(definition.stability).toBe('stable');
            expect(definition.canModify).toBe(false);
            expect(definition.owner).toBe('ai-core');
            expect(definition.contextKeys).toEqual([]);
            expect(definition.active).toBe(true);
        });

        test('defineHooks stamps owner on every entry', () => {
            const result = HookManager.defineHooks({
                onAiComplete: { description: 'Run one completion' },
                onAiProviderRegister: { description: 'Contribute a provider', canModify: true }
            }, 'ai-core');

            expect(result.onAiComplete.owner).toBe('ai-core');
            expect(result.onAiProviderRegister.owner).toBe('ai-core');
            expect(result.onAiProviderRegister.canModify).toBe(true);
        });

        test('onError and returns derive from mode', () => {
            const broadcast = HookManager.defineHook('onAiProviderRegister', {
                description: 'Contribute a provider',
                owner: 'ai-core',
                mode: 'execute'
            });
            const first = HookManager.defineHook('onAiPickModel', {
                description: 'Pick a model',
                owner: 'ai-core',
                mode: 'executeFirst'
            });
            const targeted = HookManager.defineHook('onAiComplete', {
                description: 'Run one completion',
                owner: 'ai-core',
                mode: 'executeForPlugin'
            });

            expect(broadcast.onError).toBe('continue');
            expect(broadcast.returns).toBe('context');
            expect(first.onError).toBe('continue');
            expect(first.returns).toBe('value');
            expect(targeted.onError).toBe('abort');
            expect(targeted.returns).toBe('context');
        });

        test('onError override on a broadcast hook is kept', () => {
            const definition = HookManager.defineHook('onBubbleWidgetConfigBeforeSave', {
                description: 'Veto a widget config save',
                owner: 'site',
                onError: 'abort',
                canModify: true
            });

            expect(definition.mode).toBe('execute');
            expect(definition.onError).toBe('abort');
            expect(HookManager.getAvailableHooks().onBubbleWidgetConfigBeforeSave.canCancel).toBe(true);
        });

        test('identical re-definition is idempotent', () => {
            const first = HookManager.defineHook('onAiComplete', {
                description: 'Run one completion',
                owner: 'ai-core',
                mode: 'executeForPlugin'
            });
            const second = HookManager.defineHook('onAiComplete', {
                description: 'Run one completion',
                owner: 'ai-core',
                mode: 'executeForPlugin'
            });

            expect(second).toBe(first);
            expect(first.conflicts).toHaveLength(0);
            expect(global.LogController.logError).not.toHaveBeenCalled();
        });

        test('conflicting re-definition keeps the first and records both', () => {
            const kept = HookManager.defineHook('onAiComplete', {
                description: 'Run one completion',
                owner: 'ai-core'
            });
            const result = HookManager.defineHook('onAiComplete', {
                description: 'A different contract',
                owner: 'other-plugin'
            });

            expect(result).toBe(kept);
            expect(kept.owner).toBe('ai-core');
            expect(kept.description).toBe('Run one completion');
            expect(kept.conflicts).toHaveLength(1);
            expect(kept.conflicts[0].owner).toBe('other-plugin');
            expect(global.LogController.logError).toHaveBeenCalled();
        });

        test('defining never throws, even on unusable input', () => {
            expect(() => HookManager.defineHook(null)).not.toThrow();
            expect(() => HookManager.defineHook('')).not.toThrow();
            expect(() => HookManager.defineHook('onAiComplete', {
                description: 'x',
                owner: 'ai-core',
                mode: 'not-a-mode',
                onError: 'explode',
                stability: 'maybe'
            })).not.toThrow();

            const repaired = HookManager.definitions.get('onAiComplete');
            expect(repaired.mode).toBe('execute');
            expect(repaired.onError).toBe('continue');
            expect(repaired.stability).toBe('stable');
        });

        test('getAvailableHooks synthesizes context from contextKeys, including object-form entries', () => {
            HookManager.defineHook('onAiComplete', {
                description: 'Run one completion',
                owner: 'ai-core',
                contextKeys: ['threadId', { key: 'model', type: 'string' }, 'messages'],
                canModify: true
            });

            const view = HookManager.getAvailableHooks().onAiComplete;
            expect(view.context).toBe('{ threadId, model, messages }');
            expect(view.canModify).toBe(true);
            expect(view.canCancel).toBe(false);
        });

        test('contextNote overrides the synthesized context string', () => {
            expect(HookManager.getAvailableHooks().onSystemGetStats.context)
                .toBe('{ stats: {}, instanceId: string }');
        });

        test('clear() leaves definitions in place; clearDefinitions() empties the catalog', () => {
            expect(HookManager.isValidHook('onAuthBeforeLogin')).toBe(true);

            HookManager.register('onAuthBeforeLogin', 'test-plugin', jest.fn());
            HookManager.clear();

            expect(HookManager.hasHandlers('onAuthBeforeLogin')).toBe(false);
            expect(HookManager.isValidHook('onAuthBeforeLogin')).toBe(true);

            HookManager.clearDefinitions();
            expect(HookManager.isValidHook('onAuthBeforeLogin')).toBe(false);
            expect(Object.keys(HookManager.getAvailableHooks())).toHaveLength(0);
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

        test('should ignore a non-object return instead of overwriting the context', async () => {
            const handler = jest.fn().mockReturnValue(false);
            HookManager.register('onAuthBeforeLogin', 'test-plugin', handler);

            const context = { user: 'test' };
            const result = await HookManager.execute('onAuthBeforeLogin', context);

            expect(result).toEqual(context);
            expect(result.user).toBe('test');
        });

        test('should abort and name the plugin when onError is abort', async () => {
            const handler1 = jest.fn().mockImplementation(() => { throw new Error('Not allowed'); });
            const handler2 = jest.fn();

            HookManager.register('onUserBeforeSave', 'gate-plugin', handler1, 50);
            HookManager.register('onUserBeforeSave', 'later-plugin', handler2, 100);

            await expect(HookManager.execute('onUserBeforeSave', { userData: {} }))
                .rejects.toMatchObject({
                    message: 'Not allowed',
                    hookName: 'onUserBeforeSave',
                    pluginName: 'gate-plugin'
                });

            expect(handler2).not.toHaveBeenCalled();
            expect(global.LogController.logError).not.toHaveBeenCalled();
        });
    });

    describe('onError policy', () => {
        test('execute continues after a throw on a continue hook', async () => {
            const handler1 = jest.fn().mockImplementation(() => { throw new Error('broken'); });
            const handler2 = jest.fn().mockImplementation((ctx) => ({ ...ctx, ok: true }));

            HookManager.register('onAuthAfterLogin', 'plugin1', handler1, 50);
            HookManager.register('onAuthAfterLogin', 'plugin2', handler2, 100);

            const result = await HookManager.execute('onAuthAfterLogin', {});

            expect(result.ok).toBe(true);
            expect(global.LogController.logError).toHaveBeenCalled();
        });

        test('executeFirst continues to the next handler after a throw', async () => {
            const handler1 = jest.fn().mockImplementation(() => { throw new Error('broken'); });
            const handler2 = jest.fn().mockReturnValue('ldap');

            HookManager.register('onAuthBeforeLogin', 'plugin1', handler1, 50);
            HookManager.register('onAuthBeforeLogin', 'plugin2', handler2, 100);

            const result = await HookManager.executeFirst('onAuthBeforeLogin', {});

            expect(result).toBe('ldap');
        });

        test('an abort override on a broadcast hook propagates', async () => {
            HookManager.defineHook('onBubbleWidgetConfigBeforeSave', {
                description: 'Veto a widget config save',
                owner: 'site',
                onError: 'abort'
            });
            const handler = jest.fn().mockImplementation(() => {
                throw new Error('You are not allowed to add a Custom Script');
            });
            HookManager.register('onBubbleWidgetConfigBeforeSave', 'widget-chart-core', handler);

            await expect(HookManager.execute('onBubbleWidgetConfigBeforeSave', {}))
                .rejects.toThrow('You are not allowed to add a Custom Script');

            HookManager.clearDefinitions();
            HookManager.seedFrameworkDefinitions();
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

    // W-200: single-plugin-scoped, error-propagating execution mode (plugin config save hooks)
    describe('executeForPlugin', () => {
        test('should only run handlers registered by the target plugin', async () => {
            const targetHandler = jest.fn().mockImplementation((ctx) => ({ ...ctx, ran: 'target' }));
            const otherHandler = jest.fn();

            HookManager.register('onPluginConfigBeforeSave', 'target-plugin', targetHandler);
            HookManager.register('onPluginConfigBeforeSave', 'other-plugin', otherHandler);

            const result = await HookManager.executeForPlugin('onPluginConfigBeforeSave', 'target-plugin', {});

            expect(targetHandler).toHaveBeenCalled();
            expect(otherHandler).not.toHaveBeenCalled();
            expect(result.ran).toBe('target');
        });

        test('should pass context to the handler and return the modified context', async () => {
            const handler = jest.fn().mockImplementation((ctx) => {
                ctx.configData.secret = 'encrypted:abc';
                return ctx;
            });
            HookManager.register('onPluginConfigBeforeSave', 'test-plugin', handler);

            const context = { pluginName: 'test-plugin', configData: { secret: 'plaintext' }, oldConfig: null };
            const result = await HookManager.executeForPlugin('onPluginConfigBeforeSave', 'test-plugin', context);

            expect(handler).toHaveBeenCalledWith(context);
            expect(result.configData.secret).toBe('encrypted:abc');
        });

        test('should propagate a thrown error instead of swallowing it', async () => {
            const handler = jest.fn().mockImplementation(() => { throw new Error('Encryption failed'); });
            HookManager.register('onPluginConfigBeforeSave', 'test-plugin', handler);

            await expect(
                HookManager.executeForPlugin('onPluginConfigBeforeSave', 'test-plugin', {})
            ).rejects.toThrow('Encryption failed');

            // Unlike execute()/executeFirst() on a continue hook, the error is NOT logged and
            // swallowed here - it's the caller's job to catch it (e.g. to abort a save with a 400).
            expect(global.LogController.logError).not.toHaveBeenCalled();
        });

        test('should stop at the throwing handler and not run subsequent handlers for the same plugin', async () => {
            const handler1 = jest.fn().mockImplementation(() => { throw new Error('First handler failed'); });
            const handler2 = jest.fn();

            HookManager.register('onPluginConfigBeforeSave', 'test-plugin', handler1, 50);
            HookManager.register('onPluginConfigBeforeSave', 'test-plugin', handler2, 100);

            await expect(
                HookManager.executeForPlugin('onPluginConfigBeforeSave', 'test-plugin', {})
            ).rejects.toThrow('First handler failed');

            expect(handler2).not.toHaveBeenCalled();
        });

        test('should be a no-op returning the original context when no handlers are registered', async () => {
            const context = { pluginName: 'test-plugin', configData: {} };
            const result = await HookManager.executeForPlugin('onPluginConfigBeforeSave', 'test-plugin', context);

            expect(result).toEqual(context);
        });

        test('onPluginConfigBeforeSave should be registered as an available hook', () => {
            const hooks = HookManager.getAvailableHooks();
            expect(hooks).toHaveProperty('onPluginConfigBeforeSave');
            expect(hooks.onPluginConfigBeforeSave.canModify).toBe(true);
            expect(hooks.onPluginConfigBeforeSave.canCancel).toBe(true);
            expect(hooks.onPluginConfigBeforeSave.context).toContain('oldConfig');
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

        test('should expose onSystemGetStats rather than the old onGetInstanceStats name', () => {
            const hooks = HookManager.getAvailableHooks();
            expect(hooks.onSystemGetStats).toBeDefined();
            expect(hooks.onGetInstanceStats).toBeUndefined();
            expect(HookManager.isValidHook('onSystemGetStats')).toBe(true);
            expect(HookManager.isValidHook('onGetInstanceStats')).toBe(false);
        });

        test('unfired user hooks are marked planned', () => {
            expect(HookManager.definitions.get('onUserBeforeDelete').stability).toBe('planned');
            expect(HookManager.definitions.get('onUserAfterDelete').stability).toBe('planned');
            expect(HookManager.definitions.get('onUserSyncProfile').stability).toBe('planned');
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

    describe('onSystemGetStats elapsed timing', () => {
        test('attaches per-plugin elapsed when the handler writes stats[pluginName]', async () => {
            const handler = jest.fn().mockImplementation((context) => {
                context.stats['auth-mfa'] = { status: 'ok' };
                return context;
            });
            HookManager.register('onSystemGetStats', 'auth-mfa', handler);

            const result = await HookManager.execute('onSystemGetStats', {
                stats: {},
                instanceId: 'test'
            });

            expect(result.stats['auth-mfa'].status).toBe('ok');
            expect(typeof result.stats['auth-mfa'].elapsed).toBe('number');
            expect(result.stats['auth-mfa'].elapsed).toBeGreaterThanOrEqual(0);
        });
    });

    // W-195: External auth login provider buttons
    describe('W-195: onAuthGetLoginProviders', () => {
        test('onAuthGetLoginProviders should be available', () => {
            const hooks = HookManager.getAvailableHooks();
            expect(hooks).toHaveProperty('onAuthGetLoginProviders');
            expect(hooks.onAuthGetLoginProviders.description).toBeDefined();
            expect(hooks.onAuthGetLoginProviders.canModify).toBe(true);
        });

        test('should accumulate providers from multiple plugins', async () => {
            const handler1 = jest.fn().mockImplementation((context) => {
                context.providers.push({ id: 'oauth', label: 'Sign in with Acme', initUrl: '/plugin/oauth/init', order: 50 });
                return context;
            });
            const handler2 = jest.fn().mockImplementation((context) => {
                context.providers.push({ id: 'ldap', label: 'Sign in with LDAP', initUrl: '/plugin/ldap/init', order: 100 });
                return context;
            });

            HookManager.register('onAuthGetLoginProviders', 'oauth-plugin', handler1);
            HookManager.register('onAuthGetLoginProviders', 'ldap-plugin', handler2);

            const context = { providers: [] };
            const result = await HookManager.execute('onAuthGetLoginProviders', context);

            expect(result.providers).toHaveLength(2);
            expect(result.providers.some(p => p.id === 'oauth')).toBe(true);
            expect(result.providers.some(p => p.id === 'ldap')).toBe(true);
        });

        test('hasHandlers should reflect registration state (used by bootstrap safety check)', () => {
            expect(HookManager.hasHandlers('onAuthGetLoginProviders')).toBe(false);

            HookManager.register('onAuthGetLoginProviders', 'oauth-plugin', jest.fn());

            expect(HookManager.hasHandlers('onAuthGetLoginProviders')).toBe(true);
        });
    });

    describe('getHook / findHooks', () => {
        test('getHook merges definition and handlers', () => {
            HookManager.register('onAuthAfterLogin', 'hello-world', jest.fn(), 50);

            const hook = HookManager.getHook('onAuthAfterLogin');
            expect(hook.defined).toBe(true);
            expect(hook.active).toBe(true);
            expect(hook.unverified).toBe(false);
            expect(hook.definition.owner).toBe('framework');
            expect(hook.definition.mode).toBe('execute');
            expect(hook.handlers).toEqual([{ plugin: 'hello-world', priority: 50 }]);
        });

        test('getHook returns a well-formed undefined result for an unknown name', () => {
            const hook = HookManager.getHook('onAiComplete');
            expect(hook).toEqual({
                name: 'onAiComplete',
                defined: false,
                active: false,
                definition: null,
                handlers: [],
                unverified: false
            });
        });

        test('findHooks filters by owner, namePattern, stability, and hasHandlers', () => {
            HookManager.register('onAuthAfterLogin', 'hello-world', jest.fn());

            const auth = HookManager.findHooks({ namePattern: /^onAuth/ });
            expect(auth.every(hook => hook.name.startsWith('onAuth'))).toBe(true);
            expect(auth.length).toBeGreaterThan(0);

            const framework = HookManager.findHooks({ owner: 'framework' });
            expect(framework.every(hook => hook.definition?.owner === 'framework')).toBe(true);

            const planned = HookManager.findHooks({ stability: 'planned' });
            expect(planned.map(hook => hook.name).sort()).toEqual([
                'onUserAfterDelete',
                'onUserBeforeDelete',
                'onUserSyncProfile'
            ]);

            const listening = HookManager.findHooks({ hasHandlers: true });
            expect(listening.map(hook => hook.name)).toEqual(['onAuthAfterLogin']);
        });
    });

    describe('getAudit', () => {
        afterEach(() => {
            HookManager.clearDefinitions();
            HookManager.seedFrameworkDefinitions();
        });

        test('unmatched registration is reported once with a did-you-mean', () => {
            HookManager.register('onUserAfterSav', 'typo-plugin', jest.fn());

            const audit = HookManager.getAudit();
            const finding = audit.findings.find(item => item.code === 'UNDEFINED_HOOK');
            expect(finding).toMatchObject({
                level: 'warning',
                hookName: 'onUserAfterSav',
                suggestion: 'onUserAfterSave'
            });
            expect(finding.message).toContain('typo-plugin');
        });

        test('a late definition retro-validates and clears the unmatched finding', () => {
            HookManager.register('onAiComplete', 'ai-anthropic', jest.fn());
            expect(HookManager.getAudit().findings.some(item =>
                item.code === 'UNDEFINED_HOOK' && item.hookName === 'onAiComplete')).toBe(true);

            HookManager.defineHook('onAiComplete', {
                description: 'Run one completion',
                owner: 'ai-core',
                mode: 'executeForPlugin'
            });

            expect(HookManager.getHook('onAiComplete').unverified).toBe(false);
            expect(HookManager.getAudit().findings.some(item =>
                item.code === 'UNDEFINED_HOOK' && item.hookName === 'onAiComplete')).toBe(false);
        });

        test('deprecated, planned, and disabled-owner findings', () => {
            HookManager.defineHook('onLegacyThing', {
                description: 'Old hook',
                owner: 'ai-core',
                stability: 'deprecated',
                deprecatedBy: 'onNewThing'
            });
            HookManager.register('onLegacyThing', 'consumer', jest.fn());
            HookManager.register('onUserBeforeDelete', 'consumer', jest.fn());

            HookManager.defineHook('onAiComplete', {
                description: 'Run one completion',
                owner: 'ai-core'
            });
            HookManager.register('onAiComplete', 'ai-anthropic', jest.fn());
            HookManager.setDefinitionsActive('ai-core', false);

            const codes = HookManager.getAudit().findings.map(item => item.code);
            expect(codes).toContain('DEPRECATED_HOOK');
            expect(codes).toContain('PLANNED_HOOK');
            expect(codes).toContain('DISABLED_OWNER');
        });

        test('prefix mismatch is info only; getAudit is callable at runtime', () => {
            HookManager.defineHook('onCompletelyUnrelated', {
                description: 'Does not match owner prefix',
                owner: 'ai-core',
                contextKeys: ['x']
            });

            const finding = HookManager.getAudit().findings.find(item =>
                item.code === 'PREFIX_MISMATCH' && item.hookName === 'onCompletelyUnrelated');
            expect(finding.level).toBe('info');
            expect(finding.message).toContain('onAiCore');
        });

        test('conflicting definition is an error finding', () => {
            HookManager.defineHook('onAiComplete', {
                description: 'First',
                owner: 'ai-core'
            });
            HookManager.defineHook('onAiComplete', {
                description: 'Second',
                owner: 'other'
            });

            const finding = HookManager.getAudit().findings.find(item =>
                item.code === 'CONFLICTING_DEFINITION');
            expect(finding.level).toBe('error');
            expect(finding.owner).toBe('ai-core');
        });
    });

    describe('registerFromClass', () => {
        afterEach(() => {
            HookManager.clearDefinitions();
            HookManager.seedFrameworkDefinitions();
        });

        test('defines static hookDefinitions and registers static hooks', () => {
            class DemoController {
                static hookDefinitions = {
                    onAiComplete: {
                        description: 'Run one completion',
                        mode: 'executeForPlugin',
                        contextKeys: ['threadId']
                    }
                };
                static hooks = {
                    onUserAfterSave: { priority: 50 }
                };
                static async onUserAfterSave(context) {
                    return context;
                }
            }

            const result = HookManager.registerFromClass('ai-core', DemoController);
            expect(result).toEqual({ defined: 1, registered: 1 });
            expect(HookManager.getHook('onAiComplete').definition.owner).toBe('ai-core');
            expect(HookManager.getRegisteredHooks().onUserAfterSave[0]).toEqual({
                plugin: 'ai-core',
                priority: 50
            });
        });

        test('setDefinitionsActive hides a definition from getAvailableHooks', () => {
            HookManager.defineHook('onAiComplete', {
                description: 'Run one completion',
                owner: 'ai-core'
            });
            expect(HookManager.isValidHook('onAiComplete')).toBe(true);

            HookManager.setDefinitionsActive('ai-core', false);
            expect(HookManager.isValidHook('onAiComplete')).toBe(false);
            expect(HookManager.getAvailableHooks().onAiComplete).toBeUndefined();

            HookManager.setDefinitionsActive('ai-core', true);
            expect(HookManager.isValidHook('onAiComplete')).toBe(true);
        });
    });
});

// EOF webapp/tests/unit/utils/hook-manager.test.js
