// src/help/models/helpSearch.model.js - Enhanced search
const db = require("../../config/db");

class HelpSearchModel {
    async searchHelpEntries(searchQuery, accessLevel = "public") {
        // Convert search query for PostgreSQL ts_query
        const formattedQuery = searchQuery
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .join(" & ");

        let query = `
            SELECT 
                he.id,
                he.help_topic_id,
                he.unique_url,
                he.title,
                he.content,
                he.access_level,
                he.is_active,
                he.position,
                he.view_count,
                he.created_at,
                he.updated_at,
                ht.name as topic_name,
                ht.unique_url as topic_url,
                ht.description as topic_description,
                (
                ts_rank(setweight(to_tsvector('english', COALESCE(ht.name, '')), 'A') || 
                        setweight(to_tsvector('english', COALESCE(ht.description, '')), 'B') ||
                        setweight(to_tsvector('english', COALESCE(he.title, '')), 'A') || 
                        setweight(to_tsvector('english', COALESCE(he.content, '')), 'C'), 
                        to_tsquery('english', $1))
                ) as rank
            FROM help_entries he
            JOIN help_topics ht ON he.help_topic_id = ht.id
            WHERE (
                to_tsvector('english', COALESCE(ht.name, '')) @@ to_tsquery('english', $1) OR
                to_tsvector('english', COALESCE(ht.description, '')) @@ to_tsquery('english', $1) OR
                to_tsvector('english', COALESCE(he.title, '')) @@ to_tsquery('english', $1) OR
                to_tsvector('english', COALESCE(he.content, '')) @@ to_tsquery('english', $1)
            )
            AND he.is_active = true
        `;

        const queryParams = [formattedQuery];
        let paramIndex = 2;

        // If access level is provided and not null (staff/superuser can see all)
        if (accessLevel) {
            if (accessLevel === "registered") {
                // For registered users, they can see public and registered content
                query += ` AND he.access_level IN ('public', 'registered')`;
            } else {
                // For public users, they can only see public content
                query += ` AND he.access_level = $${paramIndex}`;
                queryParams.push(accessLevel);
            }
        }

        // Order by rank (most relevant first)
        query += ` ORDER BY rank DESC`;

        const { rows } = await db.query(query, queryParams);
        return rows;
    }

    async getPopularHelpEntries(limit = 5, accessLevel = "public") {
        let query = `
            SELECT he.*, ht.name as topic_name, ht.unique_url as topic_url, ht.description as topic_description
            FROM help_entries he
            JOIN help_topics ht ON he.help_topic_id = ht.id
            WHERE he.is_active = true
        `;

        const queryParams = [];
        let paramCounter = 1;

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

        query += ` ORDER BY he.view_count DESC LIMIT $${paramCounter}`;
        queryParams.push(limit);

        const { rows } = await db.query(query, queryParams);
        return rows;
    }
}

module.exports = new HelpSearchModel();
