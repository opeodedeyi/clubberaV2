const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { groupExists, isGroupOwner } = require('../middleware/groupCheck');
const { meetingExists, isMeetingOwner } = require('../middleware/meetingCheck');
const controller = require('./controller');
const router = Router();


router.get('/:meetingUniqueURL', meetingExists, controller.getMeetingByUniqueURL);
router.get('/:groupUniqueURL/groupmeetings', groupExists, controller.getAllGroupMeetings);
router.post('/:groupUniqueURL/create', auth, groupExists, isGroupOwner, controller.createMeeting);
router.patch('/:meetingUniqueURL/update', auth, meetingExists, isMeetingOwner, controller.updateMeeting);

module.exports = router;