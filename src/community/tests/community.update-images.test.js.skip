// community.update-images.test.js

const communityUpdateController = require("../controllers/communityUpdate.controller");
const communityModel = require("../models/community.model");
const communityImageModel = require("../models/image.model"); // Renamed to match controller
const communityAdminModel = require("../models/communityAdmin.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../models/image.model");
jest.mock("../models/communityAdmin.model");
jest.mock("../../utils/ApiError");

describe("CommunityUpdateController - Image Updates", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                id: 1,
            },
            body: {
                provider: "s3",
                key: "communities/1/profile-image.jpg",
                alt_text: "Community profile image",
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
            name: "Test Community",
            unique_url: "test-community",
        });

        communityModel.checkMemberRole.mockResolvedValue(true);

        // Set up the image model methods
        const profileImage = {
            id: 5,
            entity_type: "community",
            entity_id: 1,
            image_type: "profile",
            provider: "local",
            key: "old-image.jpg",
            alt_text: "Old image",
        };

        const coverImage = {
            id: 6,
            entity_type: "community",
            entity_id: 1,
            image_type: "banner",
            provider: "local",
            key: "old-banner.jpg",
            alt_text: "Old banner",
        };

        // Mock getProfileImage and getCoverImage methods
        communityImageModel.getProfileImage = jest
            .fn()
            .mockResolvedValue(profileImage);
        communityImageModel.getCoverImage = jest
            .fn()
            .mockResolvedValue(coverImage);

        communityImageModel.update.mockResolvedValue({
            id: 5,
            entity_type: "community",
            entity_id: 1,
            provider: "s3",
            key: "communities/1/profile-image.jpg",
            alt_text: "Community profile image",
        });

        communityImageModel.create.mockResolvedValue({
            id: 10,
            entity_type: "community",
            entity_id: 1,
            provider: "s3",
            key: "communities/1/profile-image.jpg",
            alt_text: "Community profile image",
        });

        communityAdminModel.createAuditLog.mockResolvedValue({});
    });

    describe("updateProfileImage", () => {
        it("should update existing profile image successfully", async () => {
            await communityUpdateController.updateProfileImage(req, res, next);

            expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
            expect(communityModel.checkMemberRole).toHaveBeenCalledWith(1, 3, [
                "owner",
                "organizer",
            ]);
            expect(communityImageModel.getProfileImage).toHaveBeenCalledWith(1);
            expect(communityImageModel.update).toHaveBeenCalledWith(5, {
                provider: "s3",
                key: "communities/1/profile-image.jpg",
                alt_text: "Community profile image",
            });
            expect(communityAdminModel.createAuditLog).toHaveBeenCalled();

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    message: "Community profile image updated successfully",
                })
            );

            expect(next).not.toHaveBeenCalled();
        });

        it("should create new profile image if none exists", async () => {
            communityImageModel.getProfileImage.mockResolvedValue(null);

            await communityUpdateController.updateProfileImage(req, res, next);

            expect(communityImageModel.create).toHaveBeenCalledWith({
                entity_id: 1,
                image_type: "profile",
                provider: "s3",
                key: "communities/1/profile-image.jpg",
                alt_text: "Community profile image",
            });
            expect(res.json).toHaveBeenCalled();
        });

        it("should handle optional alt_text", async () => {
            req.body.alt_text = undefined;

            await communityUpdateController.updateProfileImage(req, res, next);

            expect(communityImageModel.update).toHaveBeenCalledWith(5, {
                provider: "s3",
                key: "communities/1/profile-image.jpg",
                alt_text: null,
            });
            expect(res.json).toHaveBeenCalled();
        });

        it("should return 403 if user doesn't have permission", async () => {
            communityModel.checkMemberRole.mockResolvedValue(false);

            await communityUpdateController.updateProfileImage(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "You don't have permission to update this community",
                403
            );
        });

        it("should handle database errors properly", async () => {
            const dbError = new Error("Database error");
            communityImageModel.update.mockRejectedValue(dbError);

            await communityUpdateController.updateProfileImage(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.json).not.toHaveBeenCalled();
        });
    });

    describe("updateCoverImage", () => {
        beforeEach(() => {
            // Re-initialize for cover image specific tests
            communityImageModel.getCoverImage.mockResolvedValue({
                id: 6,
                entity_type: "community",
                entity_id: 1,
                image_type: "banner",
                provider: "local",
                key: "old-banner.jpg",
                alt_text: "Old banner",
            });

            communityImageModel.update.mockResolvedValue({
                id: 6,
                entity_type: "community",
                entity_id: 1,
                image_type: "banner",
                provider: "s3",
                key: "communities/1/cover-image.jpg",
                alt_text: "Community cover image",
            });

            req.body = {
                provider: "s3",
                key: "communities/1/cover-image.jpg",
                alt_text: "Community cover image",
            };
        });

        it("should update existing cover image successfully", async () => {
            await communityUpdateController.updateCoverImage(req, res, next);

            expect(communityImageModel.getCoverImage).toHaveBeenCalledWith(1);
            expect(communityImageModel.update).toHaveBeenCalledWith(6, {
                provider: "s3",
                key: "communities/1/cover-image.jpg",
                alt_text: "Community cover image",
            });
            expect(communityAdminModel.createAuditLog).toHaveBeenCalled();

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    message: "Community cover image updated successfully",
                })
            );
        });

        it("should create new cover image if none exists", async () => {
            communityImageModel.getCoverImage.mockResolvedValue(null);

            await communityUpdateController.updateCoverImage(req, res, next);

            expect(communityImageModel.create).toHaveBeenCalledWith({
                entity_id: 1,
                image_type: "banner",
                provider: "s3",
                key: "communities/1/cover-image.jpg",
                alt_text: "Community cover image",
            });
            expect(res.json).toHaveBeenCalled();
        });

        it("should return 404 if community not found", async () => {
            communityModel.findByIdentifier.mockResolvedValue(null);

            await communityUpdateController.updateCoverImage(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(ApiError).toHaveBeenCalledWith(
                "Community not found or inactive",
                404
            );
        });
    });
});
