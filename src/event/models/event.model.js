// src/event/models/event.model.js
const db = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const TimezoneHelper = require("../../utils/timezone.helper");

class EventModel {
    async _generateUniqueUrl(title) {
        try {
            // Convert title to URL-friendly format
            let baseUrl = title
                .toLowerCase()
                .replace(/[^\w\s-]/g, "") // Remove non-word chars
                .replace(/\s+/g, "-") // Replace spaces with hyphens
                .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
                .substring(0, 50) // Limit length
                .trim();

            // Add a timestamp to ensure uniqueness
            const timestamp = new Date().getTime().toString(36);
            let uniqueUrl = `${baseUrl}-${timestamp}`;

            // Check if URL already exists
            let exists = true;
            while (exists) {
                const query = `
                    SELECT id FROM events WHERE unique_url = $1 LIMIT 1;
                `;
                const result = await db.query(query, [uniqueUrl]);

                if (result.rows.length === 0) {
                    exists = false;
                } else {
                    // If URL exists, add a random string
                    const random = Math.random().toString(36).substring(2, 6);
                    uniqueUrl = `${baseUrl}-${timestamp}-${random}`;
                }
            }

            return uniqueUrl;
        } catch (error) {
            throw new ApiError(
                `Failed to generate unique URL: ${error.message}`,
                500
            );
        }
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

    async createEvent(eventData, postData, userId, locationData = null) {
        // Start a transaction
        const operations = [];

        // Generate a unique URL for the event
        const uniqueUrl = await this._generateUniqueUrl(eventData.title);

        // Convert local times to UTC if timezone is provided
        let startTimeUTC = eventData.startTime;
        let endTimeUTC = eventData.endTime;
        
        if (eventData.timezone && eventData.timezone !== 'UTC') {
            try {
                // Convert start time from local to UTC
                if (eventData.startTime) {
                    const startTimeUtcDate = TimezoneHelper.convertLocalToUTC(
                        eventData.startTime, 
                        eventData.timezone
                    );
                    startTimeUTC = startTimeUtcDate.toISOString();
                }

                // Convert end time from local to UTC
                if (eventData.endTime) {
                    const endTimeUtcDate = TimezoneHelper.convertLocalToUTC(
                        eventData.endTime, 
                        eventData.timezone
                    );
                    endTimeUTC = endTimeUtcDate.toISOString();
                }
            } catch (error) {
                throw new ApiError(
                    `Invalid timezone or time format: ${error.message}`,
                    400
                );
            }
        }

        // 1. Create the post first
        const postQuery = {
            text: `
                INSERT INTO posts(
                community_id, user_id, content, is_supporters_only, 
                content_type, created_at, updated_at
                ) 
                VALUES($1, $2, $3, $4, 'event', NOW(), NOW())
                RETURNING *
            `,
            values: [
                postData.communityId,
                userId,
                postData.content || "",
                postData.isSupportersOnly || false,
            ],
        };
        operations.push(postQuery);

        // 2. Create the event
        const eventQuery = {
            text: `
                INSERT INTO events(
                post_id, unique_url, title, description, event_type, 
                start_time, end_time, timezone, location_details, 
                max_attendees, current_attendees, created_at, updated_at
                )
                VALUES(
                $1, $2, $3, $4, $5, 
                $6, $7, $8, $9, $10, 0, NOW(), NOW()
                )
                RETURNING *;
            `,
            values: [
                null, // post_id - will be set after post creation
                uniqueUrl,
                eventData.title,
                eventData.description || "",
                eventData.eventType || "physical",
                startTimeUTC, // Now using UTC time
                endTimeUTC || null, // Now using UTC time
                eventData.timezone || "UTC",
                eventData.locationDetails || "",
                eventData.maxAttendees || null,
            ],
        };
        operations.push(eventQuery);

        // 3. Prepare location query if provided
        let locationQuery = null;
        if (locationData) {
            locationQuery = {
                text: `
                    INSERT INTO locations(
                        entity_type, entity_id, name, location_type, 
                        lat, lng, address, created_at, updated_at
                    )
                    VALUES(
                        'event', $1, $2, $3, 
                        $4, $5, $6, NOW(), NOW()
                    )
                    RETURNING *;
                `,
                values: [
                    null, // event_id - will be set after event creation
                    locationData.name || "",
                    locationData.locationType || "address",
                    locationData.lat || null,
                    locationData.lng || null,
                    locationData.address || "",
                ],
            };
        }

        try {
            // Use a manual transaction instead of executeTransaction for complex queries
            const client = await db.pool.connect();
            let results;
            let post, event, location = null;
            
            try {
                await client.query('BEGIN');
                
                // 1. Create post first
                const postResult = await client.query(postQuery.text, postQuery.values);
                post = postResult.rows[0];
                
                // 2. Create event with the actual post_id
                eventQuery.values[0] = post.id; // Set the post_id
                
                const eventResult = await client.query(eventQuery.text, eventQuery.values);
                event = eventResult.rows[0];
                
                // 3. Create location if provided
                if (locationQuery) {
                    // Set the event_id as the first parameter
                    locationQuery.values[0] = event.id;
                    
                    const locationResult = await client.query(locationQuery.text, locationQuery.values);
                    location = locationResult.rows[0];
                }
                
                await client.query('COMMIT');

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

            // Add event creator as an attendee using the proper attendance model
            let creatorAttendanceResult;
            try {
                const AttendanceModel = require("./attendance.model");
                const attendanceResult = await AttendanceModel.setAttendanceStatus(event.id, userId, 'attending');
                creatorAttendanceResult = {
                    status: attendanceResult.status,
                    message: attendanceResult.status === 'attending' 
                        ? "You have been automatically registered as attending"
                        : attendanceResult.message || `You have been added to the ${attendanceResult.status} list`
                };
            } catch (error) {
                // Log the error but don't fail the event creation
                console.error('Failed to add event creator as attendee:', error.message);
                creatorAttendanceResult = {
                    status: "failed",
                    message: "Failed to register you as attending. You can manually RSVP from the event page.",
                    error: error.message
                };
            }

            // Calculate time until event starts
            const now = new Date();
            const startTime = new Date(event.start_time);
            const secondsUntilStart = Math.floor((startTime - now) / 1000);

            // Format date and time in event's timezone
            const eventTimezone = eventData.timezone || 'UTC';
            let formattedDate, formattedTime, timezoneInfo;
            
            try {
                formattedDate = new Intl.DateTimeFormat('en-US', {
                    timeZone: eventTimezone,
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                }).format(startTime);

                formattedTime = new Intl.DateTimeFormat('en-US', {
                    timeZone: eventTimezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                }).format(startTime);

                timezoneInfo = TimezoneHelper.getTimezoneInfo(eventTimezone);
            } catch (error) {
                // Fallback to UTC if timezone is invalid
                formattedDate = startTime.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                });

                formattedTime = startTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                });
            }

