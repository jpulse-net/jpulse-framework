/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Admin View
 * @tagline         Unit tests for admin dashboard view rendering (W-013)
 * @description     Tests admin dashboard view controller functionality and template rendering
 * @file            webapp/tests/unit/controller/admin-view.test.js
 * @version         0.6.8
 * @release         2025-09-13
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Import modules dynamically after global setup completes
let viewController;
let AuthController;

// Mock dependencies
jest.mock('../../../controller/log.js', () => ({
    logRequest: jest.fn(),
    logError: jest.fn(),
    logInfo: jest.fn()
}));

jest.mock('../../../model/config.js', () => ({
    findById: jest.fn().mockResolvedValue({
        data: { siteName: 'Test Site' }
    })
}));

// Mock W-014 modules
jest.mock('../../../utils/path-resolver.js', () => ({
    default: {
        resolveModule: jest.fn((path) => `/Users/peterthoeny/Dev/jpulse-framework/webapp/${path}`)
    }
}));

jest.mock('../../../utils/site-registry.js', () => ({
    default: {
        initialize: jest.fn(),
        registerApiRoutes: jest.fn()
    }
}));

jest.mock('../../../utils/context-extensions.js', () => ({
    default: {
        initialize: jest.fn(),
        getExtendedContext: jest.fn(async (baseContext) => baseContext)
    }
}));

// Mock global appConfig with site override values
global.appConfig = {
    app: {
        name: 'jPulse Framework - Custom Site',
        version: '0.4.10',
        release: '2025-09-06',
        dirName: process.cwd() + '/webapp'
    },
    controller: {
        view: {
            defaultTemplate: 'index.shtml'
        }
    }
};

// Mock global i18n
const mockI18n = {
    getLang: jest.fn((lang) => ({
        view: {
            admin: {
                index: {
                    title: lang === 'de' ? 'Admin Dashboard' : 'Admin Dashboard',
                    subtitle: lang === 'de' ? 'Verwalten Sie Ihre App' : 'Manage your app',
                    viewLogs: lang === 'de' ? 'Logs anzeigen' : 'View Logs',
                    viewLogsDesc: lang === 'de' ? 'Systemaktivität' : 'System activity',
                    siteConfig: lang === 'de' ? 'Site-Konfiguration' : 'Site Config',
                    siteConfigDesc: lang === 'de' ? 'Globale Einstellungen' : 'Global settings',
                    users: lang === 'de' ? 'Benutzer' : 'Users',
                    usersDesc: lang === 'de' ? 'Konten verwalten' : 'Manage accounts'
                }
            }
        }
    })),
    translate: jest.fn((req, keyPath, context = {}) => {
        const translations = {
            'controller.view.internalServerError': `Internal server error: ${context.error || 'Unknown error'}`,
            'controller.view.pageNotFoundError': `Page not found: ${context.path || 'Unknown path'}`
        };
        return translations[keyPath] || keyPath;
    })
};

global.i18n = mockI18n;

