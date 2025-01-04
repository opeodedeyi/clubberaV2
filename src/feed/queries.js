const getFeedContent = `
    (SELECT 
        m.id,
        m.unique_url,
        m.title,
        m.description,
        m.time_of_meeting,
        m.date_of_meeting,
        m.created_at,
        l.address as location,
        'event' AS content_type,
        g.title AS group_title,
        g.unique_url AS group_unique_url,
        mb.location AS event_banner,
        gb.location AS group_banner,
        NULL as user_name,
        NULL as user_unique_url,
        NULL as user_avatar,
        NULL as comment,
        NULL as reply_count,
        (SELECT json_agg(u.unique_url) 
         FROM meeting_participation mp 
         JOIN users u ON mp.user_id = u.id 
         WHERE mp.meeting_id = m.id AND mp.status = 'attending' 
         LIMIT 2) AS attending_users
    FROM 
        meetings m
    JOIN 
        groups g ON m.group_id = g.id
    LEFT JOIN
        group_members gm ON g.id = gm.group_id AND gm.user_id = $1
    LEFT JOIN
        locations l ON m.id = l.entity_id AND l.entity_type = 'meeting'
    LEFT JOIN
        banners mb ON m.id = mb.entity_id AND mb.entity_type = 'meeting'
    LEFT JOIN
        banners gb ON g.id = gb.entity_id AND gb.entity_type = 'group'
    WHERE 
        (gm.user_id = $1 OR g.owner_id = $1)
        AND m.date_of_meeting > CURRENT_DATE)

    UNION ALL

    (SELECT 
        d.id,
        NULL as unique_url,
        NULL as title,
        NULL as description,
        NULL as time_of_meeting,
        NULL as date_of_meeting,
        d.created_at,
        NULL as location,
        'discussion' AS content_type,
        g.title AS group_title,
        g.unique_url AS group_unique_url,
        NULL as event_banner,
        gb.location AS group_banner,
        u.full_name as user_name,
        u.unique_url as user_unique_url,
        b.location as user_avatar,
        d.comment,
        (SELECT COUNT(*) FROM discussions WHERE parent_id = d.id) as reply_count,
        NULL as attending_users
    FROM 
        discussions d
    JOIN 
        groups g ON d.entity_id = g.id AND d.entity_type = 'group'
    LEFT JOIN
        group_members gm ON g.id = gm.group_id AND gm.user_id = $1
    JOIN 
        users u ON d.owner_id = u.id
    LEFT JOIN
        banners b ON u.id = b.entity_id AND b.entity_type = 'user'
    LEFT JOIN
        banners gb ON g.id = gb.entity_id AND gb.entity_type = 'group'
    WHERE 
        (gm.user_id = $1 OR g.owner_id = $1)
        AND d.parent_id IS NULL)

    ORDER BY created_at DESC
    LIMIT $2
    OFFSET $3
`;

const getFallbackContent = `
    (SELECT 
        m.id,
        m.unique_url,
        m.title,
        m.description,
        m.time_of_meeting,
        m.date_of_meeting,
        m.created_at,
        l.address as location,
        'event' AS content_type,
        g.title AS group_title,
        g.unique_url AS group_unique_url,
        mb.location AS event_banner,
        gb.location AS group_banner,
        NULL as user_name,
        NULL as user_unique_url,
        NULL as user_avatar,
        NULL as comment,
        NULL as reply_count,
        (SELECT json_agg(u.unique_url) 
         FROM meeting_participation mp 
         JOIN users u ON mp.user_id = u.id 
         WHERE mp.meeting_id = m.id AND mp.status = 'attending' 
         LIMIT 2) AS attending_users
    FROM 
        meetings m
    JOIN 
        groups g ON m.group_id = g.id
    LEFT JOIN
        group_members gm ON g.id = gm.group_id AND gm.user_id = $1
    LEFT JOIN
        locations l ON m.id = l.entity_id AND l.entity_type = 'meeting'
    LEFT JOIN
        banners mb ON m.id = mb.entity_id AND mb.entity_type = 'meeting'
    LEFT JOIN
        banners gb ON g.id = gb.entity_id AND gb.entity_type = 'group'
    WHERE 
        g.is_private = false
        AND gm.id IS NULL
        AND m.date_of_meeting > CURRENT_DATE
        AND m.date_of_meeting <= CURRENT_DATE + INTERVAL '14 days')

    UNION ALL

    (SELECT 
        d.id,
        NULL as unique_url,
        NULL as title,
        NULL as description,
        NULL as time_of_meeting,
        NULL as date_of_meeting,
        d.created_at,
        NULL as location,
        'discussion' AS content_type,
        g.title AS group_title,
        g.unique_url AS group_unique_url,
        NULL as event_banner,
        gb.location AS group_banner,
        u.full_name as user_name,
        u.unique_url as user_unique_url,
        b.location as user_avatar,
        d.comment,
        (SELECT COUNT(*) FROM discussions WHERE parent_id = d.id) as reply_count,
        NULL as attending_users
    FROM 
        discussions d
    JOIN 
        groups g ON d.entity_id = g.id AND d.entity_type = 'group'
    LEFT JOIN
        group_members gm ON g.id = gm.group_id AND gm.user_id = $1
    JOIN 
        users u ON d.owner_id = u.id
    LEFT JOIN
        banners b ON u.id = b.entity_id AND b.entity_type = 'user'
    LEFT JOIN
        banners gb ON g.id = gb.entity_id AND gb.entity_type = 'group'
    WHERE 
        g.is_private = false
        AND gm.id IS NULL
        AND d.parent_id IS NULL)

    ORDER BY created_at DESC
    LIMIT $2
    OFFSET $3
`;

