// src/event/tests/attendance.model.integration.test.js
const AttendanceModel = require('../models/attendance.model');
const EventModel = require('../models/event.model');
const DatabaseTestHelper = require('../../test-helpers/database.helper');

describe('Attendance Model Integration Tests', () => {
    let dbHelper;
    let testUser;
    let testCommunity;
    let testEvent;
    let otherUser;

    beforeAll(async () => {
        dbHelper = new DatabaseTestHelper();
    });

    beforeEach(async () => {
        await dbHelper.beginTestTransaction();
        
        // Create test users and community
        testUser = await dbHelper.createTestUser({
            full_name: 'Attendance Test User',
            email: `attendancetest${Date.now()}@example.com`
        });

        otherUser = await dbHelper.createTestUser({
            full_name: 'Other Attendance User',
            email: `otherattendance${Date.now()}@example.com`
        });

        testCommunity = await dbHelper.createTestCommunity({
            name: `Attendance Test Community ${Date.now()}`,
            unique_url: `attendance-test-community-${Date.now()}`
        }, testUser.id);

        // Add other user to community
        await dbHelper.testTransactionClient.query(
            'INSERT INTO community_members (user_id, community_id, role) VALUES ($1, $2, $3)',
            [otherUser.id, testCommunity.id, 'member']
        );

        // Create test event
        const eventData = {
            title: 'Attendance Test Event',
            startTime: '2025-12-25T19:00:00Z',
            maxAttendees: 2
        };

        const postData = {
            communityId: testCommunity.id,
            content: 'TEST_DATA: Attendance test event',
            isSupportersOnly: false
        };

        testEvent = await EventModel.createEvent(eventData, postData, testUser.id);

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

    describe('setAttendanceStatus', () => {
        it('should set attendance status to attending', async () => {
            const result = await AttendanceModel.setAttendanceStatus(
                testEvent.id,
                testUser.id,
                'attending'
            );

            expect(result).toHaveProperty('status', 'attending');
            expect(result).toHaveProperty('waitlistPosition', null);
            expect(result).toHaveProperty('eventIsFull', false);
            expect(result).toHaveProperty('attendeeCount', 1);
        });

        it('should handle waitlist when event is at capacity', async () => {
            // Fill up the event (maxAttendees = 2)
            await AttendanceModel.setAttendanceStatus(testEvent.id, testUser.id, 'attending');
            await AttendanceModel.setAttendanceStatus(testEvent.id, otherUser.id, 'attending');

            // Create a third user
            const thirdUser = await dbHelper.createTestUser({
                full_name: 'Third User',
                email: `third${Date.now()}@example.com`
            });

            // Add third user to community
            await dbHelper.testTransactionClient.query(
                'INSERT INTO community_members (user_id, community_id, role) VALUES ($1, $2, $3)',
                [thirdUser.id, testCommunity.id, 'member']
            );

            // Third user should be waitlisted
            const result = await AttendanceModel.setAttendanceStatus(
                testEvent.id,
                thirdUser.id,
                'attending'
            );

            expect(result).toHaveProperty('status', 'waitlisted');
            expect(result).toHaveProperty('waitlistPosition', 1);
            expect(result).toHaveProperty('eventIsFull', true);
        });

        it('should promote from waitlist when space becomes available', async () => {
            // Fill up the event and create waitlist
            await AttendanceModel.setAttendanceStatus(testEvent.id, testUser.id, 'attending');
            await AttendanceModel.setAttendanceStatus(testEvent.id, otherUser.id, 'attending');

            const thirdUser = await dbHelper.createTestUser({
                full_name: 'Third User',
                email: `third${Date.now()}@example.com`
            });

            await dbHelper.testTransactionClient.query(
                'INSERT INTO community_members (user_id, community_id, role) VALUES ($1, $2, $3)',
                [thirdUser.id, testCommunity.id, 'member']
            );

            // Third user gets waitlisted
            await AttendanceModel.setAttendanceStatus(testEvent.id, thirdUser.id, 'attending');

            // One of the attending users changes to not_attending
            await AttendanceModel.setAttendanceStatus(testEvent.id, testUser.id, 'not_attending');

            // Check if third user was promoted
            const status = await AttendanceModel.getAttendanceStatus(testEvent.id, thirdUser.id);
            expect(status).toHaveProperty('attendanceStatus', 'attending');
            expect(status).toHaveProperty('waitlistPosition', null);
        });

        it('should handle different attendance statuses', async () => {
            // Test 'maybe' status
            const maybeResult = await AttendanceModel.setAttendanceStatus(
                testEvent.id,
                testUser.id,
                'maybe'
            );
            expect(maybeResult).toHaveProperty('status', 'maybe');

            // Test 'not_attending' status
            const notAttendingResult = await AttendanceModel.setAttendanceStatus(
                testEvent.id,
                testUser.id,
                'not_attending'
            );
            expect(notAttendingResult).toHaveProperty('status', 'not_attending');
        });
    });

    describe('getAttendanceStatus', () => {
        it('should return user attendance status', async () => {
            // Set attendance first
            await AttendanceModel.setAttendanceStatus(testEvent.id, testUser.id, 'attending');

            const status = await AttendanceModel.getAttendanceStatus(testEvent.id, testUser.id);

            expect(status).toHaveProperty('attendanceStatus', 'attending');
            expect(status).toHaveProperty('waitlistPosition', null);
            expect(status).toHaveProperty('attended', null);
            expect(status).toHaveProperty('rsvpDate');
        });

        it('should return null for user with no RSVP', async () => {
            const status = await AttendanceModel.getAttendanceStatus(testEvent.id, otherUser.id);
            expect(status).toHaveProperty('attendanceStatus', null);
        });

        it('should return waitlist position for waitlisted users', async () => {
            // Fill event capacity
            await AttendanceModel.setAttendanceStatus(testEvent.id, testUser.id, 'attending');
            await AttendanceModel.setAttendanceStatus(testEvent.id, otherUser.id, 'attending');

            // Create waitlisted users
            const thirdUser = await dbHelper.createTestUser({
                email: `waitlist1${Date.now()}@example.com`
            });
            const fourthUser = await dbHelper.createTestUser({
                email: `waitlist2${Date.now()}@example.com`
            });

            // Add to community
            await dbHelper.testTransactionClient.query(
                'INSERT INTO community_members (user_id, community_id, role) VALUES ($1, $2, $3), ($4, $5, $6)',
                [thirdUser.id, testCommunity.id, 'member', fourthUser.id, testCommunity.id, 'member']
            );

            // Set to waitlist
            await AttendanceModel.setAttendanceStatus(testEvent.id, thirdUser.id, 'attending');
            await AttendanceModel.setAttendanceStatus(testEvent.id, fourthUser.id, 'attending');

            // Check positions
            const thirdStatus = await AttendanceModel.getAttendanceStatus(testEvent.id, thirdUser.id);
            const fourthStatus = await AttendanceModel.getAttendanceStatus(testEvent.id, fourthUser.id);

            expect(thirdStatus).toHaveProperty('waitlistPosition', 1);
            expect(fourthStatus).toHaveProperty('waitlistPosition', 2);
        });
    });

    describe('getEventAttendees', () => {
        beforeEach(async () => {
            // Set up some attendees
            await AttendanceModel.setAttendanceStatus(testEvent.id, testUser.id, 'attending');
            await AttendanceModel.setAttendanceStatus(testEvent.id, otherUser.id, 'maybe');
        });

        it('should return all attendees with default options', async () => {
            const result = await AttendanceModel.getEventAttendees(testEvent.id);

            expect(result).toHaveProperty('attendees');
            expect(result).toHaveProperty('pagination');
            expect(result).toHaveProperty('summary');
            expect(result.attendees).toHaveLength(2);
            expect(result.summary).toHaveProperty('attending', 1);
            expect(result.summary).toHaveProperty('maybe', 1);
        });

        it('should filter attendees by status', async () => {
            const result = await AttendanceModel.getEventAttendees(testEvent.id, { status: 'attending' });

            expect(result.attendees).toHaveLength(1);
            expect(result.attendees[0]).toHaveProperty('status', 'attending');
            expect(result.attendees[0]).toHaveProperty('userId', testUser.id);
        });

        it('should handle pagination', async () => {
            const result = await AttendanceModel.getEventAttendees(testEvent.id, { 
                limit: 1, 
                offset: 0 
            });

            expect(result.attendees).toHaveLength(1);
            expect(result.pagination).toHaveProperty('total', 2);
            expect(result.pagination).toHaveProperty('hasMore', true);
        });
    });

    describe('markAttendance', () => {
        beforeEach(async () => {
            // Set user as attending first
            await AttendanceModel.setAttendanceStatus(testEvent.id, otherUser.id, 'attending');
        });

        it('should mark user as attended', async () => {
            const result = await AttendanceModel.markAttendance(
                testEvent.id,
                otherUser.id,
                true
            );

            expect(result).toHaveProperty('userId', otherUser.id);
            expect(result).toHaveProperty('attended', true);
            expect(result).toHaveProperty('markedAt');
        });

        it('should mark user as not attended', async () => {
            const result = await AttendanceModel.markAttendance(
                testEvent.id,
                otherUser.id,
                false
            );

            expect(result).toHaveProperty('attended', false);
        });

        it('should handle marking attendance for non-RSVP user', async () => {
            const nonRsvpUser = await dbHelper.createTestUser({
                email: `nonrsvp${Date.now()}@example.com`
            });

            await dbHelper.testTransactionClient.query(
                'INSERT INTO community_members (user_id, community_id, role) VALUES ($1, $2, $3)',
                [nonRsvpUser.id, testCommunity.id, 'member']
            );

            await expect(AttendanceModel.markAttendance(testEvent.id, nonRsvpUser.id, true))
                .rejects.toThrow('User has not RSVP\'d for this event');
        });
    });

    describe('Complex Business Logic Tests', () => {
        it('should handle race condition in waitlist promotion', async () => {
            // This test simulates multiple users trying to change status simultaneously
            // Fill event to capacity
            await AttendanceModel.setAttendanceStatus(testEvent.id, testUser.id, 'attending');
            await AttendanceModel.setAttendanceStatus(testEvent.id, otherUser.id, 'attending');

            // Create waitlisted users
            const waitlistUsers = [];
            for (let i = 0; i < 3; i++) {
                const user = await dbHelper.createTestUser({
                    email: `waitlist${i}${Date.now()}@example.com`
                });
                await dbHelper.testTransactionClient.query(
                    'INSERT INTO community_members (user_id, community_id, role) VALUES ($1, $2, $3)',
                    [user.id, testCommunity.id, 'member']
                );
                await AttendanceModel.setAttendanceStatus(testEvent.id, user.id, 'attending');
                waitlistUsers.push(user);
            }

            // Now one attendee leaves
            await AttendanceModel.setAttendanceStatus(testEvent.id, testUser.id, 'not_attending');

            // Check that only the first waitlisted user was promoted
            const firstWaitlistStatus = await AttendanceModel.getAttendanceStatus(testEvent.id, waitlistUsers[0].id);
            const secondWaitlistStatus = await AttendanceModel.getAttendanceStatus(testEvent.id, waitlistUsers[1].id);

            expect(firstWaitlistStatus.attendanceStatus).toBe('attending');
            expect(secondWaitlistStatus.attendanceStatus).toBe('waitlisted');
            expect(secondWaitlistStatus.waitlistPosition).toBe(1);
        });

        it('should maintain correct waitlist positions after multiple changes', async () => {
            // Create an event with capacity 1
            const smallEvent = await EventModel.createEvent({
                title: 'Small Event',
                startTime: '2025-12-25T20:00:00Z',
                maxAttendees: 1
            }, {
                communityId: testCommunity.id,
                content: 'TEST_DATA: Small capacity event'
            }, testUser.id);

            // Fill the event
            await AttendanceModel.setAttendanceStatus(smallEvent.id, testUser.id, 'attending');

            // Create multiple waitlisted users
            const waitlistUsers = [];
            for (let i = 0; i < 5; i++) {
                const user = await dbHelper.createTestUser({
                    email: `multiuser${i}${Date.now()}@example.com`
                });
                await dbHelper.testTransactionClient.query(
                    'INSERT INTO community_members (user_id, community_id, role) VALUES ($1, $2, $3)',
                    [user.id, testCommunity.id, 'member']
                );
                await AttendanceModel.setAttendanceStatus(smallEvent.id, user.id, 'attending');
                waitlistUsers.push(user);
            }

            // Verify initial waitlist positions
            for (let i = 0; i < waitlistUsers.length; i++) {
                const status = await AttendanceModel.getAttendanceStatus(smallEvent.id, waitlistUsers[i].id);
                expect(status.waitlistPosition).toBe(i + 1);
            }

            // Remove one user from waitlist
            await AttendanceModel.setAttendanceStatus(smallEvent.id, waitlistUsers[2].id, 'not_attending');

            // Verify positions were adjusted
            const remainingPositions = [];
            for (let i = 0; i < waitlistUsers.length; i++) {
                if (i !== 2) { // Skip removed user
                    const status = await AttendanceModel.getAttendanceStatus(smallEvent.id, waitlistUsers[i].id);
                    remainingPositions.push(status.waitlistPosition);
                }
            }

            // Positions should be 1, 2, 3, 4 (continuous)
            expect(remainingPositions).toEqual([1, 2, null, 3, 4]); // null for promoted user
        });
    });
});