const router = require("express").Router();
const controller = require("../controllers/user.controller");
const validator = require("../validators/user.validator");
const authMiddleware = require("../../middleware/auth");

// Public routes
router.post("/create-user", validator.validateSignup, controller.createUser);
router.post("/login", validator.validateLogin, controller.loginUser);

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

// Google authentication route
router.post(
    "/google-login",
    validator.validateGoogleLogin,
    controller.googleLogin
);

// Protected routes (require authentication)
router.get("/profile", authMiddleware.authenticate, controller.getUserProfile);
router.put(
    "/profile",
    authMiddleware.authenticate,
    validator.validateProfileUpdate,
    controller.updateUserProfile
);

module.exports = router;
