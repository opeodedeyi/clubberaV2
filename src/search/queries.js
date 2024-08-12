const pool = require('../../db');

const searchMeetings = async (searchText, sortBy, userLat, userLng, filters, offset, limit, userId = null) => {
    const searchWords = searchText.split(/\s+/).filter(word => word.length > 0);
    let paramCounter = 1;
    const values = [userLat, userLng, userId, searchText];

    let baseQuery = `
        SELECT m.*, g.title AS group_title, l.lat, l.lng, l.address AS location,
               b.location AS banner,
               m.unique_url,
               CASE 
                 WHEN $1::numeric IS NOT NULL AND $2::numeric IS NOT NULL 
                 THEN 
                   6371 * acos(cos(radians($1)) * cos(radians(l.lat)) 
                   * cos(radians(l.lng) - radians($2)) + sin(radians($1)) 
                   * sin(radians(l.lat)))
               END AS distance,
               (SELECT COUNT(*)::INT FROM meeting_participation mp WHERE mp.meeting_id = m.id AND mp.status = 'attending') AS attendee_count,
               CASE
                 WHEN g.owner_id = $3 THEN 'owner'
                 WHEN EXISTS (SELECT 1 FROM meeting_participation mp WHERE mp.meeting_id = m.id AND mp.user_id = $3 AND mp.status = 'attending') THEN 'attending'
                 WHEN EXISTS (SELECT 1 FROM meeting_participation mp WHERE mp.meeting_id = m.id AND mp.user_id = $3 AND mp.status = 'waitlist') THEN 'waitlist'
                 WHEN $3 IS NOT NULL THEN 'not_attending'
                 ELSE 'not_attending'
               END AS status,
               (
                 LENGTH(m.title) - LENGTH(REPLACE(LOWER(m.title), LOWER($4), '')) +
                 LENGTH(m.description) - LENGTH(REPLACE(LOWER(m.description), LOWER($4), '')) +
                 LENGTH(COALESCE(l.address, '')) - LENGTH(REPLACE(LOWER(COALESCE(l.address, '')), LOWER($4), ''))
               ) / LENGTH($4) AS search_relevance
        FROM meetings m
        LEFT JOIN locations l ON l.entity_type = 'meeting' AND l.entity_id = m.id
        LEFT JOIN groups g ON m.group_id = g.id
        LEFT JOIN banners b ON b.entity_type = 'meeting' AND b.entity_id = m.id
        WHERE 1=1
    `;

    paramCounter = 5;

    // Add conditions for each search word
    if (searchWords.length > 0) {
        baseQuery += ' AND (';
        const wordConditions = searchWords.map((word, index) => {
            const wordParam = `$${paramCounter + index}`;
            values.push(`%${word}%`);
            return `(m.title ILIKE ${wordParam} OR m.description ILIKE ${wordParam} OR l.address ILIKE ${wordParam})`;
        });
        baseQuery += wordConditions.join(' OR ');
        baseQuery += ')';
        paramCounter += searchWords.length;
    }

    // Apply filters
    if (filters) {
        if (filters.fromDate) {
            baseQuery += ` AND m.date_of_meeting >= $${paramCounter}`;
            values.push(filters.fromDate);
            paramCounter++;
        }
        if (filters.toDate) {
            baseQuery += ` AND m.date_of_meeting <= $${paramCounter}`;
            values.push(filters.toDate);
            paramCounter++;
        }
        if (filters.minCapacity) {
            baseQuery += ` AND m.capacity >= $${paramCounter}`;
            values.push(filters.minCapacity);
            paramCounter++;
        }
        if(filters.maxCapacity) {
            baseQuery += ` AND m.capacity <= $${paramCounter}`;
            values.push(filters.maxCapacity);
            paramCounter++;
        }
        if(filters.upcoming) {
            baseQuery += ` AND m.date_of_meeting >= CURRENT_DATE`;
        }
    }

    // Apply sorting
    switch (sortBy) {
        case 'alphabetical':
            baseQuery += ' ORDER BY m.title ASC';
            break;
        case 'date':
            baseQuery += ' ORDER BY m.date_of_meeting ASC';
            break;
        case 'location':
            if (userLat !== null && userLng !== null) {
                baseQuery += ' ORDER BY distance ASC NULLS LAST';
            }
            break;
        case 'relevance':
            baseQuery += ' ORDER BY search_relevance DESC';
            break;
        default:
            baseQuery += ' ORDER BY m.created_at DESC';
    }

    // Add LIMIT and OFFSET
    baseQuery += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    values.push(limit, offset);

    // Construct the final query
    const finalQuery = `
        WITH base_results AS (${baseQuery})
        SELECT br.*, 
               (
                 SELECT COALESCE(json_agg(b.location) FILTER (WHERE b.location IS NOT NULL), '[]'::json)
                 FROM meeting_participation mp
                 JOIN banners b ON b.entity_type = 'user' AND b.entity_id = mp.user_id
                 WHERE mp.meeting_id = br.id AND mp.status = 'attending'
                 GROUP BY mp.meeting_id
                 LIMIT 2
               ) AS attendees_avatar
        FROM base_results br
    `;

    const { rows } = await pool.query(finalQuery, values);
    
    // Get total count without LIMIT and OFFSET
    const countQuery = `SELECT COUNT(*) FROM (${baseQuery.split('LIMIT')[0]}) AS total_count`;
    const { rows: countRows } = await pool.query(countQuery, values.slice(0, -2));
    const totalCount = parseInt(countRows[0].count);

    return { meetings: rows, totalCount };
};

module.exports = {
    searchMeetings
};
