const prisma = require('../config/db');
const { AttendanceStatus, OdLeaveStatus, OdLeaveType } = require('@prisma/client');

/**
 * Format a Date object to YYYY-MM-DD
 */
function formatDateKey(dateObj) {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get period numbers array from startPeriod and endPeriod or explicit periods array
 */
function getPeriodsArray(startPeriod, endPeriod, periods) {
  if (Array.isArray(periods) && periods.length > 0) {
    return periods.map(Number).sort((a, b) => a - b);
  }
  const start = parseInt(startPeriod, 10) || 1;
  const end = parseInt(endPeriod, 10) || start;
  const result = [];
  for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
    result.push(p);
  }
  return result;
}

/**
 * Calculate Student Attendance with Approved OD / Leave Exemptions
 * 
 * STRICT RULES:
 * 1. Raw Attendance = (Raw Present / Raw Total) * 100
 *    Raw attendance records are NEVER mutated from ABSENT to PRESENT.
 * 2. Adjusted Attendance excludes approved OD/Leave absent periods from the denominator:
 *    Adjusted = (Raw Present / (Raw Total - Approved Exemptions)) * 100
 * 3. PENDING, REJECTED, and CANCELLED requests do not affect adjusted attendance.
 * 4. Double-counting is prevented by tracking unique exempted attendance record IDs.
 */
