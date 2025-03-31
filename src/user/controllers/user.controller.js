const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const UserService = require('../services/user.service');
const AuthService = require('../services/auth.service');
const ApiError = require('../../utils/ApiError');

class UserController {
    static async createUser(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { 
                email, 
                password, 
                fullName, 
                bio, 
                gender, 
                birthday, 
                preferences,
                location 
            } = req.body;
            
            const user = await UserService.createUser({
                email,
                password,
                fullName,
                bio,
                gender,
                birthday,
                preferences
            }, location);
            
            return res.status(201).json({
                status: 'success',
                message: 'User registered successfully. Please check your email to confirm your account.',
                data: user
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
            }
            next(error);
        }
    }
    
    static async loginUser(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { email, password } = req.body;
            
            const loginResult = await UserService.loginUser(email, password);
            
            return res.status(200).json({
                status: 'success',
                message: 'Login successful',
                data: loginResult
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
            }
            next(error);
        }
    }    
    
    static async getUserProfile(req, res, next) {
        try {
            const userId = req.user.id;
            
            const userProfile = await UserService.getUserFullProfile(userId);
            
            return res.status(200).json({
                status: 'success',
                data: userProfile
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
            }
            next(error);
        }
    }
    
    static async updateUserProfile(req, res, next) {
        // To be implemented
        res.status(501).json({
            status: 'error',
            message: 'Not implemented yet'
        });
    }

    static async requestPasswordlessLogin(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { email } = req.body;
            
            const result = await AuthService.requestPasswordlessLogin(email);
            
            return res.status(200).json({
                status: 'success',
                message: 'If your email is registered, you will receive a login link shortly',
                data: result
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
            }
            next(error);
        }
    }
    
    static async verifyPasswordlessLogin(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { token } = req.body;
            
            const authToken = await AuthService.verifyPasswordlessLogin(token);
            
            const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
            const userId = decoded.userId;
            
            const userProfile = await UserService.getUserFullProfile(userId);
            
            return res.status(200).json({
                status: 'success',
                message: 'Login successful',
                data: {
                    user: userProfile,
                    token: authToken
                }
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
            }
            next(error);
        }
    }
    
    static async googleLogin(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { code, idToken } = req.body;
            
            if (!code && !idToken) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Either Google authorization code or ID token is required'
                });
            }
            
            const authResult = await AuthService.handleGoogleLogin(code, idToken);
            
            const userProfile = await UserService.getUserFullProfile(authResult.userId);
            
            return res.status(200).json({
                status: 'success',
                message: 'Google login successful',
                data: {
                    user: userProfile,
                    token: authResult.token
                }
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
            }
            next(error);
        }
    }
}

module.exports = UserController;