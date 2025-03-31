const { OAuth2Client } = require('google-auth-library');

class GoogleLoginService {
    constructor() {
        this.CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
        this.CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
        
        this.client = new OAuth2Client(this.CLIENT_ID);
        this.oAuth2Client = new OAuth2Client(
            this.CLIENT_ID,
            this.CLIENT_SECRET,
            'postmessage',
        );
    }

    async getIdToken(code) {
        const { tokens } = await this.oAuth2Client.getToken(code);
        return tokens.id_token;
    }

    async verifyToken(idToken) {
        const ticket = await this.client.verifyIdToken({
            idToken,
            audience: this.CLIENT_ID,
        });
        return ticket.getPayload();
    }

    async getUserData(code, idToken) {
        try {
            let userData;
            
            if (idToken) {
                userData = await this.verifyToken(idToken);
            } else if (code) {
                const createdIdToken = await this.getIdToken(code);
                userData = await this.verifyToken(createdIdToken);
            } else {
                throw new Error('Either code or idToken is required');
            }
            
            return {
                email: userData.email,
                name: userData.name || `${userData.given_name || ''} ${userData.family_name || ''}`.trim(),
                picture: userData.picture || null,
                emailVerified: userData.email_verified || false
            };
        } catch (error) {
            console.error('Google auth error:', error);
            throw new Error('Failed to authenticate with Google');
        }
    }
}

module.exports = new GoogleLoginService();