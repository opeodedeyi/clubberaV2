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
