/**
 * @name            jPulse Framework / WebApp / Utils / HookDefinitions
 * @tagline         The hook contracts the framework itself owns
 * @description     Definitions of every hook fired by framework code, seeded into
 *                  HookManager's catalog at module load through the public defineHooks() API.
 * @file            webapp/utils/hook-definitions.js
 * @version         1.7.14
 * @release         2026-08-14
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

/**
 * Framework hook definitions
 *
 * The framework is a hook producer like any other - a plugin or a site controller defines
 * its own hooks the same way, via `static hookDefinitions`. The framework's live here in one
 * file rather than next to each fire site for two reasons: the catalog must be populated
 * without a bootstrap (unit tests import HookManager on its own), and one file answers
 * "what can I hook into?" for a newcomer.
 *
 * Field reference is on HookManager.defineHook(). Only `description` is required; `mode`
 * defaults to 'execute', and `onError` and `returns` derive from `mode`. `contextKeys` is the
 * machine-readable key list - the context string shown in the docs and the admin view is
 * synthesized from it, unless `contextNote` spells it out instead.
 */
const frameworkHookDefinitions = {

    // ================================================================
    // Authentication hooks (8)
    // ================================================================
    onAuthBeforeLogin: {
        description: 'Before credential validation - external auth (LDAP/OAuth), captcha',
        contextKeys: ['req', 'identifier', 'password', 'captchaToken', 'skipPasswordCheck',
            'user', 'authMethod'],
        canModify: true,
        since: '1.3.10'
    },
    onAuthBeforeSession: {
        description: 'Before session is created - add data to session',
        contextKeys: ['req', 'user', 'sessionData'],
        canModify: true,
        since: '1.3.10'
    },
    onAuthAfterLogin: {
        description: 'After successful login - audit logging, notifications',
        contextKeys: ['req', 'user', 'session', 'authMethod'],
        canModify: false,
        since: '1.3.10'
    },
    onAuthFailure: {
        description: 'On login failure - rate limiting, lockout',
        contextKeys: ['req', 'identifier', 'reason'],
        canModify: false,
        since: '1.3.10'
    },
    onAuthGetSteps: {
        description: 'Get required login steps (MFA, email verify, etc.)',
        contextKeys: ['req', 'user', 'completedSteps', 'requiredSteps'],
        canModify: true,
        since: '1.3.10'
    },
    onAuthValidateStep: {
        description: 'Execute and validate a specific login step',
        contextKeys: ['req', 'user', 'step', 'stepData', 'pending', 'valid', 'error'],
        canModify: true,
        since: '1.3.10'
    },
    onAuthGetWarnings: {
        description: 'Get non-blocking login warnings (nag messages)',
        contextKeys: ['req', 'user', 'warnings'],
        canModify: true,
        since: '1.3.10'
    },
    onAuthGetLoginProviders: {
        description: 'Provide external auth provider buttons for the login page (OAuth, LDAP, SAML)',
        contextKeys: ['req', 'providers'],
        canModify: true,
        since: '1.7.1'
    },

    // ================================================================
    // User lifecycle hooks (5)
    // ================================================================
    onUserBeforeSave: {
        description: 'Before user create/update - validation, modification',
        contextKeys: ['req', 'userData', 'isCreate', 'isSignup'],
        canModify: true,
        onError: 'abort',
        since: '1.3.10'
    },
    onUserAfterSave: {
        description: 'After user create/update - notifications, sync',
        contextKeys: ['req', 'user', 'wasCreate', 'wasSignup'],
        canModify: false,
        since: '1.3.10'
    },
    onUserBeforeDelete: {
        description: 'Before user deletion - can cancel',
        contextKeys: ['req', 'user'],
        canModify: false,
        onError: 'abort',
        stability: 'planned',
        since: '1.3.10'
    },
    onUserAfterDelete: {
        description: 'After user deletion - cleanup, audit',
        contextKeys: ['req', 'user'],
        canModify: false,
        stability: 'planned',
        since: '1.3.10'
    },
    onUserSyncProfile: {
        description: 'Sync external profile data (LDAP/OAuth)',
        contextKeys: ['req', 'user', 'externalProfile', 'provider'],
        canModify: true,
        stability: 'planned',
        since: '1.3.10'
    },

    // ================================================================
    // Plugin config hooks (1)
    // ================================================================
    onPluginConfigBeforeSave: {
        description: 'Before a plugin config save is persisted - transform/encrypt ' +
            '"custom"-type field values (e.g. secrets)',
        mode: 'executeForPlugin',
        contextKeys: ['req', 'pluginName', 'configData', 'oldConfig'],
        canModify: true,
        since: '1.7.4'
    },

    // ================================================================
    // System/Metrics hooks (1)
    // ================================================================
    onSystemGetStats: {
        description: 'Collect component stats for metrics API - plugins can register their stats',
        contextKeys: ['stats', 'instanceId'],
        contextNote: '{ stats: {}, instanceId: string }',
        canModify: true,
        since: '1.3.13'
    }
};

export default frameworkHookDefinitions;

// EOF webapp/utils/hook-definitions.js
