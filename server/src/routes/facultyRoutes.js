const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const facultyController = require('../controllers/facultyController');

// All faculty routes require valid JWT and STAFF role
router.use(authMiddleware);
router.use(requireRole('STAFF'));

// 1. Dashboard (counselor-scoped statistics)
router.get('/dashboard', facultyController.getDashboard);

// 2. My Classes
router.get('/classes', facultyController.getClasses);
router.get('/classes/form-meta', facultyController.getClassesFormMeta);

// 3. Mark Attendance (Manual) & Upload Attendance (Excel)
router.get('/attendance/students', facultyController.getSectionStudents);
router.post('/attendance', facultyController.markAttendance);
router.get('/attendance/upload/template', facultyController.getAttendanceUploadTemplate);
router.post('/attendance/upload/validate', facultyController.validateAttendanceUpload);
router.post('/attendance/upload/confirm', facultyController.confirmAttendanceUpload);

// 4. Attendance History
router.get('/attendance/history', facultyController.getAttendanceHistory);
router.get('/attendance/session-students', facultyController.getSessionAttendanceDetails);

// 5. Edit Attendance (with OTP verification & audit logging)
router.post('/attendance/request-edit-otp', facultyController.requestEditOtp);
router.post('/attendance/verify-otp', facultyController.verifyEditOtp);
router.put('/attendance/edit', facultyController.submitAttendanceEdit);

// 6. At-Risk Students (counselor-assigned only)
router.get('/at-risk', facultyController.getAtRiskStudents);

// 7. Attendance Predictor (counselor-assigned only)
router.get('/predictor', facultyController.getPredictorData);

// 8. Interventions (counselor-assigned only)
router.get('/interventions', facultyController.getInterventions);
router.post('/interventions', facultyController.createIntervention);
router.put('/interventions/:id', facultyController.updateIntervention);

// 9. Notifications
router.get('/notifications', facultyController.getNotifications);
router.patch('/notifications/mark-all-read', facultyController.markAllNotificationsRead);
router.patch('/notifications/:id/read', facultyController.markNotificationRead);

// 10. Reports & Master Attendance Excel Export
router.get('/reports', facultyController.getReports);
router.get('/reports/export-excel', facultyController.exportSectionAttendanceExcel);
router.get('/attendance/export-excel', facultyController.exportSectionAttendanceExcel);
router.get('/attendance/matrix', facultyController.getSectionAttendanceMatrix);

// 11. Limited Student Search
router.get('/students/search', facultyController.searchStudents);

// 12. Faculty Profile
router.get('/profile', facultyController.getProfile);
router.put('/profile', facultyController.updateProfile);

// 13. OD & Approved Leave Requests
router.get('/od-leave', facultyController.getFacultyOdLeaveRequests);
router.post('/od-leave/:id/review', facultyController.reviewFacultyOdLeaveRequest);

module.exports = router;
