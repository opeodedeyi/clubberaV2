// src/user/services/auth.service.js

const bcrypt = require("bcrypt");
const UrlGenerator = require("../utils/urlGenerator");
const UserModel = require("../models/user.model");
const ImageModel = require("../models/image.model");
const db = require("../../config/db");
const tokenService = require("../../services/token.service");
const emailService = require("../../services/email.service");
const passwordService = require("../../services/password.service");
const googleLoginService = require("../../services/googleLogin.service");
const ApiError = require("../../utils/ApiError");

class AuthService {
    static async hashPassword(password) {
        const SALT_ROUNDS = 10;
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    static async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }

    static async validateEmailUniqueness(email) {
        const exists = await UserModel.emailExists(email);

        if (exists) {
            throw new ApiError("Email already registered", 409);
        }
    }

    static async generateAuthToken(userId) {
        return tokenService.generateToken(userId, "api_access");
    }

    static async generateEmailConfirmationToken(userId) {
        return tokenService.generateToken(userId, "email_confirmation");
    }

    static async requestPasswordlessLogin(email) {
        const user = await UserModel.findByEmail(email);

        if (!user) {
            return {
                message:
                    "If your email is registered, you will receive a login link shortly",
            };
        }

        return passwordService.generatePasswordlessLoginToken(
            user.id,
            user.email,
            user.full_name
        );
    }

    static async verifyPasswordlessLogin(token) {
        const userId = await passwordService.verifyPasswordlessToken(token);

        const authToken = await this.generateAuthToken(userId);

        return authToken.token;
    }

    static async handleGoogleLogin(code, idToken) {
        try {
            const googleUser = await googleLoginService.getUserData(
                code,
                idToken
            );

            if (!googleUser || !googleUser.email) {
                throw new ApiError("Invalid Google authentication", 401);
            }

            let user = await UserModel.findByEmail(googleUser.email);

            if (!user) {
                const uniqueUrl = await UrlGenerator.generateUniqueUserUrl(
                    googleUser.name
                );
                const randomPassword = Math.random().toString(36).slice(-16);

                const userData = {
                    email: googleUser.email,
                    fullName: googleUser.name,
                    passwordHash: await this.hashPassword(randomPassword),
                    uniqueUrl,
                    isEmailConfirmed: true,
                };

                const createUserOp = UserModel.createUserOperation(userData);
                const result = await db.query(
                    createUserOp.text,
                    createUserOp.values
                );
                user = result.rows[0];

                if (googleUser.picture) {
                    try {
                        const imageOp = ImageModel.createImageOperation({
                            entityType: "user",
                            entityId: user.id,
                            imageType: "profile",
                            provider: "google",
                            key: googleUser.picture,
                            altText: `${googleUser.name}'s profile picture`,
                        });

                        await db.query(imageOp.text, imageOp.values);
                    } catch (imgErr) {
                        console.error(
                            "Failed to save Google profile image:",
                            imgErr
                        );
                    }
                }

                // TODO: Send welcome email to the user if needed
            } else {
                if (!user.is_email_confirmed) {
                    const confirmEmailOp = {
                        text: "UPDATE users SET is_email_confirmed = true WHERE id = $1 RETURNING *",
                        values: [user.id],
                    };

                    const confirmResult = await db.query(
                        confirmEmailOp.text,
                        confirmEmailOp.values
                    );
                    user = confirmResult.rows[0];
                }
            }

            const token = await tokenService.generateToken(
                user.id,
                "google_auth"
            );

            return {
                token: token.token,
                userId: user.id,
            };
        } catch (error) {
            console.error("Google login error:", error);
            throw new ApiError("Google authentication failed", 401);
        }
    }

    static async forgotPassword(email) {
        const user = await UserModel.findByEmail(email);

        if (!user) {
            return {
                message:
                    "If your email is registered, you will receive a password reset link shortly",
            };
        }

        await tokenService.invalidateAllUserTokens(user.id, "password_reset");

        const resetTokenData = await tokenService.generateToken(
            user.id,
            "password_reset"
        );

        await emailService.sendPasswordResetEmail({
            email: user.email,
            name: user.full_name,
            resetToken: resetTokenData.token,
        });

        return {
            message: "Password reset link sent to your email",
        };
    }

    static async resetPassword(token, newPassword) {
        const tokenData = await tokenService.verifyToken(
            token,
            "password_reset"
        );

        if (!tokenData) {
            throw new ApiError("Invalid or expired password reset link", 401);
        }

        const passwordHash = await this.hashPassword(newPassword);

        await UserModel.updatePassword(tokenData.user_id, passwordHash);

        await tokenService.invalidateToken(token);

        return {
            message: "Password has been reset successfully",
        };
    }

    static async requestEmailVerificationCode(userId, email) {
        await tokenService.invalidateAllUserTokens(
            userId,
            "email_verification_code"
        );

        const codeData = await tokenService.generateVerificationCode(userId);

        const user = await UserModel.findById(userId);

        await emailService.sendVerificationCodeEmail({
            email: email || user.email,
            name: user.full_name,
            verificationCode: codeData.verificationCode,
        });

        return {
            message: "Verification code sent to your email",
        };
    }

    static async verifyEmailWithCode(email, verificationCode) {
        const user = await UserModel.findByEmail(email);

        if (!user) {
            throw new ApiError("Invalid email address", 404);
        }

        if (user.is_email_confirmed) {
            return {
                message: "Email is already verified",
                isVerified: true,
            };
        }

        const tokenData = await tokenService.verifyToken(
            verificationCode,
            "email_verification_code"
        );

        if (!tokenData || tokenData.user_id !== user.id) {
            throw new ApiError("Invalid or expired verification code", 401);
        }

        await UserModel.confirmEmail(user.id);

        await tokenService.invalidateToken(verificationCode);

        return {
            message: "Email verified successfully",
            isVerified: true,
        };
    }

    static async requestEmailVerificationLink(userId) {
        const user = await UserModel.findById(userId);

        if (!user) {
            throw new ApiError("User not found", 404);
        }

        if (user.is_email_confirmed) {
            return {
                message: "Email is already verified",
                isVerified: true,
            };
        }

        await tokenService.invalidateAllUserTokens(
            userId,
            "email_confirmation"
        );

        const tokenData = await tokenService.generateToken(
            userId,
            "email_confirmation"
        );

        await emailService.sendVerificationLinkEmail({
            email: user.email,
            name: user.full_name,
            verificationToken: tokenData.token,
        });

        return {
            message: "Verification link sent to your email",
        };
    }

    static async verifyEmailWithLink(token) {
        const tokenData = await tokenService.verifyToken(
            token,
            "email_confirmation"
        );

        if (!tokenData) {
            throw new ApiError("Invalid or expired verification link", 401);
        }

        const user = await UserModel.findById(tokenData.user_id);

        if (user.is_email_confirmed) {
            return {
                message: "Email is already verified",
                isVerified: true,
            };
        }

        await UserModel.confirmEmail(tokenData.user_id);

        await tokenService.invalidateToken(token);

        return {
            message: "Email verified successfully",
            isVerified: true,
        };
    }

    static async logout(token) {
        if (!token) {
            return {
                message: "Logged out successfully",
            };
        }

        try {
            await tokenService.invalidateToken(token);
        } catch (error) {
            console.error("Error invalidating token:", error);
        }

        return {
            message: "Logged out successfully",
        };
    }
}

module.exports = AuthService;
