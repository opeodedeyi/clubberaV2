const { Router } = require('express');
const { optauth } = require('../middleware/auth');
const { searchGroups } = require('./controller');
const router = Router();


router.get('/search-group', optauth, searchGroups );

module.exports = router;
