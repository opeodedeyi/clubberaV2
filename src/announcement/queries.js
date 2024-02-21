const getAnnouncement = `
    SELECT
        id AS announcement_id, announcement, created_at AS announcement_time, entity_id
    FROM
        announcements
    WHERE
        entity_type = $1
    AND
        entity_id = $2
`;

const createAnnouncement = `
    INSERT INTO
        announcements (announcement, entity_type, entity_id)
    VALUES
        ($1, $2, $3)
    RETURNING
        id AS announcement_id, announcement, created_at AS announcement_time`;

const deleteAnnouncement = `
    DELETE FROM
        announcements
    WHERE
        id = $1
`;

module.exports = {
    getAnnouncement,
    createAnnouncement,
    deleteAnnouncement
};