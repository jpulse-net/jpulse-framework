/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Markdown Ignore
 * @tagline         Unit tests for markdown controller ignore functionality
 * @description     Tests for .jpulse-ignore pattern matching and filtering
 * @file            webapp/tests/unit/controller/markdown-ignore.test.js
 * @version         1.3.16
 * @release         2025-12-16
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import MarkdownController from '../../../controller/markdown.js';

describe('MarkdownController Ignore Functionality', () => {
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
                    cache: false // Disable cache for testing
                }
            }
        };

        // Create temporary test directory
        testDir = path.join(process.cwd(), 'webapp', 'tests', 'tmp', 'markdown-ignore-test');
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

    describe('_loadIgnorePatterns', () => {
        it('should return empty array when no ignore file exists', async () => {
            const patterns = await MarkdownController._loadIgnorePatterns(testDir);
            expect(patterns).toEqual([]);
        });

        it('should parse ignore file correctly', async () => {
            const ignoreContent = `# Comment line
dev/working/
*.save*
temp.md

# Another comment
api-reference.md.save1`;

            await fs.writeFile(path.join(testDir, '.jpulse-ignore'), ignoreContent);
            const patterns = await MarkdownController._loadIgnorePatterns(testDir);

            expect(patterns).toHaveLength(4);
            expect(patterns[0].pattern).toBe('dev/working/');
            expect(patterns[0].isDirectory).toBe(true);
            expect(patterns[1].pattern).toBe('*.save*');
            expect(patterns[1].isDirectory).toBe(false);
            expect(patterns[2].pattern).toBe('temp.md');
            expect(patterns[3].pattern).toBe('api-reference.md.save1');
        });

        it('should ignore comment lines and empty lines', async () => {
            const ignoreContent = `# This is a comment

dev/working/
# Another comment

*.save*
`;

            await fs.writeFile(path.join(testDir, '.jpulse-ignore'), ignoreContent);
            const patterns = await MarkdownController._loadIgnorePatterns(testDir);

            expect(patterns).toHaveLength(2);
            expect(patterns[0].pattern).toBe('dev/working/');
            expect(patterns[1].pattern).toBe('*.save*');
        });
    });

    describe('_shouldIgnore', () => {
        let patterns;

        beforeEach(() => {
            patterns = [
                {
                    pattern: 'dev/working/',
                    regex: /^dev\/working$/,
                    isDirectory: true
                },
                {
                    pattern: '*.save*',
                    regex: /^.*\.save.*$/,
                    isDirectory: false
                },
                {
                    pattern: 'temp.md',
                    regex: /^temp\.md$/,
                    isDirectory: false
                }
            ];
        });

        it('should ignore files matching exact patterns', () => {
            expect(MarkdownController._shouldIgnore('temp.md', false, patterns)).toBe(true);
            expect(MarkdownController._shouldIgnore('other.md', false, patterns)).toBe(false);
        });

        it('should ignore files matching wildcard patterns', () => {
            expect(MarkdownController._shouldIgnore('file.save1', false, patterns)).toBe(true);
            expect(MarkdownController._shouldIgnore('api.save.backup', false, patterns)).toBe(true);
            expect(MarkdownController._shouldIgnore('normal.md', false, patterns)).toBe(false);
        });

        it('should ignore directories matching directory patterns', () => {
            expect(MarkdownController._shouldIgnore('dev/working', true, patterns)).toBe(true);
            expect(MarkdownController._shouldIgnore('dev/other', true, patterns)).toBe(false);
        });

        it('should ignore files inside ignored directories', () => {
            expect(MarkdownController._shouldIgnore('dev/working/file.md', false, patterns)).toBe(true);
            expect(MarkdownController._shouldIgnore('dev/working/sub/file.md', false, patterns)).toBe(true);
            expect(MarkdownController._shouldIgnore('dev/other/file.md', false, patterns)).toBe(false);
        });

        it('should not match directory patterns against files', () => {
            // Directory pattern should not match files with same name
            expect(MarkdownController._shouldIgnore('dev/working.md', false, patterns)).toBe(false);
        });

        it('should handle empty patterns array', () => {
            expect(MarkdownController._shouldIgnore('any.md', false, [])).toBe(false);
            expect(MarkdownController._shouldIgnore('any/dir', true, [])).toBe(false);
        });
    });

    describe('Integration with _scanMarkdownFiles', () => {
        beforeEach(async () => {
            // Create test directory structure
            await fs.mkdir(path.join(testDir, 'dev'), { recursive: true });
            await fs.mkdir(path.join(testDir, 'dev', 'working'), { recursive: true });
            await fs.mkdir(path.join(testDir, 'api'), { recursive: true });

            // Create test files
            await fs.writeFile(path.join(testDir, 'README.md'), '# Root README');
            await fs.writeFile(path.join(testDir, 'guide.md'), '# Guide');
            await fs.writeFile(path.join(testDir, 'temp.md'), '# Temp');
            await fs.writeFile(path.join(testDir, 'backup.save1.md'), '# Backup');

            await fs.writeFile(path.join(testDir, 'dev', 'README.md'), '# Dev README');
            await fs.writeFile(path.join(testDir, 'dev', 'architecture.md'), '# Architecture');

            await fs.writeFile(path.join(testDir, 'dev', 'working', 'draft.md'), '# Draft');
            await fs.writeFile(path.join(testDir, 'dev', 'working', 'notes.md'), '# Notes');

            await fs.writeFile(path.join(testDir, 'api', 'README.md'), '# API README');

            // Create ignore file
            const ignoreContent = `dev/working/
temp.md
*.save*`;
            await fs.writeFile(path.join(testDir, '.jpulse-ignore'), ignoreContent);
        });

        it('should filter out ignored files and directories', async () => {
            const patterns = await MarkdownController._loadIgnorePatterns(testDir);
            const files = await MarkdownController._scanMarkdownFiles(testDir, '', 'test', patterns);

            // Should have root README as container
            expect(files).toHaveLength(1);
            expect(files[0].name).toBe('README.md');
            expect(files[0].isDirectory).toBe(true);

            const rootFiles = files[0].files;

            // Should include guide.md but not temp.md or *.save* files
            const fileNames = rootFiles.filter(f => !f.isDirectory).map(f => f.name);
            expect(fileNames).toContain('guide.md');
            expect(fileNames).not.toContain('temp.md');
            expect(fileNames).not.toContain('backup.save1.md');

            // Should include dev and api directories
            const dirNames = rootFiles.filter(f => f.isDirectory).map(f => f.title);
            expect(dirNames).toContain('Dev');
            // API directory name can be either "Api" or "API" depending on titleCaseFix config
            expect(dirNames.some(name => name === 'Api' || name === 'API')).toBe(true);

            // Dev directory should not contain working subdirectory
            const devDir = rootFiles.find(f => f.title === 'Dev');
            expect(devDir.files).toHaveLength(1); // Only architecture.md
            expect(devDir.files[0].name).toBe('architecture.md');
        });

        it('should work without ignore file', async () => {
            // Remove ignore file
            await fs.unlink(path.join(testDir, '.jpulse-ignore'));

            const patterns = await MarkdownController._loadIgnorePatterns(testDir);
            const files = await MarkdownController._scanMarkdownFiles(testDir, '', 'test', patterns);

            expect(files).toHaveLength(1);
            const rootFiles = files[0].files;

            // Should include all files when no ignore patterns
            const fileNames = rootFiles.filter(f => !f.isDirectory).map(f => f.name);
            expect(fileNames).toContain('guide.md');
            expect(fileNames).toContain('temp.md');
            expect(fileNames).toContain('backup.save1.md');

            // Dev directory should contain working subdirectory
            const devDir = rootFiles.find(f => f.title === 'Dev');
            expect(devDir.files.length).toBeGreaterThan(1);
        });
    });
});

// EOF webapp/tests/unit/controller/markdown-ignore.test.js
