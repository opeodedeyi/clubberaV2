// src/communitySupport/routes/supportPlan.routes.js
const express = require("express");
const router = express.Router();
const supportPlanController = require("../controllers/supportPlan.controller");
const supportPlanValidator = require("../validators/supportPlan.validator");
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");

// Create a new support plan for a community
router.post(
    "/:communityId/support-plans",
    authenticate,
    verifyEmail,
    supportPlanValidator.validateCreatePlan,
    supportPlanController.createPlan
);

// Get a community's support plan
router.get(
    "/:communityId/support-plans",
    supportPlanValidator.validateGetPlan,
    supportPlanController.getPlan
);

// Update a community's support plan
router.put(
    "/:communityId/support-plans/:planId",
    authenticate,
    verifyEmail,
    supportPlanValidator.validateUpdatePlan,
    supportPlanController.updatePlan
);

// Delete a community's support plan
router.delete(
    "/:communityId/support-plans/:planId",
    authenticate,
    verifyEmail,
    supportPlanValidator.validateDeletePlan,
    supportPlanController.deletePlan
);

module.exports = router;
