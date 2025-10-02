# Notification System

A comprehensive notification system that handles real-time notifications for all user activities and events in the application.

## Features

- **Real-time Notifications**: Instant delivery via Socket.IO
- **Notification Grouping**: Automatically groups similar notifications (e.g., "John, Sarah and 23 others sent a join request")
- **Polymorphic Design**: Can reference any entity (messages, events, posts, communities)
- **Bulk Operations**: Efficient bulk notification creation
- **Rich Content**: Title, message, and metadata support
- **Actor Tracking**: Know who triggered each notification
- **Read Status**: Track read/unread states with manual control
- **Pagination**: Efficient pagination for notification lists
- **Cleanup**: Automatic cleanup of old notifications

## Database Schema

The notification system uses a single table with polymorphic references:

```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    trigger_entity_type VARCHAR(50) NOT NULL,
    trigger_entity_id BIGINT NOT NULL,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Authentication Required

All notification endpoints require authentication via JWT token in Authorization header.

### Get Notifications

**Get All User Notifications (with Grouping)**
```
GET /api/notifications?limit=50&offset=0&unreadOnly=false&grouped=true

Query Parameters:
- limit: Number of notifications to return (default: 50)
- offset: Pagination offset (default: 0)
- unreadOnly: Only return unread notifications (default: false)
- grouped: Enable notification grouping (default: true, set to false to disable)

Response (Grouped):
{
    "status": "success",
    "data": {
        "notifications": [
            {
                "id": "grouped_123",
                "type": "community_join_request",
                "trigger_entity_type": "community",
                "trigger_entity_id": 456,
                "title": "25 join requests for Tech Community",
                "message": "Users want to join your community",
                "metadata": {...},
                "is_read": false,
                "created_at": "2023-12-01T10:00:00Z",
                "is_grouped": true,
                "count": 25,
                "actors": ["John Doe", "Sarah Smith"],
                "actor_ids": [789, 790, ...],
                "notification_ids": [123, 124, 125, ...]
            },
            {
                "id": 1,
                "user_id": 123,
                "type": "new_message",
                "trigger_entity_type": "message",
                "trigger_entity_id": 456,
                "actor_user_id": 789,
                "actor_name": "John Doe",
                "actor_url": "john-doe",
                "title": "New message from John Doe",
                "message": "Hello! How are you?",
                "metadata": {
                    "senderId": 789,
                    "messageId": 456
                },
                "is_read": false,
                "created_at": "2023-12-01T10:00:00Z",
                "is_grouped": false,
                "count": 1
            }
        ],
        "pagination": {
            "limit": 50,
            "offset": 0,
            "hasMore": false
        }
    }
}
```

**Notification Grouping Logic:**
- Groups notifications with same `type` and `trigger_entity_id`
- Only groups notifications within 24-hour time window
- Shows up to 2 actor names, then "and X others" (e.g., "John, Sarah and 3 others")
- Smart title generation based on notification type:
  - Message notifications: "New message from John, Sarah and 3 others"
  - Join requests: "5 join requests for Tech Community"
  - Events/Posts: "5 new events" or "3 new posts"
- Grouped notification is marked as read only when ALL notifications in group are read

**Get Unread Count**
```
GET /api/notifications/unread-count

Response:
{
    "status": "success",
    "data": {
        "unreadCount": 5
    }
}
```

### Mark as Read

> **Important:** Viewing notifications does NOT automatically mark them as read. Users must explicitly mark them as read by clicking on them or using "Mark all as read" button.

**Mark Single Notification as Read**
```
PUT /api/notifications/123/read

Response:
{
    "status": "success",
    "data": {
        "notification": { ... }
    }
}
```

**Mark Multiple Notifications as Read (For Grouped Notifications)**
```
PUT /api/notifications/mark-multiple-read
Content-Type: application/json

{
    "notificationIds": [123, 124, 125, 126]
}

Response:
{
    "status": "success",
    "data": {
        "updatedCount": 4
    }
}

Usage: When user clicks on a grouped notification, send all notification_ids from the group
```

**Mark All Notifications as Read**
```
PUT /api/notifications/mark-all-read

