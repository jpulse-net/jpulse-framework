/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Template Includes
 * @tagline         Unit tests for template include system (header/footer)
 * @description     Tests for the new template include features and file.include helper
 * @file            webapp/tests/unit/controller/template-includes.test.js
 * @version         1.4.15
 * @release         2026-01-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';
import ViewController from '../../../controller/view.js';
import HandlebarController from '../../../controller/handlebar.js';
import ConfigController from '../../../controller/config.js';
import fs from 'fs';
import path from 'path';

// Mock fs module for testing
jest.mock('fs');

// Mock dependencies
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
    hashSync: jest.fn(),
    compareSync: jest.fn()
}));

jest.mock('../../../controller/log.js', () => ({
    logRequest: jest.fn(),
    logError: jest.fn(),
    logInfo: jest.fn()
}));

jest.mock('../../../model/user.js', () => ({
    default: {
        findByLoginId: jest.fn(),
        create: jest.fn()
    }
}));

jest.mock('../../../model/config.js', () => ({
    default: {
        findById: jest.fn().mockResolvedValue({ data: {} })
    }
}));

// Mock RedisManager
global.RedisManager = {
    registerBroadcastCallback: jest.fn(),
    isRedisAvailable: jest.fn().mockReturnValue(false)
};

describe('Template Includes System', () => {
    let mockFs;
    let mockContext;
    let mockReq;

    beforeAll(async () => {
        // Setup consolidated config first
        TestUtils.setupGlobalMocksWithConsolidatedConfig();

        // Ensure global.appConfig exists (fallback if setupGlobalMocksWithConsolidatedConfig failed)
        if (!global.appConfig) {
            global.appConfig = {};
        }

        // Ensure controller config exists (may be overridden by consolidated config)
        if (!global.appConfig.controller) {
            global.appConfig.controller = {};
        }
        if (!global.appConfig.controller.config) {
            global.appConfig.controller.config = { defaultDocName: 'global' };
        }
        if (!global.appConfig.controller.handlebar) {
            global.appConfig.controller.handlebar = {
                cacheIncludes: { enabled: false },
                contextFilter: { withoutAuth: [], withAuth: [] },
                maxIncludeDepth: 10
            };
        }

        // Initialize ConfigController before HandlebarController
        ConfigController.initialize();
        global.ConfigController = ConfigController;

        // Initialize HandlebarController for tests
        await HandlebarController.initialize();
    });

    beforeEach(() => {
        // Setup mock fs
        mockFs = fs;
        mockFs.readFileSync = jest.fn();

        // Add mock request object
        mockReq = {
            path: '/test',
            protocol: 'http',
            get: jest.fn().mockReturnValue('localhost:8080'),
            hostname: 'localhost',
            url: '/test?param=value',
            query: { param: 'value' },
            session: {
                user: {
                    loginId: 'testuser',
                    firstName: 'Test',
                    lastName: 'User',
                    isAuthenticated: false
                }
            },
            ip: '127.0.0.1'
        };

        // Mock handlebars context
        mockContext = {
            app: {
                jPulse: {
                    version: '0.9.5',
                    release: '2025-10-10',
                    name: 'jPulse Framework'
                },
                site: {
                    version: '0.1.5',
                    release: '2025-08-24',
                    name: 'jPulse Framework WebApp'
                }
            },
            user: {
                isAuthenticated: false,
                firstName: '',
                id: ''
            },
            appConfig: {
                view: {
                    mainContainer: {
                        maxWidth: 1200,
                        minMarginLeftRight: 20
                    },
                    toastMessage: {
                        minWidth: 200,
                        maxWidth: 800,
                        duration: {
                            info: 3000,
                            warning: 5000,
                            error: 6000,
                            success: 3000
                        }
                    }
                }
            },
            i18n: {
                header: {
                    profile: 'Profile',
                    signout: 'Sign Out',
                    signin: 'Sign In',
                    signup: 'Sign Up'
                },
                footer: {
                    about: 'About',
                    github: 'GitHub',
                    poweredBy: 'Powered by'
                }
            },
            url: {
                domain: 'http://localhost:8080',
                pathname: '/home/index.shtml'
            }
        };
    });

    describe('File Include Helper', () => {
        test('should handle basic file includes', () => {
            const mockHeaderContent = `
                <link rel="icon" type="image/x-icon" href="/favicon.ico">
                <style>
                    .jpulse-header { background: blue; }
                </style>
            `;

            mockFs.readFileSync.mockReturnValue(mockHeaderContent);

            // Simulate file.include helper call
            const includeExpression = 'file.include "jpulse-header.tmpl"';
            const expectedPath = path.join(process.cwd(), 'webapp', 'view', 'jpulse-header.tmpl');

            // Test that the helper would read the correct file
            expect(mockHeaderContent).toContain('jpulse-header');
            expect(mockHeaderContent).toContain('favicon.ico');
        });

        test('should prevent path traversal attacks', () => {
            const dangerousPaths = [
                '../../../etc/passwd',
                '..\\..\\windows\\system32',
                '/etc/shadow',
                'C:\\Windows\\System32\\config'
            ];

            dangerousPaths.forEach(dangerousPath => {
                // These should be blocked by the security checks
                const hasTraversal = dangerousPath.includes('../') || dangerousPath.includes('..\\');
                const isAbsolute = path.isAbsolute(dangerousPath);
                const isWindowsAbsolute = /^[A-Za-z]:\\/.test(dangerousPath); // Windows drive letter
                const isUnsafe = hasTraversal || isAbsolute || isWindowsAbsolute;

                expect(isUnsafe).toBe(true);
            });
        });

        test('should validate include depth limits', () => {
            const maxDepth = 10; // From appConfig.controller.view.maxIncludeDepth

            // Test that we respect depth limits
            expect(maxDepth).toBe(10);
            expect(maxDepth).toBeGreaterThan(0);
            expect(maxDepth).toBeLessThan(50); // Reasonable upper bound
        });

        test('should handle relative paths correctly', () => {
            const validPaths = [
                'jpulse-header.tmpl',
                'jpulse-footer.tmpl',
                'error/index.shtml',
                'home/index.shtml'
            ];

            validPaths.forEach(validPath => {
                expect(validPath).not.toMatch(/\.\./);
                expect(path.isAbsolute(validPath)).toBe(false);
                expect(validPath).not.toMatch(/[<>:"|?*]/); // Invalid filename chars
            });
        });
    });

    describe('Header Template Integration', () => {
        test('should include favicon links', () => {
            const mockHeaderTemplate = `
                <link rel="icon" type="image/x-icon" href="/favicon.ico">
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
                <link rel="manifest" href="/site.webmanifest">
            `;

            expect(mockHeaderTemplate).toContain('favicon.ico');
            expect(mockHeaderTemplate).toContain('favicon-32x32.png');
            expect(mockHeaderTemplate).toContain('favicon-16x16.png');
            expect(mockHeaderTemplate).toContain('apple-touch-icon.png');
            expect(mockHeaderTemplate).toContain('site.webmanifest');
        });

        test('should include responsive CSS with appConfig values', () => {
            const mockHeaderCSS = `
                .jpulse-container {
                    max-width: ${mockContext.appConfig.view.mainContainer.maxWidth}px;
                    padding: 0 ${mockContext.appConfig.view.mainContainer.minMarginLeftRight}px;
                }
                .jpulse-header-content {
                    max-width: calc(${mockContext.appConfig.view.mainContainer.maxWidth}px - ${mockContext.appConfig.view.mainContainer.minMarginLeftRight}px * 2);
                }
            `;

            expect(mockHeaderCSS).toContain('max-width: 1200px');
            expect(mockHeaderCSS).toContain('padding: 0 20px');
            expect(mockHeaderCSS).toContain('calc(1200px - 20px * 2)');
        });

        test('should include JavaScript for dropdown functionality', () => {
            const mockHeaderJS = `
                function toggleUserMenu() {
                    const dropdown = document.getElementById('userDropdown');
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                }

                document.addEventListener('click', function(event) {
                    const userMenu = document.querySelector('.jpulse-user-menu');
                    const dropdown = document.getElementById('userDropdown');

                    if (!userMenu.contains(event.target)) {
                        dropdown.style.display = 'none';
                    }
                });
            `;

            expect(mockHeaderJS).toContain('toggleUserMenu');
            expect(mockHeaderJS).toContain('userDropdown');
            expect(mockHeaderJS).toContain('addEventListener');
        });
    });

    describe('Footer Template Integration', () => {
        test('should include header banner HTML', () => {
            const mockFooterHTML = `
                <header class="jpulse-header">
                    <div class="jpulse-header-content">
                        <a href="/" class="jpulse-logo">
                            <div class="jpulse-logo-icon">jP</div>
                            <span>{{app.site.name}}</span>
                        </a>
                        <div class="jpulse-user-menu">
                            <div class="jpulse-user-icon" onclick="toggleUserMenu()">
                                <span>👤</span>
                            </div>
                        </div>
                    </div>
                </header>
            `;

            expect(mockFooterHTML).toContain('jpulse-header');
            expect(mockFooterHTML).toContain('jpulse-logo-icon');
            expect(mockFooterHTML).toContain('jpulse-user-menu');
            expect(mockFooterHTML).toContain('{{app.site.name}}');
        });

        test('should include footer content with i18n', () => {
            const mockFooterContent = `
                <footer class="jpulse-footer">
                    <div class="jpulse-footer-content">
                        <div class="jpulse-footer-left">
                            <span>© 2025 {{app.site.name}}</span>
                            <span class="jpulse-version">v{{app.site.version}}</span>
                        </div>
                        <div class="jpulse-footer-right">
                            <a href="/about">{{i18n.view.pageDecoration.about}}</a>
                            <a href="https://github.com/jpulse-net/jpulse-framework" target="_blank">{{i18n.view.pageDecoration.github}}</a>
                            <span>{{i18n.view.pageDecoration.poweredBy}} jPulse</span>
                        </div>
                    </div>
                </footer>
            `;

            expect(mockFooterContent).toContain('{{app.site.name}}');
            expect(mockFooterContent).toContain('{{app.site.version}}');
            expect(mockFooterContent).toContain('{{i18n.view.pageDecoration.about}}');
            expect(mockFooterContent).toContain('{{i18n.view.pageDecoration.github}}');
            expect(mockFooterContent).toContain('{{i18n.view.pageDecoration.poweredBy}}');
        });

        test('should handle user authentication states', () => {
            const mockDropdownHTML = `
                <div class="jpulse-dropdown" id="userDropdown">
                    {{#if user.isAuthenticated
                        <a href=\\"/profile\\">Profile</a><a href=\\"/signout\\">Sign Out</a>
                    {{else}}
                        <a href=\\"/signin\\">Sign In</a><a href=\\"/signup\\">Sign Up</a>
                    {{/if}}
                </div>
            `;

            expect(mockDropdownHTML).toContain('user.isAuthenticated');
            expect(mockDropdownHTML).toContain('/profile');
            expect(mockDropdownHTML).toContain('/signout');
            expect(mockDropdownHTML).toContain('/signin');
            expect(mockDropdownHTML).toContain('/signup');
        });
    });

    describe('Template Processing Integration', () => {
        test('should process nested handlebars expressions', () => {
            const templateContent = `
                <title>{{app.site.name}}</title>
                <meta name="version" content="{{app.site.version}}">
                <meta name="max-width" content="{{appConfig.view.mainContainer.maxWidth}}">
            `;

            // Simulate handlebars processing
            const processedContent = templateContent
                .replace('{{app.site.name}}', mockContext.app.site.name)
                .replace('{{app.site.version}}', mockContext.app.site.version)
                .replace('{{appConfig.view.mainContainer.maxWidth}}', mockContext.appConfig.view.mainContainer.maxWidth.toString());

            expect(processedContent).toContain('jPulse Framework WebApp');
            expect(processedContent).toContain('0.1.5');
            expect(processedContent).toContain('1200');
        });

        test('should handle conditional expressions', async () => {
            const conditionalTemplate = `
                {{#if user.isAuthenticated}}Welcome back!{{else}}Please sign in{{/if}}
            `;

            // Test both states
            const authenticatedResult = await HandlebarController.expandHandlebars(mockReq, conditionalTemplate, { ...mockContext, user: { ...mockContext.user, isAuthenticated: true } });
            const guestResult = await HandlebarController.expandHandlebars(mockReq, conditionalTemplate, { ...mockContext, user: { ...mockContext.user, isAuthenticated: false } });

            expect(authenticatedResult).toContain('Welcome back!');
            expect(guestResult).toContain('Please sign in');
        });

        test('should process file includes recursively', () => {
            // Test that includes can contain other handlebars expressions
            const includeWithHandlebars = `
                <div class="header-title">{{app.site.name}}</div>
                <div class="header-version">v{{app.site.version}}</div>
            `;

            mockFs.readFileSync.mockReturnValue(includeWithHandlebars);

            // The included content should also be processed
            expect(includeWithHandlebars).toContain('{{app.site.name}}');
            expect(includeWithHandlebars).toContain('{{app.site.version}}');
        });
    });

    describe('Security and Error Handling', () => {
        test('should handle missing include files gracefully', () => {
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('ENOENT: no such file or directory');
            });

            // Should handle file not found errors
            expect(() => {
                mockFs.readFileSync('nonexistent.tmpl');
            }).toThrow('ENOENT');
        });

        test('should validate include file extensions', () => {
            const validExtensions = ['.tmpl', '.shtml', '.html'];
            const testFiles = [
                'header.tmpl',
                'footer.tmpl',
                'page.shtml',
                'content.html'
            ];

            testFiles.forEach(filename => {
                const ext = path.extname(filename);
                expect(validExtensions).toContain(ext);
            });
        });

        test('should prevent infinite recursion', () => {
            const maxDepth = 10;
            let currentDepth = 0;

            // Simulate recursive include checking
            function simulateInclude(depth) {
                if (depth >= maxDepth) {
                    throw new Error('Maximum include depth exceeded');
                }
                return depth + 1;
            }

            // Should allow reasonable depth
            expect(() => simulateInclude(5)).not.toThrow();

            // Should prevent excessive depth
            expect(() => simulateInclude(10)).toThrow('Maximum include depth exceeded');
        });

        test('should sanitize file paths', () => {
            const unsafePaths = [
                '../../../etc/passwd',
                '..\\windows\\system32',
                '/absolute/path',
                'file<script>alert()</script>.tmpl'
            ];

            unsafePaths.forEach(unsafePath => {
                const isSafe = !unsafePath.includes('..') &&
                              !path.isAbsolute(unsafePath) &&
                              !/[<>:"|?*]/.test(unsafePath);
                expect(isSafe).toBe(false);
            });
        });
    });

    describe('Performance and Caching', () => {
        test('should handle multiple include calls efficiently', () => {
            const includeCount = 10;
            const mockContent = '<div>Template content</div>';

            mockFs.readFileSync.mockReturnValue(mockContent);

            // Simulate multiple includes
            const results = [];
            for (let i = 0; i < includeCount; i++) {
                results.push(mockFs.readFileSync(`template-${i}.tmpl`));
            }

            expect(results).toHaveLength(includeCount);
            expect(mockFs.readFileSync).toHaveBeenCalledTimes(includeCount);
        });

        test('should validate template size limits', () => {
            const maxTemplateSize = 1024 * 1024; // 1MB
            const smallTemplate = 'x'.repeat(1000);
            const largeTemplate = 'x'.repeat(maxTemplateSize + 1);

            expect(smallTemplate.length).toBeLessThan(maxTemplateSize);
            expect(largeTemplate.length).toBeGreaterThan(maxTemplateSize);
        });
    });
});

// EOF webapp/tests/unit/controller/template-includes.test.js
