const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { groupExists, isGroupOwner } = require('../middleware/groupCheck');
const controller = require('./controller');
const router = Router();


router.get('/:groupUniqueURL/group', groupExists, controller.getGroupAnnouncement);
router.post('/:groupUniqueURL/group', auth, groupExists, isGroupOwner, controller.createGroupAnnouncement);
router.delete('/:id/:groupUniqueURL/group', auth, groupExists, controller.deleteGroupAnnouncement);

module.exports = router;