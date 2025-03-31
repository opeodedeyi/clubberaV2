const bcrypt = require('bcrypt');
const UserModel = require('../models/user.model');
const ImageModel = require('../models/image.model');
const db = require('../../config/db');
const tokenService = require('../../services/token.service');
const passwordService = require('../../services/password.service');
const googleLoginService = require('../../services/googleLogin.service');
const ApiError = require('../../utils/ApiError');

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
            throw new ApiError('Email already registered', 409);
        }
    }

    static async generateAuthToken(userId) {
        return tokenService.generateToken(userId, 'api_access');
    }

    static async generateEmailConfirmationToken(userId) {
        return tokenService.generateToken(userId, 'email_confirmation');
    }

    static async requestPasswordlessLogin(email) {
        const user = await UserModel.findByEmail(email);
        
        if (!user) {
            return {
                message: 'If your email is registered, you will receive a login link shortly'
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
            const googleUser = await googleLoginService.getUserData(code, idToken);

            if (!googleUser || !googleUser.email) {
                throw new ApiError('Invalid Google authentication', 401);
            }

            let user = await UserModel.findByEmail(googleUser.email);

            if (!user) {
                const uniqueUrl = googleUser.name.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();
                const randomPassword = Math.random().toString(36).slice(-16);

                const userData = {
                    email: googleUser.email,
                    fullName: googleUser.name,
                    passwordHash: await this.hashPassword(randomPassword),
                    uniqueUrl,
                    isEmailConfirmed: true
                };
                
                const createUserOp = UserModel.createUserOperation(userData);
                const result = await db.query(createUserOp.text, createUserOp.values);
                user = result.rows[0];
                
                if (googleUser.picture) {
                    try {
                        const imageOp = ImageModel.createImageOperation({
                            entityType: 'user',
                            entityId: user.id,
                            imageType: 'profile',
                            provider: 'google',
                            key: googleUser.picture,
                            altText: `${googleUser.name}'s profile picture`
                        });
                        
                        await db.query(imageOp.text, imageOp.values);
                    } catch (imgErr) {
                        console.error('Failed to save Google profile image:', imgErr);
                    }
                }
                
                // TODO: Send welcome email to the user if needed
            } else {
                if (!user.is_email_confirmed) {
                    const confirmEmailOp = {
                        text: 'UPDATE users SET is_email_confirmed = true WHERE id = $1 RETURNING *',
                        values: [user.id]
                    };
                    
                    const confirmResult = await db.query(confirmEmailOp.text, confirmEmailOp.values);
                    user = confirmResult.rows[0];
                }
            }

            const token = await tokenService.generateToken(user.id, 'google_auth');

            return {
                token: token.token,
                userId: user.id
            };
        } catch (error) {
            console.error('Google login error:', error);
            throw new ApiError('Google authentication failed', 401);
        }
    }
}

module.exports = AuthService;