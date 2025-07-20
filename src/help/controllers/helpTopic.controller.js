// src/help/controllers/helpTopic.controller.js - Fixed version
const HelpTopicModel = require("../models/helpTopic.model");
const HelpEntryModel = require("../models/helpEntry.model");
const HelpImageModel = require("../models/image.model");
const ApiError = require("../../utils/ApiError");

class HelpTopicController {
    async createTopic(req, res, next) {
        try {
            const { name, description, unique_url, position } = req.body;

            // Check if topic with unique_url already exists
            const exists = await HelpTopicModel.topicExists(unique_url);
            if (exists) {
                return next(
                    new ApiError(
                        `Topic with URL '${unique_url}' already exists`,
                        400
                    )
                );
            }

            const topic = await HelpTopicModel.createTopic({
                name,
                description,
                unique_url,
                position,
            });

            res.status(201).json({
                status: "success",
                data: { topic },
            });
        } catch (error) {
            next(error);
        }
    }

    async updateTopic(req, res, next) {
        try {
            const { id } = req.params;
            const { name, description, unique_url, position } = req.body;

            // Check if topic exists
            const topic = await HelpTopicModel.getTopicById(id);
            if (!topic) {
                return next(new ApiError(`Topic with ID ${id} not found`, 404));
            }

            // If URL changed, check if new URL already exists
            if (unique_url !== topic.unique_url) {
                const exists = await HelpTopicModel.topicExists(unique_url);
                if (exists) {
                    return next(
                        new ApiError(
                            `Topic with URL '${unique_url}' already exists`,
                            400
                        )
                    );
                }
            }

            const updatedTopic = await HelpTopicModel.updateTopic(id, {
                name,
                description,
                unique_url,
                position,
            });

            res.json({
                status: "success",
                data: { topic: updatedTopic },
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteTopic(req, res, next) {
        try {
            const { id } = req.params;

            // Check if topic exists
            const topic = await HelpTopicModel.getTopicById(id);
            if (!topic) {
                return next(new ApiError(`Topic with ID ${id} not found`, 404));
            }

            // Check if topic has entries
            const entries = await HelpEntryModel.getAllEntries({ topicId: id });
            if (entries.length > 0) {
                return next(
                    new ApiError(
                        "Cannot delete topic with existing entries. Please delete or move the entries first.",
                        400
                    )
                );
            }

            await HelpTopicModel.deleteTopic(id);

            res.json({
                status: "success",
                message: "Topic deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }

    async getTopicById(req, res, next) {
        try {
            const { id } = req.params;

            const topic = await HelpTopicModel.getTopicById(id);
            if (!topic) {
                return next(new ApiError(`Topic with ID ${id} not found`, 404));
            }

            res.json({
                status: "success",
                data: { topic },
            });
        } catch (error) {
            next(error);
        }
    }

    async getTopicByUrl(req, res, next) {
        try {
            const { url } = req.params;

            const topic = await HelpTopicModel.getTopicByUrl(url);
            if (!topic) {
                return next(
                    new ApiError(`Topic with URL '${url}' not found`, 404)
                );
            }

            // Get entries for this topic
            let accessLevel = "public";
            if (req.user) {
                if (["superuser", "staff"].includes(req.user.role)) {
                    accessLevel = null; // No restriction for staff/superuser
                } else {
                    accessLevel = "registered"; // Regular logged-in users
                }
            }

            const entries = await HelpEntryModel.getEntriesByTopicUrl(
                url,
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
                data: {
                    topic,
                    entries: enhancedEntries,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllTopics(req, res, next) {
        try {
            const topics = await HelpTopicModel.getAllTopics();

            // Get entry count for each topic
            const enhancedTopics = await Promise.all(
                topics.map(async (topic) => {
                    const entries = await HelpEntryModel.getEntriesByTopicUrl(
                        topic.unique_url
                    );

                    return {
                        ...topic,
                        entry_count: entries.length,
                    };
                })
            );

            res.json({
                status: "success",
                data: { topics: enhancedTopics },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new HelpTopicController();
