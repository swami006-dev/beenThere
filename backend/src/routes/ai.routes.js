const express = require('express');
const AiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/analyze', authenticate, AiController.analyze);
router.post('/match', authenticate, AiController.match);
router.post('/extract-experience', authenticate, AiController.extractExperience);

module.exports = router;
