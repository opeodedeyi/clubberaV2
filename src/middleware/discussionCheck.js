const pool = require('../../db');
const discussionQueries = require('../discussion/queries');
require('dotenv').config();


const discussionExists = async (req, res, next) => {
    try {
        const { discussionId } = req.params;
        const discussion = await pool.query(discussionQueries.getDiscussionById, [discussionId]);

        if (!discussion.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Discussion not found'
            });
        }

        req.discussion = discussion;
        next();
    } catch (e) {
        return res.status(401).json({
            success: false,
            message: 'Please put correct discussion id',
        });
    }
}

const isDiscussionOwner = async (req, res, next) => {
    try {
        const userId = req.user.rows[0].id;
        const discussionOwnerId = req.discussion.rows[0].owner_id;

        if (userId !== discussionOwnerId) {
            return res.status(401).json({
                success: false,
                message: 'You are not the owner of this discussion',
            });
        }

        next();
    } catch (e) {
        return res.status(401).json({
            success: false,
            message: 'Please try a different discussion id.',
        });
    }
}

module.exports = {
    discussionExists,
    isDiscussionOwner,
};
