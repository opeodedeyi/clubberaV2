const pool = require('../../db');

const searchMeetings = async (searchText, sortBy, userLat, userLng, filters, offset, limit) => {
    // Split the searchText into individual words
    const searchWords = searchText.split(/\s+/).filter(word => word.length > 0);

    let innerQuery = `
        SELECT m.*, l.lat, l.lng, l.address,
               CASE 
                 WHEN $2::numeric IS NOT NULL AND $3::numeric IS NOT NULL 
                 THEN 
                   6371 * acos(cos(radians($2)) * cos(radians(l.lat)) 
                   * cos(radians(l.lng) - radians($3)) + sin(radians($2)) 
                   * sin(radians(l.lat)))
               END AS distance,
               (
                 LENGTH(m.title) - LENGTH(REPLACE(LOWER(m.title), LOWER($1), '')) +
                 LENGTH(m.description) - LENGTH(REPLACE(LOWER(m.description), LOWER($1), '')) +
                 LENGTH(COALESCE(l.address, '')) - LENGTH(REPLACE(LOWER(COALESCE(l.address, '')), LOWER($1), ''))
               ) / LENGTH($1) AS search_relevance
        FROM meetings m
        LEFT JOIN locations l ON l.entity_type = 'meeting' AND l.entity_id = m.id
        WHERE 1=1
    `;

    const values = [searchText, userLat, userLng];
    let paramCounter = 4;

    // Add conditions for each search word
    if (searchWords.length > 0) {
        innerQuery += ' AND (';
        const wordConditions = searchWords.map((word, index) => {
            const wordParam = `$${paramCounter + index}`;
            values.push(`%${word}%`);
            return `(m.title ILIKE ${wordParam} OR m.description ILIKE ${wordParam} OR l.address ILIKE ${wordParam})`;
        });
        innerQuery += wordConditions.join(' OR ');
        innerQuery += ')';
        paramCounter += searchWords.length;
    }

    // Apply filters
    if (filters) {
        if (filters.fromDate) {
            innerQuery += ` AND m.date_of_meeting >= $${paramCounter}`;
            values.push(filters.fromDate);
            paramCounter++;
        }
        if (filters.toDate) {
            innerQuery += ` AND m.date_of_meeting <= $${paramCounter}`;
            values.push(filters.toDate);
            paramCounter++;
        }
        if (filters.minCapacity) {
            innerQuery += ` AND m.capacity >= $${paramCounter}`;
            values.push(filters.minCapacity);
            paramCounter++;
        }
        if(filters.maxCapacity) {
            innerQuery += ` AND m.capacity <= $${paramCounter}`;
            values.push(filters.maxCapacity);
            paramCounter++;
        }
        if(filters.upcoming){
            innerQuery += ` AND m.date_of_meeting >= CURRENT_DATE`;
        }
    }

    // Construct the final query with the subqueries
    let query = `
        WITH ranked_meetings AS (
            ${innerQuery}
        ),
        counted_meetings AS (
            SELECT rm.*, 
                   (
                       ${searchWords.map((_, index) => {
                           const wordParam = `$${paramCounter + index}`;
                           return `CASE WHEN (rm.title ILIKE ${wordParam} OR rm.description ILIKE ${wordParam} OR rm.address ILIKE ${wordParam}) THEN 1 ELSE 0 END`;
                       }).join(' + ')}
                   ) AS matching_word_count
            FROM ranked_meetings rm
        )
        SELECT *
        FROM counted_meetings
    `;

    // Update values array with search words again
    searchWords.forEach(word => values.push(`%${word}%`));

    // Apply sorting
    switch (sortBy) {
        case 'alphabetical':
            query += ' ORDER BY title ASC';
            break;
        case 'date':
            query += ' ORDER BY date_of_meeting ASC';
            break;
        case 'location':
            if (userLat !== null && userLng !== null) {
                query += ' ORDER BY distance ASC NULLS LAST';
            }
            break;
        case 'relevance':
            query += ` ORDER BY 
                         CASE 
                           WHEN matching_word_count = ${searchWords.length} THEN 0 
                           ELSE 1 
                         END,
                         search_relevance DESC`;
            break;
        default:
            query += ' ORDER BY created_at DESC';
    }

    // Add LIMIT and OFFSET
    query += ` LIMIT $${paramCounter + searchWords.length} OFFSET $${paramCounter + searchWords.length + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    
    // Get total count without LIMIT and OFFSET
    const countQuery = `SELECT COUNT(*) FROM (${query.split('LIMIT')[0]}) AS total_count`;
    const { rows: countRows } = await pool.query(countQuery, values.slice(0, -2));
    const totalCount = parseInt(countRows[0].count);

    return { meetings: rows, totalCount };
};

module.exports = {
    searchMeetings
};
