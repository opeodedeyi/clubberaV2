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
        u.id, u.unique_url, u.email, u.full_name
    FROM
        meeting_participation mp
    JOIN
        users u
    ON
        mp.user_id = u.id
    WHERE
        mp.meeting_id = $1
    AND
        mp.status = 'attending'
`;

const unattendMeeting = `
    DELETE FROM
        meeting_participation
    WHERE
        user_id = $1
    AND
        meeting_id = $2
`;

module.exports = {
    currentlyAttending,
    attendMeeting,
    getMeetingAttendees,
    unattendMeeting,
};