const createGroup = `
    INSERT INTO groups (
        unique_url, owner_id, title, description, is_private) 
    VALUES 
        ($1, $2, $3, $4, $5)
    RETURNING 
        id, unique_url, title, description, created_at
`;

const getAllGroups = `
    SELECT
        g.id, g.unique_url, g.title, g.description, l.address AS location, b.location AS banner, g.created_at
    FROM
        groups g
    LEFT JOIN
        banners b
    ON 
        g.id = b.entity_id 
    AND
        b.entity_type = 'group'
    LEFT JOIN
        locations l
    ON
        g.id = l.entity_id
    AND
        l.entity_type = 'group'
`;

const getGroupByUniqueURL = `
    WITH group_data AS (
        SELECT
            g.id, g.unique_url, g.title, g.tagline, g.description, g.owner_id, g.is_private,
            l.address AS location, l.lat, l.lng, b.location AS banner,
            u.full_name AS host_name,
            (SELECT location FROM banners WHERE entity_type = 'user' AND entity_id = g.owner_id) AS host_avatar,
            (SELECT COUNT(*)
                FROM group_members gm
                WHERE gm.group_id = g.id) AS member_count
        FROM 
            groups g
        JOIN 
            locations l ON g.id = l.entity_id AND l.entity_type = 'group'
        LEFT JOIN
            banners b ON g.id = b.entity_id AND b.entity_type = 'group'
        JOIN
            users u ON g.owner_id = u.id
        WHERE 
            g.unique_url = $1
    ),
    member_avatars AS (
        SELECT ARRAY_AGG(b.location) AS avatars
        FROM (
            SELECT gm.user_id
            FROM group_members gm
            JOIN group_data gd ON gm.group_id = gd.id
            WHERE gm.user_id != gd.owner_id
            ORDER BY gm.created_at
            LIMIT 5
        ) AS members
        LEFT JOIN banners b ON b.entity_type = 'user' AND b.entity_id = members.user_id
    )
    SELECT gd.*, ma.avatars AS members_avatar
    FROM group_data gd, member_avatars ma
`;

const getUserCreatedGroups = `
    SELECT
        g.id, g.unique_url, g.title, g.description,
        g.is_private, g.created_at, g.updated_at
    FROM
        groups g
    WHERE
        g.owner_id = $1
`;

const updateGroup = `
    UPDATE 
        groups
    SET
        title = COALESCE($2, title), 
        tagline = COALESCE($3, tagline),
        description = COALESCE($4, description), 
        is_private = COALESCE($5, is_private)
    WHERE
        unique_url = $1
    RETURNING 
        unique_url, title, description,
        is_private, created_at
`;

const joinGroup = `
    INSERT INTO group_members (
        group_id, user_id)
    VALUES
        ($1, $2)
    ON CONFLICT (group_id, user_id) 
    DO NOTHING
    RETURNING
        group_id, created_at, user_id
`;

const sendGroupRequest = `
    INSERT INTO group_requests (
        group_id, user_id)
    VALUES
        ($1, $2)
    ON CONFLICT (group_id, user_id)
    DO NOTHING
    RETURNING
        group_id, created_at, user_id
`;

const leaveGroup = `
    DELETE FROM group_members
    WHERE
        group_id = $1
    AND 
        user_id = $2
    RETURNING
        group_id, user_id
`;

const removeGroupRequest = `
    DELETE FROM group_requests
    WHERE
        group_id = $1
    AND
        user_id = $2
    RETURNING
        group_id, user_id
`;

const getAllMembers = `
    SELECT
        u.id,
        u.full_name,
        u.email,
        u.unique_url,
        gm.created_at AS date_joined,
        b.location AS avatar,
        l.address AS location
    FROM
        users u
    JOIN
        group_members gm ON u.id = gm.user_id
    LEFT JOIN
        banners b ON u.id = b.entity_id AND b.entity_type = 'user'
    LEFT JOIN
        locations l ON u.id = l.entity_id AND l.entity_type = 'user'
    WHERE
        gm.group_id = $1
    ORDER BY
        gm.created_at DESC
    LIMIT $2 OFFSET $3
`;

