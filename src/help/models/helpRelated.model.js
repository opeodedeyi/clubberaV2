// src/help/models/helpRelated.model.js - Updated version
const db = require("../../config/db");

class HelpRelatedModel {
    async addRelatedEntry(entryId, relatedEntryId) {
        const query = `
            INSERT INTO help_related_entries (help_entry_id, related_entry_id)
            VALUES ($1, $2)
            ON CONFLICT (help_entry_id, related_entry_id) DO NOTHING
            RETURNING *
        `;

        const { rows } = await db.query(query, [entryId, relatedEntryId]);
        return rows[0];
    }

    async removeRelatedEntry(entryId, relatedEntryId) {
        const query = `
            DELETE FROM help_related_entries
            WHERE help_entry_id = $1 AND related_entry_id = $2
            RETURNING *
        `;

        const { rows } = await db.query(query, [entryId, relatedEntryId]);
        return rows[0];
    }

    async getRelatedEntries(entryId, accessLevel = "public") {
        let query = `
            SELECT he.*, ht.name as topic_name, ht.unique_url as topic_url
            FROM help_related_entries hre
            JOIN help_entries he ON hre.related_entry_id = he.id
            JOIN help_topics ht ON he.help_topic_id = ht.id
            WHERE hre.help_entry_id = $1
            AND he.is_active = true
        `;

        const queryParams = [entryId];

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

        query += ` ORDER BY he.title ASC`;

        const { rows } = await db.query(query, queryParams);
        return rows;
    }

    async updateRelatedEntries(entryId, relatedEntryIds) {
        // First, delete all existing relationships
        const deleteQuery = `
            DELETE FROM help_related_entries
            WHERE help_entry_id = $1
        `;

        await db.query(deleteQuery, [entryId]);

        // If no new related entries, we're done
        if (!relatedEntryIds || relatedEntryIds.length === 0) {
            return [];
        }

        // Add new relationships
        const insertValues = relatedEntryIds
            .map((relatedId, index) => `($1, $${index + 2})`)
            .join(", ");

        const insertQuery = `
            INSERT INTO help_related_entries (help_entry_id, related_entry_id)
            VALUES ${insertValues}
            RETURNING *
        `;

        const params = [entryId, ...relatedEntryIds];
        const { rows } = await db.query(insertQuery, params);

        return rows;
    }
}

module.exports = new HelpRelatedModel();
