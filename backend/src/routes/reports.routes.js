const express = require('express');
const ReportsController = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, ReportsController.createReport);

module.exports = router;
