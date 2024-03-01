const createMeeting = `
    INSERT INTO meetings
        (unique_url, group_id, title, description, date_of_meeting, time_of_meeting, duration, capacity)
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
        id, unique_url, title, date_of_meeting, time_of_meeting, duration
`;

const getMeetingByUniqueURL = `
    SELECT 
        m.id, m.title, m.description, m.date_of_meeting, m.time_of_meeting, m.duration, m.capacity,
        g.title AS group_title, g.owner_id AS group_owner_id, l.address AS location, b.location AS banner, b.key AS banner_key
    FROM 
        meetings m
    JOIN
        groups g
    ON
        m.group_id = g.id
    LEFT JOIN
        locations l
    ON
        m.id = l.entity_id
    AND
        l.entity_type = 'meeting'
    LEFT JOIN
        banners b
    ON
        m.id = b.entity_id
    AND
        b.entity_type = 'meeting'
    WHERE 
        m.unique_url = $1
`;

const getAllGroupMeetings = `
    SELECT
        m.id, m.unique_url, m.title, m.description, m.date_of_meeting, m.time_of_meeting, m.duration, m.capacity,
        l.address AS location, b.location AS banner
    FROM
        meetings m
    LEFT JOIN
        locations l
    ON
        m.id = l.entity_id
    AND
        l.entity_type = 'meeting'
    LEFT JOIN
        banners b
    ON
        m.id = b.entity_id
    AND
        b.entity_type = 'meeting'
    WHERE
        m.group_id = $1
`;

const updateMeeting = `
    UPDATE 
        meetings
    SET
        title = COALESCE($2, 'title'),
        description = COALESCE($3, description),
        date_of_meeting = COALESCE($4, date_of_meeting),
        time_of_meeting = COALESCE($5, time_of_meeting),
        duration = COALESCE($6, duration), 
        capacity = COALESCE($7, capacity)
    WHERE 
        id = $1
    RETURNING
        id, title, description, date_of_meeting, time_of_meeting, duration, capacity
`;


module.exports = {
    createMeeting,
    getMeetingByUniqueURL,
    getAllGroupMeetings,
    updateMeeting
};