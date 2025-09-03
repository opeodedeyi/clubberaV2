const recommendationsModel = require("../models/recommendations.model");
const ApiError = require("../../utils/ApiError");

class RecommendationsController {
    async getRecommendations(req, res, next) {
        try {
            const userId = req.user?.id; // Optional - might be null for non-authenticated users
            const limit = req.query.limit ? parseInt(req.query.limit) : 6;
            
            // Validate limit
            if (limit < 1 || limit > 20) {
                return next(new ApiError("Limit must be between 1 and 20", 400));
            }

            let recommendationsResult;

            if (userId) {
                // Personalized recommendations for authenticated users
                recommendationsResult = await recommendationsModel.getRecommendations(userId, limit);
            } else {
                // Popular communities for non-authenticated users
                recommendationsResult = await recommendationsModel.getPopularCommunities(limit);
            }

            // Format the response
            const formattedRecommendations = recommendationsResult.communities.map((community) => ({
                id: community.id,
                name: community.name,
                uniqueUrl: community.unique_url,
                tagline: community.tagline,
                description: community.description,
                isPrivate: community.is_private,
                memberCount: community.member_count || 0,
                profileImage: community.profile_image,
                coverImage: community.cover_image,
                tags: community.tags || [],
                location: community.location,
                createdAt: community.created_at,
                recommendationReason: community.recommendation_reason || (userId ? "Recommended for you" : "Popular community"),
                relevanceScore: community.relevance_score || 0
            }));

            // Generate informative message based on results
            let message = generateResultMessage(
                formattedRecommendations.length, 
                limit, 
                recommendationsResult.strategiesUsed || [],
                recommendationsResult.strategiesFailed || [],
                !!userId
            );

            res.json({
                status: "success",
                data: formattedRecommendations,
                meta: {
                    total: formattedRecommendations.length,
                    requested: limit,
                    userId: userId || null,
                    isAuthenticated: !!userId,
                    message: message,
                    strategiesUsed: recommendationsResult.strategiesUsed || [],
                    generatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            next(error);
        }
    }

}

function generateResultMessage(resultCount, requestedCount, strategiesUsed, strategiesFailed, isAuthenticated) {
        if (resultCount === 0) {
            if (isAuthenticated) {
                if (strategiesFailed.includes('all_communities_joined')) {
                    return "You're already a member of all available communities! 🎉";
                } else if (strategiesFailed.includes('strategies_failed')) {
                    return "No recommendations found with current criteria. Communities exist but don't match your profile yet.";
                }
                return "No communities found. Try updating your interests in your profile to get better recommendations.";
            } else {
                return "No communities available at the moment. Please try again later.";
            }
        }

        if (resultCount < requestedCount) {
            if (isAuthenticated) {
                if (strategiesFailed.includes('limited_communities')) {
                    return `Found ${resultCount} communities. You're already a member of most others!`;
                }
                return `Found ${resultCount} communities. Add more interests to your profile for additional recommendations.`;
            } else {
                return `Found ${resultCount} popular communities. Sign up for personalized recommendations!`;
            }
        }

        // Full results
        if (isAuthenticated) {
            if (strategiesUsed.includes('interest')) {
                return "Recommendations based on your interests and activity";
            }
            return "Personalized recommendations for you";
        } else {
            return "Popular communities to explore. Sign up for personalized recommendations!";
        }
    }

module.exports = new RecommendationsController();
module.exports.generateResultMessage = generateResultMessage;