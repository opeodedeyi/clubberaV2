const createToken = `
    INSERT INTO user_tokens (
        user_id, token) 
    VALUES 
        ($1, $2) 
    RETURNING 
        id, user_id, token, created_at
`;

const getUsers = 
    `SELECT * FROM users`;
    
const getUserById = `
    SELECT 
        u.id, u.full_name, u.email, u.unique_url, u.bio,
        u.gender, u.birthday, u.is_email_confirmed, u.is_active,
        u.created_at, l.address AS location,
        b.location AS banner, b.key AS banner_key
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
        u.is_active, u.created_at, l.address AS location
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
        s 
    FROM 
        users s 
    WHERE 
        s.email = $1`;

const createUser = `
    INSERT INTO users (
        email, full_name, password, unique_url) 
    VALUES 
        ($1, $2, $3, $4)
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
        b.location AS banner, b.key AS banner_key
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
        id, full_name, email, unique_url, bio, gender,
        birthday, is_email_confirmed, is_active, created_at
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
    SELECT
        g.id, g.unique_url, g.title, g.description,
        g.is_private, g.created_at, g.updated_at,
        l.address AS location, b.location AS banner
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
        g.owner_id = $1
`;


module.exports = {
    createToken,
    getUsers,
    getUserById,
    getUserByEmail,
    getUserByUniqueURL,
    checkEmailExists,
    createUser,
    addEmailConfirmTokenToUserProfile,
    addPasswordResetTokenToUserProfile,
    getUserFromUserToken,
    getUserFromPasswordResetToken,
    updatePasswordFromId,
    getUserFromEmailConfirmToken,
    confirmEmail,
    updateUser,
    getUserCreatedGroups,
};