Response:
{
    "status": "success",
    "data": {
        "updatedCount": 5
    }
}

Usage: Triggered by "Mark all as read" button in notification page
```

### Admin/System Endpoints

**Create Single Notification**
```
POST /api/notifications
Content-Type: application/json

{
    "userId": 123,
    "type": "new_message",
    "triggerEntityType": "message",
    "triggerEntityId": 456,
    "actorUserId": 789,
    "title": "New message from John Doe",
    "message": "Hello! How are you?",
    "metadata": {
        "senderId": 789,
        "messageId": 456
    }
}
```

**Create Bulk Notifications**
```
POST /api/notifications/bulk
Content-Type: application/json

{
    "notifications": [
        {
            "userId": 123,
            "type": "new_event",
            "triggerEntityType": "event",
            "triggerEntityId": 789,
            "actorUserId": 456,
            "title": "New event: Tech Meetup",
            "message": "A new event has been created in Tech Community"
        }
    ]
}
```

**Cleanup Old Notifications**
```
DELETE /api/notifications/cleanup?daysOld=30

Response:
{
    "status": "success",
    "data": {
        "deletedCount": 15,
        "daysOld": 30
    }
}
```

## Notification Types

### Message Notifications
- `new_message` - Direct message received
- `new_community_message` - Community message (for owners/organizers/moderators)
- `message_reply` - Reply to a message

### Community Notifications
- `community_join_request` - New join request for private community
- `join_request_approved` - Join request was approved
- `join_request_rejected` - Join request was rejected
- `community_announcement` - Community-wide announcement
- `community_role_changed` - User role changed in community

### Event Notifications
- `new_event` - New event created in community
- `event_updated` - Event details updated
- `event_cancelled` - Event was cancelled
- `event_reminder` - Upcoming event reminder

### Post Notifications
- `new_post` - New post in community
- `post_reply` - Reply to a post

## Real-time Integration

### Socket.IO Events

**Server → Client**
```javascript
socket.on('new_notification', (data) => {
    console.log('New notification:', data.notification);
    // Update UI with new notification
});
```

## Service Usage

### Using in Other Modules

```javascript
const NotificationService = require('../notification/services/notification.service');

// Create a message notification
await NotificationService.notifyNewMessage({
    senderId: 123,
    recipientId: 456,
    content: "Hello!",
    messageId: 789,
    senderName: "John Doe"
});

// Create event notification for all community members
await NotificationService.notifyNewEvent({
    creatorId: 123,
    communityId: 456,
    eventId: 789,
    eventTitle: "Tech Meetup",
    communityName: "Tech Community"
});

// Create bulk notifications
await NotificationService.createBulkNotifications([
    {
        userId: 123,
        type: 'community_announcement',
        triggerEntityType: 'community',
        triggerEntityId: 456,
        title: 'Important Update',
        message: 'Please read the new community guidelines'
    }
]);
```

### Available Helper Methods

- `notifyNewMessage(messageData)` - Direct messages
- `notifyNewCommunityMessage(messageData)` - Community messages
- `notifyNewEvent(eventData)` - New events
- `notifyJoinRequest(requestData)` - Join requests
- `notifyJoinRequestResponse(responseData)` - Join request responses
- `notifyNewPost(postData)` - New posts
- `notifyAnnouncement(announcementData)` - Announcements

## Frontend Integration

### Basic Socket.IO Connection

```javascript
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL, {
    auth: { token: localStorage.getItem('jwt_token') }
});

// Listen for new notifications
socket.on('new_notification', (data) => {
    const notification = data.notification;

    // Update notification count
    updateNotificationCount();

    // Show toast/banner
    showNotificationToast(notification.title, notification.message);

    // Add to notification list
    addToNotificationList(notification);
});
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

