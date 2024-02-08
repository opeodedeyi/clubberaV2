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
        id, full_name, email, unique_url, bio, gender, city, latitude, longitude, 
        photo_provider, photo_key, photo_location, birthday, is_email_confirmed, 
        is_active, created_at, updated_at
    FROM 
        users 
    WHERE 
        id = $1
`;

const getUserByEmail = `
    SELECT 
        id, full_name, email, unique_url, bio, password, gender, city, latitude, longitude, 
        photo_provider, photo_key, photo_location, birthday, is_email_confirmed, 
        is_active, created_at, updated_at
    FROM 
        users 
    WHERE 
        email = $1
`;

const getUserByUniqueURL = `
    SELECT 
        id, full_name, email, unique_url, bio, gender, city, latitude, longitude, 
        photo_provider, photo_key, photo_location, birthday, is_email_confirmed, 
        is_active, created_at, updated_at
    FROM 
        users 
    WHERE 
        unique_url = $1
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
        email, full_name, password, city, latitude, longitude, unique_url) 
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7) 
    RETURNING 
        id, full_name, email, unique_url, bio, gender, city, latitude, longitude, 
        photo_provider, photo_key, photo_location, birthday, is_email_confirmed, 
        is_active, created_at, updated_at
`;

const addEmailConfirmTokenToUserProfile = `
    UPDATE 
        users
    SET
        email_confirm_token = $1
    WHERE
        id = $2
    RETURNING 
        id, full_name, email, unique_url, bio, gender, city, latitude, longitude, 
        photo_provider, photo_key, photo_location, birthday, is_email_confirmed, 
        is_active, created_at, updated_at
`;

const addPasswordResetTokenToUserProfile = `
    UPDATE 
        users
    SET
        password_reset_token = $1
    WHERE
        id = $2
    RETURNING 
        id, full_name, email, unique_url, bio, gender, city, latitude, longitude, 
        photo_provider, photo_key, photo_location, birthday, is_email_confirmed, 
        is_active, created_at, updated_at
`;

const getUserFromUserToken = `
    SELECT 
        u.id, u.full_name, u.email, u.unique_url, u.bio, u.password, u.gender, u.city, u.latitude, u.longitude, u.
        photo_provider, u.photo_key, u.photo_location, u.birthday, u.is_email_confirmed, u.
        is_active, u.created_at, u.updated_at 
    FROM 
        users u
    INNER JOIN 
        user_tokens ut 
    ON 
        u.id = ut.user_id
    WHERE 
        ut.token = $1
`;

const getUserFromPasswordResetToken = `
    SELECT 
        id, full_name, email, unique_url, bio, password, gender, city, latitude, longitude, 
        photo_provider, photo_key, photo_location, birthday, is_email_confirmed, 
        is_active, created_at, updated_at
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
        id, full_name, email, unique_url, bio, gender, city, latitude, longitude, 
        photo_provider, photo_key, photo_location, birthday, is_email_confirmed, 
        is_active, created_at, updated_at
`;

const getUserFromEmailConfirmToken = `
    SELECT 
        id, full_name, email, unique_url, bio, password, gender, city, latitude, longitude, 
        photo_provider, photo_key, photo_location, birthday, is_email_confirmed, 
        is_active, created_at, updated_at
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
        id, full_name, email, unique_url, bio, gender, city, latitude, longitude, 
        photo_provider, photo_key, photo_location, birthday, is_email_confirmed, 
        is_active, created_at, updated_at
`;

const updateUser = `
    UPDATE 
        users
    SET
        full_name = COALESCE($2, full_name), 
        bio = COALESCE($3, bio), 
        gender = COALESCE($4, gender), 
        city = COALESCE($5, city), 
        latitude = COALESCE($6, latitude), 
        longitude = COALESCE($7, longitude), 
        birthday = COALESCE($8, birthday)
    WHERE
        id = $1
    RETURNING 
        id, full_name, email, unique_url, bio, gender, city, latitude, longitude, 
        photo_provider, photo_key, photo_location, birthday, is_email_confirmed, 
        is_active, created_at, updated_at
`;

const getUserCreatedGroups = `
    SELECT
        g.id, g.unique_url, g.title, g.description, g.banner_provider, g.banner_key, g.banner_location, g.city, g.latitude, g.longitude, g.is_private, g.created_at, g.updated_at
    FROM
        groups g
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