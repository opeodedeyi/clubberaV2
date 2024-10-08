const currentlyAttending = `
    SELECT
        COUNT(*)::int AS attendees_count
    FROM
        meeting_participation
    WHERE
        meeting_id = $1
    AND
        status = 'attending'
`;

const attendMeeting = `
    INSERT INTO
        meeting_participation (user_id, meeting_id, status)
    VALUES
        ($1, $2, $3)
    ON CONFLICT (meeting_id, user_id) 
        DO NOTHING
`;

const getMeetingAttendees = `
    SELECT
        u.id, u.unique_url, u.full_name,
        b.location AS avatar, b.key AS avatar_key,
        CASE WHEN gm.user_id IS NOT NULL THEN true ELSE false END AS is_group_member
    FROM
        meeting_participation mp
    JOIN
        users u ON mp.user_id = u.id
    LEFT JOIN
        banners b ON u.id = b.entity_id AND b.entity_type = 'user'
    LEFT JOIN
        meetings m ON mp.meeting_id = m.id
    LEFT JOIN
        group_members gm ON u.id = gm.user_id AND m.group_id = gm.group_id
    WHERE
        mp.meeting_id = $1
    AND
        mp.status = 'attending'
    ORDER BY
        u.full_name
    LIMIT $2
    OFFSET $3
`;

const getTotalAttendees = `
    SELECT COUNT(*) as total
    FROM meeting_participation
    WHERE meeting_id = $1 AND status = 'attending'
`;

const unattendMeeting = `
    DELETE FROM
        meeting_participation
    WHERE
        user_id = $1
    AND
        meeting_id = $2
`;

const checkAttendance = `
    SELECT status 
    FROM meeting_participation
    WHERE user_id = $1 AND meeting_id = $2
`;

const getNextWaitlisted = `
    SELECT user_id 
    FROM meeting_participation
    WHERE meeting_id = $1 AND status = 'waitlisted'
    ORDER BY indication_time ASC
    LIMIT 1
`;

const updateToAttending = `
    UPDATE meeting_participation
    SET status = 'attending'
    WHERE user_id = $1 AND meeting_id = $2
`;

module.exports = {
    currentlyAttending,
    attendMeeting,
    getMeetingAttendees,
    getTotalAttendees,
    unattendMeeting,
    checkAttendance,
    getNextWaitlisted,
    updateToAttending
};