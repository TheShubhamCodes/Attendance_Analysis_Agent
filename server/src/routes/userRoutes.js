const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// All user settings and security routes require authentication
router.use(authMiddleware);

router.get('/settings', userController.getSettings);
router.put('/settings', userController.updateSettings);
router.post('/change-password', userController.changePassword);
router.get('/profile', userController.getProfile);

module.exports = router;
