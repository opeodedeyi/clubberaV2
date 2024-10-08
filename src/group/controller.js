const pool = require('../../db');
const queries = require('./queries');
const { getTimeDifference } = require('../utils/timeUtils');
const grouprequestqueries = require('../grouprequest/queries');
const locationdb = require('../utils/location');
const bannerdb = require('../utils/banner');
const topicdb = require('../utils/topic');
const { uploadToS3, deleteFromS3 } = require('../services/s3service');


const getAllGroups = async (req, res) => {
    const { user } = req;
    console.log('user - ', user);

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
    const { title, description, city, lat, lng, is_private, topics, banner } = req.body;
    const unique_url = title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();

    try {
        const result = await pool.query(queries.createGroup, [unique_url, user.rows[0].id, title, description, is_private]);
        let bannerData = null;
        let createdLocation = null;
        let createdTopics = null;

        createdLocation = await locationdb.createLocation('group', result.rows[0].id, city, lat, lng);

        if (banner) {
            const data = await uploadToS3(banner, `${unique_url}-banner.jpg`);
            bannerData = await bannerdb.createBanner('group', result.rows[0].id, 'aws', data.key, data.location);
        }

        if (topics) {
            createdTopics = await topicdb.addTopics('group', result.rows[0].id, topics);
        }

        const responseObject = {
            success: true,
            group: result.rows[0]
        };

        if (createdLocation?.rows[0]) {
            responseObject.group.location = createdLocation.rows[0].address;
        }

        if (bannerData?.rows[0]) {
            responseObject.group.banner = bannerData.rows[0].banner;
        }

        if (createdTopics?.rows) {
            responseObject.group.topics = createdTopics.rows.map(topicRow => topicRow.name);;
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
    const { user } = req;
    let isMember = 'not-member'; // not-member, member, pending, owner

    try {
        const group = req.group;

        if (user) {
            if (user.id === group.rows[0].owner_id) {
                isMember = 'owner';
            } else {
                const memberCheck = await pool.query(
                    queries.checkGroupMembership, 
                    [group.rows[0].id, user.id]
                );
    
                if (memberCheck.rowCount > 0) {
                    isMember = 'member';
                } else {
                    const requestCheck = await pool.query(
                        grouprequestqueries.checkGroupRequest, 
                        [group.rows[0].id, user.id]
                    );
                    if (requestCheck.rowCount > 0) {
                        isMember = 'pending';
                    }
                }
            }
        }

        // Ensure members_avatar is always an array, even if null is returned from the database
        group.rows[0].members_avatar = group.rows[0].members_avatar || [];

        group.rows[0].isMember = isMember;
        res.status(200).json({
            success: true,
            group: group.rows[0]
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const getGroupEditByUniqueURL = async (req, res) => {
    try {
        const group = req.group;
        const topics = await topicdb.getTopics('group', group.rows[0].id);

        const responseObject = {
            success: true,
            group: group.rows[0]
        };

        if (topics?.rows) {
            responseObject.group.topics = topics.rows.map(topicRow => topicRow.name);
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

const updateGroup = async (req, res) => {
    const { groupUniqueURL } = req.params;
    const { title, tagline, description, city, lat, lng, is_private, topics, banner } = req.body;

    try {
        const group = req.group;

        let bannerData = null;
        let updatedLocation = null;
        let updatedTopics = null;

        const result = await pool.query(queries.updateGroup, [groupUniqueURL, title, tagline, description, is_private]);

        console.log({city, lat, lng});
        if (city && lat && lng) {
            console.log(group.rows[0].id);
            updatedLocation = await locationdb.findThenUpdateOrCreateLocation('group', group.rows[0].id, city, lat, lng);
        }
        if (banner) {
            await deleteFromS3(group.rows[0].banner_key);
            const data = await uploadToS3(banner, `${groupUniqueURL}-banner.jpg`);
            bannerData = await bannerdb.createOrUpdateBanner('group', group.rows[0].id, 'aws', data.key, data.location);
        }
        if (topics) {
            updatedTopics = await topicdb.updateTopics('group', group.rows[0].id, topics);
        }

        const responseObject = {
            success: true,
            group: result.rows[0]
        };

        if (updatedLocation?.rows[0]) {
            responseObject.group.location = updatedLocation.rows[0].address;
        }

        if (bannerData?.rows[0]) {
            responseObject.group.banner = bannerData.rows[0].banner;
        }

        if (updatedTopics?.rows) {
            responseObject.group.topics = updatedTopics.rows.map(topicRow => topicRow.name);
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
    const { user } = req;

    try {
        const group = req.group;

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
    const { user } = req;

    try {
        const group = req.group;

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
    try {
        const group = req.group;
        const { page = 1, limit = 10 } = req.query; // Default to page 1 with 10 items per page

        const offset = (page - 1) * limit;

        const membersResult = await pool.query(queries.getAllMembers, [group.rows[0].id, limit, offset]);
        const countResult = await pool.query(queries.getAllMembersCount, [group.rows[0].id]);

        const totalMembers = parseInt(countResult.rows[0].count);
        
        const members = membersResult.rows.map(row => ({
            id: row.id,
            full_name: row.full_name,
            unique_url: row.unique_url,
            member_since: row.date_joined,
            avatar: row.avatar || null,
            location: row.address || null
        }));

        return res.status(200).json({
            success: true,
            members: members,
            pagination: {
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit),
                totalItems: totalMembers,
                totalPages: Math.ceil(totalMembers / limit)
            }
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
    try {
        const group = req.group;
        const { page = 1, limit = 10 } = req.query; // Default to page 1 with 10 items per page

        const offset = (page - 1) * limit;

        const requestsResult = await pool.query(queries.getAllRequests, [group.rows[0].id, limit, offset]);
        const countResult = await pool.query(queries.getAllRequestsCount, [group.rows[0].id]);

        const totalRequests = parseInt(countResult.rows[0].count);
        
        const processedRequests = requestsResult.rows.map(row => ({
            id: row.request_id,
            fullName: row.full_name,
            email: row.email,
            uniqueUrl: row.user_unique_url,
            avatar: row.avatar || null,
            location: row.user_location || null,
            requestedAt: getTimeDifference(new Date(row.created_at))
        }));

        return res.status(200).json({
            success: true,
            requests: processedRequests,
            pagination: {
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit),
                totalItems: totalRequests,
                totalPages: Math.ceil(totalRequests / limit)
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const getMeetingsForGroup = async (req, res) => {
    const { group } = req;
    const userId = req.user ? req.user.id : null;
    const { upcoming, page = 1, limit = 10 } = req.query;

    try {
        const upcomingFilter = upcoming === 'true' ? true : (upcoming === 'false' ? false : null);
        const offset = (page - 1) * limit;
        
        // Get total count of meetings
        const countResult = await pool.query(
            queries.getMeetingsForGroupCount, 
            [group.rows[0].id, upcomingFilter]
        );
        const totalMeetings = parseInt(countResult.rows[0].count);

        // Get paginated meetings
        const meetings = await pool.query(
            queries.getMeetingsForGroup, 
            [group.rows[0].id, userId, upcomingFilter, limit, offset]
        );

        res.status(200).json({
            success: true,
            meetings: meetings.rows,
            pagination: {
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit),
                totalItems: totalMeetings,
                totalPages: Math.ceil(totalMeetings / limit)
            }
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
    getGroupEditByUniqueURL,
    updateGroup,
    joinGroup,
    leaveGroup,
    getAllMembers,
    getAllRequests,
    getMeetingsForGroup
};