            // Format the result
            const formattedEvent = {
                ...event,
                formattedDate,
                formattedTime,
                timezoneInfo,
                startingIn: this._formatTimeUntil(secondsUntilStart),
                post,
                location,
            };

            return {
                event: formattedEvent,
                creatorAttendance: creatorAttendanceResult
            };
        } catch (error) {
            throw new ApiError(`Failed to create event: ${error.message}`, 500);
        }
    }

    async getEventById(eventId) {
        try {
            const query = `
                SELECT e.*, p.*, l.*,
                    p.id AS post_id, e.id AS event_id, l.id AS location_id,
                    p.created_at AS post_created_at, p.updated_at AS post_updated_at,
                    e.created_at AS event_created_at, e.updated_at AS event_updated_at,
                    l.created_at AS location_created_at, l.updated_at AS location_updated_at,
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
                    ) AS cover_image
                FROM events e
                JOIN posts p ON e.post_id = p.id
                LEFT JOIN locations l ON l.entity_type = 'event' AND l.entity_id = e.id
                WHERE e.id = $1;
            `;

            const result = await db.query(query, [eventId]);

            if (result.rows.length === 0) {
                throw new ApiError("Event not found", 404);
            }

            // Organize the data
            const row = result.rows[0];
            return this._formatEventData(row);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Error retrieving event: ${error.message}`, 500);
        }
    }

    /**
     * Get event with community info and user-specific data
     * @param {number} eventId - Event ID
     * @param {number|null} userId - User ID (null if not authenticated)
     * @returns {object} Event with community and user context
     */
    async getEventWithUserContext(eventId, userId = null) {
        try {
            const query = `
                SELECT 
                    -- Event data
                    e.id, e.unique_url, e.title, e.description, 
                    e.start_time, e.end_time, e.current_attendees,
                    e.created_at AS event_created_at,
                    
                    -- Community data
                    c.id AS community_id, c.name AS community_name, 
                    c.unique_url AS community_unique_url, c.is_private AS community_is_private,
                    
                    -- Location data
                    l.id AS location_id, l.name AS location_name, 
                    l.location_type, l.lat, l.lng, l.address,
                    
                    -- Cover image
                    (
                        SELECT json_build_object(
                            'id', i.id,
                            'provider', i.provider,
                            'key', i.key,
                            'altText', i.alt_text
                        )
                        FROM images i
                        WHERE i.entity_type = 'event' AND i.entity_id = e.id AND i.image_type = 'cover'
                        LIMIT 1
                    ) AS cover_image,
                    
                    -- User attendance status (if logged in)
                    CASE 
                        WHEN $2::INTEGER IS NOT NULL THEN (
                            SELECT ea.status
                            FROM event_attendees ea
                            WHERE ea.event_id = e.id AND ea.user_id = $2::INTEGER
                        )
                        ELSE NULL
                    END AS user_attendance_status,
                    
                    -- User community membership (if logged in)
                    CASE 
                        WHEN $2::INTEGER IS NOT NULL THEN (
                            SELECT json_build_object(
                                'role', cm.role,
                                'is_premium', cm.is_premium,
                                'joined_at', cm.joined_at
                            )
                            FROM community_members cm
                            WHERE cm.community_id = c.id AND cm.user_id = $2::INTEGER
                        )
                        ELSE NULL
                    END AS user_membership
                    
                FROM events e
                JOIN posts p ON e.post_id = p.id
                JOIN communities c ON p.community_id = c.id
                LEFT JOIN locations l ON l.entity_type = 'event' AND l.entity_id = e.id
                WHERE e.id = $1;
            `;

            const result = await db.query(query, [eventId, userId]);

            if (result.rows.length === 0) {
                throw new ApiError("Event not found", 404);
            }

            const row = result.rows[0];
            
            // Check if user can access this event (if community is private)
            const canAccess = this._canUserAccessEvent(row, userId);
            
            if (!canAccess.allowed) {
                return {
                    canAccess: false,
                    reason: canAccess.reason,
                    community: {
                        id: row.community_id,
                        name: row.community_name,
                        uniqueUrl: row.community_unique_url
                    }
                };
            }

            // Determine if event has passed
            const now = new Date();
            const startTime = new Date(row.start_time);
            const endTime = row.end_time ? new Date(row.end_time) : null;
            const hasPassed = startTime < now;
            const isOngoing = startTime <= now && endTime && endTime > now;

            const eventData = {
                id: row.id,
                uniqueUrl: row.unique_url,
                title: row.title,
                description: row.description,
                startTime: row.start_time,
                endTime: row.end_time,
                currentAttendees: row.current_attendees,
                hasPassed,
                isOngoing,
                createdAt: row.event_created_at,
                community: {
                    id: row.community_id,
                    name: row.community_name,
                    uniqueUrl: row.community_unique_url
                },
                coverImage: row.cover_image,
                location: row.location_id ? {
                    id: row.location_id,
                    name: row.location_name,
                    locationType: row.location_type,
                    lat: row.lat,
                    lng: row.lng,
                    address: row.address
                } : null
            };

            // Add user-specific data if logged in
            const response = {
                canAccess: true,
                event: eventData
            };

            if (userId) {
                response.userContext = {
                    attendanceStatus: row.user_attendance_status,
                    membership: row.user_membership
                };
            }

            return response;

        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Failed to fetch event with user context: ${error.message}`, 500);
        }
    }

    /**
     * Check if user can access an event based on community privacy
     * @private
     */
    _canUserAccessEvent(eventData, userId) {
        // If community is public, anyone can access
        if (!eventData.community_is_private) {
            return { allowed: true };
        }

        // If community is private and user is not logged in
        if (!userId) {
            return { 
                allowed: false, 
                reason: "This event is in a private community. You need to be logged in and be a member to view it." 
            };
        }

        // If user is logged in but not a member of the private community
        if (!eventData.user_membership) {
            return { 
                allowed: false, 
                reason: "This event is in a private community. You need to be a member to view it." 
            };
        }

        return { allowed: true };
    }

    async getEventByPostId(postId) {
        try {
            const query = `
                SELECT e.*, p.*, l.*,
                p.id AS post_id, e.id AS event_id, l.id AS location_id,
                p.created_at AS post_created_at, p.updated_at AS post_updated_at,
                e.created_at AS event_created_at, e.updated_at AS event_updated_at,
                l.created_at AS location_created_at, l.updated_at AS location_updated_at
                FROM events e
                JOIN posts p ON e.post_id = p.id
                LEFT JOIN locations l ON l.entity_type = 'event' AND l.entity_id = e.id
                WHERE e.post_id = $1;
            `;

            const result = await db.query(query, [postId]);

            if (result.rows.length === 0) {
                throw new ApiError("Event not found", 404);
            }

            // Organize the data
            const row = result.rows[0];
            return this._formatEventData(row);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Error retrieving event: ${error.message}`, 500);
        }
    }

    async updateEvent(
        eventId,
        eventData,
        postData = null,
        locationData = null
    ) {
        try {
            // Start building the transaction operations
            const operations = [];

            // 1. Get the current event to verify it exists
            const event = await this.getEventById(eventId);

            // 1.5. Handle maxAttendees capacity logic if being updated
            if (eventData && eventData.maxAttendees !== undefined) {
                await this._handleMaxAttendeesUpdate(eventId, event.maxAttendees, eventData.maxAttendees, operations);
            }

            // 2. Update the event record
            if (eventData && Object.keys(eventData).length > 0) {
                const updateFields = [];
                const values = [];
                let paramCounter = 1;

                // Handle timezone conversion for time fields
                const processedEventData = { ...eventData };
                
                // Convert times to UTC if timezone is being updated or already set
                const currentTimezone = eventData.timezone || event.timezone || 'UTC';
                
                if (currentTimezone !== 'UTC') {
                    try {
                        // Convert start time from local to UTC if provided
                        if (eventData.startTime) {
                            const startTimeUtcDate = TimezoneHelper.convertLocalToUTC(
                                eventData.startTime,
                                currentTimezone
                            );
                            processedEventData.startTime = startTimeUtcDate.toISOString();
                        }

                        // Convert end time from local to UTC if provided
                        if (eventData.endTime) {
                            const endTimeUtcDate = TimezoneHelper.convertLocalToUTC(
                                eventData.endTime,
                                currentTimezone
                            );
                            processedEventData.endTime = endTimeUtcDate.toISOString();
                        }
                    } catch (error) {
                        throw new ApiError(
                            `Invalid timezone or time format: ${error.message}`,
                            400
                        );
                    }
                }

                const fieldsToUpdate = [
                    "title",
                    "description",
                    "event_type",
                    "start_time",
                    "end_time",
                    "timezone",
                    "location_details",
                    "max_attendees",
                ];

                for (const field of fieldsToUpdate) {
                    const camelField = field.replace(/_([a-z])/g, (g) =>
                        g[1].toUpperCase()
                    );
                    if (processedEventData[camelField] !== undefined) {
                        updateFields.push(`${field} = $${paramCounter}`);
                        values.push(processedEventData[camelField]);
                        paramCounter++;
                    }
                }

                if (updateFields.length > 0) {
                    // Add updated_at field
                    updateFields.push(`updated_at = NOW()`);

                    const eventQuery = {
                        text: `
                            UPDATE events
                            SET ${updateFields.join(", ")}
                            WHERE id = $${paramCounter}
                            RETURNING *;
                        `,
                        values: [...values, eventId],
                    };
                    operations.push(eventQuery);
                }
            }

            // 3. Update the post record if needed
            if (postData && Object.keys(postData).length > 0) {
                const updateFields = [];
                const values = [];
                let paramCounter = 1;

                if (postData.content !== undefined) {
                    updateFields.push(`content = $${paramCounter}`);
                    values.push(postData.content);
                    paramCounter++;
                }

                if (postData.isSupportersOnly !== undefined) {
                    updateFields.push(`is_supporters_only = $${paramCounter}`);
                    values.push(postData.isSupportersOnly);
                    paramCounter++;
                }

                if (updateFields.length > 0) {
                    // Mark as edited
                    updateFields.push(`is_edited = TRUE`);
                    updateFields.push(`edited_at = NOW()`);
                    updateFields.push(`updated_at = NOW()`);

                    const postQuery = {
                        text: `
                            UPDATE posts
                            SET ${updateFields.join(", ")}
                            WHERE id = $${paramCounter}
                            RETURNING *;
                        `,
                        values: [...values, event.post.id],
                    };
                    operations.push(postQuery);
                }
            }

            // 4. Update or create location if provided
            if (locationData) {
                // Check if location already exists
                const locationCheckQuery = `
                    SELECT id FROM locations
                    WHERE entity_type = 'event' AND entity_id = $1
                    LIMIT 1;
                `;
                const locationCheck = await db.query(locationCheckQuery, [
                    eventId,
                ]);

                if (locationCheck.rows.length > 0) {
                    // Update existing location
                    const locationId = locationCheck.rows[0].id;
                    const updateFields = [];
                    const values = [];
                    let paramCounter = 1;

                    const fieldsToUpdate = [
                        "name",
                        "location_type",
                        "lat",
                        "lng",
                        "address",
                    ];

                    for (const field of fieldsToUpdate) {
                        if (locationData[field] !== undefined) {
                            updateFields.push(`${field} = $${paramCounter}`);
                            values.push(locationData[field]);
                            paramCounter++;
                        }
                    }

                    if (updateFields.length > 0) {
                        updateFields.push(`updated_at = NOW()`);

                        const locationQuery = {
                            text: `
                                UPDATE locations
                                SET ${updateFields.join(", ")}
                                WHERE id = $${paramCounter}
                                RETURNING *;
                            `,
                            values: [...values, locationId],
                        };
                        operations.push(locationQuery);
                    }
                } else {
                    // Create new location
                    const locationQuery = {
                        text: `
                            INSERT INTO locations(
                                entity_type, entity_id, name, location_type, 
                                lat, lng, address, created_at, updated_at
                            )
                            VALUES(
                                'event', $1, $2, $3, $4, $5, $6, NOW(), NOW()
                            )
                            RETURNING *;
                        `,
                        values: [
                            eventId,
                            locationData.name || "",
                            locationData.locationType || "address",
                            locationData.lat || null,
                            locationData.lng || null,
                            locationData.address || "",
                        ],
                    };
                    operations.push(locationQuery);
                }
            }

            // Execute the transaction if there are operations
            if (operations.length > 0) {
                await db.executeTransaction(operations);
            }

            // Return the updated event
            return this.getEventById(eventId);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Error updating event: ${error.message}`, 500);
        }
    }

    async deleteEvent(eventId) {
        try {
            // Get the event first to ensure it exists
            const event = await this.getEventById(eventId);

            // Delete the post (will cascade delete the event due to FK constraints)
            const query = {
                text: `DELETE FROM posts WHERE id = $1 RETURNING id;`,
                values: [event.post.id],
            };

            const result = await db.query(query.text, query.values);

            return result.rows.length > 0;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Error deleting event: ${error.message}`, 500);
        }
    }

    async getCommunityEvents(communityId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                upcoming = true,
                pastEvents = false,
                isSupportersOnly = null,
                startDate = null,
                endDate = null,
            } = options;

            const offset = (page - 1) * limit;
            const params = [communityId];
            let paramCounter = 2;

            // Build the WHERE clause for filtering
            let whereClause = `WHERE p.community_id = $1 AND p.content_type = 'event'`;

            // Filter by supporters only
            if (isSupportersOnly !== null) {
                whereClause += ` AND p.is_supporters_only = $${paramCounter}`;
                params.push(isSupportersOnly);
                paramCounter++;
            }

            // Filter by date range (upcoming or past)
            if (upcoming && !pastEvents) {
                whereClause += ` AND e.start_time >= NOW()`;
            } else if (!upcoming && pastEvents) {
                whereClause += ` AND e.start_time < NOW()`;
            }

            // Filter by start date
            if (startDate) {
                whereClause += ` AND e.start_time >= $${paramCounter}`;
                params.push(startDate);
                paramCounter++;
            }

            // Filter by end date
            if (endDate) {
                whereClause += ` AND e.start_time <= $${paramCounter}`;
                params.push(endDate);
                paramCounter++;
            }

            // Add pagination params
            params.push(limit);
            params.push(offset);

            const query = `
                SELECT e.*, p.*, 
                p.id AS post_id, e.id AS event_id,
                p.created_at AS post_created_at, p.updated_at AS post_updated_at,
                e.created_at AS event_created_at, e.updated_at AS event_updated_at,
                (
                    SELECT COUNT(*) 
                    FROM event_attendees ea 
                    WHERE ea.event_id = e.id AND ea.status = 'attending'
                ) AS attendee_count,
                (
                    SELECT COUNT(*) 
                    FROM event_attendees ea 
                    WHERE ea.event_id = e.id AND ea.status = 'waitlisted'
                ) AS waitlist_count,
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
                ) AS cover_image
                FROM events e
                JOIN posts p ON e.post_id = p.id
                ${whereClause}
                ORDER BY e.start_time ${upcoming ? "ASC" : "DESC"}
                LIMIT $${paramCounter} OFFSET $${paramCounter + 1};
            `;

            const countQuery = `
                SELECT COUNT(*)
                FROM events e
                JOIN posts p ON e.post_id = p.id
                ${whereClause};
            `;

            const [eventsResult, countResult] = await Promise.all([
                db.query(query, params),
                db.query(countQuery, params.slice(0, -2)), // Remove limit and offset params
            ]);

            // Format the results
            const events = eventsResult.rows.map((row) =>
                this._formatEventData(row, false)
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
            throw new ApiError(
                `Error fetching community events: ${error.message}`,
                500
            );
        }
    }

    async canManageEvent(eventId, userId) {
        try {
            const query = `
                SELECT cm.role, p.user_id
                FROM events e
                JOIN posts p ON e.post_id = p.id
                JOIN community_members cm ON p.community_id = cm.community_id AND cm.user_id = $1
                WHERE e.id = $2
                LIMIT 1;
            `;

            const result = await db.query(query, [userId, eventId]);

            if (result.rows.length === 0) {
                return false;
            }

            const { role, user_id } = result.rows[0];

            // The user can manage if they created the event OR they are an owner/organizer/moderator
            return (
                user_id === userId ||
                ["owner", "organizer", "moderator"].includes(role)
            );
        } catch (error) {
            throw new ApiError(
                `Error checking event permissions: ${error.message}`,
                500
            );
        }
    }

    _formatEventData(row, includeLocation = true) {
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

        // Extract and organize event data
        const event = {
            id: row.event_id,
            postId: row.post_id,
            uniqueUrl: row.unique_url,
            title: row.title,
            description: row.description,
            eventType: row.event_type,
            startTime: row.start_time,
            endTime: row.end_time,
            timezone: row.timezone,
            locationDetails: row.location_details,
            maxAttendees: row.max_attendees,
            currentAttendees: row.current_attendees,
            attendeeCount: row.attendee_count,
            waitlistCount: row.waitlist_count,
            coverImage: row.cover_image,
            createdAt: row.event_created_at,
            updatedAt: row.event_updated_at,
            post,
        };

        // Add location data if available and requested
        if (includeLocation && row.location_id) {
            event.location = {
                id: row.location_id,
                name: row.name,
                locationType: row.location_type,
                lat: row.lat,
                lng: row.lng,
                address: row.address,
                createdAt: row.location_created_at,
                updatedAt: row.location_updated_at,
            };
        }

        return event;
    }

    /**
     * Get events that a user is attending
     * @param {number} userId - User ID
     * @param {object} options - Query options
     * @returns {object} Events and pagination info
     */
    async getUserEvents(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                upcoming = true,
                pastEvents = false,
                startDate = null,
                endDate = null,
            } = options;

            const offset = (page - 1) * limit;
            const params = [userId];
            let paramCounter = 2;

            // Build the WHERE clause for filtering
            let whereClause = `WHERE ea.user_id = $1 AND ea.status = 'attending' AND p.content_type = 'event'`;

            // Filter by date range (upcoming or past)
            if (upcoming && !pastEvents) {
                whereClause += ` AND e.start_time >= NOW()`;
            } else if (!upcoming && pastEvents) {
                whereClause += ` AND e.start_time < NOW()`;
            }

            // Filter by start date
            if (startDate) {
                whereClause += ` AND e.start_time >= $${paramCounter}`;
                params.push(startDate);
                paramCounter++;
            }

            // Filter by end date
            if (endDate) {
                whereClause += ` AND e.start_time <= $${paramCounter}`;
                params.push(endDate);
                paramCounter++;
            }

            // Add pagination params
            params.push(limit);
            params.push(offset);

            const query = `
                SELECT e.*,
                    l.id AS location_id, l.name AS location_name, 
                    l.location_type, l.lat, l.lng, l.address,
                    l.created_at AS location_created_at, l.updated_at AS location_updated_at,
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
                    ) AS cover_image
                FROM event_attendees ea
                JOIN events e ON ea.event_id = e.id
                JOIN posts p ON e.post_id = p.id
                LEFT JOIN locations l ON l.entity_type = 'event' AND l.entity_id = e.id
                ${whereClause}
                ORDER BY e.start_time ${upcoming && !pastEvents ? "ASC" : "DESC"}
                LIMIT $${paramCounter} OFFSET $${paramCounter + 1};
            `;

            const countQuery = `
                SELECT COUNT(*)
                FROM event_attendees ea
                JOIN events e ON ea.event_id = e.id
                JOIN posts p ON e.post_id = p.id
                ${whereClause};
            `;

            const [eventsResult, countResult] = await Promise.all([
                db.query(query, params),
                db.query(countQuery, params.slice(0, -2)), // Remove limit and offset params
            ]);

            // Format events - simplified without post data
            const events = eventsResult.rows.map((row) => {
                // Extract location data if available
                const location = row.location_id
                    ? {
                          id: row.location_id,
                          name: row.location_name,
                          locationType: row.location_type,
                          lat: row.lat,
                          lng: row.lng,
                          address: row.address,
                          createdAt: row.location_created_at,
                          updatedAt: row.location_updated_at,
                      }
                    : null;

                return {
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    eventType: row.event_type,
                    startTime: row.start_time,
                    endTime: row.end_time,
                    timezone: row.timezone,
                    locationDetails: row.location_details,
                    maxAttendees: row.max_attendees,
                    location,
                    coverImage: row.cover_image,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                };
            });

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
            throw new ApiError(`Error fetching user events: ${error.message}`, 500);
        }
    }

    async _handleMaxAttendeesUpdate(eventId, currentMaxAttendees, newMaxAttendees, operations) {
        try {
            // Get current attendance counts
            const attendanceQuery = `
                SELECT 
                    COUNT(CASE WHEN status = 'attending' THEN 1 END) as current_attendees,
                    COUNT(CASE WHEN status = 'waitlisted' THEN 1 END) as waitlist_count
                FROM event_attendees
                WHERE event_id = $1;
            `;

            const attendanceResult = await db.query(attendanceQuery, [eventId]);
            const { current_attendees, waitlist_count } = attendanceResult.rows[0];
            const currentAttendees = parseInt(current_attendees);
            const waitlistCount = parseInt(waitlist_count);

            // Scenario 2: Block reducing maxAttendees below current attendees
            if (newMaxAttendees < currentAttendees) {
                throw new ApiError(
                    `Cannot reduce max attendees to ${newMaxAttendees}. There are currently ${currentAttendees} confirmed attendees.`,
                    400
                );
            }

            // Scenario 1: Promote waitlisted users when capacity increases
            if (newMaxAttendees > (currentMaxAttendees || 0) && waitlistCount > 0) {
                const availableSpots = newMaxAttendees - currentAttendees;
                const usersToPromote = Math.min(availableSpots, waitlistCount);

                if (usersToPromote > 0) {
                    // Promote the first N waitlisted users (ordered by join date)
                    const promoteQuery = {
                        text: `
                            UPDATE event_attendees
                            SET status = 'attending', updated_at = NOW()
                            WHERE event_id = $1 AND status = 'waitlisted'
                            AND id IN (
                                SELECT id FROM event_attendees
                                WHERE event_id = $1 AND status = 'waitlisted'
                                ORDER BY created_at ASC
                                LIMIT $2
                            )
                            RETURNING user_id;
                        `,
                        values: [eventId, usersToPromote]
                    };

                    // Update the current_attendees count on the events table
                    const updateEventCountQuery = {
                        text: `
                            UPDATE events
                            SET current_attendees = current_attendees + $2, updated_at = NOW()
                            WHERE id = $1
                            RETURNING current_attendees;
                        `,
                        values: [eventId, usersToPromote]
                    };

                    operations.push(promoteQuery);
                    operations.push(updateEventCountQuery);
                }
            }

        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Error handling maxAttendees update: ${error.message}`, 500);
        }
    }
}

module.exports = new EventModel();
