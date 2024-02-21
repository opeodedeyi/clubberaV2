const createDiscussion = `
    INSERT INTO
        discussions (owner_id, entity_type, entity_id, parent_id, comment)
    VALUES
        ($1, $2, $3, $4, $5)
    RETURNING
        id, parent_id, comment, created_at AS discussion_time
`;

const getDiscussion = `
    SELECT
        d.id, d.comment, d.created_at AS discussion_time,
        u.unique_url AS user_unique_url, u.full_name AS user_name,
        COALESCE(rc.reply_count, 0) AS reply_count
    FROM
        discussions d
    JOIN
        users u ON d.owner_id = u.id
    LEFT JOIN (
        SELECT
            parent_id,
            COUNT(*) AS reply_count
        FROM
            discussions
        WHERE
            parent_id IS NOT NULL
        GROUP BY
            parent_id
    ) rc ON d.id = rc.parent_id
    WHERE
        d.entity_type = $1
    AND
        d.entity_id = $2
    AND
        d.parent_id IS NULL
`;

const getReplies = `
    SELECT
        d.id, d.comment, d.created_at AS discussion_time,
        u.unique_url AS user_unique_url, u.full_name AS user_name,
        COALESCE(rc.reply_count, 0) AS reply_count
    FROM
        discussions d
    JOIN
        users u ON d.owner_id = u.id
    LEFT JOIN (
        SELECT
            parent_id,
            COUNT(*) AS reply_count
        FROM
            discussions
        WHERE
            parent_id IS NOT NULL
        GROUP BY
            parent_id
    ) rc ON d.id = rc.parent_id
    WHERE
        d.parent_id = $1
`;

const getDiscussionById = `
    SELECT
        *
    FROM
        discussions d
    WHERE
        d.id = $1
`;

const deleteDiscussion = `
    DELETE FROM
        discussions
    WHERE
        id = $1
`;

module.exports = {
    createDiscussion,
    getDiscussion,
    getReplies,
    getDiscussionById,
    deleteDiscussion
};