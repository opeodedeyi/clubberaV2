# Community API Documentation

This documentation covers the community-related endpoints for the application.

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

## Community Management Endpoints

### 1. Create Community

Create a new community.

**Endpoint:** `POST /communities`  
**Authentication:** Required  
**Email Verification:** Required

**Request Body:**

```json
{
    "name": "Tech Enthusiasts Hub",
    "tagline": "A community for technology lovers and innovators",
    "description": "Welcome to our tech community where we discuss the latest trends...",
    "guidelines": "1. Be respectful\n2. No spam\n3. Keep discussions tech-related",
    "is_private": false,
    "location": {
        "city": "San Francisco",
        "lat": 37.7749,
        "lng": -122.4194,
        "address": "San Francisco, CA, USA"
    },
    "tags": ["technology", "programming", "innovation"],
    "profile_image": {
        "provider": "aws-s3",
        "key": "communities/profile/community-123-profile.jpg",
        "alt_text": "Tech Enthusiasts Hub logo"
    },
    "cover_image": {
        "provider": "aws-s3",
        "key": "communities/cover/community-123-cover.jpg",
        "alt_text": "Tech community banner"
    }
}
```

**Response:**

```json
{
    "status": "success",
    "data": {
        "id": 6,
        "name": "Tech Enthusiasts Hub",
        "uniqueUrl": "tech-enthusiasts-hub",
        "tagline": "A community for technology lovers and innovators",
        "description": "Welcome to our tech community...",
        "guidelines": "1. Be respectful\n2. No spam...",
        "isPrivate": false,
        "isActive": true,
        "createdAt": "2025-08-08T16:25:11.511Z",
        "updatedAt": "2025-08-08T16:25:11.604Z",
        "profileImage": {
            /* image object */
        },
        "coverImage": {
            /* image object */
        },
        "location": {
            /* location object */
        },
        "tags": ["technology", "programming", "innovation"],
        "memberCount": 1,
        "subscription": {
            "plan": "free",
            "status": "active",
            "isPro": false
        }
    }
}
```

---

### 2. Get Community Details

Retrieve detailed information about a community by ID or unique URL.

**Endpoint:** `GET /communities/{identifier}`  
**Authentication:** Optional (affects private community visibility)

**Parameters:**

-   `identifier` - Community ID (number) or unique URL (string)

**Example URLs:**

```
GET /communities/6
GET /communities/tech-enthusiasts-hub
```

**Response:**

```json
{
    "status": "success",
    "data": {
        "id": 6,
        "name": "Tech Enthusiasts Hub",
        "uniqueUrl": "tech-enthusiasts-hub",
        "tagline": "A community for technology lovers and innovators",
        "description": "Welcome to our tech community...",
        "guidelines": "1. Be respectful\n2. No spam...",
        "isPrivate": false,
        "isActive": true,
        "createdAt": "2025-08-08T16:25:11.511Z",
        "updatedAt": "2025-08-08T16:25:11.604Z",
        "profileImage": {
            /* image object */
        },
        "coverImage": {
            /* image object */
        },
        "location": {
            /* location object */
        },
        "tags": ["technology", "programming", "innovation"],
        "memberCount": 1,
        "subscription": {
            "plan": "free",
            "status": "active",
            "isPro": false
        },
        "user": {
            "isMember": true,
            "isAdmin": true,
            "membershipDetails": {
                /* membership object */
            },
            "activeRestrictions": null
        }
    }
}
```

---

### 3. Check your Community permission

Retrieve detailed information about a community by ID.

**Endpoint:** `GET {{url}}/api/communities/6/permissions`
**Authentication:** Headers: Authorization: Bearer your_jwt_token

**Example URLs:**

```
GET /communities/6/permissions
```

**Response:**

```json
{
    "status": "success",
    "data": {
        "isMember": true,
        "isOwner": true,
        "isOrganizer": false,
        "isModerator": false,
        "isAdmin": true,
        "role": "owner",
        "canCreateEvents": true,
        "canEditCommunity": true,
        "canManageMembers": true,
        "canViewAnalytics": true,
        "canManageRoles": true,
        "canDeleteCommunity": true,
        "canTransferOwnership": true,
        "canManageSubscription": true
    }
}
```

