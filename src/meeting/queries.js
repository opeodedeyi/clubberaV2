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
        l.address AS location, l.lng, l.lat, b.location AS banner, b.key AS banner_key,
        (SELECT COUNT(*) FROM meeting_participation mp WHERE mp.meeting_id = m.id AND mp.status = 'attending') AS attending_count,
        (SELECT COUNT(*) FROM meeting_participation mp WHERE mp.meeting_id = m.id AND mp.status = 'waitlist') AS waitlist_count,
        (SELECT json_agg(u.unique_url) 
         FROM meeting_participation mp 
         JOIN users u ON mp.user_id = u.id 
         WHERE mp.meeting_id = m.id AND mp.status = 'attending' 
         LIMIT 5) AS attending_avatars,
        owner.unique_url AS group_owner_unique_url,
        owner.full_name AS group_owner_full_name,
        owner.email AS group_owner_email,
        owner_banner.location AS group_owner_avatar
    FROM 
        meetings m
    JOIN
        groups g ON m.group_id = g.id
    JOIN
        users owner ON g.owner_id = owner.id
    LEFT JOIN
        banners owner_banner ON owner.id = owner_banner.entity_id AND owner_banner.entity_type = 'user'
    LEFT JOIN
        locations l ON m.id = l.entity_id AND l.entity_type = 'meeting'
    LEFT JOIN
        banners b ON m.id = b.entity_id AND b.entity_type = 'meeting'
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