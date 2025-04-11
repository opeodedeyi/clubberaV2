// community.update-tags.test.js

const communityUpdateController = require("../controllers/communityUpdate.controller");
const communityModel = require("../models/community.model");
const communityTagModel = require("../models/tag.model");
const communityAdminModel = require("../models/communityAdmin.model");
const ApiError = require("../../utils/ApiError");
const db = require("../../config/db");

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../models/tag.model");
jest.mock("../models/communityAdmin.model");
jest.mock("../../utils/ApiError");
jest.mock("../../config/db", () => ({
    query: jest.fn(),
    executeTransaction: jest.fn(),
}));

describe("CommunityUpdateController - updateTags", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                id: 1,
            },
            body: {
                tags: ["programming", "technology", "community", "coding"],
            },
            user: {
                id: 3,
            },
        };
        res = {
            json: jest.fn(),
        };
        next = jest.fn();

        // Reset mocks
        jest.clearAllMocks();

        // Default successful mock implementations
        communityModel.findByIdentifier.mockResolvedValue({
            id: 1,
            name: "Tech Community",
            unique_url: "tech-community",
        });

        communityModel.checkMemberRole.mockResolvedValue(true);

        communityTagModel.getCommunityTags.mockResolvedValue([
            { id: 1, name: "old-tag-1" },
            { id: 2, name: "old-tag-2" },
        ]);

        // Mock assignTagByName method
        communityTagModel.assignTagByName = jest
            .fn()
            .mockImplementation((data) => {
                return Promise.resolve({
                    tag_id: 10,
                    entity_type: "community",
                    entity_id: data.community_id,
                    assignment_type: data.assignment_type || "category",
                });
            });

        // Simulate successful transaction execution for the whole operation
        db.executeTransaction.mockImplementation(async (operations) => {
            return [];
        });

        communityAdminModel.createAuditLog.mockResolvedValue({});
    });

    it("should update tags successfully with all new tags", async () => {
        // Second call to getCommunityTags will return the updated tags
        communityTagModel.getCommunityTags
            .mockResolvedValueOnce([
                { id: 1, name: "old-tag-1" },
                { id: 2, name: "old-tag-2" },
            ])
            .mockResolvedValueOnce([
                { id: 10, name: "programming" },
                { id: 11, name: "technology" },
                { id: 12, name: "community" },
                { id: 13, name: "coding" },
            ]);

        await communityUpdateController.updateTags(req, res, next);

        // Check permission verification
        expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
        expect(communityModel.checkMemberRole).toHaveBeenCalledWith(1, 3, [
            "owner",
            "organizer",
        ]);

        // Check current tags are fetched for audit
        expect(communityTagModel.getCommunityTags).toHaveBeenCalledWith(1);

        // Check transaction is used
        expect(db.executeTransaction).toHaveBeenCalled();

        // Check each tag is assigned
        expect(communityTagModel.assignTagByName).toHaveBeenCalledTimes(4);
        expect(communityTagModel.assignTagByName).toHaveBeenCalledWith(
            expect.objectContaining({
                community_id: 1,
                tag_name: expect.any(String),
                assignment_type: "category",
            })
        );

        // Check audit log is created
        expect(communityAdminModel.createAuditLog).toHaveBeenCalled();

        // Check response
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                message: "Community tags updated successfully",
                data: expect.objectContaining({
                    tags: expect.any(Array),
                }),
            })
        );

        expect(next).not.toHaveBeenCalled();
    });

    it("should handle empty tags array", async () => {
        req.body.tags = [];

        await communityUpdateController.updateTags(req, res, next);

        // No tags should be assigned
        expect(communityTagModel.assignTagByName).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalled();
    });

    it("should return 403 if user doesn't have permission", async () => {
        communityModel.checkMemberRole.mockResolvedValue(false);

        await communityUpdateController.updateTags(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "You don't have permission to update this community",
            403
        );

        // Transaction should not be started
        expect(db.executeTransaction).not.toHaveBeenCalled();
    });

    it("should handle transaction errors", async () => {
        // Simulate database error during transaction
        db.executeTransaction.mockRejectedValueOnce(
            new Error("Database error")
        );

        await communityUpdateController.updateTags(req, res, next);

        // Check error is passed to next
        expect(next).toHaveBeenCalledWith(expect.any(Error));

        // Response should not be sent
        expect(res.json).not.toHaveBeenCalled();
    });

    it("should properly format tags (trim and lowercase)", async () => {
        req.body.tags = ["  JavaScript  ", "NODEJS", " React ", "typescript"];

        await communityUpdateController.updateTags(req, res, next);

        // Check each tag is properly formatted when assigned
        expect(communityTagModel.assignTagByName).toHaveBeenCalledWith(
            expect.objectContaining({
                tag_name: "javascript",
            })
        );

        expect(communityTagModel.assignTagByName).toHaveBeenCalledWith(
            expect.objectContaining({
                tag_name: "nodejs",
            })
        );

        expect(communityTagModel.assignTagByName).toHaveBeenCalledWith(
            expect.objectContaining({
                tag_name: "react",
            })
        );

        expect(communityTagModel.assignTagByName).toHaveBeenCalledWith(
            expect.objectContaining({
                tag_name: "typescript",
            })
        );

        expect(res.json).toHaveBeenCalled();
    });
});
