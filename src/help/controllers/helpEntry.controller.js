// src/help/controllers/helpEntry.controller.js - Fixed version
const HelpEntryModel = require("../models/helpEntry.model");
const HelpTopicModel = require("../models/helpTopic.model");
const HelpRelatedModel = require("../models/helpRelated.model");
const HelpImageModel = require("../models/image.model");
const HelpFeedbackModel = require("../models/helpFeedback.model");
const ApiError = require("../../utils/ApiError");

class HelpEntryController {
    async createEntry(req, res, next) {
        try {
            const {
                help_topic_id,
                title,
                unique_url,
                content,
                access_level = "public",
                position = 0,
                is_active = true,
                related_entries = [],
                cover_image = null, // Add this parameter
            } = req.body;

            // Check if topic exists
            const topic = await HelpTopicModel.getTopicById(help_topic_id);
            if (!topic) {
                return next(
                    new ApiError(
                        `Topic with ID ${help_topic_id} not found`,
                        404
                    )
                );
            }

            // Check if entry with unique_url already exists
            const exists = await HelpEntryModel.entryExists(unique_url);
            if (exists) {
                return next(
                    new ApiError(
                        `Entry with URL '${unique_url}' already exists`,
                        400
                    )
                );
            }

            // Create the help entry
            const entry = await HelpEntryModel.createEntry({
                help_topic_id,
                title,
                unique_url,
                content,
                access_level,
                position,
                is_active,
            });

            // Add related entries if provided
            if (related_entries.length > 0) {
                await HelpRelatedModel.updateRelatedEntries(
                    entry.id,
                    related_entries
                );
            }

            // Add cover image if provided
            if (cover_image) {
                await HelpImageModel.saveImage({
                    entity_id: entry.id,
                    image_type: "cover",
                    position: 0,
                    provider: cover_image.provider || "s3",
                    key: cover_image.key,
                    alt_text: cover_image.alt_text || title,
                });
            }

            // Get the entry with its newly associated cover image
            const completeEntry = await HelpEntryModel.getEntryById(entry.id);
            const images = await HelpImageModel.getImagesByHelpEntryId(
                entry.id
            );

            res.status(201).json({
                status: "success",
                data: {
                    entry: {
                        ...completeEntry,
                        cover_image:
                            images.find((img) => img.image_type === "cover") ||
                            null,
                        images: images,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async updateEntry(req, res, next) {
        try {
            const { id } = req.params;
            const {
                help_topic_id,
                title,
                unique_url,
                content,
                access_level,
                position,
                is_active,
                related_entries = [],
                cover_image = null, // Add this parameter
            } = req.body;

            // Check if entry exists
            const entry = await HelpEntryModel.getEntryById(id);
            if (!entry) {
                return next(new ApiError(`Entry with ID ${id} not found`, 404));
            }

            // If topic ID changed, check if new topic exists
            if (help_topic_id && help_topic_id !== entry.help_topic_id) {
                const topic = await HelpTopicModel.getTopicById(help_topic_id);
                if (!topic) {
                    return next(
                        new ApiError(
                            `Topic with ID ${help_topic_id} not found`,
                            404
                        )
                    );
                }
            }

            // If URL changed, check if new URL already exists
            if (unique_url && unique_url !== entry.unique_url) {
                const exists = await HelpEntryModel.entryExists(unique_url);
                if (exists) {
                    return next(
                        new ApiError(
                            `Entry with URL '${unique_url}' already exists`,
                            400
                        )
                    );
                }
            }

            // Update the help entry
            const updatedEntry = await HelpEntryModel.updateEntry(id, {
                help_topic_id: help_topic_id || entry.help_topic_id,
                title: title || entry.title,
                unique_url: unique_url || entry.unique_url,
                content: content || entry.content,
                access_level: access_level || entry.access_level,
                position: position !== undefined ? position : entry.position,
                is_active:
                    is_active !== undefined ? is_active : entry.is_active,
            });

            // Update related entries if provided
            if (related_entries) {
                await HelpRelatedModel.updateRelatedEntries(
                    id,
                    related_entries
                );
            }

            // Update cover image if provided
            if (cover_image) {
                if (cover_image.key) {
                    // If key is provided, update or create the cover image
                    await HelpImageModel.saveImage({
                        entity_id: id,
                        image_type: "cover",
                        position: 0,
                        provider: cover_image.provider || "s3",
                        key: cover_image.key,
                        alt_text: cover_image.alt_text || updatedEntry.title,
                    });
                } else if (cover_image.remove === true) {
                    // If remove flag is true, delete the cover image
                    await HelpImageModel.deleteImageByTypeAndEntryId(
                        id,
                        "cover"
                    );
                }
            }

            // Get the updated entry with its cover image
            const completeEntry = await HelpEntryModel.getEntryById(id);
            const images = await HelpImageModel.getImagesByHelpEntryId(id);

            res.json({
                status: "success",
                data: {
                    entry: {
                        ...completeEntry,
                        cover_image:
                            images.find((img) => img.image_type === "cover") ||
                            null,
                        images: images,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteEntry(req, res, next) {
        try {
            const { id } = req.params;

            // Check if entry exists
            const entry = await HelpEntryModel.getEntryById(id);
            if (!entry) {
                return next(new ApiError(`Entry with ID ${id} not found`, 404));
            }

            await HelpEntryModel.deleteEntry(id);

            res.json({
                status: "success",
                message: "Entry deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }

    async getEntryById(req, res, next) {
        try {
            const { id } = req.params;

            const entry = await HelpEntryModel.getEntryById(id);
            if (!entry) {
                return next(new ApiError(`Entry with ID ${id} not found`, 404));
            }

            // Check access permissions
            if (entry.access_level !== "public") {
                if (!req.user) {
                    return next(
                        new ApiError(
                            "Authentication required to access this content",
                            401
                        )
                    );
                }

                if (
                    entry.access_level === "staff" &&
                    !["staff", "superuser"].includes(req.user.role)
                ) {
                    return next(
                        new ApiError(
                            "Staff access required for this content",
                            403
                        )
                    );
                }
            }

            // Increment view count
            await HelpEntryModel.incrementViewCount(id);

            // Determine access level for related entries
            let accessLevel = "public";
            if (req.user) {
                if (["superuser", "staff"].includes(req.user.role)) {
                    accessLevel = null; // No restriction for staff/superuser
                } else {
                    accessLevel = "registered"; // Regular logged-in users
                }
            }

            // Get related entries, images, and feedback stats
            const [relatedEntries, images, feedbackStats] = await Promise.all([
                HelpRelatedModel.getRelatedEntries(id, accessLevel),
                HelpImageModel.getImagesByHelpEntryId(id),
                ["staff", "superuser"].includes(req.user?.role)
                    ? HelpFeedbackModel.getFeedbackStats(id)
                    : null,
            ]);

            // Format the response
            const category = {
                id: entry.help_topic_id,
                name: entry.topic_name,
                unique_url: entry.topic_url,
            };

            // Find cover image if available
            const coverImage = images.find((img) => img.image_type === "cover");

            const response = {
                id: entry.id,
                unique_url: entry.unique_url,
                title: entry.title,
                content: entry.content,
                category,
                cover_image: coverImage || null,
                images: images,
                is_active: entry.is_active,
                access_level: entry.access_level,
                position: entry.position,
                view_count: entry.view_count,
                created_at: entry.created_at,
                updated_at: entry.updated_at,
                related_entries: relatedEntries,
            };

            // Add feedback stats if user is staff/superuser
            if (feedbackStats) {
                response.feedback_stats = feedbackStats;
            }

            res.json({
                status: "success",
                data: { entry: response },
            });
        } catch (error) {
            next(error);
        }
    }

    async getEntryByUrl(req, res, next) {
        try {
            const { url } = req.params;

            const entry = await HelpEntryModel.getEntryByUrl(url);
            if (!entry) {
                return next(
                    new ApiError(`Entry with URL '${url}' not found`, 404)
                );
            }

            // Check access permissions
            if (entry.access_level !== "public") {
                if (!req.user) {
                    return next(
                        new ApiError(
                            "Authentication required to access this content",
                            401
                        )
                    );
                }

                if (
                    entry.access_level === "staff" &&
                    !["staff", "superuser"].includes(req.user.role)
                ) {
                    return next(
                        new ApiError(
                            "Staff access required for this content",
                            403
                        )
                    );
                }
            }

            // Increment view count
            await HelpEntryModel.incrementViewCount(entry.id);

            // Determine access level for related entries
            let accessLevel = "public";
            if (req.user) {
                if (["superuser", "staff"].includes(req.user.role)) {
                    accessLevel = null; // No restriction for staff/superuser
                } else {
                    accessLevel = "registered"; // Regular logged-in users
                }
            }

            // Get related entries, images, and feedback stats
            const [relatedEntries, images, feedbackStats] = await Promise.all([
                HelpRelatedModel.getRelatedEntries(entry.id, accessLevel),
                HelpImageModel.getImagesByHelpEntryId(entry.id),
                ["staff", "superuser"].includes(req.user?.role)
                    ? HelpFeedbackModel.getFeedbackStats(entry.id)
                    : null,
            ]);

            // Format the response
            const category = {
                id: entry.help_topic_id,
                name: entry.topic_name,
                unique_url: entry.topic_url,
            };

            // Find cover image if available
            const coverImage = images.find((img) => img.image_type === "cover");

            const response = {
                id: entry.id,
                unique_url: entry.unique_url,
                title: entry.title,
                content: entry.content,
                category,
                cover_image: coverImage || null,
                images: images,
                is_active: entry.is_active,
                access_level: entry.access_level,
                position: entry.position,
                view_count: entry.view_count,
                created_at: entry.created_at,
                updated_at: entry.updated_at,
                related_entries: relatedEntries,
            };

            // Add feedback stats if user is staff/superuser
            if (feedbackStats) {
                response.feedback_stats = feedbackStats;
            }

            res.json({
                status: "success",
                data: { entry: response },
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllEntries(req, res, next) {
        try {
            const { topic_id, is_active = true } = req.query;

            // Determine access level based on user role
            let accessLevel = "public";
            if (req.user) {
                if (["superuser", "staff"].includes(req.user.role)) {
                    accessLevel = null; // No restriction for staff/superuser
                } else {
                    accessLevel = "registered"; // Regular logged-in users
                }
            }

            const entries = await HelpEntryModel.getAllEntries({
                topicId: topic_id,
                accessLevel,
                isActive: is_active === "true",
            });

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

module.exports = new HelpEntryController();
