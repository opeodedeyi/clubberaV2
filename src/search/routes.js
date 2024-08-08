const express = require('express');
const { searchMeetings } = require('./contoller');
const router = express.Router();

// Define the search route
router.get('/search-meeting', searchMeetings);

module.exports = router;
