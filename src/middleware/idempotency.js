// src/middleware/idempotency.js

const idempotencyModel = require("./models/idempotency.model");
const ApiError = require("../utils/ApiError");

/**
 * Idempotency middleware to prevent duplicate requests
 *
 * Usage:
 * - Frontend generates a unique UUID key per operation (on form mount)
 * - Frontend sends key in 'Idempotency-Key' header
 * - This middleware checks if the key exists in the database
 * - If exists: returns cached response (prevents duplicate processing)
 * - If new: allows request to proceed, then caches the response
 *
 * Example in routes:
 * router.post('/', authenticate, idempotency, createCommunity);
 */
const idempotency = async (req, res, next) => {
    try {
        // Extract idempotency key from header
        const idempotencyKey = req.headers["idempotency-key"];

        // If no key provided, skip idempotency check
        // (This allows backward compatibility with clients not using idempotency)
        if (!idempotencyKey) {
            return next();
        }

        // Validate key format (should be a non-empty string, max 255 chars)
        if (
            typeof idempotencyKey !== "string" ||
            idempotencyKey.trim().length === 0
        ) {
            return next(
                new ApiError("Invalid idempotency key format", 400)
            );
        }

        if (idempotencyKey.length > 255) {
            return next(
                new ApiError("Idempotency key too long (max 255 characters)", 400)
            );
        }

        // Check if this key has been used before
        const existingRecord = await idempotencyModel.findByKey(
            idempotencyKey
        );

        if (existingRecord) {
            // Key exists - return cached response
            console.log(
                `Idempotency: Duplicate request detected for key ${idempotencyKey}`
            );

            // Parse the cached response body
            const cachedResponse =
                typeof existingRecord.response_body === "string"
                    ? JSON.parse(existingRecord.response_body)
                    : existingRecord.response_body;

            return res
                .status(existingRecord.response_status)
                .json(cachedResponse);
        }

        // Key is new - intercept the response to cache it
        const originalJson = res.json.bind(res);

        res.json = function (body) {
            // Store the response in the database for future duplicate requests
            idempotencyModel
                .create({
                    key: idempotencyKey,
                    request_path: req.path,
                    request_method: req.method,
                    user_id: req.user?.id || null,
                    response_status: res.statusCode,
                    response_body: body,
                })
                .catch((err) => {
                    // Log error but don't fail the response
                    console.error(
                        "Failed to store idempotency key:",
                        err.message
                    );
                });

            // Call the original res.json() to send the response
            return originalJson(body);
        };

        // Proceed to the next middleware/controller
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    idempotency,
};
