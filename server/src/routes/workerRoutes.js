const express = require('express');
const { getWorkers, getWorkerById } = require('../controllers/workerController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', getWorkers);
router.get('/:id', getWorkerById);

module.exports = router;
