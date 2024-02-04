const getAllUsersToken = "SELECT * FROM user_tokens WHERE user_ id = $1";

const createToken = `
    INSERT INTO user_tokens (
        user_id, token) 
    VALUES 
        ($1, $2) 
    RETURNING 
        id, user_id, token, created_at
`;

const checkTokenExists = `
    SELECT 
        s 
    FROM 
        user_tokens s 
    WHERE 
        s.token = $1
`;

const deleteAllUserTokens = `
    DELETE FROM 
        user_tokens 
    WHERE 
        user_id = $1
`;

const deleteCurrentUserTokens = `
    DELETE FROM 
        user_tokens 
    WHERE 
        token = $1
`;


module.exports = {
    getAllUsersToken,
    createToken,
    checkTokenExists,
    deleteAllUserTokens,
    deleteCurrentUserTokens,
};