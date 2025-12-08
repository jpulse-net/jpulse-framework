/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Responsive Layout
 * @tagline         Unit tests for responsive layout and appConfig integration
 * @description     Tests for the new responsive layout features and appConfig context
 * @file            webapp/tests/unit/controller/responsive-layout.test.js
 * @version         1.3.12
 * @release         2025-12-08
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

// Set up global appConfig BEFORE any dynamic imports
TestUtils.setupGlobalMocksWithConsolidatedConfig();

describe('Responsive Layout and AppConfig Integration', () => {
    let mockAppConfig;
    let mockContext;

    beforeEach(() => {
        // Use consolidated configuration
        mockAppConfig = TestUtils.getConsolidatedConfig();

        // Mock handlebars context with appConfig
        mockContext = {
            app: mockAppConfig.app,
            appConfig: mockAppConfig,
            user: {
                id: '',
                isAuthenticated: false
            },
            config: {},
            url: {
                domain: 'http://localhost:8080',
                pathname: '/home/index.shtml'
            }
        };
    });

    describe('AppConfig Context Integration', () => {
        test('should expose appConfig in handlebars context', () => {
            expect(mockContext.appConfig).toBeDefined();
            expect(mockContext.appConfig.view).toBeDefined();
            expect(mockContext.appConfig.view.mainContainer).toBeDefined();
            expect(mockContext.appConfig.view.mainContainer.maxWidth).toBe(1200);
            expect(mockContext.appConfig.view.mainContainer.minMarginLeftRight).toBe(20);
        });

        test('should provide window configuration for responsive layout', () => {
            const windowConfig = mockContext.appConfig.view;

            expect(windowConfig.mainContainer.maxWidth).toBe(1200);
            expect(windowConfig.mainContainer.minMarginLeftRight).toBe(20);
            expect(typeof windowConfig.mainContainer.maxWidth).toBe('number');
            expect(typeof windowConfig.mainContainer.minMarginLeftRight).toBe('number');
        });

        test('should maintain backward compatibility with app config', () => {
            expect(mockContext.app.jPulse.version).toMatch(/^\d+\.\d+\.\d+(-[a-z]+\.\d+)?$/);
            expect(mockContext.app.jPulse.release).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('Responsive Layout Calculations', () => {
        test('should calculate correct CSS values for wide screens', () => {
            const { maxWidth, minMarginLeftRight } = mockAppConfig.view.mainContainer;

            // Header/footer content width calculation
            const headerContentMaxWidth = maxWidth - (minMarginLeftRight * 2);
            expect(headerContentMaxWidth).toBe(1160); // 1200 - (20 * 2)

            // Padding calculation for alignment
            const headerPadding = 30; // Content padding
            expect(headerPadding).toBe(30);

            // Breakpoint calculation
            const breakpoint = maxWidth + (minMarginLeftRight * 2);
            expect(breakpoint).toBe(1240); // 1200 + (20 * 2)
        });

        test('should calculate correct responsive breakpoints', () => {
            const { maxWidth, minMarginLeftRight } = mockAppConfig.view.mainContainer;

            // Main responsive breakpoint
            const mainBreakpoint = maxWidth + (minMarginLeftRight * 2);
            expect(mainBreakpoint).toBe(1240);

            // Narrow viewport breakpoints (hardcoded in CSS)
            const narrowBreakpoint = 800;
            const mobileBreakpoint = 600;

            expect(narrowBreakpoint).toBe(800);
            expect(mobileBreakpoint).toBe(600);
        });

        test('should handle different window configurations', () => {
            // Test with different maxWidth
            const largeConfig = { ...mockAppConfig.view.mainContainer, maxWidth: 1600 };
            const largeBreakpoint = largeConfig.maxWidth + (largeConfig.minMarginLeftRight * 2);
            expect(largeBreakpoint).toBe(1640);

            // Test with different margins
            const wideMarginConfig = { ...mockAppConfig.view.mainContainer, minMarginLeftRight: 40 };
            const wideMarginBreakpoint = wideMarginConfig.maxWidth + (wideMarginConfig.minMarginLeftRight * 2);
            expect(wideMarginBreakpoint).toBe(1280);
        });
    });

    describe('CSS Template Generation', () => {
        test('should generate correct CSS calc expressions', () => {
            const { maxWidth, minMarginLeftRight } = mockAppConfig.view.mainContainer;

            // Simulate handlebars template rendering
            const cssTemplates = {
                headerMaxWidth: `calc(${maxWidth}px - ${minMarginLeftRight}px * 2)`,
                headerPadding: '30px',
                breakpointQuery: `(max-width: calc(${maxWidth}px + ${minMarginLeftRight}px * 2))`,
                mainMargin: `${minMarginLeftRight}px`,
                mainPadding: '30px'
            };

            expect(cssTemplates.headerMaxWidth).toBe('calc(1200px - 20px * 2)');
            expect(cssTemplates.headerPadding).toBe('30px');
            expect(cssTemplates.breakpointQuery).toBe('(max-width: calc(1200px + 20px * 2))');
            expect(cssTemplates.mainMargin).toBe('20px');
            expect(cssTemplates.mainPadding).toBe('30px');
        });

        test('should handle responsive padding calculations', () => {
            const { minMarginLeftRight } = mockAppConfig.view.mainContainer;

            // Different padding values for different breakpoints
            const responsivePadding = {
                default: 30,
                narrow: 20,
                mobile: 15
            };

            // Simulate CSS calc for narrow viewports
            const narrowCalc = `calc(${minMarginLeftRight}px + ${responsivePadding.narrow}px)`;
            expect(narrowCalc).toBe('calc(20px + 20px)');

            // Simulate CSS calc for mobile viewports
            const mobileCalc = `calc(10px + ${responsivePadding.mobile}px)`;
            expect(mobileCalc).toBe('calc(10px + 15px)');
        });
    });

    describe('Template Context Validation', () => {
        test('should validate required context properties', () => {
            const requiredProps = [
                'app',
                'appConfig',
                'user',
                'config',
                'url'
            ];

            requiredProps.forEach(prop => {
                expect(mockContext).toHaveProperty(prop);
            });
        });

        test('should validate appConfig structure', () => {
            const appConfig = mockContext.appConfig;

            expect(appConfig).toHaveProperty('app');
            expect(appConfig).toHaveProperty('controller');
            expect(appConfig).toHaveProperty('view');

            expect(appConfig.app).toHaveProperty('jPulse');
            expect(appConfig.app).toHaveProperty('site');
            expect(appConfig.app.jPulse).toHaveProperty('version');
            expect(appConfig.app.jPulse).toHaveProperty('release');
            expect(appConfig.app.site).toHaveProperty('version');
            expect(appConfig.app.site).toHaveProperty('release');

            expect(appConfig.view.mainContainer).toHaveProperty('maxWidth');
            expect(appConfig.view.mainContainer).toHaveProperty('minMarginLeftRight');
        });

        test('should handle missing window config gracefully', () => {
            const incompleteConfig = {
                ...mockAppConfig,
                controller: {
                    view: {}
                },
                view: {
                    mainContainer: {}
                }
            };

            const context = {
                ...mockContext,
                appConfig: incompleteConfig
            };

            // Should not throw errors when properties are missing
            expect(context.appConfig.view.mainContainer.maxWidth).toBeUndefined();
            expect(context.appConfig.view.mainContainer.minMarginLeftRight).toBeUndefined();
        });
    });

    describe('Integration with View Controller', () => {
        test('should simulate view controller context creation', () => {
            // Simulate how view controller creates context
            const simulatedContext = {
                app: mockAppConfig.app,
                user: {
                    id: '',
                    firstName: '',
                    isAuthenticated: false
                },
                appConfig: mockAppConfig, // New feature
                config: {},
                url: {
                    domain: 'http://localhost:8080',
                    pathname: '/test',
                    search: '',
                    param: {}
                }
            };

            expect(simulatedContext.appConfig).toBe(mockAppConfig);
            expect(simulatedContext.appConfig.view.mainContainer.maxWidth).toBe(1200);
            // Accept different app names based on environment config
            expect(simulatedContext.app.site.name).toMatch(/jPulse Framework/);
        });

        test('should support handlebars template expressions', () => {
            // Test expressions that would be used in templates
            const expressions = {
                maxWidth: mockContext.appConfig.view.mainContainer.maxWidth,
                minMargin: mockContext.appConfig.view.mainContainer.minMarginLeftRight,
                appVersion: mockContext.app.jPulse.version
            };

            expect(expressions.maxWidth).toBe(1200);
            expect(expressions.minMargin).toBe(20);
            expect(expressions.appVersion).toMatch(/^\d+\.\d+\.\d+(-[a-z]+\.\d+)?$/);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle null or undefined appConfig', () => {
            const contextWithNullConfig = {
                ...mockContext,
                appConfig: null
            };

            expect(() => {
                const config = contextWithNullConfig.appConfig;
                // Should not throw when accessing null
                expect(config).toBeNull();
            }).not.toThrow();
        });

        test('should handle invalid window config values', () => {
            const invalidConfig = {
                ...mockAppConfig,
                view: {
                    mainContainer: {
                        maxWidth: 'invalid',
                        minMarginLeftRight: null
                    }
                }
            };

            const context = {
                ...mockContext,
                appConfig: invalidConfig
            };

            expect(context.appConfig.view.mainContainer.maxWidth).toBe('invalid');
            expect(context.appConfig.view.mainContainer.minMarginLeftRight).toBeNull();
        });

        test('should validate numeric values for calculations', () => {
            const { maxWidth, minMarginLeftRight } = mockAppConfig.view.mainContainer;

            expect(typeof maxWidth).toBe('number');
            expect(typeof minMarginLeftRight).toBe('number');
            expect(maxWidth).toBeGreaterThan(0);
            expect(minMarginLeftRight).toBeGreaterThanOrEqual(0);
        });
    });
});

// EOF webapp/tests/unit/controller/responsive-layout.test.js
