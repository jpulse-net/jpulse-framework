/**
 * @name            jPulse Framework / WebApp / Utils / Shared Module
 * @tagline         Load a plain-JS view template on the server
 * @description     Runs a view .tmpl that the page already includes, and returns its
 *                  @export binding. Resolution and cache settings match file.include.
 *                  The file stays plain JavaScript: {{!-- comments --}} are removed,
 *                  and any other {{ in code is rejected.
 * @usage           Usage:
 *                  import SharedModule from '../utils/shared-module.js';
 *                  const mapSearchQuery = SharedModule.load('map/search/query.tmpl');
 * @file            webapp/utils/shared-module.js
 * @version         2.0.14
 * @release         2026-10-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 3.21, Grok 4.7
 */

import vm from 'vm';
import path from 'path';
import LogController from '../controller/log.js';
import PathResolver from './path-resolver.js';
import cacheManager from './cache-manager.js';

const CACHE_NAME = 'SharedModuleCache';
const EXPORT_SENTINEL = '__jpSharedModuleExport';
const RUN_TIMEOUT_MS = 1000;
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * Replace {{!-- --}} comments with whitespace, keeping line numbers aligned
 * with the file on disk.
 * @param {string} source
 * @returns {string}
 */
function blankHandlebarsComments(source) {
    return source.replace(/\{\{!--[\s\S]*?--\}\}/g, (block) => {
        return block.replace(/[^\n\r]/g, ' ');
    });
}

/**
 * Read the single @export name from the leading file-header comment.
 * @param {string} source
 * @param {string} includePath
 * @returns {string}
 */
function readExportName(source, includePath) {
    const match = /^(?:\uFEFF)?\s*(?:\{\{!--([\s\S]*?)--\}\}|\/\*([\s\S]*?)\*\/|<!--([\s\S]*?)-->)/.exec(source);
    const body = match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
    const names = [];
    const re = /@export\b[ \t]*([^\n\r]*)/g;
    let found;
    while ((found = re.exec(body)) !== null) {
        const token = found[1].trim();
        if (!IDENTIFIER.test(token)) {
            throw new Error(`Shared module ${includePath} has an invalid @export name`);
        }
        names.push(token);
    }
    if (names.length === 0) {
        throw new Error(`Shared module ${includePath} has no @export in the file header`);
    }
    if (names.length > 1) {
        throw new Error(`Shared module ${includePath} has more than one @export`);
    }
    return names[0];
}

/**
 * Index of the first {{ that sits in code, or -1.
 * Strings, template literals, and // and block comments are skipped.
 * ${} inside a template literal is code again.
 * @param {string} source
 * @returns {number}
 */
function handlebarsInCode(source) {
    const stack = ['code'];
    const interpDepth = [];
    const limit = source.length;
    let i = 0;

    while (i < limit) {
        const c = source[i];
        const d = source[i + 1];
        const mode = stack[stack.length - 1];

        if (mode === 'line') {
            if (c === '\n') {
                stack.pop();
            }
            i++;
            continue;
        }
        if (mode === 'block') {
            if (c === '*' && d === '/') {
                stack.pop();
                i += 2;
                continue;
            }
            i++;
            continue;
        }
        if (mode === 'single' || mode === 'double' || mode === 'template') {
            const quote = mode === 'single' ? '\'' : (mode === 'double' ? '"' : '`');
            if (c === '\\') {
                i += 2;
                continue;
            }
            if (mode === 'template' && c === '$' && d === '{') {
                stack.push('code');
                interpDepth.push(0);
                i += 2;
                continue;
            }
            if (c === quote) {
                stack.pop();
            }
            i++;
            continue;
        }

        if (c === '/' && d === '/') {
            stack.push('line');
            i += 2;
            continue;
        }
        if (c === '/' && d === '*') {
            stack.push('block');
            i += 2;
            continue;
        }
        if (c === '\'') {
            stack.push('single');
            i++;
            continue;
        }
        if (c === '"') {
            stack.push('double');
            i++;
            continue;
        }
        if (c === '`') {
            stack.push('template');
            i++;
            continue;
        }
        if (c === '{' && d === '{') {
            return i;
        }
        if (interpDepth.length > 0) {
            if (c === '{') {
                interpDepth[interpDepth.length - 1]++;
            } else if (c === '}') {
                if (interpDepth[interpDepth.length - 1] === 0) {
                    interpDepth.pop();
                    stack.pop();
                } else {
                    interpDepth[interpDepth.length - 1]--;
                }
            }
        }
        i++;
    }
    return -1;
}

/**
 * @param {string} source
 * @param {number} index
 * @returns {number}
 */
function lineNumberAt(source, index) {
    let line = 1;
    const stop = Math.min(index, source.length);
    for (let i = 0; i < stop; i++) {
        if (source[i] === '\n') {
            line++;
        }
    }
    return line;
}

