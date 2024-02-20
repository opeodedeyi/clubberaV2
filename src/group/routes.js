const { Router } = require('express');
const { auth } = require('../middleware/auth');
const controller = require('./controller');
const router = Router();


router.get('/', controller.getAllGroups);
router.get('/:uniqueURL', controller.getGroupByUniqueURL);
router.get('/:uniqueURL/members', controller.getAllMembers);
router.get('/:uniqueURL/requests', controller.getAllRequests);
router.post('/create', auth, controller.createGroup);
router.post('/:uniqueURL/joingroup', auth, controller.joinGroup);
router.post('/:uniqueURL/leavegroup', auth, controller.leaveGroup);
router.patch('/:uniqueURL/update', auth, controller.updateGroup);

module.exports = router;