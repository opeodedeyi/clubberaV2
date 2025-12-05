// src/middleware/models/idempotency.model.js

const db = require("../../config/db");

class IdempotencyModel {
    /**
     * Check if an idempotency key exists and return cached response
     * @param {string} key - The idempotency key
     * @returns {Object|null} Cached response or null if not found
     */
    async findByKey(key) {
        const query = `
            SELECT
                key,
                request_path,
                request_method,
                response_status,
                response_body,
                created_at
            FROM idempotency_keys
            WHERE key = $1
            LIMIT 1
        `;

        const result = await db.query(query, [key]);
        return result.rows[0] || null;
    }

    /**
     * Store a new idempotency key with response
     * @param {Object} data - Idempotency key data
     * @param {string} data.key - The idempotency key
     * @param {string} data.request_path - Request path (e.g., "/api/communities")
     * @param {string} data.request_method - HTTP method (e.g., "POST")
     * @param {number} data.user_id - User ID who made the request
     * @param {number} data.response_status - HTTP status code
     * @param {Object} data.response_body - Response body to cache
     * @returns {Object} Created idempotency record
     */
    async create(data) {
        const {
            key,
            request_path,
            request_method,
            user_id,
            response_status,
            response_body,
        } = data;

        const query = `
            INSERT INTO idempotency_keys
                (key, request_path, request_method, user_id, response_status, response_body)
            VALUES
                ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await db.query(query, [
            key,
            request_path,
            request_method,
            user_id || null,
            response_status,
            JSON.stringify(response_body),
        ]);

        return result.rows[0];
    }

    /**
     * Delete idempotency keys older than specified hours
     * @param {number} hours - Number of hours (default: 24)
     * @returns {number} Number of deleted records
     */
    async deleteExpired(hours = 24) {
        const query = `
            DELETE FROM idempotency_keys
            WHERE created_at < NOW() - INTERVAL '${hours} hours'
            RETURNING id
        `;

        const result = await db.query(query);
        return result.rowCount;
    }

    /**
     * Get count of idempotency keys (for monitoring)
     * @returns {number} Total count
     */
    async count() {
        const query = "SELECT COUNT(*) FROM idempotency_keys";
        const result = await db.query(query);
        return parseInt(result.rows[0].count);
    }
}

module.exports = new IdempotencyModel();
