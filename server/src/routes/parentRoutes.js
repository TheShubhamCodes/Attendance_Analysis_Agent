const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(requireRole('PARENT'));

router.get('/dashboard', parentController.getDashboard);
router.get('/profile', parentController.getProfile);
router.put('/profile', parentController.updateProfile);

module.exports = router;
