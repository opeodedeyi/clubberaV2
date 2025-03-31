const express = require('express');
var cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const userRoutes = require('./src/user/routes/user.routes');
const ApiError = require('./src/utils/ApiError');
require('dotenv').config();

// Initialize express app
const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // Request logging

// Health check route
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'API is running',
        version: '1.0.0'
    });
});

// Routes
app.use('/api/user', userRoutes);

// Handle 404 routes
app.use((req, res, next) => {
    next(new ApiError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
        status: 'error',
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.listen(port, () =>{
    console.log(`app listening on port ${port}`)
});

// For testing purposes
module.exports = app;