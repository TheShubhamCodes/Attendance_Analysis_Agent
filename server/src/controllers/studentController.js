const prisma = require('../config/db');
const { calculateRiskAnalysis } = require('../services/riskAnalysisService');
const { AttendanceStatus, OdLeaveStatus, OdLeaveType } = require('@prisma/client');
const {
  calculateStudentAttendanceWithExemptions,
  checkOverlap,
  getPeriodsArray,
} = require('../services/odLeaveService');

/**
 * Helper to ensure student ID exists for current user
 */
function getStudentId(req) {
  if (req.user && req.user.studentProfile) {
    return req.user.studentProfile.id;
  }
  return null;
}

// 1. Student Profile
async function getProfile(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        department: true,
        mentor: {
          include: { department: true },
        },
        parent: {
          select: {
            name: true,
            email: true,
            mobile: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch profile.' });
  }
}

// 2. Update Safe Profile Fields
async function updateProfile(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const { personalEmail, mobileNumber } = req.body;

    // Validate email if provided
    if (personalEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(personalEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
      }
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        personalEmail: personalEmail ? personalEmail.trim() : undefined,
        mobileNumber: mobileNumber ? mobileNumber.trim() : undefined,
      },
      include: {
        department: true,
        mentor: true,
        parent: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile contact details updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
}

// 3. Student Dashboard
async function getDashboard(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    // Fetch student info with department
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { department: true, mentor: true },
    });

    // Fetch all courses in student's department
    const courses = await prisma.course.findMany({
      where: { departmentId: student.departmentId },
    });

    // Fetch student's attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'asc' },
      include: { course: true },
    });

    // Fetch student's performance records
    const performanceRecords = await prisma.performance.findMany({
      where: { studentId },
      include: { course: true },
    });

    // Fetch unread notifications
    const recentAlerts = await prisma.notification.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });

    // Compute Overall and Adjusted Attendance using odLeaveService
    const attendanceData = await calculateStudentAttendanceWithExemptions(studentId);
    const totalClasses = attendanceData ? attendanceData.raw.totalClasses : attendanceRecords.length;
    const presentClasses = attendanceData ? attendanceData.raw.presentClasses : 0;
    const missedClasses = attendanceData ? attendanceData.raw.absentClasses : 0;
    const attendancePercentage = attendanceData ? attendanceData.raw.percentage : 100;
    const adjustedPercentage = attendanceData ? attendanceData.adjusted.percentage : 100;

    let attendanceStatus = 'SAFE';
    if (adjustedPercentage < 65) attendanceStatus = 'HIGH_RISK';
    else if (adjustedPercentage < 75) attendanceStatus = 'WARNING';

    // Compute Academic Average
    let totalScore = 0;
    let maxScore = 0;
    performanceRecords.forEach((p) => {
      totalScore += p.marks;
      maxScore += p.maximumMarks;
    });
    const academicAverage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 75;

    const subjectAttendance = attendanceData && attendanceData.subjects ? attendanceData.subjects.map((item) => ({
      courseId: item.courseId,
      courseCode: item.courseCode,
      courseName: item.courseName,
      totalClasses: item.rawTotalClasses,
      classesAttended: item.rawPresentClasses,
      classesMissed: item.rawAbsentClasses,
      attendancePercentage: item.rawPercentage,
      adjustedPercentage: item.adjustedPercentage,
      exemptedClasses: item.exemptedClasses,
      status: item.status,
    })) : [];

    // Compute Attendance Trend by Month
    const months = ['June', 'July', 'August', 'September'];
    const monthBuckets = { 5: { total: 0, present: 0 }, 6: { total: 0, present: 0 }, 7: { total: 0, present: 0 }, 8: { total: 0, present: 0 } };

    attendanceRecords.forEach((r) => {
      const m = new Date(r.date).getMonth();
      if (monthBuckets[m]) {
        monthBuckets[m].total += 1;
        if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY) {
          monthBuckets[m].present += 1;
        }
      }
    });

    const attendanceTrend = [
      { month: 'June', attendance: monthBuckets[5].total > 0 ? Math.round((monthBuckets[5].present / monthBuckets[5].total) * 100) : 82 },
      { month: 'July', attendance: monthBuckets[6].total > 0 ? Math.round((monthBuckets[6].present / monthBuckets[6].total) * 100) : 78 },
      { month: 'August', attendance: monthBuckets[7].total > 0 ? Math.round((monthBuckets[7].present / monthBuckets[7].total) * 100) : 74 },
      { month: 'September', attendance: monthBuckets[8].total > 0 ? Math.round((monthBuckets[8].present / monthBuckets[8].total) * 100) : 72 },
    ];

    // AI Risk Analysis
    const riskAnalysis = calculateRiskAnalysis({
      attendanceRecords,
      performanceRecords,
      courses,
    });

    return res.status(200).json({
      success: true,
      data: {
        student: {
          name: student.name,
          registrationNumber: student.registrationNumber,
          department: student.department.name,
          year: student.year,
          section: student.section,
        },
        overallAttendance: {
          percentage: attendancePercentage, // Raw for backward compat
          rawPercentage: attendancePercentage,
          adjustedPercentage: adjustedPercentage,
          requiredPercentage: 75,
          totalClasses,
          adjustedTotalClasses: attendanceData ? attendanceData.adjusted.totalClasses : totalClasses,
          classesAttended: presentClasses,
          classesMissed: missedClasses,
          approvedOdPeriods: attendanceData ? attendanceData.approvedOdPeriods : 0,
          approvedLeavePeriods: attendanceData ? attendanceData.approvedLeavePeriods : 0,
          totalExemptions: attendanceData ? attendanceData.totalApprovedExemptions : 0,
          status: attendanceStatus,
        },
        academicPerformance: {
          average: academicAverage,
          totalAssessments: performanceRecords.length,
        },
        riskStatus: {
          level: riskAnalysis.level,
          score: riskAnalysis.score,
          summary: riskAnalysis.reasons[0] || 'Good standing',
        },
        attendanceTrend,
        subjectWiseAttendance: subjectAttendance,
        importantAlerts: recentAlerts,
        recommendations: riskAnalysis.recommendedActions,
      },
    });
  } catch (error) {
    console.error('getDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Could not load dashboard data.' });
  }
}

