const pool = require('../../db');

const searchGroupsQuery = async (searchText, sortBy, sortOrder, filters, offset, limit) => {
    let query = `
        WITH group_data AS (
            SELECT 
                g.id, g.unique_url, g.title, l.address AS location, g.description,
                g.is_private, g.created_at AS date_joined,
                (SELECT COUNT(*)
                    FROM group_members gm
                    WHERE gm.group_id = g.id) AS total_members
            FROM groups g
            LEFT JOIN locations l ON l.entity_type = 'group' AND l.entity_id = g.id
            WHERE (g.title ILIKE $1
               OR g.tagline ILIKE $1
               OR g.description ILIKE $1
               OR l.address ILIKE $1)
        )
        SELECT 
            gd.*,
            (SELECT COALESCE(json_agg(b.location), '[]'::json)
             FROM (
                 SELECT DISTINCT ON (gm.user_id) b.location
                 FROM group_members gm
                 LEFT JOIN banners b ON b.entity_type = 'user' AND b.entity_id = gm.user_id
                 WHERE gm.group_id = gd.id AND b.location IS NOT NULL
                 ORDER BY gm.user_id, b.created_at DESC
                 LIMIT 2
             ) b
            ) AS member_avatars
        FROM group_data gd
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
            query += ` ORDER BY gd.title ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
            break;
        case 'date':
            query += ` ORDER BY gd.date_joined ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
            break;
        default:
            query += ` ORDER BY gd.date_joined ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    }

    // Add LIMIT and OFFSET
    query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
};

module.exports = {
    searchGroupsQuery
};