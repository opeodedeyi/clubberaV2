const { body, query } = require("express-validator");

const validateUserCreation = [
    body("email")
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail(),

    body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
        .matches(/[A-Z]/)
        .withMessage("Password must contain at least one uppercase letter")
        .matches(/[a-z]/)
        .withMessage("Password must contain at least one lowercase letter")
        .matches(/[0-9]/)
        .withMessage("Password must contain at least one number"),

    body("fullName")
        .trim()
        .isLength({ min: 2 })
        .withMessage("Full name must be at least 2 characters"),

    body("location.city")
        .optional()
        .isString()
        .withMessage("City must be a string"),

    body("location.lat")
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage("Invalid latitude"),

    body("location.lng")
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage("Invalid longitude"),

    body("gender").optional().isString().withMessage("Gender must be a string"),

    body("birthday")
        .optional()
        .isISO8601()
        .withMessage("Birthday must be a valid date in ISO 8601 format"),

    body("bio").optional().isString().withMessage("Bio must be a string"),
];

const validateLogin = [
    body("email")
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail(),

    body("password").notEmpty().withMessage("Password is required"),
];

const validateProfileUpdate = [
    body("fullName")
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage("Full name must be at least 2 characters"),

    body("bio").optional().isString().withMessage("Bio must be a string"),

    body("gender").optional().isString().withMessage("Gender must be a string"),

    body("birthday")
        .optional()
        .isISO8601()
        .withMessage("Birthday must be a valid date in ISO 8601 format"),

    body("location.city")
        .optional()
        .isString()
        .withMessage("City must be a string"),

    body("location.lat")
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage("Invalid latitude"),

    body("location.lng")
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage("Invalid longitude"),

    body("preferences")
        .optional()
        .isObject()
        .withMessage("Preferences must be an object"),
];

const validatePasswordlessRequest = [
    body("email")
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail(),
];

const validatePasswordlessVerify = [
    body("token")
        .notEmpty()
        .withMessage("Token is required")
        .isString()
        .withMessage("Token must be a string"),
];

const validateGoogleLogin = [
    body("code").optional().isString().withMessage("Code must be a string"),

    body("idToken")
        .optional()
        .isString()
        .withMessage("ID token must be a string"),

    body().custom((value) => {
        if (!value.code && !value.idToken) {
            throw new Error("Either code or idToken must be provided");
        }
        return true;
    }),
];

const validateInterestsUpdate = [
    body("interests")
        .isArray()
        .withMessage("Interests must be an array")
        .custom((interests) => {
            if (interests.length > 20) {
                throw new Error("Maximum 20 interests allowed");
            }

            // Check that each interest is a string and meets requirements
            for (const interest of interests) {
                if (typeof interest !== "string") {
                    throw new Error("Each interest must be a string");
                }

                if (interest.length < 2 || interest.length > 30) {
                    throw new Error(
                        "Each interest must be between 2 and 30 characters"
                    );
                }

                // Only allow alphanumeric characters, spaces, and hyphens
                if (!/^[a-zA-Z0-9\s-]+$/.test(interest)) {
                    throw new Error(
                        "Interests can only contain letters, numbers, spaces, and hyphens"
                    );
                }
            }

            return true;
        }),
];

const validatePasswordChange = [
    body("currentPassword")
        .notEmpty()
        .withMessage("Current password is required"),

    body("newPassword")
        .isLength({ min: 8 })
        .withMessage("New password must be at least 8 characters long")
        .matches(/[A-Z]/)
        .withMessage("New password must contain at least one uppercase letter")
        .matches(/[a-z]/)
        .withMessage("New password must contain at least one lowercase letter")
        .matches(/[0-9]/)
        .withMessage("New password must contain at least one number")
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error(
                    "New password must be different from current password"
                );
            }
            return true;
        }),
];

const validateForgotPassword = [
    body("email")
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail(),
];

const validatePasswordReset = [
    body("token")
        .notEmpty()
        .withMessage("Token is required")
        .isString()
        .withMessage("Token must be a string"),

    body("newPassword")
        .isLength({ min: 8 })
        .withMessage("New password must be at least 8 characters long")
        .matches(/[A-Z]/)
        .withMessage("New password must contain at least one uppercase letter")
        .matches(/[a-z]/)
        .withMessage("New password must contain at least one lowercase letter")
        .matches(/[0-9]/)
        .withMessage("New password must contain at least one number"),
];

const validateVerifyEmailCode = [
    body("email")
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail(),

    body("verificationCode")
        .isString()
        .withMessage("Verification code must be a string")
        .isLength({ min: 6, max: 8 })
        .withMessage("Verification code must be 6-8 characters")
        .matches(/^[0-9]+$/)
        .withMessage("Verification code must contain only numbers"),
];

const validateVerifyEmailLink = [
    query("token")
        .notEmpty()
        .withMessage("Token is required")
        .isString()
        .withMessage("Token must be a string"),
];

const validateLogout = [
    body("token").optional().isString().withMessage("Token must be a string"),
];

const validateSignup = validateUserCreation;

module.exports = {
    validateUserCreation,
    validateSignup,
    validateLogin,
    validateProfileUpdate,
    validatePasswordlessRequest,
    validatePasswordlessVerify,
    validateGoogleLogin,
    validateInterestsUpdate,
    validatePasswordChange,
    validateForgotPassword,
    validatePasswordReset,
    validateVerifyEmailCode,
    validateVerifyEmailLink,
    validateLogout,
};
