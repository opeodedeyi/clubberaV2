// src/event/controllers/image.controller.js
const ImageModel = require("../models/image.model");
const EventModel = require("../models/event.model");
const ApiError = require("../../utils/ApiError");

class ImageController {
    async saveEventImage(req, res, next) {
        try {
            const { eventId } = req.params;
            const userId = req.user.id;

            // Check if user can manage this event
            const canManage = await EventModel.canManageEvent(
                parseInt(eventId),
                userId
            );

            if (!canManage) {
                throw new ApiError(
                    "You do not have permission to update this event",
                    403
                );
            }

            const { key, imageType = "cover", altText = "" } = req.body;

            if (!key) {
                throw new ApiError("Image key is required", 400);
            }

            // Save image metadata
            const image = await ImageModel.saveEventImage(parseInt(eventId), {
                imageType,
                provider: "s3",
                key,
                altText,
            });

            res.status(200).json({
                status: "success",
                data: {
                    image,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async transferTempImageToEvent(req, res, next) {
        try {
            const { eventId } = req.params;
            const userId = req.user.id;

            // Check if user can manage this event
            const canManage = await EventModel.canManageEvent(
                parseInt(eventId),
                userId
            );

            if (!canManage) {
                throw new ApiError(
                    "You do not have permission to update this event",
                    403
                );
            }

            const { tempKey, imageType = "cover", altText = "" } = req.body;

            if (!tempKey) {
                throw new ApiError("Temporary image key is required", 400);
            }

            // Transfer the image
            const image = await ImageModel.transferTempImageToEvent(
                parseInt(eventId),
                tempKey,
                imageType,
                altText
            );

            res.status(200).json({
                status: "success",
                data: {
                    image,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getEventImages(req, res, next) {
        try {
            const { eventId } = req.params;

            const images = await ImageModel.getEventImages(parseInt(eventId));

            res.status(200).json({
                status: "success",
                data: {
                    images,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteEventImage(req, res, next) {
        try {
            const { eventId } = req.params;
            const userId = req.user.id;
            const { imageType = "cover" } = req.query;

            // Check if user can manage this event
            const canManage = await EventModel.canManageEvent(
                parseInt(eventId),
                userId
            );

            if (!canManage) {
                throw new ApiError(
                    "You do not have permission to update this event",
                    403
                );
            }

            // Delete the image
            const deleted = await ImageModel.deleteEventImage(
                parseInt(eventId),
                imageType
            );

            if (!deleted) {
                throw new ApiError("Image not found", 404);
            }

            res.status(200).json({
                status: "success",
                message: "Image deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ImageController();
