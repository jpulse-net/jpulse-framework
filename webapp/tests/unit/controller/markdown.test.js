/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Markdown Controller
 * @tagline         Unit tests for Markdown Controller
 * @description     Tests for markdown controller functions
 * @file            webapp/tests/unit/controller/markdown.test.js
 * @version         0.5.3
 * @release         2025-09-08
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import MarkdownController from '../../../controller/markdown.js';

// Mock global appConfig - use relative path from webapp directory
global.appConfig = {
    app: {
        dirName: path.resolve(path.dirname(import.meta.url.replace('file://', '')), '../../..')
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
                files: expect.arrayContaining([
                    expect.objectContaining({
                        name: 'README.md',
                        path: 'README.md',
                        title: 'README'
                    }),
                    expect.objectContaining({
                        name: 'user-guide.md',
                        path: 'user-guide.md',
                        title: 'User Guide'
                    }),
                    expect.objectContaining({
                        name: 'setup.md',
                        path: 'admin/setup.md',
                        title: 'Setup'
                    })
                ])
            });
        });

        it('should list markdown files in jpulse namespace (read-only test)', async () => {
            const mockReq = {
                path: '/api/1/markdown/jpulse/',
                originalUrl: '/api/1/markdown/jpulse/'
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
                content: '# Admin Setup\nAdministrator setup instructions.',
                path: 'admin/setup.md'
            });
        });

        it('should prevent path traversal attacks', async () => {
            const CommonUtils = require('../../../utils/common.js');
            const mockReq = {
                path: '/api/1/markdown/test-docs/../../../package.json',
                originalUrl: '/api/1/markdown/test-docs/../../../package.json'
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
                'Markdown service error'
            );
        });

        it('should handle missing namespace', async () => {
            const CommonUtils = require('../../../utils/common.js');
            const mockReq = {
                path: '/api/1/markdown/',
                originalUrl: '/api/1/markdown/'
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
                'Namespace required'
            );
        });

        it('should handle non-existent namespace', async () => {
            const CommonUtils = require('../../../utils/common.js');
            const mockReq = {
                path: '/api/1/markdown/nonexistent/',
                originalUrl: '/api/1/markdown/nonexistent/'
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
                'Namespace not found'
            );
        });

        it('should handle missing files gracefully', async () => {
            const CommonUtils = require('../../../utils/common.js');
            const mockReq = {
                path: '/api/1/markdown/test-docs/nonexistent.md',
                originalUrl: '/api/1/markdown/test-docs/nonexistent.md'
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
                'Markdown service error'
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
                content: '# Test Documentation\nThis is a test document for site docs.',
                path: 'README.md'
            });
            expect(mockRes2.json).toHaveBeenCalledWith({
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
            expect(MarkdownController._extractTitle('api_reference.md')).toBe('Api Reference');
            expect(MarkdownController._extractTitle('README.md')).toBe('README');
            expect(MarkdownController._extractTitle('getting-started-guide.md')).toBe('Getting Started Guide');
        });
    });
});

// EOF webapp/tests/unit/controller/markdown.test.js