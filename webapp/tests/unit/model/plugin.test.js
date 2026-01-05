/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Model / Plugin Tests
 * @tagline         Unit tests for W-045 PluginModel
 * @description     Tests plugin configuration validation
 * @file            webapp/tests/unit/model/plugin.test.js
 * @version         1.4.5
 * @release         2026-01-05
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           90%, Cursor 2.0, Claude Sonnet 4.5
 */

import { describe, test, expect } from '@jest/globals';

// Mock database before importing PluginModel
import { jest } from '@jest/globals';
jest.mock('../../../database.js', () => ({
    default: {
        getDb: jest.fn(() => ({
            collection: jest.fn(() => ({
                findOne: jest.fn(),
                insertOne: jest.fn(),
                updateOne: jest.fn()
            }))
        }))
    }
}));

describe('PluginModel (W-045)', () => {
    let PluginModel;

    beforeAll(async () => {
        const { default: PluginModelModule } = await import('../../../model/plugin.js');
        PluginModel = PluginModelModule;
    });

    describe('validateConfig', () => {
        test('should pass validation with no schema', () => {
            const result = PluginModel.validateConfig('test-plugin', { foo: 'bar' }, null);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should pass validation with empty schema', () => {
            const result = PluginModel.validateConfig('test-plugin', { foo: 'bar' }, []);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should validate required text field', () => {
            const schema = [
                { id: 'name', label: 'Name', type: 'text', required: true }
            ];

            // Missing required field
            let result = PluginModel.validateConfig('test-plugin', {}, schema);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Name is required');

            // Empty string
            result = PluginModel.validateConfig('test-plugin', { name: '' }, schema);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Name is required');

            // Valid value
            result = PluginModel.validateConfig('test-plugin', { name: 'test' }, schema);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should validate boolean field', () => {
            const schema = [
                { id: 'enabled', label: 'Enabled', type: 'boolean', default: false }
            ];

            const result = PluginModel.validateConfig('test-plugin', { enabled: true }, schema);
            expect(result.valid).toBe(true);
        });

        test('should validate number field type', () => {
            const schema = [
                { id: 'port', label: 'Port', type: 'number' }
            ];

            // Invalid type (string)
            let result = PluginModel.validateConfig('test-plugin', { port: '8080' }, schema);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('must be a number');

            // Valid type
            result = PluginModel.validateConfig('test-plugin', { port: 8080 }, schema);
            expect(result.valid).toBe(true);
        });

        test('should validate select field with options', () => {
            const schema = [
                {
                    id: 'logLevel',
                    label: 'Log Level',
                    type: 'select',
                    options: [
                        { value: 'error', label: 'Error' },
                        { value: 'warn', label: 'Warning' },
                        { value: 'info', label: 'Info' }
                    ]
                }
            ];

            // Invalid value
            let result = PluginModel.validateConfig('test-plugin', { logLevel: 'invalid' }, schema);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('must be one of');

            // Valid value
            result = PluginModel.validateConfig('test-plugin', { logLevel: 'error' }, schema);
            expect(result.valid).toBe(true);
        });

        test('should skip validation for undefined non-required fields', () => {
            const schema = [
                { id: 'optional', label: 'Optional', type: 'text' }
            ];

            const result = PluginModel.validateConfig('test-plugin', {}, schema);
            expect(result.valid).toBe(true);
        });

        test('should handle multiple validation errors', () => {
            const schema = [
                { id: 'name', label: 'Name', type: 'text', required: true },
                { id: 'port', label: 'Port', type: 'number', required: true }
            ];

            // Both fields missing
            let result = PluginModel.validateConfig('test-plugin', {}, schema);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(2);
            expect(result.errors).toContain('Name is required');
            expect(result.errors).toContain('Port is required');

            // Type error
            result = PluginModel.validateConfig('test-plugin', { name: 'test', port: 'not a number' }, schema);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('must be a number');
        });

        test('should validate textarea field', () => {
            const schema = [
                { id: 'description', label: 'Description', type: 'textarea', required: true }
            ];

            // Empty
            let result = PluginModel.validateConfig('test-plugin', {}, schema);
            expect(result.valid).toBe(false);

            // Valid
            result = PluginModel.validateConfig('test-plugin', { description: 'Test description' }, schema);
            expect(result.valid).toBe(true);
        });

        test('should ignore help field type', () => {
            const schema = [
                { type: 'help', content: 'Some help text' },
                { id: 'name', label: 'Name', type: 'text', required: true }
            ];

            const result = PluginModel.validateConfig('test-plugin', { name: 'test' }, schema);
            expect(result.valid).toBe(true);
        });
    });
});

// EOF webapp/tests/unit/model/plugin.test.js
