const createGroup = `
    INSERT INTO groups (
        unique_url, owner_id, title, description, is_private) 
    VALUES 
        ($1, $2, $3, $4, $5)
    RETURNING 
        id, unique_url, title
`;

const getAllGroups = `
    SELECT
        g.id, g.unique_url, g.title, g.description, l.city, b.location AS banner
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
        g.*, l.id AS location_id, l.city, l.lat, l.lng,
        b.id AS banner_id, b.location AS banner, b.key AS banner_key
    FROM 
        groups g
    JOIN
        locations l
    ON
        g.id = l.entity_id
    AND
        l.entity_type = 'group'
    LEFT JOIN
        banners b
    ON 
        g.id = b.entity_id 
    AND
        b.entity_type = 'group'
    WHERE 
        unique_url = $1
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
        gm.id AS member_id, gm.created_at,
        u.id AS user_id, u.unique_url AS user_unique_url, 
        u.full_name, u.email
    FROM
        users u
    JOIN
        group_members gm
    ON
        u.id = gm.user_id
    WHERE
        gm.group_id = $1
`;

const getAllRequests = `
    SELECT
        gr.id AS request_id, gr.created_at,
        u.id AS user_id, u.unique_url AS user_unique_url, 
        u.full_name, u.email
    FROM
        users u
    JOIN
        group_requests gr
    ON
        u.id = gr.user_id
    WHERE
        gr.group_id = $1
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
    getAllRequests
};