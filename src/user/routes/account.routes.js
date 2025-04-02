// src/user/routes/account.routes.js
const router = require("express").Router();
const accountController = require("../controllers/account.controller");
const accountValidators = require("../validators/account.validator");
const authMiddleware = require("../../middleware/auth");
const roleMiddleware = require("../../middleware/role");

// Account management (requires authentication)
router.put(
    "/deactivate",
    authMiddleware.authenticate,
    accountController.deactivateAccount
);

router.put(
    "/reactivate",
    accountValidators.validateReactivation,
    accountController.reactivateAccount // No auth middleware - user might be deactivated
);

// Superuser routes (require 'superuser' role)
router.get(
    "/users",
    authMiddleware.authenticate,
    roleMiddleware.requireRole(["staff", "superuser"]),
    accountController.getAllUsers
);

// Only superusers can change roles
router.put(
    "/users/:id/role",
    authMiddleware.authenticate,
    roleMiddleware.requireRole("superuser"),
    accountValidators.validateRoleUpdate,
    accountController.updateUserRole
);

// Both staff and superusers can change account status
router.put(
    "/users/:id/status",
    authMiddleware.authenticate,
    roleMiddleware.requireRole(["staff", "superuser"]),
    accountValidators.validateStatusUpdate,
    accountController.updateUserStatus
);

module.exports = router;
