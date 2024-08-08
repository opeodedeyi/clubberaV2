const express = require('express');
const { searchGroups } = require('./controller');
const router = express.Router();

// GET route for searching groups
router.get('/search-group', searchGroups );

module.exports = router;