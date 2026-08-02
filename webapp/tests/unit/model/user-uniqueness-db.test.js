/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Model / User Uniqueness (DB-level)
 * @tagline         Unit tests for W-198: DB-enforced email/username uniqueness + email normalization
 * @description     Covers the three DB-integrity fixes from W-198: (1) findByEmail()/create()
 *                   normalize email to lowercase before every query/write, closing the
 *                   case-sensitivity gap; (2) create() catches MongoDB E11000 duplicate-key
 *                   errors as an authoritative backstop against the check-then-insert race,
 *                   translating them to the existing friendly error messages; (3)
 *                   ensureIndexes() backfills mixed-case emails, then creates real unique
 *                   indexes on email/username, skipping (not crashing) when pre-existing
 *                   duplicates are found.
 * @file            webapp/tests/unit/model/user-uniqueness-db.test.js
 * @version         1.7.8
 * @release         2026-08-02
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.13, Claude Sonnet 5
 */

import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';

const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';

const mockCollection = {
    findOne: jest.fn(),
    insertOne: jest.fn(),
    updateOne: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
    createIndex: jest.fn()
};

// __esModule: true is required here - without it, babel's CJS interop
// (_interopRequireDefault/_interopRequireWildcard) double-wraps the `default` export, and
// `database.getDb` silently resolves to undefined wherever the mocked module is actually
// invoked (only surfaces once a test exercises a DB-calling code path, e.g. create()/
// findByEmail()/ensureIndexes() below - schema-only tests elsewhere never hit it).
jest.mock('../../../database.js', () => ({
    __esModule: true,
    default: {
        getDb: jest.fn()
    }
}));

