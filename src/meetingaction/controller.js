const pool = require('../../db');
const queries = require('./queries');

const attendMeeting = async (req, res) => {
    const { user, meeting } = req;
    let status = 'waitlisted';

    try {
        const currentlyAttending = await pool.query(queries.currentlyAttending, [meeting.rows[0].id]);
        const meetingCapacity = meeting.rows[0].capacity;

        if (currentlyAttending.rows[0].attendees_count < meetingCapacity) {
            status = 'attending';
        }

        await pool.query(queries.attendMeeting, [user.rows[0].id, meeting.rows[0].id, status]);
        
        res.status(200).json({
            success: true,
            message: 'you will be attending the meeting'
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const getMeetingAttendees = async (req, res) => {
    // incomplete
    const { meeting } = req;
    try {
        const result = await pool.query(queries.getMeetingAttendees, [meeting.rows[0].id]);
        res.status(200).json({
            success: true,
            attendees: result.rows
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const unattendMeeting = async (req, res) => {
    const { user, meeting } = req;
    try {
        await pool.query(queries.unattendMeeting, [user.rows[0].id, meeting.rows[0].id]);
        res.status(200).json({
            success: true,
            message: 'you will not be attending the meeting'
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
    attendMeeting,
    getMeetingAttendees,
    unattendMeeting
};