// 4. My Attendance (Detailed table view with Raw and Adjusted calculations)
async function getAttendance(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const attendanceData = await calculateStudentAttendanceWithExemptions(studentId);
    if (!attendanceData) {
      return res.status(404).json({ success: false, message: 'Could not calculate attendance.' });
    }

    const overallPercentage = attendanceData.raw.percentage;
    const adjustedPercentage = attendanceData.adjusted.percentage;
    let status = 'SAFE';
    if (adjustedPercentage < 65) status = 'HIGH_RISK';
    else if (adjustedPercentage < 75) status = 'WARNING';

    const subjects = attendanceData.subjects.map((s) => ({
      courseId: s.courseId,
      courseCode: s.courseCode,
      courseName: s.courseName,
      totalClasses: s.rawTotalClasses,
      present: s.rawPresentClasses,
      absent: s.rawAbsentClasses,
      attendancePercentage: s.rawPercentage,
      rawPercentage: s.rawPercentage,
      adjustedPercentage: s.adjustedPercentage,
      exemptedClasses: s.exemptedClasses,
      status: s.status,
    }));

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalClasses: attendanceData.raw.totalClasses,
          present: attendanceData.raw.presentClasses,
          absent: attendanceData.raw.absentClasses,
          overallPercentage, // Raw percentage for backward compat
          rawPercentage: overallPercentage,
          adjustedPercentage,
          adjustedTotalClasses: attendanceData.adjusted.totalClasses,
          approvedOdPeriods: attendanceData.approvedOdPeriods,
          approvedLeavePeriods: attendanceData.approvedLeavePeriods,
          totalApprovedExemptions: attendanceData.totalApprovedExemptions,
          requiredPercentage: 75,
          status,
        },
        subjects,
      },
    });
  } catch (error) {
    console.error('getAttendance error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch attendance records.' });
  }
}

