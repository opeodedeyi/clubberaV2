const db = require("../../config/db");

class CommunityLocationModel {
    async create(data) {
        const {
            community_id,
            name,
            location_type = "address",
            lat,
            lng,
            address,
        } = data;

        const query = `
            INSERT INTO locations
                (entity_type, entity_id, name, location_type, lat, lng, address)
            VALUES
                ('community', $1, $2, $3, $4, $5, $6)
            ON CONFLICT (entity_type, entity_id, location_type) 
            DO UPDATE SET
                name = EXCLUDED.name,
                lat = EXCLUDED.lat,
                lng = EXCLUDED.lng,
                address = EXCLUDED.address,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await db.query(query, [
            community_id,
            name,
            location_type,
            lat,
            lng,
            address,
        ]);

        return result.rows[0];
    }

    async findByCommunity(communityId) {
        const query = `
            SELECT * FROM locations
            WHERE entity_type = 'community'
            AND entity_id = $1
            AND location_type = 'address'
        `;

        const result = await db.query(query, [communityId]);
        return result.rows[0] || null;
    }

    async findByEntity(entityType, entityId, locationType = null) {
        let query = `
            SELECT * FROM locations
            WHERE entity_type = $1 AND entity_id = $2
        `;
        const queryParams = [entityType, entityId];

        if (locationType) {
            query += ` AND location_type = $3`;
            queryParams.push(locationType);
        }

        query += ` LIMIT 1`;

        const result = await db.query(query, queryParams);
        return result.rows[0] || null;
    }

    async findById(id) {
        const query = {
            text: "SELECT * FROM locations WHERE id = $1",
            values: [id],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    async update(id, data) {
        const allowedFields = [
            "name",
            "location_type",
            "lat",
            "lng",
            "address",
        ];

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
            return this.findById(id);
        }

        queryParams.push(id);

        const query = `
            UPDATE locations
            SET ${setValues.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(query, queryParams);
        return result.rows[0] || null;
    }

    async delete(communityId) {
        const query = `
            DELETE FROM locations
            WHERE entity_type = 'community'
            AND entity_id = $1
            RETURNING *
        `;

        const result = await db.query(query, [communityId]);
        return result.rows[0] || null;
    }
}

module.exports = new CommunityLocationModel();
