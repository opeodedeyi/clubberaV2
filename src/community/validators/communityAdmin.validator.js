const { body, param } = require("express-validator");
const communityModel = require("../models/community.model");
const UserModel = require("../../user/models/user.model");
const ApiError = require("../../utils/ApiError");
const { validationResult } = require("express-validator");

// Helper middleware to check validation results
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new ApiError(errors.array()[0].msg, 400));
    }
    next();
};

exports.validateRoleUpdate = [
    param("communityId").isInt().withMessage("Invalid community ID"),

    param("userId").isInt().withMessage("Invalid user ID"),

    body("role")
        .isIn(["organizer", "moderator", "member"])
        .withMessage("Role must be organizer, moderator, or member"),

    validateRequest,
];

exports.validateOwnershipTransfer = [
    param("communityId").isInt().withMessage("Invalid community ID"),

    body("targetUserId").isInt().withMessage("Invalid target user ID"),

    body("password")
        .notEmpty()
        .withMessage("Password is required for security verification"),

    // Custom validator to check if target user is an organizer
    body("targetUserId").custom(async (targetUserId, { req }) => {
        const communityId = req.params.communityId;

        // Check if target user exists
        const targetUser = await UserModel.findById(targetUserId);
        if (!targetUser) {
            throw new Error("Target user not found");
        }

        // Check if target user is an organizer in this community
        const isOrganizer = await communityModel.checkMemberRole(
            communityId,
            targetUserId,
            "organizer"
        );

        if (!isOrganizer) {
            throw new Error(
                "Ownership can only be transferred to an organizer"
            );
        }

        return true;
    }),

    validateRequest,
];

exports.validateTransferResponse = [
    param("transferId").isInt().withMessage("Invalid transfer ID"),

    body("action")
        .isIn(["accept", "reject", "cancel"])
        .withMessage("Action must be accept, reject, or cancel"),

    validateRequest,
];

module.exports = exports;
