const { Router } = require('express');
const { auth, optauth } = require('../middleware/auth');
const { groupExists, isGroupOwner } = require('../middleware/groupCheck');
const controller = require('./controller');
const router = Router();


router.get('/', optauth, controller.getAllGroups);
router.get('/:groupUniqueURL', optauth, groupExists, controller.getGroupByUniqueURL);
router.get('/:groupUniqueURL/edit', auth, groupExists, isGroupOwner, controller.getGroupEditByUniqueURL);
router.get('/:groupUniqueURL/members', groupExists, controller.getAllMembers);
router.get('/:groupUniqueURL/requests', groupExists, controller.getAllRequests);
router.post('/create', auth, controller.createGroup);
router.post('/:groupUniqueURL/joingroup', auth, groupExists, controller.joinGroup);
router.post('/:groupUniqueURL/leavegroup', auth, groupExists, controller.leaveGroup);
router.patch('/:groupUniqueURL/update', auth, groupExists, isGroupOwner, controller.updateGroup);
router.get('/:groupUniqueURL/meetings', optauth, groupExists, controller.getMeetingsForGroup);

module.exports = router;
