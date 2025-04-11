// community.update-details.test.js

const communityUpdateController = require("../controllers/communityUpdate.controller");
const communityModel = require("../models/community.model");
const communityLocationModel = require("../models/location.model"); // Renamed to match controller
const communityAdminModel = require("../models/communityAdmin.model");
const ApiError = require("../../utils/ApiError");

// Mock dependencies
jest.mock("../models/community.model");
jest.mock("../models/location.model");
jest.mock("../models/communityAdmin.model");
jest.mock("../../utils/ApiError");

describe("CommunityUpdateController - updateBasicDetails", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                id: 1,
            },
            body: {
                name: "Updated Community Name",
                tagline: "New Tagline",
                description: "Updated description",
                guidelines: "Updated guidelines",
                is_private: true,
                location: {
                    city: "New City",
                    lat: 40.7128,
                    lng: -74.006,
                    address: "123 Main St",
                },
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
            name: "Original Community Name",
            tagline: "Original Tagline",
            description: "Original description",
            guidelines: "Original guidelines",
            is_private: false,
            unique_url: "test-community",
        });

        communityModel.checkMemberRole.mockResolvedValue(true);

        communityModel.update.mockResolvedValue({
            id: 1,
            name: "Updated Community Name",
            tagline: "New Tagline",
            description: "Updated description",
            guidelines: "Updated guidelines",
            is_private: true,
            unique_url: "test-community",
        });

        // Use findByCommunity instead of findByEntity
        communityLocationModel.findByCommunity = jest.fn().mockResolvedValue({
            id: 5,
            name: "Original City",
            lat: 34.0522,
            lng: -118.2437,
            address: "Original Address",
        });

        communityLocationModel.update.mockResolvedValue({
            id: 5,
            name: "New City",
            lat: 40.7128,
            lng: -74.006,
            address: "123 Main St",
        });

        communityAdminModel.createAuditLog.mockResolvedValue({});
    });

    it("should update community details successfully with all fields", async () => {
        await communityUpdateController.updateBasicDetails(req, res, next);

        expect(communityModel.findByIdentifier).toHaveBeenCalledWith(1);
        expect(communityModel.checkMemberRole).toHaveBeenCalledWith(1, 3, [
            "owner",
            "organizer",
        ]);
        expect(communityModel.update).toHaveBeenCalledWith(1, {
            name: "Updated Community Name",
            tagline: "New Tagline",
            description: "Updated description",
            guidelines: "Updated guidelines",
            is_private: true,
        });
        expect(communityLocationModel.update).toHaveBeenCalled();
        expect(communityAdminModel.createAuditLog).toHaveBeenCalled();

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "success",
                message: "Community details updated successfully",
                data: expect.objectContaining({
                    name: "Updated Community Name",
                    tagline: "New Tagline",
                    description: "Updated description",
                    guidelines: "Updated guidelines",
                    is_private: true,
                }),
            })
        );

        expect(next).not.toHaveBeenCalled();
    });

    it("should update only provided fields", async () => {
        // Only update name
        req.body = {
            name: "Updated Community Name",
        };

        await communityUpdateController.updateBasicDetails(req, res, next);

        expect(communityModel.update).toHaveBeenCalledWith(1, {
            name: "Updated Community Name",
        });
        expect(res.json).toHaveBeenCalled();
    });

    it("should update location when it's the only field provided", async () => {
        req.body = {
            location: {
                city: "New City",
                lat: 40.7128,
                lng: -74.006,
            },
        };

        await communityUpdateController.updateBasicDetails(req, res, next);

        expect(communityModel.update).not.toHaveBeenCalled();
        expect(communityLocationModel.update).toHaveBeenCalledWith(
            5,
            expect.objectContaining({
                name: "New City",
                lat: 40.7128,
                lng: -74.006,
            })
        );
        expect(res.json).toHaveBeenCalled();
    });

    it("should return 404 if community not found", async () => {
        communityModel.findByIdentifier.mockResolvedValue(null);

        await communityUpdateController.updateBasicDetails(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "Community not found or inactive",
            404
        );
    });

    it("should return 403 if user doesn't have permission", async () => {
        communityModel.checkMemberRole.mockResolvedValue(false);

        await communityUpdateController.updateBasicDetails(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(ApiError).toHaveBeenCalledWith(
            "You don't have permission to update this community",
            403
        );
    });

    it("should create new location if one doesn't exist", async () => {
        communityLocationModel.findByCommunity.mockResolvedValue(null);
        communityLocationModel.create.mockResolvedValue({
            id: 10,
            name: "New City",
            lat: 40.7128,
            lng: -74.006,
            address: "123 Main St",
        });

        await communityUpdateController.updateBasicDetails(req, res, next);

        expect(communityLocationModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                community_id: 1,
                name: "New City",
                location_type: "address",
                lat: 40.7128,
                lng: -74.006,
                address: "123 Main St",
            })
        );
        expect(res.json).toHaveBeenCalled();
    });

    it("should handle database errors properly", async () => {
        const dbError = new Error("Database error");
        communityModel.update.mockRejectedValue(dbError);

        await communityUpdateController.updateBasicDetails(req, res, next);

        expect(next).toHaveBeenCalledWith(dbError);
        expect(res.json).not.toHaveBeenCalled();
    });
});
