const createGroup = `
    INSERT INTO groups (
        unique_url, owner_id, title, description, banner_provider, 
        banner_key, banner_location, city, latitude, longitude, is_private) 
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING 
        id, unique_url, banner_location, created_at
`;

const getGroupByUniqueURL = `
    SELECT * 
    FROM 
        groups 
    WHERE 
        unique_url = $1
`;

const getUserCreatedGroups = `
    SELECT
        g.id, g.unique_url, g.title, g.description, 
        g.banner_provider, g.banner_key, g.banner_location, 
        g.city, g.latitude, g.longitude, 
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
        banner_provider = COALESCE($5, banner_provider), 
        banner_key = COALESCE($6, banner_key), 
        banner_location = COALESCE($7, banner_location), 
        city = COALESCE($8, city), 
        latitude = COALESCE($9, latitude), 
        longitude = COALESCE($10, longitude), 
        is_private = COALESCE($11, is_private)
    WHERE
        unique_url = $1
    RETURNING 
        unique_url, title, description,
        banner_provider, banner_key, banner_location,
        city, latitude, longitude,
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
        u.full_name, u.email, u.photo_location AS user_photo_location
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
        u.full_name, u.email, u.photo_location AS user_photo_location
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