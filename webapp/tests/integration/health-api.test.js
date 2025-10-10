/**
 * @name            jPulse Framework / WebApp / Tests / Integration / Health API
 * @tagline         Integration tests for Health API endpoints
 * @description     Integration tests for health and metrics API endpoints
 * @file            webapp/tests/integration/health-api.test.js
 * @version         0.9.6
 * @release         2025-10-10
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           80%, Cursor 1.2, Claude Sonnet 4
 */

import request from 'supertest';
import { jest } from '@jest/globals';
import TestHelper from '../helpers/test-helper.js';

describe('Health API Integration Tests', () => {
    let app;
    let adminAgent;
    let userAgent;
    let guestAgent;

    beforeAll(async () => {
        app = await TestHelper.setupTestApp();
        
        // Create authenticated agents
        adminAgent = request.agent(app);
        userAgent = request.agent(app);
        guestAgent = request.agent(app);

        // Login admin user
        await TestHelper.loginUser(adminAgent, 'admin', 'admin123');
        
        // Login regular user  
        await TestHelper.loginUser(userAgent, 'testuser', 'password123');
        
        // guestAgent remains unauthenticated
    });

    afterAll(async () => {
        await TestHelper.cleanup();
    });

    describe('GET /api/1/health', () => {
        it('should return health status for guest users', async () => {
            const response = await guestAgent
                .get('/api/1/health')
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual({
                success: true,
                status: 'ok',
                data: expect.objectContaining({
                    version: expect.any(String),
                    release: expect.any(String),
                    uptime: expect.any(Number),
                    environment: expect.any(String),
                    database: 'connected',
                    timestamp: expect.any(String)
                })
            });
        });

        it('should return health status for authenticated users', async () => {
            const response = await userAgent
                .get('/api/1/health')
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe('ok');
            expect(response.body.data.version).toBeDefined();
        });

        it('should return health status for admin users', async () => {
            const response = await adminAgent
                .get('/api/1/health')
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe('ok');
            expect(response.body.data.version).toBeDefined();
        });

        it('should have consistent response format', async () => {
            const response = await guestAgent
                .get('/api/1/health')
                .expect(200);

            const { data } = response.body;
            
            // Validate timestamp format
            expect(new Date(data.timestamp)).toBeInstanceOf(Date);
            expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            
            // Validate uptime is reasonable
            expect(data.uptime).toBeGreaterThan(0);
            expect(data.uptime).toBeLessThan(86400); // Less than 24 hours for tests
            
            // Validate environment
            expect(['development', 'test', 'production']).toContain(data.environment);
        });
    });

    describe('GET /api/1/metrics', () => {
        it('should return basic metrics for guest users', async () => {
            const response = await guestAgent
                .get('/api/1/metrics')
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual({
                success: true,
                data: expect.objectContaining({
                    status: 'ok',
                    version: expect.any(String),
                    release: expect.any(String),
                    uptime: expect.any(Number),
                    uptimeFormatted: expect.any(String),
                    environment: expect.any(String),
                    database: expect.objectContaining({
                        status: 'connected',
                        name: expect.any(String)
                    }),
                    memory: expect.objectContaining({
                        used: expect.any(Number),
                        total: expect.any(Number)
                    }),
                    timestamp: expect.any(String)
                })
            });

            // Should not include admin-only data
            expect(response.body.data.system).toBeUndefined();
            expect(response.body.data.websockets).toBeUndefined();
            expect(response.body.data.process).toBeUndefined();
            expect(response.body.data.deployment).toBeUndefined();
        });

        it('should return basic metrics for regular users', async () => {
            const response = await userAgent
                .get('/api/1/metrics')
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body.success).toBe(true);
            expect(response.body.data.memory).toBeDefined();
            
            // Should not include admin-only data
            expect(response.body.data.system).toBeUndefined();
            expect(response.body.data.websockets).toBeUndefined();
            expect(response.body.data.process).toBeUndefined();
        });

        it('should return detailed metrics for admin users', async () => {
            const response = await adminAgent
                .get('/api/1/metrics')
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual({
                success: true,
                data: expect.objectContaining({
                    status: 'ok',
                    version: expect.any(String),
                    // Basic metrics
                    memory: expect.objectContaining({
                        used: expect.any(Number),
                        total: expect.any(Number)
                    }),
                    // Admin-only metrics
                    system: expect.objectContaining({
                        platform: expect.any(String),
                        arch: expect.any(String),
                        nodeVersion: expect.any(String),
                        cpus: expect.any(Number),
                        hostname: expect.any(String),
                        loadAverage: expect.any(Array),
                        freeMemory: expect.any(Number),
                        totalMemory: expect.any(Number)
                    }),
                    websockets: expect.objectContaining({
                        uptime: expect.any(Number),
                        totalMessages: expect.any(Number),
                        namespaces: expect.any(Number),
                        activeConnections: expect.any(Number)
                    }),
                    process: expect.objectContaining({
                        pid: expect.any(Number),
                        memoryUsage: expect.any(Object)
                    }),
                    deployment: expect.objectContaining({
                        mode: expect.any(String),
                        config: expect.any(Object)
                    })
                })
            });
        });

        it('should format uptime correctly', async () => {
            const response = await guestAgent
                .get('/api/1/metrics')
                .expect(200);

            const { uptimeFormatted } = response.body.data;
            
            // Should match expected format patterns
            expect(uptimeFormatted).toMatch(/^\d+[dhms](\s\d+[dhms])*$/);
            
            // Should end with 's' for seconds
            expect(uptimeFormatted).toMatch(/\d+s$/);
        });

        it('should have reasonable memory values', async () => {
            const response = await adminAgent
                .get('/api/1/metrics')
                .expect(200);

            const { memory, system } = response.body.data;
            
            // Memory should be positive numbers
            expect(memory.used).toBeGreaterThan(0);
            expect(memory.total).toBeGreaterThan(memory.used);
            
            // System memory should be much larger than heap memory
            expect(system.totalMemory).toBeGreaterThan(memory.total);
            expect(system.freeMemory).toBeGreaterThan(0);
            expect(system.freeMemory).toBeLessThan(system.totalMemory);
        });

        it('should include valid system information for admins', async () => {
            const response = await adminAgent
                .get('/api/1/metrics')
                .expect(200);

            const { system } = response.body.data;
            
            // Validate system info
            expect(['darwin', 'linux', 'win32']).toContain(system.platform);
            expect(['x64', 'arm64', 'ia32']).toContain(system.arch);
            expect(system.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
            expect(system.cpus).toBeGreaterThan(0);
            expect(system.hostname).toBeTruthy();
            expect(Array.isArray(system.loadAverage)).toBe(true);
            expect(system.loadAverage).toHaveLength(3);
        });
    });

    describe('GET /admin/status.shtml', () => {
        it('should require authentication', async () => {
            await guestAgent
                .get('/admin/status.shtml')
                .expect(401);
        });

        it('should require admin role', async () => {
            await userAgent
                .get('/admin/status.shtml')
                .expect(403);
        });

        it('should render status page for admin users', async () => {
            const response = await adminAgent
                .get('/admin/status.shtml')
                .expect(200)
                .expect('Content-Type', /html/);

            // Should contain status page elements
            expect(response.text).toContain('System Status');
            expect(response.text).toContain('Memory Usage');
            expect(response.text).toContain('Database');
            expect(response.text).toContain('WebSockets');
        });

        it('should include refresh functionality', async () => {
            const response = await adminAgent
                .get('/admin/status.shtml')
                .expect(200);

            expect(response.text).toContain('Refresh');
            expect(response.text).toContain('/api/1/health');
            expect(response.text).toContain('/api/1/metrics');
        });
    });

    describe('API Response Performance', () => {
        it('should respond to health endpoint quickly', async () => {
            const startTime = Date.now();
            
            await guestAgent
                .get('/api/1/health')
                .expect(200);
            
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(100); // Should respond in under 100ms
        });

        it('should respond to metrics endpoint quickly', async () => {
            const startTime = Date.now();
            
            await adminAgent
                .get('/api/1/metrics')
                .expect(200);
            
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(200); // Admin metrics may take slightly longer
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid routes gracefully', async () => {
            await guestAgent
                .get('/api/1/health/invalid')
                .expect(404);
        });

        it('should handle malformed requests', async () => {
            await guestAgent
                .post('/api/1/health')
                .expect(404); // Method not allowed should return 404 with current routing
        });
    });
});

// EOF webapp/tests/integration/health-api.test.js
