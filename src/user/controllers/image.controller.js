// src/user/controllers/image.controller.js

const { validationResult } = require("express-validator");
const ImageModel = require("../models/image.model");
const s3Service = require("../../services/s3.service");
const ApiError = require("../../utils/ApiError");
const UserService = require("../services/user.service");

class ImageController {
    static async getUploadUrl(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const userId = req.user.id;
            const { fileType, imageType } = req.body;

            if (!fileType || !imageType) {
                return res.status(400).json({
                    status: "error",
                    message: "Missing required parameters",
                });
            }

            const result = await s3Service.generatePresignedUrl(
                fileType,
                "user",
                userId,
                imageType
            );

            return res.status(200).json({
                status: "success",
                data: result,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async saveProfileImage(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const userId = req.user.id;
            const { key, altText } = req.body;
            const imageType = req.body.imageType || "profile"; // Default to profile

            if (!key) {
                return res.status(400).json({
                    status: "error",
                    message: "Image key is required",
                });
            }

            // Update or create the image record
            const image = await ImageModel.updateImage(
                "user",
                userId,
                imageType,
                {
                    provider: "aws-s3",
                    key,
                    altText,
                    position: 0,
                }
            );

            // Get the updated user profile
            const userProfile = await UserService.getUserFullProfile(userId);

            return res.status(200).json({
                status: "success",
                message: "Profile image updated successfully",
                data: {
                    image,
                    profile: userProfile,
                },
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async deleteProfileImage(req, res, next) {
        try {
            const userId = req.user.id;
            const imageType = req.query.type || "profile";

            // Find the image
            const image = await ImageModel.findByEntity(
                "user",
                userId,
                imageType
            );

            if (!image) {
                return res.status(404).json({
                    status: "error",
                    message: "Image not found",
                });
            }

            // Delete the image
            await ImageModel.deleteImage(image.id);

            // Get the updated user profile
            const userProfile = await UserService.getUserFullProfile(userId);

            return res.status(200).json({
                status: "success",
                message: "Profile image deleted successfully",
                data: userProfile,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }
}

module.exports = ImageController;
