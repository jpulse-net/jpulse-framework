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

// Mock global appConfig
global.appConfig = {
    app: {
        dirName: path.join(process.cwd(), 'webapp')
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
    const testSiteDir = path.join(process.cwd(), 'site/webapp/static/assets/test-docs');
    const testJPulseDir = path.join(process.cwd(), 'webapp/static/assets/jpulse');

    beforeEach(async () => {
        // Create temporary test documentation for site namespace
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

        // Create temporary jpulse test docs
        await fs.mkdir(testJPulseDir, { recursive: true });
        await fs.writeFile(
            path.join(testJPulseDir, 'README.md'),
            '# jPulse Framework\nFramework documentation.'
        );
        await fs.writeFile(
            path.join(testJPulseDir, 'api-reference.md'),
            '# API Reference\nComplete API documentation.'
        );
    });

    afterEach(async () => {
        // Clean up test files
        await fs.rm(testSiteDir, { recursive: true, force: true });
        await fs.rm(testJPulseDir, { recursive: true, force: true });

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

        it('should list markdown files in jpulse namespace', async () => {
            const mockReq = {
                path: '/api/1/markdown/jpulse/',
                originalUrl: '/api/1/markdown/jpulse/'
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
                        title: 'README'
                    }),
                    expect.objectContaining({
                        name: 'api-reference.md',
                        title: 'Api Reference'
                    })
                ])
            });
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

        it('should serve specific markdown file from jpulse namespace', async () => {
            const mockReq = {
                path: '/api/1/markdown/jpulse/api-reference.md',
                originalUrl: '/api/1/markdown/jpulse/api-reference.md'
            };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await MarkdownController.api(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                content: '# API Reference\nComplete API documentation.',
                path: 'api-reference.md'
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
