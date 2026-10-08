const express = require('express');
const ConversationsController = require('../controllers/conversations.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/requests', authenticate, ConversationsController.createRequest);
router.get('/requests', authenticate, ConversationsController.listRequests);
router.patch('/requests/:requestId', authenticate, ConversationsController.respondRequest);

router.get('/', authenticate, ConversationsController.listConversations);
router.get('/:id', authenticate, ConversationsController.getConversation);
router.post('/:id/messages', authenticate, ConversationsController.sendMessage);
router.post('/:id/end', authenticate, ConversationsController.endConversation);
router.post('/:id/block', authenticate, ConversationsController.blockUser);
router.post('/:id/report', authenticate, ConversationsController.reportUser);

module.exports = router;
