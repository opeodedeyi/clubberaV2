// src/help/tests/helpTopic.test.js
const request = require("supertest");
const express = require("express");
const app = express();
const HelpTopicModel = require("../models/helpTopic.model");
const HelpEntryModel = require("../models/helpEntry.model");

// Mock middleware
const mockAuth = jest.fn((req, res, next) => {
    req.user = { id: 1, email: "test@example.com", role: "superuser", isEmailConfirmed: true, isActive: true };
    next();
});

const mockRegularUserAuth = jest.fn((req, res, next) => {
    req.user = { id: 2, email: "regular@example.com", role: "user", isEmailConfirmed: true, isActive: true };
    next();
});

const mockStaffAuth = jest.fn((req, res, next) => {
    req.user = { id: 3, email: "staff@example.com", role: "staff", isEmailConfirmed: true, isActive: true };
    next();
});

const mockNoAuth = jest.fn((req, res, next) => {
    next();
});

jest.mock("../../middleware/auth", () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 1, email: "test@example.com", role: "superuser", isEmailConfirmed: true, isActive: true };
        next();
    },
}));

jest.mock("../../middleware/optionalAuth", () => (req, res, next) => {
    req.user = null; // By default, no user for public routes
    next();
});

// Mock requireRole middleware
jest.mock("../../middleware/role", () => ({
    requireRole: (roles) => (req, res, next) => {
        const userRole = req.user?.role || "user";
        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        
        if (requiredRoles.includes(userRole)) {
            next();
        } else {
            res.status(403).json({
                status: "error",
                message: "You do not have permission to access this resource",
            });
        }
    },
    requireActiveAccount: (req, res, next) => next(),
}));

// Mock ApiError
jest.mock("../../utils/ApiError", () => {
    return class ApiError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    };
});

// Mock models
jest.mock("../models/helpTopic.model");
jest.mock("../models/helpEntry.model");

// Register routes
const helpTopicRoutes = require("../routes/helpTopic.routes");
app.use(express.json());
app.use("/api/help/topics", helpTopicRoutes);

