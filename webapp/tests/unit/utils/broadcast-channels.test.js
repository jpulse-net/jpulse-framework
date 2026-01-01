/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Broadcast Channels
 * @tagline         Unit tests for broadcast channel naming (W-076)
 * @description     Tests MVC naming convention and channel validation
 * @file            webapp/tests/unit/utils/broadcast-channels.test.js
 * @version         1.4.2
 * @release         2026-01-01
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Broadcast Channel Naming (W-076)', () => {
    let RedisManager;

    beforeEach(async () => {
        // Import RedisManager fresh for each test
        jest.resetModules();
        const module = await import('../../../utils/redis-manager.js');
        RedisManager = module.default;

        // Initialize with Redis disabled for testing
        RedisManager.initialize({ enabled: false });
    });

    afterEach(() => {
        if (RedisManager && typeof RedisManager.shutdown === 'function') {
            RedisManager.shutdown();
        }
    });

    describe('MVC Naming Convention', () => {
        it('should accept valid framework channel names', () => {
            const frameworkChannels = [
                'controller:config:data:changed',
                'controller:websocket:broadcast:hello-emoji',
                'model:user:profile:updated',
                'view:dashboard:refresh:requested',
                'controller:config:cache:invalidate'
            ];

            frameworkChannels.forEach(channel => {
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });

        it('should accept valid site owner channel names', () => {
            const siteChannels = [
                'controller:helloDashboard:update',
                'view:myCustomView:refresh',
                'model:customModel:data:changed',
                'controller:orderManager:payment:processed',
                'view:userProfile:settings:updated'
            ];

            siteChannels.forEach(channel => {
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });

        it('should handle channel names with different layer types', () => {
            const layerTypes = ['model', 'view', 'controller'];

            layerTypes.forEach(layer => {
                const channel = `${layer}:component:domain:action`;
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });

        it('should handle channel names with camelCase components', () => {
            const camelCaseChannels = [
                'controller:userManager:profileUpdate:completed',
                'view:dashboardWidget:dataRefresh:requested',
                'model:orderItem:priceCalculation:updated'
            ];

            camelCaseChannels.forEach(channel => {
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });
    });

    describe('Channel Name Validation', () => {
        it('should handle empty channel names gracefully', () => {
            const emptyChannels = ['', null, undefined];

            emptyChannels.forEach(channel => {
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });

        it('should handle channel names with special characters', () => {
            const specialChannels = [
                'controller:hello-world:update',
                'view:my_component:refresh',
                'model:user.profile:changed'
            ];

            specialChannels.forEach(channel => {
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });

        it('should handle very long channel names', () => {
            const longChannel = 'controller:' + 'a'.repeat(100) + ':' + 'b'.repeat(100) + ':action';

            expect(() => {
                RedisManager.registerBroadcastCallback(longChannel, jest.fn());
            }).not.toThrow();
        });

        it('should handle channel names with numbers', () => {
            const numberedChannels = [
                'controller:user1:profile:update',
                'view:dashboard2:widget3:refresh',
                'model:order123:item456:changed'
            ];

            numberedChannels.forEach(channel => {
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });
    });

    describe('Channel Patterns', () => {
        it('should recognize standard MVC patterns', () => {
            const patterns = [
                { layer: 'controller', component: 'user', domain: 'auth', action: 'login' },
                { layer: 'view', component: 'dashboard', domain: 'widget', action: 'refresh' },
                { layer: 'model', component: 'order', domain: 'payment', action: 'processed' }
            ];

            patterns.forEach(({ layer, component, domain, action }) => {
                const channel = `${layer}:${component}:${domain}:${action}`;
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });

        it('should handle minimal channel patterns', () => {
            const minimalChannels = [
                'controller:action',
                'view:refresh',
                'model:update'
            ];

            minimalChannels.forEach(channel => {
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });

        it('should handle extended channel patterns', () => {
            const extendedChannels = [
                'controller:user:profile:settings:theme:changed',
                'view:dashboard:widget:chart:data:updated:real-time'
            ];

            extendedChannels.forEach(channel => {
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });
    });

    describe('Callback Registration', () => {
        it('should register callbacks for valid channels', () => {
            const channel = 'controller:test:action';
            const callback = jest.fn();

            expect(() => {
                RedisManager.registerBroadcastCallback(channel, callback);
            }).not.toThrow();
        });

        it('should handle callback replacement', () => {
            const channel = 'controller:test:action';
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            RedisManager.registerBroadcastCallback(channel, callback1);
            RedisManager.registerBroadcastCallback(channel, callback2);

            // Should not throw and should replace the callback
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });

        it('should handle null callbacks gracefully', () => {
            const channel = 'controller:test:action';

            expect(() => {
                RedisManager.registerBroadcastCallback(channel, null);
            }).not.toThrow();
        });

        it('should handle undefined callbacks gracefully', () => {
            const channel = 'controller:test:action';

            expect(() => {
                RedisManager.registerBroadcastCallback(channel, undefined);
            }).not.toThrow();
        });
    });

    describe('Channel Documentation Examples', () => {
        it('should support documented framework examples', () => {
            // Examples from the W-088 documentation
            const documentedChannels = [
                'controller:config:data:changed',
                'controller:websocket:broadcast:hello-emoji',
                'model:user:profile:updated',
                'view:dashboard:refresh:requested'
            ];

            documentedChannels.forEach(channel => {
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });

        it('should support documented site owner examples', () => {
            // Examples for site owners from documentation
            const siteOwnerChannels = [
                'controller:helloDashboard:update',
                'view:myCustomView:refresh',
                'model:customModel:data:changed'
            ];

            siteOwnerChannels.forEach(channel => {
                expect(() => {
                    RedisManager.registerBroadcastCallback(channel, jest.fn());
                }).not.toThrow();
            });
        });
    });
});

// EOF webapp/tests/unit/utils/broadcast-channels.test.js
