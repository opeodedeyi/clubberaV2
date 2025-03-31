const db = require('../../config/db');

class ImageModel {
    static async findByEntity(entityType, entityId, imageType) {
        const query = {
        text: `
            SELECT id, image_type, provider, key, alt_text, position 
            FROM images 
            WHERE entity_type = $1 AND entity_id = $2 AND image_type = $3
        `,
        values: [entityType, entityId, imageType]
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
            position = 0
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
                position
            ]
        };
    }
    
    static async findAllByEntity(entityType, entityId, imageType = null) {
        const query = {
            text: `
                SELECT id, image_type, provider, key, alt_text, position 
                FROM images 
                WHERE entity_type = $1 AND entity_id = $2
                ${imageType ? ' AND image_type = $3' : ''}
                ORDER BY position ASC
            `,
            values: imageType 
                ? [entityType, entityId, imageType]
                : [entityType, entityId]
        };
        
        const result = await db.query(query.text, query.values);
        return result.rows;
    }
}

module.exports = ImageModel;