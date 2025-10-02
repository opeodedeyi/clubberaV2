# Messaging System

A messaging system supporting user-to-user and community messaging with real-time capabilities.

## Features

- **Direct Messaging**: Private messages between users who share communities
- **Community Messaging**: Messages to communities (delivered to owners, organizers, and moderators)
- **Real-time Delivery**: Instant message delivery via Socket.IO
- **Typing Indicators**: Real-time typing status
- **Message Threading**: Reply to specific messages with parent message support
- **Read Receipts**: Track message read status
- **Basic Search**: Simple text search within conversations
- **Unread Count**: Track unread message counts

## Database Design

The messaging system uses a simple polymorphic design:

- `messages` - Core message storage with recipient_type/recipient_id pattern

**Key Design Benefits:**
- Single table handles all message types (user, community)
- Simple queries without complex conditionals
- Better performance with focused indexes

## API Endpoints

### Authentication Required

All messaging endpoints require authentication via JWT token in Authorization header.

### Send Messages

**Send Message (Universal Endpoint)**
```
POST /api/messages
Content-Type: application/json

{
    "recipientType": "user",        // "user" or "community"
    "recipientId": 123,
    "content": "Hello! How are you?",
    "parentMessageId": null         // Optional, for replies
}
```

**Examples:**
```javascript
// Direct message to user
{
    "recipientType": "user",
    "recipientId": 123,
    "content": "Hello!"
}

// Message to community
{
    "recipientType": "community",
    "recipientId": 456,
    "content": "I need help with my account"
}
```

### Get Conversations

**Get All User Conversations**
```
GET /api/messages/conversations?limit=20&offset=0

Response:
{
    "status": "success",
    "data": {
        "conversations": [
            {
                "id": 1,
                "message_type": "direct",
                "content": "Latest message content...",
                "conversation_name": "John Doe",
                "conversation_url": "john-doe",
                "sender_name": "John Doe",
                "unread_count": 3,
                "created_at": "2023-12-01T10:00:00Z"
            }
        ]
    }
}
```

**Get Conversation**
```
GET /api/messages/{recipientType}/{recipientId}?limit=50&offset=0

Examples:
GET /api/messages/user/123         // Direct conversation with user 123
GET /api/messages/community/456    // Community conversation

Response:
{
    "status": "success",
    "data": {
        "messages": [
            {
                "id": 1,
                "sender_id": 123,
                "recipient_type": "user",
                "recipient_id": 456,
                "content": "Hello there!",
                "sender_name": "John Doe",
                "parent_message_id": null,
                "is_read": false,
                "created_at": "2023-12-01T10:00:00Z"
            }
        ]
    }
}
```

### Message Actions

**Mark Message as Read**
```
PUT /api/messages/123/read
```

**Mark Conversation as Read**
```
PUT /api/messages/conversations/read
Content-Type: application/json

{
    "recipientType": "user",        // "user" or "community"
    "recipientId": 123
}
```

**Delete Message**
```
DELETE /api/messages/123
```

**Get Unread Count**
```
GET /api/messages/unread-count

Response:
{
    "status": "success",
    "data": {
        "unreadCount": 5
    }
}
```

**Search Messages**
```
GET /api/messages/search?query=hello&recipientType=user&recipientId=123&limit=20
```

### Real-time Features

**Send Typing Indicator**
```
POST /api/messages/typing
Content-Type: application/json

{
    "recipientType": "user",        // "user" or "community"
    "recipientId": 123,
    "isTyping": true
}
```

## Real-time Events (Socket.IO)

### Server → Client Events

**New Messages**
```javascript
socket.on('new_message', (data) => {
    console.log('New message:', data.message);
});

socket.on('new_community_message', (data) => {
    console.log('New community message:', data.message);
});
```

**Typing Indicators**
```javascript
socket.on('user_typing', (data) => {
    console.log(`User ${data.userId} is typing:`, data.isTyping);
});
```

**Read Receipts**
```javascript
socket.on('message_read_receipt', (data) => {
    console.log(`Message ${data.messageId} was read by user ${data.readBy}`);
});
```

## Frontend Integration

### Basic Socket.IO Connection

```javascript
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL, {
    auth: { token: localStorage.getItem('jwt_token') }
});

// Listen for new messages
socket.on('new_message', (data) => {
    console.log('New message:', data.message);
});

// Listen for community messages (owners/organizers/moderators only)
socket.on('new_community_message', (data) => {
    console.log('New community message:', data.message);
});

// Listen for typing indicators
socket.on('user_typing', (data) => {
    console.log(`User ${data.userId} is typing:`, data.isTyping);
});

// Listen for read receipts
socket.on('message_read_receipt', (data) => {
    console.log(`Message ${data.messageId} was read by user ${data.readBy}`);
});
```

## Permission System

### User Messages (recipient_type: "user")
- Users can only message other users they share at least one community with
- This prevents spam and maintains community-based connections

### Community Messages (recipient_type: "community")
- Only community members can send messages to that community
- Messages are delivered to community owners, organizers, and moderators
- Senders must be active community members

## Error Handling

All endpoints return standardized error responses:

```json
{
    "status": "error",
    "message": "Error description",
    "errors": [] // Validation errors if applicable
}
```

Common error codes:
- `400` - Validation error or bad request
- `401` - Authentication required
- `403` - Permission denied (can't message user/community)
- `404` - Message/conversation not found
- `500` - Server error

## Performance Considerations

- **Pagination**: All conversation endpoints support limit/offset pagination
- **Efficient queries**: Optimized database queries with proper indexing
- **Real-time optimization**: Socket.IO rooms for efficient message delivery
- **Search**: Basic text search (simple string matching)

## Security Features

- **JWT Authentication**: All endpoints require valid JWT tokens
- **Permission checks**: Users can only access their own conversations
- **Community verification**: Membership verification for community messages
- **Input validation**: All inputs are validated and sanitized
- **Rate limiting**: Built-in protection against spam (via Socket.IO connection limits)