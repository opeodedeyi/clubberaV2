// src/tag/tests/tag.test.js

// Mock dependencies before importing anything else
jest.mock("../../config/db");
jest.mock("../../middleware/auth", () => ({
    authenticate: jest.fn((req, res, next) => {
        // Add user info to request based on Authorization header
        if (req.headers.authorization === "Bearer admin-token") {
            req.user = {
                id: 3,
                email: "admin@example.com",
                role: "superuser",
                isActive: true,
            };
        } else if (req.headers.authorization === "Bearer staff-token") {
            req.user = {
                id: 2,
                email: "staff@example.com",
                role: "staff",
                isActive: true,
            };
        } else if (req.headers.authorization === "Bearer user-token") {
            req.user = {
                id: 1,
                email: "user@example.com",
                role: "user",
                isActive: true,
            };
        } else {
            return res.status(401).json({
                status: "error",
                message: "Authentication required",
            });
        }
        next();
    }),
}));

jest.mock("../../middleware/role", () => ({
    requireRole: jest.fn((roles) => (req, res, next) => {
        const requiredRoles = Array.isArray(roles) ? roles : [roles];

        if (!req.user || !requiredRoles.includes(req.user.role)) {
            return res.status(403).json({
                status: "error",
                message: "You do not have permission to access this resource",
            });
        }
        next();
    }),
}));

// Mock tag service and controllers
jest.mock("../services/tag.service", () => ({
    getAllTags: jest.fn().mockResolvedValue([
        { id: 1, name: "Technology", created_at: new Date() },
        { id: 2, name: "Design", created_at: new Date() },
        { id: 3, name: "Marketing", created_at: new Date() },
    ]),
    createTag: jest.fn((name) =>
        Promise.resolve({ id: 4, name, created_at: new Date() })
    ),
    updateTag: jest.fn((id, name) =>
        Promise.resolve({ id: parseInt(id), name, created_at: new Date() })
    ),
    deleteTag: jest.fn(() => Promise.resolve(true)),
}));

// Create mock controller - we're manually implementing simplified controller methods
jest.mock("../controllers/tag.controller", () => ({
    getAllTags: jest.fn((req, res) => {
        const TagService = require("../services/tag.service");
        TagService.getAllTags()
            .then((tags) =>
                res.status(200).json({ status: "success", data: tags })
            )
            .catch((err) =>
                res.status(500).json({ status: "error", message: err.message })
            );
    }),
    createTag: jest.fn((req, res) => {
        const TagService = require("../services/tag.service");
        TagService.createTag(req.body.name)
            .then((tag) =>
                res.status(201).json({
                    status: "success",
                    message: "Tag created successfully",
                    data: tag,
                })
            )
            .catch((err) =>
                res.status(400).json({ status: "error", message: err.message })
            );
    }),
    updateTag: jest.fn((req, res) => {
        const TagService = require("../services/tag.service");
        TagService.updateTag(req.params.id, req.body.name)
            .then((tag) =>
                res.status(200).json({
                    status: "success",
                    message: "Tag updated successfully",
                    data: tag,
                })
            )
            .catch((err) =>
                res.status(400).json({ status: "error", message: err.message })
            );
    }),
    deleteTag: jest.fn((req, res) => {
        const TagService = require("../services/tag.service");
        TagService.deleteTag(req.params.id)
            .then(() =>
                res.status(200).json({
                    status: "success",
                    message: "Tag deleted successfully",
                })
            )
            .catch((err) =>
                res.status(400).json({ status: "error", message: err.message })
            );
    }),
}));

// Create mock validator
jest.mock("../validators/tag.validator", () => ({
    validateTagCreation: [],
    validateTagUpdate: [],
}));

// Now import what you need for the test
const request = require("supertest");
const express = require("express");
const TagService = require("../services/tag.service");

// Setup app and import routes
const app = express();
app.use(express.json());
const tagRoutes = require("../routes/tag.routes");
app.use("/api/tags", tagRoutes);