const getAllMembersCount = `
    SELECT COUNT(*) as count
    FROM group_members
    WHERE group_id = $1
`;

const getAllRequests = `
    SELECT
        gr.id AS request_id, gr.created_at,
        u.id AS user_id, u.unique_url AS user_unique_url, 
        u.full_name, u.email,
        b.location AS avatar,
        l.address AS user_location
    FROM
        users u
    JOIN
        group_requests gr ON u.id = gr.user_id
    LEFT JOIN
        banners b ON u.id = b.entity_id AND b.entity_type = 'user'
    LEFT JOIN
        locations l ON u.id = l.entity_id AND l.entity_type = 'user'
    WHERE
        gr.group_id = $1
    ORDER BY
        gr.created_at DESC
    LIMIT $2 OFFSET $3
`;

const getAllRequestsCount = `
    SELECT COUNT(*) as count
    FROM group_requests
    WHERE group_id = $1
`;

const checkGroupMembership = `
    SELECT
        1
    FROM
        group_members gm
    WHERE
        gm.group_id = $1
    AND
        gm.user_id = $2
`;

const getMeetingsForGroup = `
    SELECT 
        m.id, m.unique_url, m.title, m.description, m.date_of_meeting, 
        m.time_of_meeting,
        l.address AS location, l.lat, l.lng,
        b.location AS banner,
        (SELECT COUNT(*) FROM meeting_participation mp WHERE mp.meeting_id = m.id AND mp.status = 'attending') AS attendee_count,
        (SELECT ARRAY_AGG(b.location) 
         FROM meeting_participation mp 
         JOIN banners b ON b.entity_type = 'user' AND b.entity_id = mp.user_id 
         WHERE mp.meeting_id = m.id AND mp.status = 'attending' 
         LIMIT 2) AS attendees_avatar,
        CASE 
            WHEN $2::INTEGER IS NOT NULL THEN
                CASE
                    WHEN m.group_id IN (SELECT id FROM groups WHERE owner_id = $2) THEN 'owner'
                    WHEN EXISTS (SELECT 1 FROM meeting_participation mp WHERE mp.meeting_id = m.id AND mp.user_id = $2 AND mp.status = 'attending') THEN 'attending'
                    WHEN EXISTS (SELECT 1 FROM meeting_participation mp WHERE mp.meeting_id = m.id AND mp.user_id = $2 AND mp.status = 'waitlist') THEN 'waitlist'
                    ELSE 'not attending'
                END
            ELSE 'not attending'
        END AS status
    FROM 
        meetings m
    LEFT JOIN 
        locations l ON m.id = l.entity_id AND l.entity_type = 'meeting'
    LEFT JOIN
        banners b ON m.id = b.entity_id AND b.entity_type = 'meeting'
    WHERE 
        m.group_id = $1
        AND ($3::boolean IS NULL OR 
            ($3::boolean = true AND m.date_of_meeting >= CURRENT_DATE) OR 
            ($3::boolean = false AND m.date_of_meeting < CURRENT_DATE))
    ORDER BY 
        m.date_of_meeting ASC, m.time_of_meeting ASC
    LIMIT $4 OFFSET $5
`;

const getMeetingsForGroupCount = `
    SELECT COUNT(*)
    FROM meetings m
    WHERE 
        m.group_id = $1
        AND ($2::boolean IS NULL OR 
            ($2::boolean = true AND m.date_of_meeting >= CURRENT_DATE) OR 
            ($2::boolean = false AND m.date_of_meeting < CURRENT_DATE))
`;

module.exports = {
    createGroup,
    getAllGroups,
    getGroupByUniqueURL,
    getUserCreatedGroups,
    updateGroup,
    joinGroup,
    sendGroupRequest,
    leaveGroup,
    removeGroupRequest,
    getAllMembers,
    getAllMembersCount,
    getAllRequests,
    getAllRequestsCount,
    checkGroupMembership,
    getMeetingsForGroup,
    getMeetingsForGroupCount
};