const { validationResult } = require("express-validator");
const TagService = require("../services/tag.service");
const ApiError = require("../../utils/ApiError");

class TagController {
    static async getAllTags(req, res, next) {
        try {
            const tags = await TagService.getAllTags();

            return res.status(200).json({
                status: "success",
                data: tags,
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

    static async createTag(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { name } = req.body;

            const tag = await TagService.createTag(name);

            return res.status(201).json({
                status: "success",
                message: "Tag created successfully",
                data: tag,
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

    static async updateTag(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { id } = req.params;
            const { name } = req.body;

            const tag = await TagService.updateTag(id, name);

            return res.status(200).json({
                status: "success",
                message: "Tag updated successfully",
                data: tag,
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

    static async deleteTag(req, res, next) {
        try {
            const { id } = req.params;

            await TagService.deleteTag(id);

            return res.status(200).json({
                status: "success",
                message: "Tag deleted successfully",
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

module.exports = TagController;
