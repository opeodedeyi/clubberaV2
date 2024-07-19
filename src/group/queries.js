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
    getAllRequests,
    checkGroupMembership
};