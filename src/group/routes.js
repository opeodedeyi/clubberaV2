const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { groupExists, isGroupOwner } = require('../middleware/groupCheck');
const controller = require('./controller');
const router = Router();


router.get('/', controller.getAllGroups);
router.get('/:groupUniqueURL', groupExists, controller.getGroupByUniqueURL);
router.get('/:groupUniqueURL/members', groupExists, controller.getAllMembers);
router.get('/:groupUniqueURL/requests', groupExists, controller.getAllRequests);
router.post('/create', auth, controller.createGroup);
router.post('/:groupUniqueURL/joingroup', auth, groupExists, controller.joinGroup);
router.post('/:groupUniqueURL/leavegroup', auth, groupExists, controller.leaveGroup);
router.patch('/:groupUniqueURL/update', auth, groupExists, isGroupOwner, controller.updateGroup);

module.exports = router;