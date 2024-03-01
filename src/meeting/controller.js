const pool = require('../../db');
const queries = require('./queries');
const locationdb = require('../utils/location');
const bannerdb = require('../utils/banner');
const { uploadToS3, deleteFromS3 } = require('../services/s3service');


const createMeeting = async (req, res) => {
    const { group } = req;
    const { title, description, date_of_meeting, time_of_meeting, duration, capacity, banner, location, lat, lng } = req.body;
    const unique_url = title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();

    try {
        const result = await pool.query(queries.createMeeting, [unique_url, group.rows[0].id, title, description, date_of_meeting, time_of_meeting, duration, capacity]);
        let bannerData = null;
        let createdLocation = null;
        
        if (banner) {
            const data = await uploadToS3(banner, `${unique_url}-banner.jpg`);
            bannerData = await bannerdb.createBanner('meeting', result.rows[0].id, 'aws', data.key, data.location);
        }

        if (location) {
            createdLocation = await locationdb.createLocation('meeting', result.rows[0].id, location, lat, lng);
        }

        const responseObject = {
            success: true,
            meeting: result.rows[0]
        };

        if (createdLocation?.rows[0]) {
            responseObject.meeting.location = createdLocation.rows[0].address;
        }

        if (bannerData?.rows[0]) {
            responseObject.meeting.banner = bannerData.rows[0].banner;
        }

        res.status(201).json(responseObject);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const getMeetingByUniqueURL = async (req, res) => {
    const { meeting } = req;
    try {
        res.status(200).json({
            success: true,
            meeting: meeting.rows[0]
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const getAllGroupMeetings = async (req, res) => {
    const { group } = req;
    try {
        const result = await pool.query(queries.getAllGroupMeetings, [group.rows[0].id]);
        res.status(200).json({
            success: true,
            meetings: result.rows
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const updateMeeting = async (req, res) => {
    const { meeting } = req;
    const { title, description, date_of_meeting, time_of_meeting, duration, capacity, banner, location, lat, lng } = req.body;
    try {
        const result = await pool.query(queries.updateMeeting, [meeting.rows[0].id, title, description, date_of_meeting, time_of_meeting, duration, capacity]);
        let updatedBanner = null;
        let updatedLocation = null;

        if (banner) {
            await deleteFromS3(meeting.rows[0].banner_key);
            const data = await uploadToS3(banner, `${meeting.rows[0].unique_url}-banner.jpg`);
            updatedBanner = await bannerdb.createOrUpdateBanner('meeting', meeting.rows[0].id, 'aws', data.key, data.location);
        }

        if (location) {
            updatedLocation = await locationdb.findThenUpdateOrCreateLocation('meeting', meeting.rows[0].id, location, lat, lng);
        }

        const responseObject = {
            success: true,
            meeting: result.rows[0]
        };

        if (updatedLocation?.rows[0]) {
            responseObject.meeting.location = updatedLocation.rows[0].address;
        }

        if (updatedBanner?.rows[0]) {
            responseObject.meeting.banner = updatedBanner.rows[0].banner;
        }

        res.status(200).json(responseObject);
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
    getAllGroupMeetings,
    updateMeeting
};