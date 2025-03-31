// src/user/validators/user.validator.js
const { body } = require('express-validator');

const validateUserCreation = [
    body('email')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    
    body('fullName')
        .trim()
        .isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
    
    body('location.city')
        .optional()
        .isString().withMessage('City must be a string'),
    
    body('location.lat')
        .optional()
        .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    
    body('location.lng')
        .optional()
        .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    
    body('gender')
        .optional()
        .isString().withMessage('Gender must be a string'),
    
    body('birthday')
        .optional()
        .isISO8601().withMessage('Birthday must be a valid date in ISO 8601 format'),
    
    body('bio')
        .optional()
        .isString().withMessage('Bio must be a string')
];

const validateLogin = [
    body('email')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
];

const validateProfileUpdate = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
    
    body('bio')
        .optional()
        .isString().withMessage('Bio must be a string'),
    
    body('gender')
        .optional()
        .isString().withMessage('Gender must be a string'),
    
    body('birthday')
        .optional()
        .isISO8601().withMessage('Birthday must be a valid date in ISO 8601 format'),
    
    body('location.city')
        .optional()
        .isString().withMessage('City must be a string'),
    
    body('location.lat')
        .optional()
        .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    
    body('location.lng')
        .optional()
        .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
        
    body('preferences')
        .optional()
        .isObject().withMessage('Preferences must be an object')
];

const validatePasswordlessRequest = [
    body('email')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail()
];

const validatePasswordlessVerify = [
    body('token')
        .notEmpty().withMessage('Token is required')
        .isString().withMessage('Token must be a string')
];

const validateGoogleLogin = [
    body('code')
        .optional()
        .isString().withMessage('Code must be a string'),

    body('idToken')
        .optional()
        .isString().withMessage('ID token must be a string'),

    body().custom((value) => {
        if (!value.code && !value.idToken) {
            throw new Error('Either code or idToken must be provided');
        }
        return true;
    })
];

const validateSignup = validateUserCreation;

module.exports = {
    validateUserCreation,
    validateSignup,
    validateLogin,
    validateProfileUpdate,
    validatePasswordlessRequest,
    validatePasswordlessVerify,
    validateGoogleLogin
};