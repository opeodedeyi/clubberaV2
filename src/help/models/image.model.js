// src/help/models/image.model.js
const db = require("../../config/db");

class HelpImageModel {
    async saveImage(imageData) {
        const {
            entity_id,
            image_type,
            position = 0,
            provider,
            key,
            alt_text,
        } = imageData;

        // For help entries, entity_type is always 'help_entry'
        const entity_type = "help_entry";

        const query = `
            INSERT INTO images (
                entity_type, entity_id, image_type, 
                position, provider, key, alt_text
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (entity_type, entity_id, image_type)
            WHERE (entity_type = 'help_entry')
            DO UPDATE SET
                key = EXCLUDED.key,
                provider = EXCLUDED.provider,
                alt_text = EXCLUDED.alt_text,
                position = EXCLUDED.position
            RETURNING *
        `;

        const { rows } = await db.query(query, [
            entity_type,
            entity_id,
            image_type,
            position,
            provider,
            key,
            alt_text,
        ]);

        return rows[0];
    }

    async getImagesByHelpEntryId(entryId) {
        const query = `
            SELECT * FROM images
            WHERE entity_type = 'help_entry' AND entity_id = $1
            ORDER BY position ASC
        `;

        const { rows } = await db.query(query, [entryId]);
        return rows;
    }

    async getImageByTypeAndEntryId(entryId, imageType) {
        const query = `
            SELECT * FROM images
            WHERE entity_type = 'help_entry' 
            AND entity_id = $1
            AND image_type = $2
            LIMIT 1
        `;

        const { rows } = await db.query(query, [entryId, imageType]);
        return rows[0];
    }

    async deleteImage(imageId) {
        const query = `
            DELETE FROM images
            WHERE id = $1
            RETURNING *
        `;

        const { rows } = await db.query(query, [imageId]);
        return rows[0];
    }

    async deleteImageByTypeAndEntryId(entryId, imageType) {
        const query = `
            DELETE FROM images
            WHERE entity_type = 'help_entry'
            AND entity_id = $1
            AND image_type = $2
            RETURNING *
        `;

        const { rows } = await db.query(query, [entryId, imageType]);
        return rows[0];
    }
}

module.exports = new HelpImageModel();