describe("Tag Management Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /api/tags", () => {
        test("should return all tags without authentication", async () => {
            const response = await request(app)
                .get("/api/tags")
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.data).toHaveLength(3);
            expect(TagService.getAllTags).toHaveBeenCalled();
        });
    });

    describe("POST /api/tags", () => {
        test("should create tag when accessed by staff", async () => {
            const tagData = {
                name: "New Tag",
            };

            const response = await request(app)
                .post("/api/tags")
                .set("Authorization", "Bearer staff-token")
                .send(tagData)
                .expect("Content-Type", /json/)
                .expect(201);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain("Tag created successfully");
            expect(TagService.createTag).toHaveBeenCalledWith("New Tag");
        });

        test("should create tag when accessed by admin", async () => {
            const tagData = {
                name: "New Tag",
            };

            const response = await request(app)
                .post("/api/tags")
                .set("Authorization", "Bearer admin-token")
                .send(tagData)
                .expect("Content-Type", /json/)
                .expect(201);

            expect(response.body.status).toBe("success");
            expect(TagService.createTag).toHaveBeenCalledWith("New Tag");
        });

        test("should return 403 when accessed by regular user", async () => {
            const tagData = {
                name: "New Tag",
            };

            const response = await request(app)
                .post("/api/tags")
                .set("Authorization", "Bearer user-token")
                .send(tagData)
                .expect("Content-Type", /json/)
                .expect(403);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toContain("permission");
        });

        test("should return 401 when not authenticated", async () => {
            const tagData = {
                name: "New Tag",
            };

            const response = await request(app)
                .post("/api/tags")
                .send(tagData)
                .expect("Content-Type", /json/)
                .expect(401);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toContain("Authentication required");
        });
    });

    describe("PUT /api/tags/:id", () => {
        test("should update tag when accessed by staff", async () => {
            const tagData = {
                name: "Updated Tag",
            };

            const response = await request(app)
                .put("/api/tags/1")
                .set("Authorization", "Bearer staff-token")
                .send(tagData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain("Tag updated successfully");
            expect(TagService.updateTag).toHaveBeenCalledWith(
                "1",
                "Updated Tag"
            );
        });

        test("should update tag when accessed by admin", async () => {
            const tagData = {
                name: "Updated Tag",
            };

            const response = await request(app)
                .put("/api/tags/1")
                .set("Authorization", "Bearer admin-token")
                .send(tagData)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(TagService.updateTag).toHaveBeenCalledWith(
                "1",
                "Updated Tag"
            );
        });

        test("should return 403 when accessed by regular user", async () => {
            const tagData = {
                name: "Updated Tag",
            };

            const response = await request(app)
                .put("/api/tags/1")
                .set("Authorization", "Bearer user-token")
                .send(tagData)
                .expect("Content-Type", /json/)
                .expect(403);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toContain("permission");
        });
    });

    describe("DELETE /api/tags/:id", () => {
        test("should delete tag when accessed by admin", async () => {
            const response = await request(app)
                .delete("/api/tags/1")
                .set("Authorization", "Bearer admin-token")
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body.status).toBe("success");
            expect(response.body.message).toContain("Tag deleted successfully");
            expect(TagService.deleteTag).toHaveBeenCalledWith("1");
        });

        test("should return 403 when accessed by staff", async () => {
            const response = await request(app)
                .delete("/api/tags/1")
                .set("Authorization", "Bearer staff-token")
                .expect("Content-Type", /json/)
                .expect(403);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toContain("permission");
        });

        test("should return 403 when accessed by regular user", async () => {
            const response = await request(app)
                .delete("/api/tags/1")
                .set("Authorization", "Bearer user-token")
                .expect("Content-Type", /json/)
                .expect(403);

            expect(response.body.status).toBe("error");
            expect(response.body.message).toContain("permission");
        });
    });
});
