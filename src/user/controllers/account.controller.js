// src/user/controllers/account.controller.js
const { validationResult } = require("express-validator");
const UserService = require("../services/user.service");
const AccountService = require("../services/account.service");
const ApiError = require("../../utils/ApiError");

class AccountController {
    static async deactivateAccount(req, res, next) {
        try {
            const userId = req.user.id;

            const result = await AccountService.deactivateAccount(userId);

            return res.status(200).json({
                status: "success",
                message: "Account deactivated successfully",
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

    static async reactivateAccount(req, res, next) {
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

            const result = await AccountService.reactivateAccount(
                email,
                password
            );

            return res.status(200).json({
                status: "success",
                message: "Account reactivated successfully",
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

    static async getAllUsers(req, res, next) {
        try {
            const users = await AccountService.getAllUsers();

            return res.status(200).json({
                status: "success",
                data: users,
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

    static async updateUserRole(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { id } = req.params;
            const { role } = req.body;

            const result = await AccountService.updateUserRole(id, role);

            return res.status(200).json({
                status: "success",
                message: "User role updated successfully",
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

    static async updateUserStatus(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { id } = req.params;
            const { isActive } = req.body;

            const result = await AccountService.updateUserStatus(id, isActive);

            return res.status(200).json({
                status: "success",
                message: `User account ${
                    isActive ? "activated" : "deactivated"
                } successfully`,
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
}

module.exports = AccountController;
