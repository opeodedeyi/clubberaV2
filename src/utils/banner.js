const pool = require('../../db');
const queries = require('./queries');


async function createBanner(entity_type, entity_id, provider, key, location) {
    const newBanner = await pool.query(queries.createBanner, [entity_type, entity_id, provider, key, location]);
    return newBanner;
}

async function updateBanner(id, provider, key, location) {
    const updatedBanner = await pool.query(queries.updateBanner, [id, provider, key, location]);
    return updatedBanner;
}

async function createOrUpdateBanner(entity_type, entity_id, provider, key, location) {
    const banner = await pool.query(queries.getBannerByEntity, [entity_type, entity_id]);
    if (banner.rows[0]) {
        const updatedBanner = await updateBanner(banner.rows[0].banner_id, provider, key, location);
        return updatedBanner;
    } else {
        return await createBanner(entity_type, entity_id, provider, key, location);
    }
}

module.exports = {
    createBanner,
    updateBanner,
    createOrUpdateBanner
};