describe("Help Topic Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementation for topics
        const mockTopic = {
            id: 1,
            name: "Getting Started",
            description: "Basic topics for beginners",
            unique_url: "getting-started",
            position: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Mock createTopic
        HelpTopicModel.createTopic.mockResolvedValue(mockTopic);
        
        // Mock updateTopic
        HelpTopicModel.updateTopic.mockResolvedValue({
            ...mockTopic,
            name: "Updated Getting Started",
            updated_at: new Date().toISOString()
        });
        
        // Mock deleteTopic
        HelpTopicModel.deleteTopic.mockResolvedValue(mockTopic);
        
        // Mock getTopicById
        HelpTopicModel.getTopicById.mockResolvedValue(mockTopic);
        
        // Mock getTopicByUrl
        HelpTopicModel.getTopicByUrl.mockResolvedValue(mockTopic);
        
        // Mock getAllTopics
        HelpTopicModel.getAllTopics.mockResolvedValue([
            mockTopic,
            {
                id: 2,
                name: "Advanced Features",
                description: "Advanced topics for power users",
                unique_url: "advanced-features",
                position: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ]);
        
        // Mock topicExists
        HelpTopicModel.topicExists.mockResolvedValue(false);
        
        // Mock getEntriesByTopicUrl
        HelpEntryModel.getEntriesByTopicUrl.mockResolvedValue([
            {
                id: 1,
                help_topic_id: 1,
                title: "How to Create an Account",
                unique_url: "how-to-create-account",
                content: "Detailed steps to create an account...",
                access_level: "public",
                position: 0,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                topic_name: "Getting Started"
            }
        ]);
        
        // Mock getAllEntries
        HelpEntryModel.getAllEntries.mockResolvedValue([]);
    });

    describe("Create Topic", () => {
        it("should create a new topic for superuser", async () => {
            // Arrange
            const topicData = {
                name: "Getting Started",
                description: "Basic topics for beginners",
                unique_url: "getting-started",
                position: 0
            };

            // Act
            const response = await request(app)
                .post("/api/help/topics")
                .send(topicData);

            // Assert
            expect(response.status).toBe(201);
            expect(HelpTopicModel.createTopic).toHaveBeenCalledWith(topicData);
        });

        it("should reject topic creation for non-staff/superuser", async () => {
            // Modify auth middleware for this test only
            const originalAuth = require("../../middleware/auth").authenticate;
            require("../../middleware/auth").authenticate = (req, res, next) => {
                req.user = { id: 2, email: "regular@example.com", role: "user" };
                next();
            };

            // Arrange
            const topicData = {
                name: "Getting Started",
                description: "Basic topics for beginners",
                unique_url: "getting-started",
                position: 0
            };

            // Act
            const response = await request(app)
                .post("/api/help/topics")
                .send(topicData);

            // Assert
            expect(response.status).toBe(403);
            
            // Restore original mock
            require("../../middleware/auth").authenticate = originalAuth;
            });

            it("should handle validation errors", async () => {
            // Arrange
            const invalidData = {
                description: "Missing name and URL",
            };

            // Act
            const response = await request(app)
                .post("/api/help/topics")
                .send(invalidData);

            // Assert
            expect(response.status).toBe(400);
            expect(HelpTopicModel.createTopic).not.toHaveBeenCalled();
        });

        it("should handle duplicate URL", async () => {
            // Arrange
            HelpTopicModel.topicExists.mockResolvedValue(true);
            
            const topicData = {
                name: "Getting Started",
                description: "Basic topics for beginners",
                unique_url: "getting-started",
                position: 0
            };

            // Act
            const response = await request(app)
                .post("/api/help/topics")
                .send(topicData);

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.message).toContain("already exists");
        });
    });

    describe("Update Topic", () => {
        it("should update an existing topic for superuser", async () => {
            // Arrange
            const topicData = {
                name: "Updated Getting Started",
                description: "Updated description",
                unique_url: "getting-started",
                position: 1
            };

            // Act
            const response = await request(app)
                .put("/api/help/topics/1")
                .send(topicData);

            // Assert
            expect(response.status).toBe(200);
            expect(HelpTopicModel.updateTopic).toHaveBeenCalledWith("1", topicData);
        });

        it("should reject topic update for non-staff/superuser", async () => {
            // Modify auth middleware for this test only
            const originalAuth = require("../../middleware/auth").authenticate;
            require("../../middleware/auth").authenticate = (req, res, next) => {
                req.user = { id: 2, email: "regular@example.com", role: "user" };
                next();
            };

            // Arrange
            const topicData = {
                name: "Updated Getting Started"
            };

            // Act
            const response = await request(app)
                .put("/api/help/topics/1")
                .send(topicData);

            // Assert
            expect(response.status).toBe(403);
            
            // Restore original mock
            require("../../middleware/auth").authenticate = originalAuth;
        });

        it("should handle topic not found", async () => {
            // Arrange
            HelpTopicModel.getTopicById.mockResolvedValue(null);
            
            const topicData = {
                name: "Updated Title"
            };

            // Act
            const response = await request(app)
                .put("/api/help/topics/999")
                .send(topicData);

            // Assert
            expect(response.status).toBe(404);
        });

        it("should handle duplicate URL when updating", async () => {
            // Arrange
            HelpTopicModel.topicExists.mockResolvedValue(true);
            
            const topicData = {
                unique_url: "different-url"
            };

            // Act
            const response = await request(app)
                .put("/api/help/topics/1")
                .send(topicData);

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.message).toContain("already exists");
        });
    });

    describe("Delete Topic", () => {
        it("should delete a topic for superuser", async () => {
            // Act
            const response = await request(app)
                .delete("/api/help/topics/1");

            // Assert
            expect(response.status).toBe(200);
            expect(HelpTopicModel.deleteTopic).toHaveBeenCalledWith("1");
        });

        it("should reject deletion for non-staff/superuser", async () => {
            // Modify auth middleware for this test only
            const originalAuth = require("../../middleware/auth").authenticate;
            require("../../middleware/auth").authenticate = (req, res, next) => {
                req.user = { id: 2, email: "regular@example.com", role: "user" };
                next();
            };

            // Act
            const response = await request(app)
                .delete("/api/help/topics/1");

            // Assert
            expect(response.status).toBe(403);
            
            // Restore original mock
            require("../../middleware/auth").authenticate = originalAuth;
        });

        it("should handle topic not found", async () => {
            // Arrange
            HelpTopicModel.getTopicById.mockResolvedValue(null);

            // Act
            const response = await request(app)
                .delete("/api/help/topics/999");

            // Assert
            expect(response.status).toBe(404);
        });

        it("should prevent deletion of topics with entries", async () => {
            // Arrange
            HelpEntryModel.getAllEntries.mockResolvedValue([
                { id: 1, title: "Test Entry" }
            ]);

            // Act
            const response = await request(app)
                .delete("/api/help/topics/1");

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.message).toContain("Cannot delete topic with existing entries");
        });
    });

    describe("Get Topic by ID", () => {
        it("should get a topic by ID", async () => {
            // Act
            const response = await request(app)
                .get("/api/help/topics/1");

            // Assert
            expect(response.status).toBe(200);
            expect(HelpTopicModel.getTopicById).toHaveBeenCalledWith("1");
        });

        it("should handle topic not found", async () => {
            // Arrange
            HelpTopicModel.getTopicById.mockResolvedValue(null);

            // Act
            const response = await request(app)
                .get("/api/help/topics/999");

            // Assert
            expect(response.status).toBe(404);
        });
    });

    describe("Get Topic by URL", () => {
        it("should get a topic and its entries by URL", async () => {
            // Act
            const response = await request(app)
                .get("/api/help/topics/url/getting-started");

            // Assert
            expect(response.status).toBe(200);
            expect(HelpTopicModel.getTopicByUrl).toHaveBeenCalledWith("getting-started");
            expect(HelpEntryModel.getEntriesByTopicUrl).toHaveBeenCalled();
            expect(response.body.data).toHaveProperty("topic");
            expect(response.body.data).toHaveProperty("entries");
        });

        it("should handle topic not found", async () => {
            // Arrange
            HelpTopicModel.getTopicByUrl.mockResolvedValue(null);

            // Act
            const response = await request(app)
                .get("/api/help/topics/url/non-existent");

            // Assert
            expect(response.status).toBe(404);
        });

        it("should filter entries by access level for logged-in users", async () => {
            // Modify optionalAuth middleware for this test only
            const originalAuth = require("../../middleware/optionalAuth");
            require("../../middleware/optionalAuth") = (req, res, next) => {
                req.user = { id: 2, email: "regular@example.com", role: "user" };
                next();
            };

            // Act
            const response = await request(app)
                .get("/api/help/topics/url/getting-started");

            // Assert
            expect(response.status).toBe(200);
            expect(HelpEntryModel.getEntriesByTopicUrl).toHaveBeenCalledWith(
                "getting-started",
                "registered"
            );
            
            // Restore original mock
            require("../../middleware/optionalAuth") = originalAuth;
        });
    });

    describe("Get All Topics", () => {
        it("should get all topics", async () => {
            // Act
            const response = await request(app)
                .get("/api/help/topics");

            // Assert
            expect(response.status).toBe(200);
            expect(HelpTopicModel.getAllTopics).toHaveBeenCalled();
            expect(response.body.data.topics.length).toBe(2);
        });

        it("should include entry count for each topic", async () => {
            // Act
            const response = await request(app)
                .get("/api/help/topics");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data.topics[0]).toHaveProperty("entry_count");
        });
    });
});