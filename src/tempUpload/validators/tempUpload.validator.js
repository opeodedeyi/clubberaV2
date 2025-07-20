const { body } = require("express-validator");
const { validationResult } = require("express-validator");

// Helper function to validate request
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: "error",
            message: "Validation failed",
            errors: errors.array(),
        });
    }
    next();
};

// Validate request for temporary pre-signed upload URL
const validateTempUploadUrl = [
    body("fileType")
        .notEmpty()
        .withMessage("File type is required")
        .isIn(["image/jpeg", "image/png", "image/gif", "image/webp"])
        .withMessage("Unsupported file type. Must be jpeg, png, gif, or webp"),

    body("entityType")
        .notEmpty()
        .withMessage("Entity type is required")
        .isIn(["community", "post", "event", "user"])
        .withMessage("Entity type must be community, post, event, or user"),

    body("imageType")
        .notEmpty()
        .withMessage("Image type is required")
        .isString()
        .withMessage("Image type must be a string")
        .custom((value, { req }) => {
            // Different entity types may have different valid image types
            const entityType = req.body.entityType;

            if (entityType === "community") {
                if (!["profile", "banner"].includes(value)) {
                    throw new Error(
                        "For communities, image type must be profile or banner"
                    );
                }
            } else if (entityType === "post") {
                if (!["content", "thumbnail"].includes(value)) {
                    throw new Error(
                        "For posts, image type must be content or thumbnail"
                    );
                }
            } else if (entityType === "user") {
                if (!["profile", "banner"].includes(value)) {
                    throw new Error(
                        "For users, image type must be profile or banner"
                    );
                }
            }
            // Add other entity types as needed

            return true;
        }),

    validate,
];

module.exports = {
    validateTempUploadUrl,
};
