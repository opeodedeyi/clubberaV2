// src/user/validators/account.validator.js
const { body } = require("express-validator");

const validateReactivation = [
    body("email")
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail(),

    body("password").notEmpty().withMessage("Password is required"),
];

const validateRoleUpdate = [
    body("role")
        .isIn(["user", "staff", "superuser"])
        .withMessage('Role must be "user", "staff", or "superuser"'),
];

const validateStatusUpdate = [
    body("isActive").isBoolean().withMessage("isActive must be a boolean"),
];

module.exports = {
    validateReactivation,
    validateRoleUpdate,
    validateStatusUpdate,
};
