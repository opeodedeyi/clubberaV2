# Event API Documentation

This documentation covers the event-related endpoints for community events in the application.

## Base URL

```
http://localhost:4000/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Timezone Handling

The event system uses sophisticated timezone handling to ensure events are displayed correctly for users in different time zones.

### How Timezone Works

1. **Storage**: All event times (`startTime`, `endTime`) are stored in UTC in the database
2. **Event Timezone**: Each event has a `timezone` field (IANA timezone identifier like "America/New_York")
3. **Display**: Events are formatted and displayed in their specified timezone
4. **API Response**: The system returns both UTC times and timezone-formatted information

### Timezone Examples

#### Creating an Event in New York (User's Perspective)
**What the user sends:**
```json
{
    "startTime": "2025-09-15T18:00:00",  // Local time: 6:00 PM
    "timezone": "America/New_York"
}
```

**What the backend does:**
- Converts local time to UTC: `2025-09-15T22:00:00.000Z` (6 PM EDT = 10 PM UTC)
- Stores UTC time in database
- Saves timezone: `America/New_York`

**What users see:**
- New York users: "September 15, 2025 at 06:00 PM EDT"
- London users: "September 15, 2025 at 11:00 PM BST" 
- Tokyo users: "September 16, 2025 at 07:00 AM JST"

#### Creating an Event in London (User's Perspective)
**What the user sends:**
```json
{
    "startTime": "2025-09-15T19:00:00",  // Local time: 7:00 PM
    "timezone": "Europe/London"
}
```

**What the backend does:**
- Converts local time to UTC: `2025-09-15T18:00:00.000Z` (7 PM BST = 6 PM UTC)
- Stores UTC time in database
- Saves timezone: `Europe/London`

**What users see:**
- London users: "September 15, 2025 at 07:00 PM BST"
- New York users: "September 15, 2025 at 02:00 PM EDT"
- Tokyo users: "September 16, 2025 at 03:00 AM JST"

### Benefits of Backend Timezone Conversion

1. **DST Handling**: Backend correctly handles daylight saving transitions
2. **Simplified Frontend**: No complex timezone math in the frontend
3. **Consistency**: All timezone logic centralized in one place
4. **Accuracy**: Reduces human error in timezone calculations
5. **User-Friendly**: Users input times as they naturally think about them

### Timezone Response Format

When you create or retrieve events, the API returns timezone information:

```json
{
    "startTime": "2025-09-15T22:00:00.000Z",
    "timezone": "America/New_York",
    "formattedDate": "September 15, 2025",
    "formattedTime": "06:00 PM",
    "timezoneInfo": {
        "timezone": "America/New_York",
        "name": "Eastern Daylight Time",
        "offset": "-04:00",
        "currentTime": "09/15/2025, 18:00:00"
    }
}
```

### Valid Timezone Identifiers

Use IANA timezone identifiers such as:
- `America/New_York` (Eastern Time)
- `America/Los_Angeles` (Pacific Time)  
- `America/Chicago` (Central Time)
- `Europe/London` (GMT/BST)
- `Europe/Paris` (CET/CEST)
- `Asia/Tokyo` (JST)
- `Australia/Sydney` (AEST/AEDT)
- `UTC` (Coordinated Universal Time)

### Timezone Validation

The system validates timezones using the Intl API. Invalid timezones will result in a 400 Bad Request error.

---

## Event Management Endpoints

### 1. Create Event

Create a new event in a community. The system now handles both numeric community IDs and unique URL identifiers.

**Endpoint:** `POST /communities/{communityId}/events`  
**Authentication:** Required  
**Email Verification:** Required  
**Permission:** Community member

**Community Identifier:** Can use either:
- Numeric ID: `/communities/123/events`
- Unique URL: `/communities/tech-community/events`

**Request Body:**

```json
{
    "title": "Tech Meetup: AI & Machine Learning",
    "description": "Join us for an exciting discussion on the latest trends in AI and ML...",
    "content": "Looking forward to seeing everyone there!",
    "eventType": "physical",
    "startTime": "2025-09-15T18:00:00",
    "endTime": "2025-09-15T20:00:00",
    "timezone": "America/New_York",
    "locationDetails": "Conference Room A, 3rd Floor. Please check in at the front desk.",
    "maxAttendees": 50,
    "isSupportersOnly": false,
    "location": {
        "name": "Tech Hub San Francisco",
        "locationType": "venue",
        "lat": 37.7749,
        "lng": -122.4194,
        "address": "123 Tech Street, San Francisco, CA 94102"
    },
    "coverImage": {
        "key": "temp/events/cover-image-key-123.jpg",
        "provider": "s3",
        "alt_text": "Event cover image"
    }
}
```

**Response:**

```json
{
    "status": "success",
    "data": {
        "event": {
            "id": 15,
            "postId": 42,
            "uniqueUrl": "tech-meetup-ai-machine-learning-1725724800000",
            "title": "Tech Meetup: AI & Machine Learning",
            "description": "Join us for an exciting discussion...",
            "eventType": "physical",
            "startTime": "2025-09-15T18:00:00.000Z",
            "endTime": "2025-09-15T20:00:00.000Z",
            "timezone": "America/New_York",
            "locationDetails": "Conference Room A, 3rd Floor...",
            "maxAttendees": 50,
            "currentAttendees": 0,
            "formattedDate": "September 15, 2025",
            "formattedTime": "06:00 PM",
            "timezoneInfo": {
                "timezone": "America/New_York",
                "name": "Eastern Daylight Time",
                "offset": "-04:00",
                "currentTime": "09/15/2025, 18:00:00"
            },
            "startingIn": "21 days, 3 hours",
            "coverImage": {
                "id": 8,
                "entityType": "event",
                "entityId": 15,
                "imageType": "cover",
                "provider": "s3",
                "key": "events/15/cover-image.jpg",
                "altText": null,
                "createdAt": "2025-08-27T18:00:00.000Z"
            },
            "post": {
                "id": 42,
                "communityId": 6,
                "userId": 12,
                "content": "Looking forward to seeing everyone there!",
                "isSupportersOnly": false,
                "isHidden": false,
                "contentType": "event",
                "isEdited": false,
                "editedAt": null,
                "createdAt": "2025-08-27T18:00:00.000Z",
                "updatedAt": "2025-08-27T18:00:00.000Z"
            },
            "location": {
                "id": 23,
                "name": "Tech Hub San Francisco",
                "locationType": "venue",
                "lat": 37.7749,
                "lng": -122.4194,
                "address": "123 Tech Street, San Francisco, CA 94102",
                "createdAt": "2025-08-27T18:00:00.000Z",
                "updatedAt": "2025-08-27T18:00:00.000Z"
            },
            "createdAt": "2025-08-27T18:00:00.000Z",
            "updatedAt": "2025-08-27T18:00:00.000Z"
        }
    }
}
```

---

### 2. Get Event Details

Retrieve detailed information about a specific event.

**Endpoint:** `GET /events/{eventId}`  
**Authentication:** Optional

**Parameters:**

- `eventId` - Event ID (number)

**Response:**

```json
{
    "status": "success",
    "data": {
        "event": {
            "id": 15,
            "postId": 42,
            "title": "Tech Meetup: AI & Machine Learning",
            "description": "Join us for an exciting discussion...",
            "eventType": "physical",
            "startTime": "2025-09-15T18:00:00.000Z",
            "endTime": "2025-09-15T20:00:00.000Z",
            "timezone": "America/New_York",
            "locationDetails": "Conference Room A, 3rd Floor...",
            "maxAttendees": 50,
            "currentAttendees": 12,
            "attendeeCount": 12,
            "waitlistCount": 3,
            "coverImage": {
                /* image object */
            },
            "post": {
                /* post object */
            },
            "location": {
                /* location object */
            },
            "createdAt": "2025-08-27T18:00:00.000Z",
            "updatedAt": "2025-08-27T18:00:00.000Z"
        }
    }
}
```

---

### 3. Update Event

Update an existing event. Only specific fields can be modified after event creation.

**Endpoint:** `PUT /events/{eventId}`  
**Authentication:** Required  
**Email Verification:** Required  
**Permission:** 
- Community owners can edit any event in their community
- Community organizers can edit events only if community has active Pro subscription
- Event creators can edit their own events (if they still have creation permissions)

**Editable Fields:**
- `title` - Event title
- `description` - Event description  
- `startTime` - Event start time (local time format)
- `endTime` - Event end time (local time format)
- `timezone` - Event timezone
- `locationDetails` - Location instructions/details
- `maxAttendees` - Maximum number of attendees
- `location` - Venue/address information
- `coverImage` - Event cover image

**Non-Editable Fields:**
- `eventType` (physical/online) - Cannot be changed after creation
- `content` (post content) - Cannot be changed after creation
- `isSupportersOnly` - Cannot be changed after creation

**Request Body:** (all fields optional)

```json
{
    "title": "Updated Tech Meetup: AI & Deep Learning",
    "description": "Updated description with more details...",
    "startTime": "2025-09-15T19:00:00", 
    "endTime": "2025-09-15T21:00:00",
    "timezone": "America/New_York",
    "locationDetails": "Updated location details...",
    "maxAttendees": 75,
    "location": {
        "name": "Updated Venue Name",
        "locationType": "venue",
        "lat": 37.7849,
        "lng": -122.4094,
        "address": "Updated address"
    },
    "coverImage": {
        "key": "temp/events/updated-cover-123.jpg",
        "provider": "s3",
        "alt_text": "Updated event cover"
    }
}
```

**Response:** Same format as Create Event

---

### 4. Delete Event

Permanently delete an event.

**Endpoint:** `DELETE /events/{eventId}`  
**Authentication:** Required  
**Email Verification:** Required  
**Permission:** 
- Community owners can delete any event in their community
- Community organizers can delete events only if community has active Pro subscription
- Event creators can delete their own events (if they still have creation permissions)

**Response:**

```json
{
    "status": "success",
    "message": "Event deleted successfully"
}
```

---

### 5. Get Community Events

Get list of events for a specific community with filtering and pagination.

**Endpoint:** `GET /communities/{communityId}/events`  
**Authentication:** Optional

**Community Identifier:** Can use either:
- Numeric ID: `/communities/123/events`
- Unique URL: `/communities/tech-community/events`

**Query Parameters:**

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Number of results per page (1-50, default: 10)
- `upcoming` (optional) - Show upcoming events (default: true)
- `pastEvents` (optional) - Show past events (default: false)
- `isSupportersOnly` (optional) - Filter by supporters-only events
- `startDate` (optional) - Filter events starting from this date (ISO format)
- `endDate` (optional) - Filter events ending before this date (ISO format)
- `timezone` (optional) - Timezone for date filtering (default: UTC)

**Examples:**

```
# Get upcoming events
GET /communities/6/events?upcoming=true&limit=20

