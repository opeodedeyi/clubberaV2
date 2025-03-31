const db = require('../../config/db');

class TagModel {
    static async findTagsByEntity(entityType, entityId, assignmentType = null) {
        const query = {
            text: `
                SELECT t.id, t.name, ta.assignment_type
                FROM tags t
                JOIN tag_assignments ta ON t.id = ta.tag_id
                WHERE ta.entity_type = $1 
                AND ta.entity_id = $2
                ${assignmentType ? 'AND ta.assignment_type = $3' : ''}
                ORDER BY t.name
            `,
            values: assignmentType 
                ? [entityType, entityId, assignmentType]
                : [entityType, entityId]
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
                name: tag.name
            });
            
            return grouped;
        }, {});
    }

    static createTagAssignmentOperation(tagId, entityType, entityId, assignmentType) {
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
            values: [tagId, entityType, entityId, assignmentType]
        };
    }
    
    static async findOrCreateTag(tagName) {
        // First try to find the tag
        const findQuery = {
            text: 'SELECT id FROM tags WHERE name = $1',
            values: [tagName]
        };
        
        const existingTag = await db.query(findQuery.text, findQuery.values);
        
        if (existingTag.rows.length > 0) {
            return existingTag.rows[0].id;
        }
        
        // If not found, create the tag
        const createQuery = {
            text: 'INSERT INTO tags (name) VALUES ($1) RETURNING id',
            values: [tagName]
        };
        
        const newTag = await db.query(createQuery.text, createQuery.values);
        return newTag.rows[0].id;
    }
}

module.exports = TagModel;