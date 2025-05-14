// src/communitySupport/routes/webhook.routes.js

const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhook.controller");

// Special middleware to provide raw body for Stripe signature verification
const rawBodyMiddleware = (req, res, next) => {
    let data = "";
    req.setEncoding("utf8");

    req.on("data", (chunk) => {
        data += chunk;
    });

    req.on("end", () => {
        req.rawBody = data;
        next();
    });
};

// Stripe webhook endpoint
router.post(
    "/stripe",
    express.raw({ type: "application/json" }), // Use express.raw instead of json parser
    webhookController.handleStripeWebhook
);

// You can add other payment provider webhooks here as needed
// router.post("/paypal", webhookController.handlePayPalWebhook);

module.exports = router;
