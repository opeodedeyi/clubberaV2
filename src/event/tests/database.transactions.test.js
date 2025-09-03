// src/event/tests/database.transactions.test.js
const db = require('../../config/db');
const EventModel = require('../models/event.model');
const DatabaseTestHelper = require('../../test-helpers/database.helper');

describe('Database Transaction Tests', () => {
    let dbHelper;
    let testUser;
    let testCommunity;

    beforeAll(async () => {
        dbHelper = new DatabaseTestHelper();
    });

    beforeEach(async () => {
        await dbHelper.beginTestTransaction();
        
        // Create test user and community
        testUser = await dbHelper.createTestUser({
            full_name: 'Transaction Test User',
            email: `transactiontest${Date.now()}@example.com`
        });

        testCommunity = await dbHelper.createTestCommunity({
            name: `Transaction Test Community ${Date.now()}`,
            unique_url: `transaction-test-community-${Date.now()}`
        }, testUser.id);

        // Mock the database module to use our transaction
        const mockDb = dbHelper.getMockDbWithTransaction();
        jest.doMock('../../config/db', () => mockDb);
    });

    afterEach(async () => {
        await dbHelper.rollbackTestTransaction();
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await DatabaseTestHelper.closeDatabase();
    });

    describe('Event Creation Transaction Integrity', () => {
        it('should rollback entire transaction if event creation fails', async () => {
            const eventData = {
                title: 'Transaction Failure Test',
                startTime: '2025-12-25T21:00:00Z'
            };

            const postData = {
                communityId: 999999, // Invalid community ID
                content: 'TEST_DATA: This should fail and rollback',
                isSupportersOnly: false
            };

            // Mock the executeTransaction to fail after creating post
            const originalExecuteTransaction = dbHelper.testTransactionClient.query;
            let callCount = 0;
            
            dbHelper.testTransactionClient.query = jest.fn(async (text, params) => {
                callCount++;
                
                // Let the first INSERT (post) succeed
                if (callCount === 1 && text.includes('INSERT INTO posts')) {
                    return originalExecuteTransaction.call(dbHelper.testTransactionClient, text, params);
                }
                
                // Fail on the second INSERT (event)
                if (callCount === 2 && text.includes('INSERT INTO events')) {
                    throw new Error('Simulated transaction failure');
                }
                
                return originalExecuteTransaction.call(dbHelper.testTransactionClient, text, params);
            });

            // Attempt to create event - should fail
            await expect(EventModel.createEvent(eventData, postData, testUser.id))
                .rejects.toThrow();

            // Verify no posts were created (transaction rolled back)
            const postCheck = await dbHelper.testTransactionClient.query(
                'SELECT * FROM posts WHERE content = $1',
                ['TEST_DATA: This should fail and rollback']
            );
            expect(postCheck.rows).toHaveLength(0);
        });

        it('should maintain transaction consistency with location creation', async () => {
            const eventData = {
                title: 'Location Transaction Test',
                startTime: '2025-12-25T22:00:00Z'
            };

            const postData = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Location transaction test',
                isSupportersOnly: false
            };

            const locationData = {
                name: 'Test Location',
                locationType: 'venue',
                lat: 40.7128,
                lng: -74.0060,
                address: '123 Test Street'
            };

            // Create event with location
            const result = await EventModel.createEvent(eventData, postData, testUser.id, locationData);

            // Verify all data was created atomically
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('location');
            expect(result.location).toHaveProperty('name', 'Test Location');

            // Verify in database
            const eventCheck = await dbHelper.testTransactionClient.query(
                'SELECT * FROM events WHERE id = $1',
                [result.id]
            );
            expect(eventCheck.rows).toHaveLength(1);

            const locationCheck = await dbHelper.testTransactionClient.query(
                'SELECT * FROM locations WHERE entity_type = $1 AND entity_id = $2',
                ['event', result.id]
            );
            expect(locationCheck.rows).toHaveLength(1);

            const postCheck = await dbHelper.testTransactionClient.query(
                'SELECT * FROM posts WHERE id = $1',
                [result.post.id]
            );
            expect(postCheck.rows).toHaveLength(1);
        });

        it('should handle concurrent event creation properly', async () => {
            const eventData1 = {
                title: 'Concurrent Event 1',
                startTime: '2025-12-25T23:00:00Z'
            };

            const eventData2 = {
                title: 'Concurrent Event 2',
                startTime: '2025-12-25T23:30:00Z'
            };

            const postData1 = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Concurrent event 1',
                isSupportersOnly: false
            };

            const postData2 = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Concurrent event 2',
                isSupportersOnly: false
            };

            // Create events concurrently
            const [result1, result2] = await Promise.all([
                EventModel.createEvent(eventData1, postData1, testUser.id),
                EventModel.createEvent(eventData2, postData2, testUser.id)
            ]);

            // Both should succeed with different IDs
            expect(result1).toHaveProperty('id');
            expect(result2).toHaveProperty('id');
            expect(result1.id).not.toBe(result2.id);
            expect(result1.title).toBe('Concurrent Event 1');
            expect(result2.title).toBe('Concurrent Event 2');
        });
    });

    describe('Database Connection Pool Management', () => {
        it('should properly manage database connections', async () => {
            const initialConnections = db.pool.totalCount;

            // Create multiple events to test connection handling
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    EventModel.createEvent({
                        title: `Pool Test Event ${i}`,
                        startTime: '2025-12-26T10:00:00Z'
                    }, {
                        communityId: testCommunity.id,
                        content: `TEST_DATA: Pool test event ${i}`,
                        isSupportersOnly: false
                    }, testUser.id)
                );
            }

            const results = await Promise.all(promises);

            // All events should be created successfully
            expect(results).toHaveLength(5);
            results.forEach((result, index) => {
                expect(result).toHaveProperty('id');
                expect(result.title).toBe(`Pool Test Event ${index}`);
            });

            // Connection count should not have grown excessively
            const finalConnections = db.pool.totalCount;
            expect(finalConnections).toBeLessThanOrEqual(initialConnections + 2);
        });

        it('should handle database errors gracefully without connection leaks', async () => {
            const initialConnections = db.pool.totalCount;

            // Create events that will fail
            const promises = [];
            for (let i = 0; i < 3; i++) {
                promises.push(
                    EventModel.createEvent({
                        title: `Failing Event ${i}`,
                        startTime: '2025-12-26T11:00:00Z'
                    }, {
                        communityId: 999999, // Invalid community ID
                        content: `TEST_DATA: This will fail ${i}`,
                        isSupportersOnly: false
                    }, testUser.id).catch(error => error) // Catch errors
                );
            }

            const results = await Promise.all(promises);

            // All should have failed
            results.forEach(result => {
                expect(result).toBeInstanceOf(Error);
            });

            // Connection count should be stable (no leaks)
            const finalConnections = db.pool.totalCount;
            expect(finalConnections).toBe(initialConnections);
        });
    });

    describe('Complex Transaction Scenarios', () => {
        it('should handle mixed success and failure in batch operations', async () => {
            const operations = [
                // This should succeed
                {
                    eventData: {
                        title: 'Batch Success Event',
                        startTime: '2025-12-26T12:00:00Z'
                    },
                    postData: {
                        communityId: testCommunity.id,
                        content: 'TEST_DATA: Batch success event',
                        isSupportersOnly: false
                    }
                },
                // This should fail
                {
                    eventData: {
                        title: 'Batch Failure Event',
                        startTime: '2025-12-26T13:00:00Z'
                    },
                    postData: {
                        communityId: 999999, // Invalid
                        content: 'TEST_DATA: Batch failure event',
                        isSupportersOnly: false
                    }
                }
            ];

            const results = [];
            
            for (const op of operations) {
                try {
                    const result = await EventModel.createEvent(
                        op.eventData,
                        op.postData,
                        testUser.id
                    );
                    results.push({ success: true, data: result });
                } catch (error) {
                    results.push({ success: false, error });
                }
            }

            // First should succeed, second should fail
            expect(results[0]).toHaveProperty('success', true);
            expect(results[1]).toHaveProperty('success', false);

            // Verify successful event exists
            const successfulEvent = results[0].data;
            const eventCheck = await dbHelper.testTransactionClient.query(
                'SELECT * FROM events WHERE id = $1',
                [successfulEvent.id]
            );
            expect(eventCheck.rows).toHaveLength(1);
        });

        it('should maintain referential integrity across related tables', async () => {
            // Create event with multiple related records
            const eventData = {
                title: 'Referential Integrity Test',
                startTime: '2025-12-26T14:00:00Z'
            };

            const postData = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Referential integrity test',
                isSupportersOnly: false
            };

            const locationData = {
                name: 'Integrity Test Venue',
                locationType: 'venue',
                lat: 40.7589,
                lng: -73.9851,
                address: '456 Integrity Street'
            };

            const event = await EventModel.createEvent(eventData, postData, testUser.id, locationData);

            // Verify all foreign key relationships
            const eventRecord = await dbHelper.testTransactionClient.query(
                'SELECT * FROM events WHERE id = $1',
                [event.id]
            );
            expect(eventRecord.rows[0]).toHaveProperty('post_id', event.post.id);

            const postRecord = await dbHelper.testTransactionClient.query(
                'SELECT * FROM posts WHERE id = $1',
                [event.post.id]
            );
            expect(postRecord.rows[0]).toHaveProperty('community_id', testCommunity.id);
            expect(postRecord.rows[0]).toHaveProperty('user_id', testUser.id);

            const locationRecord = await dbHelper.testTransactionClient.query(
                'SELECT * FROM locations WHERE entity_type = $1 AND entity_id = $2',
                ['event', event.id]
            );
            expect(locationRecord.rows).toHaveLength(1);
            expect(locationRecord.rows[0]).toHaveProperty('entity_id', event.id);
        });
    });
});