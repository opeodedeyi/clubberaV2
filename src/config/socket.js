// src/config/socket.js

const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

class SocketManager {
    constructor() {
        this.connectedUsers = new Map(); // userId -> socket instance
        this.userSockets = new Map(); // socketId -> userId
    }

    initialize(io) {
        this.io = io;

        // Socket authentication middleware
        io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.id;
                socket.userInfo = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role
                };

                next();
            } catch (error) {
                console.error('Socket authentication error:', error.message);
                next(new Error('Authentication failed'));
            }
        });

        // Handle socket connections
        io.on('connection', (socket) => {
            this.handleConnection(socket);
        });

        console.log('Socket.IO initialized successfully');
    }

    handleConnection(socket) {
        const userId = socket.userId;
        console.log(`User ${userId} connected via Socket.IO`);

        // Store user connection
        this.connectedUsers.set(userId, socket);
        this.userSockets.set(socket.id, userId);

        // Join user-specific room
        socket.join(`user_${userId}`);

        // Handle events
        this.setupEventHandlers(socket);

        // Handle disconnection
        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });

        // Send connection confirmation
        socket.emit('connected', {
            message: 'Successfully connected to notification service',
            userId: userId,
            timestamp: new Date().toISOString()
        });
    }

    setupEventHandlers(socket) {
        const userId = socket.userId;

        // Handle notification acknowledgment
        socket.on('notification_received', (data) => {
            console.log(`User ${userId} acknowledged notification ${data.notificationId}`);
        });

        // Handle typing indicators for messaging (polymorphic design)
        socket.on('typing_start', (data) => {
            const { recipientType, recipientId } = data;

            if (recipientType === 'user') {
                // Direct message typing
                socket.to(`user_${recipientId}`).emit('user_typing', {
                    userId: userId,
                    recipientType: recipientType,
                    recipientId: recipientId,
                    isTyping: true
                });
            } else if (recipientType === 'community') {
                // Community message typing - broadcast to organizers
                socket.to(`community_${recipientId}_organizers`).emit('user_typing', {
                    userId: userId,
                    recipientType: recipientType,
                    recipientId: recipientId,
                    isTyping: true
                });
            }
        });

        socket.on('typing_stop', (data) => {
            const { recipientType, recipientId } = data;

            if (recipientType === 'user') {
                // Direct message typing
                socket.to(`user_${recipientId}`).emit('user_typing', {
                    userId: userId,
                    recipientType: recipientType,
                    recipientId: recipientId,
                    isTyping: false
                });
            } else if (recipientType === 'community') {
                // Community message typing - broadcast to organizers
                socket.to(`community_${recipientId}_organizers`).emit('user_typing', {
                    userId: userId,
                    recipientType: recipientType,
                    recipientId: recipientId,
                    isTyping: false
                });
            }
        });

        // Handle joining community organizer rooms for community messaging
        socket.on('join_community_rooms', async () => {
            try {
                const db = require('../config/db');
                const communityQuery = await db.query(`
                    SELECT community_id
                    FROM community_members
                    WHERE user_id = $1 AND role IN ('owner', 'organizer', 'moderator')
                `, [userId]);

                for (const row of communityQuery.rows) {
                    socket.join(`community_${row.community_id}_organizers`);
                }
            } catch (error) {
                console.error('Error joining community rooms:', error);
            }
        });

        // Handle message delivery acknowledgment
        socket.on('message_delivered', (data) => {
            console.log(`User ${userId} received message ${data.messageId}`);
            // Could update delivery status in database here
        });

        // Handle message read acknowledgment
        socket.on('message_read', (data) => {
            console.log(`User ${userId} read message ${data.messageId}`);

            // Notify sender that message was read
            if (data.senderId) {
                socket.to(`user_${data.senderId}`).emit('message_read_receipt', {
                    messageId: data.messageId,
                    readBy: userId,
                    readAt: new Date().toISOString()
                });
            }
        });

        // Handle user presence updates
        socket.on('update_presence', (status) => {
            // Broadcast presence to relevant users (future feature)
            console.log(`User ${userId} updated presence to: ${status}`);
        });
    }

    handleDisconnection(socket) {
        const userId = this.userSockets.get(socket.id);

        if (userId) {
            console.log(`User ${userId} disconnected`);

            // Clean up connections
            this.connectedUsers.delete(userId);
            this.userSockets.delete(socket.id);

            // Leave user room
            socket.leave(`user_${userId}`);
        }
    }

    // Public methods for sending notifications
    sendNotificationToUser(userId, notificationData) {
        const socket = this.connectedUsers.get(userId);

        if (socket && socket.connected) {
            socket.emit('new_notification', notificationData);
            return true; // Successfully sent
        }

        return false; // User not connected
    }

    sendNotificationToUsers(userIds, notificationData) {
        const results = [];

        for (const userId of userIds) {
            const sent = this.sendNotificationToUser(userId, notificationData);
            results.push({ userId, sent });
        }

        return results;
    }

    broadcastToRoom(roomName, event, data) {
        this.io.to(roomName).emit(event, data);
    }

    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }

    getOnlineUsers() {
        return Array.from(this.connectedUsers.keys());
    }

    getConnectionCount() {
        return this.connectedUsers.size;
    }
}

// Create singleton instance
const socketManager = new SocketManager();

// Export initialization function
module.exports = (io) => {
    socketManager.initialize(io);
    return socketManager;
};

// Export manager instance for use in other modules
module.exports.socketManager = socketManager;