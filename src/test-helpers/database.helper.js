// src/test-helpers/database.helper.js
const db = require('../config/db');

class DatabaseTestHelper {
    constructor() {
        this.testTransactionClient = null;
    }

    // Start a test transaction that will be rolled back
    async beginTestTransaction() {
        this.testTransactionClient = await db.pool.connect();
        await this.testTransactionClient.query('BEGIN');
        return this.testTransactionClient;
    }

    // Rollback the test transaction
    async rollbackTestTransaction() {
        if (this.testTransactionClient) {
            await this.testTransactionClient.query('ROLLBACK');
            this.testTransactionClient.release();
            this.testTransactionClient = null;
        }
    }

    // Create a mock db that uses the test transaction
    getMockDbWithTransaction() {
        if (!this.testTransactionClient) {
            throw new Error('Test transaction not started. Call beginTestTransaction() first.');
        }

        return {
            query: (text, params) => this.testTransactionClient.query(text, params),
            executeTransaction: async (operations) => {
                const results = [];
                for (const operation of operations) {
                    const result = await this.testTransactionClient.query(operation.text, operation.values);
                    results.push(result);
                }
                return results;
            },
            pool: db.pool
        };
    }

    // Close all database connections (for afterAll)
    static async closeDatabase() {
        await db.pool.end();
    }

    // Helper to create test data
    async createTestUser(userData = {}) {
        const defaultUser = {
            full_name: 'Test User',
            email: `test${Date.now()}@example.com`,
            password_hash: '$2b$10$test.hash.here',
            unique_url: `test-user-${Date.now()}`,
            is_email_confirmed: true,
            is_active: true
        };

        const user = { ...defaultUser, ...userData };
        
        const query = `
            INSERT INTO users (full_name, email, password_hash, unique_url, is_email_confirmed, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const result = await this.testTransactionClient.query(query, [
            user.full_name,
            user.email,
            user.password_hash,
            user.unique_url,
            user.is_email_confirmed,
            user.is_active
        ]);
        
        return result.rows[0];
    }

    async createTestCommunity(communityData = {}, userId) {
        const defaultCommunity = {
            name: `Test Community ${Date.now()}`,
            unique_url: `test-community-${Date.now()}`,
            tagline: 'A test community',
            description: 'This is a test community',
            is_private: false,
            is_active: true,
            created_by: userId
        };

        const community = { ...defaultCommunity, ...communityData };
        
        const query = `
            INSERT INTO communities (name, unique_url, tagline, description, is_private, is_active, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const result = await this.testTransactionClient.query(query, [
            community.name,
            community.unique_url,
            community.tagline,
            community.description,
            community.is_private,
            community.is_active,
            community.created_by
        ]);
        
        // Add creator as owner
        await this.testTransactionClient.query(
            'INSERT INTO community_members (user_id, community_id, role) VALUES ($1, $2, $3)',
            [userId, result.rows[0].id, 'owner']
        );
        
        return result.rows[0];
    }

    // Clean up specific test data (alternative to full rollback)
    async cleanupTestData() {
        if (this.testTransactionClient) {
            // Delete test data in reverse dependency order
            await this.testTransactionClient.query("DELETE FROM event_attendees WHERE event_id IN (SELECT id FROM events WHERE post_id IN (SELECT id FROM posts WHERE content LIKE '%TEST_DATA%'))");
            await this.testTransactionClient.query("DELETE FROM events WHERE post_id IN (SELECT id FROM posts WHERE content LIKE '%TEST_DATA%')");
            await this.testTransactionClient.query("DELETE FROM posts WHERE content LIKE '%TEST_DATA%'");
            await this.testTransactionClient.query("DELETE FROM community_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%@example.com')");
            await this.testTransactionClient.query("DELETE FROM communities WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%test%@example.com')");
            await this.testTransactionClient.query("DELETE FROM users WHERE email LIKE '%test%@example.com'");
        }
    }
}

module.exports = DatabaseTestHelper;