---

### 4. Search Communities

Search for communities by name, description, or tags.

**Endpoint:** `GET /community-search/search`  
**Authentication:** Optional (affects private community visibility)

**Query Parameters:**

-   `query` (required) - Search term (minimum 2 characters)
-   `limit` (optional) - Number of results (1-100, default: 20)
-   `offset` (optional) - Pagination offset (default: 0)

**Example URLs:**

```
GET /community-search/search?query=tech
GET /community-search/search?query=programming&limit=10&offset=0
```

**Response:**

```json
{
    "status": "success",
    "data": [
        {
            "id": 6,
            "name": "Tech Enthusiasts Hub",
            "uniqueUrl": "tech-enthusiasts-hub",
            "tagline": "A community for technology lovers",
            "isPrivate": false,
            "profileImage": {
                /* image object */
            },
            "coverImage": {
                /* image object */
            },
            "memberCount": 1,
            "tags": ["technology", "programming", "innovation"],
            "location": {
                /* location object */
            },
            "createdAt": "2025-08-08T16:25:11.511Z"
        }
    ],
    "pagination": {
        "total": 1,
        "limit": 20,
        "offset": 0,
        "hasMore": false
    }
}
```

---

## Community Updates

### 5. Update Basic Details

Update community name, tagline, description, guidelines, privacy, and location.

**Endpoint:** `PUT /communities/{id}`  
**Authentication:** Required  
**Email Verification:** Required  
**Permission:** Owner or Organizer

**Request Body:** (all fields optional)

```json
{
    "name": "Updated Tech Enthusiasts Hub",
    "tagline": "An updated community for technology lovers",
    "description": "Welcome to our updated tech community...",
    "guidelines": "1. Be respectful\n2. No spam\n3. Keep discussions tech-related",
    "is_private": false,
    "location": {
        "city": "New York",
        "lat": 40.7128,
        "lng": -74.006,
        "address": "New York, NY, USA"
    }
}
```

---

### 6. Update Profile Image

Update community profile image.

**Endpoint:** `PUT /communities/{id}/profile-image`  
**Authentication:** Required  
**Email Verification:** Required  
**Permission:** Owner or Organizer

**Request Body:**

```json
{
    "provider": "aws-s3",
    "key": "communities/profile/updated-community-profile.jpg",
    "alt_text": "Updated Tech Enthusiasts Hub profile image"
}
```

---

### 7. Update Cover Image

Update community cover/banner image.

**Endpoint:** `PUT /communities/{id}/cover-image`  
**Authentication:** Required  
**Email Verification:** Required  
**Permission:** Owner or Organizer

**Request Body:**

```json
{
    "provider": "aws-s3",
    "key": "communities/cover/updated-community-cover.jpg",
    "alt_text": "Updated Tech Enthusiasts Hub cover banner"
}
```

---

### 8. Update Tags

Update community tags (replaces all existing tags).

**Endpoint:** `PUT /communities/{id}/tags`  
**Authentication:** Required  
**Email Verification:** Required  
**Permission:** Owner or Organizer

**Request Body:**

```json
{
    "tags": [
        "technology",
        "programming",
        "innovation",
        "startup",
        "ai",
        "machine-learning"
    ]
}
```

**Response:**

```json
{
    "status": "success",
    "message": "Community tags updated successfully",
    "data": {
        "tags": [
            "technology",
            "programming",
            "innovation",
            "startup",
            "ai",
            "machine-learning"
        ]
    }
}
```

---

## Community Management

### 9. Join Community

Join a public community or request to join a private community.

**Endpoint:** `POST /communities/{id}/join`  
**Authentication:** Required  
**Email Verification:** Required

**Request Body:** (optional for private communities)

```json
{
    "message": "I would like to join this community because..."
}
```

---

### 10. Leave Community

Leave a community (owners cannot leave).

**Endpoint:** `DELETE /communities/{id}/members/me`  
**Authentication:** Required

---

### 11. Get Community Members

Get list of community members with pagination.

**Endpoint:** `GET /communities/{id}/members`  
**Authentication:** Required

**Query Parameters:**

