const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const UserService = require("../services/user.service");
const AuthService = require("../services/auth.service");
const ApiError = require("../../utils/ApiError");

class UserController {
    static async createUser(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
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
                location,
            } = req.body;

            const user = await UserService.createUser(
                {
                    email,
                    password,
                    fullName,
                    bio,
                    gender,
                    birthday,
                    preferences,
                },
                location
            );

            return res.status(201).json({
                status: "success",
                message:
                    "User registered successfully. Please check your email to confirm your account.",
                data: user,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
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
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { email, password } = req.body;

            const loginResult = await UserService.loginUser(email, password);

            return res.status(200).json({
                status: "success",
                message: "Login successful",
                data: loginResult,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
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
                status: "success",
                data: userProfile,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async updateUserProfile(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const userId = req.user.id;
            const profileData = req.body;

            const updatedProfile = await UserService.updateUserProfile(
                userId,
                profileData
            );

            return res.status(200).json({
                status: "success",
                message: "Profile updated successfully",
                data: updatedProfile,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async updateUserInterests(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const userId = req.user.id;
            const { interests } = req.body;

            const updatedProfile = await UserService.updateUserInterests(
                userId,
                interests
            );

            return res.status(200).json({
                status: "success",
                message: "Interests updated successfully",
                data: updatedProfile,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async changeUserPassword(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;

            const result = await UserService.changeUserPassword(
                userId,
                currentPassword,
                newPassword
            );

            return res.status(200).json({
                status: "success",
                message: "Password changed successfully",
                data: result,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async forgotPassword(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { email } = req.body;

            const result = await AuthService.forgotPassword(email);

            return res.status(200).json({
                status: "success",
                message:
                    "If your email is registered, you will receive a password reset link shortly",
                data: result,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async resetPassword(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { token, newPassword } = req.body;

            const result = await AuthService.resetPassword(token, newPassword);

            return res.status(200).json({
                status: "success",
                message: "Password has been reset successfully",
                data: result,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async requestVerificationCode(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const userId = req.user.id;
            const { email } = req.body;

            const result = await AuthService.requestEmailVerificationCode(
                userId,
                email
            );

            return res.status(200).json({
                status: "success",
                message: "Verification code sent to your email",
                data: result,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async verifyEmailWithCode(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { email, verificationCode } = req.body;

            const result = await AuthService.verifyEmailWithCode(
                email,
                verificationCode
            );

            return res.status(200).json({
                status: "success",
                message: "Email verified successfully",
                data: result,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async requestVerificationLink(req, res, next) {
        try {
            const userId = req.user.id;

            const result = await AuthService.requestEmailVerificationLink(
                userId
            );

            return res.status(200).json({
                status: "success",
                message: "Verification link sent to your email",
                data: result,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async verifyEmailWithLink(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { token } = req.query;

            const result = await AuthService.verifyEmailWithLink(token);

            // For link verification, we might want to redirect to a success page
            // But for API consistency, we'll return JSON
            return res.status(200).json({
                status: "success",
                message: "Email verified successfully",
                data: result,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async logout(req, res, next) {
        try {
            const { token } = req.body;

            const result = await AuthService.logout(token);

            return res.status(200).json({
                status: "success",
                message: "Logged out successfully",
                data: result,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async requestPasswordlessLogin(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { email } = req.body;

            const result = await AuthService.requestPasswordlessLogin(email);

            return res.status(200).json({
                status: "success",
                message:
                    "If your email is registered, you will receive a login link shortly",
                data: result,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
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
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { token } = req.body;

            const authToken = await AuthService.verifyPasswordlessLogin(token);

            const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
            const userId = decoded.userId;

            const userProfile = await UserService.getUserFullProfile(userId);

            return res.status(200).json({
                status: "success",
                message: "Login successful",
                data: {
                    user: userProfile,
                    token: authToken,
                },
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
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
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { code, idToken } = req.body;

            if (!code && !idToken) {
                return res.status(400).json({
                    status: "error",
                    message:
                        "Either Google authorization code or ID token is required",
                });
            }

            const authResult = await AuthService.handleGoogleLogin(
                code,
                idToken
            );

            const userProfile = await UserService.getUserFullProfile(
                authResult.userId
            );

            return res.status(200).json({
                status: "success",
                message: "Google login successful",
                data: {
                    user: userProfile,
                    token: authResult.token,
                },
            });
        } catch (error) {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    status: "error",
                    message: error.message,
                });
            }
            next(error);
        }
    }
}

module.exports = UserController;
