/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Markdown Publish List
 * @tagline         Unit tests for markdown controller publish-list functionality (W-120)
 * @description     Tests for .markdown [publish-list] section ordering and custom titles
 * @file            webapp/tests/unit/controller/markdown-publish-list.test.js
 * @version         1.4.5
 * @release         2026-01-05
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import MarkdownController from '../../../controller/markdown.js';

describe('MarkdownController Publish List Functionality (W-120)', () => {
    let testDir;
    let originalConfig;

    beforeEach(async () => {
        // Setup test environment
        originalConfig = global.appConfig;

        // Mock global appConfig
        global.appConfig = {
            system: {
                appDir: path.resolve(process.cwd(), 'webapp')
            },
            controller: {
                markdown: {
                    cache: false, // Disable cache for testing
                    titleCaseFix: {
                        'Api': 'API',
                        'Jpulse': 'jPulse'
                    }
                }
            }
        };

        // Create temporary test directory (use unique path per test to avoid cache issues)
        testDir = path.join(process.cwd(), 'webapp', 'tests', 'tmp', `markdown-publish-list-test-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        // Cleanup
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
        global.appConfig = originalConfig;
    });

    describe('_initializeDocsConfig [publish-list] section', () => {
        it('should return empty publishList when no .markdown file exists', async () => {
            const config = await MarkdownController._initializeDocsConfig(testDir);
            expect(config.publishList).toEqual([]);
        });

        it('should parse [publish-list] section correctly', async () => {
            const markdownContent = `[publish-list]
README.md           jPulse Docs
getting-started.md  Getting Started
installation.md
api-reference.md   API Reference`;

            await fs.writeFile(path.join(testDir, '.markdown'), markdownContent);
            const config = await MarkdownController._initializeDocsConfig(testDir);

            expect(config.publishList).toHaveLength(4);
            expect(config.publishList[0].path).toBe('README.md');
            expect(config.publishList[0].title).toBe('jPulse Docs');
            expect(config.publishList[1].path).toBe('getting-started.md');
            expect(config.publishList[1].title).toBe('Getting Started');
            expect(config.publishList[2].path).toBe('installation.md');
            expect(config.publishList[2].title).toBe(null);
            expect(config.publishList[3].path).toBe('api-reference.md');
            expect(config.publishList[3].title).toBe('API Reference');
        });

        it('should handle paths without titles', async () => {
            const markdownContent = `[publish-list]
README.md
getting-started.md
installation.md`;

            await fs.writeFile(path.join(testDir, '.markdown'), markdownContent);
            const config = await MarkdownController._initializeDocsConfig(testDir);

            expect(config.publishList).toHaveLength(3);
            expect(config.publishList[0].path).toBe('README.md');
            expect(config.publishList[0].title).toBe(null);
            expect(config.publishList[1].path).toBe('getting-started.md');
            expect(config.publishList[1].title).toBe(null);
        });

        it('should handle subdirectory paths', async () => {
            const markdownContent = `[publish-list]
README.md
plugins/README.md   Plugins
plugins/creating-plugins.md`;

            await fs.writeFile(path.join(testDir, '.markdown'), markdownContent);
            const config = await MarkdownController._initializeDocsConfig(testDir);

            expect(config.publishList).toHaveLength(3);
            expect(config.publishList[1].path).toBe('plugins/README.md');
            expect(config.publishList[1].title).toBe('Plugins');
            expect(config.publishList[2].path).toBe('plugins/creating-plugins.md');
        });
    });

    describe('_applyPublishListOrdering', () => {
        it('should return files as-is when no publish-list', () => {
            const files = [
                { path: 'b.md', title: 'B' },
                { path: 'a.md', title: 'A' },
                { path: 'c.md', title: 'C' }
            ];
            const docsConfig = { publishList: [] };

            const result = MarkdownController._applyPublishListOrdering(files, docsConfig);
            expect(result).toEqual(files);
        });

        it('should order files according to publish-list', () => {
            const files = [
                { path: 'c.md', title: 'C' },
                { path: 'a.md', title: 'A' },
                { path: 'b.md', title: 'B' }
            ];
            const docsConfig = {
                publishList: [
                    { path: 'a.md', title: null },
                    { path: 'b.md', title: null },
                    { path: 'c.md', title: null }
                ],
                ignore: []
            };

            const result = MarkdownController._applyPublishListOrdering(files, docsConfig);
            expect(result.map(f => f.path)).toEqual(['a.md', 'b.md', 'c.md']);
        });

        it('should apply custom titles from publish-list', () => {
            const files = [
                { path: 'api.md', title: 'Api' },
                { path: 'guide.md', title: 'Guide' }
            ];
            const docsConfig = {
                publishList: [
                    { path: 'api.md', title: 'API Reference' },
                    { path: 'guide.md', title: 'User Guide' }
                ],
                ignore: []
            };

            const result = MarkdownController._applyPublishListOrdering(files, docsConfig);
            expect(result[0].title).toBe('API Reference');
            expect(result[1].title).toBe('User Guide');
        });

        it('should append remaining files alphabetically after publish-list', () => {
            const files = [
                { path: 'z.md', title: 'Z' },
                { path: 'a.md', title: 'A' },
                { path: 'm.md', title: 'M' },
                { path: 'b.md', title: 'B' }
            ];
            const docsConfig = {
                publishList: [
                    { path: 'a.md', title: null }
                ],
                ignore: []
            };

            const result = MarkdownController._applyPublishListOrdering(files, docsConfig);
            expect(result.map(f => f.path)).toEqual(['a.md', 'b.md', 'm.md', 'z.md']);
        });

        it('should exclude ignored files from remaining files', () => {
            const files = [
                { path: 'a.md', title: 'A' },
                { path: 'b.md', title: 'B' },
                { path: 'temp.md', title: 'Temp' }
            ];
            const docsConfig = {
                publishList: [
                    { path: 'a.md', title: null }
                ],
                ignore: [
                    { pattern: 'temp.md', regex: /^temp\.md$/, isDirectory: false }
                ]
            };

            const result = MarkdownController._applyPublishListOrdering(files, docsConfig);
            expect(result.map(f => f.path)).toEqual(['a.md', 'b.md']);
            expect(result.find(f => f.path === 'temp.md')).toBeUndefined();
        });
    });

    describe('Integration with _scanMarkdownFiles', () => {
        beforeEach(async () => {
            // Create test directory structure
            await fs.mkdir(path.join(testDir, 'plugins'), { recursive: true });

            // Create test files
            await fs.writeFile(path.join(testDir, 'README.md'), '# Root README');
            await fs.writeFile(path.join(testDir, 'z-guide.md'), '# Z Guide');
            await fs.writeFile(path.join(testDir, 'a-intro.md'), '# A Intro');
            await fs.writeFile(path.join(testDir, 'm-middle.md'), '# M Middle');

            await fs.writeFile(path.join(testDir, 'plugins', 'README.md'), '# Plugins README');
            await fs.writeFile(path.join(testDir, 'plugins', 'creating.md'), '# Creating');
        });

        it('should order files according to publish-list', async () => {
            const markdownContent = `[publish-list]
README.md
a-intro.md
m-middle.md
z-guide.md`;

            await fs.writeFile(path.join(testDir, '.markdown'), markdownContent);
            const docsConfig = await MarkdownController._initializeDocsConfig(testDir);
            const files = await MarkdownController._scanMarkdownFiles(testDir, '', 'test', docsConfig);

            expect(files).toHaveLength(1);
            expect(files[0].name).toBe('README.md');
            const rootFiles = files[0].files;
            // Files should be ordered according to publish-list, then remaining files alphabetically
            const filePaths = rootFiles.map(f => f.path);
            expect(filePaths.slice(0, 3)).toEqual(['a-intro.md', 'm-middle.md', 'z-guide.md']);
            // plugins/README.md might be included if it exists (alphabetically after publish-list)
            if (filePaths.length > 3) {
                expect(filePaths[3]).toBe('plugins/README.md');
            }
        });

        it('should apply custom titles from publish-list', async () => {
            const markdownContent = `[publish-list]
README.md           Documentation
a-intro.md         Introduction
z-guide.md         User Guide`;

            await fs.writeFile(path.join(testDir, '.markdown'), markdownContent);
            const docsConfig = await MarkdownController._initializeDocsConfig(testDir);
            const files = await MarkdownController._scanMarkdownFiles(testDir, '', 'test', docsConfig);

            expect(files[0].title).toBe('Documentation');
            const rootFiles = files[0].files;
            expect(rootFiles.find(f => f.path === 'a-intro.md').title).toBe('Introduction');
            expect(rootFiles.find(f => f.path === 'z-guide.md').title).toBe('User Guide');
        });

        it('should handle partial publish-list with remaining files alphabetically', async () => {
            const markdownContent = `[publish-list]
README.md
m-middle.md`;

            await fs.writeFile(path.join(testDir, '.markdown'), markdownContent);
            const docsConfig = await MarkdownController._initializeDocsConfig(testDir);
            const files = await MarkdownController._scanMarkdownFiles(testDir, '', 'test', docsConfig);

            const rootFiles = files[0].files;
            // m-middle.md should be first (from publish-list), then a-intro.md and z-guide.md alphabetically
            expect(rootFiles[0].path).toBe('m-middle.md');
            expect(rootFiles[1].path).toBe('a-intro.md');
            expect(rootFiles[2].path).toBe('z-guide.md');
        });
    });

    describe('_initializeDocsConfig [title-case-fix] section', () => {
        it('should merge title-case-fix with app.conf defaults', async () => {
            const markdownContent = `[title-case-fix]
Css             CSS
Javascript      JavaScript`;

            await fs.writeFile(path.join(testDir, '.markdown'), markdownContent);
            const config = await MarkdownController._initializeDocsConfig(testDir);

            // Should have both app.conf defaults and .markdown overrides
            expect(config.titleCaseFix.Api).toBe('API');
            expect(config.titleCaseFix.Jpulse).toBe('jPulse');
            expect(config.titleCaseFix.Css).toBe('CSS');
            expect(config.titleCaseFix.Javascript).toBe('JavaScript');
        });

        it('should override app.conf defaults with .markdown values', async () => {
            const markdownContent = `[title-case-fix]
Api             API Reference
Jpulse          jPulse Framework`;

            await fs.writeFile(path.join(testDir, '.markdown'), markdownContent);
            const config = await MarkdownController._initializeDocsConfig(testDir);

            // .markdown should override app.conf
            expect(config.titleCaseFix.Api).toBe('API Reference');
            expect(config.titleCaseFix.Jpulse).toBe('jPulse Framework');
        });
    });

    describe('_extractTitle with title-case-fix', () => {
        it('should apply title-case-fix from merged config', async () => {
            const markdownContent = `[title-case-fix]
Api             API`;

            await fs.writeFile(path.join(testDir, '.markdown'), markdownContent);
            const docsConfig = await MarkdownController._initializeDocsConfig(testDir);

            const title = MarkdownController._extractTitle('api-reference.md', docsConfig);
            expect(title).toBe('API Reference');
        });

        it('should use app.conf defaults when no .markdown file', async () => {
            const docsConfig = await MarkdownController._initializeDocsConfig(testDir);
            const title = MarkdownController._extractTitle('api-reference.md', docsConfig);
            expect(title).toBe('API Reference'); // From app.conf default
        });
    });
});

// EOF webapp/tests/unit/controller/markdown-publish-list.test.js

