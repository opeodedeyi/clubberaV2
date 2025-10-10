// test-socket-client.js
// Simple Socket.IO client to test real-time events

const io = require('socket.io-client');

// REPLACE THIS WITH A VALID JWT TOKEN FOR USER_ID 3
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';

console.log('Connecting to Socket.IO server...\n');

const socket = io('http://localhost:4000', {
    auth: {
        token: JWT_TOKEN
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
});

// Connection events
socket.on('connect', () => {
    console.log('✓ Connected to Socket.IO server');
    console.log('  Socket ID:', socket.id);
    console.log('  Waiting for events...\n');
});

socket.on('connected', (data) => {
    console.log('✓ Received "connected" event:');
    console.log('  Message:', data.message);
    console.log('  User ID:', data.userId);
    console.log('  Timestamp:', data.timestamp);
    console.log('\n  You can now send messages via Postman and watch for events here!\n');
});

socket.on('new_message', (data) => {
    console.log('✓ Received "new_message" event:');
    console.log('  Message:', JSON.stringify(data, null, 2));
    console.log('');
});

socket.on('new_notification', (data) => {
    console.log('✓ Received "new_notification" event:');
    console.log('  Notification:', JSON.stringify(data, null, 2));
    console.log('');
});

socket.on('new_community_message', (data) => {
    console.log('✓ Received "new_community_message" event:');
    console.log('  Message:', JSON.stringify(data, null, 2));
    console.log('');
});

socket.on('user_typing', (data) => {
    console.log('✓ User typing:', data);
});

socket.on('message_read_receipt', (data) => {
    console.log('✓ Message read receipt:', data);
});

socket.on('disconnect', (reason) => {
    console.log('\n✗ Disconnected from server');
    console.log('  Reason:', reason);
});

socket.on('connect_error', (error) => {
    console.error('\n✗ Connection error:', error.message);
    if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
        console.error('\n  ⚠ You need to replace JWT_TOKEN in the script with a valid token!');
    }
});

socket.on('error', (error) => {
    console.error('\n✗ Socket error:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nDisconnecting...');
    socket.disconnect();
    process.exit(0);
});

console.log('Press Ctrl+C to exit\n');
