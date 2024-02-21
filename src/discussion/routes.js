const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { groupExists } = require('../middleware/groupCheck');
const { discussionExists, isDiscussionOwner } = require('../middleware/discussionCheck');
const controller = require('./controller');
const router = Router();


router.get('/:groupUniqueURL/group', groupExists, controller.getGroupDiscussion);
router.post('/:groupUniqueURL/group', auth, groupExists, controller.createGroupDiscussion);
router.get('/:discussionId/reply', auth, discussionExists, controller.getDiscussionReply);
router.post('/:discussionId/reply', auth, discussionExists, controller.createDiscussionReply);
router.delete('/:discussionId', auth, discussionExists, isDiscussionOwner, controller.deleteDiscussion);

module.exports = router;