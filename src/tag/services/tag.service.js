const TagModel = require("../models/tag.model");
const ApiError = require("../../utils/ApiError");

class TagService {
    static async getAllTags() {
        return TagModel.findAll();
    }

    static async createTag(name) {
        if (!name || name.trim() === "") {
            throw new ApiError("Tag name is required", 400);
        }

        const normalizedName = name.trim();

        const existingTag = await TagModel.findByName(normalizedName);

        if (existingTag) {
            throw new ApiError("Tag with this name already exists", 409);
        }

        return TagModel.create(normalizedName);
    }

    static async updateTag(id, name) {
        if (!name || name.trim() === "") {
            throw new ApiError("Tag name is required", 400);
        }

        const normalizedName = name.trim();

        const tag = await TagModel.findById(id);

        if (!tag) {
            throw new ApiError("Tag not found", 404);
        }

        const existingTag = await TagModel.findByName(normalizedName);

        if (existingTag && existingTag.id !== parseInt(id)) {
            throw new ApiError(
                "Another tag with this name already exists",
                409
            );
        }

        return TagModel.update(id, normalizedName);
    }

    static async deleteTag(id) {
        const tag = await TagModel.findById(id);

        if (!tag) {
            throw new ApiError("Tag not found", 404);
        }

        const result = await TagModel.delete(id);

        if (result.inUse) {
            throw new ApiError("Cannot delete tag because it is in use", 400);
        }

        if (!result.deleted) {
            throw new ApiError("Failed to delete tag", 500);
        }

        return true;
    }
}

module.exports = TagService;
