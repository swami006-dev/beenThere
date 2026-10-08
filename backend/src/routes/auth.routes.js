const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.getMe);
router.patch('/profile', authenticate, AuthController.updateProfile);
router.put('/profile', authenticate, AuthController.updateProfile);
router.get('/profile/anonymous/:profileId', AuthController.getAnonymousProfile);

module.exports = router;
