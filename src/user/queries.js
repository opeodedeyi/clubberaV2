const createToken = `
    INSERT INTO user_tokens (
        user_id, token) 
    VALUES 
        ($1, $2) 
    RETURNING 
        id, user_id, token, created_at
`;

const getUsers = 
    `SELECT
        u.id, u.full_name, u.email, u.unique_url, u.bio,
        u.gender, u.birthday, u.is_email_confirmed, u.is_active,
        u.created_at, l.address AS location,
        b.location AS avatar, b.key AS banner_key
    FROM
        users u
    LEFT JOIN
        locations l
    ON
        u.id = l.entity_id
    AND
        l.entity_type = 'user'
    LEFT JOIN
        banners b
    ON
        u.id = b.entity_id
    AND
        b.entity_type = 'user'
`;
    
const getUserById = `
    SELECT 
        u.id, u.full_name, u.email, u.unique_url, u.bio,
        u.gender, u.birthday, u.is_email_confirmed, u.is_active,
        u.created_at, l.address AS location,
        b.location AS avatar, b.key AS banner_key
    FROM 
        users u
    LEFT JOIN
        locations l
    ON
        u.id = l.entity_id
    AND
        l.entity_type = 'user'
    LEFT JOIN
        banners b
    ON
        u.id = b.entity_id
    AND
        b.entity_type = 'user'
    WHERE 
        u.id = $1
`;

const getUserByEmail = `
    SELECT 
        u.id, u.full_name, u.email, u.password, u.unique_url, u.bio,
        u.gender, u.birthday, u.is_email_confirmed, 
        u.is_active, u.created_at
    FROM 
        users u
    WHERE 
        u.email = $1
`;

const getUserByUniqueURL = `
    SELECT 
        u.id, u.full_name, u.email, u.unique_url, u.bio,
        u.gender, u.birthday, u.is_email_confirmed, 
        u.is_active, u.created_at, l.address AS location,
        b.location AS avatar
    FROM 
        users u
    LEFT JOIN
        locations l
    ON
        u.id = l.entity_id
    AND
        l.entity_type = 'user'
    LEFT JOIN
        banners b
    ON
        u.id = b.entity_id
    AND
        b.entity_type = 'user'
    WHERE 
        u.unique_url = $1
`;

const checkEmailExists = `
    SELECT
        u.id, u.full_name, u.email, u.unique_url, u.bio,
        u.gender, u.birthday, u.is_email_confirmed, u.is_active,
        u.created_at, l.address AS location,
        b.location AS avatar, b.key AS banner_key
    FROM 
        users u
    LEFT JOIN
        locations l
    ON
        u.id = l.entity_id
    AND
        l.entity_type = 'user'
    LEFT JOIN
        banners b
    ON
        u.id = b.entity_id
    AND
        b.entity_type = 'user'
    WHERE 
        u.email = $1`;

const createUser = `
    INSERT INTO users (
        email, full_name, password, unique_url) 
    VALUES 
        ($1, $2, $3, $4)
    RETURNING 
        id, full_name, email, unique_url, is_email_confirmed, 
        is_active, created_at
`;

const createGoogleUser = `
    INSERT INTO users (
        email, full_name, password, unique_url, is_email_confirmed) 
    VALUES
        ($1, $2, $3, $4, true)
    RETURNING
        id, full_name, email, unique_url, is_email_confirmed, 
        is_active, created_at
`;

const addEmailConfirmTokenToUserProfile = `
    UPDATE 
        users u
    SET
        email_confirm_token = $1
    WHERE
        id = $2
    RETURNING
        u.id, u.full_name, u.email, u.unique_url, u.bio,
        u.gender, u.birthday, u.is_email_confirmed,
        u.is_active, u.created_at
`;

const addPasswordResetTokenToUserProfile = `
    UPDATE 
        users
    SET
        password_reset_token = $1
    WHERE
        id = $2
    RETURNING 
        id, full_name, email, unique_url, bio, gender,
        birthday, is_email_confirmed, is_active, created_at
`;

const getUserFromUserToken = `
    SELECT 
        u.id, u.full_name, u.email, u.unique_url, u.bio, u.password, 
        u.gender, u.birthday, u.is_email_confirmed, u.is_active, 
        u.created_at, u.updated_at , l.address AS location,
        b.location AS avatar, b.key AS banner_key
    FROM
        users u
    INNER JOIN
        user_tokens ut
    ON
        u.id = ut.user_id
    LEFT JOIN
        locations l
    ON
        u.id = l.entity_id
    AND
        l.entity_type = 'user'
    LEFT JOIN
        banners b
    ON
        u.id = b.entity_id
    AND
        b.entity_type = 'user'
    WHERE
        ut.token = $1
`;

