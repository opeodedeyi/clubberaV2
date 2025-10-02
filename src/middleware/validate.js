// src/middleware/validate.js

const { validationResult } = require('express-validator');

/**
 * Express middleware to handle validation errors
 * Uses express-validator validation results
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    next();
};

module.exports = validate;