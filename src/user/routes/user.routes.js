const router = require("express").Router();
const controller = require("../controllers/user.controller");
const validator = require("../validators/user.validator");
const authMiddleware = require("../../middleware/auth");

// Public routes
router.post("/create-user", validator.validateSignup, controller.createUser);
router.post("/login", validator.validateLogin, controller.loginUser);
router.post("/logout", validator.validateLogout, controller.logout);

// Password management routes
router.post(
    "/forgot-password",
    validator.validateForgotPassword,
    controller.forgotPassword
);
router.post(
    "/reset-password",
    validator.validatePasswordReset,
    controller.resetPassword
);

// Passwordless login routes
router.post(
    "/passwordless-request",
    validator.validatePasswordlessRequest,
    controller.requestPasswordlessLogin
);
router.post(
    "/passwordless-verify",
    validator.validatePasswordlessVerify,
    controller.verifyPasswordlessLogin
);

// Email verification routes
router.post(
    "/verify-email-code-request",
    authMiddleware.authenticate,
    validator.validatePasswordlessRequest,
    controller.requestVerificationCode
);
router.post(
    "/verify-email-code",
    validator.validateVerifyEmailCode,
    controller.verifyEmailWithCode
);
router.post(
    "/verify-email-link-request",
    authMiddleware.authenticate,
    controller.requestVerificationLink
);
router.get(
    "/verify-email",
    validator.validateVerifyEmailLink,
    controller.verifyEmailWithLink
);

// Google authentication route
router.post(
    "/google-login",
    validator.validateGoogleLogin,
    controller.googleLogin
);

// Protected routes (require authentication)
router.get("/profile", authMiddleware.authenticate, controller.getUserProfile);

// Update routes (all require authentication)
router.put(
    "/profile",
    authMiddleware.authenticate,
    validator.validateProfileUpdate,
    controller.updateUserProfile
);
router.put(
    "/interests",
    authMiddleware.authenticate,
    validator.validateInterestsUpdate,
    controller.updateUserInterests
);
router.put(
    "/password",
    authMiddleware.authenticate,
    validator.validatePasswordChange,
    controller.changeUserPassword
);

module.exports = router;
