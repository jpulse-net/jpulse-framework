/**
 * @name            jPulse Framework / WebApp / Controller / Hook
 * @tagline         Admin introspection for the hook catalog
 * @description     Read-only API for hook definitions, handlers, and the boot audit.
 * @file            webapp/controller/hook.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import LogController from './log.js';
import CommonUtils from '../utils/common.js';
import HookManager from '../utils/hook-manager.js';

/**
 * Hook Controller - GET /api/1/hook and GET /api/1/hook/:name (admin-only)
 */
class HookController {

    /**
     * List hooks, optionally filtered, plus the current audit
     * GET /api/1/hook?owner=&stability=&hasHandlers=
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async list(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'hook.list', '');
        try {
            const filters = {};
            if (req.query.owner) {
                filters.owner = req.query.owner;
            }
            if (req.query.stability) {
                filters.stability = req.query.stability;
            }
            if (req.query.hasHandlers === 'true') {
                filters.hasHandlers = true;
            } else if (req.query.hasHandlers === 'false') {
                filters.hasHandlers = false;
            }

            const hooks = HookManager.findHooks(filters);
            const audit = HookManager.getAudit();
            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'hook.list',
                `success: ${hooks.length} hooks, ${audit.findings.length} audit finding(s), completed in ${elapsed}ms`);

            res.json({
                success: true,
                data: { hooks, audit },
                elapsed
            });
        } catch (error) {
            LogController.logError(req, 'hook.list', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, error.message, 'INTERNAL_ERROR');
        }
    }

    /**
     * One hook: definition merged with live handlers
     * GET /api/1/hook/:name
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async get(req, res) {
        const startTime = Date.now();
        const name = req.params.name;
        LogController.logRequest(req, 'hook.get', name);
        try {
            const hook = HookManager.getHook(name);
            if (!hook.defined && hook.handlers.length === 0) {
                LogController.logError(req, 'hook.get', `error: hook not found: ${name}`);
                return CommonUtils.sendError(req, res, 404, `Hook not found: ${name}`, 'HOOK_NOT_FOUND');
            }

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'hook.get', `success: ${name}, completed in ${elapsed}ms`);
            res.json({
                success: true,
                data: hook,
                elapsed
            });
        } catch (error) {
            LogController.logError(req, 'hook.get', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, error.message, 'INTERNAL_ERROR');
        }
    }
}

export default HookController;

// EOF webapp/controller/hook.js
