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

Search for communities by name, description, tags, or proximity to a location.

**Endpoint:** `GET /community-search/search`  
**Authentication:** Optional (affects private community visibility)

**Query Parameters:**

-   `query` (optional) - Search term (minimum 2 characters)
-   `lat` (optional) - Latitude for proximity search (-90 to 90)
-   `lng` (optional) - Longitude for proximity search (-180 to 180)
-   `radius` (optional) - Search radius in miles (0.1 to 500, default: 25)
-   `limit` (optional) - Number of results (1-100, default: 20)
-   `offset` (optional) - Pagination offset (default: 0)

**Search Requirements:**
- Either `query` OR coordinates (`lat` & `lng`) must be provided
- If using proximity search, both `lat` and `lng` must be provided together
- Can combine text search with proximity for filtered location-based results

**Example URLs:**

```
# Text search only
GET /community-search/search?query=tech
GET /community-search/search?query=programming&limit=10&offset=0

# Proximity search only
GET /community-search/search?lat=37.7749&lng=-122.4194&radius=10

# Combined text + proximity search
GET /community-search/search?query=tech&lat=37.7749&lng=-122.4194&radius=25
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

### 24. Get My Communities (Token-based)

Get list of communities the authenticated user belongs to.

**Endpoint:** `GET /users/my/communities`  
**Authentication:** Required (JWT token)

**Query Parameters:**

-   `limit` (optional) - Number of results (1-100, default: 20)
-   `offset` (optional) - Pagination offset (default: 0)
-   `sort` (optional) - Sort by: role, joined (default: role)
-   `search` (optional) - Search community names

**Example:**

```
GET /users/my/communities?limit=10&sort=joined&search=tech
```

**Response:** (Same format as Get User Communities)

---

### 25. Get Community Recommendations

Get community recommendations - personalized for authenticated users, popular communities for visitors.

**Endpoint:** `GET /api/recommendations/communities`  
**Authentication:** Optional (personalized if authenticated, popular if not)

**Query Parameters:**

-   `limit` (optional) - Number of recommendations to return (1-20, default: 6)

**Examples:**

```bash
# Authenticated user - personalized recommendations
GET /api/recommendations/communities?limit=8
Authorization: Bearer <jwt_token>

# Non-authenticated user - popular communities
GET /api/recommendations/communities?limit=6
```

**Response:**

```json
{
    "status": "success",
    "data": [
        {
            "id": 1,
            "name": "Tech Enthusiasts Hub",
            "uniqueUrl": "tech-enthusiasts-hub",
            "tagline": "A community for technology lovers",
            "description": "Welcome to our tech community...",
            "isPrivate": false,
            "memberCount": 1250,
            "profileImage": {
                "provider": "s3",
                "key": "communities/1/profile.jpg",
                "alt_text": "Tech Hub Logo"
            },
            "coverImage": null,
            "tags": ["technology", "programming", "innovation"],
            "location": {
                "name": "San Francisco",
                "lat": 37.7749,
                "lng": -122.4194,
                "address": "San Francisco, CA"
            },
            "createdAt": "2025-08-08T16:25:11.511Z",
            "recommendationReason": "Based on your interests",
            "relevanceScore": 5
        }
    ],
    "meta": {
        "total": 6,
        "requested": 6,
        "userId": 123,
        "isAuthenticated": true,
        "message": "Recommendations based on your interests and activity",
        "strategiesUsed": ["interest", "geographic", "trending"],
        "generatedAt": "2025-08-27T10:30:00Z"
    }
}
```

**Behavior:**

**For Authenticated Users:**
- **Personalized recommendations** using multiple strategies
- **Smart messages** explaining recommendation reasons
- **Strategy tracking** showing which methods were used

**For Non-Authenticated Users:**
- **Popular communities** with high member counts and activity
- **Encouragement to sign up** for personalized recommendations
- **No private communities** in results

**Recommendation Strategies (Authenticated Users):**
1. **Interest Matching** - Communities matching user's interests and skills
2. **Geographic Proximity** - Nearby communities (if location available) 
3. **Collaborative Filtering** - Communities joined by users with similar interests
4. **Trending Communities** - Active and popular communities
5. **Random Discovery** - Fallback for diversity and new user experience

**Smart Messages:**
- "Recommendations based on your interests and activity" (full personalized results)
- "Found 3 communities. Add more interests to your profile for additional recommendations." (partial results)
- "You're already a member of all available communities! 🎉" (no available communities)
- "Popular communities to explore. Sign up for personalized recommendations!" (non-authenticated)

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

### Community Search

-   **query**: minimum 2 characters (optional if coordinates provided)
-   **lat**: latitude between -90 and 90 (required with lng for proximity search)
-   **lng**: longitude between -180 and 180 (required with lat for proximity search)
-   **radius**: between 0.1 and 500 miles (default: 25)
-   **limit**: between 1 and 100 (default: 20)
-   **offset**: non-negative integer (default: 0)

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
