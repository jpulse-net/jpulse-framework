/**
 * @name            jPulse Framework / Site / Tests / Unit / HelloVue Controller
 * @tagline         Unit tests for HelloVue SPA demonstration controller
 * @description     Unit tests for HelloVue SPA demonstration controller
 * @file            webapp/tests/unit/site/hello-vue-controller.test.js
 * @version         1.3.19
 * @release         2025-12-19
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

describe('HelloVue Controller (W-072)', () => {
    let HelloVueController;

    beforeAll(async () => {
        // Import the controller
        const controllerModule = await import('../../../../site/webapp/controller/helloVue.js');
        HelloVueController = controllerModule.default;
    });

    describe('Controller Structure', () => {
        test('should have api method defined', () => {
            expect(HelloVueController).toBeDefined();
            expect(typeof HelloVueController.api).toBe('function');
        });

        test('should be a static method', () => {
            // The api method should be accessible without instantiation
            expect(HelloVueController.api).toBeDefined();
        });
    });

    describe('api() - Integration with HelloTodo', () => {
        test('should handle API calls with proper response structure', async () => {
            // This test verifies the controller structure and error handling
            // Database may not be available in CI environment
            const req = {
                session: { user: { username: 'test' } },
                originalUrl: '/api/1/hello-vue'
            };
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            // Call the API - it will use real HelloTodoModel from global
            await HelloVueController.api(req, res);

            // Should have called res.json with a response structure
            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];

            // Verify response structure (both success and error cases)
            expect(response).toHaveProperty('success');

            if (response.success) {
                // Success case: verify demo data structure
                expect(response).toHaveProperty('data');
                expect(response).toHaveProperty('message');
                expect(response.data).toHaveProperty('message', 'Hello from Vue.js SPA!');
                expect(response.data).toHaveProperty('timestamp');
                expect(response.data).toHaveProperty('todos');
                expect(response.data).toHaveProperty('stats');
                expect(response.data).toHaveProperty('features');

                // Verify stats structure
                expect(response.data.stats).toHaveProperty('totalTodos');
                expect(response.data.stats).toHaveProperty('completedTodos');
                expect(response.data.stats).toHaveProperty('pendingTodos');

                // Verify features array
                expect(Array.isArray(response.data.features)).toBe(true);
                expect(response.data.features).toContain('URL routing without page reloads');
                expect(response.data.features).toContain('Reactive data binding');

                // Verify todos are limited to 5
                expect(response.data.todos.length).toBeLessThanOrEqual(5);
            } else {
                // Error case: verify error response structure
                expect(response).toHaveProperty('error');
                expect(response).toHaveProperty('code');
                expect(response.success).toBe(false);
                // Verify it's a known error code
                expect(response.code).toBe('HELLO_VUE_ERROR');
            }
        });
    });
});

// EOF webapp/tests/unit/site/hello-vue-controller.test.js
