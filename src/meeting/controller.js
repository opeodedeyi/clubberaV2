const pool = require('../../db');
const queries = require('./queries');
const meetingActionQueries = require('../meetingaction/queries');
const locationdb = require('../utils/location');
const bannerdb = require('../utils/banner');
const { uploadToS3, deleteFromS3 } = require('../services/s3service');


const createMeeting = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { group } = req;
        const { title, description, date_of_meeting, time_of_meeting, duration, capacity, banner, location, lat, lng, location_details } = req.body;
        const unique_url = title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();

        // Create meeting
        const result = await client.query(queries.createMeeting, [unique_url, group.rows[0].id, title, description, date_of_meeting, time_of_meeting, duration, capacity, location_details]);
        const meeting = result.rows[0];

        let bannerData = null;
        let createdLocation = null;
        
        // Upload banner to S3 (outside of transaction)
        if (banner) {
            const data = await uploadToS3(banner, `${unique_url}-banner.jpg`);
            bannerData = await bannerdb.createBannerWithClient(client, 'meeting', meeting.id, 'aws', data.key, data.location);
        }

        // Create location
        if (location) {
            createdLocation = await locationdb.createLocationWithClient(client, 'meeting', meeting.id, location, lat, lng);
        }

        await client.query('COMMIT');

        const responseObject = {
            success: true,
            meeting: meeting
        };

        if (createdLocation?.rows[0]) {
            responseObject.meeting.location = createdLocation.rows[0].address;
        }

        if (bannerData?.rows[0]) {
            responseObject.meeting.banner = bannerData.rows[0].banner;
        }

        res.status(201).json(responseObject);
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

const getMeetingByUniqueURL = async (req, res) => {
    const { user, meeting } = req;
    try {
        let meetingData = meeting.rows[0];

        // Format duration
        const hours = Math.floor(meetingData.duration.hours);
        const minutes = meetingData.duration.minutes;
        meetingData.duration = `${hours}:${minutes.toString().padStart(2, '0')}`;

        // Determine user status
        let userStatus = 'not attending';
        if (user) {
            if (user.id === meetingData.group_owner_id) {
                userStatus = 'owner';
            } else {
                const statusResult = await pool.query(
                    'SELECT status FROM meeting_participation WHERE meeting_id = $1 AND user_id = $2',
                    [meetingData.id, user.id]
                );
                if (statusResult.rows.length > 0) {
                    userStatus = statusResult.rows[0].status;
                }
            }
        }

        // Prepare response
        const responseObject = {
            success: true,
            meeting: {
                ...meetingData,
                attending_count: parseInt(meetingData.attending_count),
                waitlist_count: parseInt(meetingData.waitlist_count),
                attending_avatars: meetingData.attending_avatars || [],
                user_status: userStatus,
                group_owner: {
                    unique_url: meetingData.group_owner_unique_url,
                    full_name: meetingData.group_owner_full_name,
                    email: meetingData.group_owner_email,
                    avatar: meetingData.group_owner_avatar
                }
            }
        };

        // Remove the individual group owner fields from the main object
        delete responseObject.meeting.group_owner_unique_url;
        delete responseObject.meeting.group_owner_full_name;
        delete responseObject.meeting.group_owner_email;
        delete responseObject.meeting.group_owner_avatar;

        res.status(200).json(responseObject);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const updateMeeting = async (req, res) => {
    const { meeting } = req;
    const { title, description, date_of_meeting, time_of_meeting, duration, capacity, location, lat, lng, location_details } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const oldMeeting = meeting.rows[0];
        const result = await client.query(queries.updateMeeting, [oldMeeting.id, title, description, date_of_meeting, time_of_meeting, duration, capacity, location_details]);
        const updatedMeeting = result.rows[0];

        let updatedLocation = null;
        if (location) {
            updatedLocation = await locationdb.findThenUpdateOrCreateLocation('meeting', oldMeeting.id, location, lat, lng);
        }

        // Check if capacity has increased
        if (capacity && capacity > oldMeeting.capacity) {
            const increasedCapacity = capacity - oldMeeting.capacity;
            const currentlyAttending = await client.query(meetingActionQueries.currentlyAttending, [oldMeeting.id]);
            const attendeesCount = currentlyAttending.rows[0].attendees_count;
            const slotsAvailable = Math.min(increasedCapacity, updatedMeeting.capacity - attendeesCount);

            if (slotsAvailable > 0) {
                const waitlistedResult = await client.query(queries.getWaitlistedAttendees, [oldMeeting.id]);
                const waitlistedAttendees = waitlistedResult.rows.slice(0, slotsAvailable).map(row => row.user_id);

                if (waitlistedAttendees.length > 0) {
                    console.log('Updating attendee status with query:', queries.updateAttendeeStatus);
                    if (!queries.updateAttendeeStatus) {
                        throw new Error('updateAttendeeStatus query is undefined');
                    }

                    const updatedAttendeesResult = await client.query(queries.updateAttendeeStatus, [oldMeeting.id, waitlistedAttendees]);
                    
                    // Here you might want to add code to notify users who have been moved from waitlist to attending
                }
            }
        }

        await client.query('COMMIT');

        const responseObject = {
            success: true,
            meeting: updatedMeeting
        };

        if (updatedLocation?.rows[0]) {
            responseObject.meeting.location = updatedLocation.rows[0].address;
        }

        res.status(200).json(responseObject);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    } finally {
        client.release();
    }
}

const updateMeetingBanner = async (req, res) => {
    const { meeting } = req;
    const { banner } = req.body;

    try {
        await deleteFromS3(meeting.rows[0].banner_key);
        const data = await uploadToS3(banner, `${meeting.rows[0].unique_url}-banner.jpg`);
        await bannerdb.createOrUpdateBanner('meeting', meeting.rows[0].id, 'aws', data.key, data.location);

        res.status(200).json({
            success: true,
            message: 'Banner updated',
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
    createMeeting,
    getMeetingByUniqueURL,
    updateMeeting,
    updateMeetingBanner
};