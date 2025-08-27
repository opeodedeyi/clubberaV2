// src/community/routes/recommendations.routes.js

const express = require("express");
const router = express.Router();
const recommendationsController = require("../controllers/recommendations.controller");
const recommendationsValidator = require("../validators/recommendations.validator");
const optionalAuth = require("../../middleware/optionalAuth");

// Route to get community recommendations (personalized if logged in, popular if not)
router.get(
    "/communities",
    optionalAuth, // Optional authentication - personalized if logged in, popular if not
    recommendationsValidator.validateGetRecommendations,
    recommendationsController.getRecommendations
);

module.exports = router;