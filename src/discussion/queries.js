const createDiscussion = `
    WITH inserted_discussion AS (
        INSERT INTO discussions (owner_id, entity_type, entity_id, parent_id, comment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, parent_id, comment, created_at AS discussion_time, owner_id
    )
    SELECT 
        d.id, 
        d.parent_id, 
        d.comment, 
        d.discussion_time, 
        u.full_name AS user_name,
        b.location AS user_avatar
    FROM inserted_discussion d
    JOIN users u ON d.owner_id = u.id
    LEFT JOIN banners b ON b.entity_type = 'user' AND b.entity_id = u.id
`;

const getGroupDiscussions = `
    WITH discussion_data AS (
        SELECT
            d.id, d.comment, d.created_at AS discussion_time,
            u.unique_url AS user_unique_url, u.full_name AS user_name,
            COALESCE(rc.reply_count, 0)::INTEGER AS reply_count,
            b.location AS user_image
        FROM
            discussions d
        JOIN
            users u ON d.owner_id = u.id
        LEFT JOIN (
            SELECT
                parent_id,
                COUNT(*)::INTEGER AS reply_count
            FROM
                discussions
            WHERE
                parent_id IS NOT NULL
            GROUP BY
                parent_id
        ) rc ON d.id = rc.parent_id
        LEFT JOIN
            banners b ON b.entity_type = 'user' AND b.entity_id = u.id
        WHERE
            d.entity_type = $1
        AND
            d.entity_id = $2
        AND
            d.parent_id IS NULL
        ORDER BY
            d.created_at DESC
    )
    SELECT * FROM discussion_data
    LIMIT $3 OFFSET $4
`;

const getTotalDiscussionsCount = `
    SELECT COUNT(*) AS total_count
    FROM discussions
    WHERE entity_type = $1 AND entity_id = $2 AND parent_id IS NULL
`;

const getMeetingDiscussions = `
    WITH discussion_data AS (
        SELECT
            d.id, d.comment, d.created_at AS discussion_time,
            u.unique_url AS user_unique_url, u.full_name AS user_name,
            COALESCE(rc.reply_count, 0)::INTEGER AS reply_count,
            b.location AS user_image
        FROM
            discussions d
        JOIN
            users u ON d.owner_id = u.id
        LEFT JOIN (
            SELECT
                parent_id,
                COUNT(*)::INTEGER AS reply_count
            FROM
                discussions
            WHERE
                parent_id IS NOT NULL
            GROUP BY
                parent_id
        ) rc ON d.id = rc.parent_id
        LEFT JOIN
            banners b ON b.entity_type = 'user' AND b.entity_id = u.id
        WHERE
            d.entity_type = 'meeting'
        AND
            d.entity_id = $1
        AND
            d.parent_id IS NULL
        ORDER BY
            d.created_at DESC
    )
    SELECT * FROM discussion_data
    LIMIT $2 OFFSET $3
`;

const getTotalMeetingDiscussionsCount = `
    SELECT COUNT(*) AS total_count
    FROM discussions
    WHERE entity_type = 'meeting' AND entity_id = $1 AND parent_id IS NULL
`;

const getReplies = `
    SELECT
        d.id, d.comment, d.created_at AS discussion_time,
        u.full_name AS user_name,
        b.location AS user_image
    FROM
        discussions d
    JOIN
        users u ON d.owner_id = u.id
    LEFT JOIN
        banners b ON b.entity_type = 'user' AND b.entity_id = u.id
    WHERE
        d.parent_id = $1
    ORDER BY
        d.created_at ASC
    LIMIT $2 OFFSET $3
`;

const getTotalRepliesCount = `
    SELECT COUNT(*) AS total_count
    FROM discussions
    WHERE parent_id = $1
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
    getGroupDiscussions,
    getTotalDiscussionsCount,
    getMeetingDiscussions,
    getTotalMeetingDiscussionsCount,
    getReplies,
    getTotalRepliesCount,
    getDiscussionById,
    deleteDiscussion
};