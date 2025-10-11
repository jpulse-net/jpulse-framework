/**
 * @name            jPulse Framework / WebApp / Controller / Cache
 * @tagline         Cache management API controller for the jPulse Framework
 * @description     Provides REST API endpoints for cache invalidation and statistics
 * @file            webapp/controller/cache.js
 * @version         0.9.7
 * @release         2025-10-11
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import LogController from './log.js';
import CommonUtils from '../utils/common.js';
import AuthController from './auth.js';
import ViewController from './view.js';
import MarkdownController from './markdown.js';
import { refreshTranslationCache, getTranslationCacheStats } from '../utils/i18n.js';

class CacheController {

    /**
     * API endpoint: POST /api/1/cache/refresh
     * Refresh all caches by checking file timestamps
     */
    static async refreshAll(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'cache.refreshAll', 'Refresh all caches');

        try {
            // Check authentication and authorization
            if (!AuthController.isAuthenticated(req)) {
                const message = global.i18n.translate(req, 'controller.cache.notAuthenticated');
                return CommonUtils.sendError(req, res, 401, message, 'NOT_AUTHENTICATED');
            }

            if (!AuthController.isAuthorized(req, ['admin', 'root'])) {
                const message = global.i18n.translate(req, 'controller.cache.notAuthorized');
                return CommonUtils.sendError(req, res, 403, message, 'NOT_AUTHORIZED');
            }

            const results = {};
            let totalRefreshed = 0;

            // Refresh view controller caches
            try {
                const templateResult = await ViewController.refreshTemplateCache();
                const includeResult = await ViewController.refreshIncludeCache();
                results.view = {
                    templates: templateResult,
                    includes: includeResult
                };
                if (templateResult.success) totalRefreshed++;
                if (includeResult.success) totalRefreshed++;
            } catch (error) {
                results.view = { success: false, message: error.message };
            }

            // Refresh i18n cache
            try {
                const i18nResult = await refreshTranslationCache();
                results.i18n = i18nResult;
                if (i18nResult.success) totalRefreshed++;
            } catch (error) {
                results.i18n = { success: false, message: error.message };
            }

            // Refresh markdown cache
            try {
                const markdownResult = await MarkdownController.refreshMarkdownCache();
                results.markdown = markdownResult;
                if (markdownResult.success) totalRefreshed++;
            } catch (error) {
                results.markdown = { success: false, message: error.message };
            }

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'cache.refreshAll', `Refreshed ${totalRefreshed} cache types in ${duration}ms`);

            res.json({
                success: true,
                message: `Refreshed ${totalRefreshed} cache types`,
                results: results,
                duration: duration
            });

        } catch (error) {
            LogController.logError(req, 'cache.refreshAll', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.cache.refreshError', { error: error.message });
            return CommonUtils.sendError(req, res, 500, message, 'REFRESH_ERROR');
        }
    }

    /**
     * API endpoint: POST /api/1/cache/refresh/view
     * Refresh view controller caches (templates and includes)
     */
    static async refreshView(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'cache.refreshView', 'Refresh view caches');

        try {
            // Check authentication and authorization
            if (!AuthController.isAuthenticated(req)) {
                const message = global.i18n.translate(req, 'controller.cache.notAuthenticated');
                return CommonUtils.sendError(req, res, 401, message, 'NOT_AUTHENTICATED');
            }

            if (!AuthController.isAuthorized(req, ['admin', 'root'])) {
                const message = global.i18n.translate(req, 'controller.cache.notAuthorized');
                return CommonUtils.sendError(req, res, 403, message, 'NOT_AUTHORIZED');
            }

            const templateResult = await ViewController.refreshTemplateCache();
            const includeResult = await ViewController.refreshIncludeCache();

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'cache.refreshView', `Refreshed view caches in ${duration}ms`);

            res.json({
                success: true,
                message: 'Refreshed view caches',
                results: {
                    templates: templateResult,
                    includes: includeResult
                },
                duration: duration
            });

        } catch (error) {
            LogController.logError(req, 'cache.refreshView', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.cache.refreshError', { error: error.message });
            return CommonUtils.sendError(req, res, 500, message, 'REFRESH_ERROR');
        }
    }

    /**
     * API endpoint: POST /api/1/cache/refresh/i18n
     * Refresh translation caches
     */
    static async refreshI18n(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'cache.refreshI18n', 'Refresh i18n caches');

        try {
            // Check authentication and authorization
            if (!AuthController.isAuthenticated(req)) {
                const message = global.i18n.translate(req, 'controller.cache.notAuthenticated');
                return CommonUtils.sendError(req, res, 401, message, 'NOT_AUTHENTICATED');
            }

            if (!AuthController.isAuthorized(req, ['admin', 'root'])) {
                const message = global.i18n.translate(req, 'controller.cache.notAuthorized');
                return CommonUtils.sendError(req, res, 403, message, 'NOT_AUTHORIZED');
            }

            const result = await refreshTranslationCache();

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'cache.refreshI18n', `Refreshed i18n cache in ${duration}ms`);

            res.json({
                success: result.success,
                message: result.message,
                duration: duration
            });

        } catch (error) {
            LogController.logError(req, 'cache.refreshI18n', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.cache.refreshError', { error: error.message });
            return CommonUtils.sendError(req, res, 500, message, 'REFRESH_ERROR');
        }
    }

    /**
     * API endpoint: POST /api/1/cache/refresh/markdown
     * Refresh markdown caches
     */
    static async refreshMarkdown(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'cache.refreshMarkdown', 'Refresh markdown caches');

        try {
            // Check authentication and authorization
            if (!AuthController.isAuthenticated(req)) {
                const message = global.i18n.translate(req, 'controller.cache.notAuthenticated');
                return CommonUtils.sendError(req, res, 401, message, 'NOT_AUTHENTICATED');
            }

            if (!AuthController.isAuthorized(req, ['admin', 'root'])) {
                const message = global.i18n.translate(req, 'controller.cache.notAuthorized');
                return CommonUtils.sendError(req, res, 403, message, 'NOT_AUTHORIZED');
            }

            const result = await MarkdownController.refreshMarkdownCache();

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'cache.refreshMarkdown', `Refreshed markdown cache in ${duration}ms`);

            res.json({
                success: result.success,
                message: result.message,
                duration: duration
            });

        } catch (error) {
            LogController.logError(req, 'cache.refreshMarkdown', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.cache.refreshError', { error: error.message });
            return CommonUtils.sendError(req, res, 500, message, 'REFRESH_ERROR');
        }
    }

    /**
     * API endpoint: GET /api/1/cache/stats
     * Get cache statistics for all cache types
     */
    static async getStats(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'cache.getStats', 'Get cache statistics');

        try {
            // Check authentication and authorization
            if (!AuthController.isAuthenticated(req)) {
                const message = global.i18n.translate(req, 'controller.cache.notAuthenticated');
                return CommonUtils.sendError(req, res, 401, message, 'NOT_AUTHENTICATED');
            }

            if (!AuthController.isAuthorized(req, ['admin', 'root'])) {
                const message = global.i18n.translate(req, 'controller.cache.notAuthorized');
                return CommonUtils.sendError(req, res, 403, message, 'NOT_AUTHORIZED');
            }

            const stats = {
                view: ViewController.getCacheStats(),
                i18n: getTranslationCacheStats(),
                markdown: MarkdownController.getMarkdownCacheStats()
            };

            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'cache.getStats', `Retrieved cache statistics in ${duration}ms`);

            res.json({
                success: true,
                stats: stats,
                duration: duration
            });

        } catch (error) {
            LogController.logError(req, 'cache.getStats', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.cache.statsError', { error: error.message });
            return CommonUtils.sendError(req, res, 500, message, 'STATS_ERROR');
        }
    }
}

export default CacheController;

// EOF webapp/controller/cache.js
