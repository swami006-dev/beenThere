const express = require('express');
const ReactionsController = require('../controllers/reactions.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/:postId', authenticate, ReactionsController.getReactions);
router.post('/:postId', authenticate, ReactionsController.toggleReaction);

module.exports = router;
