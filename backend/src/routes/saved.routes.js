const express = require('express');
const SavedController = require('../controllers/saved.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, SavedController.listSaved);
router.post('/', authenticate, SavedController.saveItem);
router.delete('/:itemId', authenticate, SavedController.unsaveItem);

module.exports = router;
