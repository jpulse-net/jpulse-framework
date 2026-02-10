/**
 * @name            jPulse Framework / WebApp / Utils / Common
 * @tagline         Common Utilities for jPulse Framework WebApp
 * @description     Shared utility functions used across the jPulse Framework WebApp
 * @file            webapp/utils/common.js
 * @version         1.6.13
 * @release         2026-02-10
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.4, Claude Sonnet 4.5
 */

import { ObjectId } from 'mongodb';

/**
 * Common Utilities - shared functions for the jPulse Framework
 *
 * This module provides utility functions that can be used across models,
 * controllers, and other components of the framework.
 */
class CommonUtils {

    // =========================================================================
    // Object Path Utilities (dot notation)
    // =========================================================================

    /**
     * Get a value from an object using dot notation path
     * @param {object} obj - Object to read from
     * @param {string} keyPath - Dot-notation path (e.g., 'data.email.adminEmail')
     * @returns {*} Value at path, or undefined if not found
     */
    static getValueByPath(obj, keyPath) {
        if (!obj || typeof obj !== 'object' || typeof keyPath !== 'string') {
            return undefined;
        }

        const keys = keyPath.split('.').filter(Boolean);
        if (keys.length === 0) {
            return undefined;
        }

        let current = obj;
        for (const key of keys) {
            if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, key)) {
                return undefined;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * Set a value in an object using dot notation path (creates intermediate objects)
     * @param {object} obj - Object to modify
     * @param {string} keyPath - Dot-notation path (e.g., 'data.email.adminEmail')
     * @param {*} value - Value to set
     * @returns {void}
     */
    static setValueByPath(obj, keyPath, value) {
        if (!obj || typeof obj !== 'object' || typeof keyPath !== 'string') {
            return;
        }

        const keys = keyPath.split('.').filter(Boolean);
        if (keys.length === 0) {
            return;
        }

        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
    }

    /**
     * Delete a value in an object using dot notation path
     * @param {object} obj - Object to modify
     * @param {string} keyPath - Dot-notation path (e.g., 'data.email.adminEmail')
     * @returns {void}
     */
    static deleteValueByPath(obj, keyPath) {
        if (!obj || typeof obj !== 'object' || typeof keyPath !== 'string') {
            return;
        }

        const keys = keyPath.split('.').filter(Boolean);
        if (keys.length === 0) {
            return;
        }

        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                return;
            }
            current = current[key];
        }

