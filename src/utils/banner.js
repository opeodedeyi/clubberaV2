const pool = require('../../db');
const queries = require('./queries');


async function createBanner(entity_type, entity_id, provider, key, location) {
    const newBanner = await pool.query(queries.createBanner, [entity_type, entity_id, provider, key, location]);
    return newBanner;
}

async function createBannerWithClient(client, entity_type, entity_id, provider, key, location) {
    const newBanner = await client.query(queries.createBanner, [entity_type, entity_id, provider, key, location]);
    return newBanner;
}

async function updateBanner(id, provider, key, location) {
    const updatedBanner = await pool.query(queries.updateBanner, [id, provider, key, location]);
    return updatedBanner;
}

async function updateBannerWithClient(client, id, provider, key, location) {
    const updatedBanner = await client.query(queries.updateBanner, [id, provider, key, location]);
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

async function createOrUpdateBannerWithClient(client, entity_type, entity_id, provider, key, location) {
    const banner = await client.query(queries.getBannerByEntity, [entity_type, entity_id]);
    if (banner.rows[0]) {
        const updatedBanner = await updateBannerWithClient(client, banner.rows[0].banner_id, provider, key, location);
        return updatedBanner;
    } else {
        return await createBannerWithClient(client, entity_type, entity_id, provider, key, location);
    }
}

module.exports = {
    createBanner,
    createBannerWithClient,
    updateBanner,
    updateBannerWithClient,
    createOrUpdateBanner,
    createOrUpdateBannerWithClient
};