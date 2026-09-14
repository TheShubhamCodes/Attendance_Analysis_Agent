const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const mentorController = require('../controllers/mentorController');

// All Mentor routes require valid JWT and strict MENTOR role
router.use(authMiddleware);
router.use(requireRole('MENTOR'));

// 1. Dashboard
router.get('/dashboard', mentorController.getDashboard);

// 2. Assigned Students & Details
router.get('/students', mentorController.getStudents);
router.get('/students/:id', mentorController.getStudentDetails);

// 3. At-Risk Students
router.get('/at-risk', mentorController.getAtRisk);

// 4. Interventions
router.get('/interventions', mentorController.getInterventions);
router.post('/interventions', mentorController.createIntervention);
router.put('/interventions/:id', mentorController.updateIntervention);

// 5. Parent Communication
router.post('/parent-communication', mentorController.recordParentCommunication);

// 6. Reports
router.get('/reports', mentorController.getReports);

// 7. Profile
router.get('/profile', mentorController.getProfile);
router.put('/profile', mentorController.updateProfile);

module.exports = router;
