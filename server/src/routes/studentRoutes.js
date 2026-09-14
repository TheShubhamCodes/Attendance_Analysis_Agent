const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const studentController = require('../controllers/studentController');

// All student routes require valid JWT and STUDENT role
router.use(authMiddleware);
router.use(requireRole('STUDENT'));

// Profile
router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);

// Dashboard
router.get('/dashboard', studentController.getDashboard);

// Attendance
router.get('/attendance', studentController.getAttendance);
router.get('/attendance/calendar', studentController.getAttendanceCalendar);

// Performance
router.get('/performance', studentController.getPerformance);

// AI Risk Analysis
router.get('/risk', studentController.getRiskAnalysis);

// Notifications
router.get('/notifications', studentController.getNotifications);
router.patch('/notifications/mark-all-read', studentController.markAllNotificationsRead);
router.patch('/notifications/:id/read', studentController.markNotificationRead);

// Mentor Connection
router.get('/mentor', studentController.getMentor);
router.post('/mentor/meeting-request', studentController.createMeetingRequest);

// Intervention Tracking
router.get('/interventions', studentController.getInterventions);

// OD & Approved Leave Requests
router.get('/od-leave', studentController.getStudentOdLeaveRequests);
router.post('/od-leave', studentController.createOdLeaveRequest);
router.delete('/od-leave/:id', studentController.cancelOdLeaveRequest);

module.exports = router;
