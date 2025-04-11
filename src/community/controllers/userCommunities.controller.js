const userCommunitiesModel = require("../models/userCommunities.model");
const ApiError = require("../../utils/ApiError");

class UserCommunitiesController {
    async getUserCommunities(req, res, next) {
        try {
            const userIdentifier = req.params.userIdentifier;

            // First check if user exists
            const userExists = await userCommunitiesModel.checkUserExists(
                userIdentifier
            );
            if (!userExists) {
                return next(new ApiError("User not found", 404));
            }

            // Parse query parameters
            const options = {
                limit: req.query.limit ? parseInt(req.query.limit) : 20,
                offset: req.query.offset ? parseInt(req.query.offset) : 0,
                sortBy: ["role", "joined"].includes(req.query.sort)
                    ? req.query.sort
                    : "role",
                search: req.query.search ?? null,
            };

            // Get communities
            const [communities, total] = await Promise.all([
                userCommunitiesModel.getUserCommunities(
                    userIdentifier,
                    options
                ),
                userCommunitiesModel.countUserCommunities(userIdentifier, {
                    search: options.search,
                }),
            ]);

            // Format response
            const formattedCommunities = communities.map((community) => ({
                id: community.id,
                name: community.name,
                uniqueUrl: community.unique_url,
                tagline: community.tagline,
                memberCount: community.memberCount,
                isAdmin: community.isAdmin,
                role: community.role,
                joinedAt: community.joined_at,
                profileImage: community.profileImage,
                coverImage: community.coverImage,
            }));

            res.json({
                status: "success",
                data: formattedCommunities,
                pagination: {
                    total,
                    limit: options.limit,
                    offset: options.offset,
                    hasMore: total > options.offset + options.limit,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserCommunitiesController();
