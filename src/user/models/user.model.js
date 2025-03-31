// src/user/models/user.model.js
const db = require('../../config/db');

class UserModel {
    static async emailExists(email) {
        const query = {
            text: 'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists',
            values: [email]
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
            gender = null,
            birthday = null,
            preferences = {}
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
                    preferences
                ) 
                VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
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
                JSON.stringify(preferences)
            ]
        };
    }

    static async findByEmail(email) {
        const query = {
            text: 'SELECT * FROM users WHERE email = $1',
            values: [email]
        };
        
        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }

    static async findById(id) {
        const query = {
            text: 'SELECT * FROM users WHERE id = $1',
            values: [id]
        };
        
        const result = await db.query(query.text, query.values);
        return result.rows[0] || null;
    }
}

module.exports = UserModel;