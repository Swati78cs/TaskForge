const express = require('express');
const { getMetrics } = require('../controllers/metricsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', getMetrics);

module.exports = router;
