const getRequestById = `
    SELECT 
        gr.id, 
        gr.group_id, 
        gr.user_id, 
        gr.created_at, 
        g.owner_id
    FROM 
        group_requests gr
    JOIN
        groups g ON gr.group_id = g.id
    WHERE 
        gr.id = $1
`;

const removeRequest = `
    DELETE FROM
        group_requests
    WHERE
        id = $1
`;

const acceptRequest = `
    INSERT INTO 
        group_members 
        (group_id, user_id)
    VALUES
        ($1, $2)
    ON CONFLICT (group_id, user_id)
    DO NOTHING
    RETURNING
        group_id, created_at, user_id
`;


module.exports = {
    getRequestById,
    removeRequest,
    acceptRequest
};
