const { body } = require("express-validator");

const validateTagCreation = [
    body("name")
        .notEmpty()
        .withMessage("Tag name is required")
        .isString()
        .withMessage("Tag name must be a string")
        .isLength({ min: 2, max: 50 })
        .withMessage("Tag name must be between 2 and 50 characters")
        .matches(/^[a-zA-Z0-9\s-]+$/)
        .withMessage(
            "Tag name can only contain letters, numbers, spaces, and hyphens"
        )
        .trim(),
];

const validateTagUpdate = [
    body("name")
        .notEmpty()
        .withMessage("Tag name is required")
        .isString()
        .withMessage("Tag name must be a string")
        .isLength({ min: 2, max: 50 })
        .withMessage("Tag name must be between 2 and 50 characters")
        .matches(/^[a-zA-Z0-9\s-]+$/)
        .withMessage(
            "Tag name can only contain letters, numbers, spaces, and hyphens"
        )
        .trim(),
];

module.exports = {
    validateTagCreation,
    validateTagUpdate,
};
