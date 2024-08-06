const pool = require('../../db');
const queries = require('./queries');

const attendMeeting = async (req, res) => {
    const { user, meeting } = req;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const currentlyAttending = await client.query(queries.currentlyAttending, [meeting.rows[0].id]);
        const meetingCapacity = meeting.rows[0].capacity;
        const attendeesCount = currentlyAttending.rows[0].attendees_count;

        let status;
        if (attendeesCount < meetingCapacity) {
            status = 'attending';
        } else {
            status = 'waitlisted';
        }

        const result = await client.query(queries.attendMeeting, [user.rows[0].id, meeting.rows[0].id, status]);

        if (result.rowCount === 0) {
            // User was already in the meeting
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'You are already registered for this meeting'
            });
        }

        await client.query('COMMIT');
        
        res.status(200).json({
            success: true,
            message: `You are ${status} for the meeting`
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error:', error);
        if (error.constraint === 'meeting_participation_pkey') {
            return res.status(400).json({
                success: false,
                message: 'You are already registered for this meeting',
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    } finally {
        client.release();
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
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const checkAttendance = await client.query(queries.checkAttendance, [user.rows[0].id, meeting.rows[0].id]);

        if (checkAttendance.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'You are not registered for this meeting'
            });
        }

        const userStatus = checkAttendance.rows[0].status;

        const result = await client.query(queries.unattendMeeting, [user.rows[0].id, meeting.rows[0].id]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Failed to unattend the meeting'
            });
        }

        if (userStatus === 'attending') {
            const nextWaitlisted = await client.query(queries.getNextWaitlisted, [meeting.rows[0].id]);

            if (nextWaitlisted.rows.length > 0) {
                await client.query(queries.updateToAttending, [nextWaitlisted.rows[0].user_id, meeting.rows[0].id]);
                
                // Here you might want to add code to notify the user who's been moved from waitlist to attending
            }
        }

        await client.query('COMMIT');
        
        res.status(200).json({
            success: true,
            message: 'You have successfully unattended the meeting'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    } finally {
        client.release();
    }
}

module.exports = {
    attendMeeting,
    getMeetingAttendees,
    unattendMeeting
};