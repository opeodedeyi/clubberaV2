const { Router } = require('express');
const { auth } = require('../middleware/auth');
const controller = require('./controller');
const router = Router();


router.post('/:id/accept', auth, controller.acceptRequest);
router.post('/:id/reject', auth, controller.rejectRequest);

module.exports = router;