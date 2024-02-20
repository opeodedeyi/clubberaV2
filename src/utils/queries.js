const pool = require('../../db');

const findLocation = `
    SELECT 
        id AS location_id, city, address, lat, lng
    FROM 
        locations 
    WHERE
        entity_type = $1
    AND
        entity_id = $2
    AND
        city = $3
    AND 
        address = $4
    AND 
        lat = $5
    AND 
        lng = $6
`;

const findLocationByEntityOnly = `
    SELECT
        id AS location_id, city, address, lat, lng
    FROM
        locations
    WHERE
        entity_type = $1
    AND
        entity_id = $2
`;

const createLocation = `
    INSERT INTO 
        locations (entity_type, entity_id, city, address, lat, lng) 
    VALUES 
        ($1, $2, $3, $4, $5, $6) 
    RETURNING 
        id AS location_id, city, address, lat, lng
`;

const updateLocation = `
    UPDATE 
        locations 
    SET 
        city = $2, 
        address = $3, 
        lat = $4, 
        lng = $5
    WHERE
        id = $1
    RETURNING 
        id AS location_id, city, address, lat, lng
`;

const createBanner = `
    INSERT INTO 
        banners (entity_type, entity_id, provider, key, location) 
    VALUES 
        ($1, $2, $3, $4, $5) 
    RETURNING 
        id AS banner_id, location AS banner
`;

const updateBanner = `
    UPDATE 
        banners 
    SET 
        provider = $2, 
        key = $3, 
        location = $4
    WHERE
        id = $1
    RETURNING 
        id AS banner_id, location AS banner
`;

const getBannerByEntity = `
    SELECT 
        id AS banner_id, location AS banner, key AS banner_key
    FROM 
        banners 
    WHERE
        entity_type = $1
    AND
        entity_id = $2
`;

const addTopic = `
    INSERT INTO
        topics (name, entity_type, entity_id)
    VALUES
        ($1, $2, $3)
    ON CONFLICT
        (name, entity_type, entity_id) DO NOTHING
`;

const getTopics = `
    SELECT
        t.name
    FROM
        topics t
    WHERE
        t.entity_type = $1
    AND
        t.entity_id = $2
`;

async function removeUnwantedTopics(entityType, entityId, topics) {
    const query = `
        DELETE FROM topics
        WHERE entity_type = $1 AND entity_id = $2
        AND name NOT IN (${topics.map((_, index) => `$${index + 3}`).join(', ')})
    `;

    console.log('topics removed');
    await pool.query(query, [entityType, entityId, ...topics]);
}

module.exports = {
    findLocation,
    findLocationByEntityOnly,
    createLocation,
    updateLocation,
    createBanner,
    updateBanner,
    getBannerByEntity,
    addTopic,
    getTopics,
    removeUnwantedTopics
};