/**
 * @param {string} source
 * @param {number} index
 * @returns {string}
 */
function lineTextAt(source, index) {
    const start = source.lastIndexOf('\n', index - 1) + 1;
    const end = source.indexOf('\n', index);
    const text = source.slice(start, end === -1 ? source.length : end).trim();
    return text.length > 120 ? text.slice(0, 120) : text;
}

/**
 * Load a plain-JS view .tmpl on the server.
 * The page includes the same file with {{file.include}}.
 */
class SharedModule {

    static _cache = null;
    static _cacheKey = '';
    static _compiled = new Map();

    /**
     * File cache registered with controller.handlebar.cacheIncludes.
     * @returns {object}
     */
    static _fileCache() {
        const raw = global.appConfig?.controller?.handlebar?.cacheIncludes || {};
        const config = {
            enabled: raw.enabled !== false,
            checkInterval: raw.checkInterval || 0
        };
        const key = `${config.enabled}:${config.checkInterval}`;
        if (this._cache && this._cacheKey === key) {
            return this._cache;
        }
        if (this._cache) {
            cacheManager.unregister(CACHE_NAME);
            this._compiled.clear();
        }
        this._cache = cacheManager.register(config, CACHE_NAME);
        this._cacheKey = key;
        return this._cache;
    }

    /**
     * @param {string} includePath - View-relative path, same string as file.include, ending in .tmpl
     * @returns {*} The @export binding
     */
    static load(includePath) {
        try {
            return this._load(includePath);
        } catch (error) {
            const message = error && error.message ? error.message : String(error);
            LogController.logError(null, 'sharedModule.load', `error: ${message}`);
            throw error;
        }
    }

    /**
     * @param {string} includePath
     * @returns {*}
     */
    static _load(includePath) {
        if (typeof includePath !== 'string' || includePath.length === 0) {
            throw new Error('Shared module requires a view path ending in .tmpl');
        }
        if (includePath.includes('../') || includePath.includes('..\\') || path.isAbsolute(includePath)) {
            throw new Error(`Prohibited path in shared module: ${includePath}. Use relative paths from view root only.`);
        }
        if (!includePath.endsWith('.tmpl')) {
            throw new Error(`Shared module path must end in .tmpl: ${includePath}`);
        }

        const relativePath = `view/${includePath}`;
        let fullPath;
        try {
            fullPath = PathResolver.resolveModuleWithPlugins(relativePath);
        } catch (error) {
            throw new Error(`Shared module not found: ${includePath} (${error.message})`);
        }

        const cache = this._fileCache();
        const content = cache.getFileSync(fullPath);
        if (content == null) {
            throw new Error(`Shared module not found: ${includePath}`);
        }

        if (cache.config.enabled) {
            const stamp = cache.fileCache.get(fullPath)?.timestamp ?? 0;
            const hit = this._compiled.get(fullPath);
            if (hit && hit.stamp === stamp) {
                return hit.value;
            }
            const value = this._compile(content, fullPath, includePath);
            this._compiled.set(fullPath, { stamp, value });
            return value;
        }

        return this._compile(content, fullPath, includePath);
    }

    /**
     * @param {string} content
     * @param {string} fullPath
     * @param {string} includePath
     * @returns {*}
     */
    static _compile(content, fullPath, includePath) {
        const exportName = readExportName(content, includePath);
        const source = blankHandlebarsComments(content);
        const braceAt = handlebarsInCode(source);
        if (braceAt !== -1) {
            const line = lineNumberAt(source, braceAt);
            const text = lineTextAt(source, braceAt);
            throw new Error(`Shared module ${includePath} contains Handlebars at line ${line}: ${text}`);
        }

        const program = `${source}\nglobalThis.${EXPORT_SENTINEL} = ${exportName};\n`;
        const sandbox = { console };
        try {
            vm.runInNewContext(program, sandbox, {
                filename: fullPath,
                timeout: RUN_TIMEOUT_MS
            });
        } catch (error) {
            if (error && error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
                throw new Error(`Shared module ${includePath} timed out`);
            }
            const message = error && error.message ? error.message : String(error);
            if (error && error.name === 'ReferenceError' && message.includes(exportName)) {
                throw new Error(`Shared module ${includePath} export "${exportName}" is not defined`);
            }
            throw new Error(`Shared module ${includePath} failed: ${message}`);
        }

        if (!Object.prototype.hasOwnProperty.call(sandbox, EXPORT_SENTINEL)) {
            throw new Error(`Shared module ${includePath} export "${exportName}" is not defined`);
        }

        LogController.logDebug(null, 'sharedModule.load', `compiled: ${includePath}`);
        return sandbox[EXPORT_SENTINEL];
    }
}

export default SharedModule;

// EOF webapp/utils/shared-module.js