describe('UserModel DB-level uniqueness (W-198)', () => {
    let UserModel;
    let mockGetDb;

    beforeAll(async () => {
        if (!global.appConfig) global.appConfig = {};
        // Grab the same jest.fn() instance UserModel's `database` import resolves to, so
        // reconfiguring it here (mockImplementation/mockReturnValueOnce below) actually affects
        // what UserModel sees - avoids any indirection/closure ambiguity around jest.mock().
        mockGetDb = (await import('../../../database.js')).default.getDb;
        UserModel = (await import('../../../model/user.js')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetDb.mockImplementation(() => ({
            collection: jest.fn(() => mockCollection)
        }));
        global.LogController = { logInfo: jest.fn(), logWarning: jest.fn(), logError: jest.fn() };
        global.HookManager = null;
    });

    describe('findByEmail()', () => {
        test('normalizes mixed-case email before querying', async () => {
            mockCollection.findOne.mockResolvedValue(null);

            await UserModel.findByEmail('Peter@Thoeny.org');

            expect(mockCollection.findOne).toHaveBeenCalledWith({ email: 'peter@thoeny.org' });
        });

        test('trims and lowercases in one pass', async () => {
            mockCollection.findOne.mockResolvedValue(null);

            await UserModel.findByEmail('  Peter@Thoeny.org  ');

            expect(mockCollection.findOne).toHaveBeenCalledWith({ email: 'peter@thoeny.org' });
        });
    });

    describe('create()', () => {
        let lastInserted;

        beforeEach(() => {
            lastInserted = null;
            mockCollection.findOne.mockImplementation((filter) => {
                if (filter && filter._id) {
                    return Promise.resolve(lastInserted);
                }
                // Simulate no existing username/email at app-level pre-check time
                return Promise.resolve(null);
            });
            mockCollection.insertOne.mockImplementation((doc) => {
                doc._id = doc._id || VALID_OBJECT_ID;
                lastInserted = { ...doc };
                return Promise.resolve({ acknowledged: true, insertedId: doc._id });
            });
        });

        test('normalizes email to lowercase before insert', async () => {
            const result = await UserModel.create({
                username: 'newuser',
                email: 'NewUser@Example.COM',
                passwordHash: 'already-hashed',
                profile: { firstName: 'New', lastName: 'User' }
            });

            expect(mockCollection.insertOne.mock.calls[0][0].email).toBe('newuser@example.com');
            expect(result.email).toBe('newuser@example.com');
        });

        test('applies emailVerified: false by default for new signups', async () => {
            const result = await UserModel.create({
                username: 'newuser2',
                email: 'newuser2@example.com',
                passwordHash: 'already-hashed',
                profile: { firstName: 'New', lastName: 'User' }
            });

            expect(mockCollection.insertOne.mock.calls[0][0].emailVerified).toBe(false);
            expect(result.emailVerified).toBe(false);
        });

        test('translates an E11000 on username into the friendly "Username already exists" error', async () => {
            mockCollection.insertOne.mockRejectedValueOnce(
                Object.assign(new Error('E11000 duplicate key error'), { code: 11000, keyPattern: { username: 1 } })
            );

            await expect(UserModel.create({
                username: 'racecondition',
                email: 'race@example.com',
                passwordHash: 'already-hashed',
                profile: { firstName: 'Race', lastName: 'Condition' }
            })).rejects.toThrow('Username already exists');
        });

        test('translates an E11000 on email into the friendly "Email address already registered" error', async () => {
            mockCollection.insertOne.mockRejectedValueOnce(
                Object.assign(new Error('E11000 duplicate key error'), { code: 11000, keyPattern: { email: 1 } })
            );

            await expect(UserModel.create({
                username: 'raceuser',
                email: 'race@example.com',
                passwordHash: 'already-hashed',
                profile: { firstName: 'Race', lastName: 'User' }
            })).rejects.toThrow('Email address already registered');
        });

        test('re-throws non-duplicate-key insert errors unchanged', async () => {
            mockCollection.insertOne.mockRejectedValueOnce(new Error('connection reset'));

            await expect(UserModel.create({
                username: 'someuser',
                email: 'some@example.com',
                passwordHash: 'already-hashed',
                profile: { firstName: 'Some', lastName: 'User' }
            })).rejects.toThrow('connection reset');
        });
    });

    describe('updateById()', () => {
        test('normalizes email to lowercase before persisting (admin email change)', async () => {
            const currentDoc = { _id: VALID_OBJECT_ID, username: 'someuser', email: 'old@example.com', saveCount: 1 };
            let savedDoc = { ...currentDoc };

            mockCollection.findOne.mockImplementation(() => Promise.resolve(savedDoc));
            mockCollection.updateOne.mockImplementation((filter, update) => {
                savedDoc = { ...savedDoc, ...update.$set };
                return Promise.resolve({ matchedCount: 1 });
            });

            await UserModel.updateById(VALID_OBJECT_ID, { email: 'Admin.Changed@Example.COM' });

            expect(mockCollection.updateOne.mock.calls[0][1].$set.email).toBe('admin.changed@example.com');
        });
    });

    describe('ensureIndexes()', () => {
        beforeEach(() => {
            mockCollection.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) });
            mockCollection.aggregate.mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) });
            mockCollection.createIndex.mockResolvedValue(true);
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
        });

        test('creates unique indexes on both email and username when there are no duplicates', async () => {
            await UserModel.ensureIndexes(false);

            expect(mockCollection.createIndex).toHaveBeenCalledWith({ email: 1 }, { unique: true });
            expect(mockCollection.createIndex).toHaveBeenCalledWith({ username: 1 }, { unique: true });
        });

        test('backfills mixed-case emails to lowercase before checking for duplicates', async () => {
            mockCollection.find.mockReturnValue({
                toArray: jest.fn().mockResolvedValue([{ _id: 'doc1', email: 'Foo@Bar.com' }])
            });

            await UserModel.ensureIndexes(false);

            expect(mockCollection.updateOne).toHaveBeenCalledWith(
                { _id: 'doc1' },
                { $set: { email: 'foo@bar.com' } }
            );
            expect(global.LogController.logInfo).toHaveBeenCalled();
        });

        test('skips creating the email index (but still creates the username index) when duplicate emails are found', async () => {
            mockCollection.aggregate.mockImplementation((pipeline) => {
                const groupField = pipeline[0].$group._id;
                if (groupField === '$email') {
                    return { toArray: jest.fn().mockResolvedValue([{ _id: 'dup@example.com', count: 2 }]) };
                }
                return { toArray: jest.fn().mockResolvedValue([]) };
            });

            await UserModel.ensureIndexes(false);

            expect(mockCollection.createIndex).not.toHaveBeenCalledWith({ email: 1 }, { unique: true });
            expect(mockCollection.createIndex).toHaveBeenCalledWith({ username: 1 }, { unique: true });
            expect(global.LogController.logWarning).toHaveBeenCalled();
        });

        test('skips creating the username index (but still creates the email index) when duplicate usernames are found', async () => {
            mockCollection.aggregate.mockImplementation((pipeline) => {
                const groupField = pipeline[0].$group._id;
                if (groupField === '$username') {
                    return { toArray: jest.fn().mockResolvedValue([{ _id: 'ptester8', count: 2 }]) };
                }
                return { toArray: jest.fn().mockResolvedValue([]) };
            });

            await UserModel.ensureIndexes(false);

            expect(mockCollection.createIndex).toHaveBeenCalledWith({ email: 1 }, { unique: true });
            expect(mockCollection.createIndex).not.toHaveBeenCalledWith({ username: 1 }, { unique: true });
            expect(global.LogController.logWarning).toHaveBeenCalled();
        });

        test('gracefully skips when the database is unavailable and isTest is true', async () => {
            mockGetDb.mockReturnValueOnce(null);

            await expect(UserModel.ensureIndexes(true)).resolves.toBeUndefined();
            expect(mockCollection.createIndex).not.toHaveBeenCalled();
        });

        test('throws when the database is unavailable and isTest is false', async () => {
            mockGetDb.mockReturnValueOnce(null);

            await expect(UserModel.ensureIndexes(false)).rejects.toThrow('Database connection not available');
        });
    });
});

// EOF webapp/tests/unit/model/user-uniqueness-db.test.js
