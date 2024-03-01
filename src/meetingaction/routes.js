const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { meetingExists, isMeetingOwner } = require('../middleware/meetingCheck');
const controller = require('./controller');
const router = Router();


router.post('/:meetingUniqueURL/attend', auth, meetingExists, controller.attendMeeting);
router.post('/:meetingUniqueURL/unattend', auth, meetingExists, controller.unattendMeeting);
router.get('/:meetingUniqueURL/attendees', meetingExists, controller.getMeetingAttendees);

module.exports = router;