# Get past events
GET /communities/6/events?pastEvents=true&upcoming=false&page=2

# Get supporters-only events within date range
GET /communities/6/events?isSupportersOnly=true&startDate=2025-09-01&endDate=2025-09-30
```

**Response:**

```json
{
    "status": "success",
    "data": {
        "events": [
            {
                "id": 15,
                "postId": 42,
                "title": "Tech Meetup: AI & Machine Learning",
                "description": "Join us for an exciting discussion...",
                "eventType": "physical",
                "startTime": "2025-09-15T18:00:00.000Z",
                "endTime": "2025-09-15T20:00:00.000Z",
                "maxAttendees": 50,
                "attendeeCount": 12,
                "waitlistCount": 3,
                "coverImage": {
                    /* image object */
                },
                "post": {
                    /* post object */
                },
                "createdAt": "2025-08-27T18:00:00.000Z"
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 10,
            "totalItems": 25,
            "totalPages": 3
        }
    }
}
```

---

### 6. Get My Events

Get events that the logged-in user is attending (both upcoming and past events).

**Endpoint:** `GET /user/my-events`  
**Authentication:** Required

**Query Parameters:**

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Number of results per page (1-50, default: 10)
- `upcoming` (optional) - Show upcoming events (default: true)
- `pastEvents` (optional) - Show past events (default: false)
- `startDate` (optional) - Filter events starting from this date (ISO format)
- `endDate` (optional) - Filter events ending before this date (ISO format)
- `timezone` (optional) - Timezone for date filtering (default: UTC)

**Examples:**

```
# Get my upcoming events
GET /user/my-events

# Get my past events
GET /user/my-events?upcoming=false&pastEvents=true

# Get all my events (past and upcoming)
GET /user/my-events?upcoming=true&pastEvents=true

# Get my events with pagination
GET /user/my-events?page=2&limit=20

# Get my events in date range
GET /user/my-events?startDate=2025-09-01&endDate=2025-09-30
```

**Response:**

```json
{
    "status": "success",
    "data": {
        "events": [
            {
                "id": 15,
                "title": "Tech Meetup: AI & Machine Learning",
                "description": "Join us for an exciting discussion...",
                "eventType": "physical",
                "startTime": "2025-09-15T18:00:00.000Z",
                "endTime": "2025-09-15T20:00:00.000Z",
                "timezone": "America/New_York",
                "locationDetails": "Main conference room",
                "maxAttendees": 50,
                "coverImage": {
                    "id": 8,
                    "entityType": "event",
                    "entityId": 15,
                    "imageType": "cover",
                    "provider": "s3",
                    "key": "events/15/cover-image.jpg",
                    "altText": null,
                    "createdAt": "2025-08-27T18:00:00.000Z"
                },
                "location": {
                    "id": 23,
                    "name": "Tech Hub San Francisco",
                    "locationType": "venue",
                    "lat": 37.7749,
                    "lng": -122.4194,
                    "address": "123 Tech Street, San Francisco, CA 94102",
                    "createdAt": "2025-08-27T17:30:00.000Z",
                    "updatedAt": "2025-08-27T17:30:00.000Z"
                },
                "createdAt": "2025-08-27T18:00:00.000Z",
                "updatedAt": "2025-08-27T18:00:00.000Z"
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 10,
            "totalItems": 8,
            "totalPages": 1
        }
    }
}
```

**Notes:**
- Only shows events where user's attendance status is 'attending'
- Upcoming events are ordered chronologically (earliest first)
- Past events are ordered reverse chronologically (most recent first)
- Returns simplified event data without community or post information

---

## Event Attendance Endpoints

### 7. Set Attendance Status

Set or update your attendance status for an event (RSVP).

**Endpoint:** `POST /events/{eventId}/attendance`  
**Authentication:** Required  
**Email Verification:** Required

**Request Body:**

```json
{
    "status": "attending" // "attending", "not_attending", "maybe"
}
```

**Response:**

```json
{
    "status": "success",
    "message": "Attendance status updated successfully",
    "data": {
        "attendanceStatus": "attending",
        "waitlistPosition": null,
        "eventIsFull": false,
        "attendeeCount": 13
    }
}
```

**Note:** If event is at capacity, user will be automatically added to waitlist with status "waitlisted".

---

### 8. Get My Attendance Status

Get your current attendance status for an event.

**Endpoint:** `GET /events/{eventId}/attendance/my-status`  
**Authentication:** Required

**Response:**

```json
{
    "status": "success",
    "data": {
        "attendanceStatus": "attending",
        "waitlistPosition": null,
        "attended": null,
        "rsvpDate": "2025-08-27T18:30:00.000Z"
    }
}
```

---

### 9. Get Event Attendees

Get list of attendees for an event with filtering and pagination.

**Endpoint:** `GET /events/{eventId}/attendance`  
**Authentication:** Optional (more details if authenticated)

**Query Parameters:**

- `status` (optional) - Filter by status: attending, not_attending, maybe, waitlisted
- `limit` (optional) - Number of results (1-100, default: 20)
- `offset` (optional) - Pagination offset (default: 0)

**Examples:**

```
# Get all attendees
GET /events/15/attendance?limit=50

# Get only confirmed attendees
GET /events/15/attendance?status=attending

# Get waitlist
GET /events/15/attendance?status=waitlisted
```

**Response:**

```json
{
    "status": "success",
    "data": {
        "attendees": [
            {
                "userId": 12,
                "status": "attending",
                "waitlistPosition": null,
                "attended": null,
                "joinedAt": "2025-08-27T18:30:00.000Z",
                "user": {
                    "id": 12,
                    "fullName": "John Doe",
                    "profileImage": {
                        /* image object */
                    }
                }
            }
        ],
        "pagination": {
            "total": 15,
            "limit": 20,
            "offset": 0,
            "hasMore": false
        },
        "summary": {
            "attending": 12,
            "not_attending": 3,
            "maybe": 2,
            "waitlisted": 3
        }
    }
}
```

---

### 10. Mark Attendance (For Organizers)

Mark actual attendance for users at an event.

**Endpoint:** `POST /events/{eventId}/attendance/mark`  
**Authentication:** Required  
**Email Verification:** Required  
**Permission:** Event creator or community admin

**Request Body:**

```json
{
    "userId": 12,
    "attended": true
}
```

**Response:**

```json
{
    "status": "success",
    "message": "Attendance marked successfully",
    "data": {
        "userId": 12,
        "attended": true,
        "markedAt": "2025-09-15T22:00:00.000Z"
    }
}
```

---

## Event Search Endpoints

### 11. Search Events

Search for events across communities with various filters. Only searches events from **public communities**.

**Key Features:**
- **Text Search**: Case-insensitive, partial matching (e.g., "tech" matches "Technology Meetup")
- **Proximity Search**: Find events within specified radius using latitude/longitude
- **Combined Search**: Mix text search with location filtering
- **Smart Sorting**: Relevance (text priority), date (chronological), or distance (closest first)
- **Advanced Filtering**: Time ranges, community-specific, tag-based filtering

**Endpoint:** `GET /event-search/search`  
**Authentication:** Optional

**Query Parameters:**

- `query` (optional) - Search term for title/description/community name (case-insensitive, partial match)
- `communityId` (optional) - Filter by specific community ID
- `timeRange` (optional) - Time filter: `24h`, `1w`, `1m` (default: all upcoming events)
- `tags` (optional) - Comma-separated list of tag names (e.g., `technology,programming`)
- `lat` (optional) - Latitude for proximity search (requires `lng`)
- `lng` (optional) - Longitude for proximity search (requires `lat`)
- `radius` (optional) - Search radius in miles (default: 25, used with lat/lng)
- `page` (optional) - Page number for pagination (default: 1)
- `limit` (optional) - Number of results per page (1-100, default: 10)
- `sortBy` (optional) - Sort by: `relevance`, `date`, `distance` (default: `date`, `distance` for proximity search)

**Examples:**

```
# Text search (case-insensitive, partial match)
GET /event-search/search?query=tech&sortBy=relevance&limit=10

# Filter by time range
GET /event-search/search?timeRange=24h&sortBy=date

# Filter by community
GET /event-search/search?communityId=6&limit=5

# Proximity search (within 10 miles of San Francisco)
GET /event-search/search?lat=37.7749&lng=-122.4194&radius=10&sortBy=distance

# Combined text + proximity search
GET /event-search/search?lat=37.7749&lng=-122.4194&radius=25&query=tech&sortBy=relevance

# Search with tags
GET /event-search/search?tags=technology,programming&sortBy=date

# Complex search: text + location + tags + time filter
GET /event-search/search?query=AI&lat=37.7749&lng=-122.4194&radius=50&tags=technology&timeRange=1w&sortBy=distance
```

**Response:**

```json
{
    "status": "success",
    "data": {
        "events": [
            {
                "id": 15,
                "uniqueUrl": "tech-meetup-ai-machine-learning-1725724800000",
                "title": "Tech Meetup: AI & Machine Learning",
                "description": "Join us for an exciting discussion on the latest trends in AI and ML...",
                "communityId": 6,
                "communityName": "Tech Enthusiasts Hub", 
                "startTime": "2025-09-15T18:00:00.000Z",
                "endTime": "2025-09-15T20:00:00.000Z",
                "timezone": "America/New_York",
                "formattedDate": "September 15, 2025",
                "formattedTime": "02:00 PM",
                "startingIn": "5 days, 2 hours",
                "eventType": "physical",
                "attendeeCount": 12,
                "isPastEvent": false,
                "coverImage": {
                    "id": 8,
                    "entityType": "event", 
                    "entityId": 15,
                    "imageType": "cover",
                    "provider": "s3",
                    "key": "events/15/cover-image.jpg",
                    "altText": null,
                    "createdAt": "2025-08-27T18:00:00.000Z"
                },
                "tags": [
                    {"id": 1, "name": "technology"}, 
                    {"id": 2, "name": "AI"}
                ],
                "attendanceStatus": null,
                "distanceMiles": "2.5"  // Only in proximity search results
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 10,
            "totalItems": 8,
            "totalPages": 1
        }
    }
}
```

---

### 12. Get Event by Unique URL

Retrieve an event by its unique URL slug.

**Endpoint:** `GET /event-search/url/{uniqueUrl}`  
**Authentication:** Optional

**Parameters:**

- `uniqueUrl` - Event's unique URL slug

**Example:**

```
GET /event-search/url/tech-meetup-ai-machine-learning-1725724800000
```

**Response:** Same format as Get Event Details

---

## Error Responses

All endpoints return errors in the following format:

```json
{
    "status": "error",
    "message": "Error description",
    "stack": "Error stack trace (development only)"
}
```

**Common HTTP Status Codes:**

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions, banned user, supporters-only event)
- `404` - Not Found (event/resource not found)
- `500` - Internal Server Error

**Event-Specific Errors:**

- `400` - Event capacity reached (automatic waitlist)
- `403` - User is banned from community
- `403` - Supporters-only event (premium membership required)
- `403` - Cannot modify past event
- `409` - User already RSVP'd with this status

---

## Field Validation

### Event Creation/Update

- **title**: 3-255 characters (required for creation)
- **description**: max 2000 characters
- **content**: max 1000 characters (post content)
- **eventType**: "physical", "online", or "hybrid"
- **startTime**: ISO 8601 date string, must be in future
- **endTime**: ISO 8601 date string, must be after startTime
- **timezone**: Valid IANA timezone identifier
- **maxAttendees**: Positive integer (optional, unlimited if not set)
- **isSupportersOnly**: boolean
- **locationDetails**: max 500 characters

### Location Object

- **name**: 1-255 characters
- **locationType**: "address", "venue", "online", etc.
- **lat**: latitude between -90 and 90
- **lng**: longitude between -180 and 180
- **address**: max 500 characters

### Event Search

- **query**: minimum 2 characters
- **communityId**: positive integer
- **eventType**: "physical", "online", "hybrid"
- **timeRange**: "upcoming", "this_week", "this_month", "past"
- **lat/lng**: valid coordinates (-90 to 90 for lat, -180 to 180 for lng)
- **radius**: 0.1 to 500 miles
- **limit**: 1 to 100
- **offset**: non-negative integer

### Attendance

- **status**: "attending", "not_attending", "maybe"
- **attended**: boolean (for marking actual attendance)

---

## Event Types

### Physical Events
- Require location details
- Support proximity-based search
- Can have venue capacity limits
- Support check-in/attendance marking

### Online Events
- Include meeting links in locationDetails
- No geographic constraints
- Support unlimited attendees (unless maxAttendees set)

### Hybrid Events
- Combine physical and online aspects
- Support both venue and online details
- May have separate capacity limits

---

## Event Status and Lifecycle

### Event States
- **Upcoming**: startTime is in the future
- **Active**: startTime has passed, endTime hasn't (if set)
- **Past**: endTime has passed (or startTime if no endTime)

### Attendance States
- **attending**: User confirmed attendance
- **not_attending**: User declined attendance
- **maybe**: User is undecided
- **waitlisted**: User wants to attend but event is full

### Waitlist Behavior
- Automatic enrollment when event reaches capacity
- FIFO promotion when spaces become available
- Users can leave waitlist at any time
- Position tracking for user experience

---

## Permissions and Access Control

### Event Creation
- Must be a member of the community
- Email verification required
- No additional role requirements

### Event Management (Update/Delete)
- Event creator has full control
- Community admins (owner/organizer/moderator) can manage any event
- Cannot modify events that have already started

### Event Visibility
- Public community events are visible to all
- Private community events only visible to members
- Supporters-only events require premium community membership

### Attendance
- Must be community member to RSVP
- Cannot attend if banned from community
- Supporters-only events require premium membership

---

## Key Features & Implementation Details

### Event Creation Process
1. **Dual Identifier Support**: Events can be created using either numeric community IDs or unique URL identifiers
2. **Automatic URL Generation**: Each event gets a unique URL slug generated from the title and timestamp
3. **Database Transactions**: Event creation involves multiple operations (post, event, location, image) wrapped in transactions
4. **Image Handling**: Support for cover images with metadata including provider, key, and alt text

### Timezone Implementation
1. **UTC Storage**: All event times are stored in UTC in the database for consistency
2. **Timezone Display**: Events are formatted using the specified timezone for user-friendly display
3. **International Support**: Uses Intl.DateTimeFormat API for proper timezone conversion
4. **Timezone Validation**: Invalid timezones are rejected using Intl API validation
5. **Fallback Handling**: If timezone conversion fails, system falls back to UTC display

### Advanced Features
1. **Community Resolution**: Smart handling of both numeric IDs and unique URLs for communities
2. **Permission System**: Event creators and community admins can manage events
3. **Real-time Calculations**: Dynamic "time until event" calculations and formatting
4. **Comprehensive Responses**: API returns both raw UTC data and formatted display data

### Data Structure
- **Events** link to **Posts** (for community integration and content)
- **Events** can have **Locations** (with coordinates and address data)  
- **Events** can have **Images** (cover photos with metadata)
- **Events** generate unique URL slugs for SEO-friendly access

---

## Notes

1. **Unique URLs**: Event URLs are auto-generated from title and timestamp for SEO-friendly access
2. **Event Capacity**: When maxAttendees is reached, new attendees automatically go to waitlist
3. **Timezone Handling**: All times stored in UTC, with intelligent conversion and display in event's specified timezone
4. **Past Events**: Cannot update start/end times for events that have already begun
5. **Image Management**: Cover images are handled during event creation/update via coverImage field
6. **Location Data**: Physical events benefit from detailed location information for proximity search
7. **Waitlist Management**: Automatic FIFO promotion when attendees change status to "not_attending"
8. **Community Integration**: Events inherit community privacy and membership settings
9. **Transaction Safety**: All event operations use database transactions to ensure data consistency
10. **Performance Optimized**: Single queries with joins to reduce database round trips