export const useNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async (options = {}) => {
        const queryParams = new URLSearchParams({
            limit: options.limit || 50,
            offset: options.offset || 0,
            unreadOnly: options.unreadOnly || false,
            grouped: options.grouped !== false // Default to true
        });

        const response = await fetch(`/api/notifications?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
            }
        });

        const data = await response.json();
        return data.data.notifications;
    };

    const fetchUnreadCount = async () => {
        const response = await fetch('/api/notifications/unread-count', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
            }
        });

        const data = await response.json();
        setUnreadCount(data.data.unreadCount);
    };

    const markAsRead = async (notification) => {
        // Handle grouped notifications
        if (notification.is_grouped) {
            await fetch('/api/notifications/mark-multiple-read', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notificationIds: notification.notification_ids
                })
            });

            // Update local state for all notifications in group
            setNotifications(prev =>
                prev.map(notif =>
                    notif.id === notification.id
                        ? { ...notif, is_read: true }
                        : notif
                )
            );
        } else {
            // Single notification
            await fetch(`/api/notifications/${notification.id}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            // Update local state
            setNotifications(prev =>
                prev.map(notif =>
                    notif.id === notification.id
                        ? { ...notif, is_read: true }
                        : notif
                )
            );
        }

        fetchUnreadCount();
    };

    const markAllAsRead = async () => {
        await fetch('/api/notifications/mark-all-read', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
            }
        });

        setNotifications(prev =>
            prev.map(notif => ({ ...notif, is_read: true }))
        );
        setUnreadCount(0);
    };

    const handleNotificationClick = (notification) => {
        // Mark as read when clicked
        if (!notification.is_read) {
            markAsRead(notification);
        }

        // Navigate to the relevant page based on notification type
        // This is where you'd handle routing to messages, events, etc.
    };

    useEffect(() => {
        fetchUnreadCount();
    }, []);

    return {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        handleNotificationClick,
        setNotifications
    };
};
```

## Error Handling

All endpoints return standardized error responses:

```json
{
    "status": "error",
    "message": "Error description",
    "errors": []
}
```

Common error codes:
- `400` - Validation error or bad request
- `401` - Authentication required
- `404` - Notification not found
- `500` - Server error

## Performance Considerations

- **Pagination**: All endpoints support efficient pagination
- **Indexes**: Optimized database queries with proper indexing
- **Real-time**: Socket.IO rooms for efficient delivery
- **Bulk Operations**: Efficient bulk creation for community-wide notifications
- **Cleanup**: Automatic cleanup of old notifications to maintain performance

## Security Features

- **JWT Authentication**: All endpoints require valid JWT tokens
- **Permission Checks**: Users can only access their own notifications
- **Input Validation**: All inputs are validated and sanitized
- **Actor Verification**: Proper verification of notification actors

## Integration Examples

### Message Service Integration

```javascript
// In message service after creating a message
const MessageService = require('./message.service');
const NotificationService = require('../notification/services/notification.service');

class MessageService {
    static async sendMessage(messageData) {
        // Create message
        const message = await MessageModel.create(messageData);

        // Send notification
        if (message.recipient_type === 'user') {
            await NotificationService.notifyNewMessage({
                senderId: message.sender_id,
                recipientId: message.recipient_id,
                content: message.content,
                messageId: message.id,
                senderName: senderInfo.full_name
            });
        } else if (message.recipient_type === 'community') {
            await NotificationService.notifyNewCommunityMessage({
                senderId: message.sender_id,
                communityId: message.recipient_id,
                content: message.content,
                messageId: message.id,
                senderName: senderInfo.full_name,
                communityName: communityInfo.name
            });
        }

        return message;
    }
}
```

### Event Service Integration

```javascript
// In event service after creating an event
await NotificationService.notifyNewEvent({
    creatorId: event.user_id,
    communityId: event.community_id,
    eventId: event.id,
    eventTitle: event.title,
    communityName: community.name
});
```

## Maintenance

### Cleanup Old Notifications

Run periodic cleanup to remove old notifications:

```javascript
// Run monthly cleanup (keep last 30 days)
const result = await NotificationService.cleanupOldNotifications(30);
console.log(`Deleted ${result.deleted_count} old notifications`);
```

### Monitoring

Monitor notification system health:

```javascript
// Check notification creation rate
// Check Socket.IO connection health
// Monitor database performance
// Track notification delivery success rate
```