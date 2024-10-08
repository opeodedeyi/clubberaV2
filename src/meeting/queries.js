const createMeeting = `
    INSERT INTO meetings
        (unique_url, group_id, title, description, date_of_meeting, time_of_meeting, duration, capacity, location_details)
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING
        id, unique_url
`;

const getMeetingByUniqueURL = `
    SELECT 
        m.id, m.unique_url, m.title, m.description, m.date_of_meeting, m.time_of_meeting, 
        m.duration, m.capacity, m.location_details,
        g.title AS group_title, g.owner_id AS group_owner_id, g.unique_url AS group_unique_url,
        g.is_private AS group_is_private, g.tagline AS group_tagline,
        l.address AS location, l.lng, l.lat, 
        b.location AS banner, b.key AS banner_key,
        gb.location AS group_banner, gb.key AS group_banner_key,
        (SELECT COUNT(*) FROM meeting_participation mp WHERE mp.meeting_id = m.id AND mp.status = 'attending') AS attending_count,
        (SELECT COUNT(*) FROM meeting_participation mp WHERE mp.meeting_id = m.id AND mp.status = 'waitlist') AS waitlist_count
    FROM 
        meetings m
    JOIN
        groups g ON m.group_id = g.id
    LEFT JOIN
        locations l ON m.id = l.entity_id AND l.entity_type = 'meeting'
    LEFT JOIN
        banners b ON m.id = b.entity_id AND b.entity_type = 'meeting'
    LEFT JOIN
        banners gb ON g.id = gb.entity_id AND gb.entity_type = 'group'
    WHERE 
        m.unique_url = $1
`;


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
        capacity = COALESCE($7, capacity),
        location_details = COALESCE($8, location_details)
    WHERE 
        id = $1
    RETURNING
        id, title, description, date_of_meeting, time_of_meeting, duration, capacity, location_details
`;

const getWaitlistedAttendees = `
    SELECT user_id
    FROM meeting_participation
    WHERE meeting_id = $1 AND status = 'waitlisted'
    ORDER BY indication_time ASC
`;

const updateAttendeeStatus = `
    UPDATE meeting_participation
    SET status = 'attending'
    WHERE meeting_id = $1 AND user_id = ANY($2::int[])
    RETURNING user_id
`;


module.exports = {
    createMeeting,
    getMeetingByUniqueURL,
    getUpcomingGroupMeetings,
    getAllGroupMeetings,
    updateMeeting,
    getWaitlistedAttendees,
    updateAttendeeStatus
};