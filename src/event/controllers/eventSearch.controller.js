// src/event/controllers/eventSearch.controller.js
const EventSearchModel = require("../models/eventSearch.model");
const AttendanceModel = require("../models/attendance.model");

class EventSearchController {
    async searchEvents(req, res, next) {
        try {
            const { query, timeRange, tags, page, limit, communityId } =
                req.query;

            const sortBy = Array.isArray(req.query.sortBy)
                ? req.query.sortBy[req.query.sortBy.length - 1] // take the last value
                : req.query.sortBy;

            // Parse tags if provided - can be string or array
            let parsedTags = [];
            if (tags) {
                if (Array.isArray(tags)) {
                    parsedTags = tags;
                } else {
                    // If it's a comma-separated string or a single tag
                    parsedTags = tags.split(",").map((tag) => tag.trim());
                }
            }

            // Set up search options
            const options = {
                query: query || "",
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 10,
                timeRange: ["24h", "1w", "1m"].includes(timeRange)
                    ? timeRange
                    : null,
                tags: parsedTags,
                sortBy: sortBy === "relevance" ? "relevance" : "date",
                communityId: communityId ? parseInt(communityId) : null,
            };

            // Get user ID if authenticated
            const userId = req.user ? req.user.id : null;

            // Search for events
            const result = await EventSearchModel.searchEvents(options);

            // If user is logged in, get attendance status for each event
            if (userId) {
                // Get attendance status for each event
                for (const event of result.events) {
                    try {
                        const status =
                            await AttendanceModel.getAttendanceStatus(
                                event.id,
                                userId
                            );
                        event.attendanceStatus = status;
                    } catch (error) {
                        // If there's an error getting status, just continue
                        console.error(
                            `Error getting attendance status for event ${event.id}:`,
                            error
                        );
                    }
                }
            }

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

    async getEventByUniqueUrl(req, res, next) {
        try {
            const { uniqueUrl } = req.params;
            const userId = req.user ? req.user.id : null;

            const event = await EventSearchModel.getEventByUniqueUrl(
                uniqueUrl,
                userId
            );

            res.status(200).json({
                status: "success",
                data: {
                    event,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new EventSearchController();
