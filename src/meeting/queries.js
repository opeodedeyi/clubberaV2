const createMeeting = `
    INSERT INTO meetings
        (unique_url, group_id, title, description, date_of_meeting, time_of_meeting, duration, capacity)
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
        unique_url
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

// const getMeetingByUniqueURL = `
//     SELECT 
//         m.id, 
//         m.title AS meeting_title, 
//         m.description, 
//         m.date_of_meeting, 
//         m.time_of_meeting, 
//         m.duration, 
//         m.capacity,
//         g.title AS group_title, 
//         g.owner_id AS group_owner_id, 
//         gh.name AS host_name,
//         gh.email AS host_email,
//         l.address AS location, 
//         mb.location AS meeting_banner, 
//         mb.key AS meeting_banner_key,
//         gb.location AS group_banner, 
//         gb.key AS group_banner_key,
//         COALESCE(att.total_attendees, 0) AS total_attendees,
//         COALESCE(att.five_attendees, ARRAY[]::json[]) AS five_attendees
//     FROM 
//         meetings m
//     JOIN
//         groups g
//     ON
//         m.group_id = g.id
//     LEFT JOIN
//         locations l
//     ON
//         m.id = l.entity_id
//     AND
//         l.entity_type = 'meeting'
//     LEFT JOIN
//         banners mb
//     ON
//         m.id = mb.entity_id
//     AND
//         mb.entity_type = 'meeting'
//     LEFT JOIN
//         banners gb
//     ON
//         g.id = gb.entity_id
//     AND
//         gb.entity_type = 'group'
//     JOIN
//         users gh
//     ON
//         g.owner_id = gh.id
//     LEFT JOIN (
//         SELECT 
//             a.meeting_id, 
//             COUNT(a.user_id) AS total_attendees, 
//             JSON_AGG(json_build_object('name', u.name, 'status', a.status, 'banner', ab.location)) FILTER (WHERE a.user_id IS NOT NULL) AS five_attendees
//         FROM 
//             meeting_participation a
//         LEFT JOIN 
//             users u
//         ON 
//             a.user_id = u.id
//         LEFT JOIN 
//             banners ab
//         ON 
//             u.id = ab.entity_id
//         AND 
//             ab.entity_type = 'user'
//         GROUP BY 
//             a.meeting_id
//     ) att
//     ON 
//         m.id = att.meeting_id
//     WHERE 
//         m.unique_url = $1
// `;


const getUpcomingGroupMeetings = `
    SELECT
        m.id,
        m.unique_url,
        m.title AS meeting_title,
        m.description AS meeting_description,
        m.date_of_meeting,
        m.time_of_meeting,
        m.duration,
        m.capacity,
        l.address AS meeting_location,
        mb.location AS meeting_banner,
        COALESCE(att.total_attendees, 0) AS total_attendees,
        COALESCE(att.two_attendees, ARRAY[]::json[]) AS two_attendees_banners
    FROM
        meetings m
    LEFT JOIN
        locations l
    ON
        m.id = l.entity_id
    AND
        l.entity_type = 'meeting'
    LEFT JOIN
        banners mb
    ON
        m.id = mb.entity_id
    AND
        mb.entity_type = 'meeting'
    LEFT JOIN (
        SELECT
            a.meeting_id,
            COUNT(a.user_id) AS total_attendees,
            JSON_AGG(json_build_object('banner', ab.location)) FILTER (WHERE a.user_id IS NOT NULL) AS two_attendees
        FROM
            meeting_participation a
        LEFT JOIN
            banners ab
        ON
            a.user_id = ab.entity_id
        AND
            ab.entity_type = 'user'
        GROUP BY
            a.meeting_id
        LIMIT 2
    ) att
    ON
        m.id = att.meeting_id
    WHERE
        m.group_id = $1
    AND
        m.date_of_meeting >= CURRENT_DATE
    ORDER BY
        m.date_of_meeting, m.time_of_meeting
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
    getUpcomingGroupMeetings,
    getAllGroupMeetings,
    updateMeeting
};