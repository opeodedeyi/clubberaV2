// src/event/models/image.model.js
const db = require("../../config/db");
const ApiError = require("../../utils/ApiError");

class ImageModel {
    async saveEventImage(eventId, imageData) {
        try {
            const {
                imageType = "cover",
                provider = "s3",
                key,
                altText = "",
            } = imageData;

            // Check if an image of this type already exists for this event
            const checkQuery = `
                SELECT id FROM images
                WHERE entity_type = 'event' AND entity_id = $1 AND image_type = $2
                LIMIT 1;
            `;

            const checkResult = await db.query(checkQuery, [
                eventId,
                imageType,
            ]);

            if (checkResult.rows.length > 0) {
                // Update existing image
                const imageId = checkResult.rows[0].id;

                const updateQuery = `
                    UPDATE images
                    SET provider = $1, key = $2, alt_text = $3
                    WHERE id = $4
                    RETURNING *;
                `;

                const updateValues = [provider, key, altText, imageId];
                const updateResult = await db.query(updateQuery, updateValues);

                return updateResult.rows[0];
            } else {
                // Create new image record
                const insertQuery = `
                    INSERT INTO images (
                        entity_type, entity_id, image_type, position, 
                        provider, key, alt_text, created_at
                    )
                    VALUES (
                        'event', $1, $2, 0, $3, $4, $5, NOW()
                    )
                    RETURNING *;
                `;

                const insertValues = [
                    eventId,
                    imageType,
                    provider,
                    key,
                    altText,
                ];
                const insertResult = await db.query(insertQuery, insertValues);

                return insertResult.rows[0];
            }
        } catch (error) {
            throw new ApiError(
                `Error saving event image: ${error.message}`,
                500
            );
        }
    }

    async getEventImages(eventId) {
        try {
            const query = `
                SELECT * FROM images
                WHERE entity_type = 'event' AND entity_id = $1
                ORDER BY image_type, position;
            `;

            const result = await db.query(query, [eventId]);

            return result.rows;
        } catch (error) {
            throw new ApiError(
                `Error fetching event images: ${error.message}`,
                500
            );
        }
    }

    async getEventImageByType(eventId, imageType) {
        try {
            const query = `
                SELECT * FROM images
                WHERE entity_type = 'event' AND entity_id = $1 AND image_type = $2
                LIMIT 1;
            `;

            const result = await db.query(query, [eventId, imageType]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            throw new ApiError(
                `Error fetching event image: ${error.message}`,
                500
            );
        }
    }

    async deleteEventImage(eventId, imageType) {
        try {
            const query = `
                DELETE FROM images
                WHERE entity_type = 'event' AND entity_id = $1 AND image_type = $2
                RETURNING id;
            `;

            const result = await db.query(query, [eventId, imageType]);

            return result.rows.length > 0;
        } catch (error) {
            throw new ApiError(
                `Error deleting event image: ${error.message}`,
                500
            );
        }
    }

    async transferTempImageToEvent(
        eventId,
        tempKey,
        imageType = "cover",
        altText = ""
    ) {
        try {
            // Check if the temporary image exists
            const checkQuery = `
                SELECT * FROM images
                WHERE entity_type = 'temp' AND key = $1
                LIMIT 1;
            `;

            const checkResult = await db.query(checkQuery, [tempKey]);

            if (checkResult.rows.length === 0) {
                throw new ApiError("Temporary image not found", 404);
            }

            const tempImage = checkResult.rows[0];

            // Check if an image of this type already exists for this event
            const existingQuery = `
                SELECT id FROM images
                WHERE entity_type = 'event' AND entity_id = $1 AND image_type = $2
                LIMIT 1;
            `;

            const existingResult = await db.query(existingQuery, [
                eventId,
                imageType,
            ]);

            // Start a transaction to handle the transfer
            const operations = [];

            if (existingResult.rows.length > 0) {
                // Update existing image
                const imageId = existingResult.rows[0].id;

                operations.push({
                    text: `
                        UPDATE images
                        SET provider = $1, key = $2, alt_text = $3
                        WHERE id = $4
                        RETURNING *;
                    `,
                    values: [tempImage.provider, tempKey, altText, imageId],
                });
            } else {
                // Create new image record
                operations.push({
                    text: `
                        INSERT INTO images (
                            entity_type, entity_id, image_type, position, 
                            provider, key, alt_text, created_at
                        )
                        VALUES (
                            'event', $1, $2, 0, $3, $4, $5, NOW()
                        )
                        RETURNING *;
                    `,
                    values: [
                        eventId,
                        imageType,
                        tempImage.provider,
                        tempKey,
                        altText,
                    ],
                });
            }

            // Delete the temporary image record
            operations.push({
                text: `
                    DELETE FROM images
                    WHERE id = $1;
                `,
                values: [tempImage.id],
            });

            // Execute the transaction
            const results = await db.executeTransaction(operations);

            return results[0].rows[0];
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(
                `Error transferring image: ${error.message}`,
                500
            );
        }
    }

    async create(data) {
        const {
            entity_id,
            entity_type = "event",
            image_type,
            position = 0,
            provider,
            key,
            alt_text = null,
        } = data;

        // First, check if an image already exists for this event and type
        const checkQuery = `
            SELECT id FROM images 
            WHERE entity_type = $1 AND entity_id = $2 AND image_type = $3
        `;
        
        const existingResult = await db.query(checkQuery, [entity_type, entity_id, image_type]);
        
        if (existingResult.rows.length > 0) {
            // Update existing image
            const updateQuery = `
                UPDATE images 
                SET provider = $1, key = $2, alt_text = $3
                WHERE entity_type = $4 AND entity_id = $5 AND image_type = $6
                RETURNING *
            `;
            
            const result = await db.query(updateQuery, [
                provider, key, alt_text, entity_type, entity_id, image_type
            ]);
            return result.rows[0];
        } else {
            // Insert new image
            const insertQuery = `
                INSERT INTO images
                    (entity_type, entity_id, image_type, position, provider, key, alt_text)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            
            const result = await db.query(insertQuery, [
                entity_type, entity_id, image_type, position, provider, key, alt_text
            ]);
            return result.rows[0];
        }
    }
}

module.exports = new ImageModel();
