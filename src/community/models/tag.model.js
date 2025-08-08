const db = require("../../config/db");

class CommunityTagModel {
    async assignTagByName(data) {
        const { community_id, tag_name, assignment_type = "category" } = data;

        let tagResult = await db.query("SELECT id FROM tags WHERE name = $1", [
            tag_name,
        ]);

        let tagId;

        if (tagResult.rows.length === 0) {
            const newTagResult = await db.query(
                "INSERT INTO tags (name) VALUES ($1) RETURNING id",
                [tag_name]
            );
            tagId = newTagResult.rows[0].id;
        } else {
            tagId = tagResult.rows[0].id;
        }

        const query = `
            INSERT INTO tag_assignments
                (tag_id, entity_type, entity_id, assignment_type)
            VALUES
                ($1, 'community', $2, $3)
            ON CONFLICT (tag_id, entity_type, entity_id, assignment_type) 
            DO NOTHING
            RETURNING *
        `;

        const result = await db.query(query, [
            tagId,
            community_id,
            assignment_type,
        ]);
        return result.rows[0];
    }

    async removeTag(communityId, tagId) {
        const query = `
            DELETE FROM tag_assignments
            WHERE tag_id = $1
            AND entity_type = 'community'
            AND entity_id = $2
            RETURNING *
        `;

        const result = await db.query(query, [tagId, communityId]);
        return result.rows[0];
    }

    async removeAllCommunityTags(communityId) {
        const query = `
            DELETE FROM tag_assignments 
            WHERE entity_type = 'community' AND entity_id = $1
        `;
        return await db.query(query, [communityId]);
    }

    async getCommunityTags(communityId, assignmentType = null) {
        let query = `
            SELECT t.id, t.name, ta.assignment_type
            FROM tags t
            JOIN tag_assignments ta ON t.id = ta.tag_id
            WHERE ta.entity_type = 'community'
            AND ta.entity_id = $1
        `;

        const params = [communityId];

        if (assignmentType) {
            query += ` AND ta.assignment_type = $2`;
            params.push(assignmentType);
        }

        query += ` ORDER BY t.name`;

        const result = await db.query(query, params);
        return result.rows;
    }
}

module.exports = new CommunityTagModel();
