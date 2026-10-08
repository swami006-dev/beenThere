const express = require('express');
const ResponsesController = require('../controllers/responses.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', ResponsesController.listResponses);
router.post('/', authenticate, ResponsesController.createResponse);
router.patch('/:id', authenticate, ResponsesController.updateResponse);
router.delete('/:id', authenticate, ResponsesController.deleteResponse);

module.exports = router;