        delete current[keys[keys.length - 1]];
    }

    // =========================================================================
    // String Query Parser (W-141: Boolean Operators)
    // =========================================================================

    /**
     * String Query Parser - Parse search strings with boolean operators
     *
     * Supports:
     * - OR operator: `,` (comma) - e.g., "active,pending"
     * - AND operator: `;` (semicolon) - e.g., "admin;active"
     * - NOT operator: `!` (prefix) - e.g., "!suspended"
     * - Wildcards: `*` - e.g., "john*", "*smith", "*admin*"
     * - Regex: `/pattern/flags` - e.g., "/^BC[0-9]{4}/i"
     * - Exact match: no operators - e.g., "active"
     *
     * @class StringQueryParser
     */
    static StringQueryParser = class {
        // Token constants for protecting special chars in regex
        static COMMA_TOKEN = '\x01';
        static SEMICOLON_TOKEN = '\x02';

        /**
         * Parse a field value into MongoDB query with metadata
         * @param {string} fieldName - Field name for query
         * @param {string} value - Search value to parse
         * @returns {object} { query, useCollation, collation? }
         */
        static parse(fieldName, value) {
            if (!value || typeof value !== 'string') {
                return { query: {}, useCollation: false };
            }

            // Step 0: Protect regex patterns
            const protectedValue = this.protectRegexPatterns(value);

            // Step 1: Split by comma (OR)
            const orTerms = protectedValue
                .split(',')
                .map(s => s.trim())
                .filter(s => s);

            if (orTerms.length === 0) {
                return { query: {}, useCollation: false };
            }

            // Step 2-4: Parse each OR term
            const orQueries = orTerms.map(term =>
                this.parseAndExpression(fieldName, term)
            );

            // Combine into final query
            if (orQueries.length === 1) {
                return orQueries[0];
            }

            return {
                query: { $or: orQueries.map(q => q.query) },
                useCollation: orQueries.every(q => q.useCollation),
                collation: { locale: 'en', strength: 2 }
            };
        }

        /**
         * Parse AND expression (terms separated by semicolon)
         * @param {string} fieldName - Field name for query
         * @param {string} term - Term to parse (may contain semicolons)
         * @returns {object} { query, useCollation, collation? }
         */
        static parseAndExpression(fieldName, term) {
            // Step 2: Split by semicolon (AND)
            const andTerms = term
                .split(';')
                .map(s => s.trim())
                .filter(s => s);

            if (andTerms.length === 0) {
                return { query: {}, useCollation: false };
            }

            // Step 3-4: Parse each AND term
            const andQueries = andTerms.map(t =>
                this.parseNotExpression(fieldName, t)
            );

            if (andQueries.length === 1) {
                return andQueries[0];
            }

            return {
                query: { $and: andQueries.map(q => q.query) },
                useCollation: andQueries.every(q => q.useCollation),
                collation: { locale: 'en', strength: 2 }
            };
        }

        /**
         * Parse NOT expression (starts with !)
         * @param {string} fieldName - Field name for query
         * @param {string} term - Term to parse (may start with !)
         * @returns {object} { query, useCollation, collation? }
         */
        static parseNotExpression(fieldName, term) {
            // Step 3: Check for NOT prefix
            if (term.startsWith('!')) {
                const innerTerm = term.substring(1).trim();
                if (!innerTerm) {
                    return { query: {}, useCollation: false };
                }

                const innerQuery = this.parseLiteral(fieldName, innerTerm);
                return {
                    query: { [fieldName]: { $not: innerQuery.query[fieldName] } },
                    useCollation: innerQuery.useCollation,
                    collation: innerQuery.collation
                };
            }

            return this.parseLiteral(fieldName, term);
        }

        /**
         * Parse literal value (exact, wildcard, or regex)
         * @param {string} fieldName - Field name for query
         * @param {string} term - Term to parse
         * @returns {object} { query, useCollation, collation? }
         */
        static parseLiteral(fieldName, term) {
            // Step 4: Restore and parse literal/pattern
            const restored = this.restoreRegexPatterns(term);

            // Check explicit regex: /pattern/flags
            // Pattern: /^\s*\/.*\/[gimsuy]*\s*$/
            const regexMatch = restored.trim().match(/^\/(.+)\/([gimsuy]*)$/);
            if (regexMatch) {
                const [, pattern, flags] = regexMatch;

                // Validate regex for security
                try {
                    this.validateRegex(pattern, flags);
                    return {
                        query: { [fieldName]: { $regex: new RegExp(pattern, flags) } },
                        useCollation: false
                    };
                } catch (error) {
                    // Invalid regex - treat as literal
                    return {
                        query: { [fieldName]: restored },
                        useCollation: true,
                        collation: { locale: 'en', strength: 2 }
                    };
                }
            }

            // Check wildcards
            if (restored.includes('*')) {
                return {
                    query: { [fieldName]: this.buildWildcardRegex(restored) },
                    useCollation: false
                };
            }

            // Exact match - collation candidate
            return {
                query: { [fieldName]: restored },
                useCollation: true,
                collation: { locale: 'en', strength: 2 }
            };
        }

        /**
         * Build anchored regex from wildcard pattern
         * @param {string} value - Value with wildcards (*)
         * @returns {object} { $regex: RegExp }
         */
        static buildWildcardRegex(value) {
            let pattern = value.replace(/\*/g, '.*');

            // Anchor at boundaries (not wildcard)
            if (!value.startsWith('*')) {
                pattern = '^' + pattern;
            }
            if (!value.endsWith('*')) {
                pattern = pattern + '$';
            }

            return { $regex: new RegExp(pattern, 'i') };
        }

        /**
         * Protect commas and semicolons inside /.../ patterns
         * @param {string} value - Value to protect
         * @returns {string} Protected value
         */
        static protectRegexPatterns(value) {
            return value.replace(/\/([^/]+)\/([gimsuy]*)/g, (match, pattern, flags) => {
                const protectedPattern = pattern
                    .replace(/,/g, this.COMMA_TOKEN)
                    .replace(/;/g, this.SEMICOLON_TOKEN);
                return `/${protectedPattern}/${flags}`;
            });
        }

        /**
         * Restore protected commas and semicolons
         * @param {string} value - Value to restore
         * @returns {string} Restored value
         */
        static restoreRegexPatterns(value) {
            return value
                .replace(new RegExp(this.COMMA_TOKEN, 'g'), ',')
                .replace(new RegExp(this.SEMICOLON_TOKEN, 'g'), ';');
        }

        /**
         * Validate regex pattern for security (prevent ReDoS)
         * @param {string} pattern - Regex pattern
         * @param {string} flags - Regex flags
         * @throws {Error} If pattern is invalid or too long
         */
        static validateRegex(pattern, flags) {
            // Length limit
            if (pattern.length > 200) {
                throw new Error('Regex pattern too long (max: 200 characters)');
            }

            // Validate it compiles
            try {
                new RegExp(pattern, flags);
            } catch (e) {
                throw new Error(`Invalid regex pattern: ${e.message}`);
            }

            // Note: Could add catastrophic backtracking detection here if needed
            // For now, rely on MongoDB's regex engine being safer than JavaScript's
        }
    };

    /**
     * Create schema-based MongoDB query from URI parameters
     *
     * Converts URI query parameters into a MongoDB query object based on
     * schema field types. Supports various data types and query patterns.
     *
     * W-141: Enhanced to return metadata for collation optimization.
     * Can return either plain query (backward compatible) or enhanced format:
     * { query: {...}, useCollation: bool, collation: {...} }
     *
     * @param {object} schema - Schema definition for field types
     * @param {object} queryParams - URI query parameters
     * @param {array} ignoreFields - Fields to ignore in query building (default: [])
     * @returns {object} Enhanced query object with metadata
     *
     * @example
     * const schema = {
     *   name: { type: 'string' },
     *   age: { type: 'number' },
     *   active: { type: 'boolean' },
     *   createdAt: { type: 'date' },
     *   status: { type: 'string', enum: ['active', 'inactive'] }
     * };
     *
     * const params = { name: 'john*', age: '25', active: 'true' };
     * const result = CommonUtils.schemaBasedQuery(schema, params);
     * // Returns enhanced format:
     * // {
     * //   query: { name: { $regex: ... }, age: 25, active: true },
     * //   useCollation: false
     * // }
     */
    static schemaBasedQuery(schema, queryParams, ignoreFieldsOrOptions = []) {
        // W-141: Parse options (backward compatible)
        let ignoreFields = [];
        let options = {};

        if (Array.isArray(ignoreFieldsOrOptions)) {
            // Old style: array of field names to ignore
            ignoreFields = ignoreFieldsOrOptions;
        } else if (ignoreFieldsOrOptions && typeof ignoreFieldsOrOptions === 'object') {
            // New style: options object
            ignoreFields = ignoreFieldsOrOptions.ignoreFields || [];
            options = ignoreFieldsOrOptions;
        }

        const fieldQueries = []; // Collect: { query, useCollation, collation? }

        // Handle null/undefined queryParams
        if (!queryParams || typeof queryParams !== 'object') {
            return {
                query: {},
                useCollation: false
            };
        }

        for (const [key, value] of Object.entries(queryParams)) {
            // Skip empty values and ignored fields
            if (ignoreFields.includes(key) || !value || (typeof value === 'string' && value.trim() === '')) continue;

            // Get field schema information
            const fieldSchema = CommonUtils.getFieldSchema(schema, key);
            if (!fieldSchema) continue;

            // Build query based on field type
            if (fieldSchema.type === 'date') {
                const dateQuery = CommonUtils.buildDateQuery(value);
                if (dateQuery !== null) {
                    fieldQueries.push({
                        query: { [key]: dateQuery },
                        useCollation: false
                    });
                }
            } else if (fieldSchema.type === 'array') {
                // Handle array fields (like roles)
                let arrayValues;
                if (typeof value === 'string' && value.includes(',')) {
                    // Handle comma-separated values like "admin,user"
                    arrayValues = value.split(',').map(v => v.trim()).filter(v => v);
                } else {
                    // Single value
                    arrayValues = [String(value).trim()];
                }

                if (fieldSchema.enum) {
                    // For enum arrays, filter valid values and check if array contains any of them
                    const validValues = arrayValues.filter(v => fieldSchema.enum.includes(v));
                    if (validValues.length > 0) {
                        fieldQueries.push({
                            query: { [key]: { $in: validValues } },
                            useCollation: false
                        });
                    }
                } else {
                    // For non-enum arrays, check if array contains any of the values
                    fieldQueries.push({
                        query: { [key]: { $in: arrayValues } },
                        useCollation: false
                    });
                }
            } else if (fieldSchema.enum) {
                // Handle enum fields (before string type check)
                if (fieldSchema.enum.includes(value)) {
                    fieldQueries.push({
                        query: { [key]: value },
                        useCollation: true,
                        collation: { locale: 'en', strength: 2 }
                    });
                } else {
                    // Skip invalid enum values
                    continue;
                }
            } else if (fieldSchema.type === 'string') {
                // W-141: Use new StringQueryParser
                const stringValue = String(value);
                const parsed = CommonUtils.StringQueryParser.parse(key, stringValue);
                if (parsed.query && Object.keys(parsed.query).length > 0) {
                    fieldQueries.push(parsed);
                }
            } else if (fieldSchema.type === 'number') {
                const num = parseFloat(value);
                if (!isNaN(num) && isFinite(num)) {
                    fieldQueries.push({
                        query: { [key]: num },
                        useCollation: false
                    });
                }
            } else if (fieldSchema.type === 'boolean') {
                fieldQueries.push({
                    query: { [key]: value.toLowerCase() === 'true' },
                    useCollation: false
                });
            } else {
                // Default to exact match for unknown types
                fieldQueries.push({
                    query: { [key]: value },
                    useCollation: false
                });
            }
        }

        // W-141: Handle multiFieldSearch option
        if (options.multiFieldSearch) {
            for (const [paramName, fieldNames] of Object.entries(options.multiFieldSearch)) {
                if (queryParams[paramName]?.trim && queryParams[paramName].trim()) {
                    const multiFieldQuery = CommonUtils._buildMultiFieldOr(
                        paramName,
                        queryParams[paramName].trim(),
                        fieldNames
                    );

                    if (multiFieldQuery) {
                        fieldQueries.push(multiFieldQuery);
                    }
                }
            }
        }

        // Merge all field queries
        if (fieldQueries.length === 0) {
            return {
                query: {},
                useCollation: false
            };
        }

        // W-141: Use new merge logic to handle multiple $or conditions
        return CommonUtils._mergeFieldQueries(fieldQueries);
    }

    /**
     * Build multi-field $or query from parsed search value
     * W-141: Helper for multiFieldSearch option
     * @private
     *
     * @param {string} paramName - Parameter name (e.g., 'name')
     * @param {string} searchValue - Search value from queryParams
     * @param {string[]} fieldNames - Array of field names to search
     * @returns {object} Query fragment with $or condition
     *
     * @example
     * _buildMultiFieldOr('name', 'john', ['profile.firstName', 'profile.lastName', 'username'])
     * // Returns: { query: { $or: [{ 'profile.firstName': 'john' }, ...] }, useCollation: true }
     */
    static _buildMultiFieldOr(paramName, searchValue, fieldNames) {
        const parsed = CommonUtils.StringQueryParser.parse(paramName, searchValue);

        if (parsed.query[paramName]) {
            // Simple match: create $or for all fields
            const nameQuery = parsed.query[paramName];
            return {
                query: {
                    $or: fieldNames.map(field => ({ [field]: nameQuery }))
                },
                useCollation: false // Can't use collation with $or across multiple fields
            };
        } else if (parsed.query.$or) {
            // OR operator in search: expand each term to all fields
            const conditions = [];
            parsed.query.$or.forEach(term => {
                fieldNames.forEach(field => {
                    conditions.push({ [field]: term[paramName] });
                });
            });
            return {
                query: { $or: conditions },
                useCollation: false
            };
        } else if (parsed.query.$and) {
            // AND operator in search: each AND term needs to match at least one field
            const andGroups = parsed.query.$and.map(term => {
                if (term[paramName]) {
                    return {
                        $or: fieldNames.map(field => ({ [field]: term[paramName] }))
                    };
                }
                return term;
            });
            return {
                query: { $and: andGroups },
                useCollation: false
            };
        }

        return null;
    }

    /**
     * Merge multiple field queries, handling multiple $or conditions properly
     * W-141: Helper for schemaBasedQuery
     * @private
     *
     * @param {array} fieldQueries - Array of { query, useCollation } objects
     * @returns {object} Merged query with metadata
     *
     * @example
     * _mergeFieldQueries([
     *   { query: { status: 'active' }, useCollation: true },
     *   { query: { $or: [...] }, useCollation: false }
     * ])
     */
    static _mergeFieldQueries(fieldQueries) {
        if (fieldQueries.length === 0) {
            return {
                query: {},
                useCollation: false
            };
        }

        const orGroups = [];
        const andConditions = {};
        let allUseCollation = true;

        for (const fq of fieldQueries) {
            if (fq.query.$or) {
                // Collect $or groups separately
                orGroups.push(fq.query.$or);
            } else if (fq.query.$and) {
                // Collect $and groups separately
                orGroups.push({ $and: fq.query.$and });
            } else {
                // Simple field conditions
                Object.assign(andConditions, fq.query);
            }
            if (!fq.useCollation) allUseCollation = false;
        }

        let finalQuery = { ...andConditions };

        if (orGroups.length === 1 && !orGroups[0].$and) {
            // Single $or group - add directly
            finalQuery.$or = orGroups[0];
        } else if (orGroups.length > 1 || (orGroups.length === 1 && orGroups[0].$and)) {
            // Multiple $or groups or has $and - combine with $and
            const conditions = [];

            // Add simple conditions as individual $and terms
            Object.keys(andConditions).forEach(key => {
                conditions.push({ [key]: andConditions[key] });
            });

            // Add each $or group wrapped
            orGroups.forEach(or => {
                if (or.$and) {
                    conditions.push(or);
                } else {
                    conditions.push({ $or: or });
                }
            });

            finalQuery = conditions.length > 1 ? { $and: conditions } : conditions[0] || {};
        }

        return {
            query: finalQuery,
            useCollation: allUseCollation,
            collation: allUseCollation ? { locale: 'en', strength: 2 } : undefined
        };
    }

    /**
     * Get field schema from nested schema definition
     *
     * Traverses a nested schema object using dot notation to find
     * the schema definition for a specific field path.
     *
     * @param {object} schema - Schema definition
     * @param {string} fieldPath - Dot-notation field path (e.g., 'data.email.adminEmail')
     * @returns {object|null} Field schema or null if not found
     *
     * @example
     * const schema = {
     *   data: {
     *     email: {
     *       adminEmail: { type: 'string', validate: 'email' }
     *     }
     *   }
     * };
     *
     * const fieldSchema = CommonUtils.getFieldSchema(schema, 'data.email.adminEmail');
     * // Returns: { type: 'string', validate: 'email' }
     */
    static getFieldSchema(schema, fieldPath) {
        const parts = fieldPath.split('.');
        let current = schema;

        for (const part of parts) {
            if (current && typeof current === 'object' && current[part]) {
                current = current[part];
            } else {
                return null;
            }
        }

        // Return the schema if it has a type property, null otherwise
        return current && current.type ? current : null;
    }

    /**
     * Build MongoDB date query from string value
     *
     * Converts various date string formats into MongoDB date range queries.
     * Supports year, year-month, and full date formats.
     *
     * @param {string} value - Date string in various formats
     * @returns {object|null} MongoDB date query or null if invalid
     *
     * @example
     * CommonUtils.buildDateQuery('2025');        // Year range
     * CommonUtils.buildDateQuery('2025-08');     // Month range
     * CommonUtils.buildDateQuery('2025-08-24');  // Day range
     */
    static buildDateQuery(value) {
        // Handle different date formats
        if (/^\d{4}$/.test(value)) {
            // Year only: 2025
            const year = parseInt(value);
            return {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            };
        } else if (/^\d{4}-\d{2}$/.test(value)) {
            // Year-Month: 2025-08
            const [year, month] = value.split('-').map(Number);
            return {
                $gte: new Date(year, month - 1, 1),
                $lt: new Date(year, month, 1)
            };
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            // Full date: 2025-08-24
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return null;
            }
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            return {
                $gte: date,
                $lt: nextDay
            };
        } else {
            // Try to parse as full date/time
            const date = new Date(value);
            if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 3000) {
                return date;
            }
        }

        return null;
    }

    /**
     * Deep merge objects
     *
     * Recursively merges multiple objects, with later objects taking precedence.
     * Arrays are replaced, not merged.
     *
     * @param {...object} objects - Objects to merge
     * @returns {object} Merged object
     *
     * @example
     * const base = { a: 1, b: { x: 1, y: 2 } };
     * const override = { b: { y: 3, z: 4 }, c: 5 };
     * const result = CommonUtils.deepMerge(base, override);
     * // Returns: { a: 1, b: { x: 1, y: 3, z: 4 }, c: 5 }
     */
    static deepMerge(...objects) {
        if (objects.length === 0) return {};
        if (objects.length === 1) return objects[0];

        return CommonUtils._deepMergeRecursive({}, objects, new WeakSet());
    }

    /**
     * Internal recursive deep merge with circular reference protection
     * @private
     */
    static _deepMergeRecursive(target, objects, seen) {
        for (const obj of objects) {
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                // Check for circular references
                if (seen.has(obj)) continue;
                seen.add(obj);

                for (const [key, value] of Object.entries(obj)) {
                    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                        // Recursively merge nested objects (but not Dates)
                        target[key] = CommonUtils._deepMergeRecursive(target[key] || {}, [value], seen);
                    } else {
                        // Replace primitive values, arrays, and Date objects
                        target[key] = value;
                    }
                }

                seen.delete(obj);
            }
        }

        return target;
    }

    /**
     * Sanitize an object by applying path patterns to a deep clone; sensitive leaves are obfuscated or removed.
     * Used for config/API responses so sensitive fields (e.g. smtpPass, license.key) are not exposed.
     * Path patterns use dot notation; the last segment may be a wildcard: prefix* (e.g. smtp*), *suffix (e.g. *pass), or exact key.
     *
     * @param {object} obj - Plain object to sanitize (not mutated)
     * @param {string[]} pathPatterns - Dot-notation paths, e.g. ['data.email.smtp*', 'data.email.*pass', 'data.manifest.license.key']
     * @param {object} options - Optional settings
     * @param {string} [options.mode='obfuscate'] - 'obfuscate' = set matched leaves to placeholder; 'remove' = delete matched keys
     * @param {string} [options.placeholder='********'] - Value to set when mode is 'obfuscate'
     * @returns {object} Deep clone of obj with patterns applied (original unchanged)
     */
    static sanitizeObject(obj, pathPatterns, options = {}) {
        if (obj == null || typeof obj !== 'object') {
            return obj;
        }
        if (!Array.isArray(pathPatterns) || pathPatterns.length === 0) {
            return JSON.parse(JSON.stringify(obj));
        }
        const mode = options.mode === 'remove' ? 'remove' : 'obfuscate';
        const placeholder = options.placeholder !== undefined ? options.placeholder : '********';
        const clone = JSON.parse(JSON.stringify(obj));
        for (const pattern of pathPatterns) {
            if (typeof pattern !== 'string' || !pattern.trim()) continue;
            this._sanitizeObjectApplyPath(clone, pattern.trim(), mode, placeholder);
        }
        return clone;
    }

    /**
     * Apply a single path pattern to obj (mutates obj). Dot notation; last segment may be prefix*, *suffix, or exact.
     * @param {object} obj - Object to mutate (clone)
     * @param {string} pattern - Path pattern
     * @param {string} mode - 'obfuscate' | 'remove'
     * @param {string} placeholder - Value when obfuscate
     * @private
     */
    static _sanitizeObjectApplyPath(obj, pattern, mode, placeholder) {
        const parts = pattern.split('.');
        const lastPart = parts[parts.length - 1];
        const prefixParts = parts.slice(0, -1);

        let current = obj;
        for (let i = 0; i < prefixParts.length; i++) {
            const part = prefixParts[i];
            if (current == null || typeof current !== 'object') return;
            if (!(part in current)) return;
            current = current[part];
        }
        if (current == null || typeof current !== 'object') return;

        if (lastPart.includes('*')) {
            if (lastPart.startsWith('*')) {
                const suffix = lastPart.replace(/^\*/, '');
                const suffixLower = suffix.toLowerCase();
                for (const key of Object.keys(current)) {
                    if (key.toLowerCase().endsWith(suffixLower)) {
                        if (mode === 'remove') delete current[key];
                        else current[key] = placeholder;
                    }
                }
            } else if (lastPart.endsWith('*')) {
                const prefix = lastPart.replace(/\*$/, '');
                const prefixLower = prefix.toLowerCase();
                for (const key of Object.keys(current)) {
                    if (key.toLowerCase().startsWith(prefixLower)) {
                        if (mode === 'remove') delete current[key];
                        else current[key] = placeholder;
                    }
                }
            }
        } else {
            if (lastPart in current) {
                if (mode === 'remove') delete current[lastPart];
                else current[lastPart] = placeholder;
            }
        }
    }

    /**
     * Normalize an object for safe use in Handlebars context
     *
     * Recursively traverses deep object structures and converts non-serializable
     * or problematic values to Handlebars-safe types:
     * - Date → .valueOf() (unix timestamp in milliseconds)
     * - null → '' (empty string)
     * - undefined → '' (empty string)
     * - NaN → 0
     * - Infinity/-Infinity → Number.MAX_SAFE_INTEGER/MIN_SAFE_INTEGER
     * - Symbol → .description or ''
     * - BigInt → Number (may lose precision for very large values)
     * - RegExp → string representation
     * - Error → error message string
     * - Function → '' (functions not serializable)
     * - ObjectId → string (MongoDB ObjectId)
     *
     * @param {any} obj - Object or value to normalize
     * @returns {any} Normalized object/value safe for Handlebars templates
     *
     * @example
     * const obj = {
     *   date: new Date('2025-01-01'),
     *   nullValue: null,
     *   nested: { enabledAt: new Date() }
     * };
     * const normalized = CommonUtils.normalizeForContext(obj);
     * // Returns: { date: 1735689600000, nullValue: '', nested: { enabledAt: 1735689600000 } }
     */
    static normalizeForContext(obj) {
        // Handle null
        if (obj === null) {
            return '';
        }

        // Handle undefined
        if (obj === undefined) {
            return '';
        }

        // Handle Arrays - recursively normalize each element
        if (Array.isArray(obj)) {
            return obj.map(item => CommonUtils.normalizeForContext(item));
        }

        // Handle Objects - iterate properties and recursively normalize
        if (obj && typeof obj === 'object') {
            // Handle special object types that shouldn't be iterated
            if (obj instanceof Date) {
                return obj.valueOf();
            }

            if (obj instanceof RegExp) {
                return obj.toString();
            }

            if (obj instanceof Error) {
                return obj.message || obj.toString();
            }

            if (obj instanceof ObjectId) {
                return obj.toString();
            }

            // Regular object - iterate properties and recursively normalize
            const normalized = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    // Skip functions and symbols as keys
                    if (typeof key === 'symbol') {
                        continue;
                    }
                    // Recursively normalize each property value
                    normalized[key] = CommonUtils.normalizeForContext(obj[key]);
                }
            }
            return normalized;
        }

        // Handle Functions - skip (functions not serializable in Handlebars)
        if (typeof obj === 'function') {
            return '';
        }

        // Handle Symbol - convert to description or empty string
        if (typeof obj === 'symbol') {
            return obj.description || '';
        }

        // Handle BigInt - convert to number (may lose precision for very large values)
        if (typeof obj === 'bigint') {
            return Number(obj);
        }

        // Handle NaN numbers
        if (typeof obj === 'number' && isNaN(obj)) {
            return 0;
        }

        // Handle Infinity/-Infinity
        if (typeof obj === 'number' && !isFinite(obj)) {
            return obj === Infinity ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
        }

        // Primitive values (string, number, boolean) - return as-is
        return obj;
    }

    /**
     * Format value for console/log output
     *
     * Converts various data types into readable string format for logging.
     * Handles objects, arrays, dates, and other complex types.
     *
     * @param {*} value - Value to format
     * @returns {string} Formatted string representation
     *
     * @example
     * CommonUtils.formatValue({ name: 'test' });  // Returns: '{"name":"test"}'
     * CommonUtils.formatValue(new Date());        // Returns: '2025-08-24T23:21:00.000Z'
     * CommonUtils.formatValue([1, 2, 3]);         // Returns: '[1,2,3]'
     */
    static formatValue(value) {
        if (value === null || value === undefined) {
            return String(value);
        }

        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        return String(value);
    }

    /**
     * Generate a UUID v4
     *
     * @param {string} prefix - Optional prefix for the ID (default: '')
     * @returns {string} Unique identifier
     */
    static generateUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
        });
    }

    /**
     * Validate email format
     *
     * Simple email validation using regex pattern.
     *
     * @param {string} email - Email address to validate
     * @returns {boolean} True if valid email format
     *
     * @example
     * CommonUtils.isValidEmail('test@example.com');  // Returns: true
     * CommonUtils.isValidEmail('invalid-email');     // Returns: false
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Sanitize string for safe usage
     *
     * Removes potentially dangerous characters from strings.
     * Useful for preventing injection attacks.
     *
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     *
     * @example
     * CommonUtils.sanitizeString('<script>alert("xss")</script>');
     * // Returns: 'scriptalert("xss")/script'
     */
    static sanitizeString(str) {
        if (typeof str !== 'string') return '';

        return str
            .replace(/[<>]/g, '')           // Remove angle brackets
            .replace(/['"]/g, '')           // Remove quotes
            .replace(/[;&|`]/g, '')         // Remove command injection chars
            .trim();
    }

    /**
     * Convert string to URL-friendly slug (lowercase, hyphens, alphanumeric only).
     * Uses two-step algorithm: preserve punctuation as word separators, then convert to hyphens.
     *
     * Used internally by RedisManager for namespace prefixes (siteId:mode:key).
     * Also used by HandlebarController's string.slugify helper.
     *
     * @param {string} str - String to slugify
     * @returns {string} URL-friendly slug (lowercase, hyphens, alphanumeric only)
     *
     * @example
     * CommonUtils.slugifyString('Hello World');
     * // Returns: 'hello-world'
     *
     * CommonUtils.slugifyString('Foo:Bar');
     * // Returns: 'foo-bar'
     *
     * CommonUtils.slugifyString('How to: Install');
     * // Returns: 'how-to-install'
     *
     * CommonUtils.slugifyString('Café');
     * // Returns: 'cafe'
     *
     * CommonUtils.slugifyString('My Site!');
     * // Returns: 'my-site'
     *
     * CommonUtils.slugifyString('hello  -  world');
     * // Returns: 'hello-world'
     *
     * CommonUtils.slugifyString(' hello ');
     * // Returns: 'hello'
     *
     * CommonUtils.slugifyString('');
     * // Returns: ''
     */
    static slugifyString(str) {
        if (typeof str !== 'string' || !str) return '';

        return str
            .toLowerCase()
            .normalize('NFD')  // Decompose accents (e.g., é → e + combining accent)
            .replace(/[\u0300-\u036f]/g, '')    // Remove diacritics (combining accent marks)
            .replace(/[^a-z0-9\.,:;@\(\)\s-]/g, '') // Remove non-alphanumeric except some special chars
            .replace(/[\.,:;@\(\)\s]+/g, '-')       // Replace some special chars with hyphens
            .replace(/-+/g, '-')     // Collapse multiple consecutive hyphens into one
            .replace(/^-|-$/g, '');  // Trim hyphens from start and end
    }

    /**
     * Sanitize HTML content by allowing only safe tags and attributes.
     * Prevents XSS attacks while preserving basic formatting.
     *
     * Configuration defaults from app.conf: utils.common.sanitizeHtml
     *
     * @param {string} html - HTML string to sanitize
     * @param {object} options - Sanitization options (overrides config defaults)
     * @param {string[]} options.allowedTags - Array of allowed tag names
     * @param {object} options.allowedAttributes - Object mapping tag names to allowed attributes
     * @returns {string} Sanitized HTML string
     *
     * @example
     * CommonUtils.sanitizeHtml('<p>Hello <script>alert("xss")</script></p>');
     * // Returns: '<p>Hello </p>'
     *
     * CommonUtils.sanitizeHtml('<a href="http://evil.com" onclick="steal()">Link</a>');
     * // Returns: '<a href="http://evil.com">Link</a>'
     */
    static sanitizeHtml(html, options = {}) {
        if (typeof html !== 'string') return '';

        // Get defaults from config (app.conf: utils.common.sanitizeHtml)
        const configDefaults = global.appConfig?.utils?.common?.sanitizeHtml || {};

        const allowedTags = options.allowedTags || configDefaults.allowedTags || [
            'p', 'br', 'strong', 'em', 'b', 'i', 'u',
            'ul', 'ol', 'li',
            'a', 'code', 'pre',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'blockquote', 'hr'
        ];

        const allowedAttributes = options.allowedAttributes || configDefaults.allowedAttributes || {
            'a': ['href', 'title', 'target'],
            'img': ['src', 'alt', 'title']
        };

        // Step 1: Remove all HTML comments (can hide malicious code)
        html = html.replace(/<!--[\s\S]*?-->/g, '');

        // Step 2: Remove all script and style tags with content
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        // Step 3: Remove all event handler attributes (onclick, onerror, etc.)
        html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
        html = html.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

        // Step 4: Remove javascript: protocol from href/src
        html = html.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
        html = html.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');

        // Step 5: Remove data: protocol (can contain base64 encoded javascript)
        html = html.replace(/href\s*=\s*["']data:[^"']*["']/gi, 'href="#"');
        html = html.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');

        // Step 6: Parse and rebuild with only allowed tags and attributes
        const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
        html = html.replace(tagPattern, (match, tagName) => {
            tagName = tagName.toLowerCase();

            // If tag is not allowed, remove it entirely
            if (!allowedTags.includes(tagName)) {
                return '';
            }

            // If it's a closing tag, allow it
            if (match.startsWith('</')) {
                return `</${tagName}>`;
            }

            // For opening tags, filter attributes
            const allowedAttrs = allowedAttributes[tagName] || [];
            if (allowedAttrs.length === 0) {
                // Self-closing tag or tag with no allowed attributes
                return match.endsWith('/>') ? `<${tagName}/>` : `<${tagName}>`;
            }

            // Extract and filter attributes
            const attrPattern = /(\w+)\s*=\s*["']([^"']*)["']/g;
            let filteredAttrs = '';
            let attrMatch;

            while ((attrMatch = attrPattern.exec(match)) !== null) {
                const attrName = attrMatch[1].toLowerCase();
                const attrValue = attrMatch[2];

                if (allowedAttrs.includes(attrName)) {
                    // Additional validation for href/src
                    if ((attrName === 'href' || attrName === 'src') &&
                        (attrValue.toLowerCase().startsWith('javascript:') ||
                         attrValue.toLowerCase().startsWith('data:'))) {
                        continue; // Skip dangerous URLs
                    }
                    filteredAttrs += ` ${attrName}="${attrValue}"`;
                }
            }

            return match.endsWith('/>') ? `<${tagName}${filteredAttrs}/>` : `<${tagName}${filteredAttrs}>`;
        });

        return html.trim();
    }

    /**
     * Send error response with appropriate format based on request type
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {number} statusCode - HTTP status code (404, 500, etc.)
     * @param {string} message - Error message for user
     * @param {string} code - Application error code (NOT_FOUND, INVALID_CREDENTIALS, etc.)
     * @param {string} details - Optional detailed error information for debugging
     *
     * @example
     * // For API requests: returns JSON with success: false
     * CommonUtils.sendError(req, res, 404, 'User not found', 'USER_NOT_FOUND');
     * // Returns: {"success": false, "error": "User not found", "code": "USER_NOT_FOUND", "path": "/api/1/user/123"}
     *
     * // With details for debugging
     * CommonUtils.sendError(req, res, 500, 'Validation failed', 'VALIDATION_ERROR', error.message);
     * // Returns: {"success": false, "error": "Validation failed", "code": "VALIDATION_ERROR", "details": "...", "path": "/api/1/user"}
     *
     * // For view requests: redirects to error page
     * CommonUtils.sendError(req, res, 404, 'Page not found');
     * // Redirects to: /error/index.shtml?msg=Page%20not%20found&code=404
     */
    static sendError(req, res, statusCode, message, code = null, details = null) {
        if (req.originalUrl.startsWith('/api/')) {
            // API requests get JSON error response
            const response = {
                success: false,
                error: message,
                path: req.originalUrl
            };
            if (code) {
                response.code = code;
            }
            if (details) {
                response.details = details;
            }
            return res.status(statusCode).json(response);
        } else {
            // View requests get redirected to error page
            const errorMessage = encodeURIComponent(message);
            return res.redirect(`/error/index.shtml?msg=${errorMessage}&code=${statusCode}`);
        }
    }

    /**
     * Extract context information for logging (username, IP, VM, ID)
     * Accepts Express req or a plain context object { username?, ip? } (e.g. from WebSocket).
     * @param {object} reqOrContext - Express request object, or plain { username?, ip? }; optional
     * @returns {object} Context object with username, ip, vm, id
     */
    static getLogContext(reqOrContext = null) {
        const context = {
            username: '(guest)',
            ip: '0.0.0.0',
            vm: global.appConfig?.system?.serverId || 0,
            id: global.appConfig?.system?.pm2Id || 0
        };

        if (reqOrContext == null) {
            return context;
        }

        // Plain context object (e.g. from WebSocket): has username or ip, no Express shape
        const looksLikeRequest = typeof reqOrContext === 'object' &&
            (Object.prototype.hasOwnProperty.call(reqOrContext, 'session') ||
                Object.prototype.hasOwnProperty.call(reqOrContext, 'headers'));
        if (!looksLikeRequest && typeof reqOrContext === 'object') {
            if (reqOrContext.username != null && reqOrContext.username !== '') {
                context.username = String(reqOrContext.username);
            }
            if (reqOrContext.ip != null && reqOrContext.ip !== '') {
                context.ip = String(reqOrContext.ip);
                if (context.ip.startsWith('::ffff:')) {
                    context.ip = context.ip.substring(7);
                }
            }
            return context;
        }

        const req = reqOrContext;

        // Extract username from session
        if (req?.session?.user?.username) {
            context.username = req.session.user.username;
        }

        // Extract IP address from request
        // Priority: X-Forwarded-For (first IP), X-Real-IP, req.ip, connection remoteAddress
        // This handles proxy scenarios (nginx, load balancers) where real IP is in headers
        if (req.headers?.['x-forwarded-for']) {
            // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
            // The first one is the original client IP
            context.ip = req.headers['x-forwarded-for'].split(',')[0].trim();
        } else if (req.headers?.['x-real-ip']) {
            context.ip = req.headers['x-real-ip'].trim();
        } else if (req.ip) {
            context.ip = req.ip;
        } else if (req.connection?.remoteAddress) {
            context.ip = req.connection.remoteAddress;
        } else if (req.socket?.remoteAddress) {
            context.ip = req.socket.remoteAddress;
        } else {
            context.ip = '0.0.0.0';
        }

        // Clean up IPv6 mapped IPv4 addresses (::ffff:127.0.0.1 -> 127.0.0.1)
        if (context.ip.startsWith('::ffff:')) {
            context.ip = context.ip.substring(7);
        }

        return context;
    }

    /**
     * Format timestamp for logging
     * @returns {string} Formatted local timezone timestamp (YYYY-MM-DD HH:MM:SS)
     */
    static formatTimestamp(omitSeconds = false) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = omitSeconds ? '' : String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}${seconds ? `:${seconds}` : ''}`;
    }

    /**
     * Format uptime in human-readable format
     * @param {number} seconds - Uptime in seconds
     * @param {number} maxLevels - Maximum number of time units to show (default: 2)
     * @returns {string} Formatted uptime string (e.g., "2mo 4d", "1h 30m", "45s")
     *
     * @example
     * CommonUtils.formatUptime(473346);     // Returns: "5d 11h"
     * CommonUtils.formatUptime(473346, 3);  // Returns: "5d 11h 29m"
     * CommonUtils.formatUptime(3600);       // Returns: "1h 0m"
     * CommonUtils.formatUptime(45);         // Returns: "45s"
     */
    static formatUptime(seconds, maxLevels = 2) {
        if(typeof seconds !== 'number') {
            seconds = Number(seconds) || 0;
        }
        const years = Math.floor(seconds / 31536000);
        const months = Math.floor((seconds % 31536000) / 2592000);
        const days = Math.floor((seconds % 2592000) / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts = [];
        let levels = 0;

        if (years > 0 && levels < maxLevels) {
            parts.push(`${years}y`);
            levels++;
            if (months > 0 && levels < maxLevels) {
                parts.push(`${months}mo`);
                levels++;
            }
        } else if (months > 0 && levels < maxLevels) {
            parts.push(`${months}mo`);
            levels++;
            if (days > 0 && levels < maxLevels) {
                parts.push(`${days}d`);
                levels++;
            }
        } else if (days > 0 && levels < maxLevels) {
            parts.push(`${days}d`);
            levels++;
            if (hours > 0 && levels < maxLevels) {
                parts.push(`${hours}h`);
                levels++;
            }
        } else if (hours > 0 && levels < maxLevels) {
            parts.push(`${hours}h`);
            levels++;
            if (minutes > 0 && levels < maxLevels) {
                parts.push(`${minutes}m`);
                levels++;
            }
        } else if (minutes > 0 && levels < maxLevels) {
            parts.push(`${minutes}m`);
            levels++;
            if (secs > 0 && levels < maxLevels) {
                parts.push(`${secs}s`);
                levels++;
            }
        } else if (secs > 0 || parts.length === 0) {
            parts.push(`${secs}s`);
        }

        return parts.join(' ');
    }

    /**
     * Format log message with timestamp and context in TSV format
     * @param {string} scope - Functional scope (required)
     * @param {string} message - Log message (required)
     * @param {string} level - Log level: 'info' (default), 'warning', 'ERROR'
     * @param {object} reqOrContext - Express request or plain { username?, ip? } (optional)
     * @returns {string} Formatted log message in TSV format:
     *                   "-\t<timestamp>\t<level>\t<username>\t<ip>\t<vm>\t<id>\t<scope>\t<message>"
     */
    static formatLogMessage(scope, message, level = 'info', reqOrContext = null) {
        const timestamp = CommonUtils.formatTimestamp();
        const context = CommonUtils.getLogContext(reqOrContext);
        return `-\t${timestamp}\t${level}\t${context.username}\tip:${context.ip}\tvm:${context.vm}\tid:${context.id}\t${scope}\t${message}`;
    }

    // =========================================================================
    // Pagination Utilities (W-080)
    // =========================================================================

    /**
     * Execute paginated search on a MongoDB collection
     * Supports both cursor-based (default) and offset-based pagination
     *
     * @param {Collection} collection - MongoDB collection (passed by model)
     * @param {object} query - MongoDB query object (already built by model)
     * @param {object} queryParams - Original URI parameters (for limit, sort, cursor, offset)
     * @param {object} options - Additional options (projection, etc.)
     * @returns {Promise<object>} Standardized search results with pagination metadata
     *
     * @example
     * // Called from model - model passes its own collection
     * const collection = UserModel.getCollection();
     * const query = { status: 'active' };
     * return CommonUtils.paginatedSearch(collection, query, req.query, { projection: { password: 0 } });
     */
    static async paginatedSearch(collection, query, queryParams = {}, options = {}) {
        // W-141: Auto-detect if query is enhanced object with metadata
        let actualQuery = query;
        let enhancedOptions = { ...options };

        if (query && typeof query === 'object' && query.query && query.useCollation !== undefined) {
            // Enhanced format detected: { query, useCollation, collation }
            actualQuery = query.query;
            if (query.useCollation && !enhancedOptions.collation) {
                // Apply collation if not already specified in options
                enhancedOptions.collation = query.collation;
            }
        }

        // Determine mode: offset if 'offset' param present, else cursor (default)
        const isOffsetMode = queryParams.offset !== undefined;

        // Parse common params
        const limit = Math.min(parseInt(queryParams.limit) || 50, 1000);
        const sort = CommonUtils._normalizePaginationSort(queryParams.sort);

        if (isOffsetMode) {
            return CommonUtils._paginatedOffsetSearch(collection, actualQuery, limit, sort, queryParams, enhancedOptions);
        } else {
            return CommonUtils._paginatedCursorSearch(collection, actualQuery, limit, sort, queryParams, enhancedOptions);
        }
    }

    /**
     * Internal: Execute offset-based paginated search
     * @private
     */
    static async _paginatedOffsetSearch(collection, query, limit, sort, queryParams, options) {
        const offset = parseInt(queryParams.offset) || 0;

        // Build find options
        const findOptions = { ...options };
        if (options.projection) {
            findOptions.projection = options.projection;
        }
        // W-141: Add collation if provided
        if (options.collation) {
            findOptions.collation = options.collation;
        }

        // Execute query with skip/limit
        const results = await collection.find(query, findOptions)
            .sort(sort)
            .skip(offset)
            .limit(limit)
            .toArray();

        // Get total count (also needs collation for consistency)
        const countOptions = options.collation ? { collation: options.collation } : {};
        const total = await collection.countDocuments(query, countOptions);

        return {
            success: true,
            data: results,
            count: results.length,
            pagination: {
                mode: 'offset',
                total,
                limit,
                offset,
                hasMore: offset + results.length < total
            }
        };
    }

    /**
     * Internal: Execute cursor-based paginated search
     * @private
     */
    static async _paginatedCursorSearch(collection, query, limit, sort, queryParams, options) {
        let cursorData = null;
        let total = null;
        let effectiveQuery = { ...query };
        let effectiveSort = sort;
        let originalQuery = query; // Store for countDocuments

        // Decode cursor if provided (and not just 'true' for first page)
        if (queryParams.cursor && queryParams.cursor !== 'true') {
            cursorData = CommonUtils._decodePaginationCursor(queryParams.cursor);
            if (cursorData) {
                // Use cached total from cursor
                total = cursorData.t;
                // Use sort from cursor for consistency
                effectiveSort = cursorData.s;
                // Use original query from cursor (not the empty query from current request)
                originalQuery = cursorData.q || {};
                // Build range query from lastValues
                const rangeQuery = CommonUtils._buildPaginationCursorRangeQuery(
                    cursorData.s, cursorData.lv, cursorData.d || 1
                );
                // Merge range query with original query from cursor
                if (rangeQuery.$or) {
                    // W-141 fix: Properly merge originalQuery with rangeQuery
                    // If originalQuery has $or or $and, we need to wrap it carefully
                    if (originalQuery.$or || originalQuery.$and) {
                        effectiveQuery = { $and: [originalQuery, rangeQuery] };
                    } else {
                        // Simple originalQuery - merge the $or conditions with AND
                        effectiveQuery = { $and: [originalQuery, rangeQuery] };
                    }
                } else {
                    effectiveQuery = { ...originalQuery, ...rangeQuery };
                }
            }
        }

        // First page: run countDocuments (with collation if provided)
        // W-141: Don't use collation on cursor queries as originalQuery may not support it
        if (total === null) {
            const countOptions = options.collation ? { collation: options.collation } : {};
            total = await collection.countDocuments(originalQuery, countOptions);
        }

        // Build find options
        const findOptions = { ...options };
        if (options.projection) {
            findOptions.projection = options.projection;
        }
        // W-141: Don't apply collation to cursor queries
        // The originalQuery from cursor may have complex date/regex conditions that don't support collation
        if (!cursorData && options.collation) {
            // Only apply collation on first page
            findOptions.collation = options.collation;
        }

        // Fetch limit + 1 for hasMore detection
        const results = await collection.find(effectiveQuery, findOptions)
            .sort(effectiveSort)
            .limit(limit + 1)
            .toArray();

        const hasMore = results.length > limit;
        if (hasMore) {
            results.pop(); // Remove extra item
        }

        // Build next/prev cursors (use originalQuery to preserve filters)
        let nextCursor = null;
        let prevCursor = null;

        if (hasMore && results.length > 0) {
            const lastDoc = results[results.length - 1];
            nextCursor = CommonUtils._encodePaginationCursor({
                v: 1,
                q: originalQuery,
                s: effectiveSort,
                l: limit,
                t: total,
                lv: CommonUtils._extractSortValues(lastDoc, effectiveSort),
                d: 1  // forward
            });
        }

        // prevCursor only if we came from a cursor (not first page)
        if (cursorData && results.length > 0) {
            const firstDoc = results[0];
            prevCursor = CommonUtils._encodePaginationCursor({
                v: 1,
                q: originalQuery,
                s: effectiveSort,
                l: limit,
                t: total,
                lv: CommonUtils._extractSortValues(firstDoc, effectiveSort),
                d: -1  // backward
            });
        }

        return {
            success: true,
            data: results,
            count: results.length,
            pagination: {
                mode: 'cursor',
                total,
                limit,
                hasMore,
                nextCursor,
                prevCursor
            }
        };
    }

    /**
     * Encode pagination cursor to Base64 string
     * W-141: Custom serialization to handle RegExp and Date objects
     * @private
     * @param {object} cursorData - Cursor data object
     * @returns {string|null} Base64-encoded cursor string or null if invalid
     */
    static _encodePaginationCursor(cursorData) {
        if (!cursorData || typeof cursorData !== 'object') {
            return null;
        }
        try {
            // Custom serialization to handle RegExp
            const serialized = CommonUtils._serializeQuery(cursorData);
            return Buffer.from(JSON.stringify(serialized)).toString('base64');
        } catch (error) {
            return null;
        }
    }

    /**
     * Decode and validate pagination cursor from Base64 string
     * W-141: Custom deserialization to restore RegExp and Date objects
     * @private
     * @param {string} cursorString - Base64-encoded cursor string
     * @returns {object|null} Decoded cursor data or null if invalid
     */
    static _decodePaginationCursor(cursorString) {
        if (!cursorString || typeof cursorString !== 'string') {
            return null;
        }
        try {
            const decoded = JSON.parse(Buffer.from(cursorString, 'base64').toString('utf8'));
            // Validate required fields
            if (!decoded.v || !decoded.s || !decoded.l) {
                return null;
            }
            // W-141: Deserialize RegExp and Date objects
            decoded.q = CommonUtils._deserializeQuery(decoded.q);
            return decoded;
        } catch (error) {
            return null;
        }
    }

    /**
     * Convert cursor value back to proper MongoDB type
     * @private
     * @param {string} key - Field name
     * @param {*} value - Value from decoded cursor (may be string)
     * @returns {*} Value converted to proper MongoDB type
     */
    static _convertCursorValue(key, value) {
        if (value === null || value === undefined) {
            return value;
        }

        // Convert _id strings to ObjectId
        if (key === '_id' && typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
            return new ObjectId(value);
        }

        // Convert ISO date strings to Date objects
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }

        return value;
    }

    /**
     * Serialize a query object for cursor storage (handles RegExp)
     * W-141: RegExp objects need special handling for JSON serialization
     * @private
     * @param {*} obj - Object to serialize
     * @returns {*} Serialized object
     */
    static _serializeQuery(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof RegExp) {
            return {
                __type: 'RegExp',
                source: obj.source,
                flags: obj.flags
            };
        }

        if (Array.isArray(obj)) {
            return obj.map(item => CommonUtils._serializeQuery(item));
        }

        const serialized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value instanceof RegExp) {
                serialized[key] = {
                    __type: 'RegExp',
                    source: value.source,
                    flags: value.flags
                };
            } else if (value instanceof Date) {
                // Serialize Date as ISO string - will be restored by _deserializeQuery
                serialized[key] = value.toISOString();
            } else if (value && typeof value === 'object') {
                serialized[key] = CommonUtils._serializeQuery(value);
            } else {
                serialized[key] = value;
            }
        }
        return serialized;
    }

    /**
     * Deserialize a query object from cursor storage (restores RegExp and Date)
     * W-141: Restore RegExp and Date objects from serialized format
     * @private
     * @param {*} obj - Object to deserialize
     * @returns {*} Deserialized object
     */
    static _deserializeQuery(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        // Check if this is a serialized RegExp
        if (obj.__type === 'RegExp') {
            return new RegExp(obj.source, obj.flags);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => CommonUtils._deserializeQuery(item));
        }

        const deserialized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value && typeof value === 'object' && value.__type === 'RegExp') {
                deserialized[key] = new RegExp(value.source, value.flags);
            } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                // Convert ISO date strings to Date objects
                const date = new Date(value);
                deserialized[key] = !isNaN(date.getTime()) ? date : value;
            } else if (value && typeof value === 'object') {
                deserialized[key] = CommonUtils._deserializeQuery(value);
            } else {
                deserialized[key] = value;
            }
        }
        return deserialized;
    }

    /**
     * Build MongoDB range query for cursor-based pagination
     * @private
     * @param {object} sort - Sort object (e.g., { createdAt: -1, _id: -1 })
     * @param {object} lastValues - Last document's values for sort keys
     * @param {number} direction - Pagination direction: 1=forward, -1=backward
     * @returns {object} MongoDB $or query for range
     */
    static _buildPaginationCursorRangeQuery(sort, lastValues, direction = 1) {
        const sortKeys = Object.keys(sort);
        if (sortKeys.length === 0 || !lastValues) {
            return {};
        }

        const orConditions = [];

        for (let i = 0; i < sortKeys.length; i++) {
            const condition = {};

            // Add equality conditions for previous keys (with type conversion)
            for (let j = 0; j < i; j++) {
                const key = sortKeys[j];
                condition[key] = CommonUtils._convertCursorValue(key, lastValues[key]);
            }

            // Add range condition for current key (with type conversion)
            const currentKey = sortKeys[i];
            const sortDirection = sort[currentKey] * direction;
            const operator = sortDirection > 0 ? '$gt' : '$lt';
            const convertedValue = CommonUtils._convertCursorValue(currentKey, lastValues[currentKey]);
            condition[currentKey] = { [operator]: convertedValue };

            orConditions.push(condition);
        }

        return orConditions.length > 0 ? { $or: orConditions } : {};
    }

    /**
     * Normalize sort parameter and ensure _id tiebreaker
     * @private
     * @param {string|object} sortParam - Sort parameter (e.g., "createdAt:-1" or { createdAt: -1 })
     * @returns {object} Normalized sort object with _id tiebreaker
     */
    static _normalizePaginationSort(sortParam) {
        let sort = {};

        if (typeof sortParam === 'string' && sortParam.trim()) {
            // Parse "field:direction" or "-field" format
            if (sortParam.includes(':')) {
                const [field, dir] = sortParam.split(':');
                sort[field] = dir === '-1' || dir === 'desc' ? -1 : 1;
            } else if (sortParam.startsWith('-')) {
                sort[sortParam.substring(1)] = -1;
            } else {
                sort[sortParam] = 1;
            }
        } else if (typeof sortParam === 'object' && sortParam !== null) {
            sort = { ...sortParam };
        }

        // Default to _id if no sort specified
        if (Object.keys(sort).length === 0) {
            sort._id = 1;
        }

        // Add _id as tiebreaker if not already present
        if (!('_id' in sort)) {
            const firstSortDir = Object.values(sort)[0] || 1;
            sort._id = firstSortDir;
        }

        return sort;
    }

    /**
     * Extract sort field values from a document for cursor
     * @private
     * @param {object} doc - MongoDB document
     * @param {object} sort - Sort object
     * @returns {object} Object with sort field values
     */
    static _extractSortValues(doc, sort) {
        const values = {};
        for (const key of Object.keys(sort)) {
            values[key] = doc[key];
        }
        return values;
    }
}

export default CommonUtils;

// Named exports for convenience
export const {
    schemaBasedQuery,
    getFieldSchema,
    buildDateQuery,
    getValueByPath,
    setValueByPath,
    deleteValueByPath,
    deepMerge,
    sanitizeObject,
    normalizeForContext,
    formatValue,
    generateUuid,
    isValidEmail,
    sanitizeString,
    slugifyString,
    sanitizeHtml,
    sendError,
    getLogContext,
    formatTimestamp,
    formatLogMessage,
    formatUptime,
    paginatedSearch
} = CommonUtils;

// EOF webapp/utils/common.js
