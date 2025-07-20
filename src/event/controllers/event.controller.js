// src/event/controllers/event.controller.js
const EventModel = require("../models/event.model");
const ApiError = require("../../utils/ApiError");

class EventController {
    async createEvent(req, res, next) {
        try {
            const userId = req.user.id;
            const { communityId } = req.params;

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
                coverImageKey,
            } = req.body;

            // Prepare post data
            const postData = {
                communityId: parseInt(communityId),
                content: content || "",
                isSupportersOnly: isSupportersOnly || false,
            };

            // Prepare event data
            const eventData = {
                title,
                description,
                eventType,
                startTime,
                endTime,
                timezone,
                locationDetails,
                maxAttendees,
            };

            // Create the event
            const event = await EventModel.createEvent(
                eventData,
                postData,
                userId,
                location
            );

            // If cover image key is provided, save the image
            if (coverImageKey) {
                const ImageModel = require("../models/image.model");
                await ImageModel.transferTempImageToEvent(
                    event.id,
                    coverImageKey,
                    "cover"
                );
            }

            // Get the complete event with cover image
            const completeEvent = await EventModel.getEventById(event.id);

            res.status(201).json({
                status: "success",
                data: {
                    event: completeEvent,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getEvent(req, res, next) {
        try {
            const { eventId } = req.params;
            // const userId = req.user.id;

            // // Check if user can manage this event
            // const canManage = await EventModel.canManageEvent(
            //     parseInt(eventId),
            //     userId
            // );

            const event = await EventModel.getEventById(parseInt(eventId));

            res.status(200).json({
                status: "success",
                data: {
                    event,
                    // canManage
                },
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
            const canManage = await EventModel.canManageEvent(
                parseInt(eventId),
                userId
            );

            if (!canManage) {
                throw new ApiError(
                    "You do not have permission to update this event",
                    403
                );
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
                coverImageKey,
            } = req.body;

            // Prepare post data
            const postData = {};
            if (content !== undefined) postData.content = content;
            if (isSupportersOnly !== undefined)
                postData.isSupportersOnly = isSupportersOnly;

            // Prepare event data
            const eventData = {};
            if (title !== undefined) eventData.title = title;
            if (description !== undefined) eventData.description = description;
            if (eventType !== undefined) eventData.eventType = eventType;
            if (startTime !== undefined) eventData.startTime = startTime;
            if (endTime !== undefined) eventData.endTime = endTime;
            if (timezone !== undefined) eventData.timezone = timezone;
            if (locationDetails !== undefined)
                eventData.locationDetails = locationDetails;
            if (maxAttendees !== undefined)
                eventData.maxAttendees = maxAttendees;

            // Update the event
            const updatedEvent = await EventModel.updateEvent(
                parseInt(eventId),
                eventData,
                Object.keys(postData).length > 0 ? postData : null,
                location
            );

            // If cover image key is provided, save the image
            if (coverImageKey) {
                const ImageModel = require("../models/image.model");
                await ImageModel.transferTempImageToEvent(
                    updatedEvent.id,
                    coverImageKey,
                    "cover"
                );
            }

            // Get the complete event with cover image
            const completeEvent = await EventModel.getEventById(
                updatedEvent.id
            );

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
            const canManage = await EventModel.canManageEvent(
                parseInt(eventId),
                userId
            );

            if (!canManage) {
                throw new ApiError(
                    "You do not have permission to delete this event",
                    403
                );
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
            const { communityId } = req.params;
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
                parseInt(communityId),
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
}

module.exports = new EventController();
