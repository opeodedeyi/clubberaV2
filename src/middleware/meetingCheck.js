const pool = require('../../db');
const meetingQueries = require('../meeting/queries');
require('dotenv').config();


const meetingExists = async (req, res, next) => {
    try {
        const { meetingUniqueURL } = req.params;
        const meeting = await pool.query(meetingQueries.getMeetingByUniqueURL, [meetingUniqueURL]);

        if (!meeting.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'meeting not found'
            });
        }

        req.meeting = meeting;
        next();
    } catch (e) {
        return res.status(401).json({
            success: false,
            message: 'The URL is incorrect. Please try again with a different URL',
        });
    }
}

const isMeetingOwner = async (req, res, next) => {
    try {
        const userId = req.user.rows[0].id;
        const meetingOwnerId = req.meeting.rows[0].group_owner_id;

        if (userId !== meetingOwnerId) {
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
    meetingExists,
    isMeetingOwner,
};
