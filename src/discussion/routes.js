const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { groupExists } = require('../middleware/groupCheck');
const { meetingExists } = require('../middleware/meetingCheck');
const { discussionExists, isDiscussionOwner } = require('../middleware/discussionCheck');
const controller = require('./controller');
const router = Router();


router.get('/:groupUniqueURL/group', groupExists, controller.getGroupDiscussions);
router.get('/:meetingUniqueURL/meeting', meetingExists, controller.getMeetingDiscussions);
router.post('/:groupUniqueURL/group', auth, groupExists, controller.createGroupDiscussion);
router.post('/:meetingUniqueURL/meeting', auth, meetingExists, controller.createMeetingDiscussion);
router.get('/:discussionId/reply', discussionExists, controller.getDiscussionReply);
router.post('/:discussionId/reply', auth, discussionExists, controller.createDiscussionReply);
router.delete('/:discussionId', auth, discussionExists, isDiscussionOwner, controller.deleteDiscussion);

module.exports = router;