// src/user/tests/account.test.js
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

// Mock the account.controller first before requiring the routes
jest.mock("../controllers/account.controller", () => ({
    deactivateAccount: jest.fn().mockImplementation((req, res) => {
        return res.status(200).json({
            status: "success",
            message: "Account deactivated successfully",
            data: { isActive: false },
        });
    }),
    reactivateAccount: jest.fn().mockImplementation((req, res) => {
        return res.status(200).json({
            status: "success",
            message: "Account reactivated successfully",
            data: { isActive: true },
        });
    }),
    getAllUsers: jest.fn().mockImplementation((req, res) => {
        return res.status(200).json({
            status: "success",
            data: [
                { id: 1, email: "user1@example.com", role: "user" },
                { id: 2, email: "user2@example.com", role: "staff" },
            ],
        });
    }),
    updateUserRole: jest.fn().mockImplementation((req, res) => {
        return res.status(200).json({
            status: "success",
            message: "User role updated successfully",
            data: { id: 1, role: req.body.role },
        });
    }),
    updateUserStatus: jest.fn().mockImplementation((req, res) => {
        return res.status(200).json({
            status: "success",
            message: `User account ${
                req.body.isActive ? "activated" : "deactivated"
            } successfully`,
            data: { id: 1, isActive: req.body.isActive },
        });
    }),
}));

// Other mocks
jest.mock("../../middleware/auth", () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 1, role: "superuser", isActive: true };
        next();
    },
}));

jest.mock("../../middleware/role", () => ({
    requireRole: (roles) => (req, res, next) => {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "error", message: "Authentication required" });
        }

        const requiredRoles = Array.isArray(roles) ? roles : [roles];

        if (!requiredRoles.includes(req.user.role)) {
            return res
                .status(403)
                .json({ status: "error", message: "Insufficient permissions" });
        }

        next();
    },
    requireActiveAccount: (req, res, next) => {
        if (!req.user) {
            return res
                .status(401)
                .json({ status: "error", message: "Authentication required" });
        }

        if (!req.user.isActive) {
            return res
                .status(403)
                .json({ status: "error", message: "Account is deactivated" });
        }

        next();
    },
}));

// Import app and routes (after mocking)
const app = express();
app.use(express.json());

// Import routes
const accountRoutes = require("../routes/account.routes");
app.use("/api/accounts", accountRoutes);

describe("Account Management Routes", () => {
    test("GET /api/accounts/users - Superuser can get all users", async () => {
        const response = await request(app)
            .get("/api/accounts/users")
            .expect("Content-Type", /json/)
            .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.data).toHaveLength(2);
    });

    test("PUT /api/accounts/deactivate - User can deactivate own account", async () => {
        const response = await request(app)
            .put("/api/accounts/deactivate")
            .expect("Content-Type", /json/)
            .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.message).toContain("deactivated");
        expect(response.body.data.isActive).toBe(false);
    });

    test("PUT /api/accounts/reactivate - User can reactivate account", async () => {
        const response = await request(app)
            .put("/api/accounts/reactivate")
            .send({ email: "user@example.com", password: "Password123" })
            .expect("Content-Type", /json/)
            .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.message).toContain("reactivated");
        expect(response.body.data.isActive).toBe(true);
    });

    test("PUT /api/accounts/users/1/role - Superuser can update role", async () => {
        const response = await request(app)
            .put("/api/accounts/users/1/role")
            .send({ role: "staff" })
            .expect("Content-Type", /json/)
            .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.message).toContain("role updated");
        expect(response.body.data.role).toBe("staff");
    });

    test("PUT /api/accounts/users/1/status - Superuser can update status", async () => {
        const response = await request(app)
            .put("/api/accounts/users/1/status")
            .send({ isActive: false })
            .expect("Content-Type", /json/)
            .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.message).toContain("deactivated");
        expect(response.body.data.isActive).toBe(false);
    });
});
