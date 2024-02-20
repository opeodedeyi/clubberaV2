const pool = require('../../db');
const queries = require('./queries');

async function findOrCreateLocation(entity_type, entity_id, city, address, lat, lng) {
    const existingLocation = await pool.query(queries.findLocation, [entity_type, entity_id, city, address, lat, lng]);

    if (existingLocation.rows.length > 0) {
        return existingLocation;
    } else {
        const newLocation = await pool.query(queries.createLocation, [entity_type, entity_id, city, address, lat, lng]);
        return newLocation;
    }
}

async function findThenUpdateOrCreateLocation(entity_type, entity_id, city, address, lat, lng) {
    const existingLocation = await pool.query(queries.findLocationByEntityOnly, [entity_type, entity_id]);

    if (existingLocation.rows.length > 0) {
        const updatedLocation = await pool.query(queries.updateLocation, [existingLocation.rows[0].location_id, city, address, lat, lng]);
        return updatedLocation;
    } else {
        const newLocation = await pool.query(queries.createLocation, [entity_type, entity_id, city, address, lat, lng]);
        return newLocation;
    }
}

async function createLocation(entity_type, entity_id, city, address, lat, lng) {
    const newLocation = await pool.query(queries.createLocation, [entity_type, entity_id, city, address, lat, lng]);
    return newLocation;
}

async function updateLocationById(id, city, address, lat, lng) {
    const updatedLocation = await pool.query(queries.updateLocation, [id, city, address, lat, lng]);
    return updatedLocation;
}

module.exports = {
    findOrCreateLocation,
    findThenUpdateOrCreateLocation,
    createLocation,
    updateLocationById
};