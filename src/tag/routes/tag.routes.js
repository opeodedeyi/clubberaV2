const router = require("express").Router();
const controller = require("../controllers/tag.controller");
const validator = require("../validators/tag.validator");
const authMiddleware = require("../../middleware/auth");
const roleMiddleware = require("../../middleware/role");

// Public routes (anyone can view tags)
router.get("/", controller.getAllTags);

// Superuser routes (require 'superuser' role)
router.post(
    "/",
    authMiddleware.authenticate,
    roleMiddleware.requireRole(["staff", "superuser"]),
    validator.validateTagCreation,
    controller.createTag
);

router.put(
    "/:id",
    authMiddleware.authenticate,
    roleMiddleware.requireRole(["staff", "superuser"]),
    validator.validateTagUpdate,
    controller.updateTag
);

// Superuser only routes (delete tags)
router.delete(
    "/:id",
    authMiddleware.authenticate,
    roleMiddleware.requireRole("superuser"),
    controller.deleteTag
);

module.exports = router;
