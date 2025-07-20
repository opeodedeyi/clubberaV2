// src/event/models/eventSearch.model.js
const db = require("../../config/db");
const ApiError = require("../../utils/ApiError");

class EventSearchModel {
    async searchEvents(options = {}) {
        try {
            const {
                query = "",
                page = 1,
                limit = 10,
                timeRange = null, // '24h', '1w', '1m', null (all upcoming)
                tags = [], // Array of tag strings (not IDs anymore)
                sortBy = "date", // 'date', 'relevance'
                communityId = null, // Optional community filter
            } = options;

            const offset = (page - 1) * limit;
            const params = [];
            let paramCounter = 1;

            // Build the query with safety measures for user input
            let sqlQuery = `
                WITH event_data AS (
                SELECT 
                    e.*, 
                    p.community_id, 
                    p.user_id, 
                    p.is_supporters_only, 
                    c.name AS community_name,
                    (
                    SELECT json_build_object(
                        'id', i.id,
                        'entityType', i.entity_type,
                        'entityId', i.entity_id,
                        'imageType', i.image_type,
                        'provider', i.provider,
                        'key', i.key,
                        'altText', i.alt_text,
                        'createdAt', i.created_at
                    )
                    FROM images i
                    WHERE i.entity_type = 'event' AND i.entity_id = e.id AND i.image_type = 'cover'
                    LIMIT 1
                    ) AS cover_image,
                    (
                    SELECT COUNT(*) 
                    FROM event_attendees ea 
                    WHERE ea.event_id = e.id AND ea.status = 'attending'
                    ) AS attendee_count,
                    (
                    SELECT json_agg(
                        json_build_object(
                        'id', t.id,
                        'name', t.name
                        )
                    )
                    FROM tags t
                    JOIN tag_assignments ta ON t.id = ta.tag_id
                    WHERE ta.entity_type = 'event' AND ta.entity_id = e.id
                    ) AS tags,
                    (
                    SELECT l.address || ' ' || l.name
                    FROM locations l
                    WHERE l.entity_type = 'event' AND l.entity_id = e.id
                    LIMIT 1
                    ) AS location_text,
                    to_tsvector('english', 
                    COALESCE(e.title, '') || ' ' ||
                    COALESCE(e.description, '') || ' ' ||
                    COALESCE(c.name, '') || ' ' ||
                    COALESCE((
                        SELECT string_agg(t.name, ' ')
                        FROM tags t
                        JOIN tag_assignments ta ON t.id = ta.tag_id
                        WHERE ta.entity_type = 'event' AND ta.entity_id = e.id
                    ), '') || ' ' ||
                    COALESCE((
                        SELECT l.address || ' ' || l.name
                        FROM locations l
                        WHERE l.entity_type = 'event' AND l.entity_id = e.id
                        LIMIT 1
                    ), '')
                    ) AS search_vector
                FROM events e
                JOIN posts p ON e.post_id = p.id
                JOIN communities c ON p.community_id = c.id
                WHERE e.start_time >= NOW()
            `;

            // Add time range filter if provided
            if (timeRange) {
                if (timeRange === "24h") {
                    sqlQuery += ` AND e.start_time <= NOW() + INTERVAL '1 day'`;
                } else if (timeRange === "1w") {
                    sqlQuery += ` AND e.start_time <= NOW() + INTERVAL '1 week'`;
                } else if (timeRange === "1m") {
                    sqlQuery += ` AND e.start_time <= NOW() + INTERVAL '1 month'`;
                }
            }

            // Add community filter if provided
            if (communityId) {
                sqlQuery += ` AND p.community_id = $${paramCounter}`;
                params.push(communityId);
                paramCounter++;
            }

            // Process and sanitize the search query
            let searchTerms = "";
            if (query && query.trim() !== "") {
                // Remove any dangerous SQL characters and prepare for tsquery
                searchTerms = this._sanitizeAndPrepareSearchQuery(query.trim());

                if (searchTerms) {
                    sqlQuery += `
                        AND search_vector @@ to_tsquery('english', $${paramCounter})
                    `;
                    params.push(searchTerms);
                    paramCounter++;
                }
            }

            // If there are tags, prepare a CTE for filtering by tags
            let tagFilterQuery = "";
            if (tags && tags.length > 0) {
                tagFilterQuery = `
                    , tagged_events AS (
                        SELECT DISTINCT ed.id
                        FROM event_data ed
                        JOIN tag_assignments ta ON ta.entity_type = 'event' AND ta.entity_id = ed.id
                        JOIN tags t ON t.id = ta.tag_id
                        WHERE t.name IN (${tags
                            .map((_, idx) => `$${paramCounter + idx}`)
                            .join(", ")})
                    )
                `;

                params.push(...tags);
                paramCounter += tags.length;
            }

            // Close the event_data CTE and add tag filter if needed
            sqlQuery += `
                )
                ${tagFilterQuery}
                
                SELECT ed.*, 
                EXTRACT(EPOCH FROM (ed.start_time - NOW())) AS seconds_until_start
                FROM event_data ed
            `;

            // Apply tag filter if needed
            if (tags && tags.length > 0) {
                sqlQuery += `
                    JOIN tagged_events te ON ed.id = te.id
                `;
            }

            // Add sort order
            if (sortBy === "relevance" && searchTerms) {
                // For relevance sorting when there's a search query
                sqlQuery += `
                    ORDER BY
                        ts_rank(search_vector, to_tsquery('english', $${
                            paramCounter -
                            (tags.length > 0 ? tags.length : 0) -
                            (searchTerms ? 1 : 0)
                        })) DESC,
                        ed.start_time ASC
                `;
            } else {
                // Default to date sorting
                sqlQuery += `
                    ORDER BY ed.start_time ASC
                `;
            }

            // Add pagination
            sqlQuery += `
                LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
            `;
            params.push(limit, offset);

            // Build the count query - simplified version of the main query
            let countQuery = `
                WITH event_data AS (
                SELECT e.id,
                    to_tsvector('english', 
                    COALESCE(e.title, '') || ' ' ||
                    COALESCE(e.description, '') || ' ' ||
                    COALESCE(c.name, '') || ' ' ||
                    COALESCE((
                        SELECT string_agg(t.name, ' ')
                        FROM tags t
                        JOIN tag_assignments ta ON t.id = ta.tag_id
                        WHERE ta.entity_type = 'event' AND ta.entity_id = e.id
                    ), '') || ' ' ||
                    COALESCE((
                        SELECT l.address || ' ' || l.name
                        FROM locations l
                        WHERE l.entity_type = 'event' AND l.entity_id = e.id
                        LIMIT 1
                    ), '')
                    ) AS search_vector
                FROM events e
                JOIN posts p ON e.post_id = p.id
                JOIN communities c ON p.community_id = c.id
                WHERE e.start_time >= NOW()
            `;

            // Add time range filter if provided (same as main query)
            if (timeRange) {
                if (timeRange === "24h") {
                    countQuery += ` AND e.start_time <= NOW() + INTERVAL '1 day'`;
                } else if (timeRange === "1w") {
                    countQuery += ` AND e.start_time <= NOW() + INTERVAL '1 week'`;
                } else if (timeRange === "1m") {
                    countQuery += ` AND e.start_time <= NOW() + INTERVAL '1 month'`;
                }
            }

            // Add community filter if provided
            if (communityId) {
                countQuery += ` AND p.community_id = $1`;
            }

            // Add search filter if provided
            if (searchTerms) {
                countQuery += `
                    AND search_vector @@ to_tsquery('english', $${
                        communityId ? 2 : 1
                    })
                `;
            }

            // Close the CTE
            countQuery += `
        )
      `;

            // Add tag filter if needed
            if (tags && tags.length > 0) {
                countQuery += `
                    , tagged_events AS (
                        SELECT DISTINCT ed.id
                        FROM event_data ed
                        JOIN tag_assignments ta ON ta.entity_type = 'event' AND ta.entity_id = ed.id
                        JOIN tags t ON t.id = ta.tag_id
                        WHERE t.name IN (${tags
                            .map(
                                (_, idx) =>
                                    `$${communityId ? 2 : 1}${
                                        searchTerms ? " + 1" : ""
                                    }${idx > 0 ? " + " + idx : ""}`
                            )
                            .join(", ")})
                    )
                    
                    SELECT COUNT(*)
                    FROM event_data ed
                    JOIN tagged_events te ON ed.id = te.id
                `;
            } else {
                countQuery += `
                    SELECT COUNT(*)
                    FROM event_data
                `;
            }

            // Execute both queries
            const [eventsResult, countResult] = await Promise.all([
                db.query(sqlQuery, params),
                db.query(countQuery, params.slice(0, -2)), // Remove limit and offset params
            ]);

            // Format the results
            const events = eventsResult.rows.map((row) =>
                this._formatSearchResult(row)
            );
            const totalCount = parseInt(countResult.rows[0].count);

            return {
                events,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalItems: totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                },
            };
        } catch (error) {
            throw new ApiError(`Error searching events: ${error.message}`, 500);
        }
    }

    async getEventByUniqueUrl(uniqueUrl, userId = null) {
        try {
            const query = `
                SELECT e.*, p.*, c.name AS community_name, l.*,
                p.id AS post_id, e.id AS event_id, l.id AS location_id,
                p.created_at AS post_created_at, p.updated_at AS post_updated_at,
                e.created_at AS event_created_at, e.updated_at AS event_updated_at,
                l.created_at AS location_created_at, l.updated_at AS location_updated_at,
                (
                    SELECT COUNT(*) 
                    FROM event_attendees ea 
                    WHERE ea.event_id = e.id AND ea.status = 'attending'
                ) AS attendee_count,
                (
                    SELECT json_build_object(
                    'id', i.id,
                    'entityType', i.entity_type,
                    'entityId', i.entity_id,
                    'imageType', i.image_type,
                    'provider', i.provider,
                    'key', i.key,
                    'altText', i.alt_text,
                    'createdAt', i.created_at
                    )
                    FROM images i
                    WHERE i.entity_type = 'event' AND i.entity_id = e.id AND i.image_type = 'cover'
                    LIMIT 1
                ) AS cover_image,
                (
                    SELECT json_agg(
                    json_build_object(
                        'id', t.id,
                        'name', t.name
                    )
                    )
                    FROM tags t
                    JOIN tag_assignments ta ON t.id = ta.tag_id
                    WHERE ta.entity_type = 'event' AND ta.entity_id = e.id
                ) AS tags,
                ${
                    userId
                        ? `
                (
                    SELECT json_build_object(
                    'status', ea.status,
                    'attended', ea.attended,
                    'waitlistPosition', (
                        CASE 
                        WHEN ea.status = 'waitlisted' THEN 
                            (SELECT COUNT(*) FROM event_attendees ea2 
                            WHERE ea2.event_id = e.id AND ea2.status = 'waitlisted' 
                            AND ea2.created_at < ea.created_at) + 1
                        ELSE NULL
                        END
                    )
                    )
                    FROM event_attendees ea
                    WHERE ea.event_id = e.id AND ea.user_id = $2
                ) AS attendance_status,
                `
                        : ""
                }
                EXTRACT(EPOCH FROM (e.start_time - NOW())) AS seconds_until_start
                FROM events e
                JOIN posts p ON e.post_id = p.id
                JOIN communities c ON p.community_id = c.id
                LEFT JOIN locations l ON l.entity_type = 'event' AND l.entity_id = e.id
                WHERE e.unique_url = $1;
            `;

            const result = await db.query(
                query,
                userId ? [uniqueUrl, userId] : [uniqueUrl]
            );

            if (result.rows.length === 0) {
                throw new ApiError("Event not found", 404);
            }

            // Organize the data
            const row = result.rows[0];
            return this._formatEventDetail(row);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Error retrieving event: ${error.message}`, 500);
        }
    }

    _sanitizeAndPrepareSearchQuery(searchQuery) {
        if (!searchQuery || searchQuery.trim() === "") {
            return "";
        }

        try {
            // Basic sanitization - remove dangerous characters
            const sanitized = searchQuery
                .replace(/[&|!:*+\-<>(){}[\]^"~\\]/g, " ") // Remove tsquery special chars
                .replace(/\s+/g, " ") // Normalize whitespace
                .trim();

            if (!sanitized) {
                return "";
            }

            // Process multi-word queries
            const words = sanitized.split(" ");

            // If it's a single word, just return it with a wildcard
            if (words.length === 1) {
                return `${words[0]}:*`;
            }

            // For multi-word phrases, create an OR condition between words
            // and add prefix searching with :* for partial matching
            const processedWords = words
                .filter((word) => word.length > 0)
                .map((word) => `${word}:*`);

            if (processedWords.length === 0) {
                return "";
            }

            // Join words with OR operator
            return processedWords.join(" | ");
        } catch (error) {
            console.error("Error preparing search query:", error);
            // Return a safe empty string if anything goes wrong
            return "";
        }
    }

    _formatSearchResult(row) {
        // Calculate "starting in" text
        let startingIn = null;
        if (row.seconds_until_start) {
            const secondsUntilStart = parseInt(row.seconds_until_start);
            startingIn = this._formatTimeUntil(secondsUntilStart);
        }

        // Format date and time
        const startDate = new Date(row.start_time);
        const formattedDate = startDate.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        const formattedTime = startDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        return {
            id: row.id,
            uniqueUrl: row.unique_url,
            title: row.title,
            description: row.description,
            communityId: row.community_id,
            communityName: row.community_name,
            startTime: row.start_time,
            endTime: row.end_time,
            timezone: row.timezone,
            formattedDate,
            formattedTime,
            startingIn,
            coverImage: row.cover_image,
            attendeeCount: parseInt(row.attendee_count) || 0,
            attendanceStatus: row.attendance_status || null,
            eventType: row.event_type,
            isPastEvent: new Date(row.start_time) < new Date(),
            tags: row.tags || [],
        };
    }

    _formatEventDetail(row) {
        // Calculate "starting in" text
        let startingIn = null;
        if (row.seconds_until_start) {
            const secondsUntilStart = parseInt(row.seconds_until_start);
            startingIn = this._formatTimeUntil(secondsUntilStart);
        }

        // Format date and time
        const startDate = new Date(row.start_time);
        const formattedDate = startDate.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        const formattedTime = startDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        // Extract and organize post data
        const post = {
            id: row.post_id,
            communityId: row.community_id,
            userId: row.user_id,
            content: row.content,
            isSupportersOnly: row.is_supporters_only,
            isHidden: row.is_hidden,
            contentType: row.content_type,
            isEdited: row.is_edited,
            editedAt: row.edited_at,
            createdAt: row.post_created_at,
            updatedAt: row.post_updated_at,
        };

        // Create formatted event object
        const event = {
            id: row.event_id,
            uniqueUrl: row.unique_url,
            title: row.title,
            description: row.description,
            eventType: row.event_type,
            startTime: row.start_time,
            endTime: row.end_time,
            timezone: row.timezone,
            locationDetails: row.location_details,
            formattedDate,
            formattedTime,
            communityName: row.community_name,
            maxAttendees: row.max_attendees,
            currentAttendees: row.current_attendees,
            attendeeCount: parseInt(row.attendee_count) || 0,
            coverImage: row.cover_image,
            tags: row.tags || [],
            startingIn,
            isPastEvent: new Date(row.start_time) < new Date(),
            post,
        };

        // Add location data if available
        if (row.location_id) {
            event.location = {
                id: row.location_id,
                name: row.name,
                locationType: row.location_type,
                lat: row.lat,
                lng: row.lng,
                address: row.address,
            };
        }

        // Add attendance status if available
        if (row.attendance_status) {
            event.attendanceStatus = row.attendance_status;
        }

        return event;
    }

    _formatTimeUntil(seconds) {
        if (seconds <= 0) {
            return "Started";
        }

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days} day${days !== 1 ? "s" : ""}${
                hours > 0 ? `, ${hours} hour${hours !== 1 ? "s" : ""}` : ""
            }`;
        } else if (hours > 0) {
            return `${hours} hour${hours !== 1 ? "s" : ""}${
                minutes > 0
                    ? `, ${minutes} minute${minutes !== 1 ? "s" : ""}`
                    : ""
            }`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
        } else {
            return "Less than a minute";
        }
    }
}

module.exports = new EventSearchModel();
