// src/event/models/event.model.js
const db = require("../../config/db");
const ApiError = require("../../utils/ApiError");

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
                (SELECT id FROM inserted_post), $1, $2, $3, $4, 
                $5, $6, $7, $8, $9, 0, NOW(), NOW()
                )
                RETURNING *;
            `,
            values: [
                uniqueUrl,
                eventData.title,
                eventData.description || "",
                eventData.eventType || "physical",
                eventData.startTime,
                eventData.endTime || null,
                eventData.timezone || "UTC",
                eventData.locationDetails || "",
                eventData.maxAttendees || null,
            ],
        };
        operations.push(eventQuery);

        // 3. Add location if provided
        if (locationData) {
            const locationQuery = {
                text: `
                    INSERT INTO locations(
                        entity_type, entity_id, name, location_type, 
                        lat, lng, address, created_at, updated_at
                    )
                    VALUES(
                        'event', (SELECT id FROM inserted_event), $1, $2, 
                        $3, $4, $5, NOW(), NOW()
                    )
                    RETURNING *;
                `,
                values: [
                    locationData.name || "",
                    locationData.locationType || "address",
                    locationData.lat || null,
                    locationData.lng || null,
                    locationData.address || "",
                ],
            };
            operations.push(locationQuery);
        }

        try {
            // Execute the transaction with the prepared operations
            const results = await db.executeTransaction([
                // Wrap in WITH clause to capture the results for using in subsequent queries
                {
                    text: `
                        WITH inserted_post AS (
                        ${postQuery.text.replace(
                            "RETURNING *",
                            "RETURNING id, community_id, user_id, content, is_supporters_only, content_type, created_at, updated_at"
                        )}
                        )
                        SELECT * FROM inserted_post;
                    `,
                    values: postQuery.values,
                },
                {
                    text: `
                        WITH inserted_post AS (
                        SELECT id FROM posts WHERE id = (SELECT id FROM pg_temp.results_0 LIMIT 1)
                        ),
                        inserted_event AS (
                        ${eventQuery.text.replace(
                            "RETURNING *",
                            "RETURNING id, post_id, unique_url, title, description, event_type, start_time, end_time, timezone, location_details, max_attendees, current_attendees, created_at, updated_at"
                        )}
                        )
                        SELECT * FROM inserted_event;
                    `,
                    values: eventQuery.values,
                },
                ...(locationData
                    ? [
                          {
                              text: `
                                WITH inserted_event AS (
                                SELECT id FROM events WHERE id = (SELECT id FROM pg_temp.results_1 LIMIT 1)
                                )
                                ${locationQuery.text}
                            `,
                              values: locationQuery.values,
                          },
                      ]
                    : []),
            ]);

            // Combine the results
            const post = results[0].rows[0];
            const event = results[1].rows[0];
            const location = locationData ? results[2].rows[0] : null;

            // Calculate time until event starts
            const now = new Date();
            const startTime = new Date(event.start_time);
            const secondsUntilStart = Math.floor((startTime - now) / 1000);

            // Format date and time
            const formattedDate = startTime.toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
            });

            const formattedTime = startTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });

            // Format the result
            const formattedEvent = {
                ...event,
                formattedDate,
                formattedTime,
                startingIn: this._formatTimeUntil(secondsUntilStart),
                post,
                location,
            };

            return formattedEvent;
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

            // 2. Update the event record
            if (eventData && Object.keys(eventData).length > 0) {
                const updateFields = [];
                const values = [];
                let paramCounter = 1;

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
                    if (eventData[camelField] !== undefined) {
                        updateFields.push(`${field} = $${paramCounter}`);
                        values.push(eventData[camelField]);
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
                timezone = "UTC",
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
}

module.exports = new EventModel();
