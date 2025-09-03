// src/event/tests/event.model.integration.test.js
const EventModel = require('../models/event.model');
const DatabaseTestHelper = require('../../test-helpers/database.helper');

describe('Event Model Integration Tests', () => {
    let dbHelper;
    let testUser;
    let testCommunity;

    beforeAll(async () => {
        dbHelper = new DatabaseTestHelper();
    });

    beforeEach(async () => {
        await dbHelper.beginTestTransaction();
        
        // Create test user and community for each test
        testUser = await dbHelper.createTestUser({
            full_name: 'Event Test User',
            email: `eventtest${Date.now()}@example.com`
        });

        testCommunity = await dbHelper.createTestCommunity({
            name: `Event Test Community ${Date.now()}`,
            unique_url: `event-test-community-${Date.now()}`
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

    describe('createEvent', () => {
        it('should create an event with minimum required fields', async () => {
            const eventData = {
                title: 'Integration Test Event',
                startTime: '2025-12-25T10:00:00Z'
            };

            const postData = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Integration test event post',
                isSupportersOnly: false
            };

            const result = await EventModel.createEvent(eventData, postData, testUser.id);

            // Verify event was created
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('title', 'Integration Test Event');
            expect(result).toHaveProperty('startTime', '2025-12-25T10:00:00.000Z');
            expect(result).toHaveProperty('post');
            expect(result.post).toHaveProperty('communityId', testCommunity.id);
            expect(result.post).toHaveProperty('userId', testUser.id);
            expect(result).toHaveProperty('formattedDate');
            expect(result).toHaveProperty('formattedTime');
            expect(result).toHaveProperty('startingIn');
        });

        it('should create an event with location data', async () => {
            const eventData = {
                title: 'Event With Location',
                description: 'An event with location',
                startTime: '2025-12-25T14:00:00Z',
                endTime: '2025-12-25T16:00:00Z',
                timezone: 'America/New_York',
                locationDetails: 'Conference Room A',
                maxAttendees: 50
            };

            const postData = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Event with location',
                isSupportersOnly: true
            };

            const locationData = {
                name: 'Tech Hub NYC',
                locationType: 'venue',
                lat: 40.7128,
                lng: -74.0060,
                address: '123 Tech Street, New York, NY 10001'
            };

            const result = await EventModel.createEvent(eventData, postData, testUser.id, locationData);

            // Verify event with location was created
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('title', 'Event With Location');
            expect(result).toHaveProperty('description', 'An event with location');
            expect(result).toHaveProperty('maxAttendees', 50);
            expect(result).toHaveProperty('timezone', 'America/New_York');
            expect(result).toHaveProperty('locationDetails', 'Conference Room A');
            
            // Verify location was created
            expect(result).toHaveProperty('location');
            expect(result.location).toHaveProperty('name', 'Tech Hub NYC');
            expect(result.location).toHaveProperty('locationType', 'venue');
            expect(result.location).toHaveProperty('lat', 40.7128);
            expect(result.location).toHaveProperty('lng', -74.0060);
            expect(result.location).toHaveProperty('address', '123 Tech Street, New York, NY 10001');

            // Verify post data
            expect(result.post).toHaveProperty('isSupportersOnly', true);
            expect(result.post).toHaveProperty('contentType', 'event');
        });

        it('should handle database transaction errors properly', async () => {
            // Create event data with invalid community ID to trigger error
            const eventData = {
                title: 'Failed Event',
                startTime: '2025-12-25T10:00:00Z'
            };

            const postData = {
                communityId: 999999, // Non-existent community
                content: 'TEST_DATA: This should fail',
                isSupportersOnly: false
            };

            await expect(EventModel.createEvent(eventData, postData, testUser.id))
                .rejects.toThrow(/Failed to create event/);
        });

        it('should generate unique URLs for events', async () => {
            const eventData1 = {
                title: 'Duplicate Title Event',
                startTime: '2025-12-25T10:00:00Z'
            };

            const eventData2 = {
                title: 'Duplicate Title Event',
                startTime: '2025-12-25T11:00:00Z'
            };

            const postData1 = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: First duplicate',
                isSupportersOnly: false
            };

            const postData2 = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Second duplicate',
                isSupportersOnly: false
            };

            const result1 = await EventModel.createEvent(eventData1, postData1, testUser.id);
            const result2 = await EventModel.createEvent(eventData2, postData2, testUser.id);

            // Both events should be created with different unique URLs
            expect(result1).toHaveProperty('id');
            expect(result2).toHaveProperty('id');
            expect(result1.id).not.toBe(result2.id);
        });
    });

    describe('getEventById', () => {
        it('should retrieve event with all associated data', async () => {
            // First create an event
            const eventData = {
                title: 'Retrievable Event',
                description: 'Event for retrieval test',
                startTime: '2025-12-25T15:00:00Z',
                maxAttendees: 30
            };

            const postData = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Retrievable event',
                isSupportersOnly: false
            };

            const locationData = {
                name: 'Test Venue',
                locationType: 'venue',
                lat: 40.7589,
                lng: -73.9851,
                address: '456 Event Street'
            };

            const createdEvent = await EventModel.createEvent(eventData, postData, testUser.id, locationData);

            // Now retrieve it
            const retrievedEvent = await EventModel.getEventById(createdEvent.id);

            expect(retrievedEvent).toHaveProperty('id', createdEvent.id);
            expect(retrievedEvent).toHaveProperty('title', 'Retrievable Event');
            expect(retrievedEvent).toHaveProperty('description', 'Event for retrieval test');
            expect(retrievedEvent).toHaveProperty('maxAttendees', 30);
            expect(retrievedEvent).toHaveProperty('post');
            expect(retrievedEvent).toHaveProperty('location');
            expect(retrievedEvent.location).toHaveProperty('name', 'Test Venue');
        });

        it('should throw error for non-existent event', async () => {
            await expect(EventModel.getEventById(999999))
                .rejects.toThrow('Event not found');
        });
    });

    describe('updateEvent', () => {
        let testEvent;

        beforeEach(async () => {
            // Create a test event to update
            const eventData = {
                title: 'Event to Update',
                description: 'Original description',
                startTime: '2025-12-25T16:00:00Z',
                maxAttendees: 20
            };

            const postData = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Event for updating',
                isSupportersOnly: false
            };

            testEvent = await EventModel.createEvent(eventData, postData, testUser.id);
        });

        it('should update event fields successfully', async () => {
            const updateData = {
                title: 'Updated Event Title',
                description: 'Updated description',
                maxAttendees: 50
            };

            const postUpdateData = {
                content: 'TEST_DATA: Updated event content',
                isSupportersOnly: true
            };

            const updatedEvent = await EventModel.updateEvent(testEvent.id, updateData, postUpdateData);

            expect(updatedEvent).toHaveProperty('title', 'Updated Event Title');
            expect(updatedEvent).toHaveProperty('description', 'Updated description');
            expect(updatedEvent).toHaveProperty('maxAttendees', 50);
            expect(updatedEvent.post).toHaveProperty('isSupportersOnly', true);
            expect(updatedEvent.post).toHaveProperty('isEdited', true);
            expect(updatedEvent.post).toHaveProperty('editedAt');
        });

        it('should add location to existing event', async () => {
            const locationData = {
                name: 'New Venue',
                locationType: 'venue',
                lat: 40.7505,
                lng: -73.9934,
                address: '789 New Street'
            };

            const updatedEvent = await EventModel.updateEvent(testEvent.id, {}, null, locationData);

            expect(updatedEvent).toHaveProperty('location');
            expect(updatedEvent.location).toHaveProperty('name', 'New Venue');
            expect(updatedEvent.location).toHaveProperty('address', '789 New Street');
        });
    });

    describe('deleteEvent', () => {
        it('should delete event and associated post', async () => {
            // Create event to delete
            const eventData = {
                title: 'Event to Delete',
                startTime: '2025-12-25T17:00:00Z'
            };

            const postData = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Event for deletion',
                isSupportersOnly: false
            };

            const createdEvent = await EventModel.createEvent(eventData, postData, testUser.id);

            // Delete the event
            const result = await EventModel.deleteEvent(createdEvent.id);
            expect(result).toBe(true);

            // Verify event is deleted
            await expect(EventModel.getEventById(createdEvent.id))
                .rejects.toThrow('Event not found');
        });
    });

    describe('canManageEvent', () => {
        let testEvent;
        let otherUser;

        beforeEach(async () => {
            // Create another user
            otherUser = await dbHelper.createTestUser({
                full_name: 'Other User',
                email: `other${Date.now()}@example.com`
            });

            // Create event
            const eventData = {
                title: 'Permission Test Event',
                startTime: '2025-12-25T18:00:00Z'
            };

            const postData = {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Permission test event',
                isSupportersOnly: false
            };

            testEvent = await EventModel.createEvent(eventData, postData, testUser.id);
        });

        it('should allow event creator to manage event', async () => {
            const canManage = await EventModel.canManageEvent(testEvent.id, testUser.id);
            expect(canManage).toBe(true);
        });

        it('should prevent non-creator from managing event', async () => {
            const canManage = await EventModel.canManageEvent(testEvent.id, otherUser.id);
            expect(canManage).toBe(false);
        });
    });
});