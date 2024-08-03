const pool = require('../../db');
const queries = require('./queries');

async function findOrCreateLocation(entity_type, entity_id, address, lat, lng) {
    const existingLocation = await pool.query(queries.findLocation, [entity_type, entity_id, address, lat, lng]);

    if (existingLocation.rows.length > 0) {
        return existingLocation;
    } else {
        const newLocation = await pool.query(queries.createLocation, [entity_type, entity_id, address, lat, lng]);
        return newLocation;
    }
}

async function findOrCreateLocationWithClient(client, entity_type, entity_id, address, lat, lng) {
    const existingLocation = await client.query(queries.findLocation, [entity_type, entity_id, address, lat, lng]);

    if (existingLocation.rows.length > 0) {
        return existingLocation;
    } else {
        const newLocation = await client.query(queries.createLocation, [entity_type, entity_id, address, lat, lng]);
        return newLocation;
    }
}

async function findThenUpdateOrCreateLocation(entity_type, entity_id, address, lat, lng) {
    const existingLocation = await pool.query(queries.findLocationByEntityOnly, [entity_type, entity_id]);

    if (existingLocation.rows.length > 0) {
        const updatedLocation = await pool.query(queries.updateLocation, [existingLocation.rows[0].location_id, address, lat, lng]);
        return updatedLocation;
    } else {
        const newLocation = await pool.query(queries.createLocation, [entity_type, entity_id, address, lat, lng]);
        return newLocation;
    }
}

async function findThenUpdateOrCreateLocationWithClient(client, entity_type, entity_id, address, lat, lng) {
    const existingLocation = await client.query(queries.findLocationByEntityOnly, [entity_type, entity_id]);

    if (existingLocation.rows.length > 0) {
        const updatedLocation = await client.query(queries.updateLocation, [existingLocation.rows[0].location_id, address, lat, lng]);
        return updatedLocation;
    } else {
        const newLocation = await client.query(queries.createLocation, [entity_type, entity_id, address, lat, lng]);
        return newLocation;
    }
}

async function createLocation(entity_type, entity_id, address, lat, lng) {
    const newLocation = await pool.query(queries.createLocation, [entity_type, entity_id, address, lat, lng]);
    return newLocation;
}

async function createLocationWithClient(client, entity_type, entity_id, address, lat, lng) {
    const newLocation = await client.query(queries.createLocation, [entity_type, entity_id, address, lat, lng]);
    return newLocation;
}

async function updateLocationById(id, address, lat, lng) {
    const updatedLocation = await pool.query(queries.updateLocation, [id, address, lat, lng]);
    return updatedLocation;
}

async function updateLocationByIdWithClient(client, id, address, lat, lng) {
    const updatedLocation = await client.query(queries.updateLocation, [id, address, lat, lng]);
    return updatedLocation;
}

module.exports = {
    findOrCreateLocation,
    findOrCreateLocationWithClient,
    findThenUpdateOrCreateLocation,
    findThenUpdateOrCreateLocationWithClient,
    createLocation,
    createLocationWithClient,
    updateLocationById,
    updateLocationByIdWithClient
};