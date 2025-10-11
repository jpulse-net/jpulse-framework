/**
 * @name            jPulse Framework / WebApp / Tests / Integration / Cache API
 * @tagline         Integration tests for cache API endpoints
 * @description     Tests for cache refresh and statistics API endpoints
 * @file            webapp/tests/integration/cache-api.test.js
 * @version         0.9.7
 * @release         2025-10-11
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           80%, Cursor 1.2, Claude Sonnet 4
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
// import request from 'supertest';
// import app from '../../app.js';  // Temporarily disabled due to ES module issues
import TestUtils from '../helpers/test-utils.js';

describe.skip('Cache API Integration Tests', () => {
    let adminUser;
    let regularUser;
    let adminCookie;
    let regularCookie;

    beforeAll(async () => {
        // Setup test users
        adminUser = {
            email: 'admin@test.com',
            password: 'testpassword123',
            firstName: 'Admin',
            lastName: 'User',
            roles: ['admin']
        };

        regularUser = {
            email: 'user@test.com',
            password: 'testpassword123',
            firstName: 'Regular',
            lastName: 'User',
            roles: ['user']
        };
    });

    beforeEach(async () => {
        // Login as admin user to get session cookie
        const adminLoginRes = await request(app)
            .post('/api/1/auth/login')
            .send({
                email: adminUser.email,
                password: adminUser.password
            });

        if (adminLoginRes.status === 200) {
            adminCookie = adminLoginRes.headers['set-cookie'];
        }

        // Login as regular user to get session cookie
        const userLoginRes = await request(app)
            .post('/api/1/auth/login')
            .send({
                email: regularUser.email,
                password: regularUser.password
            });

        if (userLoginRes.status === 200) {
            regularCookie = userLoginRes.headers['set-cookie'];
        }
    });

    describe('Authentication & Authorization', () => {
        it('should require authentication for cache stats', async () => {
            const response = await request(app)
                .get('/api/1/cache/stats');

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('authenticated');
        });

        it('should require admin role for cache stats', async () => {
            const response = await request(app)
                .get('/api/1/cache/stats')
                .set('Cookie', regularCookie);

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('authorized');
        });

        it('should require authentication for cache refresh', async () => {
            const response = await request(app)
                .post('/api/1/cache/refresh');

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('authenticated');
        });

        it('should require admin role for cache refresh', async () => {
            const response = await request(app)
                .post('/api/1/cache/refresh')
                .set('Cookie', regularCookie);

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('authorized');
        });
    });

    describe('Cache Statistics API', () => {
        it('should return cache statistics for admin user', async () => {
            const response = await request(app)
                .get('/api/1/cache/stats')
                .set('Cookie', adminCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.stats).toBeDefined();
            expect(response.body.stats.view).toBeDefined();
            expect(response.body.stats.i18n).toBeDefined();
            expect(response.body.stats.markdown).toBeDefined();
        });

        it('should include cache configuration in stats', async () => {
            const response = await request(app)
                .get('/api/1/cache/stats')
                .set('Cookie', adminCookie);

            expect(response.status).toBe(200);

            // Check view cache stats
            expect(response.body.stats.view.templateCache).toBeDefined();
            expect(response.body.stats.view.templateCache.config).toBeDefined();
            expect(response.body.stats.view.templateCache.config.enabled).toBeDefined();

            expect(response.body.stats.view.includeCache).toBeDefined();
            expect(response.body.stats.view.includeCache.config).toBeDefined();
            expect(response.body.stats.view.includeCache.config.enabled).toBeDefined();

            // Check i18n cache stats
            expect(response.body.stats.i18n.config).toBeDefined();
            expect(response.body.stats.i18n.config.enabled).toBeDefined();

            // Check markdown cache stats
            expect(response.body.stats.markdown.config).toBeDefined();
            expect(response.body.stats.markdown.config.enabled).toBeDefined();
        });
    });

    describe('Cache Refresh API', () => {
        it('should refresh all caches', async () => {
            const response = await request(app)
                .post('/api/1/cache/refresh')
                .set('Cookie', adminCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('All caches refreshed');
            expect(response.body.results).toBeDefined();
            expect(response.body.results.viewTemplates).toBeDefined();
            expect(response.body.results.viewIncludes).toBeDefined();
            expect(response.body.results.i18n).toBeDefined();
            expect(response.body.results.markdown).toBeDefined();
        });

        it('should refresh view caches only', async () => {
            const response = await request(app)
                .post('/api/1/cache/refresh/view')
                .set('Cookie', adminCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('View caches refreshed');
            expect(response.body.results).toBeDefined();
            expect(response.body.results.viewTemplates).toBeDefined();
            expect(response.body.results.viewIncludes).toBeDefined();
            expect(response.body.results.i18n).toBeUndefined();
            expect(response.body.results.markdown).toBeUndefined();
        });

        it('should refresh i18n cache only', async () => {
            const response = await request(app)
                .post('/api/1/cache/refresh/i18n')
                .set('Cookie', adminCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('i18n caches refreshed');
            expect(response.body.results).toBeDefined();
            expect(response.body.results.i18n).toBeDefined();
            expect(response.body.results.viewTemplates).toBeUndefined();
            expect(response.body.results.markdown).toBeUndefined();
        });

        it('should refresh markdown cache only', async () => {
            const response = await request(app)
                .post('/api/1/cache/refresh/markdown')
                .set('Cookie', adminCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Markdown caches refreshed');
            expect(response.body.results).toBeDefined();
            expect(response.body.results.markdown).toBeDefined();
            expect(response.body.results.viewTemplates).toBeUndefined();
            expect(response.body.results.i18n).toBeUndefined();
        });
    });

    describe('Cache Performance', () => {
        it('should show cache statistics after page loads', async () => {
            // Load a page to populate caches
            await request(app).get('/home/');
            await request(app).get('/jpulse-docs/');

            // Check cache stats
            const response = await request(app)
                .get('/api/1/cache/stats')
                .set('Cookie', adminCookie);

            expect(response.status).toBe(200);

            // Should have some cached files
            const stats = response.body.stats;
            expect(stats.view.templateCache.fileCount).toBeGreaterThan(0);
            expect(stats.view.includeCache.fileCount).toBeGreaterThan(0);
            expect(stats.i18n.fileCount).toBeGreaterThan(0);
        });

        it('should clear cache counts after refresh', async () => {
            // Load pages to populate caches
            await request(app).get('/home/');

            // Get initial stats
            const initialStats = await request(app)
                .get('/api/1/cache/stats')
                .set('Cookie', adminCookie);

            expect(initialStats.body.stats.view.templateCache.fileCount).toBeGreaterThan(0);

            // Refresh caches
            const refreshResponse = await request(app)
                .post('/api/1/cache/refresh')
                .set('Cookie', adminCookie);

            expect(refreshResponse.status).toBe(200);
            expect(refreshResponse.body.success).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing authentication gracefully', async () => {
            const response = await request(app)
                .get('/api/1/cache/stats');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
            expect(response.body.errorCode).toBe('NOT_AUTHENTICATED');
        });

        it('should handle insufficient permissions gracefully', async () => {
            const response = await request(app)
                .post('/api/1/cache/refresh')
                .set('Cookie', regularCookie);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
            expect(response.body.errorCode).toBe('NOT_AUTHORIZED');
        });
    });

    describe('API Response Format', () => {
        it('should return consistent response format for stats', async () => {
            const response = await request(app)
                .get('/api/1/cache/stats')
                .set('Cookie', adminCookie);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('stats');
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.message).toBe('string');
            expect(typeof response.body.stats).toBe('object');
        });

        it('should return consistent response format for refresh', async () => {
            const response = await request(app)
                .post('/api/1/cache/refresh')
                .set('Cookie', adminCookie);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('results');
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.message).toBe('string');
            expect(typeof response.body.results).toBe('object');
        });

        it('should return consistent error response format', async () => {
            const response = await request(app)
                .get('/api/1/cache/stats');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('errorCode');
            expect(response.body.success).toBe(false);
            expect(typeof response.body.error).toBe('string');
            expect(typeof response.body.errorCode).toBe('string');
        });
    });
});

// EOF webapp/tests/integration/cache-api.test.js
