// src/help/models/helpFeedback.model.js
const db = require("../../config/db");

class HelpFeedbackModel {
    async addFeedback(feedbackData) {
        const { help_entry_id, user_id, is_helpful, comment, ip_address } =
            feedbackData;

        const query = `
            INSERT INTO help_feedback (
              help_entry_id, user_id, is_helpful, 
              comment, ip_address
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const { rows } = await db.query(query, [
            help_entry_id,
            user_id,
            is_helpful,
            comment,
            ip_address,
        ]);

        return rows[0];
    }

    async getFeedbackByEntryId(entryId) {
        const query = `
            SELECT * FROM help_feedback
            WHERE help_entry_id = $1
            ORDER BY created_at DESC
        `;

        const { rows } = await db.query(query, [entryId]);
        return rows;
    }

    async getFeedbackStats(entryId) {
        const query = `
            SELECT 
                COUNT(*) as total_feedback,
                SUM(CASE WHEN is_helpful THEN 1 ELSE 0 END) as helpful_count,
                ROUND(SUM(CASE WHEN is_helpful THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100, 2) as helpful_percentage
            FROM help_feedback
            WHERE help_entry_id = $1
        `;

        const { rows } = await db.query(query, [entryId]);
        return rows[0];
    }

    async checkUserFeedback(entryId, userId) {
        const query = `
            SELECT * FROM help_feedback
            WHERE help_entry_id = $1 AND user_id = $2
            LIMIT 1
        `;

        const { rows } = await db.query(query, [entryId, userId]);
        return rows[0];
    }

    async checkIpFeedback(entryId, ipAddress) {
        const query = `
          SELECT * FROM help_feedback
          WHERE help_entry_id = $1 AND ip_address = $2
          LIMIT 1
        `;

        const { rows } = await db.query(query, [entryId, ipAddress]);
        return rows[0];
    }
}

module.exports = new HelpFeedbackModel();
