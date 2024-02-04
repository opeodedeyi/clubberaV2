const { Router } = require('express');
const { auth } = require('../middleware/auth');
const controller = require('./controller');
const router = Router();


router.get('/', controller.getUsers);
router.get('/:uniqueURL', controller.getUserByUniqueURL);
router.get('/auth/me', auth, controller.getLoggedInUser);
router.get('/confirmemail/:id', controller.confirmEmail);
router.post('/signup', controller.createUser);
router.post('/login', controller.loginUser);
router.post('/resetpassword', controller.resetPassword);
router.post('/resetpassword/:id', controller.resetPasswordSetPassword);
router.post('/logout', auth, controller.logout);
router.post('/logoutall', auth, controller.logoutAll);
router.post('/logoutall', auth, controller.logoutAll);
router.patch('/update', auth, controller.updateUser);
router.patch('/changepassword', auth, controller.changePassword);
// set profile picture
// request verification email
// goole login

module.exports = router;