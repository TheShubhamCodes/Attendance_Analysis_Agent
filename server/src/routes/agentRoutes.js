const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const agentController = require('../controllers/agentController');

// All agent endpoints require valid JWT authentication across all roles
router.use(authMiddleware);

router.post('/chat', agentController.chat);
router.get('/suggestions', agentController.getSuggestions);
router.post('/clear', agentController.clearSession);

module.exports = router;
