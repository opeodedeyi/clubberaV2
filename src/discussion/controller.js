const pool = require('../../db');
const queries = require('./queries');


const getGroupDiscussions = async (req, res) => {
    const group = req.group;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // Get total count of discussions
        const countResult = await pool.query(queries.getTotalDiscussionsCount, ['group', group.rows[0].id]);
        const totalCount = parseInt(countResult.rows[0].total_count);

        // Get paginated discussions
        const result = await pool.query(queries.getGroupDiscussions, ['group', group.rows[0].id, limit, offset]);

        const discussions = result.rows.map(row => ({
            id: row.id,
            comment: row.comment,
            created_at: row.discussion_time,
            user_name: row.user_name,
            user_image: row.user_image || null,
            reply_count: row.reply_count
        }));

        return res.status(200).json({
            success: true,
            discussions: discussions,
            pagination: {
                currentPage: page,
                limit: limit,
                totalPages: Math.ceil(totalCount / limit),
                totalCount: totalCount
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const getMeetingDiscussions = async (req, res) => {
    const meeting = req.meeting; // Assuming you have middleware to fetch and attach the meeting to the request
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // Validate meeting
        if (!meeting || !meeting.rows || meeting.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found',
            });
        }

        // Get total count of discussions
        const countResult = await pool.query(queries.getTotalMeetingDiscussionsCount, [meeting.rows[0].id]);
        const totalCount = parseInt(countResult.rows[0].total_count);

        // Get paginated discussions
        const result = await pool.query(queries.getMeetingDiscussions, [meeting.rows[0].id, limit, offset]);

        const discussions = result.rows.map(row => ({
            id: row.id,
            comment: row.comment,
            created_at: row.discussion_time,
            user_name: row.user_name,
            user_image: row.user_image || null,
            reply_count: parseInt(row.reply_count)
        }));

        return res.status(200).json({
            success: true,
            discussions: discussions,
            pagination: {
                currentPage: page,
                limit: limit,
                totalPages: Math.ceil(totalCount / limit),
                totalCount: totalCount
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const createGroupDiscussion = async (req, res) => {
    const group = req.group;
    const user = req.user;
    const { comment } = req.body;
    
    try {
        const result = await pool.query(queries.createDiscussion, [user.rows[0].id, 'group', group.rows[0].id, null, comment]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Failed to create discussion',
            });
        }

        const discussion = result.rows[0];
        return res.status(201).json({
            success: true,
            discussion: {
                id: discussion.id,
                user_name: discussion.user_name,
                user_avatar: discussion.user_avatar || null,
                created_at: discussion.discussion_time,
                comment: discussion.comment,
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const createMeetingDiscussion = async (req, res) => {
    const meeting = req.meeting;
    const user = req.user;
    const { comment} = req.body;

    console.log(meeting.rows[0].id);
    console.log(user.rows[0].id);
    

    try {
        const result = await pool.query(queries.createDiscussion, [user.rows[0].id, 'meeting', meeting.rows[0].id, null, comment]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Failed to create discussion',
            });
        }

        const discussion = result.rows[0];
        return res.status(201).json({
            success: true,
            discussion: {
                id: discussion.id,
                user_name: discussion.user_name,
                user_avatar: discussion.user_avatar || null,
                created_at: discussion.discussion_time,
                comment: discussion.comment,
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const getDiscussionReply = async (req, res) => {
    const discussion = req.discussion;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // Validate discussion
        if (!discussion || !discussion.rows || discussion.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Discussion not found',
            });
        }

        // Get total count of replies
        const countResult = await pool.query(queries.getTotalRepliesCount, [discussion.rows[0].id]);
        const totalCount = parseInt(countResult.rows[0].total_count);

        // Get paginated replies
        const result = await pool.query(queries.getReplies, [discussion.rows[0].id, limit, offset]);

        const replies = result.rows.map(row => ({
            id: row.id,
            comment: row.comment,
            created_at: row.discussion_time,
            user_name: row.user_name,
            user_image: row.user_image || null
        }));

        return res.status(200).json({
            success: true,
            replies: replies,
            pagination: {
                currentPage: page,
                limit: limit,
                totalPages: Math.ceil(totalCount / limit),
                totalCount: totalCount
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const createDiscussionReply = async (req, res) => {
    const discussion = req.discussion;
    const user = req.user;
    const { comment } = req.body;

    try {
        const result = await pool.query(queries.createDiscussion, [user.rows[0].id, discussion.rows[0].entity_type, discussion.rows[0].entity_id, discussion.rows[0].id, comment]);
        return res.status(201).json({
            success: true,
            discussion: result.rows[0]
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const deleteDiscussion = async (req, res) => {
    const discussion = req.discussion;

    try {
        await pool.query(queries.deleteDiscussion, [discussion.rows[0].id]);
        return res.status(200).json({
            success: true,
            message: 'Discussion deleted successfully'
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

module.exports = {
    getGroupDiscussions,
    getMeetingDiscussions,
    createGroupDiscussion,
    createMeetingDiscussion,
    getDiscussionReply,
    createDiscussionReply,
    deleteDiscussion
};