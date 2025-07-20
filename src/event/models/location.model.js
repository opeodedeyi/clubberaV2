// src/event/models/location.model.js
const db = require("../../config/db");
const ApiError = require("../../utils/ApiError");

class LocationModel {
    async createLocation(eventId, locationData) {
        try {
            const { name, locationType, lat, lng, address } = locationData;

            const query = `
                INSERT INTO locations(
                    entity_type, entity_id, name, location_type, 
                    lat, lng, address, created_at, updated_at
                )
                VALUES(
                    'event', $1, $2, $3, $4, $5, $6, NOW(), NOW()
                )
                RETURNING *;
            `;

            const values = [
                eventId,
                name || "",
                locationType || "address",
                lat || null,
                lng || null,
                address || "",
            ];

            const result = await db.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw new ApiError(
                `Error creating location: ${error.message}`,
                500
            );
        }
    }

    async updateLocation(eventId, locationData) {
        try {
            // Check if location exists
            const checkQuery = `
                SELECT id FROM locations
                WHERE entity_type = 'event' AND entity_id = $1
                LIMIT 1;
            `;

            const checkResult = await db.query(checkQuery, [eventId]);

            if (checkResult.rows.length === 0) {
                // Create new location if it doesn't exist
                return this.createLocation(eventId, locationData);
            }

            // Update existing location
            const locationId = checkResult.rows[0].id;
            const updateFields = [];
            const values = [];
            let paramCounter = 1;

            // Add each field that needs to be updated
            if (locationData.name !== undefined) {
                updateFields.push(`name = $${paramCounter}`);
                values.push(locationData.name);
                paramCounter++;
            }

            if (locationData.locationType !== undefined) {
                updateFields.push(`location_type = $${paramCounter}`);
                values.push(locationData.locationType);
                paramCounter++;
            }

            if (locationData.lat !== undefined) {
                updateFields.push(`lat = $${paramCounter}`);
                values.push(locationData.lat);
                paramCounter++;
            }

            if (locationData.lng !== undefined) {
                updateFields.push(`lng = $${paramCounter}`);
                values.push(locationData.lng);
                paramCounter++;
            }

            if (locationData.address !== undefined) {
                updateFields.push(`address = $${paramCounter}`);
                values.push(locationData.address);
                paramCounter++;
            }

            // Add updated_at
            updateFields.push(`updated_at = NOW()`);

            // Add location id to values
            values.push(locationId);

            const query = `
                UPDATE locations
                SET ${updateFields.join(", ")}
                WHERE id = $${paramCounter}
                RETURNING *;
            `;

            const result = await db.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw new ApiError(
                `Error updating location: ${error.message}`,
                500
            );
        }
    }

    async getLocationByEventId(eventId) {
        try {
            const query = `
                SELECT * FROM locations
                WHERE entity_type = 'event' AND entity_id = $1
                LIMIT 1;
            `;

            const result = await db.query(query, [eventId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            throw new ApiError(
                `Error fetching location: ${error.message}`,
                500
            );
        }
    }

    async deleteLocation(eventId) {
        try {
            const query = `
                DELETE FROM locations
                WHERE entity_type = 'event' AND entity_id = $1
                RETURNING id;
            `;

            const result = await db.query(query, [eventId]);

            return result.rows.length > 0;
        } catch (error) {
            throw new ApiError(
                `Error deleting location: ${error.message}`,
                500
            );
        }
    }
}

module.exports = new LocationModel();
