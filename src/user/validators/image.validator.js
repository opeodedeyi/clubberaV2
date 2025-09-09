// src/user/validators/image.validator.js
const { body } = require("express-validator");

const validateGetUploadUrl = [
    body("fileType")
        .notEmpty()
        .withMessage("File type is required")
        .matches(/^image\/(jpeg|png|gif|webp)$/)
        .withMessage("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed"),

    body("imageType")
        .notEmpty()
        .withMessage("Image type is required")
        .isIn(["profile", "banner"])
        .withMessage('Image type must be either "profile" or "banner"'),
];

const validateSaveImage = [
    body("key")
        .notEmpty()
        .withMessage("S3 key is required")
        .isString()
        .withMessage("S3 key must be a string"),

    body("imageType")
        .optional()
        .isIn(["profile", "banner"])
        .withMessage('Image type must be either "profile" or "banner"'),

    body("altText")
        .optional()
        .isString()
        .withMessage("Alt text must be a string")
        .isLength({ max: 255 })
        .withMessage("Alt text cannot be longer than 255 characters"),
];

module.exports = {
    validateGetUploadUrl,
    validateSaveImage,
};