const getTotalMemberContent = `
    SELECT
    COUNT(*)
        as total 
    FROM (
    (SELECT
        m.id 
    FROM
        meetings m
    JOIN
        groups g ON m.group_id = g.id
    LEFT JOIN
        group_members gm ON g.id = gm.group_id AND gm.user_id = $1
    WHERE
        (gm.user_id = $1 OR g.owner_id = $1) AND m.date_of_meeting > CURRENT_DATE)
    
    UNION ALL

    (SELECT
        d.id
    FROM
        discussions d
    JOIN
        groups g ON d.entity_id = g.id AND d.entity_type = 'group'
    LEFT JOIN
        group_members gm ON g.id = gm.group_id AND gm.user_id = $1
    WHERE
        (gm.user_id = $1 OR g.owner_id = $1) AND d.parent_id IS NULL)) as combined_count
`;

const getTotalFallbackContent = `
    SELECT COUNT(*) as total FROM (
    (SELECT m.id FROM meetings m
    JOIN
        groups g ON m.group_id = g.id
    LEFT JOIN
        group_members gm ON g.id = gm.group_id AND gm.user_id = $1
    WHERE
        g.is_private = false AND gm.id IS NULL AND m.date_of_meeting > CURRENT_DATE AND m.date_of_meeting <= CURRENT_DATE + INTERVAL '14 days')
    
    UNION ALL
    
    (SELECT
        d.id FROM discussions d
    JOIN
        groups g ON d.entity_id = g.id AND d.entity_type = 'group'
    LEFT JOIN
        group_members gm ON g.id = gm.group_id AND gm.user_id = $1
    WHERE
        g.is_private = false AND gm.id IS NULL AND d.parent_id IS NULL)) as combined_count
`;

const getUpcomingEvents = `
    SELECT 
        m.id,
        m.unique_url,
        m.title,
        m.description,
        m.time_of_meeting,
        m.date_of_meeting,
        m.capacity,
        l.address as location,
        l.lat,
        l.lng,
        g.title AS group_title,
        g.unique_url AS group_unique_url,
        mb.location AS banner,
        gb.location AS group_banner,
        mp.status AS user_status,
        (SELECT COUNT(*) FROM meeting_participation 
         WHERE meeting_id = m.id AND status = 'attending') as attendee_count,
        (SELECT json_agg(u.unique_url) 
         FROM meeting_participation mp 
         JOIN users u ON mp.user_id = u.id 
         WHERE mp.meeting_id = m.id AND mp.status = 'attending' 
         LIMIT 2) AS attendees_avatar,
        true AS is_user_event
    FROM 
        meetings m
    JOIN 
        groups g ON m.group_id = g.id
    LEFT JOIN
        meeting_participation mp ON m.id = mp.meeting_id AND mp.user_id = $1
    LEFT JOIN
        locations l ON m.id = l.entity_id AND l.entity_type = 'meeting'
    LEFT JOIN
        banners mb ON m.id = mb.entity_id AND mb.entity_type = 'meeting'
    LEFT JOIN
        banners gb ON g.id = gb.entity_id AND gb.entity_type = 'group'
    WHERE 
        mp.user_id = $1
        AND m.date_of_meeting > CURRENT_DATE
    ORDER BY 
        m.date_of_meeting ASC
    LIMIT 5
`;

const getFallbackUpcomingEvents = `
    SELECT 
        m.id,
        m.unique_url,
        m.title,
        m.description,
        m.time_of_meeting,
        m.date_of_meeting,
        m.capacity,
        l.address as location,
        l.lat,
        l.lng,
        g.title AS group_title,
        g.unique_url AS group_unique_url,
        mb.location AS banner,
        gb.location AS group_banner,
        'not attending' AS user_status,
        (SELECT COUNT(*) FROM meeting_participation 
         WHERE meeting_id = m.id AND status = 'attending') as attendee_count,
        (SELECT json_agg(u.unique_url) 
         FROM meeting_participation mp 
         JOIN users u ON mp.user_id = u.id 
         WHERE mp.meeting_id = m.id AND mp.status = 'attending' 
         LIMIT 2) AS attendees_avatar,
        false AS is_user_event
    FROM 
        meetings m
    JOIN 
        groups g ON m.group_id = g.id
    LEFT JOIN
        locations l ON m.id = l.entity_id AND l.entity_type = 'meeting'
    LEFT JOIN
        banners mb ON m.id = mb.entity_id AND mb.entity_type = 'meeting'
    LEFT JOIN
        banners gb ON g.id = gb.entity_id AND gb.entity_type = 'group'
    WHERE 
        g.is_private = false
        AND m.date_of_meeting > CURRENT_DATE
        AND m.id NOT IN (
            SELECT meeting_id 
            FROM meeting_participation 
            WHERE user_id = $1
        )
    ORDER BY 
        attendee_count DESC, m.date_of_meeting ASC
    LIMIT 5
`;

module.exports = {
    getFeedContent,
    getFallbackContent,
    getTotalMemberContent,
    getTotalFallbackContent,
    getUpcomingEvents,
    getFallbackUpcomingEvents
};