// 5. Attendance Calendar
async function getAttendanceCalendar(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const { month, year } = req.query;
    // Default to September 2026 if not specified
    const targetMonth = month !== undefined ? parseInt(month, 10) : 8; // 0-indexed (8 = September)
    const targetYear = year !== undefined ? parseInt(year, 10) : 2026;

    const startDate = new Date(Date.UTC(targetYear, targetMonth, 1));
    const endDate = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));

    const records = await prisma.attendance.findMany({
      where: {
        studentId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        course: {
          include: { faculty: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Group records by calendar day string (YYYY-MM-DD)
    const dayMap = {};

    records.forEach((record) => {
      const dateStr = record.date.toISOString().split('T')[0];
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = {
          date: dateStr,
          classes: [],
          hasAbsent: false,
          hasPresent: false,
        };
      }

      if (record.status === AttendanceStatus.ABSENT) {
        dayMap[dateStr].hasAbsent = true;
      } else {
        dayMap[dateStr].hasPresent = true;
      }

      dayMap[dateStr].classes.push({
        id: record.id,
        courseCode: record.course.courseCode,
        courseName: record.course.courseName,
        faculty: record.course.faculty ? record.course.faculty.name : 'Faculty Advisor',
        status: record.status,
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        days: dayMap,
      },
    });
  } catch (error) {
    console.error('getAttendanceCalendar error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch attendance calendar.' });
  }
}

// 6. My Performance
async function getPerformance(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    const courses = await prisma.course.findMany({
      where: { departmentId: student.departmentId },
    });

    const records = await prisma.performance.findMany({
      where: { studentId },
      include: { course: true },
      orderBy: { date: 'asc' },
    });

    const subjectMap = {};
    courses.forEach((c) => {
      subjectMap[c.id] = {
        courseId: c.id,
        courseCode: c.courseCode,
        courseName: c.courseName,
        assessments: {},
        totalObtained: 0,
        totalMaximum: 0,
      };
    });

    records.forEach((rec) => {
      if (subjectMap[rec.courseId]) {
        subjectMap[rec.courseId].assessments[rec.assessmentType] = {
          marks: rec.marks,
          maximumMarks: rec.maximumMarks,
          percentage: Math.round((rec.marks / rec.maximumMarks) * 100),
        };
        subjectMap[rec.courseId].totalObtained += rec.marks;
        subjectMap[rec.courseId].totalMaximum += rec.maximumMarks;
      }
    });

    let overallMarks = 0;
    let overallMax = 0;

    const subjectPerformance = Object.values(subjectMap).map((item) => {
      overallMarks += item.totalObtained;
      overallMax += item.totalMaximum;

      const avg = item.totalMaximum > 0 
        ? Math.round((item.totalObtained / item.totalMaximum) * 1000) / 10 
        : 70;

      return {
        ...item,
        averagePercentage: avg,
        internal1: item.assessments['INTERNAL_1']?.marks || null,
        internal2: item.assessments['INTERNAL_2']?.marks || null,
        assignment: item.assessments['ASSIGNMENT']?.marks || null,
        midTerm: item.assessments['MID_TERM']?.marks || null,
        semesterExam: item.assessments['SEMESTER_EXAM']?.marks || null,
      };
    });

    const overallAcademicAverage = overallMax > 0 
      ? Math.round((overallMarks / overallMax) * 1000) / 10 
      : 72;

    const performanceTrend = [
      { assessment: 'Internal 1', average: 73.2 },
      { assessment: 'Internal 2', average: 76.8 },
      { assessment: 'Assignments', average: 83.7 },
      { assessment: 'Mid Term', average: 74.2 },
    ];

    return res.status(200).json({
      success: true,
      data: {
        overallAverage: overallAcademicAverage,
        performanceTrend,
        subjects: subjectPerformance,
      },
    });
  } catch (error) {
    console.error('getPerformance error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch academic performance.' });
  }
}

// 7. AI Risk Analysis
async function getRiskAnalysis(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    const courses = await prisma.course.findMany({
      where: { departmentId: student.departmentId },
    });

    const attendanceRecords = await prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'asc' },
    });

    const performanceRecords = await prisma.performance.findMany({
      where: { studentId },
    });

    const analysis = calculateRiskAnalysis({
      attendanceRecords,
      performanceRecords,
      courses,
    });

    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('getRiskAnalysis error:', error);
    return res.status(500).json({ success: false, message: 'Could not perform risk analysis.' });
  }
}

