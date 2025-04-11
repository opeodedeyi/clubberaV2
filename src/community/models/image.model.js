const db = require("../../config/db");

class CommunityImageModel {
    async create(data) {
        const {
            entity_id,
            image_type,
            position = 0,
            provider,
            key,
            alt_text = null,
        } = data;

        const query = `
            INSERT INTO images
                (entity_type, entity_id, image_type, position, provider, key, alt_text)
            VALUES
                ('community', $1, $2, $3, $4, $5, $6)
            ON CONFLICT (entity_type, entity_id, image_type) 
            WHERE entity_type = 'community'
            DO UPDATE SET
                provider = EXCLUDED.provider,
                key = EXCLUDED.key,
                alt_text = EXCLUDED.alt_text
            RETURNING *
        `;

        const result = await db.query(query, [
            entity_id,
            image_type,
            position,
            provider,
            key,
            alt_text,
        ]);

        return result.rows[0];
    }

    async update(id, data) {
        const allowedFields = ["provider", "key", "alt_text", "position"];
        const setValues = [];
        const queryParams = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(data)) {
            if (allowedFields.includes(key)) {
                setValues.push(`${key} = $${paramIndex++}`);
                queryParams.push(value);
            }
        }

        if (setValues.length === 0) {
            // No valid fields to update, fetch and return current image
            return this.findById(id);
        }

        queryParams.push(id);

        const query = `
            UPDATE images
            SET ${setValues.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(query, queryParams);
        return result.rows[0] || null;
    }

    static async findByEntity(entityType, entityId, imageType) {
        const query = {
            text: `
            SELECT id, image_type, provider, key, alt_text, position 
            FROM images 
            WHERE entity_type = $1 AND entity_id = $2 AND image_type = $3
        `,
            values: [entityType, entityId, imageType],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    async findByCommunity(communityId, imageType) {
        const query = `
            SELECT * FROM images
            WHERE entity_type = 'community'
            AND entity_id = $1
            AND image_type = $2
        `;

        const result = await db.query(query, [communityId, imageType]);
        return result.rows[0] || null;
    }

    async getProfileImage(communityId) {
        return this.findByCommunity(communityId, "profile");
    }

    async getCoverImage(communityId) {
        return this.findByCommunity(communityId, "banner");
    }

    async delete(imageId) {
        const query = `
            DELETE FROM images
            WHERE id = $1
            AND entity_type = 'community'
            RETURNING *
        `;

        const result = await db.query(query, [imageId]);
        return result.rows[0] || null;
    }
}

module.exports = new CommunityImageModel();
