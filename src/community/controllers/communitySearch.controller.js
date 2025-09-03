// src/community/controllers/communitySearch.controller.js
const communitySearchModel = require("../models/communitySearch.model");
const ApiError = require("../../utils/ApiError");
const { validationResult } = require("express-validator");

class CommunitySearchController {
    async searchCommunities(req, res, next) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(new ApiError(errors.array()[0].msg, 400));
            }

            const { query, limit = 20, offset = 0 } = req.query;

            // Include private communities if user is authenticated
            const includePrivate = !!req.user;

            // Check if proximity parameters are provided
            const { lat, lng, radius } = req.query;
            
            let searchResults;
            
            if (lat && lng) {
                // Use proximity search
                searchResults = await communitySearchModel.searchWithProximity({
                    query,
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                    radius: radius ? parseFloat(radius) : 25,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    includePrivate,
                });
            } else {
                // Use regular text search
                searchResults = await communitySearchModel.searchCommunities({
                    query,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    includePrivate,
                });
            }

            const { communities, total } = searchResults;

            // Format the response
            const formattedCommunities = communities.map((community) => ({
                id: community.id,
                name: community.name,
                uniqueUrl: community.unique_url,
                tagline: community.tagline || null,
                isPrivate: community.is_private,
                profileImage: community.profile_image,
                coverImage: community.cover_image,
                memberCount: community.member_count,
                tags: community.tags,
                location: community.location,
                createdAt: community.created_at,
            }));

            res.json({
                status: "success",
                data: formattedCommunities,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + parseInt(limit),
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CommunitySearchController();
