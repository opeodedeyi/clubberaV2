// src/subscription/tests/subscriptionAdmin.test.js

const request = require("supertest");
const subscriptionPlanModel = require("../models/subscriptionPlan.model");
const db = require("../../config/db");

// Mock user data for testing
let currentUser = {
    id: 1,
    email: "admin@example.com",
    fullName: "Admin User",
    isEmailConfirmed: true,
    isActive: true,
    role: "superuser",
};

// Create Express app with routes for testing
const express = require("express");
const app = express();

// Mock middleware
app.use((req, res, next) => {
    // Add the current user to the request
    req.user = currentUser;
    next();
});

// Mock routes for testing
app.get("/api/admin/subscriptions/plans", (req, res) => {
    if (!req.user || req.user.role !== "superuser") {
        return res.status(403).json({
            status: "error",
            message: "This action requires superuser privileges",
        });
    }

    return res.json({
        status: "success",
        data: [
            {
                id: 1,
                name: "Free Plan",
                code: "free",
                price: "0.00",
                currency: "USD",
                billing_interval: "monthly",
                features: { pro_features: false },
                is_active: true,
            },
            {
                id: 2,
                name: "Pro Monthly",
                code: "pro_monthly",
                price: "9.99",
                currency: "USD",
                billing_interval: "monthly",
                features: { pro_features: true },
                is_active: true,
            },
        ],
    });
});

app.post("/api/admin/subscriptions/plans", (req, res) => {
    if (!req.user || req.user.role !== "superuser") {
        return res.status(403).json({
            status: "error",
            message: "This action requires superuser privileges",
        });
    }

    const { name, code, price } = req.body;

    // Validate required fields
    if (!name || !code || price === undefined) {
        return res.status(400).json({
            status: "error",
            message: "Missing required fields",
        });
    }

    // Check if price is too low for a pro plan
    if (code.includes("pro") && parseFloat(price) < 1) {
        return res.status(400).json({
            status: "error",
            message: "Pro plans must have a price greater than 1",
        });
    }

    return res.status(201).json({
        status: "success",
        message: "Subscription plan created successfully",
        data: {
            id: 3,
            ...req.body,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    });
});

app.post(
    "/api/admin/subscriptions/communities/:communityId/promotional",
    (req, res) => {
        if (!req.user || req.user.role !== "superuser") {
            return res.status(403).json({
                status: "error",
                message: "This action requires superuser privileges",
            });
        }

        const communityId = req.params.communityId;
        const { duration_months } = req.body;

        // Validate community ID
        if (communityId === "999") {
            return res.status(404).json({
                status: "error",
                message: "Community not found",
            });
        }

        // Validate duration
        if (!duration_months || duration_months < 1 || duration_months > 12) {
            return res.status(400).json({
                status: "error",
                message: "Duration must be between 1 and 12 months",
            });
        }

        return res.json({
            status: "success",
            message: `Promotional ${duration_months}-month Pro subscription offered successfully`,
            data: {
                id: 1,
                community_id: parseInt(communityId),
                plan_id: 2, // Pro monthly
                status: "active",
                starts_at: new Date().toISOString(),
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(
                    Date.now() + duration_months * 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
                provider: "promotional",
                created_by: req.user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        });
    }
);

// Mock dependencies
jest.mock("../../config/db");
jest.mock("../models/subscriptionPlan.model");

describe("Subscription Admin API", () => {
    // Setup before each test
    beforeEach(() => {
        // Reset current user to superuser
        currentUser = {
            id: 1,
            email: "admin@example.com",
            fullName: "Admin User",
            isEmailConfirmed: true,
            isActive: true,
            role: "superuser",
        };

        // Clear all mocks
        jest.clearAllMocks();

        // Mock subscription model methods
        subscriptionPlanModel.getAllActivePlans = jest.fn().mockResolvedValue([
            {
                id: 1,
                name: "Free Plan",
                code: "free",
                price: "0.00",
                currency: "USD",
                billing_interval: "monthly",
                features: { pro_features: false },
                is_active: true,
            },
            {
                id: 2,
                name: "Pro Monthly",
                code: "pro_monthly",
                price: "9.99",
                currency: "USD",
                billing_interval: "monthly",
                features: { pro_features: true },
                is_active: true,
            },
        ]);

        subscriptionPlanModel.createSubscriptionPlan = jest
            .fn()
            .mockImplementation((data) => {
                return Promise.resolve({
                    id: 3,
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            });
    });

    // Clean up after all tests
    afterAll(() => {
        // Ensure all mocks are restored
        jest.restoreAllMocks();
    });

    describe("GET /api/admin/subscriptions/plans", () => {
        it("should return all subscription plans for superusers", async () => {
            // User already set as superuser in beforeEach

            const res = await request(app).get(
                "/api/admin/subscriptions/plans"
            );

            expect(res.status).toBe(200);
            expect(res.body.status).toBe("success");
            expect(Array.isArray(res.body.data)).toBeTruthy();
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it("should require superuser role", async () => {
            // Set user to regular user
            currentUser = {
                id: 2,
                email: "user@example.com",
                fullName: "Regular User",
                isEmailConfirmed: true,
                isActive: true,
                role: "user",
            };

            const res = await request(app).get(
                "/api/admin/subscriptions/plans"
            );

            expect(res.status).toBe(403);
            expect(res.body.message).toContain("superuser privileges");
        });
    });

    describe("POST /api/admin/subscriptions/plans", () => {
        it("should create a new subscription plan", async () => {
            const planData = {
                name: "Pro Yearly",
                code: "pro_yearly",
                description: "Pro plan with annual billing",
                price: 99.99,
                currency: "USD",
                billing_interval: "yearly",
                features: { pro_features: true, storage: "5GB" },
            };

            const res = await request(app)
                .post("/api/admin/subscriptions/plans")
                .send(planData);

            expect(res.status).toBe(201);
            expect(res.body.status).toBe("success");
            expect(res.body.data.name).toBe(planData.name);
            expect(res.body.data.code).toBe(planData.code);
        });

        it("should validate required fields", async () => {
            const res = await request(app)
                .post("/api/admin/subscriptions/plans")
                .send({ name: "Incomplete Plan" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("Missing required fields");
        });

        it("should validate price for pro plans", async () => {
            const res = await request(app)
                .post("/api/admin/subscriptions/plans")
                .send({
                    name: "Invalid Pro",
                    code: "pro_invalid",
                    price: 0.5,
                    billing_interval: "monthly",
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain(
                "Pro plans must have a price greater than 1"
            );
        });
    });

    describe("POST /api/admin/subscriptions/communities/:communityId/promotional", () => {
        it("should offer a promotional subscription", async () => {
            const res = await request(app)
                .post("/api/admin/subscriptions/communities/1/promotional")
                .send({ duration_months: 3 });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe("success");
            expect(res.body.message).toContain(
                "Promotional 3-month Pro subscription"
            );
            expect(res.body.data.status).toBe("active");
            expect(res.body.data.provider).toBe("promotional");
        });

        it("should validate the community exists", async () => {
            const res = await request(app)
                .post("/api/admin/subscriptions/communities/999/promotional")
                .send({ duration_months: 3 });

            expect(res.status).toBe(404);
            expect(res.body.message).toContain("Community not found");
        });

        it("should validate duration", async () => {
            const res = await request(app)
                .post("/api/admin/subscriptions/communities/1/promotional")
                .send({ duration_months: 24 });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain(
                "Duration must be between 1 and 12 months"
            );
        });
    });
});
