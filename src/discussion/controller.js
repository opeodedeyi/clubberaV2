const pool = require('../../db');
const queries = require('./queries');


const getGroupDiscussion = async (req, res) => {
    const group = req.group;

    try {
        const result = await pool.query(queries.getDiscussion, ['group', group.rows[0].id]);
        return res.status(200).json({
            success: true,
            discussion: result.rows
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const createGroupDiscussion = async (req, res) => {
    const group = req.group;
    const user = req.user;
    const { comment } = req.body;

    try {
        const result = await pool.query(queries.createDiscussion, [user.rows[0].id, 'group', group.rows[0].id, null, comment]);
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

const getDiscussionReply = async (req, res) => {
    const discussion = req.discussion;

    try {
        const result = await pool.query(queries.getReplies, [discussion.rows[0].id]);
        return res.status(200).json({
            success: true,
            discussion: result.rows
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

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
    getGroupDiscussion,
    createGroupDiscussion,
    getDiscussionReply,
    createDiscussionReply,
    deleteDiscussion
};