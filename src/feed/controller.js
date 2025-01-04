const pool = require('../../db');
const queries = require('./queries');


const getFeed = async (req, res) => {
    const userData = req.user;
    const user = userData.rows[0];
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // Get member content and count
        const [contentResult, countResult] = await Promise.all([
            pool.query(queries.getFeedContent, [user.id, limit, offset]),
            pool.query(queries.getTotalMemberContent, [user.id])
        ]);
        
        const totalItems = parseInt(countResult.rows[0].total);
        const formattedContent = formatFeedContent(contentResult.rows);

        res.status(200).json({
            success: true,
            feed: formattedContent,
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: totalItems,
                totalPages: Math.ceil(totalItems / limit)
            }
        });
    } catch (error) {
        console.error('Feed Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

const getFallbackFeed = async (req, res) => {
    const userData = req.user;
    const user = userData.rows[0];
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // Get fallback content and count
        const [contentResult, countResult] = await Promise.all([
            pool.query(queries.getFallbackContent, [user.id, limit, offset]),
            pool.query(queries.getTotalFallbackContent, [user.id])
        ]);
        
        const totalItems = parseInt(countResult.rows[0].total);
        const formattedContent = formatFeedContent(contentResult.rows);

        res.status(200).json({
            success: true,
            feed: formattedContent,
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: totalItems,
                totalPages: Math.ceil(totalItems / limit)
            }
        });
    } catch (error) {
        console.error('Fallback Feed Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

const formatFeedContent = (rows) => {
    return rows.map(item => {
        if (item.content_type === 'event') {
            return {
                id: item.id,
                type: 'event',
                unique_url: item.unique_url,
                title: item.title,
                description: item.description,
                time: item.time_of_meeting,
                date: item.date_of_meeting,
                location: item.location,
                banner: item.event_banner,
                attending_users: item.attending_users || [],
                group: {
                    title: item.group_title,
                    unique_url: item.group_unique_url,
                    banner: item.group_banner
                },
                created_at: item.created_at
            };
        } else {
            return {
                id: item.id,
                type: 'discussion',
                comment: item.comment,
                reply_count: parseInt(item.reply_count || '0'),
                author: {
                    name: item.user_name,
                    unique_url: item.user_unique_url,
                    avatar: item.user_avatar
                },
                group: {
                    title: item.group_title,
                    unique_url: item.group_unique_url,
                    banner: item.group_banner
                },
                created_at: item.created_at
            };
        }
    });
};

const getUpcomingEvents = async (req, res) => {
    const userData = req.user;
    const user = userData.rows[0];

    try {
        // First try to get user's upcoming events
        let eventsResult = await pool.query(queries.getUpcomingEvents, [user.id]);
        let events = eventsResult.rows;

        // If no upcoming events found, get fallback events
        if (events.length === 0) {
            const fallbackResult = await pool.query(queries.getFallbackUpcomingEvents, [user.id]);
            events = fallbackResult.rows;
        }

        const formattedEvents = events.map(event => ({
            id: event.id,
            unique_url: event.unique_url,
            title: event.title,
            description: event.description,
            date_of_meeting: event.date_of_meeting,
            time_of_meeting: event.time_of_meeting,
            location: event.location,
            lat: event.lat,
            lng: event.lng,
            banner: event.banner,
            attendee_count: parseInt(event.attendee_count) || 0,
            attendees_avatar: event.attendees_avatar,
            status: event.user_status,
            is_user_event: event.is_user_event,
            group: {
                title: event.group_title,
                unique_url: event.group_unique_url,
                banner: event.group_banner
            }
        }));

        res.status(200).json({
            success: true,
            meetings: formattedEvents
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};


module.exports = {
    getFeed,
    getFallbackFeed,
    getUpcomingEvents
};