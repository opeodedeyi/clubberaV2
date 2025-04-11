// index.js

const express = require("express");
var cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const userRoutes = require("./src/user/routes/user.routes");
const accountRoutes = require("./src/user/routes/account.routes");
const imageRoutes = require("./src/user/routes/image.routes");
const tagRoutes = require("./src/tag/routes/tag.routes");
const communityRoutes = require("./src/community/routes/community.routes");
const communityUpdateRoutes = require("./src/community/routes/communityUpdate.routes");
const communityAdminRoutes = require("./src/community/routes/communityAdmin.routes");
const userCommunitiesRoutes = require("./src/community/routes/userCommunities.routes");
const communitySearchRoutes = require("./src/community/routes/communitySearch.routes");

const ApiError = require("./src/utils/ApiError");
const schedulerService = require("./src/services/scheduler.service");
require("dotenv").config();

// Initialize express app
const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan("dev")); // Request logging

// Health check route
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "API is running",
        version: "1.0.0",
    });
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/users", userCommunitiesRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/communities", communityUpdateRoutes);
app.use("/api/communities", communitySearchRoutes);
app.use("/api/community-admin", communityAdminRoutes);

// Initialize scheduler service
if (process.env.NODE_ENV !== "test") {
    // Only initialize in non-test environments
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
    app.listen(port, () => {
        console.log(`app listening on port ${port}`);
    });
}

// For testing purposes
module.exports = app;
