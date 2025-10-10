// src/event/controllers/event.controller.js
const EventModel = require("../models/event.model");
const ApiError = require("../../utils/ApiError");
const TimezoneHelper = require("../../utils/timezone.helper");
const CommunityPermissions = require("../../utils/community-permissions");

class EventController {
    async createEvent(req, res, next) {
        try {
            const userId = req.user.id;
            const { communityId: communityIdentifier } = req.params;

            // Resolve community identifier - handle both numeric IDs and unique URLs
            let communityId;
            if (!isNaN(communityIdentifier)) {
                // It's a numeric ID, use it directly
                communityId = parseInt(communityIdentifier);
            } else {
                // It's a unique URL, resolve it to get the ID
                const CommunityModel = require("../../community/models/community.model");
                const community = await CommunityModel.findByIdentifier(communityIdentifier);
                
                if (!community) {
                    throw new ApiError("Community not found", 404);
                }
                
                communityId = community.id;
            }

            // Check user's authorization to create events in this community
            const canCreateEvent = await CommunityPermissions.canCreateEvents(userId, communityId);
            if (!canCreateEvent.allowed) {
                throw new ApiError(canCreateEvent.reason, 403);
            }

            // Extract data from request body
            const {
                title,
                description,
                content,
                eventType,
                startTime,
                endTime,
                timezone,
                locationDetails,
                maxAttendees,
                isSupportersOnly,
                location,
                coverImage,
            } = req.body;

            // Prepare post data
            const postData = {
                communityId: communityId,
                content: content || "",
                isSupportersOnly: isSupportersOnly || false,
            };

            // Validate timezone if provided
            if (timezone && !TimezoneHelper.isValidTimezone(timezone)) {
                throw new ApiError("Invalid timezone provided", 400);
            }

            // Validate time format - should not include timezone info since we handle conversion
            if (startTime && /[Z]|[+-]\d{2}:?\d{2}$/.test(startTime)) {
                throw new ApiError(
                    "startTime should be in local time format (YYYY-MM-DDTHH:mm:ss) without timezone offset. Provide timezone separately.",
                    400
                );
            }

            if (endTime && /[Z]|[+-]\d{2}:?\d{2}$/.test(endTime)) {
                throw new ApiError(
                    "endTime should be in local time format (YYYY-MM-DDTHH:mm:ss) without timezone offset. Provide timezone separately.",
                    400
                );
            }

            // Prepare event data
            const eventData = {
                title,
                description,
                eventType,
                startTime,
                endTime,
                timezone: timezone || "UTC",
                locationDetails,
                maxAttendees,
            };

            // Create the event
            const result = await EventModel.createEvent(
                eventData,
                postData,
                userId,
                location
            );

            // If cover image is provided, save the image
            let coverImageData = null;
            if (coverImage && coverImage.key && coverImage.key.trim().length > 0) {
                const ImageModel = require("../models/image.model");
                coverImageData = await ImageModel.create({
                    entity_id: result.event.id,
                    entity_type: "event",
                    image_type: "cover",
                    provider: coverImage.provider || "s3",
                    key: coverImage.key,
                    alt_text: coverImage.alt_text || null,
                });
            }

            // Get the complete event with cover image
            const completeEvent = await EventModel.getEventById(result.event.id);

            // Send notification to all community members
            try {
                const NotificationService = require("../../notification/services/notification.service");
                await NotificationService.notifyNewEvent({
                    creatorId: userId,
                    communityId: communityId,
                    eventId: completeEvent.id,
                    eventTitle: completeEvent.title,
                    communityName: await this._getCommunityName(communityId),
                });
            } catch (error) {
                console.error("Error sending new event notification:", error);
                // Don't fail the request if notification fails
            }

            res.status(201).json({
                status: "success",
                data: {
                    event: completeEvent,
                    creatorAttendance: result.creatorAttendance
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getEvent(req, res, next) {
        try {
            const { eventId } = req.params;
            const userId = req.user?.id || null; // Get user ID if authenticated

            const result = await EventModel.getEventWithUserContext(parseInt(eventId), userId);

            // If user cannot access the event (private community)
            if (!result.canAccess) {
                return res.status(403).json({
                    status: "error",
                    message: result.reason,
                    data: {
                        canAccess: false,
                        community: result.community
                    }
                });
            }

            res.status(200).json({
                status: "success",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getEventByUrl(req, res, next) {
        try {
            const { uniqueUrl } = req.params;
            const userId = req.user?.id || null; // Get user ID if authenticated

            const result = await EventModel.getEventByUniqueUrlWithUserContext(uniqueUrl, userId);

            // If user cannot access the event (private community)
            if (!result.canAccess) {
                return res.status(403).json({
                    status: "error",
                    message: result.reason,
                    data: {
                        canAccess: false,
                        community: result.community
                    }
                });
            }

            res.status(200).json({
                status: "success",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async updateEvent(req, res, next) {
        try {
            const { eventId } = req.params;
            const userId = req.user.id;

            // Check if user can manage this event
            const canManage = await CommunityPermissions.canManageEvent(userId, parseInt(eventId));

            if (!canManage.allowed) {
                throw new ApiError(canManage.reason, 403);
            }

            // Get the current event to check if it has already started
            const currentEvent = await EventModel.getEventById(parseInt(eventId));
            const eventStartTime = new Date(currentEvent.startTime);
            const now = new Date();

            if (eventStartTime <= now) {
                throw new ApiError("Cannot update an event that has already started", 400);
            }

            // Extract data from request body - only allow editing specific fields
            const {
                title,
                description,
                startTime,
                endTime,
                timezone,
                locationDetails,
                maxAttendees,
                location,
                eventType,
            } = req.body;

            // Note: content and isSupportersOnly are not editable after creation

            // Validate timezone if provided
            if (timezone !== undefined && timezone && !TimezoneHelper.isValidTimezone(timezone)) {
                throw new ApiError("Invalid timezone provided", 400);
            }

            // Validate time format - should not include timezone info since we handle conversion
            if (startTime !== undefined && startTime && /[Z]|[+-]\d{2}:?\d{2}$/.test(startTime)) {
                throw new ApiError(
                    "startTime should be in local time format (YYYY-MM-DDTHH:mm:ss) without timezone offset. Provide timezone separately.",
                    400
                );
            }

            if (endTime !== undefined && endTime && /[Z]|[+-]\d{2}:?\d{2}$/.test(endTime)) {
                throw new ApiError(
                    "endTime should be in local time format (YYYY-MM-DDTHH:mm:ss) without timezone offset. Provide timezone separately.",
                    400
                );
            }

            // Prepare event data
            const eventData = {};
            if (title !== undefined) eventData.title = title;
            if (description !== undefined) eventData.description = description;
            if (startTime !== undefined) eventData.startTime = startTime;
            if (endTime !== undefined) eventData.endTime = endTime;
            if (timezone !== undefined) eventData.timezone = timezone;
            if (locationDetails !== undefined)
                eventData.locationDetails = locationDetails;
            if (maxAttendees !== undefined)
                eventData.maxAttendees = maxAttendees;
            if (eventType !== undefined) eventData.eventType = eventType;

            // Update the event
            const updatedEvent = await EventModel.updateEvent(
                parseInt(eventId),
                eventData,
                null, // No post data updates allowed
                location
            );

            // Get the complete event
            const completeEvent = await EventModel.getEventById(
                updatedEvent.id
            );

            // Send notification to all attendees about the update
            try {
                const NotificationService = require("../../notification/services/notification.service");
                await NotificationService.notifyEventUpdate({
                    eventId: completeEvent.id,
                    eventTitle: completeEvent.title,
                    updateMessage: `The event "${completeEvent.title}" has been updated. Please check the new details.`,
                    communityName: await this._getCommunityName(await this._getEventCommunityId(completeEvent.id)),
                });
            } catch (error) {
                console.error("Error sending event update notification:", error);
                // Don't fail the request if notification fails
            }

            res.status(200).json({
                status: "success",
                data: {
                    event: completeEvent,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteEvent(req, res, next) {
        try {
            const { eventId } = req.params;
            const userId = req.user.id;

            // Check if user can manage this event
            const canManage = await CommunityPermissions.canManageEvent(userId, parseInt(eventId));

            if (!canManage.allowed) {
                throw new ApiError(canManage.reason, 403);
            }

            // Get event details before deletion for notification
            const event = await EventModel.getEventById(parseInt(eventId));
            const communityId = await this._getEventCommunityId(parseInt(eventId));

            // Send cancellation notification to all attendees
            try {
                const NotificationService = require("../../notification/services/notification.service");
                await NotificationService.notifyEventCancellation({
                    eventId: event.id,
                    eventTitle: event.title,
                    communityName: await this._getCommunityName(communityId),
                });
            } catch (error) {
                console.error("Error sending event cancellation notification:", error);
                // Continue with deletion even if notification fails
            }

            await EventModel.deleteEvent(parseInt(eventId));

            res.status(200).json({
                status: "success",
                message: "Event deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }

    async getCommunityEvents(req, res, next) {
        try {
            const { communityId: communityIdentifier } = req.params;
            
            // Resolve community identifier - handle both numeric IDs and unique URLs
            let communityId;
            if (!isNaN(communityIdentifier)) {
                // It's a numeric ID, use it directly
                communityId = parseInt(communityIdentifier);
            } else {
                // It's a unique URL, resolve it to get the ID
                const CommunityModel = require("../../community/models/community.model");
                const community = await CommunityModel.findByIdentifier(communityIdentifier);
                
                if (!community) {
                    throw new ApiError("Community not found", 404);
                }
                
                communityId = community.id;
            }
            
            const {
                page,
                limit,
                upcoming,
                pastEvents,
                isSupportersOnly,
                startDate,
                endDate,
                timezone,
            } = req.query;

            // Prepare options
            const options = {
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                upcoming: upcoming, // Already converted by validator
                pastEvents: pastEvents, // Already converted by validator
                isSupportersOnly: isSupportersOnly, // Already converted by validator
                startDate: startDate || null,
                endDate: endDate || null,
                timezone: timezone || "UTC",
            };

            const result = await EventModel.getCommunityEvents(
                communityId,
                options
            );

            res.status(200).json({
                status: "success",
                data: {
                    events: result.events,
                    pagination: result.pagination,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserEvents(req, res, next) {
        try {
            const userId = req.user.id;

            const {
                page,
                limit,
                upcoming,
                pastEvents,
                startDate,
                endDate,
                timezone,
            } = req.query;

            // Prepare options
            const options = {
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                upcoming: upcoming, // Already converted by validator
                pastEvents: pastEvents, // Already converted by validator
                startDate: startDate || null,
                endDate: endDate || null,
                timezone: timezone || "UTC",
            };

            const result = await EventModel.getUserEvents(userId, options);

            res.status(200).json({
                status: "success",
                data: {
                    events: result.events,
                    pagination: result.pagination,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async updateEventCoverImage(req, res, next) {
        try {
            const { eventId } = req.params;
            const userId = req.user.id;

            // Check if user can manage this event
            const canManage = await CommunityPermissions.canManageEvent(userId, parseInt(eventId));

            if (!canManage.allowed) {
                throw new ApiError(canManage.reason, 403);
            }

            const { key, imageType = "cover", altText } = req.body;

            // Save the cover image
            const ImageModel = require("../models/image.model");
            const coverImageData = await ImageModel.saveEventImage(parseInt(eventId), {
                imageType,
                provider: "s3",
                key,
                altText: altText || null,
            });

            // Get the complete event with updated cover image
            const completeEvent = await EventModel.getEventById(parseInt(eventId));

            res.status(200).json({
                status: "success",
                message: "Event cover image updated successfully",
                data: {
                    event: completeEvent,
                    coverImage: coverImageData,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // Helper function to get community name
    async _getCommunityName(communityId) {
        try {
            const CommunityModel = require("../../community/models/community.model");
            const community = await CommunityModel.findByIdentifier(communityId);
            return community ? community.name : "Community";
        } catch (error) {
            console.error("Error fetching community name:", error);
            return "Community";
        }
    }

    // Helper function to get event's community ID
    async _getEventCommunityId(eventId) {
        try {
            const db = require("../../config/db");
            const result = await db.query(
                `
                SELECT p.community_id
                FROM events e
                JOIN posts p ON e.post_id = p.id
                WHERE e.id = $1
                `,
                [eventId]
            );
            return result.rows[0]?.community_id || null;
        } catch (error) {
            console.error("Error fetching event community ID:", error);
            return null;
        }
    }

}

module.exports = new EventController();
