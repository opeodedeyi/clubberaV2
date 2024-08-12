const { Router } = require('express');
const { optauth } = require('../middleware/auth');
const { searchMeetings } = require('./contoller');
const router = Router();


router.get('/search-meeting', optauth, searchMeetings);

module.exports = router;
