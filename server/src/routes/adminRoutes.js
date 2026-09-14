const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const adminController = require('../controllers/adminController');

// All Admin routes require valid JWT and strict ADMIN role
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

// 1. Dashboard
router.get('/dashboard', adminController.getDashboardMetrics);

// 2. User Management
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.post('/users/:id/reset-password', adminController.resetUserPassword);

// 3. HOD Management
router.get('/hod', adminController.getHods);
router.post('/hod/assign', adminController.assignHod);
router.post('/hod/remove', adminController.removeHod);
router.get('/hod/history', adminController.getHodHistory);

// 4. Faculty Management & Assignments
router.get('/faculty', adminController.getFaculty);
router.post('/faculty/assign', adminController.assignFacultySubject);
router.delete('/faculty/assignments/:id', adminController.removeFacultySubject);

// 4B. Mentor Management & Assignments
router.get('/mentors', adminController.getMentors);
router.get('/mentors/:id/students', adminController.getMentorStudents);
router.post('/mentors/assign', adminController.assignStudentsToMentor);
router.post('/mentors/remove', adminController.removeStudentsFromMentor);

// 5. Student Management
router.get('/students', adminController.getStudents);
router.get('/students/:id', adminController.getStudentDetails);

// 6. Parent Management
router.get('/parents', adminController.getParents);
router.post('/parents/link', adminController.linkParentStudent);
router.post('/parents/unlink', adminController.unlinkParentStudent);

// 7. Academic Management
router.get('/departments', adminController.getDepartments);
router.post('/departments', adminController.createDepartment);
router.put('/departments/:id', adminController.updateDepartment);

router.get('/sections', adminController.getSections);
router.post('/sections', adminController.createSection);

router.get('/subjects', adminController.getSubjects);
router.post('/subjects', adminController.createSubject);

// 8. Attendance Management & Manual Correction
router.get('/attendance', adminController.getAttendanceRecords);
router.post('/attendance/correct', adminController.correctAttendanceRecord);

// 9. Timetable Management (View/Edit only, decoupled from attendance)
router.get('/timetable', adminController.getTimetable);
router.post('/timetable', adminController.createTimetableSlot);
router.delete('/timetable/:id', adminController.deleteTimetableSlot);

// 10. Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// 11. System Settings
router.get('/settings', adminController.getSystemSettings);
router.post('/settings', adminController.updateSystemSettings);

// 12. Notifications
router.get('/notifications', adminController.getNotifications);
router.post('/notifications/broadcast', adminController.broadcastNotification);

// 13. OD & Approved Leave Requests
router.get('/od-leave', adminController.getAdminOdLeaveRequests);
router.post('/od-leave/:id/review', adminController.reviewAdminOdLeaveRequest);
router.post('/od-leave/:id/revoke', adminController.revokeAdminOdLeaveRequest);

module.exports = router;
