// src/user/services/account.service.js

const UserModel = require("../models/user.model");
const db = require("../../config/db");
const ApiError = require("../../utils/ApiError");

class AccountService {
    static async deactivateAccount(userId) {
        const user = await UserModel.findById(userId);

        if (!user) {
            throw new ApiError("User not found", 404);
        }

        const deactivatedUser = await UserModel.deactivateAccount(userId);

        return {
            id: deactivatedUser.id,
            email: deactivatedUser.email,
            isActive: deactivatedUser.is_active,
        };
    }

    static async reactivateAccount(email, password) {
        const user = await UserModel.findByEmail(email);

        if (!user) {
            throw new ApiError("Invalid email or password", 401);
        }

        if (user.is_active) {
            return {
                id: user.id,
                email: user.email,
                isActive: user.is_active,
                message: "Account is already active",
            };
        }

        const authService = require("./auth.service");
        const passwordValid = await authService.verifyPassword(
            password,
            user.password_hash
        );

        if (!passwordValid) {
            throw new ApiError("Invalid email or password", 401);
        }

        const reactivatedUser = await UserModel.reactivateAccount(user.id);

        const token = await authService.generateAuthToken(user.id);

        return {
            id: reactivatedUser.id,
            email: reactivatedUser.email,
            isActive: reactivatedUser.is_active,
            token: token.token,
        };
    }

    static async getAllUsers() {
        const query = {
            text: `
                SELECT id, email, full_name, role, is_active, is_email_confirmed, created_at
                FROM users
                ORDER BY created_at DESC
            `,
            values: [],
        };

        const result = await db.query(query.text, query.values);

        return result.rows.map((user) => ({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role || "user",
            isActive: user.is_active,
            isEmailConfirmed: user.is_email_confirmed,
            createdAt: user.created_at,
        }));
    }

    static async updateUserRole(userId, role) {
        const validRoles = ["user", "staff", "superuser"];
        if (!validRoles.includes(role)) {
            throw new ApiError(
                `Invalid role. Must be one of: ${validRoles.join(", ")}`,
                400
            );
        }

        const user = await UserModel.findById(userId);

        if (!user) {
            throw new ApiError("User not found", 404);
        }

        const updatedUser = await UserModel.updateRole(userId, role);

        return {
            id: updatedUser.id,
            email: updatedUser.email,
            role: updatedUser.role,
        };
    }

    static async updateUserStatus(userId, isActive) {
        const user = await UserModel.findById(userId);

        if (!user) {
            throw new ApiError("User not found", 404);
        }

        let updatedUser;

        if (isActive) {
            updatedUser = await UserModel.reactivateAccount(userId);
        } else {
            updatedUser = await UserModel.deactivateAccount(userId);
        }

        return {
            id: updatedUser.id,
            email: updatedUser.email,
            isActive: updatedUser.is_active,
        };
    }
}

module.exports = AccountService;
