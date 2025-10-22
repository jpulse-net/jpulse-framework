/**
 * @name            jPulse Framework / Site / Tests / Unit / HelloTodo Model
 * @tagline         Unit tests for HelloTodo MVC demonstration model
 * @description     Unit tests for HelloTodo MVC demonstration model
 * @file            webapp/tests/unit/site/hello-todo-model.test.js
 * @version         1.0.0-rc.1
 * @release         2025-10-22
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           80%, Cursor 1.2, Claude Sonnet 4
 */

import { ObjectId } from 'mongodb';

// Mock global Database before importing the model
const mockCollection = {
    find: jest.fn(),
    insertOne: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn()
};

const mockDb = {
    collection: jest.fn().mockReturnValue(mockCollection)
};

global.Database = {
    getDb: jest.fn().mockReturnValue(mockDb)
};

global.CommonUtils = {
    validateAgainstSchema: jest.fn()
};

describe('HelloTodo Model (W-071)', () => {
    let HelloTodoModel;

    beforeAll(async () => {
        // Import the model after mocks are set up
        const modelModule = await import('../../../../site/webapp/model/helloTodo.js');
        HelloTodoModel = modelModule.default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Schema Definition', () => {
        test('should have correct schema structure', () => {
            expect(HelloTodoModel.schema).toBeDefined();
            expect(HelloTodoModel.schema._id).toEqual({ type: 'objectId', auto: true });
            expect(HelloTodoModel.schema.title).toEqual({ type: 'string', required: true });
            expect(HelloTodoModel.schema.username).toEqual({ type: 'string', required: true });
            expect(HelloTodoModel.schema.userFirstName).toEqual({ type: 'string', default: '' });
            expect(HelloTodoModel.schema.userLastName).toEqual({ type: 'string', default: '' });
            expect(HelloTodoModel.schema.completed).toEqual({ type: 'boolean', default: false });
            expect(HelloTodoModel.schema.createdAt).toEqual({ type: 'date', auto: true });
            expect(HelloTodoModel.schema.updatedAt).toEqual({ type: 'date', auto: true });
        });

        test('should demonstrate proper field types and constraints', () => {
            const schema = HelloTodoModel.schema;

            // Required fields
            expect(schema.title.required).toBe(true);
            expect(schema.username.required).toBe(true);

            // Default values
            expect(schema.userFirstName.default).toBe('');
            expect(schema.userLastName.default).toBe('');
            expect(schema.completed.default).toBe(false);

            // Auto-generated fields
            expect(schema._id.auto).toBe(true);
            expect(schema.createdAt.auto).toBe(true);
            expect(schema.updatedAt.auto).toBe(true);
        });
    });

    describe('Database Connection', () => {
        test('should get collection from global Database instance', () => {
            const collection = HelloTodoModel.getCollection();

            expect(global.Database.getDb).toHaveBeenCalled();
            expect(mockDb.collection).toHaveBeenCalledWith('helloTodos');
            expect(collection).toBe(mockCollection);
        });

        test('should use plural collection name "helloTodos"', () => {
            HelloTodoModel.getCollection();
            expect(mockDb.collection).toHaveBeenCalledWith('helloTodos');
        });
    });

    describe('CRUD Operations', () => {
        describe('findAll()', () => {
            test('should retrieve all todos sorted by creation date', async () => {
                const mockTodos = [
                    { _id: new ObjectId(), title: 'Recent Todo', createdAt: new Date('2025-09-30') },
                    { _id: new ObjectId(), title: 'Older Todo', createdAt: new Date('2025-09-29') }
                ];

                const mockCursor = {
                    sort: jest.fn().mockReturnThis(),
                    toArray: jest.fn().mockResolvedValue(mockTodos)
                };
                mockCollection.find.mockReturnValue(mockCursor);

                const result = await HelloTodoModel.findAll();

                expect(mockCollection.find).toHaveBeenCalledWith({});
                expect(mockCursor.sort).toHaveBeenCalledWith({ createdAt: -1 });
                expect(result).toEqual(mockTodos);
            });
        });

        describe('create()', () => {
            test('should create new todo with validation', async () => {
                const todoData = {
                    title: 'New Todo Item',
                    username: 'testuser',
                    userFirstName: 'Test',
                    userLastName: 'User'
                };

                const mockInsertResult = {
                    insertedId: new ObjectId('507f1f77bcf86cd799439011')
                };

                const mockCreatedTodo = {
                    _id: mockInsertResult.insertedId,
                    title: 'New Todo Item',
                    username: 'testuser',
                    userFirstName: 'Test',
                    userLastName: 'User',
                    completed: false,
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date)
                };

                mockCollection.insertOne.mockResolvedValue(mockInsertResult);
                mockCollection.findOne.mockResolvedValue(mockCreatedTodo);

                const result = await HelloTodoModel.create(todoData);

                expect(mockCollection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'New Todo Item',
                    username: 'testuser',
                    userFirstName: 'Test',
                    userLastName: 'User',
                    completed: false,
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date)
                }));
                expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: mockInsertResult.insertedId });
                expect(result).toEqual(mockCreatedTodo);
            });

            test('should handle validation errors', async () => {
                const invalidData = { title: '' }; // Missing required fields

                await expect(HelloTodoModel.create(invalidData)).rejects.toThrow(
                    /Failed to create todo:/
                );

                expect(mockCollection.insertOne).not.toHaveBeenCalled();
            });
        });

        describe('toggleComplete()', () => {
            test('should toggle todo completion status', async () => {
                const todoId = new ObjectId('507f1f77bcf86cd799439011');
                const existingTodo = { _id: todoId, title: 'Test Todo', completed: false };
                const updatedTodo = { _id: todoId, title: 'Test Todo', completed: true };

                mockCollection.findOne
                    .mockResolvedValueOnce(existingTodo)  // First call to check existing state
                    .mockResolvedValueOnce(updatedTodo);  // Second call to return updated todo

                mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

                const result = await HelloTodoModel.toggleComplete(todoId.toString());

                expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(todoId.toString()) });
                expect(mockCollection.updateOne).toHaveBeenCalledWith(
                    { _id: new ObjectId(todoId.toString()) },
                    {
                        $set: {
                            completed: true, // Toggled from false to true
                            updatedAt: expect.any(Date)
                        }
                    }
                );
                expect(result).toEqual(updatedTodo);
            });

            test('should throw error for non-existent todo', async () => {
                const todoId = new ObjectId().toString();
                mockCollection.findOne.mockResolvedValue(null);

                await expect(HelloTodoModel.toggleComplete(todoId)).rejects.toThrow(/Failed to toggle todo completion:/);
                expect(mockCollection.updateOne).not.toHaveBeenCalled();
            });
        });

        describe('delete()', () => {
            test('should delete todo successfully', async () => {
                const todoId = new ObjectId().toString();
                mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

                const result = await HelloTodoModel.delete(todoId);

                expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: new ObjectId(todoId) });
                expect(result).toBe(true);
            });

            test('should throw error when todo not found', async () => {
                const todoId = new ObjectId().toString();
                mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });

                await expect(HelloTodoModel.delete(todoId)).rejects.toThrow(/Failed to delete todo:/);
            });
        });

        describe('getStats()', () => {
            test('should calculate todo statistics correctly', async () => {
                mockCollection.countDocuments
                    .mockResolvedValueOnce(10)  // Total count
                    .mockResolvedValueOnce(6);  // Completed count

                const result = await HelloTodoModel.getStats();

                expect(mockCollection.countDocuments).toHaveBeenCalledWith({}); // Total
                expect(mockCollection.countDocuments).toHaveBeenCalledWith({ completed: true }); // Completed
                expect(result).toEqual({
                    total: 10,
                    completed: 6,
                    pending: 4  // 10 - 6 = 4
                });
            });

            test('should handle zero todos', async () => {
                mockCollection.countDocuments
                    .mockResolvedValueOnce(0)   // Total count
                    .mockResolvedValueOnce(0);  // Completed count

                const result = await HelloTodoModel.getStats();

                expect(result).toEqual({
                    total: 0,
                    completed: 0,
                    pending: 0
                });
            });

            test('should handle all completed todos', async () => {
                mockCollection.countDocuments
                    .mockResolvedValueOnce(5)   // Total count
                    .mockResolvedValueOnce(5);  // Completed count

                const result = await HelloTodoModel.getStats();

                expect(result).toEqual({
                    total: 5,
                    completed: 5,
                    pending: 0
                });
            });
        });
    });

    describe('Educational Value (W-071 Learning Objectives)', () => {
        test('should demonstrate MongoDB integration patterns', () => {
            // Verify that the model properly uses MongoDB features
            expect(HelloTodoModel.getCollection).toBeDefined();
            expect(typeof HelloTodoModel.getCollection).toBe('function');

            // Should use proper collection naming (plural)
            HelloTodoModel.getCollection();
            expect(mockDb.collection).toHaveBeenCalledWith('helloTodos');
        });

        test('should demonstrate schema-based validation', async () => {
            const testData = { title: 'Test', username: 'user' };
            mockCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
            mockCollection.findOne.mockResolvedValue({});

            await HelloTodoModel.create(testData);

            // The model uses its own validation, not CommonUtils
            expect(mockCollection.insertOne).toHaveBeenCalled();
        });

        test('should demonstrate proper error handling', async () => {
            // Test various error scenarios
            const errorScenarios = [
                {
                    method: 'toggleComplete',
                    args: ['nonexistent'],
                    setup: () => mockCollection.findOne.mockResolvedValue(null),
                    expectedError: /Failed to toggle todo completion:/
                },
                {
                    method: 'delete',
                    args: ['nonexistent'],
                    setup: () => mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 }),
                    expectedError: /Failed to delete todo:/
                },
                {
                    method: 'create',
                    args: [{ title: '' }],
                    setup: () => {}, // No setup needed, validation will fail
                    expectedError: /Failed to create todo:/
                }
            ];

            for (const scenario of errorScenarios) {
                scenario.setup();
                await expect(HelloTodoModel[scenario.method](...scenario.args))
                    .rejects.toThrow(scenario.expectedError);
            }
        });

        test('should demonstrate complete CRUD operations', () => {
            // Verify all CRUD methods are implemented
            expect(HelloTodoModel.findAll).toBeDefined();      // Read
            expect(HelloTodoModel.create).toBeDefined();       // Create
            expect(HelloTodoModel.toggleComplete).toBeDefined(); // Update
            expect(HelloTodoModel.delete).toBeDefined();       // Delete
            expect(HelloTodoModel.getStats).toBeDefined();     // Additional utility

            // All should be static methods
            expect(typeof HelloTodoModel.findAll).toBe('function');
            expect(typeof HelloTodoModel.create).toBe('function');
            expect(typeof HelloTodoModel.toggleComplete).toBe('function');
            expect(typeof HelloTodoModel.delete).toBe('function');
            expect(typeof HelloTodoModel.getStats).toBe('function');
        });

        test('should demonstrate proper data modeling', () => {
            const schema = HelloTodoModel.schema;

            // Should have appropriate fields for a todo application
            expect(schema).toHaveProperty('title');        // What needs to be done
            expect(schema).toHaveProperty('completed');    // Status
            expect(schema).toHaveProperty('username');     // Who owns it
            expect(schema).toHaveProperty('userFirstName'); // User details
            expect(schema).toHaveProperty('userLastName');  // User details
            expect(schema).toHaveProperty('createdAt');    // When created
            expect(schema).toHaveProperty('updatedAt');    // When modified

            // Should have proper constraints
            expect(schema.title.required).toBe(true);
            expect(schema.username.required).toBe(true);
            expect(schema.completed.default).toBe(false);
        });
    });

    describe('findById() - Enhanced in v0.9.5', () => {
        test('should find todo by valid ObjectId string', async () => {
            const todoId = new ObjectId();
            const mockTodo = {
                _id: todoId,
                title: 'Test Todo',
                username: 'testuser',
                completed: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockCollection.findOne.mockResolvedValue(mockTodo);

            const result = await HelloTodoModel.findById(todoId.toString());

            expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: todoId });
            expect(result).toEqual(mockTodo);
        });

        test('should return null for non-existent todo', async () => {
            const todoId = new ObjectId();
            mockCollection.findOne.mockResolvedValue(null);

            const result = await HelloTodoModel.findById(todoId.toString());

            expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: todoId });
            expect(result).toBeNull();
        });

        test('should handle invalid ObjectId format', async () => {
            const invalidId = 'invalid-object-id';

            await expect(HelloTodoModel.findById(invalidId)).rejects.toThrow(/Failed to find todo by ID:/);
            expect(mockCollection.findOne).not.toHaveBeenCalled();
        });

        test('should handle database errors gracefully', async () => {
            const todoId = new ObjectId();
            mockCollection.findOne.mockRejectedValue(new Error('Database connection failed'));

            await expect(HelloTodoModel.findById(todoId.toString())).rejects.toThrow(/Failed to find todo by ID: Database connection failed/);
        });

        test('should work with ObjectId instance (not just string)', async () => {
            const todoId = new ObjectId();
            const mockTodo = {
                _id: todoId,
                title: 'Test Todo',
                username: 'testuser'
            };

            mockCollection.findOne.mockResolvedValue(mockTodo);

            const result = await HelloTodoModel.findById(todoId);

            expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: todoId });
            expect(result).toEqual(mockTodo);
        });

        test('should support controller logging workflow for toggle operation', async () => {
            const todoId = new ObjectId();
            const originalTodo = {
                _id: todoId,
                title: 'Test Todo',
                username: 'testuser',
                completed: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const updatedTodo = {
                ...originalTodo,
                completed: true,
                updatedAt: new Date()
            };

            // Simulate controller workflow: findById -> toggleComplete
            mockCollection.findOne
                .mockResolvedValueOnce(originalTodo)  // findById call
                .mockResolvedValueOnce(originalTodo)  // toggleComplete internal call
                .mockResolvedValueOnce(updatedTodo);  // toggleComplete result call

            mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

            // Step 1: Controller calls findById to get original state for logging
            const oldTodo = await HelloTodoModel.findById(todoId.toString());
            expect(oldTodo).toEqual(originalTodo);

            // Step 2: Controller calls toggleComplete
            const result = await HelloTodoModel.toggleComplete(todoId.toString());
            expect(result).toEqual(updatedTodo);

            // Verify the sequence of calls
            expect(mockCollection.findOne).toHaveBeenCalledTimes(3);
            expect(mockCollection.updateOne).toHaveBeenCalledTimes(1);
        });

        test('should support controller logging workflow for delete operation', async () => {
            const todoId = new ObjectId();
            const originalTodo = {
                _id: todoId,
                title: 'Todo to Delete',
                username: 'testuser',
                completed: false
            };

            // Simulate controller workflow: findById -> delete
            mockCollection.findOne.mockResolvedValue(originalTodo);
            mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

            // Step 1: Controller calls findById to get original state for logging
            const oldTodo = await HelloTodoModel.findById(todoId.toString());
            expect(oldTodo).toEqual(originalTodo);

            // Step 2: Controller calls delete
            const result = await HelloTodoModel.delete(todoId.toString());
            expect(result).toBe(true);

            expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: todoId });
            expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: todoId });
        });
    });
});

// EOF webapp/tests/unit/site/hello-todo-model.test.js
