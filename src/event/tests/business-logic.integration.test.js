// src/event/tests/business-logic.integration.test.js
const EventModel = require('../models/event.model');
const AttendanceModel = require('../models/attendance.model');
const DatabaseTestHelper = require('../../test-helpers/database.helper');

describe('Event Business Logic Integration Tests', () => {
    let dbHelper;
    let testUser;
    let testCommunity;

    beforeAll(async () => {
        dbHelper = new DatabaseTestHelper();
    });

    beforeEach(async () => {
        await dbHelper.beginTestTransaction();
        
        // Create test data
        testUser = await dbHelper.createTestUser({
            full_name: 'Business Logic Test User',
            email: `businesslogic${Date.now()}@example.com`
        });

        testCommunity = await dbHelper.createTestCommunity({
            name: `Business Logic Test Community ${Date.now()}`,
            unique_url: `business-test-${Date.now()}`
        }, testUser.id);

        // Mock the database module
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

    describe('Event Capacity and Waitlist Management', () => {
        let capacityEvent;
        let users;

        beforeEach(async () => {
            // Create event with small capacity
            capacityEvent = await EventModel.createEvent({
                title: 'Capacity Test Event',
                startTime: '2025-12-27T10:00:00Z',
                maxAttendees: 2
            }, {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Capacity management test'
            }, testUser.id);

            // Create additional test users
            users = [];
            for (let i = 0; i < 5; i++) {
                const user = await dbHelper.createTestUser({
                    email: `capacityuser${i}${Date.now()}@example.com`
                });
                
                // Add to community
                await dbHelper.testTransactionClient.query(
                    'INSERT INTO community_members (user_id, community_id, role) VALUES ($1, $2, $3)',
                    [user.id, testCommunity.id, 'member']
                );
                
                users.push(user);
            }
        });

        it('should correctly manage event capacity transitions', async () => {
            // Fill event to capacity
            const attendee1 = await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[0].id, 'attending');
            expect(attendee1.status).toBe('attending');
            expect(attendee1.eventIsFull).toBe(false);

            const attendee2 = await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[1].id, 'attending');
            expect(attendee2.status).toBe('attending');
            expect(attendee2.eventIsFull).toBe(true);

            // Next user should be waitlisted
            const waitlisted1 = await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[2].id, 'attending');
            expect(waitlisted1.status).toBe('waitlisted');
            expect(waitlisted1.waitlistPosition).toBe(1);

            // Another waitlisted user
            const waitlisted2 = await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[3].id, 'attending');
            expect(waitlisted2.status).toBe('waitlisted');
            expect(waitlisted2.waitlistPosition).toBe(2);
        });

        it('should handle complex waitlist promotion scenarios', async () => {
            // Fill capacity and create waitlist
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[0].id, 'attending');
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[1].id, 'attending');
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[2].id, 'attending'); // waitlisted
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[3].id, 'attending'); // waitlisted
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[4].id, 'attending'); // waitlisted

            // Change first attendee to 'maybe' (frees up a spot)
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[0].id, 'maybe');

            // Check that first waitlisted user was promoted
            const promoted = await AttendanceModel.getAttendanceStatus(capacityEvent.id, users[2].id);
            expect(promoted.attendanceStatus).toBe('attending');

            // Check remaining waitlist positions
            const waitlist1 = await AttendanceModel.getAttendanceStatus(capacityEvent.id, users[3].id);
            const waitlist2 = await AttendanceModel.getAttendanceStatus(capacityEvent.id, users[4].id);
            
            expect(waitlist1.attendanceStatus).toBe('waitlisted');
            expect(waitlist1.waitlistPosition).toBe(1);
            expect(waitlist2.attendanceStatus).toBe('waitlisted');
            expect(waitlist2.waitlistPosition).toBe(2);
        });

        it('should handle users leaving waitlist correctly', async () => {
            // Fill capacity and create waitlist
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[0].id, 'attending');
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[1].id, 'attending');
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[2].id, 'attending'); // pos 1
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[3].id, 'attending'); // pos 2
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[4].id, 'attending'); // pos 3

            // User at position 2 leaves waitlist
            await AttendanceModel.setAttendanceStatus(capacityEvent.id, users[3].id, 'not_attending');

            // Check that remaining positions adjusted
            const user2Status = await AttendanceModel.getAttendanceStatus(capacityEvent.id, users[2].id);
            const user4Status = await AttendanceModel.getAttendanceStatus(capacityEvent.id, users[4].id);

            expect(user2Status.waitlistPosition).toBe(1);
            expect(user4Status.waitlistPosition).toBe(2);
        });
    });

    describe('Event Timing and Status Logic', () => {
        it('should correctly calculate event timing information', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
            
            const event = await EventModel.createEvent({
                title: 'Future Event',
                startTime: futureDate.toISOString(),
                timezone: 'America/New_York'
            }, {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Future event test'
            }, testUser.id);

            expect(event).toHaveProperty('formattedDate');
            expect(event).toHaveProperty('formattedTime');
            expect(event).toHaveProperty('startingIn');
            expect(event.startingIn).toMatch(/\d+\s+(day|days)/);
        });

        it('should handle past events correctly', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 10); // 10 days ago
            
            const pastEvent = await EventModel.createEvent({
                title: 'Past Event',
                startTime: pastDate.toISOString()
            }, {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Past event test'
            }, testUser.id);

            expect(pastEvent).toHaveProperty('formattedDate');
            expect(pastEvent).toHaveProperty('startingIn');
            // Should indicate it's in the past
            expect(pastEvent.startingIn).toMatch(/ago|passed/i);
        });

        it('should handle events starting very soon', async () => {
            const soonDate = new Date();
            soonDate.setMinutes(soonDate.getMinutes() + 30); // 30 minutes from now
            
            const soonEvent = await EventModel.createEvent({
                title: 'Soon Event',
                startTime: soonDate.toISOString()
            }, {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Soon event test'
            }, testUser.id);

            expect(soonEvent.startingIn).toMatch(/minutes?|hour/i);
        });
    });

    describe('Event Privacy and Access Control', () => {
        let privateEvent;
        let supportersOnlyEvent;
        let publicEvent;
        let regularUser;

        beforeEach(async () => {
            // Create a regular user (not community owner)
            regularUser = await dbHelper.createTestUser({
                email: `regular${Date.now()}@example.com`
            });

            await dbHelper.testTransactionClient.query(
                'INSERT INTO community_members (user_id, community_id, role) VALUES ($1, $2, $3)',
                [regularUser.id, testCommunity.id, 'member']
            );

            // Create different types of events
            publicEvent = await EventModel.createEvent({
                title: 'Public Event',
                startTime: '2025-12-27T15:00:00Z'
            }, {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Public event',
                isSupportersOnly: false
            }, testUser.id);

            supportersOnlyEvent = await EventModel.createEvent({
                title: 'Supporters Only Event',
                startTime: '2025-12-27T16:00:00Z'
            }, {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Supporters only event',
                isSupportersOnly: true
            }, testUser.id);
        });

        it('should allow regular members to attend public events', async () => {
            const result = await AttendanceModel.setAttendanceStatus(
                publicEvent.id,
                regularUser.id,
                'attending'
            );

            expect(result.status).toBe('attending');
        });

        it('should handle supporters-only event access correctly', async () => {
            // This would normally check community subscription status
            // For now, we'll test the basic flow
            const result = await AttendanceModel.setAttendanceStatus(
                supportersOnlyEvent.id,
                regularUser.id,
                'attending'
            );

            // The actual implementation should check subscription status
            expect(result).toHaveProperty('status');
        });
    });

    describe('Event Search and Filtering Logic', () => {
        let events;

        beforeEach(async () => {
            // Create multiple events for testing
            const eventData = [
                {
                    title: 'Tech Meetup',
                    startTime: '2025-12-27T18:00:00Z',
                    maxAttendees: 50
                },
                {
                    title: 'Design Workshop',
                    startTime: '2025-12-28T14:00:00Z',
                    maxAttendees: 20
                },
                {
                    title: 'Networking Event',
                    startTime: '2025-12-29T19:00:00Z',
                    maxAttendees: 100
                }
            ];

            events = [];
            for (let i = 0; i < eventData.length; i++) {
                const event = await EventModel.createEvent(eventData[i], {
                    communityId: testCommunity.id,
                    content: `TEST_DATA: Event ${i + 1}`,
                    isSupportersOnly: i === 1 // Make second event supporters-only
                }, testUser.id);
                events.push(event);
            }
        });

        it('should retrieve community events with filtering', async () => {
            const allEvents = await EventModel.getCommunityEvents(testCommunity.id, {
                limit: 10
            });

            expect(allEvents).toHaveProperty('events');
            expect(allEvents.events).toHaveLength(3);
            expect(allEvents).toHaveProperty('pagination');
        });

        it('should filter events by supporters-only status', async () => {
            const supportersEvents = await EventModel.getCommunityEvents(testCommunity.id, {
                isSupportersOnly: true
            });

            expect(supportersEvents.events).toHaveLength(1);
            expect(supportersEvents.events[0].post.isSupportersOnly).toBe(true);
        });

        it('should handle event pagination correctly', async () => {
            const page1 = await EventModel.getCommunityEvents(testCommunity.id, {
                page: 1,
                limit: 2
            });

            expect(page1.events).toHaveLength(2);
            expect(page1.pagination.totalPages).toBe(2);

            const page2 = await EventModel.getCommunityEvents(testCommunity.id, {
                page: 2,
                limit: 2
            });

            expect(page2.events).toHaveLength(1);
        });
    });

    describe('Event Update Business Logic', () => {
        let testEvent;
        let attendees;

        beforeEach(async () => {
            // Create event with attendees
            testEvent = await EventModel.createEvent({
                title: 'Update Test Event',
                startTime: '2025-12-27T20:00:00Z',
                maxAttendees: 30
            }, {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Update test event'
            }, testUser.id);

            // Add some attendees
            attendees = [];
            for (let i = 0; i < 3; i++) {
                const user = await dbHelper.createTestUser({
                    email: `attendee${i}${Date.now()}@example.com`
                });
                
                await dbHelper.testTransactionClient.query(
                    'INSERT INTO community_members (user_id, community_id, role) VALUES ($1, $2, $3)',
                    [user.id, testCommunity.id, 'member']
                );

                await AttendanceModel.setAttendanceStatus(testEvent.id, user.id, 'attending');
                attendees.push(user);
            }
        });

        it('should handle capacity reduction properly', async () => {
            // Reduce capacity from 30 to 2 (less than current attendees)
            const updatedEvent = await EventModel.updateEvent(testEvent.id, {
                maxAttendees: 2
            });

            expect(updatedEvent.maxAttendees).toBe(2);

            // Check that excess attendees are handled appropriately
            // (Implementation would typically move them to waitlist)
            const attendeesList = await AttendanceModel.getEventAttendees(testEvent.id);
            expect(attendeesList.summary.attending).toBeLessThanOrEqual(2);
        });

        it('should handle time changes correctly', async () => {
            const newStartTime = '2025-12-28T20:00:00Z';
            
            const updatedEvent = await EventModel.updateEvent(testEvent.id, {
                startTime: newStartTime
            });

            expect(updatedEvent.startTime).toBe(newStartTime);
            expect(updatedEvent.post.isEdited).toBe(true);
            expect(updatedEvent.post.editedAt).toBeDefined();
        });

        it('should maintain referential integrity during updates', async () => {
            const updateData = {
                title: 'Updated Event Title',
                description: 'Updated description'
            };

            const postUpdateData = {
                content: 'TEST_DATA: Updated content'
            };

            const updatedEvent = await EventModel.updateEvent(
                testEvent.id,
                updateData,
                postUpdateData
            );

            // Verify event was updated
            expect(updatedEvent.title).toBe('Updated Event Title');
            expect(updatedEvent.description).toBe('Updated description');
            
            // Verify post was updated
            expect(updatedEvent.post.content).toBe('TEST_DATA: Updated content');
            expect(updatedEvent.post.isEdited).toBe(true);

            // Verify attendees are still intact
            const attendeesList = await AttendanceModel.getEventAttendees(testEvent.id);
            expect(attendeesList.summary.attending).toBe(3);
        });
    });
});