describe.skip('Admin Dashboard View Rendering (W-013)', () => {
    let mockReq, mockRes;

    beforeEach(async () => {
        // Dynamic imports ensure global setup has completed
        if (!viewController) {
            viewController = (await import('../../../controller/view.js')).default;
            AuthController = (await import('../../../controller/auth.js')).default;
        }

        // Reset mocks
        jest.clearAllMocks();

        // Mock request object for admin dashboard
        mockReq = {
            path: '/admin/',
            url: '/admin/',
            protocol: 'http',
            hostname: 'localhost',
            get: jest.fn((header) => {
                if (header === 'host') return 'localhost:8080';
                return undefined;
            }),
            session: {
                user: {
                    id: 'admin123',
                    username: 'adminuser',
                    firstName: 'Admin',
                    lastName: 'User',
                    email: 'admin@example.com',
                    authenticated: true,
                    roles: ['admin'],
                    preferences: {
                        language: 'en'
                    }
                }
            },
            query: {},
            ip: '127.0.0.1',
            connection: { remoteAddress: '127.0.0.1' }
        };

        // Mock response object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis()
        };

        // Mock AuthController.getUserLanguage
        jest.spyOn(AuthController, 'getUserLanguage').mockImplementation((req) => {
            return req?.session?.user?.preferences?.language || 'en';
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Admin dashboard view loading', () => {
        test('should load admin dashboard template', async () => {
            // Mock file system to simulate admin/index.shtml exists
            const mockTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>{{i18n.view.admin.index.title}}</title>
</head>
<body>
    <div class="jp-main">
        <div class="jp-container-800">
            <div class="jp-dashboard-grid">
                <a href="/admin/logs.shtml">{{i18n.view.admin.index.viewLogs}}</a>
                <a href="/admin/config.shtml">{{i18n.view.admin.index.siteConfig}}</a>
                <a href="/admin/users.shtml">{{i18n.view.admin.index.users}}</a>
            </div>
        </div>
    </div>
</body>
</html>`;

            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockTemplate);

            await viewController.load(mockReq, mockRes);

            expect(mockRes.send).toHaveBeenCalled();
            const renderedContent = mockRes.send.mock.calls[0][0];
            
            // Check that i18n variables were processed
            expect(renderedContent).toContain('Admin Dashboard');
            expect(renderedContent).toContain('View Logs');
            expect(renderedContent).toContain('Site Config');
            expect(renderedContent).toContain('Users');
        });

        test('should use German translations for German users', async () => {
            mockReq.session.user.preferences.language = 'de';

            const mockTemplate = `<h1>{{i18n.view.admin.index.title}}</h1><p>{{i18n.view.admin.index.subtitle}}</p>`;

            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockTemplate);

            await viewController.load(mockReq, mockRes);

            expect(mockRes.send).toHaveBeenCalled();
            const renderedContent = mockRes.send.mock.calls[0][0];
            
            expect(renderedContent).toContain('Verwalten Sie Ihre App');
        });

        test('should handle admin dashboard context variables', async () => {
            const mockTemplate = `
<div>
    <span>{{user.firstName}}</span>
    <span>{{user.roles}}</span>
    <span>{{app.name}}</span>
</div>`;

            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockTemplate);

            await viewController.load(mockReq, mockRes);

            expect(mockRes.send).toHaveBeenCalled();
            const renderedContent = mockRes.send.mock.calls[0][0];
            
            expect(renderedContent).toContain('Admin');
            expect(renderedContent).toContain('admin');
            expect(renderedContent).toContain('jPulse Framework - Custom Site');
        });
    });

    describe('Admin dashboard assets', () => {
        test('should reference correct asset paths', async () => {
            const mockTemplate = `
<div class="jp-dashboard-grid">
    <a href="/admin/logs.shtml" class="jp-card-dashboard jp-icon-btn">
        <div class="jp-icon-container">
            <img src="/assets/admin/icons/logs.svg" class="jp-icon" alt="">
        </div>
    </a>
    <a href="/admin/config.shtml" class="jp-card-dashboard jp-icon-btn">
        <div class="jp-icon-container">
            <img src="/assets/admin/icons/config.svg" class="jp-icon" alt="">
        </div>
    </a>
    <a href="/admin/users.shtml" class="jp-card-dashboard jp-icon-btn">
        <div class="jp-icon-container">
            <img src="/assets/admin/icons/users.svg" class="jp-icon" alt="">
        </div>
    </a>
</div>`;

            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockTemplate);

            await viewController.load(mockReq, mockRes);

            expect(mockRes.send).toHaveBeenCalled();
            const renderedContent = mockRes.send.mock.calls[0][0];
            
            // Check that asset paths are correct
            expect(renderedContent).toContain('/assets/admin/icons/logs.svg');
            expect(renderedContent).toContain('/assets/admin/icons/config.svg');
            expect(renderedContent).toContain('/assets/admin/icons/users.svg');
            
            // Check that CSS classes are present
            expect(renderedContent).toContain('jp-dashboard-grid');
            expect(renderedContent).toContain('jp-card-dashboard');
            expect(renderedContent).toContain('jp-icon-btn');
            expect(renderedContent).toContain('jp-icon-container');
        });

        test('should use correct link destinations', async () => {
            const mockTemplate = `
<a href="/admin/logs.shtml">Logs</a>
<a href="/admin/config.shtml">Config</a>
<a href="/admin/users.shtml">Users</a>`;

            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockTemplate);

            await viewController.load(mockReq, mockRes);

            expect(mockRes.send).toHaveBeenCalled();
            const renderedContent = mockRes.send.mock.calls[0][0];
            
            expect(renderedContent).toContain('href="/admin/logs.shtml"');
            expect(renderedContent).toContain('href="/admin/config.shtml"');
            expect(renderedContent).toContain('href="/admin/users.shtml"');
        });
    });

    describe('Error handling', () => {
        test('should handle missing admin template gracefully', async () => {
            mockReq.path = '/admin/nonexistent.shtml';

            jest.spyOn(fs, 'existsSync').mockReturnValue(false);

            await viewController.load(mockReq, mockRes);

            // Should send some response (either redirect or error message)
            expect(mockRes.send).toHaveBeenCalled();
        });

        test('should handle template read errors', async () => {
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('File read error'));

            await viewController.load(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('Security context', () => {
        test('should include user authentication status in context', async () => {
            const mockTemplate = `
<div>
    {{#if user.authenticated}}
        <span>Authenticated: {{user.username}}</span>
    {{else}}
        <span>Not authenticated</span>
    {{/if}}
</div>`;

            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockTemplate);

            await viewController.load(mockReq, mockRes);

            expect(mockRes.send).toHaveBeenCalled();
            const renderedContent = mockRes.send.mock.calls[0][0];
            
            expect(renderedContent).toContain('Authenticated: adminuser');
            expect(renderedContent).not.toContain('Not authenticated');
        });

        test('should include user roles in context', async () => {
            const mockTemplate = `<div>Roles: {{user.roles}}</div>`;

            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockTemplate);

            await viewController.load(mockReq, mockRes);

            expect(mockRes.send).toHaveBeenCalled();
            const renderedContent = mockRes.send.mock.calls[0][0];
            
            expect(renderedContent).toContain('Roles: admin');
        });
    });

    describe('Responsive design', () => {
        test('should include responsive CSS classes', async () => {
            const mockTemplate = `
<div class="jp-main">
    <div class="jp-container-800">
        <div class="jp-dashboard-grid">
            <div class="jp-card-dashboard">Content</div>
        </div>
    </div>
</div>`;

            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockTemplate);

            await viewController.load(mockReq, mockRes);

            expect(mockRes.send).toHaveBeenCalled();
            const renderedContent = mockRes.send.mock.calls[0][0];
            
            // Check responsive container classes
            expect(renderedContent).toContain('jp-main');
            expect(renderedContent).toContain('jp-container-800');
            expect(renderedContent).toContain('jp-dashboard-grid');
            expect(renderedContent).toContain('jp-card-dashboard');
        });
    });
});

// EOF webapp/tests/unit/controller/admin-view.test.js
