// src/help/tests/helpEntry.test.js
const request = require("supertest");
const express = require("express");
const app = express();
const HelpEntryModel = require("../models/helpEntry.model");
const HelpTopicModel = require("../models/helpTopic.model");
const HelpRelatedModel = require("../models/helpRelated.model");
const HelpImageModel = require("../models/image.model");

// Mock middleware
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
jest.mock("../models/helpEntry.model");
jest.mock("../models/helpTopic.model");
jest.mock("../models/helpRelated.model");
jest.mock("../models/image.model");

// Register routes
const helpEntryRoutes = require("../routes/helpEntry.routes");
app.use(express.json());
app.use("/api/help/entries", helpEntryRoutes);

describe("Help Entry Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementation for topics
        const mockTopic = {
        id: 1,
        name: "Getting Started",
        description: "Basic topics for beginners",
        unique_url: "getting-started",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
        };
        
        // Default mock implementation for entries
        const mockEntry = {
        id: 1,
        help_topic_id: 1,
        title: "How to Create an Account",
        unique_url: "how-to-create-account",
        content: "Detailed steps to create an account...",
        access_level: "public",
        position: 0,
        is_active: true,
        view_count: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        topic_name: "Getting Started",
        topic_url: "getting-started"
        };
        
        // Mock getTopicById
        HelpTopicModel.getTopicById.mockResolvedValue(mockTopic);
        
        // Mock createEntry
        HelpEntryModel.createEntry.mockResolvedValue(mockEntry);
        
        // Mock updateEntry
        HelpEntryModel.updateEntry.mockResolvedValue({
        ...mockEntry,
        title: "Updated Title",
        updated_at: new Date().toISOString()
        });
        
        // Mock deleteEntry
        HelpEntryModel.deleteEntry.mockResolvedValue(mockEntry);
        
        // Mock getEntryById
        HelpEntryModel.getEntryById.mockResolvedValue(mockEntry);
        
        // Mock getEntryByUrl
        HelpEntryModel.getEntryByUrl.mockResolvedValue(mockEntry);
        
        // Mock getAllEntries
        HelpEntryModel.getAllEntries.mockResolvedValue([
        mockEntry,
        {
            id: 2,
            help_topic_id: 1,
            title: "How to Reset Password",
            unique_url: "how-to-reset-password",
            content: "Steps to reset your password...",
            access_level: "public",
            position: 1,
            is_active: true,
            view_count: 5,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            topic_name: "Getting Started",
            topic_url: "getting-started"
        }
        ]);
        
        // Mock entryExists
        HelpEntryModel.entryExists.mockResolvedValue(false);
        
        // Mock incrementViewCount
        HelpEntryModel.incrementViewCount.mockResolvedValue(11);
        
        // Mock updateRelatedEntries
        HelpRelatedModel.updateRelatedEntries.mockResolvedValue([]);
        
        // Mock getRelatedEntries
        HelpRelatedModel.getRelatedEntries.mockResolvedValue([]);
        
        // Mock getImagesByHelpEntryId
        HelpImageModel.getImagesByHelpEntryId.mockResolvedValue([]);
        
        // Mock saveImage
        HelpImageModel.saveImage.mockResolvedValue({
        id: 1,
        entity_type: 'help_entry',
        entity_id: 1,
        image_type: 'cover',
        position: 0,
        provider: 's3',
        key: 'help/entry-1/cover.jpg',
        alt_text: 'Cover image',
        created_at: new Date().toISOString()
        });
    });

    describe("Create Entry", () => {
        it("should create a new entry for superuser", async () => {
        // Arrange
        const entryData = {
            help_topic_id: 1,
            title: "How to Create an Account",
            unique_url: "how-to-create-account",
            content: "Detailed steps to create an account...",
            access_level: "public",
            position: 0,
            is_active: true,
            related_entries: [2, 3]
        };

        // Act
        const response = await request(app)
            .post("/api/help/entries")
            .send(entryData);

        // Assert
        expect(response.status).toBe(201);
        expect(HelpEntryModel.createEntry).toHaveBeenCalledWith({
            help_topic_id: 1,
            title: "How to Create an Account",
            unique_url: "how-to-create-account",
            content: "Detailed steps to create an account...",
            access_level: "public",
            position: 0,
            is_active: true
        });
        expect(HelpRelatedModel.updateRelatedEntries).toHaveBeenCalledWith(1, [2, 3]);
        });

        it("should create an entry with cover image", async () => {
        // Arrange
        const entryData = {
            help_topic_id: 1,
            title: "How to Create an Account",
            unique_url: "how-to-create-account",
            content: "Detailed steps to create an account...",
            cover_image: {
            key: "help/temp/cover.jpg",
            provider: "s3",
            alt_text: "Cover image"
            }
        };

        // Act
        const response = await request(app)
            .post("/api/help/entries")
            .send(entryData);

        // Assert
        expect(response.status).toBe(201);
        expect(HelpEntryModel.createEntry).toHaveBeenCalled();
        expect(HelpImageModel.saveImage).toHaveBeenCalledWith({
            entity_id: 1,
            image_type: 'cover',
            position: 0,
            provider: 's3',
            key: 'help/temp/cover.jpg',
            alt_text: 'Cover image'
        });
        });

        it("should reject entry creation for non-staff/superuser", async () => {
        // Modify auth middleware for this test only
        const originalAuth = require("../../middleware/auth").authenticate;
        require("../../middleware/auth").authenticate = (req, res, next) => {
            req.user = { id: 2, email: "regular@example.com", role: "user" };
            next();
        };

        // Arrange
        const entryData = {
            help_topic_id: 1,
            title: "How to Create an Account",
            unique_url: "how-to-create-account",
            content: "Detailed steps to create an account..."
        };

        // Act
        const response = await request(app)
            .post("/api/help/entries")
            .send(entryData);

        // Assert
        expect(response.status).toBe(403);
        
        // Restore original mock
        require("../../middleware/auth").authenticate = originalAuth;
        });

        it("should handle validation errors", async () => {
        // Arrange
        const invalidData = {
            content: "Missing title, topic ID, and URL",
        };

        // Act
        const response = await request(app)
            .post("/api/help/entries")
            .send(invalidData);

        // Assert
        expect(response.status).toBe(400);
        expect(HelpEntryModel.createEntry).not.toHaveBeenCalled();
        });

        it("should handle invalid topic ID", async () => {
        // Arrange
        HelpTopicModel.getTopicById.mockResolvedValue(null);
        
        const entryData = {
            help_topic_id: 999,
            title: "How to Create an Account",
            unique_url: "how-to-create-account",
            content: "Detailed steps to create an account..."
        };

        // Act
        const response = await request(app)
            .post("/api/help/entries")
            .send(entryData);

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.message).toContain("Topic with ID 999 not found");
        });

        it("should handle duplicate URL", async () => {
        // Arrange
        HelpEntryModel.entryExists.mockResolvedValue(true);
        
        const entryData = {
            help_topic_id: 1,
            title: "How to Create an Account",
            unique_url: "existing-url",
            content: "Detailed steps to create an account..."
        };

        // Act
        const response = await request(app)
            .post("/api/help/entries")
            .send(entryData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.message).toContain("already exists");
        });
    });

    describe("Update Entry", () => {
        it("should update an existing entry for superuser", async () => {
        // Arrange
        const entryData = {
            title: "Updated Title",
            content: "Updated content",
            related_entries: [3, 4]
        };

        // Act
        const response = await request(app)
            .put("/api/help/entries/1")
            .send(entryData);

        // Assert
        expect(response.status).toBe(200);
        expect(HelpEntryModel.updateEntry).toHaveBeenCalledWith("1", expect.objectContaining({
            title: "Updated Title",
            content: "Updated content"
        }));
        expect(HelpRelatedModel.updateRelatedEntries).toHaveBeenCalledWith("1", [3, 4]);
        });

        it("should update entry with new cover image", async () => {
        // Arrange
        const entryData = {
            title: "Updated Title",
            cover_image: {
            key: "help/temp/new-cover.jpg",
            provider: "s3",
            alt_text: "New cover image"
            }
        };

        // Act
        const response = await request(app)
            .put("/api/help/entries/1")
            .send(entryData);

        // Assert
        expect(response.status).toBe(200);
        expect(HelpEntryModel.updateEntry).toHaveBeenCalled();
        expect(HelpImageModel.saveImage).toHaveBeenCalledWith(expect.objectContaining({
            entity_id: "1",
            image_type: 'cover',
            key: 'help/temp/new-cover.jpg'
        }));
        });

        it("should remove cover image when requested", async () => {
        // Arrange
        const entryData = {
            title: "Updated Title",
            cover_image: {
            remove: true
            }
        };

        // Act
        const response = await request(app)
            .put("/api/help/entries/1")
            .send(entryData);

        // Assert
        expect(response.status).toBe(200);
        expect(HelpEntryModel.updateEntry).toHaveBeenCalled();
        expect(HelpImageModel.deleteImageByTypeAndEntryId).toHaveBeenCalled();
        });

        it("should reject entry update for non-staff/superuser", async () => {
        // Modify auth middleware for this test only
        const originalAuth = require("../../middleware/auth").authenticate;
        require("../../middleware/auth").authenticate = (req, res, next) => {
            req.user = { id: 2, email: "regular@example.com", role: "user" };
            next();
        };

        // Arrange
        const entryData = {
            title: "Updated Title"
        };

        // Act
        const response = await request(app)
            .put("/api/help/entries/1")
            .send(entryData);

        // Assert
        expect(response.status).toBe(403);
        
        // Restore original mock
        require("../../middleware/auth").authenticate = originalAuth;
        });

        it("should handle entry not found", async () => {
        // Arrange
        HelpEntryModel.getEntryById.mockResolvedValue(null);
        
        const entryData = {
            title: "Updated Title"
        };

        // Act
        const response = await request(app)
            .put("/api/help/entries/999")
            .send(entryData);

        // Assert
        expect(response.status).toBe(404);
        });

        it("should handle invalid topic ID when updating", async () => {
        // Arrange
        HelpTopicModel.getTopicById.mockResolvedValue(null);
        
        const entryData = {
            help_topic_id: 999,
            title: "Updated Title"
        };

        // Act
        const response = await request(app)
            .put("/api/help/entries/1")
            .send(entryData);

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.message).toContain("Topic with ID 999 not found");
        });

        it("should handle duplicate URL when updating", async () => {
        // Arrange
        HelpEntryModel.entryExists.mockResolvedValue(true);
        
        const entryData = {
            unique_url: "existing-url"
        };

        // Act
        const response = await request(app)
            .put("/api/help/entries/1")
            .send(entryData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.message).toContain("already exists");
        });
    });

    describe("Delete Entry", () => {
        it("should delete an entry for superuser", async () => {
        // Act
        const response = await request(app)
            .delete("/api/help/entries/1");

        // Assert
        expect(response.status).toBe(200);
        expect(HelpEntryModel.deleteEntry).toHaveBeenCalledWith("1");
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
            .delete("/api/help/entries/1");

        // Assert
        expect(response.status).toBe(403);
        
        // Restore original mock
        require("../../middleware/auth").authenticate = originalAuth;
        });

        it("should handle entry not found", async () => {
        // Arrange
        HelpEntryModel.getEntryById.mockResolvedValue(null);

        // Act
        const response = await request(app)
            .delete("/api/help/entries/999");

        // Assert
        expect(response.status).toBe(404);
        });
    });

    describe("Get Entry by ID", () => {
        it("should get an entry by ID", async () => {
        // Act
        const response = await request(app)
            .get("/api/help/entries/1");

        // Assert
        expect(response.status).toBe(200);
        expect(HelpEntryModel.getEntryById).toHaveBeenCalledWith("1");
        expect(HelpEntryModel.incrementViewCount).toHaveBeenCalledWith("1");
        });

        it("should handle entry not found", async () => {
        // Arrange
        HelpEntryModel.getEntryById.mockResolvedValue(null);

        // Act
        const response = await request(app)
            .get("/api/help/entries/999");

        // Assert
        expect(response.status).toBe(404);
        });

        it("should restrict access to staff-only content", async () => {
        // Arrange
        HelpEntryModel.getEntryById.mockResolvedValue({
            ...HelpEntryModel.getEntryById.mock.results[0].value,
            access_level: "staff"
        });

        // Act
        const response = await request(app)
            .get("/api/help/entries/1");

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.message).toContain("Authentication required");
        });

        it("should allow staff to access staff-only content", async () => {
        // Modify optionalAuth middleware for this test only
        const originalAuth = require("../../middleware/optionalAuth");
        require("../../middleware/optionalAuth") = (req, res, next) => {
            req.user = { id: 3, email: "staff@example.com", role: "staff" };
            next();
        };

        // Arrange
        HelpEntryModel.getEntryById.mockResolvedValue({
            ...HelpEntryModel.getEntryById.mock.results[0].value,
            access_level: "staff"
        });

        // Act
        const response = await request(app)
            .get("/api/help/entries/1");

        // Assert
        expect(response.status).toBe(200);
        
        // Restore original mock
        require("../../middleware/optionalAuth") = originalAuth;
        });
    });

    describe("Get Entry by URL", () => {
        it("should get an entry by URL", async () => {
        // Act
        const response = await request(app)
            .get("/api/help/entries/url/how-to-create-account");

        // Assert
        expect(response.status).toBe(200);
        expect(HelpEntryModel.getEntryByUrl).toHaveBeenCalledWith("how-to-create-account");
        expect(HelpEntryModel.incrementViewCount).toHaveBeenCalled();
        });

        it("should handle entry not found", async () => {
        // Arrange
        HelpEntryModel.getEntryByUrl.mockResolvedValue(null);

        // Act
        const response = await request(app)
            .get("/api/help/entries/url/non-existent");

        // Assert
        expect(response.status).toBe(404);
        });

        it("should include cover image in response", async () => {
        // Arrange
        HelpImageModel.getImagesByHelpEntryId.mockResolvedValue([
            {
            id: 1,
            entity_type: 'help_entry',
            entity_id: 1,
            image_type: 'cover',
            position: 0,
            provider: 's3',
            key: 'help/entry-1/cover.jpg',
            alt_text: 'Cover image',
            created_at: new Date().toISOString()
            }
        ]);

        // Act
        const response = await request(app)
            .get("/api/help/entries/url/how-to-create-account");

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.entry).toHaveProperty('cover_image');
        expect(response.body.data.entry.cover_image).not.toBeNull();
        });
    });

    describe("Get All Entries", () => {
        it("should get all entries", async () => {
            // Act
            const response = await request(app)
                .get("/api/help/entries");

            // Assert
            expect(response.status).toBe(200);
            expect(HelpEntryModel.getAllEntries).toHaveBeenCalled();
            expect(response.body.data.entries.length).toBe(2);
        });

        it("should filter entries by topic ID", async () => {
            // Act
            const response = await request(app)
                .get("/api/help/entries?topic_id=1");

            // Assert
            expect(response.status).toBe(200);
            expect(HelpEntryModel.getAllEntries).toHaveBeenCalledWith(
                expect.objectContaining({
                    topicId: "1"
                })
            );
        });

        it("should filter entries by is_active status", async () => {
            // Act
            const response = await request(app)
                .get("/api/help/entries?is_active=false");

            // Assert
            expect(response.status).toBe(200);
            expect(HelpEntryModel.getAllEntries).toHaveBeenCalledWith(
                expect.objectContaining({
                isActive: false
                })
            );
        });

        it("should include content previews instead of full content", async () => {
            // Arrange
            const longContent = "This is a very long content that should be truncated in the preview. ".repeat(10);
            HelpEntryModel.getAllEntries.mockResolvedValue([
                {
                ...HelpEntryModel.getAllEntries.mock.results[0].value[0],
                content: longContent
                }
            ]);

            // Act
            const response = await request(app)
                .get("/api/help/entries");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.data.entries[0]).toHaveProperty('content_preview');
            expect(response.body.data.entries[0]).not.toHaveProperty('content');
            expect(response.body.data.entries[0].content_preview.length).toBeLessThan(longContent.length);
        });
    });
});