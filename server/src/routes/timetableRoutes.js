const express = require('express');
const router = express.Router();
const viewTimetableController = require('../controllers/viewTimetableController');
const authMiddleware = require('../middleware/authMiddleware');

// All timetable viewing routes require authentication
router.use(authMiddleware);

// Get caller's authorized timetable with role context
router.get('/my-routine', viewTimetableController.getMyTimetable);
router.get('/active', viewTimetableController.getMyTimetable);
router.get('/', viewTimetableController.getMyTimetable);

// Get specific section weekly routine (with role authorization check)
router.get('/view/:section', viewTimetableController.getSectionTimetable);

module.exports = router;
