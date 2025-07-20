// src/help/models/helpTopic.model.js
const db = require("../../config/db");

class HelpTopicModel {
    async createTopic(topicData) {
        const { name, description, unique_url, position = 0 } = topicData;

        const query = `
            INSERT INTO help_topics (name, description, unique_url, position)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const { rows } = await db.query(query, [
            name,
            description,
            unique_url,
            position,
        ]);
        return rows[0];
    }

    async updateTopic(id, topicData) {
        const { name, description, unique_url, position } = topicData;

        const query = `
            UPDATE help_topics
            SET name = $1, 
                description = $2, 
                unique_url = $3, 
                position = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `;

        const { rows } = await db.query(query, [
            name,
            description,
            unique_url,
            position,
            id,
        ]);
        return rows[0];
    }

    async deleteTopic(id) {
        const query = `
            DELETE FROM help_topics
            WHERE id = $1
            RETURNING *
        `;

        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    async getTopicById(id) {
        const query = `
            SELECT * FROM help_topics
            WHERE id = $1
        `;

        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    async getTopicByUrl(url) {
        const query = `
            SELECT * FROM help_topics
            WHERE unique_url = $1
        `;

        const { rows } = await db.query(query, [url]);
        return rows[0];
    }

    async getAllTopics() {
        const query = `
            SELECT * FROM help_topics
            ORDER BY position ASC, name ASC
        `;

        const { rows } = await db.query(query);
        return rows;
    }

    async topicExists(url) {
        const query = `
            SELECT EXISTS (
                SELECT 1 FROM help_topics
                WHERE unique_url = $1
            ) AS exists
        `;

        const { rows } = await db.query(query, [url]);
        return rows[0].exists;
    }
}

module.exports = new HelpTopicModel();
