const request = require('supertest');
const app = require('../../../index');
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

describe('Event API Integration Tests', () => {
    let authToken;
    let testUser;
    let testCommunity;
    
    beforeAll(async () => {
        // Create a real test user
        const userResult = await db.query(`
            INSERT INTO users (full_name, email, password_hash, unique_url, is_email_confirmed, is_active, role) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `, ['API Test User', `apitest${Date.now()}@example.com`, 'hashedpassword', `api-test-user-${Date.now()}`, true, true, 'user']);
        testUser = userResult.rows[0];

        // Create a real test community
        const communityResult = await db.query(`
            INSERT INTO communities (name, unique_url, tagline, description, is_private, is_active, created_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `, [`API Test Community ${Date.now()}`, `api-test-community-${Date.now()}`, 'Test tagline', 'Test community for API tests', false, true, testUser.id]);
        testCommunity = communityResult.rows[0];

        // Generate real JWT auth token
        const token = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        authToken = `Bearer ${token}`;
    });

    afterAll(async () => {
        // Clean up test data
        if (testCommunity?.id) {
            await db.query('DELETE FROM communities WHERE id = $1', [testCommunity.id]);
        }
        if (testUser?.id) {
            await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
        }
        await db.pool.end();
    });

    describe('POST /communities/:communityId/events', () => {
        it('should create event with real database - catches SQL parameter errors', async () => {
            const eventData = {
                title: 'Real API Test Event',
                description: 'Testing with real database connection',
                startTime: '2025-12-25T10:00:00Z',
                endTime: '2025-12-25T12:00:00Z',
                maxAttendees: 25,
                timezone: 'UTC',
                locationDetails: 'Conference Room B',
                content: 'API Test: Real database event creation',
                isSupportersOnly: false
            };

            const response = await request(app)
                .post(`/api/events/communities/${testCommunity.id}/events`)
                .set('Authorization', authToken)
                .send(eventData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('title', 'Real API Test Event');
            expect(response.body.data).toHaveProperty('post');
            expect(response.body.data.post).toHaveProperty('communityId', testCommunity.id);

            // Verify the event exists in database
            const dbEvent = await db.query('SELECT * FROM events WHERE id = $1', [response.body.data.id]);
            expect(dbEvent.rows).toHaveLength(1);
            expect(dbEvent.rows[0].title).toBe('Real API Test Event');
        });

        it('should create event with location - tests real SQL transactions', async () => {
            const eventData = {
                title: 'Event with Real Location',
                startTime: '2025-12-25T14:00:00Z',
                content: 'API Test: Event with location',
                isSupportersOnly: false,
                location: {
                    name: 'Real Test Venue',
                    locationType: 'venue',
                    lat: 40.7128,
                    lng: -74.0060,
                    address: '123 Real Street, NY'
                }
            };

            const response = await request(app)
                .post(`/api/events/communities/${testCommunity.id}/events`)
                .set('Authorization', authToken)
                .send(eventData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('location');
            expect(response.body.data.location).toHaveProperty('name', 'Real Test Venue');

            // Verify location was created in database
            const dbLocation = await db.query('SELECT * FROM locations WHERE event_id = $1', [response.body.data.id]);
            expect(dbLocation.rows).toHaveLength(1);
            expect(dbLocation.rows[0].name).toBe('Real Test Venue');
        });

        it('should handle community identifier by unique_url - catches NaN parsing errors', async () => {
            const eventData = {
                title: 'Event with URL Identifier',
                startTime: '2025-12-25T16:00:00Z',
                content: 'API Test: Using community unique_url',
                isSupportersOnly: false
            };

            const response = await request(app)
                .post(`/api/events/communities/${testCommunity.unique_url}/events`)
                .set('Authorization', authToken)
                .send(eventData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.post).toHaveProperty('communityId', testCommunity.id);
        });

        it('should return 400 for invalid community identifier', async () => {
            const eventData = {
                title: 'Event with Invalid Community',
                startTime: '2025-12-25T18:00:00Z',
                content: 'API Test: Should fail',
                isSupportersOnly: false
            };

            const response = await request(app)
                .post('/api/events/communities/non-existent-community/events')
                .set('Authorization', authToken)
                .send(eventData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Community not found');
        });

        it('should return 400 for missing required fields', async () => {
            const eventData = {
                // Missing title and startTime
                content: 'API Test: Missing required fields'
            };

            const response = await request(app)
                .post(`/api/events/communities/${testCommunity.id}/events`)
                .set('Authorization', authToken)
                .send(eventData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /:eventId', () => {
        let createdEvent;

        beforeEach(async () => {
            // Create an event via API for testing retrieval
            const eventData = {
                title: 'Event for Retrieval Test',
                startTime: '2025-12-25T20:00:00Z',
                content: 'API Test: Event for GET test',
                isSupportersOnly: false
            };

            const response = await request(app)
                .post(`/api/events/communities/${testCommunity.id}/events`)
                .set('Authorization', authToken)
                .send(eventData);

            createdEvent = response.body.data;
        });

        it('should retrieve event with all data', async () => {
            const response = await request(app)
                .get(`/api/events/${createdEvent.id}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id', createdEvent.id);
            expect(response.body.data).toHaveProperty('title', 'Event for Retrieval Test');
            expect(response.body.data).toHaveProperty('post');
            expect(response.body.data).toHaveProperty('formattedDate');
            expect(response.body.data).toHaveProperty('formattedTime');
        });

        it('should return 404 for non-existent event', async () => {
            const response = await request(app)
                .get('/api/events/999999')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Event not found');
        });
    });

    describe('PUT /:eventId', () => {
        let createdEvent;

        beforeEach(async () => {
            // Create an event for updating
            const eventData = {
                title: 'Event for Update Test',
                startTime: '2025-12-25T22:00:00Z',
                content: 'API Test: Original content',
                isSupportersOnly: false
            };

            const response = await request(app)
                .post(`/api/events/communities/${testCommunity.id}/events`)
                .set('Authorization', authToken)
                .send(eventData);

            createdEvent = response.body.data;
        });

        it('should update event successfully', async () => {
            const updateData = {
                title: 'Updated Event Title',
                description: 'Updated description',
                content: 'API Test: Updated content',
                isSupportersOnly: true
            };

            const response = await request(app)
                .put(`/api/events/${createdEvent.id}`)
                .set('Authorization', authToken)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('title', 'Updated Event Title');
            expect(response.body.data).toHaveProperty('description', 'Updated description');
            expect(response.body.data.post).toHaveProperty('isSupportersOnly', true);
            expect(response.body.data.post).toHaveProperty('isEdited', true);

            // Verify update in database
            const dbEvent = await db.query('SELECT * FROM events WHERE id = $1', [createdEvent.id]);
            expect(dbEvent.rows[0].title).toBe('Updated Event Title');
        });
    });

    describe('DELETE /:eventId', () => {
        let createdEvent;

        beforeEach(async () => {
            // Create an event for deletion
            const eventData = {
                title: 'Event for Delete Test',
                startTime: '2025-12-26T10:00:00Z',
                content: 'API Test: Event for deletion',
                isSupportersOnly: false
            };

            const response = await request(app)
                .post(`/api/events/communities/${testCommunity.id}/events`)
                .set('Authorization', authToken)
                .send(eventData);

            createdEvent = response.body.data;
        });

        it('should delete event successfully', async () => {
            const response = await request(app)
                .delete(`/api/events/${createdEvent.id}`)
                .set('Authorization', authToken)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify deletion in database
            const dbEvent = await db.query('SELECT * FROM events WHERE id = $1', [createdEvent.id]);
            expect(dbEvent.rows).toHaveLength(0);

            // Verify associated post is also deleted
            const dbPost = await db.query('SELECT * FROM posts WHERE id = $1', [createdEvent.post.id]);
            expect(dbPost.rows).toHaveLength(0);
        });
    });
});