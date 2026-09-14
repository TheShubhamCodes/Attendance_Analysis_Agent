const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const hodController = require('../controllers/hodController');

// All HOD routes require valid JWT and HOD role
router.use(authMiddleware);
router.use(requireRole('HOD'));

// 1. Dashboard
router.get('/dashboard', hodController.getDashboard);

// 2. Faculty Management & Assignments
router.get('/faculty', hodController.getFacultyList);
router.post('/faculty', hodController.createFaculty);
router.get('/faculty/form-meta', hodController.getFacultyFormMeta);
router.get('/faculty/lookup', hodController.lookupFacultyByEmployeeId);
router.get('/faculty/assignments', hodController.getFacultyAssignments);
router.get('/faculty/assignments/:id', hodController.getFacultyAssignmentById);
router.put('/faculty/assignments/:id', hodController.updateFacultyAssignment);
router.post('/faculty/assign', hodController.assignFaculty);
router.delete('/faculty/assignments/:id', hodController.removeFacultyAssignment);
router.get('/faculty/:id', hodController.getFacultyDetail);
router.put('/faculty/:id', hodController.updateFaculty);
router.post('/faculty/:id/reset-password', hodController.resetFacultyPassword);
router.patch('/faculty/:id/status', hodController.updateFacultyStatus);
router.delete('/faculty/:id', hodController.deleteOrDeactivateFaculty);

// 3. Student Management & Bulk Import
router.get('/students', hodController.getStudents);
router.post('/students', hodController.addStudent);
router.post('/students/bulk-validate', hodController.bulkValidateStudents);
router.post('/students/bulk-import', hodController.bulkImportStudents);
router.get('/students/:id', hodController.getStudentProfile);
router.put('/students/:id', hodController.updateStudent);
router.patch('/students/:id/status', hodController.updateStudentStatus);
router.delete('/students/:id', hodController.deleteOrDeactivateStudent);

// 4. Attendance Monitoring & Corrections
router.get('/attendance/monitor', hodController.getAttendanceMonitoring);
router.get('/attendance/corrections', hodController.getCorrectionRequests);
router.post('/attendance/corrections/:id/review', hodController.reviewCorrectionRequest);

// 5. Counseling & At-Risk Management
router.get('/counseling/overview', hodController.getCounselingOverview);
router.post('/counseling/assign', hodController.assignCounselor);
router.post('/counseling/remove', hodController.removeCounselorAssignment);
router.get('/counseling/at-risk', hodController.getDepartmentAtRisk);
router.get('/counseling/interventions', hodController.getDepartmentInterventions);

// 6. Reports
router.get('/reports', hodController.getReports);

// 7. Notifications
router.get('/notifications', hodController.getNotifications);
router.patch('/notifications/mark-all-read', hodController.markAllNotificationsRead);
router.patch('/notifications/:id/read', hodController.markNotificationRead);

// 8. HOD Profile
router.get('/profile', hodController.getProfile);
router.put('/profile', hodController.updateProfile);

// 9. Deleted Records / Trash Management
router.get('/deleted-records', hodController.getDeletedRecords);
router.post('/deleted-records/restore', hodController.restoreRecord);
router.delete('/deleted-records/permanent', hodController.permanentDeleteRecord);

// 10. OD & Approved Leave Requests
router.get('/od-leave', hodController.getHodOdLeaveRequests);
router.post('/od-leave/:id/review', hodController.reviewHodOdLeaveRequest);

module.exports = router;
