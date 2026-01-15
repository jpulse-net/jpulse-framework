/**
 * @name            jPulse Framework / WebApp / Tests / Unit / I18N / Utils / Key Extractor
 * @tagline         Extract i18n keys from view and controller files
 * @description     Utility to extract translation keys from various source formats
 * @file            webapp/tests/unit/i18n/utils/key-extractor.js
 * @version         1.4.15
 * @release         2026-01-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

/**
 * Check if a match is inside a Handlebars comment
 * @param {string} content - Full file content
 * @param {number} matchIndex - Index of the match in content
 * @returns {boolean} True if match is inside a comment
 */
function isInComment(content, matchIndex) {
    // Look backwards for {{!-- and forwards for --}}
    const beforeMatch = content.substring(Math.max(0, matchIndex - 100), matchIndex);
    const afterMatch = content.substring(matchIndex, Math.min(content.length, matchIndex + 100));

    // Check if we're inside {{!-- ... --}}
    const commentStart = beforeMatch.lastIndexOf('{{!--');
    const commentEnd = beforeMatch.lastIndexOf('--}}');
    if (commentStart > commentEnd && commentStart !== -1) {
        // We're inside a comment that hasn't closed yet
        return true;
    }

    // Check if we're inside a comment that spans forward
    if (commentStart !== -1 && commentEnd === -1) {
        // Comment started but hasn't closed - check if it closes after our match
        const closeAfter = afterMatch.indexOf('--}}');
        if (closeAfter !== -1) {
            return true;
        }
    }

    return false;
}

/**
 * Extract i18n keys from view files ({{i18n.*}} patterns)
 * @param {string} content - File content
 * @param {string} filePath - File path for reporting
 * @returns {Array} Array of objects with key, line, and file properties
 *                  [{ key: 'view.ui.title', line: 45, file: '...' }, ...]
 */
export function extractViewKeys(content, filePath) {
    const results = [];
    const lines = content.split('\n');

    // Regex pattern matches both {{i18n.*}} and {{@i18n.*}} (escaped handlebars)
    // Pattern: /\{\{@?i18n\.([^}]+)\}\}/g
    const pattern = /\{\{@?i18n\.([^}]+)\}\}/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
        const matchIndex = match.index;
        const fullMatch = match[0];
        const key = match[1].trim();

        // Skip if inside a comment
        if (isInComment(content, matchIndex)) {
            continue;
        }

        // Skip HTML-escaped patterns (&#123;&#123; and &#125;&#125;)
        const beforeMatch = content.substring(Math.max(0, matchIndex - 20), matchIndex);
        const afterMatch = content.substring(matchIndex + fullMatch.length, Math.min(content.length, matchIndex + fullMatch.length + 20));
        if (beforeMatch.includes('&#123;&#123;') || afterMatch.includes('&#125;&#125;')) {
            continue;
        }

        // Calculate line number
        const lineNumber = content.substring(0, matchIndex).split('\n').length;

        results.push({
            key,
            line: lineNumber,
            file: filePath,
            match: fullMatch
        });
    }

    return results;
}

/**
 * Extract i18n keys from controller files (global.i18n.translate() calls)
 * @param {string} content - File content
 * @param {string} filePath - File path for reporting
 * @returns {Array} Array of objects with key, line, file, and dynamic flag
 *                  [{ key: 'controller.auth.loginSuccess', line: 120, file: '...', dynamic: false }, ...]
 */
export function extractControllerKeys(content, filePath) {
    const results = [];
    const lines = content.split('\n');

    // Regex pattern: global.i18n.translate(req, 'key') or global.i18n.translate(req, "key")
    // Pattern: /global\.i18n\.translate\s*\(\s*[^,]+,\s*['"]([^'"]+)['"]/gm
    const pattern = /global\.i18n\.translate\s*\(\s*[^,]+,\s*['"]([^'"]+)['"]/gm;
    let match;

    while ((match = pattern.exec(content)) !== null) {
        const matchIndex = match.index;
        const key = match[1].trim();

        // Calculate line number
        const lineNumber = content.substring(0, matchIndex).split('\n').length;

        // Check if it's a dynamic key (variable instead of string literal)
        // This is a simple check - if the pattern matched, it's likely a string literal
        // But we can't catch all cases (e.g., string concatenation, template literals)
        const isDynamic = false; // Regex only matches string literals

        results.push({
            key,
            line: lineNumber,
            file: filePath,
            dynamic: isDynamic,
            match: match[0]
        });
    }

    // Also try to detect dynamic keys (variables, string concatenation, template literals)
    // These can't be validated statically

    // Pattern 1: Variables (e.g., global.i18n.translate(req, keyVar))
    const variablePattern = /global\.i18n\.translate\s*\(\s*[^,]+,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[,\)]/gm;
    while ((match = variablePattern.exec(content)) !== null) {
        const matchIndex = match.index;
        const variableName = match[1];

        // Skip common request object properties that might match
        if (['req', 'res', 'next', 'error'].includes(variableName)) {
            continue;
        }

        const lineNumber = content.substring(0, matchIndex).split('\n').length;
        const lineContent = lines[lineNumber - 1] || '';

        // Skip if line has audit ignore directive
        if (lineContent.match(/(\/\/|\/\*) *i18n-audit-ignore\b/)) {
            continue;
        }

        results.push({
            key: variableName,
            line: lineNumber,
            file: filePath,
            dynamic: true,
            match: match[0],
            reason: 'variable'
        });
    }

    // Pattern 2: String concatenation (e.g., 'controller.' + module + '.key')
    const concatPattern = /global\.i18n\.translate\s*\(\s*[^,]+,\s*[^,)]*\+[^,)]*/gm;
    while ((match = concatPattern.exec(content)) !== null) {
        const matchIndex = match.index;
        const lineNumber = content.substring(0, matchIndex).split('\n').length;
        const lineContent = lines[lineNumber - 1] || '';

        // Skip if line has audit ignore directive
        if (lineContent.match(/(\/\/|\/\*) *i18n-audit-ignore\b/)) {
            continue;
        }

        const fullMatch = match[0];

        results.push({
            key: '[string concatenation]',
            line: lineNumber,
            file: filePath,
            dynamic: true,
            match: fullMatch.trim(),
            reason: 'string concatenation'
        });
    }

    // Pattern 3: Template literals (e.g., `controller.${module}.key`)
    const templatePattern = /global\.i18n\.translate\s*\(\s*[^,]+,\s*`[^`]*\$\{[^}]+\}[^`]*`/gm;
    while ((match = templatePattern.exec(content)) !== null) {
        const matchIndex = match.index;
        const lineNumber = content.substring(0, matchIndex).split('\n').length;
        const fullMatch = match[0];

        results.push({
            key: '[template literal]',
            line: lineNumber,
            file: filePath,
            dynamic: true,
            match: fullMatch.trim(),
            reason: 'template literal'
        });
    }

    return results;
}

// EOF webapp/tests/unit/i18n/utils/key-extractor.js
