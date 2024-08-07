const { Router } = require('express');
const { auth, optauth } = require('../middleware/auth');
const { groupExists, isGroupOwner } = require('../middleware/groupCheck');
const { meetingExists, isMeetingOwner } = require('../middleware/meetingCheck');
const controller = require('./controller');
const router = Router();


router.get('/:meetingUniqueURL', optauth, meetingExists, controller.getMeetingByUniqueURL);
router.post('/:groupUniqueURL/create', auth, groupExists, isGroupOwner, controller.createMeeting);
router.patch('/:meetingUniqueURL/update', auth, meetingExists, isMeetingOwner, controller.updateMeeting);
router.patch('/:meetingUniqueURL/updatebanner', auth, meetingExists, isMeetingOwner, controller.updateMeetingBanner);

module.exports = router;