const pool = require('../../db');

const searchGroupsQuery = async (searchText, sortBy, sortOrder, filters) => {
    let query = `
        SELECT g.*, l.address
        FROM groups g
        LEFT JOIN locations l ON l.entity_type = 'group' AND l.entity_id = g.id
        WHERE (g.title ILIKE $1
           OR g.tagline ILIKE $1
           OR g.description ILIKE $1
           OR l.address ILIKE $1)
    `;

    const values = [`%${searchText}%`];
    let paramCounter = 2;

    // Apply filters
    if (filters.isPrivate !== null) {
        query += ` AND g.is_private = $${paramCounter}`;
        values.push(filters.isPrivate);
        paramCounter++;
    }

    if (filters.city) {
        query += ` AND l.address ILIKE $${paramCounter}`;
        values.push(`%${filters.city}%`);
        paramCounter++;
    }

    // Apply sorting
    switch (sortBy) {
        case 'alphabetical':
            query += ` ORDER BY g.title ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
            break;
        case 'date':
            query += ` ORDER BY g.created_at ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
            break;
        default:
            query += ` ORDER BY g.created_at ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const { rows } = await pool.query(query, values);
    return rows;
};

module.exports = {
    searchGroupsQuery
};