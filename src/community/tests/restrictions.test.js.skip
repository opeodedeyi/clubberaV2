// src/community/tests/restriction.test.js

const restrictionController = require("../controllers/restriction.controller");
const communityModel = require("../models/community.model");
const restrictionModel = require("../models/restriction.model");
const ApiError = require("../../utils/ApiError");

// Mock the models
jest.mock("../models/community.model");
jest.mock("../models/restriction.model");

describe("Community Restrictions", () => {
    // Mock data
    const testCommunity = {
        id: 1,
        name: "Test Community",
        unique_url: "test-community",
        is_private: false,
        is_active: true,
        created_by: 1,
    };

    // Define user roles for testing
    const OWNER_ID = 1;
    const ORGANIZER_ID = 2;
    const MODERATOR_ID = 3;
    const MEMBER_ID = 4;
    const NON_MEMBER_ID = 5;

    // Mock Express objects
    let req, res, next;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock Express req, res, next
        req = {
            params: {
                id: "1",
                userId: MEMBER_ID.toString(),
                restrictionId: "1",
            },
            user: {
                id: MODERATOR_ID,
                email: "moderator@example.com",
                role: "moderator",
            },
            body: {
                type: "mute",
                reason: "Test reason",
                expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        // Default model mock implementations
        communityModel.findByIdentifier = jest
            .fn()
            .mockResolvedValue(testCommunity);

        communityModel.checkMemberRole = jest
            .fn()
            .mockImplementation((communityId, userId, roles) => {
                // Owner role check
                if (
                    userId == OWNER_ID &&
                    (Array.isArray(roles)
                        ? roles.includes("owner")
                        : roles === "owner")
                )
                    return Promise.resolve(true);

                // Organizer role check
                if (
                    userId == ORGANIZER_ID &&
                    (Array.isArray(roles)
                        ? roles.includes("organizer")
                        : roles === "organizer")
                )
                    return Promise.resolve(true);

                // Moderator role check
                if (
                    userId == MODERATOR_ID &&
                    (Array.isArray(roles)
                        ? roles.includes("moderator")
                        : roles === "moderator")
                )
                    return Promise.resolve(true);

                // Member role check
                if (
                    userId == MEMBER_ID &&
                    (Array.isArray(roles)
                        ? roles.includes("member")
                        : roles === "member")
                )
                    return Promise.resolve(true);

                // Admin role group check (owner, organizer, moderator)
                if (
                    (userId == OWNER_ID ||
                        userId == ORGANIZER_ID ||
                        userId == MODERATOR_ID) &&
                    Array.isArray(roles) &&
                    (roles.includes("owner") ||
                        roles.includes("organizer") ||
                        roles.includes("moderator"))
                )
                    return Promise.resolve(true);

                // Any member check (includes all roles)
                if (
                    (userId == OWNER_ID ||
                        userId == ORGANIZER_ID ||
                        userId == MODERATOR_ID ||
                        userId == MEMBER_ID) &&
                    Array.isArray(roles) &&
                    (roles.includes("owner") ||
                        roles.includes("organizer") ||
                        roles.includes("moderator") ||
                        roles.includes("member"))
                )
                    return Promise.resolve(true);

                return Promise.resolve(false);
            });

        communityModel.removeMember = jest.fn().mockResolvedValue(true);

        restrictionModel.createRestriction = jest
            .fn()
            .mockImplementation((data) => {
                return Promise.resolve({
                    id: 1,
                    ...data,
                    created_at: new Date().toISOString(),
                });
            });

        restrictionModel.getUserRestrictions = jest.fn().mockResolvedValue([
            {
                id: 1,
                community_id: 1,
                user_id: MEMBER_ID,
                type: "mute",
                reason: "Test reason",
                applied_by: MODERATOR_ID,
                expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
                created_at: new Date().toISOString(),
            },
        ]);

        restrictionModel.getRestrictionById = jest
            .fn()
            .mockImplementation((id) => {
                if (id === "999") return Promise.resolve(null);

                if (id === "2") {
                    return Promise.resolve({
                        id: 2,
                        community_id: 1,
                        user_id: MEMBER_ID,
                        type: "mute",
                        reason: "Test reason",
                        applied_by: MODERATOR_ID,
                        expires_at: new Date(
                            Date.now() - 86400000
                        ).toISOString(), // 1 day in past
                        created_at: new Date(
                            Date.now() - 172800000
                        ).toISOString(), // 2 days ago
                    });
                }

                return Promise.resolve({
                    id: parseInt(id),
                    community_id: 1,
                    user_id: MEMBER_ID,
                    type: "mute",
                    reason: "Test reason",
                    applied_by: MODERATOR_ID,
                    expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
                    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                });
            });

        restrictionModel.removeRestriction = jest
            .fn()
            .mockImplementation((id) => {
                return Promise.resolve({
                    id: parseInt(id),
                    community_id: 1,
                    user_id: MEMBER_ID,
                    type: "mute",
                    reason: "Test reason",
                    applied_by: MODERATOR_ID,
                    expires_at: new Date().toISOString(), // Set to now
                    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                });
            });
    });

    describe("restrictMember", () => {
        it("should create a temporary mute restriction successfully", async () => {
            // Call the controller method directly
            await restrictionController.restrictMember(req, res, next);

            // Assertions
            expect(communityModel.findByIdentifier).toHaveBeenCalledWith("1");
            expect(communityModel.checkMemberRole).toHaveBeenCalled();
            expect(restrictionModel.createRestriction).toHaveBeenCalled();

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    message: expect.stringContaining("muted"),
                })
            );
        });

        it("should create a permanent ban successfully", async () => {
            // Change request body to a ban without expiration
            req.body = {
                type: "ban",
                reason: "Violation of community guidelines",
            };

            await restrictionController.restrictMember(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    message: expect.stringContaining("banned"),
                })
            );

            // Check if the member was removed for ban
            expect(communityModel.removeMember).toHaveBeenCalledWith(
                "1",
                req.params.userId
            );
        });

        it("should not allow restricting the community owner", async () => {
            // Set target to owner
            req.params.userId = OWNER_ID.toString();

            await restrictionController.restrictMember(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 403,
                    message: expect.stringContaining(
                        "Cannot restrict the community owner"
                    ),
                })
            );
        });

        it("should not allow moderators to restrict organizers", async () => {
            // Set target to organizer and requester to moderator
            req.params.userId = ORGANIZER_ID.toString();
            req.user.id = MODERATOR_ID;
            req.user.role = "moderator";

            await restrictionController.restrictMember(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 403,
                    message: expect.stringContaining(
                        "Only owners can restrict organizers"
                    ),
                })
            );
        });

        it("should allow owners to restrict organizers", async () => {
            // Set target to organizer and requester to owner
            req.params.userId = ORGANIZER_ID.toString();
            req.user.id = OWNER_ID;
            req.user.role = "owner";

            await restrictionController.restrictMember(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                })
            );
        });

        it("should validate expiration date format", async () => {
            // Invalid date format
            req.body.expires_at = "invalid-date";

            await restrictionController.restrictMember(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 400,
                    message: expect.stringContaining(
                        "Invalid expiration date format"
                    ),
                })
            );
        });

        it("should require expiration date to be in the future", async () => {
            // Past date
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            req.body.expires_at = yesterday.toISOString();

            await restrictionController.restrictMember(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 400,
                    message: expect.stringContaining("must be in the future"),
                })
            );
        });

        it("should return 404 if community is not found", async () => {
            // Mock community not found
            communityModel.findByIdentifier.mockResolvedValue(null);

            await restrictionController.restrictMember(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 404,
                    message: expect.stringContaining("not found"),
                })
            );
        });

        it("should return 403 if user does not have admin permissions", async () => {
            // Set user as regular member without admin permissions
            req.user.id = MEMBER_ID;
            req.user.role = "member";

            // Override the mock specifically for this test
            communityModel.checkMemberRole = jest
                .fn()
                .mockImplementation((communityId, userId, roles) => {
                    // If checking for admin roles and user is MEMBER_ID, return false
                    if (
                        Array.isArray(roles) &&
                        roles.some((r) =>
                            ["owner", "organizer", "moderator"].includes(r)
                        ) &&
                        userId == MEMBER_ID
                    ) {
                        return Promise.resolve(false);
                    }

                    // Return true for member role checks
                    if (
                        Array.isArray(roles) &&
                        roles.includes("member") &&
                        userId == MEMBER_ID
                    ) {
                        return Promise.resolve(true);
                    }

                    // Default implementation for other cases
                    return Promise.resolve(false);
                });

            await restrictionController.restrictMember(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 403,
                    message: expect.stringContaining("permission"),
                })
            );
        });

        it("should return 404 if target user is not a member", async () => {
            // Set target to non-member
            req.params.userId = NON_MEMBER_ID.toString();

            await restrictionController.restrictMember(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 404,
                    message: expect.stringContaining("not a member"),
                })
            );
        });
    });

    describe("getMemberRestrictions", () => {
        it("should get user restrictions successfully", async () => {
            await restrictionController.getMemberRestrictions(req, res, next);

            expect(communityModel.findByIdentifier).toHaveBeenCalledWith("1");
            expect(communityModel.checkMemberRole).toHaveBeenCalled();
            expect(restrictionModel.getUserRestrictions).toHaveBeenCalledWith(
                "1",
                req.params.userId
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    data: expect.any(Array),
                })
            );
        });

        it("should require admin permissions", async () => {
            // Set user as regular member
            req.user.id = MEMBER_ID;
            req.user.role = "member";

            // Override the mock for this specific test
            communityModel.checkMemberRole = jest
                .fn()
                .mockImplementation((communityId, userId, roles) => {
                    // If checking for admin roles and user is MEMBER_ID, return false
                    if (
                        Array.isArray(roles) &&
                        roles.some((r) =>
                            ["owner", "organizer", "moderator"].includes(r)
                        ) &&
                        userId == MEMBER_ID
                    ) {
                        return Promise.resolve(false);
                    }
                    return Promise.resolve(false);
                });

            await restrictionController.getMemberRestrictions(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 403,
                    message: expect.stringContaining("permission"),
                })
            );
        });

        it("should return 404 if community is not found", async () => {
            // Mock community not found
            communityModel.findByIdentifier.mockResolvedValue(null);

            await restrictionController.getMemberRestrictions(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 404,
                    message: expect.stringContaining("not found"),
                })
            );
        });

        it("should include status information for each restriction", async () => {
            // Mock mixed restrictions (active, expired, permanent)
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 86400000);
            const yesterday = new Date(now.getTime() - 86400000);

            restrictionModel.getUserRestrictions.mockResolvedValue([
                {
                    id: 1,
                    type: "mute",
                    expires_at: tomorrow.toISOString(), // Active (future)
                },
                {
                    id: 2,
                    type: "mute",
                    expires_at: yesterday.toISOString(), // Expired (past)
                },
                {
                    id: 3,
                    type: "ban",
                    expires_at: null, // Permanent
                },
            ]);

            await restrictionController.getMemberRestrictions(req, res, next);

            // Verify the enhanced restrictions contain status info
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            is_active: true,
                            status: "active",
                        }),
                        expect.objectContaining({
                            is_active: false,
                            status: "expired",
                        }),
                        expect.objectContaining({
                            is_permanent: true,
                            status: "permanent",
                        }),
                    ]),
                })
            );
        });
    });

    describe("removeRestriction", () => {
        it("should remove an active restriction successfully", async () => {
            await restrictionController.removeRestriction(req, res, next);

            expect(communityModel.findByIdentifier).toHaveBeenCalledWith("1");
            expect(communityModel.checkMemberRole).toHaveBeenCalled();
            expect(restrictionModel.getRestrictionById).toHaveBeenCalledWith(
                "1"
            );
            expect(restrictionModel.removeRestriction).toHaveBeenCalledWith(
                "1"
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    message: expect.stringContaining("removed"),
                })
            );
        });

        it("should not allow removing already expired restrictions", async () => {
            // Change to expired restriction ID
            req.params.restrictionId = "2";

            await restrictionController.removeRestriction(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 400,
                    message: expect.stringContaining("already expired"),
                })
            );
        });

        it("should return 404 for non-existent restrictions", async () => {
            // Change to non-existent restriction ID
            req.params.restrictionId = "999";

            await restrictionController.removeRestriction(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 404,
                    message: expect.stringContaining("not found"),
                })
            );
        });

        it("should require admin permissions", async () => {
            // Set user as regular member
            req.user.id = MEMBER_ID;
            req.user.role = "member";

            // Override the mock for this specific test
            communityModel.checkMemberRole = jest
                .fn()
                .mockImplementation((communityId, userId, roles) => {
                    // If checking for admin roles and user is MEMBER_ID, return false
                    if (
                        Array.isArray(roles) &&
                        roles.some((r) =>
                            ["owner", "organizer", "moderator"].includes(r)
                        ) &&
                        userId == MEMBER_ID
                    ) {
                        return Promise.resolve(false);
                    }
                    return Promise.resolve(false);
                });

            await restrictionController.removeRestriction(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 403,
                    message: expect.stringContaining("permission"),
                })
            );
        });

        it("should return 404 if community is not found", async () => {
            // Mock community not found
            communityModel.findByIdentifier.mockResolvedValue(null);

            await restrictionController.removeRestriction(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 404,
                    message: expect.stringContaining("not found"),
                })
            );
        });

        it("should validate that restriction belongs to specified community and user", async () => {
            // Mock mismatched community ID
            restrictionModel.getRestrictionById.mockResolvedValue({
                id: 1,
                community_id: 2, // Different from request community ID
                user_id: parseInt(req.params.userId),
                type: "mute",
                expires_at: new Date(Date.now() + 86400000).toISOString(),
            });

            await restrictionController.removeRestriction(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 400,
                    message: expect.stringContaining("does not match"),
                })
            );
        });
    });
});
