const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const hodController = require('../controllers/hodController');

// All faculty assignment routes require authentication and HOD authorization
router.use(authMiddleware);
router.use(requireRole('HOD'));

router.get('/', hodController.getFacultyAssignments);
router.post('/', hodController.assignFaculty);
router.get('/:id', hodController.getFacultyAssignmentById);
router.put('/:id', hodController.updateFacultyAssignment);
router.delete('/:id', hodController.removeFacultyAssignment);

module.exports = router;
