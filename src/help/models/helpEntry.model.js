// src/help/models/helpEntry.model.js - Updated version
const db = require("../../config/db");

class HelpEntryModel {
    async createEntry(entryData) {
        const {
            help_topic_id,
            title,
            unique_url,
            content,
            access_level = "public",
            position = 0,
            is_active = true,
        } = entryData;

        const query = `
            INSERT INTO help_entries (
                help_topic_id, title, unique_url, content, 
                access_level, position, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const { rows } = await db.query(query, [
            help_topic_id,
            title,
            unique_url,
            content,
            access_level,
            position,
            is_active,
        ]);

        return rows[0];
    }

    async updateEntry(id, entryData) {
        const {
            help_topic_id,
            title,
            unique_url,
            content,
            access_level,
            position,
            is_active,
        } = entryData;

        const query = `
            UPDATE help_entries
            SET help_topic_id = $1,
                title = $2,
                unique_url = $3,
                content = $4,
                access_level = $5,
                position = $6,
                is_active = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `;

        const { rows } = await db.query(query, [
            help_topic_id,
            title,
            unique_url,
            content,
            access_level,
            position,
            is_active,
            id,
        ]);

        return rows[0];
    }

    async deleteEntry(id) {
        const query = `
            DELETE FROM help_entries
            WHERE id = $1
            RETURNING *
        `;

        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    async getEntryById(id) {
        const query = `
            SELECT he.*, ht.name as topic_name, ht.unique_url as topic_url
            FROM help_entries he
            JOIN help_topics ht ON he.help_topic_id = ht.id
            WHERE he.id = $1
        `;

        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    async getEntryByUrl(url) {
        const query = `
            SELECT he.*, ht.name as topic_name, ht.unique_url as topic_url
            FROM help_entries he
            JOIN help_topics ht ON he.help_topic_id = ht.id
            WHERE he.unique_url = $1
        `;

        const { rows } = await db.query(query, [url]);
        return rows[0];
    }

    async incrementViewCount(id) {
        const query = `
            UPDATE help_entries
            SET view_count = view_count + 1
            WHERE id = $1
            RETURNING view_count
        `;

        const { rows } = await db.query(query, [id]);
        return rows[0]?.view_count;
    }

    async getAllEntries(filters = {}) {
        const { topicId, accessLevel, isActive = true } = filters;

        let query = `
            SELECT he.*, ht.name as topic_name, ht.unique_url as topic_url
            FROM help_entries he
            JOIN help_topics ht ON he.help_topic_id = ht.id
            WHERE he.is_active = $1
        `;

        const queryParams = [isActive];
        let paramCounter = 2;

        if (topicId) {
            query += ` AND he.help_topic_id = $${paramCounter}`;
            queryParams.push(topicId);
            paramCounter++;
        }

        // If access level is provided and not null (staff/superuser can see all)
        if (accessLevel) {
            if (accessLevel === "registered") {
                // For registered users, they can see public and registered content
                query += ` AND he.access_level IN ('public', 'registered')`;
            } else {
                // For public users, they can only see public content
                query += ` AND he.access_level = $${paramCounter}`;
                queryParams.push(accessLevel);
                paramCounter++;
            }
        }

        query += ` ORDER BY he.position ASC, he.title ASC`;

        const { rows } = await db.query(query, queryParams);
        return rows;
    }

    async getEntriesByTopicUrl(topicUrl, accessLevel = "public") {
        let query = `
            SELECT he.*, ht.name as topic_name
            FROM help_entries he
            JOIN help_topics ht ON he.help_topic_id = ht.id
            WHERE ht.unique_url = $1
            AND he.is_active = true
        `;

        const queryParams = [topicUrl];

        // If access level is provided and not null (staff/superuser can see all)
        if (accessLevel) {
            if (accessLevel === "registered") {
                // For registered users, they can see public and registered content
                query += ` AND he.access_level IN ('public', 'registered')`;
            } else {
                // For public users, they can only see public content
                query += ` AND he.access_level = $2`;
                queryParams.push(accessLevel);
            }
        }

        query += ` ORDER BY he.position ASC, he.title ASC`;

        const { rows } = await db.query(query, queryParams);
        return rows;
    }

    async entryExists(url) {
        const query = `
            SELECT EXISTS (
                SELECT 1 FROM help_entries
                WHERE unique_url = $1
            ) AS exists
        `;

        const { rows } = await db.query(query, [url]);
        return rows[0].exists;
    }
}

module.exports = new HelpEntryModel();
