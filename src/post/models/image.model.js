// src/post/models/image.model.js
const db = require("../../config/db");

class PostImageModel {
    async saveImage(imageData) {
        const {
            postId,
            imageType = "content",
            position = 0,
            provider,
            key,
            altText,
        } = imageData;

        const query = `
            INSERT INTO images (
                entity_type,
                entity_id,
                image_type,
                position,
                provider,
                key,
                alt_text
            )
            VALUES ('post', $1, $2, $3, $4, $5, $6)
            RETURNING *`;

        const values = [
            postId,
            imageType,
            position,
            provider,
            key,
            altText || null,
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async getImagesByPostId(postId) {
        const query = `
            SELECT *
            FROM images
            WHERE entity_type = 'post' AND entity_id = $1
            ORDER BY position ASC`;

        const result = await db.query(query, [postId]);
        return result.rows;
    }

    async deleteImage(imageId, postId) {
        // First verify that this image belongs to the post
        const verifyQuery = `
            SELECT * FROM images
            WHERE id = $1 AND entity_type = 'post' AND entity_id = $2`;

        const verifyResult = await db.query(verifyQuery, [imageId, postId]);

        if (verifyResult.rows.length === 0) {
            return null;
        }

        const query = `
            DELETE FROM images
            WHERE id = $1
            RETURNING *`;

        const result = await db.query(query, [imageId]);
        return result.rows[0];
    }

    async updateImagePosition(imageId, postId, position) {
        const query = `
            UPDATE images
            SET position = $3
            WHERE id = $1 AND entity_type = 'post' AND entity_id = $2
            RETURNING *`;

        const result = await db.query(query, [imageId, postId, position]);
        return result.rows[0];
    }

    async updateImageAltText(imageId, postId, altText) {
        const query = `
            UPDATE images
            SET alt_text = $3
            WHERE id = $1 AND entity_type = 'post' AND entity_id = $2
            RETURNING *`;

        const result = await db.query(query, [imageId, postId, altText]);
        return result.rows[0];
    }

    async reorderImages(postId, imageOrder) {
        // imageOrder is an array of objects with id and position
        // [{id: 1, position: 0}, {id: 2, position: 1}, ...]

        const operations = imageOrder.map((item) => ({
            text: `UPDATE images SET position = $1 WHERE id = $2 AND entity_type = 'post' AND entity_id = $3`,
            values: [item.position, item.id, postId],
        }));

        if (operations.length === 0) {
            return [];
        }

        await db.executeTransaction(operations);

        // Get updated images
        const query = `
            SELECT *
            FROM images
            WHERE entity_type = 'post' AND entity_id = $1
            ORDER BY position ASC`;

        const result = await db.query(query, [postId]);
        return result.rows;
    }
}

module.exports = new PostImageModel();
