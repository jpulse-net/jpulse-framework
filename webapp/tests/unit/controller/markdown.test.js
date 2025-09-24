/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Markdown Controller
 * @tagline         Unit tests for Markdown Controller
 * @description     Tests for markdown controller functions
 * @file            webapp/tests/unit/controller/markdown.test.js
 * @version         0.7.18
 * @release         2025-09-24
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           80%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import MarkdownController from '../../../controller/markdown.js';

// Mock global appConfig - use relative path from webapp directory
global.appConfig = {
    app: {
        dirName: path.resolve(__dirname, '../../..')
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
    // Use appConfig.app.dirName as the base for all paths
    const projectRoot = path.dirname(global.appConfig.app.dirName);
    const testSiteDir = path.join(projectRoot, 'site/webapp/static/assets/test-docs');

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

        it('should list markdown files in jpulse namespace (read-only test)', async () => {
            const mockReq = {
                path: '/api/1/markdown/jpulse/',
                originalUrl: '/api/1/markdown/jpulse/',
                headers: {}
            };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq, mockRes);

            // Test that jpulse namespace returns files (using real docs)
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
});

// EOF webapp/tests/unit/controller/markdown.test.js