// src/help/controllers/helpFeedback.controller.js
const HelpFeedbackModel = require("../models/helpFeedback.model");
const HelpEntryModel = require("../models/helpEntry.model");
const ApiError = require("../../utils/ApiError");

class HelpFeedbackController {
    async addFeedback(req, res, next) {
        try {
            const { help_entry_id, is_helpful, comment } = req.body;
            const ip_address = req.ip || req.connection.remoteAddress;

            // Check if entry exists
            const entry = await HelpEntryModel.getEntryById(help_entry_id);
            if (!entry) {
                return next(
                    new ApiError(
                        `Help entry with ID ${help_entry_id} not found`,
                        404
                    )
                );
            }

            // Check if user already submitted feedback
            if (req.user) {
                const existingFeedback =
                    await HelpFeedbackModel.checkUserFeedback(
                        help_entry_id,
                        req.user.id
                    );

                if (existingFeedback) {
                    return next(
                        new ApiError(
                            "You have already provided feedback for this help article",
                            400
                        )
                    );
                }
            } else {
                // For anonymous users, check IP
                const existingFeedback =
                    await HelpFeedbackModel.checkIpFeedback(
                        help_entry_id,
                        ip_address
                    );

                if (existingFeedback) {
                    return next(
                        new ApiError(
                            "Feedback has already been submitted from this device",
                            400
                        )
                    );
                }
            }

            // Save feedback
            const feedback = await HelpFeedbackModel.addFeedback({
                help_entry_id,
                user_id: req.user?.id || null,
                is_helpful,
                comment: comment || null,
                ip_address,
            });

            // Get updated stats
            const stats = await HelpFeedbackModel.getFeedbackStats(
                help_entry_id
            );

            res.status(201).json({
                status: "success",
                data: {
                    feedback,
                    stats,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getFeedbackStats(req, res, next) {
        try {
            const { entry_id } = req.params;

            // Check if entry exists
            const entry = await HelpEntryModel.getEntryById(entry_id);
            if (!entry) {
                return next(
                    new ApiError(
                        `Help entry with ID ${entry_id} not found`,
                        404
                    )
                );
            }

            // Only staff and superusers can view feedback
            if (!req.user || !["staff", "superuser"].includes(req.user.role)) {
                return next(
                    new ApiError(
                        "Staff access required to view feedback stats",
                        403
                    )
                );
            }

            const stats = await HelpFeedbackModel.getFeedbackStats(entry_id);
            const feedback = await HelpFeedbackModel.getFeedbackByEntryId(
                entry_id
            );

            res.json({
                status: "success",
                data: {
                    stats,
                    feedback,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new HelpFeedbackController();
