// src/help/controllers/helpSearch.controller.js - Enhanced version
const HelpSearchModel = require("../models/helpSearch.model");
const HelpImageModel = require("../models/image.model");
const ApiError = require("../../utils/ApiError");

class HelpSearchController {
    async searchHelpEntries(req, res, next) {
        try {
            const { query } = req.query;

            if (!query || query.trim().length < 2) {
                return next(
                    new ApiError(
                        "Search query must be at least 2 characters",
                        400
                    )
                );
            }

            // Determine access level based on user role
            let accessLevel = "public";
            if (req.user) {
                if (["superuser", "staff"].includes(req.user.role)) {
                    accessLevel = null; // No restriction for staff/superuser
                } else {
                    accessLevel = "registered"; // Regular logged-in users
                }
            }

            const results = await HelpSearchModel.searchHelpEntries(
                query,
                accessLevel
            );

            // Process results to include images and format the response
            const enhancedResults = await Promise.all(
                results.map(async (entry) => {
                    // Get cover image if available
                    const images = await HelpImageModel.getImagesByHelpEntryId(
                        entry.id
                    );
                    const coverImage = images.find(
                        (img) => img.image_type === "cover"
                    );

                    // Prepare content preview (first 150 chars)
                    const contentPreview = entry.content
                        ? entry.content.substring(0, 150) +
                          (entry.content.length > 150 ? "..." : "")
                        : "";

                    // Determine which fields matched the search query
                    // Note: This is a simple approach, for more precise highlighting
                    // you would want to use PostgreSQL's ts_headline function
                    const searchTerms = query.trim().toLowerCase().split(/\s+/);

                    const matchedFields = {
                        title: searchTerms.some((term) =>
                            entry.title?.toLowerCase().includes(term)
                        ),
                        content: searchTerms.some((term) =>
                            entry.content?.toLowerCase().includes(term)
                        ),
                        topic_name: searchTerms.some((term) =>
                            entry.topic_name?.toLowerCase().includes(term)
                        ),
                        topic_description: searchTerms.some((term) =>
                            entry.topic_description
                                ?.toLowerCase()
                                .includes(term)
                        ),
                    };

                    return {
                        id: entry.id,
                        unique_url: entry.unique_url,
                        title: entry.title,
                        content_preview: contentPreview,
                        category: {
                            id: entry.help_topic_id,
                            name: entry.topic_name,
                            unique_url: entry.topic_url,
                            description: entry.topic_description,
                        },
                        cover_image: coverImage || null,
                        is_active: entry.is_active,
                        access_level: entry.access_level,
                        position: entry.position,
                        view_count: entry.view_count,
                        relevance_score: parseFloat(entry.rank).toFixed(2),
                        matched_fields: matchedFields,
                        created_at: entry.created_at,
                        updated_at: entry.updated_at,
                    };
                })
            );

            res.json({
                status: "success",
                data: {
                    results: enhancedResults,
                    count: enhancedResults.length,
                    query,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getPopularEntries(req, res, next) {
        try {
            const { limit = 5 } = req.query;

            // Determine access level based on user role
            let accessLevel = "public";
            if (req.user) {
                if (["superuser", "staff"].includes(req.user.role)) {
                    accessLevel = null; // No restriction for staff/superuser
                } else {
                    accessLevel = "registered"; // Regular logged-in users
                }
            }

            const entries = await HelpSearchModel.getPopularHelpEntries(
                parseInt(limit, 10),
                accessLevel
            );

            // Process entries to include images and format the response
            const enhancedEntries = await Promise.all(
                entries.map(async (entry) => {
                    // Get cover image if available
                    const images = await HelpImageModel.getImagesByHelpEntryId(
                        entry.id
                    );
                    const coverImage = images.find(
                        (img) => img.image_type === "cover"
                    );

                    // Prepare content preview (first 150 chars)
                    const contentPreview = entry.content
                        ? entry.content.substring(0, 150) +
                          (entry.content.length > 150 ? "..." : "")
                        : "";

                    return {
                        id: entry.id,
                        unique_url: entry.unique_url,
                        title: entry.title,
                        content_preview: contentPreview,
                        category: {
                            id: entry.help_topic_id,
                            name: entry.topic_name,
                            unique_url: entry.topic_url,
                            description: entry.topic_description,
                        },
                        cover_image: coverImage || null,
                        is_active: entry.is_active,
                        access_level: entry.access_level,
                        position: entry.position,
                        view_count: entry.view_count,
                        created_at: entry.created_at,
                        updated_at: entry.updated_at,
                    };
                })
            );

            res.json({
                status: "success",
                data: { entries: enhancedEntries },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new HelpSearchController();
