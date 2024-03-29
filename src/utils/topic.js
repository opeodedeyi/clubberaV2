const pool = require('../../db');
const queries = require('./queries');


async function getTopics(entity_type, entity_id) {
    const topics = await pool.query(queries.getTopics, [entity_type, entity_id]);
    return topics;
}

async function addTopics(entity_type, entity_id, topics) {
    for (let topic of topics) {
        await pool.query(queries.addTopic, [topic, entity_type, entity_id]);
    }
    const result = await getTopics(entity_type, entity_id);
    return result;
}

async function updateTopics(entity_type, entity_id, topics) {
    await queries.removeUnwantedTopics(entity_type, entity_id, topics);
    const addedTopics = await addTopics(entity_type, entity_id, topics);
    return addedTopics;
}

module.exports = {
    getTopics,
    addTopics,
    updateTopics
};