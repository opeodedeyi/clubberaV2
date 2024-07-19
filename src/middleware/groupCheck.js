const pool = require('../../db');
const groupQueries = require('../group/queries');
require('dotenv').config();


const groupExists = async (req, res, next) => {
    try {
        const { groupUniqueURL } = req.params;
        const group = await pool.query(groupQueries.getGroupByUniqueURL, [groupUniqueURL]);

        if (!group.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        req.group = group;
        next();
    } catch (e) {
        console.error('Error in groupExists middleware:', e);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request.',
        });
    }
}

const isGroupOwner = async (req, res, next) => {
    try {
        const userId = req.user.rows[0].id;
        const groupOwnerId = req.group.rows[0].owner_id;

        if (userId !== groupOwnerId) {
            return res.status(401).json({
                success: false,
                message: 'You are not the owner of this group',
            });
        }

        next();
    } catch (e) {
        return res.status(401).json({
            success: false,
            message: 'Please try a different group url.',
        });
    }
};


module.exports = {
    groupExists,
    isGroupOwner,
};
