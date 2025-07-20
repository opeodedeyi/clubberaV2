// src/user/models/tag.model.js

const db = require("../../config/db");

class TagModel {
    static async findTagsByEntity(entityType, entityId, assignmentType = null) {
        const query = {
            text: `
                SELECT t.id, t.name, ta.assignment_type
                FROM tags t
                JOIN tag_assignments ta ON t.id = ta.tag_id
                WHERE ta.entity_type = $1 
                AND ta.entity_id = $2
                ${assignmentType ? "AND ta.assignment_type = $3" : ""}
                ORDER BY t.name
                `,
            values: assignmentType
                ? [entityType, entityId, assignmentType]
                : [entityType, entityId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows;
    }

    static async findTagsByEntityGrouped(entityType, entityId) {
        const allTags = await this.findTagsByEntity(entityType, entityId);

        // Group tags by assignment_type
        return allTags.reduce((grouped, tag) => {
            if (!grouped[tag.assignment_type]) {
                grouped[tag.assignment_type] = [];
            }

            grouped[tag.assignment_type].push({
                id: tag.id,
                name: tag.name,
            });

            return grouped;
        }, {});
    }

    static createTagAssignmentOperation(
        tagId,
        entityType,
        entityId,
        assignmentType
    ) {
        return {
            text: `
                INSERT INTO tag_assignments(
                    tag_id,
                    entity_type,
                    entity_id,
                    assignment_type
                    )
                    VALUES($1, $2, $3, $4)
                    ON CONFLICT (tag_id, entity_type, entity_id, assignment_type) DO NOTHING
                    RETURNING id
                    `,
            values: [tagId, entityType, entityId, assignmentType],
        };
    }

    static async findOrCreateTag(tagName) {
        const findQuery = {
            text: "SELECT id FROM tags WHERE name = $1",
            values: [tagName],
        };

        const existingTag = await db.query(findQuery.text, findQuery.values);

        if (existingTag.rows.length > 0) {
            return existingTag.rows[0].id;
        }

        const createQuery = {
            text: "INSERT INTO tags (name) VALUES ($1) RETURNING id",
            values: [tagName],
        };

        const newTag = await db.query(createQuery.text, createQuery.values);
        return newTag.rows[0].id;
    }

    static async removeEntityTagsOperation(
        entityType,
        entityId,
        assignmentType
    ) {
        return {
            text: `
                DELETE FROM tag_assignments
                WHERE entity_type = $1
                AND entity_id = $2
                AND assignment_type = $3
                `,
            values: [entityType, entityId, assignmentType],
        };
    }

    static async updateEntityTags(
        entityType,
        entityId,
        tagNames,
        assignmentType
    ) {
        // Start a transaction
        const client = await db.pool.connect();

        try {
            await client.query("BEGIN");

            const removeQuery = {
                text: `
                    DELETE FROM tag_assignments
                    WHERE entity_type = $1
                    AND entity_id = $2
                    AND assignment_type = $3
                    `,
                values: [entityType, entityId, assignmentType],
            };

            await client.query(removeQuery.text, removeQuery.values);

            const tagIds = [];

            for (const tagName of tagNames) {
                const normalizedName = tagName.trim().toLowerCase();

                if (!normalizedName) continue;

                const findQuery = {
                    text: "SELECT id FROM tags WHERE name = $1",
                    values: [normalizedName],
                };

                let result = await client.query(
                    findQuery.text,
                    findQuery.values
                );

                let tagId;
                if (result.rows.length > 0) {
                    tagId = result.rows[0].id;
                } else {
                    const createQuery = {
                        text: "INSERT INTO tags (name) VALUES ($1) RETURNING id",
                        values: [normalizedName],
                    };

                    result = await client.query(
                        createQuery.text,
                        createQuery.values
                    );
                    tagId = result.rows[0].id;
                }

                tagIds.push(tagId);

                const assignQuery = {
                    text: `
                        INSERT INTO tag_assignments(tag_id, entity_type, entity_id, assignment_type)
                        VALUES($1, $2, $3, $4)
                        ON CONFLICT (tag_id, entity_type, entity_id, assignment_type) DO NOTHING
                        `,
                    values: [tagId, entityType, entityId, assignmentType],
                };

                await client.query(assignQuery.text, assignQuery.values);
            }

            await client.query("COMMIT");

            const getTagsQuery = {
                text: `
                    SELECT t.id, t.name
                    FROM tags t
                    JOIN tag_assignments ta ON t.id = ta.tag_id
                    WHERE ta.entity_type = $1
                    AND ta.entity_id = $2
                    AND ta.assignment_type = $3
                    ORDER BY t.name
                    `,
                values: [entityType, entityId, assignmentType],
            };

            const tagsResult = await db.query(
                getTagsQuery.text,
                getTagsQuery.values
            );
            return tagsResult.rows;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = TagModel;