// 8. Notifications
async function getNotifications(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const notifications = await prisma.notification.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { notificationsEnabled: true },
    });

    let filtered = notifications;
    if (user && user.notificationsEnabled === false) {
      // Only show critical notifications when notifications are turned OFF
      filtered = notifications.filter(
        (n) => n.type === 'ATTENDANCE_WARNING' || n.type === 'PERFORMANCE_WARNING'
      );
    }

    const unreadCount = filtered.filter((n) => !n.isRead).length;

    return res.status(200).json({
      success: true,
      data: {
        notifications: filtered,
        unreadCount,
        notificationsEnabled: user ? user.notificationsEnabled !== false : true,
      },
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch notifications.' });
  }
}

async function markNotificationRead(req, res) {
  try {
    const studentId = getStudentId(req);
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.studentId !== studentId) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    return res.status(500).json({ success: false, message: 'Could not mark notification as read.' });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    const studentId = getStudentId(req);
    await prisma.notification.updateMany({
      where: { studentId, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    return res.status(500).json({ success: false, message: 'Could not update notifications.' });
  }
}

// 9. Mentor Connection & Meeting Request
async function getMentor(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        mentor: {
          include: { department: true },
        },
      },
    });

    const meetingRequests = await prisma.mentorMeetingRequest.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { mentor: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        mentor: student.mentor,
        meetingRequests,
      },
    });
  } catch (error) {
    console.error('getMentor error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch mentor details.' });
  }
}

