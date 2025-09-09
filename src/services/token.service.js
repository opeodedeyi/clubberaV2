// src/services/token.service.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../config/db");

class TokenService {
    static async generateToken(userId, purpose) {
        let token;
        let expiresAt;

        if (purpose === "api_access" || purpose === "google_auth") {
            token = jwt.sign({ userId }, process.env.JWT_SECRET, {
                expiresIn: "60d",
            });

            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 60);
        } else {
            token = crypto.randomBytes(32).toString("hex");

            expiresAt = new Date();
            if (purpose === "email_confirmation") {
                expiresAt.setHours(expiresAt.getHours() + 24);
            } else if (purpose === "password_reset") {
                expiresAt.setHours(expiresAt.getHours() + 1);
            } else if (purpose === "passwordless_login") {
                expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiration
            }
        }

        const query = {
            text: `
                INSERT INTO user_tokens (user_id, token, purpose, expires_at)
                VALUES ($1, $2, $3, $4)
                RETURNING id, token, purpose, expires_at, user_id
            `,
            values: [userId, token, purpose, expiresAt],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    static async verifyToken(token, purpose) {
        const query = {
            text: `
                SELECT * FROM user_tokens
                WHERE token = $1 AND purpose = $2 AND expires_at > NOW()
            `,
            values: [token, purpose],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    static async invalidateToken(token) {
        const query = {
            text: "DELETE FROM user_tokens WHERE token = $1",
            values: [token],
        };

        await db.query(query.text, query.values);
    }

    static async invalidateAllUserTokens(userId, purpose = null) {
        let query;

        if (purpose) {
            query = {
                text: "DELETE FROM user_tokens WHERE user_id = $1 AND purpose = $2",
                values: [userId, purpose],
            };
        } else {
            query = {
                text: "DELETE FROM user_tokens WHERE user_id = $1",
                values: [userId],
            };
        }

        await db.query(query.text, query.values);
    }

    static async generateVerificationCode(userId) {
        const verificationCode = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        const query = {
            text: `
                INSERT INTO user_tokens (user_id, token, purpose, expires_at)
                VALUES ($1, $2, $3, $4)
                RETURNING id, token, purpose, expires_at, user_id
            `,
            values: [
                userId,
                verificationCode,
                "email_verification_code",
                expiresAt,
            ],
        };

        const result = await db.query(query.text, query.values);
        return {
            ...result.rows[0],
            verificationCode,
        };
    }

    static async verifyJWT(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return { userId: decoded.userId };
        } catch (error) {
            return null;
        }
    }
}

module.exports = TokenService;
