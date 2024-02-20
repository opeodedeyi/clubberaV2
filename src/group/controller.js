const pool = require('../../db');
const queries = require('./queries');
const locationdb = require('../utils/location');
const bannerdb = require('../utils/banner');
const topicdb = require('../utils/topic');
const { uploadToS3, deleteFromS3 } = require('../services/s3service');


const getAllGroups = async (req, res) => {
    try {
        const result = await pool.query(queries.getAllGroups);
        res.status(200).json({
            success: true,
            groups: result.rows
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const createGroup = async (req, res) => {
    const { user } = req;
    const { title, description, city, latitude, longitude, is_private, topics, banner } = req.body;
    const unique_url = title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();
    // add topics to group_topics table

    try {
        const result = await pool.query(queries.createGroup, [unique_url, user.rows[0].id, title, description, is_private]);
        let bannerData = null;
        let createdLocation = null

        createdLocation = await locationdb.createLocation('group', result.rows[0].id, city, null, latitude, longitude);

        if (banner) {
            const data = await uploadToS3(banner, `${unique_url}-banner.jpg`);
            bannerData = await bannerdb.createBanner('group', result.rows[0].id, 'aws', data.key, data.location);
        }

        const responseObject = {
            success: true,
            group: result.rows[0]
        };

        if (createdLocation?.rows[0]) {
            responseObject.group.location = createdLocation.rows[0];
        }

        if (bannerData?.rows[0]) {
            responseObject.group.banner = bannerData.rows[0];
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

const getGroupByUniqueURL = async (req, res) => {
    // if user exists, check if user is a member of the group
    const { uniqueURL } = req.params;

    try {
        const result = await pool.query(queries.getGroupByUniqueURL, [uniqueURL]);
        res.status(200).json({
            success: true,
            group: result.rows[0]
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const updateGroup = async (req, res) => {
    const { uniqueURL } = req.params;
    const { title, tagline, description, city, latitude, longitude, is_private, topics, banner } = req.body;

    try {
        const group = await pool.query(queries.getGroupByUniqueURL, [uniqueURL]);

        if (!group.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        if (group.rows[0].owner_id !== req.user.rows[0].id) {
            return res.status(401).json({ 
                success: false,
                message: 'You are not authorized to update this group' 
            });
        }

        let bannerData = null;
        let updatedLocation = null;

        const result = await pool.query(queries.updateGroup, [uniqueURL, title, tagline, description, is_private]);
        if (city && latitude && longitude) {
            updatedLocation = await locationdb.updateLocationById(group.rows[0].location_id, city, null, latitude, longitude);
        }
        if (banner) {
            await deleteFromS3(group.rows[0].banner_key);
            const data = await uploadToS3(banner, `${uniqueURL}-banner.jpg`);
            bannerData = await bannerdb.createOrUpdateBanner('group', group.rows[0].id, 'aws', data.key, data.location);
        }

        const responseObject = {
            success: true,
            group: result.rows[0]
        };

        if (updatedLocation?.rows[0]) {
            responseObject.group.location = updatedLocation.rows[0];
        }

        if (bannerData?.rows[0]) {
            responseObject.group.banner = bannerData.rows[0];
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

const joinGroup = async (req, res) => {
    const { uniqueURL } = req.params;
    const { user } = req;

    try {
        const group = await pool.query(queries.getGroupByUniqueURL, [uniqueURL]);
        if (!group.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // check if user is already a member of the group

        if (group.rows[0].is_private) {
            const result = await pool.query(queries.sendGroupRequest, [group.rows[0].id, user.rows[0].id]);
            return res.status(201).json({
                success: true,
                requestDetails: result.rows[0],
                membershipStatus: 'pending'
            });
        }

        const result = await pool.query(queries.joinGroup, [group.rows[0].id, user.rows[0].id]);
        return res.status(201).json({
            success: true,
            memberDetails: result.rows[0],
            membershipStatus: 'member'
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const leaveGroup = async (req, res) => {
    const { uniqueURL } = req.params;
    const { user } = req;

    try {
        const group = await pool.query(queries.getGroupByUniqueURL, [uniqueURL]);
        if (!group.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        const result = await pool.query(queries.leaveGroup, [group.rows[0].id, user.rows[0].id]);
        return res.status(200).json({
            success: true,
            group: result.rows[0]
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const getAllMembers = async (req, res) => {
    const { uniqueURL } = req.params;

    try {
        const group = await pool.query(queries.getGroupByUniqueURL, [uniqueURL]);
        if (!group.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        const result = await pool.query(queries.getAllMembers, [group.rows[0].id]);
        return res.status(200).json({
            success: true,
            members: result.rows
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const getAllRequests = async (req, res) => {
    const { uniqueURL } = req.params;

    try {
        const group = await pool.query(queries.getGroupByUniqueURL, [uniqueURL]);
        if (!group.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        const result = await pool.query(queries.getAllRequests, [group.rows[0].id]);
        return res.status(200).json({
            success: true,
            requests: result.rows
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
    getAllGroups,
    createGroup,
    getGroupByUniqueURL,
    updateGroup,
    joinGroup,
    leaveGroup,
    getAllMembers,
    getAllRequests
};