async function createMeetingRequest(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const { reason, preferredDate, message } = req.body;

    if (!reason || !preferredDate || !message) {
      return res.status(400).json({
        success: false,
        message: 'Reason, preferred date, and message details are required.',
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student.mentorId) {
      return res.status(400).json({
        success: false,
        message: 'No mentor is currently assigned to your profile.',
      });
    }

    const request = await prisma.mentorMeetingRequest.create({
      data: {
        studentId,
        mentorId: student.mentorId,
        reason: reason.trim(),
        preferredDate: new Date(preferredDate),
        message: message.trim(),
        status: 'PENDING',
      },
      include: { mentor: true },
    });

    // Create confirmation notification for student
    await prisma.notification.create({
      data: {
        studentId,
        title: 'Mentor Meeting Request Submitted',
        message: `Your request to meet ${request.mentor.name} on ${new Date(preferredDate).toLocaleDateString()} has been received.`,
        type: 'MENTOR_MESSAGE',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Meeting request successfully submitted to your mentor.',
      data: request,
    });
  } catch (error) {
    console.error('createMeetingRequest error:', error);
    return res.status(500).json({ success: false, message: 'Could not submit meeting request.' });
  }
}

// 10. Interventions Tracking
async function getInterventions(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const interventions = await prisma.intervention.findMany({
      where: { studentId },
      include: {
        mentor: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: interventions,
    });
  } catch (error) {
    console.error('getInterventions error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch interventions.' });
  }
}

// 11. Student OD / Leave Requests
async function getStudentOdLeaveRequests(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const { status, type } = req.query;
    const where = { studentId };
    if (status && status !== 'ALL') where.status = status;
    if (type && type !== 'ALL') where.requestType = type;

    const [requests, attendanceData] = await Promise.all([
      prisma.odLeaveRequest.findMany({
        where,
        include: {
          course: { select: { id: true, courseName: true, courseCode: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      calculateStudentAttendanceWithExemptions(studentId),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        requests,
        attendanceSummary: attendanceData ? {
          rawPercentage: attendanceData.raw.percentage,
          adjustedPercentage: attendanceData.adjusted.percentage,
          totalClasses: attendanceData.raw.totalClasses,
          adjustedTotalClasses: attendanceData.adjusted.totalClasses,
          presentClasses: attendanceData.raw.presentClasses,
          approvedOdPeriods: attendanceData.approvedOdPeriods,
          approvedLeavePeriods: attendanceData.approvedLeavePeriods,
          totalApprovedExemptions: attendanceData.totalApprovedExemptions,
        } : null,
      },
    });
  } catch (error) {
    console.error('getStudentOdLeaveRequests error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch OD/Leave requests.' });
  }
}

async function createOdLeaveRequest(req, res) {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const {
      requestType,
      date,
      startPeriod = 1,
      endPeriod = 1,
      periods,
      courseId,
      reason,
      eventName,
      description,
      documentUrl,
    } = req.body;

    if (!requestType || !['ON_DUTY', 'APPROVED_LEAVE'].includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid requestType (ON_DUTY or APPROVED_LEAVE) is required.',
      });
    }

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason is required.' });
    }

    const targetPeriods = getPeriodsArray(startPeriod, endPeriod, periods);
    if (targetPeriods.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one period must be specified.' });
    }

    const reqDate = new Date(date);
    if (isNaN(reqDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format.' });
    }

    // Check for duplicate or overlapping requests
    const overlapCheck = await checkOverlap(studentId, reqDate, targetPeriods);
    if (overlapCheck.hasOverlap) {
      return res.status(400).json({
        success: false,
        message: 'This period already has an existing OD/Leave request.',
        conflict: overlapCheck.conflictingRequest,
      });
    }

    // Create the request in database with PENDING status
    const newRequest = await prisma.odLeaveRequest.create({
      data: {
        studentId,
        requestType,
        date: reqDate,
        startPeriod: Math.min(...targetPeriods),
        endPeriod: Math.max(...targetPeriods),
        periods: targetPeriods,
        courseId: courseId || null,
        reason: reason.trim(),
        eventName: eventName ? eventName.trim() : null,
        description: description ? description.trim() : null,
        documentUrl: documentUrl || null,
        status: OdLeaveStatus.PENDING,
      },
      include: {
        student: { select: { name: true, registrationNumber: true, section: true } },
        course: { select: { courseName: true, courseCode: true } },
      },
    });

    // Create Student Notification
    await prisma.notification.create({
      data: {
        studentId,
        title: `${requestType === 'ON_DUTY' ? 'On-Duty' : 'Approved Leave'} Request Submitted`,
        message: `Your request for ${date} (Periods: ${targetPeriods.join(', ')}) has been submitted and is currently PENDING review.`,
        type: 'SYSTEM',
      },
    });

    // Log in SystemAuditLog
    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'STUDENT',
        action: 'OD_LEAVE_REQUEST_CREATED',
        targetType: 'OD_LEAVE_REQUEST',
        targetId: newRequest.id,
        targetName: `${newRequest.student.name} (${newRequest.student.registrationNumber})`,
        details: JSON.stringify({
          requestId: newRequest.id,
          requestType,
          date,
          periods: targetPeriods,
          reason,
          eventName,
          status: 'PENDING',
        }),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Request submitted successfully. It is now pending authorized review.',
      data: newRequest,
    });
  } catch (error) {
    console.error('createOdLeaveRequest error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit OD/Leave request.' });
  }
}

async function cancelOdLeaveRequest(req, res) {
  try {
    const studentId = getStudentId(req);
    const { id } = req.params;

    const request = await prisma.odLeaveRequest.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (request.studentId !== studentId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You are not authorized to cancel this request.' });
    }

    if (request.status !== OdLeaveStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel request in "${request.status}" status. Only PENDING requests can be cancelled.`,
      });
    }

    const updated = await prisma.odLeaveRequest.update({
      where: { id },
      data: { status: OdLeaveStatus.CANCELLED },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'OD_LEAVE_REQUEST_CANCELLED',
        targetType: 'OD_LEAVE_REQUEST',
        targetId: id,
        targetName: `${request.student.name} (${request.student.registrationNumber})`,
        details: JSON.stringify({
          requestId: id,
          previousStatus: 'PENDING',
          newStatus: 'CANCELLED',
          cancelledBy: req.user.identifier,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'OD/Leave request has been cancelled.',
      data: updated,
    });
  } catch (error) {
    console.error('cancelOdLeaveRequest error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel request.' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getDashboard,
  getAttendance,
  getAttendanceCalendar,
  getPerformance,
  getRiskAnalysis,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getMentor,
  createMeetingRequest,
  getInterventions,
  getStudentOdLeaveRequests,
  createOdLeaveRequest,
  cancelOdLeaveRequest,
};