-   `limit` (optional) - Number of results (1-100, default: 20)
-   `offset` (optional) - Pagination offset (default: 0)
-   `role` (optional) - Filter by role: owner, organizer, moderator, member

**Example:**

```
GET /communities/6/members?limit=10&offset=0&role=moderator
```

---

### 12. Get Join Requests

Get pending join requests for private communities.

**Endpoint:** `GET /communities/{id}/join-requests`  
**Authentication:** Required  
**Permission:** Owner, Organizer, or Moderator

---

### 13. Respond to Join Request

Approve or reject a join request.

**Endpoint:** `PUT /communities/{id}/join-requests/{requestId}`  
**Authentication:** Required  
**Permission:** Owner, Organizer, or Moderator

**Request Body:**

```json
{
    "status": "approved" // or "rejected"
}
```

---

## Community Administration

### 14. Deactivate Community

Deactivate a community (soft delete).

**Endpoint:** `PUT /communities/{id}/deactivate`  
**Authentication:** Required  
**Permission:** Owner

---

### 15. Reactivate Community

Reactivate a deactivated community.

**Endpoint:** `PUT /communities/{id}/reactivate`  
**Authentication:** Required  
**Permission:** Owner or Superuser

---

### 16. Delete Community

Permanently delete a community.

**Endpoint:** `DELETE /communities/{id}`  
**Authentication:** Required  
**Permission:** Superuser only

---

## Subscription Management

### 17. Get Subscription Plans

Get available subscription plans.

**Endpoint:** `GET /communities/subscription-plans`  
**Authentication:** Not required

---

### 18. Get Community Subscription

Get current subscription details for a community.

**Endpoint:** `GET /communities/{id}/subscription`  
**Authentication:** Required  
**Permission:** Community member

---

### 19. Upgrade to Pro

Upgrade community to Pro plan.

**Endpoint:** `POST /communities/{id}/subscription/upgrade`  
**Authentication:** Required  
**Permission:** Owner

---

### 20. Downgrade to Free

Downgrade community to Free plan.

**Endpoint:** `POST /communities/{id}/subscription/downgrade`  
**Authentication:** Required  
**Permission:** Owner

---

### 21. Cancel Subscription

Cancel Pro subscription.

**Endpoint:** `POST /communities/{id}/subscription/cancel`  
**Authentication:** Required  
**Permission:** Owner

---

### 22. Get Payment History

Get subscription payment history.

**Endpoint:** `GET /communities/{id}/subscription/payments`  
**Authentication:** Required  
**Permission:** Owner

---

## User Communities

### 23. Get User Communities

Get list of communities a user belongs to.

**Endpoint:** `GET /users/{userIdentifier}/communities`  
**Authentication:** Optional

**Query Parameters:**

-   `limit` (optional) - Number of results (default: 20)
-   `offset` (optional) - Pagination offset (default: 0)
-   `sort` (optional) - Sort by: role, joined (default: role)
-   `search` (optional) - Search community names

**Example:**

```
GET /users/john@example.com/communities?limit=10&sort=joined&search=tech
```

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

-   `400` - Bad Request (validation errors)
-   `401` - Unauthorized (missing or invalid token)
-   `403` - Forbidden (insufficient permissions)
-   `404` - Not Found (community/resource not found)
-   `500` - Internal Server Error

---

## Field Validation

### Community Creation/Update

-   **name**: 3-50 characters (required for creation)
-   **tagline**: max 150 characters
-   **is_private**: boolean
-   **location.city**: 1-100 characters
-   **location.lat**: -90 to 90
-   **location.lng**: -180 to 180
-   **tags**: array of strings, each 1-50 characters, alphanumeric with spaces and hyphens

### Images

-   **provider**: required string
-   **key**: required string
-   **alt_text**: max 255 characters

---

## Notes

1. **Unique URLs**: Community URLs are auto-generated from names and must be unique
2. **Reserved Words**: "search", "admin", "api", etc. are reserved and cannot be used as community URLs
3. **Email Verification**: Required for most write operations
4. **Rate Limiting**: Consider implementing rate limiting for search and creation endpoints
5. **File Uploads**: Image uploads should be handled separately via temp upload endpoints