async function calculateStudentAttendanceWithExemptions(studentId) {
  if (!studentId) return null;

  // 1. Fetch all raw attendance records for this student
  const attendanceRecords = await prisma.attendance.findMany({
    where: { studentId },
    include: { course: true },
    orderBy: { date: 'asc' },
  });

  const rawTotal = attendanceRecords.length;
  const presentRecords = attendanceRecords.filter(
    (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
  );
  const rawPresent = presentRecords.length;
  const rawAbsent = rawTotal - rawPresent;
  const rawPercentage = rawTotal > 0 ? Math.round((rawPresent / rawTotal) * 10000) / 100 : 100;

  // 2. Fetch all APPROVED OdLeaveRequests for this student
  const approvedRequests = await prisma.odLeaveRequest.findMany({
    where: {
      studentId,
      status: OdLeaveStatus.APPROVED,
    },
    include: { course: true },
    orderBy: { date: 'asc' },
  });

  // Map approved periods by "YYYY-MM-DD_period"
  const approvedPeriodMap = new Map();
  let approvedOdPeriodsCount = 0;
  let approvedLeavePeriodsCount = 0;

  approvedRequests.forEach((req) => {
    const dateKey = formatDateKey(req.date);
    const periods = getPeriodsArray(req.startPeriod, req.endPeriod, req.periods);

    periods.forEach((p) => {
      const key = `${dateKey}_${p}`;
      if (!approvedPeriodMap.has(key)) {
        approvedPeriodMap.set(key, {
          type: req.requestType,
          requestId: req.id,
          reason: req.reason,
          eventName: req.eventName,
        });

        if (req.requestType === OdLeaveType.ON_DUTY) {
          approvedOdPeriodsCount++;
        } else {
          approvedLeavePeriodsCount++;
        }
      }
    });
  });

  // 3. Match absent attendance records with approved exemption periods
  const exemptedAttendanceRecordIds = new Set();
  const exemptedDetails = [];

  attendanceRecords.forEach((record) => {
    // Only exempt records that were raw ABSENT (or non-present)
    if (record.status === AttendanceStatus.ABSENT || record.status === AttendanceStatus.EXCUSED) {
      const recDateKey = formatDateKey(record.date);
      const recPeriodKey = `${recDateKey}_${record.period}`;

      if (approvedPeriodMap.has(recPeriodKey)) {
        exemptedAttendanceRecordIds.add(record.id);
        const match = approvedPeriodMap.get(recPeriodKey);
        exemptedDetails.push({
          attendanceId: record.id,
          date: recDateKey,
          period: record.period,
          courseCode: record.course?.courseCode,
          type: match.type,
          eventName: match.eventName,
          reason: match.reason,
        });
      }
    }
  });

  const approvedExemptionsCount = exemptedAttendanceRecordIds.size;
  const adjustedTotal = Math.max(1, rawTotal - approvedExemptionsCount);
  const adjustedPresent = rawPresent;
  const adjustedPercentage = rawTotal > 0
    ? Math.round((adjustedPresent / adjustedTotal) * 10000) / 100
    : 100;

  // Subject-wise Breakdown with raw and adjusted metrics
  const subjectMap = new Map();
  attendanceRecords.forEach((record) => {
    const courseId = record.courseId;
    if (!subjectMap.has(courseId)) {
      subjectMap.set(courseId, {
        courseId,
        courseCode: record.course?.courseCode || 'SUB',
        courseName: record.course?.courseName || 'Subject',
        rawTotal: 0,
        rawPresent: 0,
        rawAbsent: 0,
        exemptions: 0,
      });
    }
    const subj = subjectMap.get(courseId);
    subj.rawTotal++;
    if (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.ON_DUTY) {
      subj.rawPresent++;
    } else {
      subj.rawAbsent++;
      if (exemptedAttendanceRecordIds.has(record.id)) {
        subj.exemptions++;
      }
    }
  });

  const subjects = Array.from(subjectMap.values()).map((s) => {
    const rawPct = s.rawTotal > 0 ? Math.round((s.rawPresent / s.rawTotal) * 10000) / 100 : 100;
    const adjTotal = Math.max(1, s.rawTotal - s.exemptions);
    const adjPct = s.rawTotal > 0 ? Math.round((s.rawPresent / adjTotal) * 10000) / 100 : 100;

    let status = 'SAFE';
    if (adjPct < 65) status = 'HIGH_RISK';
    else if (adjPct < 75) status = 'WARNING';

    return {
      courseId: s.courseId,
      courseCode: s.courseCode,
      courseName: s.courseName,
      rawTotalClasses: s.rawTotal,
      rawPresentClasses: s.rawPresent,
      rawAbsentClasses: s.rawAbsent,
      rawPercentage: rawPct,
      exemptedClasses: s.exemptions,
      adjustedTotalClasses: adjTotal,
      adjustedPercentage: adjPct,
      status,
    };
  });

  return {
    raw: {
      totalClasses: rawTotal,
      presentClasses: rawPresent,
      absentClasses: rawAbsent,
      percentage: rawPercentage,
    },
    adjusted: {
      totalClasses: adjustedTotal,
      presentClasses: adjustedPresent,
      exemptions: approvedExemptionsCount,
      percentage: adjustedPercentage,
    },
    approvedOdPeriods: approvedOdPeriodsCount,
    approvedLeavePeriods: approvedLeavePeriodsCount,
    totalApprovedExemptions: approvedExemptionsCount,
    approvedRequestsCount: approvedRequests.length,
    exemptedDetails,
    subjects,
  };
}

/**
 * Check for duplicate or overlapping requests for a student
 */
async function checkOverlap(studentId, date, periods, excludeRequestId = null) {
  const targetDateKey = formatDateKey(date);
  const targetPeriods = periods.map(Number);

  // Find all active requests for this student (PENDING or APPROVED)
  const where = {
    studentId,
    status: { in: [OdLeaveStatus.PENDING, OdLeaveStatus.APPROVED] },
  };
  if (excludeRequestId) {
    where.id = { not: excludeRequestId };
  }

  const existingRequests = await prisma.odLeaveRequest.findMany({
    where,
    select: {
      id: true,
      requestType: true,
      date: true,
      startPeriod: true,
      endPeriod: true,
      periods: true,
      status: true,
      eventName: true,
    },
  });

  for (const existing of existingRequests) {
    const existingDateKey = formatDateKey(existing.date);
    if (existingDateKey === targetDateKey) {
      const existingPeriods = getPeriodsArray(
        existing.startPeriod,
        existing.endPeriod,
        existing.periods
      );

      // Check if any period intersects
      const intersection = targetPeriods.filter((p) => existingPeriods.includes(p));
      if (intersection.length > 0) {
        return {
          hasOverlap: true,
          conflictingRequest: {
            id: existing.id,
            requestType: existing.requestType,
            status: existing.status,
            overlappingPeriods: intersection,
            eventName: existing.eventName,
          },
        };
      }
    }
  }

  return { hasOverlap: false };
}

/**
 * Verify if the authenticated user is authorized to review requests for this student
 */
async function verifyReviewerAuthorization(user, studentId) {
  if (!user) return { authorized: false, reason: 'Authentication required.' };

  // 1. Admin has system-wide clearance
  if (user.role === 'ADMIN') {
    return { authorized: true, role: 'ADMIN' };
  }

  // 2. Students and Parents cannot review requests
  if (user.role === 'STUDENT' || user.role === 'PARENT') {
    return { authorized: false, reason: 'Forbidden: Insufficient privileges to review requests.' };
  }

  // Fetch student details
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, departmentId: true, section: true, mentorId: true },
  });
  if (!student) {
    return { authorized: false, reason: 'Student not found.' };
  }

  // 3. HOD authorization (Department-scoped)
  if (user.role === 'HOD') {
    const hodDepartmentId = user.staffProfile?.departmentId;
    if (hodDepartmentId && hodDepartmentId === student.departmentId) {
      return { authorized: true, role: 'HOD' };
    }
    return {
      authorized: false,
      reason: 'Forbidden: You are only authorized to review requests for students in your department.',
    };
  }

  // 4. Faculty authorization
  if (user.role === 'STAFF' || user.role === 'FACULTY') {
    const staffId = user.staffProfile?.id;
    if (!staffId) {
      return { authorized: false, reason: 'Faculty staff profile not found.' };
    }

    // Check if faculty is mentor/counselor
    if (student.mentorId === staffId) {
      return { authorized: true, role: 'FACULTY' };
    }

    // Check counselor assignment
    const counselorAssignment = await prisma.counselorAssignment.findFirst({
      where: { facultyId: staffId, studentId: student.id },
    });
    if (counselorAssignment) {
      return { authorized: true, role: 'FACULTY' };
    }

    // Check faculty subject assignments for this student's section
    const facultyAssignments = await prisma.facultySubjectAssignment.findMany({
      where: { facultyId: staffId, status: 'ACTIVE' },
      select: { section: true, courseId: true },
    });

    const matchesSection = facultyAssignments.some(
      (a) => a.section.toUpperCase() === student.section.toUpperCase()
    );
    if (matchesSection) {
      return { authorized: true, role: 'FACULTY' };
    }

    return {
      authorized: false,
      reason: 'Forbidden: You are not assigned to instruct or mentor this student.',
    };
  }

  return { authorized: false, reason: 'Forbidden: Unauthorized operation.' };
}

module.exports = {
  formatDateKey,
  getPeriodsArray,
  calculateStudentAttendanceWithExemptions,
  checkOverlap,
  verifyReviewerAuthorization,
};