const getUserFromPasswordResetToken = `
    SELECT 
        id, full_name, email, unique_url, bio, password, gender,
        birthday, is_email_confirmed, is_active, created_at
    FROM 
        users 
    WHERE 
        password_reset_token = $1
`;

const updatePasswordFromId = `
    UPDATE
        users
    SET
        password = $1
    WHERE
        id = $2
    RETURNING 
        id, full_name, email, unique_url, bio, gender, 
        birthday, is_email_confirmed, is_active, created_at
`;

const getUserFromEmailConfirmToken = `
    SELECT 
        id, full_name, email, unique_url, bio, password, gender,
        birthday, is_email_confirmed, is_active, created_at
    FROM 
        users 
    WHERE 
        email_confirm_token = $1
`;

const confirmEmail = `
    UPDATE 
        users
    SET
        is_email_confirmed = true
    WHERE
        id = $1
    RETURNING
        id, full_name, email, unique_url, is_email_confirmed, 
        is_active, created_at
`;

const updateUser = `
    UPDATE 
        users
    SET
        full_name = COALESCE($2, full_name), 
        bio = COALESCE($3, bio), 
        gender = COALESCE($4, gender),
        birthday = COALESCE($5, birthday)
    WHERE
        id = $1
    RETURNING 
        id, full_name, email, unique_url, bio, gender, 
        birthday, is_email_confirmed, is_active, created_at
`;

const getUserCreatedGroups = `
    WITH group_info AS (
        SELECT 
            g.id, g.unique_url, g.title, g.tagline, g.description, g.is_private,
            l.address AS location,
            g.created_at AS date_joined,
            COUNT(DISTINCT gm.user_id) AS total_members
        FROM 
            groups g
        LEFT JOIN 
            locations l ON g.id = l.entity_id AND l.entity_type = 'group'
        LEFT JOIN 
            group_members gm ON g.id = gm.group_id
        WHERE 
            g.owner_id = $1
        GROUP BY 
            g.id, g.unique_url, g.title, g.tagline, g.description, g.is_private, l.address, g.created_at
    )
    SELECT 
        gi.*,
        ARRAY_AGG(b.location) FILTER (WHERE b.location IS NOT NULL) AS member_avatars
    FROM 
        group_info gi
    LEFT JOIN 
        group_members gm ON gi.id = gm.group_id
    LEFT JOIN 
        banners b ON gm.user_id = b.entity_id AND b.entity_type = 'user'
    GROUP BY 
        gi.id, gi.unique_url, gi.title, gi.tagline, gi.description, gi.is_private, gi.location, gi.date_joined, gi.total_members
    ORDER BY gi.date_joined DESC
    LIMIT $2 OFFSET $3
`;

const getUserCreatedGroupsCount = `
    SELECT COUNT(*) as count
    FROM groups
    WHERE owner_id = $1
`;

const getUserJoinedGroups = `
    WITH group_info AS (
        SELECT 
            g.id, g.unique_url, g.title, g.tagline, g.description, g.is_private,
            l.address AS location,
            gm.created_at AS date_joined,
            COUNT(DISTINCT gm2.user_id) AS total_members
        FROM 
            groups g
        JOIN 
            group_members gm ON g.id = gm.group_id AND gm.user_id = $1
        LEFT JOIN 
            locations l ON g.id = l.entity_id AND l.entity_type = 'group'
        LEFT JOIN 
            group_members gm2 ON g.id = gm2.group_id
        GROUP BY 
            g.id, g.unique_url, g.title, g.tagline, g.description, g.is_private, l.address, gm.created_at
    )
    SELECT 
        gi.*,
        ARRAY_AGG(b.location) FILTER (WHERE b.location IS NOT NULL) AS member_avatars
    FROM 
        group_info gi
    LEFT JOIN 
        group_members gm ON gi.id = gm.group_id
    LEFT JOIN 
        banners b ON gm.user_id = b.entity_id AND b.entity_type = 'user'
    GROUP BY 
        gi.id, gi.unique_url, gi.title, gi.tagline, gi.description, gi.is_private, gi.location, gi.date_joined, gi.total_members
    ORDER BY gi.date_joined DESC
    LIMIT $2 OFFSET $3
`;

const getUserJoinedGroupsCount = `
    SELECT COUNT(DISTINCT g.id) as count
    FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = $1
`;


module.exports = {
    createToken,
    getUsers,
    getUserById,
    getUserByEmail,
    getUserByUniqueURL,
    checkEmailExists,
    createUser,
    createGoogleUser,
    addEmailConfirmTokenToUserProfile,
    addPasswordResetTokenToUserProfile,
    getUserFromUserToken,
    getUserFromPasswordResetToken,
    updatePasswordFromId,
    getUserFromEmailConfirmToken,
    confirmEmail,
    updateUser,
    getUserCreatedGroups,
    getUserCreatedGroupsCount,
    getUserJoinedGroups,
    getUserJoinedGroupsCount
};