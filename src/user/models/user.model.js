// src/user/models/user.model.js

const db = require("../../config/db");

class UserModel {
    static async emailExists(email) {
        const query = {
            text: "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists",
            values: [email],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0].exists;
    }

    static createUserOperation(userData) {
        const {
            fullName,
            email,
            passwordHash,
            uniqueUrl = null,
            bio = null,
            gender = "prefer not to say",
            birthday = null,
            preferences = {},
            isEmailConfirmed = false,
        } = userData;

        return {
            text: `
                INSERT INTO users(
                    full_name,
                    email,
                    password_hash,
                    unique_url,
                    bio,
                    gender,
                    birthday,
                    preferences,
                    is_email_confirmed
                )
                VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, full_name, email, unique_url, is_email_confirmed, created_at
            `,
            values: [
                fullName,
                email,
                passwordHash,
                uniqueUrl,
                bio,
                gender,
                birthday,
                JSON.stringify(preferences),
                isEmailConfirmed,
            ],
        };
    }

    static async findByUniqueUrl(uniqueUrl) {
        const query = {
            text: "SELECT * FROM users WHERE unique_url = $1",
            values: [uniqueUrl],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    static async findByEmail(email) {
        const query = {
            text: "SELECT * FROM users WHERE email = $1",
            values: [email],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    static async findById(id) {
        const query = {
            text: "SELECT * FROM users WHERE id = $1",
            values: [id],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    static async updateProfile(userId, profileData) {
        const { fullName, bio, gender, birthday, preferences } = profileData;

        // Build dynamic update query based on provided fields
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (fullName !== undefined) {
            updates.push(`full_name = $${paramCount++}`);
            values.push(fullName);
        }

        if (bio !== undefined) {
            updates.push(`bio = $${paramCount++}`);
            values.push(bio);
        }

        if (gender !== undefined) {
            updates.push(`gender = $${paramCount++}`);
            values.push(gender);
        }

        if (birthday !== undefined) {
            updates.push(`birthday = $${paramCount++}`);
            values.push(birthday);
        }

        if (preferences !== undefined) {
            updates.push(`preferences = $${paramCount++}`);
            values.push(JSON.stringify(preferences));
        }

        // Always update the updated_at timestamp
        updates.push(`updated_at = NOW()`);

        // If no fields were provided, just return the current user
        if (updates.length === 1) {
            return this.findById(userId);
        }

        // Add userId at the end of values array
        values.push(userId);

        const query = {
            text: `
                UPDATE users
                SET ${updates.join(", ")}
                WHERE id = $${paramCount}
                RETURNING *
            `,
            values,
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    static async updatePassword(userId, newPasswordHash) {
        const query = {
            text: `
                UPDATE users
                SET password_hash = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING id, email, full_name
            `,
            values: [newPasswordHash, userId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    static async confirmEmail(userId) {
        const query = {
            text: `
                UPDATE users
                SET is_email_confirmed = true, updated_at = NOW()
                WHERE id = $1
                RETURNING id, email, full_name, is_email_confirmed
            `,
            values: [userId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    static async deactivateAccount(userId) {
        const query = {
            text: `
                UPDATE users
                SET is_active = false, updated_at = NOW()
                WHERE id = $1
                RETURNING id, email, is_active
            `,
            values: [userId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    static async reactivateAccount(userId) {
        const query = {
            text: `
                UPDATE users
                SET is_active = true, updated_at = NOW()
                WHERE id = $1
                RETURNING id, email, is_active
            `,
            values: [userId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    static async updateRole(userId, role) {
        const query = {
            text: `
                UPDATE users
                SET role = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING id, email, role
            `,
            values: [role, userId],
        };

        const result = await db.query(query.text, query.values);
        return result.rows[0];
    }

    static async findSuperusers() {
        const query = {
            text: "SELECT * FROM users WHERE role = $1 AND is_active = true",
            values: ["superuser"],
        };

        const result = await db.query(query.text, query.values);
        return result.rows;
    }
}

module.exports = UserModel;
