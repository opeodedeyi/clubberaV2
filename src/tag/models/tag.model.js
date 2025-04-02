const db = require("../../config/db");

class TagModel {
    static async findAll() {
        const query = {
            text: "SELECT * FROM tags ORDER BY name",
            values: [],
        };

        const result = await db.query(query.text, query.values);
        return result.rows;
    }

    static async findById(id) {
        const query = {
            text: "SELECT * FROM tags WHERE id = $1",
            values: [id],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    static async findByName(name) {
        const query = {
            text: "SELECT * FROM tags WHERE LOWER(name) = LOWER($1)",
            values: [name],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    static async create(name) {
        const query = {
            text: "INSERT INTO tags (name) VALUES ($1) RETURNING *",
            values: [name],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    static async update(id, name) {
        const query = {
            text: "UPDATE tags SET name = $1 WHERE id = $2 RETURNING *",
            values: [name, id],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    static async delete(id) {
        // First check if tag is in use
        const usageQuery = {
            text: "SELECT COUNT(*) FROM tag_assignments WHERE tag_id = $1",
            values: [id],
        };

        const usageResult = await db.query(usageQuery.text, usageQuery.values);
        const usageCount = parseInt(usageResult.rows[0].count);

        if (usageCount > 0) {
            return { deleted: false, inUse: true };
        }

        // If not in use, delete the tag
        const query = {
            text: "DELETE FROM tags WHERE id = $1 RETURNING id",
            values: [id],
        };

        const result = await db.query(query.text, query.values);
        return { deleted: result.rows.length > 0, inUse: false };
    }
}

module.exports = TagModel;
