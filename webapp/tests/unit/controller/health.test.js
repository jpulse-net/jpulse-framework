/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Health Controller
 * @tagline         Unit tests for Health Controller
 * @description     Unit tests for the Health Controller
 * @file            webapp/tests/unit/controller/health.test.js
 * @version         0.9.6
 * @release         2025-10-10
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           80%, Cursor 1.2, Claude Sonnet 4
 */

import { jest } from '@jest/globals';
import HealthController from '../../../controller/health.js';

// Mock dependencies
const mockLogController = {
    logRequest: jest.fn(),
    logInfo: jest.fn(),
    logError: jest.fn()
};

const mockAuthController = {
    isAuthorized: jest.fn()
};

const mockWebSocketController = {
    getStats: jest.fn()
};

// Mock globals
global.LogController = mockLogController;
global.AuthController = mockAuthController;
global.WebSocketController = mockWebSocketController;
global.appConfig = {
    app: {
        version: '0.9.6',
        release: '2025-10-10'
    },
    deployment: {
        mode: 'test',
        test: {
            name: 'Test Environment',
            db: 'jp-test'
        }
    }
};

describe('HealthController', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock request object
        mockReq = {
            user: null,
            session: {},
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test-agent' }
        };

        // Mock response object
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };

        // Mock WebSocket stats
        mockWebSocketController.getStats.mockReturnValue({
            uptime: 3600000,
            totalMessages: 1000,
            namespaces: [
                {
                    path: '/ws/test',
                    clientCount: 5,
                    activeUsers: 3,
                    messagesPerMin: 10,
                    totalMessages: 500,
                    lastActivity: new Date().toISOString()
                }
            ]
        });
    });

    describe('health()', () => {
        it('should return basic health information', async () => {
            await HealthController.health(mockReq, mockRes);

            expect(mockLogController.logRequest).toHaveBeenCalledWith(mockReq, 'health.health', '');
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                status: 'ok',
                data: expect.objectContaining({
                    version: '0.9.6',
                    release: '2025-10-10',
                    uptime: expect.any(Number),
                    environment: 'test',
                    database: 'connected',
                    timestamp: expect.any(String)
                })
            });
            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                mockReq,
                'health.health',
                expect.stringContaining('success: completed in')
            );
        });

        it('should handle errors gracefully', async () => {
            // Mock an error in the health check
            const originalAppConfig = global.appConfig;
            global.appConfig = null;

            await HealthController.health(mockReq, mockRes);

            expect(mockLogController.logError).toHaveBeenCalledWith(
                mockReq,
                'health.health',
                expect.stringContaining('error:')
            );
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                status: 'error',
                error: 'Health check failed',
                code: 'HEALTH_CHECK_ERROR'
            });

            // Restore
            global.appConfig = originalAppConfig;
        });
    });

    describe('metrics()', () => {
        it('should return basic metrics for non-admin users', async () => {
            mockAuthController.isAuthorized.mockReturnValue(false);

            await HealthController.metrics(mockReq, mockRes);

            expect(mockAuthController.isAuthorized).toHaveBeenCalledWith(mockReq, ['admin', 'root']);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    status: 'ok',
                    version: '0.9.6',
                    release: '2025-10-10',
                    uptime: expect.any(Number),
                    uptimeFormatted: expect.any(String),
                    environment: 'test',
                    database: expect.objectContaining({
                        status: 'connected',
                        name: 'jp-test'
                    }),
                    memory: expect.objectContaining({
                        used: expect.any(Number),
                        total: expect.any(Number)
                    }),
                    timestamp: expect.any(String)
                })
            });

            // Should not include admin-only data
            const responseData = mockRes.json.mock.calls[0][0].data;
            expect(responseData.system).toBeUndefined();
            expect(responseData.websockets).toBeUndefined();
            expect(responseData.process).toBeUndefined();
            expect(responseData.deployment).toBeUndefined();
        });

        it('should return detailed metrics for admin users', async () => {
            mockAuthController.isAuthorized.mockReturnValue(true);

            await HealthController.metrics(mockReq, mockRes);

            expect(mockAuthController.isAuthorized).toHaveBeenCalledWith(mockReq, ['admin', 'root']);
            expect(mockWebSocketController.getStats).toHaveBeenCalled();
            
            const responseData = mockRes.json.mock.calls[0][0].data;
            
            // Should include admin-only data
            expect(responseData.system).toEqual(expect.objectContaining({
                platform: expect.any(String),
                arch: expect.any(String),
                nodeVersion: expect.any(String),
                cpus: expect.any(Number),
                hostname: expect.any(String),
                loadAverage: expect.any(Array),
                freeMemory: expect.any(Number),
                totalMemory: expect.any(Number)
            }));

            expect(responseData.websockets).toEqual(expect.objectContaining({
                uptime: expect.any(Number),
                totalMessages: expect.any(Number),
                namespaces: expect.any(Number),
                activeConnections: expect.any(Number)
            }));

            expect(responseData.process).toEqual(expect.objectContaining({
                pid: expect.any(Number),
                memoryUsage: expect.any(Object)
            }));

            expect(responseData.deployment).toEqual(expect.objectContaining({
                mode: 'test',
                config: expect.any(Object)
            }));
        });

        it('should handle metrics errors gracefully', async () => {
            mockAuthController.isAuthorized.mockImplementation(() => {
                throw new Error('Auth check failed');
            });

            await HealthController.metrics(mockReq, mockRes);

            expect(mockLogController.logError).toHaveBeenCalledWith(
                mockReq,
                'health.metrics',
                expect.stringContaining('error: Auth check failed')
            );
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Metrics collection failed',
                code: 'METRICS_ERROR'
            });
        });

        it('should log admin status in metrics call', async () => {
            mockAuthController.isAuthorized.mockReturnValue(true);

            await HealthController.metrics(mockReq, mockRes);

            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                mockReq,
                'health.metrics',
                expect.stringContaining('(admin: true)')
            );
        });
    });

    describe('_formatUptime()', () => {
        it('should format seconds correctly', () => {
            expect(HealthController._formatUptime(30)).toBe('30s');
        });

        it('should format minutes and seconds correctly', () => {
            expect(HealthController._formatUptime(90)).toBe('1m 30s');
        });

        it('should format hours, minutes and seconds correctly', () => {
            expect(HealthController._formatUptime(3690)).toBe('1h 1m 30s');
        });

        it('should format days, hours, minutes and seconds correctly', () => {
            expect(HealthController._formatUptime(90090)).toBe('1d 1h 1m 30s');
        });

        it('should handle zero uptime', () => {
            expect(HealthController._formatUptime(0)).toBe('0s');
        });

        it('should handle large uptime values', () => {
            const sevenDays = 7 * 24 * 60 * 60;
            const result = HealthController._formatUptime(sevenDays);
            expect(result).toBe('7d 0h 0m 0s');
        });
    });

    describe('adminStatus()', () => {
        let mockNext;

        beforeEach(() => {
            mockNext = jest.fn();
        });

        it('should prepare template variables for admin status page', async () => {
            await HealthController.adminStatus(mockReq, mockRes, mockNext);

            expect(mockLogController.logRequest).toHaveBeenCalledWith(mockReq, 'health.adminStatus', '');
            expect(mockWebSocketController.getStats).toHaveBeenCalled();
            
            expect(mockReq.templateVars).toEqual(expect.objectContaining({
                pageTitle: 'System Status',
                statusData: expect.objectContaining({
                    system: expect.any(Object),
                    memory: expect.any(Object),
                    database: expect.any(Object),
                    websockets: expect.any(Object),
                    loadAverage: expect.any(Array),
                    timestamp: expect.any(String)
                })
            }));

            expect(mockNext).toHaveBeenCalled();
            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                mockReq,
                'health.adminStatus',
                expect.stringContaining('success: completed in')
            );
        });

        it('should handle admin status errors gracefully', async () => {
            mockWebSocketController.getStats.mockImplementation(() => {
                throw new Error('WebSocket stats failed');
            });

            global.CommonUtils = {
                sendError: jest.fn()
            };

            await HealthController.adminStatus(mockReq, mockRes, mockNext);

            expect(mockLogController.logError).toHaveBeenCalledWith(
                mockReq,
                'health.adminStatus',
                expect.stringContaining('error: WebSocket stats failed')
            );
            expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                500,
                'Status page error',
                'STATUS_PAGE_ERROR'
            );
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});

// EOF webapp/tests/unit/controller/health.test.js
