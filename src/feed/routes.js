const { Router } = require('express');
const { auth, optauth } = require('../middleware/auth');
const controller = require('./controller');
const router = Router();


router.get('/', auth, controller.getFeed);
router.get('/fallback', auth, controller.getFallbackFeed);
router.get('/upcomingevents', auth, controller.getUpcomingEvents);

module.exports = router;