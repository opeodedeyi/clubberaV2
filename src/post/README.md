# Posts & Polls Documentation

This document provides detailed instructions on how to create posts and different types of polls in the community platform.

---

## Table of Contents

1. [Creating Posts](#creating-posts)
2. [Getting Posts](#getting-posts)
3. [Deleting Posts](#deleting-posts)
4. [Replies](#replies)
   - [Get Replies](#get-replies)
   - [Create Reply](#create-reply)
   - [Update Reply](#update-reply)
   - [Delete Reply](#delete-reply)
5. [Reactions](#reactions)
   - [Get Reactions](#get-reactions)
   - [Add Reaction](#add-reaction)
   - [Remove Reaction](#remove-reaction)
   - [Check User Reaction](#check-user-reaction)
6. [Creating Polls](#creating-polls)
   - [Single Choice Poll](#single-choice-poll)
   - [Multiple Choice Poll](#multiple-choice-poll)
   - [Time-Limited Poll](#time-limited-poll)
   - [Supporters-Only Poll](#supporters-only-poll)
7. [Voting on Polls](#voting-on-polls)
8. [Poll Permissions](#poll-permissions)

---

## Creating Posts

### Basic Post Creation

**Endpoint:** `POST /api/posts`

**Authentication:** Required (must be a community member)

**Request Body:**
```json
{
  "communityId": 1,
  "content": "This is my post content. It can be up to 5000 characters long.",
  "isSupportersOnly": false,
  "images": [
    {
      "provider": "s3",
      "key": "post-images/image1.jpg",
      "altText": "Description of image"
    }
  ]
}
```

**Field Descriptions:**
- `communityId` (required): The ID of the community where the post will be created
- `content` (required): The post content (max 5000 characters)
- `isSupportersOnly` (optional, default: `false`): If `true`, only community supporters can view this post
- `images` (optional): Array of image objects to attach to the post
  - `provider`: Storage provider (e.g., "s3")
  - `key`: Storage key/path for the image
  - `altText`: Alternative text for accessibility

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 123,
    "community_id": 1,
    "user_id": 5,
    "content": "This is my post content...",
    "is_supporters_only": false,
    "content_type": "post",
    "user": {
      "id": 5,
      "full_name": "John Doe",
      "unique_url": "john-doe",
      "profile_image": null
    },
    "community_name": "Tech Community",
    "community_url": "tech-community",
    "likes_count": 0,
    "replies_count": 0,
    "images": [
      {
        "id": 45,
        "provider": "s3",
        "key": "post-images/image1.jpg",
        "alt_text": "Description of image"
      }
    ],
    "created_at": "2025-10-13T14:30:00Z",
    "updated_at": "2025-10-13T14:30:00Z"
  }
}
```

---

## Getting Posts

### Get a Single Post (or Poll)

Retrieve a specific post by ID. This endpoint works for **all content types**: regular posts, polls, and events.

**Endpoint:** `GET /api/posts/:id`

**Authentication:** Optional (use for supporters-only posts)

**Request:**
```bash
GET /api/posts/123
```

**Response for Regular Post:**
```json
{
  "status": "success",
  "data": {
    "id": 123,
    "community_id": 1,
    "user_id": 5,
    "content": "This is a regular post about JavaScript!",
    "content_type": "post",
    "is_supporters_only": false,
    "is_hidden": false,
    "parent_id": null,
    "user": {
      "id": 5,
      "full_name": "John Doe",
      "unique_url": "john-doe",
      "profile_image": {
        "id": 10,
        "provider": "s3",
        "key": "user-profiles/john.jpg",
        "alt_text": "John's profile"
      }
    },
    "community_name": "Tech Community",
    "community_url": "tech-community",
    "likes_count": 15,
    "replies_count": 3,
    "images": [
      {
        "id": 45,
        "provider": "s3",
        "key": "post-images/image1.jpg",
        "alt_text": "Description"
      }
    ],
    "created_at": "2025-10-13T14:30:00Z",
    "updated_at": "2025-10-13T14:30:00Z"
  }
}
```

**Response for Poll:**
```json
{
  "status": "success",
  "data": {
    "id": 456,
    "community_id": 1,
    "user_id": 5,
    "content": "What's your favorite programming language?",
    "content_type": "poll",
    "is_supporters_only": false,
    "poll_data": {
      "question": "What's your favorite programming language?",
      "options": [
        { "text": "JavaScript", "votes": 25 },
        { "text": "Python", "votes": 30 },
        { "text": "Java", "votes": 10 }
      ],
      "settings": {
        "allowMultipleVotes": false,
        "endDate": "2025-10-20T23:59:59Z"
      },
      "votes": [
        { "userId": 1, "optionIndices": [0], "votedAt": "2025-10-13T10:00:00Z" },
        { "userId": 5, "optionIndices": [1], "votedAt": "2025-10-13T14:30:00Z" }
      ]
    },
    "userHasVoted": true,
    "userVote": {
      "optionIndices": [1],
      "votedAt": "2025-10-13T14:30:00Z",
      "voteCount": 1
    },
    "user": {
      "id": 5,
      "full_name": "Jane Smith",
      "unique_url": "jane-smith",
      "profile_image": {
        "id": 11,
        "provider": "s3",
        "key": "user-profiles/jane.jpg",
        "alt_text": "Jane's profile"
      }
    },
    "community_name": "Tech Community",
    "community_url": "tech-community",
    "likes_count": 8,
    "replies_count": 5,
    "created_at": "2025-10-13T10:00:00Z",
    "updated_at": "2025-10-13T15:00:00Z"
  }
}
```

### Key Features

**Intelligent Response Based on `content_type`:**
- `content_type: "post"` → Returns regular post data
- `content_type: "poll"` → Returns poll data + `userHasVoted` + `userVote`
- `content_type: "event"` → Returns event-specific data

**Poll Enrichment:**
When fetching a poll, the response includes:
- `userHasVoted` (boolean) - Did the current user vote?
- `userVote` (object) - What did they vote for and when?
  - `optionIndices` - Array of option indices voted for
  - `votedAt` - Timestamp of vote
  - `voteCount` - Number of times voted (for multi-choice)

**Use Cases:**
- Direct links (sharing posts)
- Notifications → View post
- Reply threads → View parent post
- Deep linking from emails/external sources
- SEO/Open Graph meta tags

### Get Community Posts

Retrieve all posts (and polls) from a specific community.

**Endpoint:** `GET /api/posts/community/:communityId`

**Authentication:** Optional (required for supporters-only posts)

**Query Parameters:**
- `limit` (optional, default: 20) - Number of posts per page
- `offset` (optional, default: 0) - Pagination offset
- `contentType` (optional) - Filter by type: `"post"` or `"poll"`
- `supportersOnly` (optional) - Filter: `true` or `false`

**Request:**
```bash
GET /api/posts/community/1?limit=20&offset=0
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 123,
      "content": "Latest community update!",
      "content_type": "post",
      "user": {
        "id": 5,
        "full_name": "John Doe",
        "unique_url": "john-doe",
        "profile_image": null
      },
      "community_name": "Tech Community",
      "community_url": "tech-community",
      "likes_count": 15,
      "replies_count": 3,
      "user_has_liked": false,
      "created_at": "2025-10-13T14:30:00Z"
    },
    {
      "id": 456,
      "content": "Community poll",
      "content_type": "poll",
      "poll_data": { ... },
      "user": {
        "id": 6,
        "full_name": "Jane Smith",
        "unique_url": "jane-smith",
        "profile_image": null
      },
      "community_name": "Tech Community",
      "community_url": "tech-community",
      "userHasVoted": true,
      "likes_count": 8,
      "user_has_liked": false,
      "created_at": "2025-10-13T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

### Error Responses

**404 - Post Not Found**
```json
{
  "status": "error",
  "message": "Post not found"
}
```

**403 - Supporters Only (No Access)**
```json
{
  "status": "error",
  "message": "This post is for community supporters only"
}
```

**401 - Authentication Required**
```json
{
  "status": "error",
  "message": "Authentication required to view this post"
}
```

### Important Notes

1. **No Separate Poll Endpoint** - Use `GET /api/posts/:id` for both posts and polls. The response is automatically enriched based on `content_type`.

2. **Hidden Posts** - Deleted posts (`is_hidden: true`) are filtered out from community feeds but can still be accessed directly by ID (useful for showing "[deleted]" placeholders in reply threads).

3. **Supporters-Only** - If a post is supporters-only and you're not authenticated or not a supporter, you'll receive a 403 or 401 error.

---

## Deleting Posts

Posts use **soft delete**, meaning they are hidden rather than permanently removed from the database.

**Endpoint:** `DELETE /api/posts/:id`

**Authentication:** Required (must be post owner)

**Request:**
```bash
DELETE /api/posts/123
```

**Successful Response:**
```json
{
  "status": "success",
  "message": "Post deleted successfully",
  "data": {
    "id": 123,
    "is_hidden": true
  }
}
```

### How Soft Delete Works

When you delete a post:
- ✅ Post is marked as `is_hidden = true`
- ✅ Post **disappears from community feeds**
- ✅ Post **doesn't appear in search**
- ✅ Post **isn't counted in totals**
- ✅ **Replies, reactions, and images are preserved**
- ✅ Data remains in database for audit/legal purposes

### What Happens to Deleted Posts

| Feature | Behavior |
|---------|----------|
| **Community Feed** | Hidden (not shown) |
| **Direct Access** | Accessible (for showing "[deleted]" placeholder) |
| **Replies** | Preserved (conversation context maintained) |
| **Reactions/Likes** | Preserved |
| **Images** | Preserved |
| **Search Results** | Hidden |
| **Post Counts** | Not counted |

### Error Responses

**404 - Post Not Found**
```json
{
  "status": "error",
  "message": "Post not found"
}
```

**403 - Unauthorized**
```json
{
  "status": "error",
  "message": "Unauthorized to delete this post"
}
```
**Solution:** You can only delete your own posts.

**400 - Already Deleted**
```json
{
  "status": "error",
  "message": "Post is already deleted"
}
```
**Solution:** This post has already been deleted (is_hidden = true).

### Important Note About Polls

**Polls use the same delete endpoint** - there's no separate endpoint for deleting polls since polls are stored in the `posts` table with `content_type = 'poll'`.

```bash
# Delete a regular post
DELETE /api/posts/123

# Delete a poll (same endpoint!)
DELETE /api/posts/456
```

**When a poll is deleted:**
- ❌ Users cannot vote on it anymore (returns "Poll has been deleted")
- ❌ It won't appear in feeds
- ✅ Vote data is preserved
- ✅ Poll results remain in database

### Why Soft Delete?

1. **Data Integrity** - Preserves conversation threads and context
2. **Audit Trail** - Maintains records for legal/compliance purposes
3. **Analytics** - Track deletion patterns and user behavior
4. **Undo Capability** - Potential to restore posts in future
5. **No Cascade Loss** - Replies and reactions aren't lost



---

## Replies

Replies are comments/responses to posts. They are stored as posts with a `parent_id` reference.

### Get Replies

Get all replies for a specific post.

**Endpoint:** `GET /api/posts/:postId/replies`

**Authentication:** Optional

**Query Parameters:**
- `limit` (optional, default: 20) - Number of replies per page
- `offset` (optional, default: 0) - Pagination offset

**Request:**
```bash
GET /api/posts/123/replies?limit=20&offset=0
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 456,
      "community_id": 1,
      "user_id": 10,
      "content": "Great post! Thanks for sharing.",
      "content_type": "post",
      "parent_id": 123,
      "is_hidden": false,
      "user": {
        "id": 10,
        "full_name": "Jane Doe",
        "unique_url": "jane-doe",
        "profile_image": {
          "id": 25,
          "provider": "s3",
          "key": "profiles/jane.jpg",
          "alt_text": "Jane's profile"
        }
      },
      "community_name": "Tech Community",
      "community_url": "tech-community",
      "likes_count": 5,
      "user_has_liked": false,
      "created_at": "2025-10-13T15:00:00Z",
      "updated_at": "2025-10-13T15:00:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### Create Reply

Create a reply (comment) on a post.

**Endpoint:** `POST /api/posts/:postId/replies`

**Authentication:** Required (must be community member)

**Request Body:**
```json
{
  "content": "This is my reply to the post. Great insights!",
  "images": [
    {
      "provider": "s3",
      "key": "reply-images/image1.jpg",
      "altText": "Screenshot"
    }
  ]
}
```

**Field Descriptions:**
- `content` (required): Reply text (max 5000 characters)
- `images` (optional): Array of images to attach

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 789,
    "community_id": 1,
    "user_id": 5,
    "content": "This is my reply to the post. Great insights!",
    "content_type": "post",
    "parent_id": 123,
    "is_supporters_only": false,
    "user": {
      "id": 5,
      "full_name": "John Smith",
      "unique_url": "john-smith",
      "profile_image": {...}
    },
    "images": [...],
    "created_at": "2025-10-13T16:00:00Z"
  }
}
```

**Notes:**
- Replies inherit the `is_supporters_only` flag from the parent post
- If parent post is supporters-only, only supporters can reply
- Must be a member of the community to reply

---

### Update Reply

Update the content of an existing reply.

**Endpoint:** `PUT /api/posts/replies/:replyId`

**Authentication:** Required (must be reply author)

**Request Body:**
```json
{
  "content": "Updated reply content here."
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 789,
    "content": "Updated reply content here.",
    "is_edited": true,
    "edited_at": "2025-10-13T17:00:00Z",
    "updated_at": "2025-10-13T17:00:00Z"
  }
}
```

---

### Delete Reply

Soft delete a reply (sets `is_hidden = true`).

**Endpoint:** `DELETE /api/posts/replies/:replyId`

**Authentication:** Required (must be reply author)

**Response:**
```json
{
  "status": "success",
  "message": "Reply deleted successfully",
  "data": {
    "id": 789,
    "is_hidden": true
  }
}
```

**Notes:**
- Soft delete preserves the reply in the database
- Deleted replies won't appear in GET requests
- Conversation context is maintained

---

## Reactions

Reactions allow users to like/react to posts and replies. Currently only "like" reaction type is supported.

### Get Reactions

Get all users who reacted to a post.

**Endpoint:** `GET /api/posts/:postId/reactions`

**Authentication:** Optional

**Query Parameters:**
- `limit` (optional, default: 20) - Number of reactions per page
- `offset` (optional, default: 0) - Pagination offset

**Request:**
```bash
GET /api/posts/123/reactions?limit=20&offset=0
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "reactions": [
      {
        "id": 1,
        "post_id": 123,
        "user_id": 5,
        "reaction_type": "like",
        "user": {
          "id": 5,
          "full_name": "John Doe",
          "unique_url": "john-doe",
          "profile_image": {
            "id": 10,
            "provider": "s3",
            "key": "profiles/john.jpg",
            "alt_text": "John's profile"
          }
        },
        "created_at": "2025-10-13T14:30:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0
    }
  }
}
```

---

### Add Reaction

Add a "like" reaction to a post.

**Endpoint:** `POST /api/posts/:postId/reactions`

**Authentication:** Required (must be community member)

**Request Body:**
```json
{
  "reactionType": "like"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Reaction added successfully",
  "data": {
    "id": 50,
    "post_id": 123,
    "user_id": 5,
    "reaction_type": "like",
    "created_at": "2025-10-13T16:00:00Z"
  }
}
```

**Error - Already Reacted:**
```json
{
  "status": "error",
  "message": "User has already reacted to this post with this reaction type"
}
```

---

### Remove Reaction

Remove your "like" reaction from a post.

**Endpoint:** `DELETE /api/posts/:postId/reactions`

**Authentication:** Required

**Request Body:**
```json
{
  "reactionType": "like"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Reaction removed successfully"
}
```

**Error - No Reaction Found:**
```json
{
  "status": "error",
  "message": "Reaction not found"
}
```

---

### Check User Reaction

Check if the current user has reacted to a post.

**Endpoint:** `GET /api/posts/:postId/reactions/me`

**Authentication:** Required

**Response - Has Reacted:**
```json
{
  "status": "success",
  "data": {
    "hasReacted": true,
    "reaction": {
      "id": 50,
      "reaction_type": "like",
      "created_at": "2025-10-13T16:00:00Z"
    }
  }
}
```

**Response - Not Reacted:**
```json
{
  "status": "success",
  "data": {
    "hasReacted": false,
    "reaction": null
  }
}
```

---

### Reaction Error Responses

**403 - Supporters Only:**
```json
{
  "status": "error",
  "message": "This post is for community supporters only"
}
```

**404 - Post Not Found:**
```json
{
  "status": "error",
  "message": "Post not found"
}
```

**403 - Not a Community Member:**
```json
{
  "status": "error",
  "message": "You must be a member of this community to react to posts"
}
```

---

### Reaction Notes

- Currently only **"like"** reaction type is supported
- Users can only add one reaction per post (no duplicate likes)
- Reactions are counted in the `likes_count` field on posts
- The `user_has_liked` field indicates if the current user has liked the post
- Soft-deleted posts can still be liked (for conversation preservation)
---

## Creating Polls

### Important Notes:
- **Who can create polls:** Only community owners and organizers can create polls
- **Minimum options:** All polls must have at least 2 options
- **Maximum option length:** 200 characters per option
- **Maximum question length:** 500 characters

### Single Choice Poll

Users can only vote for ONE option. This is the default poll type.

**Endpoint:** `POST /api/posts/polls`

**Authentication:** Required (must be owner or organizer)

**Request Body:**
```json
{
  "communityId": 1,
  "content": "What's your favorite programming language?",
  "isSupportersOnly": false,
  "pollData": {
    "question": "What's your favorite programming language?",
    "options": [
      { "text": "JavaScript" },
      { "text": "Python" },
      { "text": "Java" },
      { "text": "Go" }
    ],
    "settings": {
      "allowMultipleVotes": false,
      "endDate": null
    }
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 456,
    "community_id": 1,
    "user_id": 5,
    "content": "What's your favorite programming language?",
    "content_type": "poll",
    "is_supporters_only": false,
    "poll_data": {
      "question": "What's your favorite programming language?",
      "options": [
        { "text": "JavaScript", "votes": 0 },
        { "text": "Python", "votes": 0 },
        { "text": "Java", "votes": 0 },
        { "text": "Go", "votes": 0 }
      ],
      "settings": {
        "allowMultipleVotes": false,
        "endDate": null
      },
      "votes": []
    },
    "userHasVoted": false,
    "userVote": null,
    "user": {
      "id": 5,
      "full_name": "John Doe",
      "unique_url": "john-doe",
      "profile_image": null
    },
    "community_name": "Tech Community",
    "community_url": "tech-community",
    "likes_count": 0,
    "replies_count": 0,
    "created_at": "2025-10-13T14:30:00Z",
    "updated_at": "2025-10-13T14:30:00Z"
  }
}
```

---

### Multiple Choice Poll

Users can vote for MULTIPLE options at once.

**Endpoint:** `POST /api/posts/polls`

**Request Body:**
```json
{
  "communityId": 1,
  "content": "Which programming languages do you know? (Select all that apply)",
  "isSupportersOnly": false,
  "pollData": {
    "question": "Which programming languages do you know?",
    "options": [
      { "text": "JavaScript" },
      { "text": "Python" },
      { "text": "Java" },
      { "text": "Go" },
      { "text": "Rust" },
      { "text": "C++" }
    ],
    "settings": {
      "allowMultipleVotes": true,
      "endDate": null
    }
  }
}
```

**Key Difference:**
- `allowMultipleVotes: true` - This enables multiple choice voting

**Voting Behavior:**
- Users can select multiple options in a single vote
- Users can vote multiple times if they want to add more selections later
- Each vote action is tracked separately with timestamps

---

### Time-Limited Poll

Poll automatically closes at a specified date/time.

**Endpoint:** `POST /api/posts/polls`

**Request Body:**
```json
{
  "communityId": 1,
  "content": "What time works best for our next meetup?",
  "isSupportersOnly": false,
  "pollData": {
    "question": "What time works best for our next meetup?",
    "options": [
      { "text": "Saturday 10 AM" },
      { "text": "Saturday 2 PM" },
      { "text": "Sunday 10 AM" },
      { "text": "Sunday 2 PM" }
    ],
    "settings": {
      "allowMultipleVotes": false,
      "endDate": "2025-10-20T23:59:59Z"
    }
  }
}
```

**Key Points:**
- `endDate`: ISO 8601 formatted date string
- Poll automatically becomes read-only after this date
- Users cannot vote after the end date
- Poll creator can manually end the poll early using the "End Poll" endpoint

**End Poll Manually:**
```
POST /api/posts/polls/:pollId/end
```

---

### Supporters-Only Poll

Only community supporters can view and vote on this poll.

**Endpoint:** `POST /api/posts/polls`

**Request Body:**
```json
{
  "communityId": 1,
  "content": "Exclusive supporters poll: What premium features do you want next?",
  "isSupportersOnly": true,
  "pollData": {
    "question": "What premium features do you want next?",
    "options": [
      { "text": "Advanced Analytics" },
      { "text": "Custom Themes" },
      { "text": "Priority Support" },
      { "text": "Early Access to Features" }
    ],
    "settings": {
      "allowMultipleVotes": true,
      "endDate": "2025-11-01T23:59:59Z"
    }
  }
}
```

**Key Difference:**
- `isSupportersOnly: true` - Only community supporters can access this poll

**Access Rules:**
- Non-supporters will receive a 403 error
- Unauthenticated users will receive a 401 error
- Poll creator (if supporter) can always access their own poll

---

### Combined Example: Multiple Choice + Time-Limited + Supporters-Only

You can combine all settings for advanced polls:

```json
{
  "communityId": 1,
  "content": "Premium poll: Which advanced features should we prioritize? (Select all that apply, ends in 7 days)",
  "isSupportersOnly": true,
  "pollData": {
    "question": "Which advanced features should we prioritize?",
    "options": [
      { "text": "AI-Powered Recommendations" },
      { "text": "Video Chat Integration" },
      { "text": "Advanced Moderation Tools" },
      { "text": "Custom Branding" },
      { "text": "API Access" }
    ],
    "settings": {
      "allowMultipleVotes": true,
      "endDate": "2025-10-20T23:59:59Z"
    }
  }
}
```

---

## Voting on Polls

**Endpoint:** `POST /api/posts/polls/:pollId/vote`

**Authentication:** Required (must be community member)

This single endpoint intelligently handles **both initial voting AND vote changes**. No need for separate endpoints!

---

### How It Works

The voting endpoint automatically detects:
- ✅ **First-time vote** → Creates new vote and returns "Vote recorded successfully"
- ✅ **Vote change (single-choice poll)** → Automatically replaces old vote and returns "Vote changed successfully"
- ✅ **Additional vote (multiple-choice poll)** → Adds new vote alongside existing votes

---

### Single Choice Poll - First Vote

**Request Body:**
```json
{
  "optionIndices": [1]
}
```

**Example:** Voting for "Python" (index 1 in the options array)

**Response:**
```json
{
  "status": "success",
  "message": "Vote recorded successfully",
  "data": {
    "id": 456,
    "community_id": 1,
    "user_id": 5,
    "content": "What's your favorite programming language?",
    "content_type": "poll",
    "is_supporters_only": false,
    "poll_data": {
      "question": "What's your favorite programming language?",
      "options": [
        { "text": "JavaScript", "votes": 5 },
        { "text": "Python", "votes": 8 },
        { "text": "Java", "votes": 3 },
        { "text": "Go", "votes": 2 }
      ],
      "settings": {
        "allowMultipleVotes": false,
        "endDate": null
      },
      "votes": [
        { "userId": 1, "optionIndices": [0], "votedAt": "2025-10-13T10:00:00Z" },
        { "userId": 5, "optionIndices": [1], "votedAt": "2025-10-13T14:30:00Z" }
      ]
    },
    "userHasVoted": true,
    "userVote": {
      "optionIndices": [1],
      "votedAt": "2025-10-13T14:30:00Z",
      "voteCount": 1
    },
    "user": {
      "id": 5,
      "full_name": "John Doe",
      "unique_url": "john-doe",
      "profile_image": null
    },
    "community_name": "Tech Community",
    "community_url": "tech-community",
    "likes_count": 10,
    "replies_count": 2,
    "created_at": "2025-10-13T10:00:00Z",
    "updated_at": "2025-10-13T14:30:00Z"
  }
}
```

---

### Single Choice Poll - Changing Vote

**Same Endpoint:** `POST /api/posts/polls/:pollId/vote`

If you vote again on a single-choice poll, your vote is **automatically changed**:

**Request Body:**
```json
{
  "optionIndices": [2]
}
```

**Example:** Changing vote from "Python" to "Java"

**Response:**
```json
{
  "status": "success",
  "message": "Vote changed successfully",
  "data": {
    "id": 456,
    "poll_data": {
      "question": "What's your favorite programming language?",
      "options": [
        { "text": "JavaScript", "votes": 5 },
        { "text": "Python", "votes": 7 },  // Decreased by 1
        { "text": "Java", "votes": 4 },      // Increased by 1
        { "text": "Go", "votes": 2 }
      ],
      "votes": [
        { "userId": 1, "optionIndices": [0], "votedAt": "2025-10-13T10:00:00Z" },
        { "userId": 5, "optionIndices": [2], "votedAt": "2025-10-13T15:45:00Z" }  // Updated vote
      ]
    },
    "userHasVoted": true,
    "userVote": {
      "optionIndices": [2],
      "votedAt": "2025-10-13T15:45:00Z",  // New timestamp
      "voteCount": 1
    }
  }
}
```

**What Happened Behind the Scenes:**
1. Old vote for "Python" (index 1) was removed
2. Python's vote count decreased from 8 → 7
3. New vote for "Java" (index 2) was added
4. Java's vote count increased from 3 → 4
5. Timestamp updated to current time

---

### Multiple Choice Poll - Voting

**Endpoint:** `POST /api/posts/polls/:pollId/vote`

**Request Body:**
```json
{
  "optionIndices": [0, 2, 4]
}
```

**Example:** Voting for "JavaScript", "Java", and "Rust" (indices 0, 2, 4)

**Multiple Choice Behavior:**
- First vote: Select options [0, 2] → Records vote with message "Vote recorded successfully"
- Second vote: Select options [4, 5] → Records **another** vote with message "Vote recorded successfully"
- All selections are tracked separately with timestamps
- Vote counts accumulate (no automatic replacement)

**Response:**
```json
{
  "status": "success",
  "message": "Vote recorded successfully",
  "data": {
    "poll_data": {
      "question": "Which languages do you know?",
      "options": [
        { "text": "JavaScript", "votes": 15 },
        { "text": "Python", "votes": 12 },
        { "text": "Java", "votes": 8 }
      ],
      "settings": {
        "allowMultipleVotes": true,
        "endDate": null
      }
    },
    "userHasVoted": true,
    "userVote": {
      "optionIndices": [0, 2, 4],  // All options this user has voted for
      "votedAt": "2025-10-13T15:00:00Z",
      "voteCount": 2  // Number of times user has voted
    }
  }
}
```

---

## Protection Rules

The voting endpoint strictly enforces these rules:

### ✅ Valid Votes
- User must be a community member
- Poll must not have ended (`endDate` not passed)
- Option indices must be valid (within options array)
- Single-choice polls: Only 1 option allowed per vote
- Multiple-choice polls: 1 or more options allowed per vote

### ❌ Rejected Votes

**Poll Has Ended:**
```json
{
  "status": "error",
  "message": "Poll has ended"
}
```

**Single-Choice Poll with Multiple Options:**
```json
{
  "status": "error",
  "message": "This poll only allows voting for one option"
}
```

**Invalid Option Index:**
```json
{
  "status": "error",
  "message": "Invalid option index"
}
```

**Not a Community Member:**
```json
{
  "status": "error",
  "message": "You must be a member of this community to vote"
}
```

**Supporters-Only Poll (Non-Supporter):**
```json
{
  "status": "error",
  "message": "This poll is for community supporters only"
}
```

**No Options Selected:**
```json
{
  "status": "error",
  "message": "At least one option must be selected"
}
```

---

## Poll Permissions

### Creating Polls
| Role | Can Create Polls? |
|------|-------------------|
| Owner | ✅ Yes |
| Organizer | ✅ Yes |
| Moderator | ❌ No |
| Member | ❌ No |

### Voting on Polls
| User Type | Can Vote? |
|-----------|-----------|
| Community Member | ✅ Yes (except supporters-only) |
| Non-Member | ❌ No |
| Guest (not authenticated) | ❌ No |

### Ending Polls
- Only the poll creator can manually end their poll
- Polls automatically end at the `endDate` if specified

---

## Common Errors

### Creating Polls

**403 - Permission Denied**
```json
{
  "status": "error",
  "message": "Only community owners and organizers can create polls"
}
```
**Solution:** You must be an owner or organizer to create polls.

---

**400 - Invalid Options**
```json
{
  "status": "error",
  "message": "Poll must have at least 2 options"
}
```
**Solution:** Add at least 2 options to your poll.

---

### Voting on Polls

**400 - Poll Has Ended**
```json
{
  "status": "error",
  "message": "Poll has ended"
}
```
**Solution:** The poll's `endDate` has passed. You cannot vote on closed polls.

---

**400 - Single Choice Violation**
```json
{
  "status": "error",
  "message": "This poll only allows voting for one option"
}
```
**Solution:** You tried to select multiple options on a single-choice poll. Select only one option.

---

**400 - Invalid Option**
```json
{
  "status": "error",
  "message": "Invalid option index"
}
```
**Solution:** The option index you provided doesn't exist in the poll's options array.

---

**403 - Not a Member**
```json
{
  "status": "error",
  "message": "You must be a member of this community to vote"
}
```
**Solution:** Join the community before voting on its polls.

---

## Poll Data Structure

For reference, here's the complete poll data structure stored in the database:

```javascript
{
  question: "Poll question text",
  options: [
    { text: "Option 1", votes: 5 },
    { text: "Option 2", votes: 3 }
  ],
  settings: {
    allowMultipleVotes: false,  // true for multiple choice
    endDate: "2025-10-20T23:59:59Z"  // null for no end date
  },
  votes: [
    {
      userId: 1,
      optionIndices: [0],  // Array of voted option indices
      votedAt: "2025-10-13T14:30:00Z"
    }
  ]
}
```

---

## Tips & Best Practices

1. **Clear Questions**: Write clear, concise poll questions (max 500 characters)
2. **Distinct Options**: Make sure poll options are clearly different from each other
3. **Appropriate Time Limits**: Set realistic end dates for time-sensitive polls
4. **Multiple Choice vs Single**: Use single choice for "pick one" scenarios, multiple choice for "select all that apply"
5. **Supporters-Only**: Use sparingly for exclusive content to maintain supporter value
8. **Option Length**: Keep options short and scannable (max 200 characters)
7. **Vote Changes**: Users can freely change their votes on single-choice polls, so early results may shift
8. **Frontend Display**: Use the `message` field in the response to show feedback ("Vote recorded successfully" vs "Vote changed successfully")
9. **User Vote Display**: Use the `userVote` field to highlight which options the current user selected
10. **Real-time Updates**: The response includes full updated poll data, eliminating the need for a separate fetch

---

## Examples Repository

### Example 1: Quick Community Feedback
```json
{
  "communityId": 1,
  "content": "Should we have more in-person meetups?",
  "pollData": {
    "question": "Should we have more in-person meetups?",
    "options": [
      { "text": "Yes, weekly" },
      { "text": "Yes, monthly" },
      { "text": "No, keep it virtual" }
    ],
    "settings": {
      "allowMultipleVotes": false,
      "endDate": null
    }
  }
}
```

### Example 2: Event Planning
```json
{
  "communityId": 1,
  "content": "What topics should we cover in our next workshop? (Vote ends in 3 days)",
  "pollData": {
    "question": "Workshop topics (select all you're interested in)",
    "options": [
      { "text": "Web Development" },
      { "text": "Mobile Development" },
      { "text": "DevOps & CI/CD" },
      { "text": "System Design" },
      { "text": "Testing Strategies" }
    ],
    "settings": {
      "allowMultipleVotes": true,
      "endDate": "2025-10-16T23:59:59Z"
    }
  }
}
```

### Example 3: Premium Feature Vote
```json
{
  "communityId": 1,
  "content": "Supporters vote: What should we build next?",
  "isSupportersOnly": true,
  "pollData": {
    "question": "What premium feature should we prioritize?",
    "options": [
      { "text": "Dark mode" },
      { "text": "Custom themes" },
      { "text": "Advanced analytics" },
      { "text": "Mobile app" }
    ],
    "settings": {
      "allowMultipleVotes": false,
      "endDate": "2025-10-30T23:59:59Z"
    }
  }
}
```

---

## Need Help?

If you encounter issues or have questions:
1. Check the error message for specific guidance
2. Verify your user role and permissions
3. Ensure all required fields are included
4. Check that option indices are valid (0-based array indices)

For additional support, contact the development team or check the main API documentation.
