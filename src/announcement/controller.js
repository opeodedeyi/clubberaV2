const pool = require('../../db');
const queries = require('./queries');

const getGroupAnnouncement = async (req, res) => {
    const group = req.group;

    try {
        const result = await pool.query(queries.getAnnouncement, ['group', group.rows[0].id]);
        return res.status(200).json({
            success: true,
            announcement: result.rows
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const createGroupAnnouncement = async (req, res) => {
    const group = req.group;
    const { announcement } = req.body;

    try {
        const result = await pool.query(queries.createAnnouncement, [announcement, 'group', group.rows[0].id]);
        return res.status(201).json({
            success: true,
            announcement: result.rows[0]
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const deleteGroupAnnouncement = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(queries.deleteAnnouncement, [id]);
        return res.status(200).json({
            success: true,
            message: 'Announcement deleted'
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
    getGroupAnnouncement,
    createGroupAnnouncement,
    deleteGroupAnnouncement
};