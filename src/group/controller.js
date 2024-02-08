const pool = require('../../db');
const queries = require('./queries');


const createGroup = async (req, res) => {
    const { user } = req;
    const { title, description, banner_provider, banner_key, banner_location, city, latitude, longitude, is_private, topics, banner } = req.body;
    const unique_url = title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();
    // upload image to s3
    // add topics to group_topics table

    try {
        const result = await pool.query(queries.createGroup, [unique_url, user.rows[0].id, title, description, banner_provider, banner_key, banner_location, city, latitude, longitude, is_private]);
        res.status(201).json({
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
    const { title, tagline, description, banner_provider, banner_key, banner_location, city, latitude, longitude, is_private, topics } = req.body;
    const group = await pool.query(queries.getGroupByUniqueURL, [uniqueURL])

    if (group.rows[0].owner_id !== req.user.rows[0].id) {
        return res.status(401).json({ 
            success: false,
            message: 'You are not authorized to update this group' 
        });
    }

    try {
        const result = await pool.query(queries.updateGroup, [uniqueURL, title, tagline, description, banner_provider, banner_key, banner_location, city, latitude, longitude, is_private]);
        // upload image to s3
        // add topics to group_topics table
        res.status(200).json({
            success: true,
            group: result.rows[0]});
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
    createGroup,
    getGroupByUniqueURL,
    updateGroup,
    joinGroup,
    leaveGroup,
    getAllMembers,
    getAllRequests,
};