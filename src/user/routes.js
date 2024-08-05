const { Router } = require('express');
const { auth } = require('../middleware/auth');
const controller = require('./controller');
const router = Router();


router.get('/', controller.getUsers);
router.get('/:uniqueURL', controller.getUserByUniqueURL);
router.get('/:uniqueURL/createdgroups', controller.getUserCreatedGroups);
router.get('/:uniqueURL/joinedgroups', controller.getUserJoinedGroups);
router.get('/auth/me', auth, controller.getLoggedInUser);
router.get('/confirmemail/:id', controller.confirmEmail);
router.post('/signup', controller.createUser);
router.post('/login', controller.loginUser);
router.post('/googleauth', controller.googleAuth);
router.post('/resetpassword', controller.resetPassword);
router.post('/resetpassword/:id', controller.resetPasswordSetPassword);
router.post('/logout', auth, controller.logout);
router.post('/logoutall', auth, controller.logoutAll);
router.post('/logoutall', auth, controller.logoutAll);
router.patch('/update', auth, controller.updateUser);
router.patch('/updateavatar', auth, controller.updateUserAvatar);
router.patch('/changepassword', auth, controller.changePassword);
// set profile picture, has to be loggedin
// request verification email, has to be loggedin

module.exports = router;