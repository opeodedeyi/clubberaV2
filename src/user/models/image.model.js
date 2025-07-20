// src/user/models/image.model.js

const db = require("../../config/db");
const s3Service = require("../../services/s3.service");

class ImageModel {
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

    static createImageOperation(imageData) {
        const {
            entityType,
            entityId,
            imageType,
            provider,
            key,
            altText,
            position = 0,
        } = imageData;

        return {
            text: `
                INSERT INTO images(
                    entity_type,
                    entity_id,
                    image_type,
                    provider,
                    key,
                    alt_text,
                    position
                )
                VALUES($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, image_type, provider, key, position
            `,
            values: [
                entityType,
                entityId,
                imageType,
                provider,
                key,
                altText || null,
                position,
            ],
        };
    }

    static async findAllByEntity(entityType, entityId, imageType = null) {
        const query = {
            text: `
                SELECT id, image_type, provider, key, alt_text, position 
                FROM images 
                WHERE entity_type = $1 AND entity_id = $2
                ${imageType ? " AND image_type = $3" : ""}
                ORDER BY position ASC
            `,
            values: imageType
                ? [entityType, entityId, imageType]
                : [entityType, entityId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows;
    }

    static async updateImage(entityType, entityId, imageType, imageData) {
        // Start a transaction
        const client = await db.pool.connect();

        try {
            await client.query("BEGIN");

            // First, check if image exists
            const findQuery = {
                text: `
          SELECT id, key FROM images 
          WHERE entity_type = $1 AND entity_id = $2 AND image_type = $3
        `,
                values: [entityType, entityId, imageType],
            };

            const existingImage = await client.query(
                findQuery.text,
                findQuery.values
            );

            if (existingImage.rows.length > 0) {
                // Image exists, update it
                const oldKey = existingImage.rows[0].key;

                const updateQuery = {
                    text: `
            UPDATE images
            SET provider = $1, key = $2, alt_text = $3, position = $4
            WHERE entity_type = $5 AND entity_id = $6 AND image_type = $7
            RETURNING id, image_type, provider, key, alt_text, position
          `,
                    values: [
                        imageData.provider,
                        imageData.key,
                        imageData.altText || null,
                        imageData.position || 0,
                        entityType,
                        entityId,
                        imageType,
                    ],
                };

                const result = await client.query(
                    updateQuery.text,
                    updateQuery.values
                );

                // Delete old image from S3
                if (oldKey && oldKey !== imageData.key) {
                    try {
                        await s3Service.deleteObject(oldKey);
                    } catch (err) {
                        console.error("Failed to delete old image:", err);
                        // Continue anyway, we don't want to fail the update if deletion fails
                    }
                }

                await client.query("COMMIT");
                return result.rows[0];
            } else {
                // Image doesn't exist, create it
                const insertQuery = {
                    text: `
            INSERT INTO images(entity_type, entity_id, image_type, provider, key, alt_text, position)
            VALUES($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, image_type, provider, key, alt_text, position
          `,
                    values: [
                        entityType,
                        entityId,
                        imageType,
                        imageData.provider,
                        imageData.key,
                        imageData.altText || null,
                        imageData.position || 0,
                    ],
                };

                const result = await client.query(
                    insertQuery.text,
                    insertQuery.values
                );

                await client.query("COMMIT");
                return result.rows[0];
            }
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    static async deleteImage(id) {
        // First, get the key so we can delete from S3
        const getQuery = {
            text: "SELECT key FROM images WHERE id = $1",
            values: [id],
        };

        const image = await db.query(getQuery.text, getQuery.values);

        if (image.rows.length === 0) {
            return false; // Image not found
        }

        const key = image.rows[0].key;

        // Delete from database
        const deleteQuery = {
            text: "DELETE FROM images WHERE id = $1 RETURNING id",
            values: [id],
        };

        await db.query(deleteQuery.text, deleteQuery.values);

        // Delete from S3
        if (key) {
            try {
                await s3Service.deleteObject(key);
            } catch (err) {
                console.error("Failed to delete image from S3:", err);
                // We still return true since the DB record was deleted
            }
        }

        return true;
    }
}

module.exports = ImageModel;
