const express = require('express');
const ModerationController = require('../controllers/moderation.controller');
const { authenticate } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);
router.use(authorizeRole('moderator'));

router.get('/reports', ModerationController.listReports);
router.patch('/posts/:id', ModerationController.moderatePost);
router.post('/posts/:id/promote', ModerationController.promotePost);
router.patch('/responses/:id', ModerationController.moderateResponse);

module.exports = router;
