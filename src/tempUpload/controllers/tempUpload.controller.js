// src/tempUpload/controllers/tempUpload.controller.js

const s3Service = require("../../services/s3.service");
const ApiError = require("../../utils/ApiError");
const { validationResult } = require("express-validator");

class TempUploadController {
    // Get temporary pre-signed URL for uploads before entity creation
    async getTempUploadUrl(req, res, next) {
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
            const { fileType, entityType, imageType } = req.body;

            if (!fileType || !entityType || !imageType) {
                return res.status(400).json({
                    status: "error",
                    message: "Missing required parameters",
                });
            }

            // Validate entity type to prevent misuse
            const validEntityTypes = ["community", "post", "event", "user"];
            if (!validEntityTypes.includes(entityType)) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid entity type",
                });
            }

            // For temp uploads, we'll use a special entity type format
            // This will help us identify temp uploads that will be associated with an entity later
            const tempEntityType = `${entityType}-temp-${userId}`;

            const result = await s3Service.generatePresignedUrl(
                fileType,
                tempEntityType,
                Date.now(), // Use timestamp as ID to ensure uniqueness
                imageType
            );

            return res.status(200).json({
                status: "success",
                data: {
                    ...result,
                    entityType,
                    imageType,
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
}

module.exports = new TempUploadController();
