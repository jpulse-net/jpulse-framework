/**
 * @name            jPulse Framework / WebApp / Tests / Integration / Markdown System
 * @tagline         Integration tests for markdown system
 * @description     Tests for markdown system functions
 * @file            webapp/tests/integration/markdown-system.test.js
 * @version         0.5.3
 * @release         2025-09-08
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';

describe('Markdown System Integration', () => {
    let app;
    const testDocsDir = path.join(process.cwd(), 'site/webapp/static/assets/integration-test');

    beforeAll(async () => {
        // Import the app after setting up test environment
        const appModule = await import('../../app.js');
        app = appModule.default;

        // Create test documentation
        await fs.mkdir(testDocsDir, { recursive: true });
        await fs.writeFile(
            path.join(testDocsDir, 'README.md'),
            '# Integration Test\nThis tests the full markdown system.'
        );
        await fs.writeFile(
            path.join(testDocsDir, 'test-guide.md'),
            '# Test Guide\nThis is a test guide document.'
        );
    });

    afterAll(async () => {
        // Clean up test files
        await fs.rm(testDocsDir, { recursive: true, force: true });
    });

    it('should serve markdown API endpoints', async () => {
        const response = await request(app)
            .get('/api/1/markdown/integration-test/')
            .expect(200);

        expect(response.body).toHaveProperty('files');
        expect(response.body.files).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'README.md' }),
                expect.objectContaining({ name: 'test-guide.md' })
            ])
        );
    });

    it('should serve specific markdown files', async () => {
        const response = await request(app)
            .get('/api/1/markdown/integration-test/README.md')
            .expect(200);

        expect(response.body).toEqual({
            content: '# Integration Test\nThis tests the full markdown system.',
            path: 'README.md'
        });
    });

    it('should serve jPulse documentation view', async () => {
        const response = await request(app)
            .get('/jpulse/')
            .expect(200);

        expect(response.text).toContain('jPulse Framework Documentation');
        expect(response.text).toContain('marked.min.js');
    });
});

// EOF webapp/tests/integration/markdown-system.test.js
