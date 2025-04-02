// src/user/models/location.model.js
const db = require('../../config/db');

class LocationModel {
    static createLocationOperation(locationData, entityType, entityId) {
        return {
            text: `
                INSERT INTO locations(
                    entity_type, 
                    entity_id, 
                    name, 
                    location_type, 
                    lat, 
                    lng, 
                    address
                ) 
                VALUES($1, $2, $3, $4, $5, $6, $7) 
                RETURNING id, location_type, lat, lng, address
            `,
            values: [
                entityType,
                entityId,
                locationData.city || null,
                'primary',
                locationData.lat || null,
                locationData.lng || null,
                locationData.address || null
            ]
        };
    }

    static async findByEntity(entityType, entityId, locationType = 'primary') {
        const query = {
            text: `
                SELECT * FROM locations 
                WHERE entity_type = $1 AND entity_id = $2 AND location_type = $3
            `,
            values: [entityType, entityId, locationType]
        };
        
        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }
}

module.exports = LocationModel;