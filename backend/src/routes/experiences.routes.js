const express = require('express');
const ExperiencesController = require('../controllers/experiences.controller');
const { authenticate } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/authorize');

const router = express.Router();

router.get('/', ExperiencesController.listExperiences);
router.get('/:id', ExperiencesController.getExperience);
router.post('/', authenticate, ExperiencesController.createExperience);
router.patch('/:id', authenticate, authorizeRole('moderator'), ExperiencesController.updateExperience);

module.exports = router;
