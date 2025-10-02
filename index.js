// index.js

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
var cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const userRoutes = require("./src/user/routes/user.routes");
const accountRoutes = require("./src/user/routes/account.routes");
const userImageRoutes = require("./src/user/routes/image.routes");
const tagRoutes = require("./src/tag/routes/tag.routes");
const communityRoutes = require("./src/community/routes/community.routes");
const communityUpdateRoutes = require("./src/community/routes/communityUpdate.routes");
const communityAdminRoutes = require("./src/community/routes/communityAdmin.routes");
const userCommunitiesRoutes = require("./src/community/routes/userCommunities.routes");
const communitySearchRoutes = require("./src/community/routes/communitySearch.routes");
const communityRecommendationsRoutes = require("./src/community/routes/recommendations.routes");
const tempUploadRoutes = require("./src/tempUpload/routes/tempUpload.routes");
// const supportPlanRoutes = require("./src/communitySupport/routes/supportPlan.routes");
// const supportSubscriptionRoutes = require("./src/communitySupport/routes/supportSubscription.routes");
// const webhookRoutes = require("./src/communitySupport/routes/webhook.routes");
// const postRoutes = require("./src/post/routes/post.routes");
// const postReactionRoutes = require("./src/post/routes/postReaction.routes");
// const replyRoutes = require("./src/post/routes/reply.routes");
// const pollRoutes = require("./src/post/routes/poll.routes");
const eventRoutes = require("./src/event/routes/event.routes");
const attendanceRoutes = require("./src/event/routes/attendance.routes");
const eventSearchRoutes = require("./src/event/routes/eventSearch.routes");
const messageRoutes = require("./src/message/routes/message.routes");
const notificationRoutes = require("./src/notification/routes/notification.routes");
// const helpTopicRoutes = require("./src/help/routes/helpTopic.routes");
// const helpEntryRoutes = require("./src/help/routes/helpEntry.routes");
// const helpSearchRoutes = require("./src/help/routes/helpSearch.routes");
// const helpFeedbackRoutes = require("./src/help/routes/helpFeedback.routes");

const ApiError = require("./src/utils/ApiError");
const schedulerService = require("./src/services/scheduler.service");
require("dotenv").config();

// Initialize express app
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan("dev")); // Request logging

// Initialize Socket.IO
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Make io instance available to the app
app.set("io", io);

// Socket.IO setup
require("./src/config/socket")(io);

// Health check route
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "API is running!",
        version: "1.0.0",
    });
});

// Routes
app.use("/api/temp-upload", tempUploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/users", userCommunitiesRoutes);
app.use("/api/users", userImageRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/communities", communityUpdateRoutes);
app.use("/api/community-search", communitySearchRoutes);
app.use("/api/recommendations", communityRecommendationsRoutes);
// app.use("/api/communities", supportPlanRoutes);
// app.use("/api/communities", supportSubscriptionRoutes);
// app.use("/api/webhooks", webhookRoutes);
app.use("/api/community-admin", communityAdminRoutes);
// app.use("/api/posts", postRoutes);
// app.use("/api/posts", postReactionRoutes);
// app.use("/api/posts", replyRoutes);
// app.use("/api/posts", pollRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/events", attendanceRoutes);
app.use("/api/event-search", eventSearchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
// app.use("/api/help", helpTopicRoutes);
// app.use("/api/help", helpEntryRoutes);
// app.use("/api/help", helpSearchRoutes);
// app.use("/api/help", helpFeedbackRoutes);

// Initialize scheduler service
if (process.env.NODE_ENV !== "test") {
    schedulerService.initializeScheduler();
}

// Handle 404 routes
app.use((req, res, next) => {
    next(new ApiError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
        status: "error",
        message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
});

if (require.main === module) {
    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
        console.log(`Socket.IO enabled for real-time notifications`);
    });
}

// For testing purposes
module.exports = app;
