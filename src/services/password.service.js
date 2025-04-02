const tokenService = require('./token.service');
const emailService = require('./email.service');
const ApiError = require('../utils/ApiError');

class PasswordService {
    async generatePasswordlessLoginToken(userId, email, fullName) {
        const tokenData = await tokenService.generateToken(userId, 'passwordless_login');
        
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
        const loginLink = `${baseUrl}/passwordless-login?token=${tokenData.token}`;

        try {
            await emailService.sendPasswordlessLoginEmail({
                email,
                name: fullName,
                loginLink
            });
            
            return {
                message: 'Login link sent to your email',
                expiresAt: tokenData.expires_at
            };
        } catch (error) {
            throw new ApiError('Failed to send login email', 500);
        }
    }

    async verifyPasswordlessToken(token) {
        const tokenData = await tokenService.verifyToken(token, 'passwordless_login');
        
        if (!tokenData) {
            throw new ApiError('Invalid or expired login link', 401);
        }
        
        await tokenService.invalidateToken(token);
        
        return tokenData.user_id;
    }
}

module.exports = new PasswordService();