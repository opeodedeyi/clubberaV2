const communityModel = require("../models/community.model");
const communityLocationModel = require("../models/location.model"); // Renamed to match your implementation
const communityImageModel = require("../models/image.model"); // Renamed to match your implementation
const communityTagModel = require("../models/tag.model"); // Renamed to match your implementation
const communityAdminModel = require("../models/communityAdmin.model");
const ApiError = require("../../utils/ApiError");
const db = require("../../config/db");

class CommunityUpdateController {
    // Helper method to check if user has permission to update the community
    async _checkUpdatePermission(communityId, userId) {
        const community = await communityModel.findByIdentifier(communityId);
        if (!community) {
            throw new ApiError("Community not found or inactive", 404);
        }

        // Only owner and organizers can update community details
        const hasPermission = await communityModel.checkMemberRole(
            communityId,
            userId,
            ["owner", "organizer"]
        );

        if (!hasPermission) {
            throw new ApiError(
                "You don't have permission to update this community",
                403
            );
        }

        return community;
    }

    // Update basic community details
    async updateBasicDetails(req, res, next) {
        try {
            const communityId = parseInt(req.params.id);
            const userId = req.user.id;
            const { location, ...communityData } = req.body;

            // Check permissions
            const community = await this._checkUpdatePermission(
                communityId,
                userId
            );

            // Start tracking changes for audit
            const previousState = {
                community: {
                    name: community.name,
                    tagline: community.tagline,
                    description: community.description,
                    guidelines: community.guidelines,
                    is_private: community.is_private,
                },
            };

            // Only update community if there are fields to update
            let updatedCommunity = community;
            if (Object.keys(communityData).length > 0) {
                updatedCommunity = await communityModel.update(
                    communityId,
                    communityData
                );
            }

            // Handle location update if provided
            let locationData = null;
            if (location) {
                // Get current location for audit
                const currentLocation =
                    await communityLocationModel.findByCommunity(communityId);

                if (currentLocation) {
                    previousState.location = {
                        name: currentLocation.name,
                        lat: currentLocation.lat,
                        lng: currentLocation.lng,
                        address: currentLocation.address,
                    };

                    // Update existing location
                    locationData = await communityLocationModel.update(
                        currentLocation.id,
                        {
                            name: location.city || null,
                            lat: location.lat || null,
                            lng: location.lng || null,
                            address: location.address || null,
                        }
                    );
                } else {
                    // Create new location
                    locationData = await communityLocationModel.create({
                        community_id: communityId,
                        name: location.city || null,
                        location_type: "address",
                        lat: location.lat || null,
                        lng: location.lng || null,
                        address: location.address || null,
                    });
                }
            }

            // Prepare the new state for audit log
            const newState = {
                community: {
                    name: updatedCommunity.name,
                    tagline: updatedCommunity.tagline,
                    description: updatedCommunity.description,
                    guidelines: updatedCommunity.guidelines,
                    is_private: updatedCommunity.is_private,
                },
            };

            if (locationData) {
                newState.location = {
                    name: locationData.name,
                    lat: locationData.lat,
                    lng: locationData.lng,
                    address: locationData.address,
                };
            }

            // Only create audit log if something changed
            if (Object.keys(communityData).length > 0 || location) {
                await communityAdminModel.createAuditLog({
                    community_id: communityId,
                    user_id: userId,
                    action_type: "community_details_update",
                    previous_state: previousState,
                    new_state: newState,
                });
            }

            // Return the updated community with location
            res.json({
                status: "success",
                message: "Community details updated successfully",
                data: {
                    ...updatedCommunity,
                    location: locationData,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // Update profile image
    async updateProfileImage(req, res, next) {
        try {
            const communityId = parseInt(req.params.id);
            const userId = req.user.id;
            const { provider, key, alt_text } = req.body;

            // Check permissions
            await this._checkUpdatePermission(communityId, userId);

            // Check if profile image already exists
            let profileImage = await communityImageModel.getProfileImage(
                communityId
            );

            let previousImage = null;
            if (profileImage) {
                // Store previous image for audit
                previousImage = {
                    provider: profileImage.provider,
                    key: profileImage.key,
                    alt_text: profileImage.alt_text,
                };

                // Update existing image
                profileImage = await communityImageModel.update(
                    profileImage.id,
                    {
                        provider,
                        key,
                        alt_text: alt_text || null,
                    }
                );
            } else {
                // Create new image
                profileImage = await communityImageModel.create({
                    entity_id: communityId,
                    image_type: "profile",
                    provider,
                    key,
                    alt_text: alt_text || null,
                });
            }

            // Log the update in audit log
            await communityAdminModel.createAuditLog({
                community_id: communityId,
                user_id: userId,
                action_type: "profile_image_update",
                previous_state: previousImage
                    ? { profile_image: previousImage }
                    : undefined,
                new_state: {
                    profile_image: {
                        provider: profileImage.provider,
                        key: profileImage.key,
                        alt_text: profileImage.alt_text,
                    },
                },
            });

            res.json({
                status: "success",
                message: "Community profile image updated successfully",
                data: profileImage,
            });
        } catch (error) {
            next(error);
        }
    }

    // Update cover image
    async updateCoverImage(req, res, next) {
        try {
            const communityId = parseInt(req.params.id);
            const userId = req.user.id;
            const { provider, key, alt_text } = req.body;

            // Check permissions
            await this._checkUpdatePermission(communityId, userId);

            // Check if cover image already exists
            let coverImage = await communityImageModel.getCoverImage(
                communityId
            );

            let previousImage = null;
            if (coverImage) {
                // Store previous image for audit
                previousImage = {
                    provider: coverImage.provider,
                    key: coverImage.key,
                    alt_text: coverImage.alt_text,
                };

                // Update existing image
                coverImage = await communityImageModel.update(coverImage.id, {
                    provider,
                    key,
                    alt_text: alt_text || null,
                });
            } else {
                // Create new image
                coverImage = await communityImageModel.create({
                    entity_id: communityId,
                    image_type: "banner",
                    provider,
                    key,
                    alt_text: alt_text || null,
                });
            }

            // Log the update in audit log
            await communityAdminModel.createAuditLog({
                community_id: communityId,
                user_id: userId,
                action_type: "cover_image_update",
                previous_state: previousImage
                    ? { cover_image: previousImage }
                    : undefined,
                new_state: {
                    cover_image: {
                        provider: coverImage.provider,
                        key: coverImage.key,
                        alt_text: coverImage.alt_text,
                    },
                },
            });

            res.json({
                status: "success",
                message: "Community cover image updated successfully",
                data: coverImage,
            });
        } catch (error) {
            next(error);
        }
    }

    // Update community tags
    async updateTags(req, res, next) {
        try {
            const communityId = parseInt(req.params.id);
            const userId = req.user.id;
            const { tags } = req.body;

            // Check permissions
            await this._checkUpdatePermission(communityId, userId);

            // Get current tags for audit
            const currentTags = await communityTagModel.getCommunityTags(
                communityId
            );

            // Start transaction operations
            const operations = [];

            // Delete existing tags operation
            operations.push({
                text: `DELETE FROM tag_assignments 
                    WHERE entity_type = 'community' AND entity_id = $1`,
                values: [communityId],
            });

            // Execute transaction
            await db.executeTransaction(operations);

            // Add new tags (outside transaction since we'll use assignTagByName)
            const newTags = [];
            if (tags && tags.length > 0) {
                for (const tagName of tags) {
                    const trimmedTagName = tagName.trim().toLowerCase();
                    await communityTagModel.assignTagByName({
                        community_id: communityId,
                        tag_name: trimmedTagName,
                        assignment_type: "category",
                    });

                    newTags.push({
                        name: trimmedTagName,
                    });
                }
            }

            // Fetch the newly assigned tags with their IDs
            const updatedTags = await communityTagModel.getCommunityTags(
                communityId
            );

            // Log the update in audit log
            await communityAdminModel.createAuditLog({
                community_id: communityId,
                user_id: userId,
                action_type: "tags_update",
                previous_state: { tags: currentTags },
                new_state: { tags: updatedTags },
            });

            res.json({
                status: "success",
                message: "Community tags updated successfully",
                data: {
                    tags: updatedTags,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CommunityUpdateController();
