/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Markdown Controller
 * @tagline         Unit tests for Markdown Controller
 * @description     Tests for markdown controller functions
 * @file            webapp/tests/unit/controller/markdown.test.js
 * @version         1.6.6
 * @release         2026-02-03
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import MarkdownController from '../../../controller/markdown.js';

// Mock global appConfig - use relative path from webapp directory
global.appConfig = {
    system: {
        appDir: path.resolve(__dirname, '../../..'),
        siteDir: path.resolve(__dirname, '../../../site/webapp')
    },
    controller: {
        markdown: {
            cache: true
        }
    }
};

// Mock LogController
jest.mock('../../../controller/log.js', () => ({
    logInfo: jest.fn(),
    logError: jest.fn()
}));

// Mock CommonUtils
jest.mock('../../../utils/common.js', () => ({
    sendError: jest.fn()
}));

describe('MarkdownController', () => {
    // Use appConfig.system.siteDir as the base for all paths
    const testSiteDir = path.join(global.appConfig.system.siteDir, 'static', 'assets', 'test-docs');

    beforeEach(async () => {
        // Create temporary test documentation for site namespace ONLY
        await fs.mkdir(testSiteDir, { recursive: true });
        await fs.writeFile(
            path.join(testSiteDir, 'README.md'),
            '# Test Documentation\nThis is a test document for site docs.'
        );
        await fs.writeFile(
            path.join(testSiteDir, 'user-guide.md'),
            '# User Guide\nDetailed user guide content.'
        );

        // Create subdirectory with content
        await fs.mkdir(path.join(testSiteDir, 'admin'), { recursive: true });
        await fs.writeFile(
            path.join(testSiteDir, 'admin/setup.md'),
            '# Admin Setup\nAdministrator setup instructions.'
        );

        // NOTE: jpulse namespace tests use existing real documentation (READ-ONLY)
        // NEVER create or modify webapp/static/assets/jpulse/ directory in tests!
    });

    afterEach(async () => {
        // Clean up ONLY test site files - NEVER touch jpulse directory!
        await fs.rm(testSiteDir, { recursive: true, force: true });

        // Clear any mocks
        jest.clearAllMocks();
    });

    describe('API endpoint', () => {
        it('should list markdown files in site namespace', async () => {
            const mockReq = {
                path: '/api/1/markdown/test-docs/',
                originalUrl: '/api/1/markdown/test-docs/'
            };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                files: expect.arrayContaining([
                    expect.objectContaining({
                        name: 'README.md',
                        path: 'README.md',
                        title: 'Test Docs',
                        isDirectory: true
                    })
                ])
            });
        });

        it('should list markdown files in jpulse-docs namespace (read-only test)', async () => {
            const mockReq = {
                path: '/api/1/markdown/jpulse-docs/',
                originalUrl: '/api/1/markdown/jpulse-docs/',
                headers: {}
            };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq, mockRes);

            // Test that jpulse-docs namespace returns files (using real docs)
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    files: expect.any(Array)
                })
            );
        });

        it('should serve specific markdown file from site namespace', async () => {
            const mockReq = {
                path: '/api/1/markdown/test-docs/user-guide.md',
                originalUrl: '/api/1/markdown/test-docs/user-guide.md'
            };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                content: '# User Guide\nDetailed user guide content.',
                path: 'user-guide.md'
            });
        });

        it('should serve files from subdirectories', async () => {
            const mockReq = {
                path: '/api/1/markdown/test-docs/admin/setup.md',
                originalUrl: '/api/1/markdown/test-docs/admin/setup.md'
            };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                content: '# Admin Setup\nAdministrator setup instructions.',
                path: 'admin/setup.md'
            });
        });

        it('should prevent path traversal attacks', async () => {
            const CommonUtils = require('../../../utils/common.js');
            const mockReq = {
                path: '/api/1/markdown/test-docs/../../../package.json',
                originalUrl: '/api/1/markdown/test-docs/../../../package.json',
                headers: {}
            };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq, mockRes);

            expect(CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                500,
                'Internal server error in markdown API: Invalid file path',
                'MARKDOWN_ERROR'
            );
        });

        it('should handle missing namespace', async () => {
            const CommonUtils = require('../../../utils/common.js');
            const mockReq = {
                path: '/api/1/markdown/',
                originalUrl: '/api/1/markdown/',
                headers: {}
            };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq, mockRes);

            expect(CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                400,
                'The namespace of the Markdown documents is required, such as: faq',
                'NAMESPACE_REQUIRED'
            );
        });

        it('should handle non-existent namespace', async () => {
            const CommonUtils = require('../../../utils/common.js');
            const mockReq = {
                path: '/api/1/markdown/nonexistent/',
                originalUrl: '/api/1/markdown/nonexistent/',
                headers: {}
            };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq, mockRes);

            expect(CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                404,
                'The namespace {{namespace}} of the Markdown documents does not exist',
                'NAMESPACE_NOT_FOUND'
            );
        });

        it('should handle missing files gracefully', async () => {
            const CommonUtils = require('../../../utils/common.js');
            const mockReq = {
                path: '/api/1/markdown/test-docs/nonexistent.md',
                originalUrl: '/api/1/markdown/test-docs/nonexistent.md',
                headers: {}
            };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq, mockRes);

            expect(CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                404,
                'File test-docs/nonexistent.md not found',
                'FILE_NOT_FOUND'
            );
        });
    });

    describe('Caching', () => {
        it('should cache file content when caching is enabled', async () => {
            // First request
            const mockReq1 = {
                path: '/api/1/markdown/test-docs/README.md',
                originalUrl: '/api/1/markdown/test-docs/README.md'
            };
            const mockRes1 = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq1, mockRes1);

            // Second request (should use cache)
            const mockReq2 = {
                path: '/api/1/markdown/test-docs/README.md',
                originalUrl: '/api/1/markdown/test-docs/README.md'
            };
            const mockRes2 = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq2, mockRes2);

            // Both should return the same content
            expect(mockRes1.json).toHaveBeenCalledWith({
                success: true,
                content: '# Test Documentation\nThis is a test document for site docs.',
                path: 'README.md'
            });
            expect(mockRes2.json).toHaveBeenCalledWith({
                success: true,
                content: '# Test Documentation\nThis is a test document for site docs.',
                path: 'README.md'
            });
        });

        it('should cache directory listings when caching is enabled', async () => {
            // First request
            const mockReq1 = {
                path: '/api/1/markdown/test-docs/',
                originalUrl: '/api/1/markdown/test-docs/'
            };
            const mockRes1 = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq1, mockRes1);

            // Second request (should use cache)
            const mockReq2 = {
                path: '/api/1/markdown/test-docs/',
                originalUrl: '/api/1/markdown/test-docs/'
            };
            const mockRes2 = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq2, mockRes2);

            // Both should return the same file listing
            expect(mockRes1.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    files: expect.any(Array)
                })
            );
            expect(mockRes2.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    files: expect.any(Array)
                })
            );
        });
    });

    describe('Title extraction', () => {
        it('should extract readable titles from filenames', () => {
            expect(MarkdownController._extractTitle('user-guide.md')).toBe('User Guide');
            // Accept both outcomes based on environment config
            const apiTitle = MarkdownController._extractTitle('api_reference.md');
            expect(['API Reference', 'Api Reference']).toContain(apiTitle);
            expect(MarkdownController._extractTitle('README.md')).toBe('README');
            expect(MarkdownController._extractTitle('getting-started-guide.md')).toBe('Getting Started Guide');
        });
    });

    // =========================================================================
    // W-104: Dynamic Content Tests
    // =========================================================================

    describe('Dynamic Content Token Parsing (_parseDynamicToken)', () => {
        it('should parse simple name without parameters', () => {
            const result = MarkdownController._parseDynamicToken('plugins-list');
            expect(result.name).toBe('plugins-list');
            expect(result.params).toEqual({});
        });

        it('should parse name with single parameter', () => {
            const result = MarkdownController._parseDynamicToken('plugins-list status="enabled"');
            expect(result.name).toBe('plugins-list');
            expect(result.params).toEqual({ status: 'enabled' });
        });

        it('should parse name with multiple parameters', () => {
            const result = MarkdownController._parseDynamicToken('plugins-list status="enabled" limit="10"');
            expect(result.name).toBe('plugins-list');
            expect(result.params).toEqual({ status: 'enabled', limit: 10 });
        });

        it('should coerce integer values to numbers', () => {
            const result = MarkdownController._parseDynamicToken('test-gen limit="50"');
            expect(result.params.limit).toBe(50);
            expect(typeof result.params.limit).toBe('number');
        });

        it('should coerce float values to numbers', () => {
            const result = MarkdownController._parseDynamicToken('test-gen ratio="3.14"');
            expect(result.params.ratio).toBe(3.14);
            expect(typeof result.params.ratio).toBe('number');
        });

        it('should coerce boolean true values', () => {
            const result = MarkdownController._parseDynamicToken('test-gen active="true"');
            expect(result.params.active).toBe(true);
            expect(typeof result.params.active).toBe('boolean');
        });

        it('should coerce boolean false values', () => {
            const result = MarkdownController._parseDynamicToken('test-gen disabled="false"');
            expect(result.params.disabled).toBe(false);
            expect(typeof result.params.disabled).toBe('boolean');
        });

        it('should keep string values as strings', () => {
            const result = MarkdownController._parseDynamicToken('test-gen type="active" period="30d"');
            expect(result.params.type).toBe('active');
            expect(result.params.period).toBe('30d');
        });

        it('should throw error for invalid syntax', () => {
            expect(() => MarkdownController._parseDynamicToken('Invalid Name!')).toThrow('Invalid dynamic content syntax');
        });

        it('should throw error for empty token', () => {
            expect(() => MarkdownController._parseDynamicToken('')).toThrow('Invalid dynamic content syntax');
        });
    });

    describe('Dynamic Content Processing (_processDynamicContent)', () => {
        it('should return content unchanged when no tokens present', async () => {
            const content = '# Hello World\nThis is regular markdown.';
            const result = await MarkdownController._processDynamicContent(content);
            expect(result).toBe(content);
        });

        it('should not process tokens escaped with backtick', async () => {
            const content = 'Use the `%DYNAMIC{plugins-list}%` token for plugins.';
            const result = await MarkdownController._processDynamicContent(content);
            expect(result).toBe(content);
        });

        it('should replace unknown generator with error message', async () => {
            const content = 'Count: %DYNAMIC{unknown-generator}%';
            const result = await MarkdownController._processDynamicContent(content);
            expect(result).toContain('Error: Unknown dynamic content');
            expect(result).toContain('unknown-generator');
        });

        it('should process plugins-count generator', async () => {
            const content = 'Plugins: %DYNAMIC{plugins-count}%';
            const result = await MarkdownController._processDynamicContent(content);
            // Should replace with a number (plugins count)
            expect(result).toMatch(/Plugins: \d+/);
        });

        it('should process dynamic-generator-list generator', async () => {
            const content = 'Generators:\n%DYNAMIC{dynamic-generator-list}%';
            const result = await MarkdownController._processDynamicContent(content);
            expect(result).toContain('plugins-list-table');
            expect(result).toContain('plugins-count');
        });

        it('should process handlebars-list-table generator', async () => {
            const content = 'Helpers:\n%DYNAMIC{handlebars-list-table}%';
            const result = await MarkdownController._processDynamicContent(content);
            expect(result).toContain('Handlebars Helpers with Examples');
            expect(result).toContain('|');
            expect(result).toContain('What it does');
        });

        it('should process handlebars-list-table with type filter', async () => {
            const content = 'Regular:\n%DYNAMIC{handlebars-list-table type="regular"}%';
            const result = await MarkdownController._processDynamicContent(content);
            expect(result).toContain('Regular Handlebars with Examples');
            expect(result).toContain('{{and');
        });

        it('should process handlebars-list-table with source filter', async () => {
            const content = 'jPulse:\n%DYNAMIC{handlebars-list-table source="jpulse"}%';
            const result = await MarkdownController._processDynamicContent(content);
            expect(result).toContain('jPulse Framework');
        });

        it('should process handlebars-list generator', async () => {
            const content = 'Helpers:\n%DYNAMIC{handlebars-list}%';
            const result = await MarkdownController._processDynamicContent(content);
            expect(result).toContain('{{and}}');
            expect(result).toContain('{{#if}}');
        });

        it('should process handlebars-list with type filter', async () => {
            const content = 'Block:\n%DYNAMIC{handlebars-list type="block"}%';
            const result = await MarkdownController._processDynamicContent(content);
            expect(result).toContain('{{#if}}');
            expect(result).not.toContain('{{and}}'); // Regular helper shouldn't appear
        });

        it('should handle multiple tokens in same content', async () => {
            const content = 'Count: %DYNAMIC{plugins-count}% and list: %DYNAMIC{dynamic-generator-list}%';
            const result = await MarkdownController._processDynamicContent(content);
            expect(result).toMatch(/Count: \d+/);
            expect(result).toContain('plugins-list-table');
        });

        it('should handle mixed escaped and non-escaped tokens', async () => {
            const content = 'Real: %DYNAMIC{plugins-count}% and escaped: `%DYNAMIC{plugins-count}%`';
            const result = await MarkdownController._processDynamicContent(content);
            // First should be replaced with number, second should remain unchanged
            expect(result).toMatch(/Real: \d+/);
            expect(result).toContain('`%DYNAMIC{plugins-count}%`');
        });
    });

    describe('Dynamic Content Registry', () => {
        it('should have required generators registered', () => {
            const registry = MarkdownController.DYNAMIC_CONTENT_REGISTRY;
            expect(registry['plugins-list-table']).toBeDefined();
            expect(registry['plugins-list']).toBeDefined();
            expect(registry['plugins-count']).toBeDefined();
            expect(registry['dynamic-generator-list']).toBeDefined();
            expect(registry['handlebars-list-table']).toBeDefined();
            expect(registry['handlebars-list']).toBeDefined();
        });

        it('should have generator functions for each entry', () => {
            const generators = MarkdownController.DYNAMIC_CONTENT_GENERATORS;
            expect(typeof generators['plugins-list-table']).toBe('function');
            expect(typeof generators['plugins-count']).toBe('function');
        });

        it('should have descriptions for documentation', () => {
            const registry = MarkdownController.DYNAMIC_CONTENT_REGISTRY;
            expect(registry['plugins-list-table'].description).toBeDefined();
            expect(registry['plugins-list-table'].description.length).toBeGreaterThan(0);
        });
    });
});

// EOF webapp/tests/unit/controller/markdown.test.js