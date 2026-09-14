const prisma = require('../config/db');
const { AttendanceStatus, OdLeaveStatus, OdLeaveType } = require('@prisma/client');
const { calculateStudentAttendanceWithExemptions } = require('./odLeaveService');

const DEFAULT_ATTENDANCE_THRESHOLD = 75;
const HIGH_RISK_THRESHOLD = 65;

/**
 * Retrieve the list of student IDs a faculty member is authorized to access:
 * 1. Students in classes/sections assigned to this faculty (FacultySubjectAssignment)
 * 2. Counselor assigned students (CounselorAssignment)
 * 3. Mentored students (Student.mentorId)
 */
async function getFacultyAuthorizedStudents(facultyStaffId) {
  // 1. Subject assignments
  const subjectAssignments = await prisma.facultySubjectAssignment.findMany({
    where: { facultyId: facultyStaffId, status: 'ACTIVE' },
    include: { course: true },
  });

  // 2. Counselor assignments
  const counselorAssignments = await prisma.counselorAssignment.findMany({
    where: { facultyId: facultyStaffId },
    select: { studentId: true },
  });
  const counselorStudentIds = counselorAssignments.map((c) => c.studentId);

  // 3. Mentored students
  const mentored = await prisma.student.findMany({
    where: { mentorId: facultyStaffId, status: 'ACTIVE', deletedAt: null },
    select: { id: true },
  });
  const mentoredStudentIds = mentored.map((m) => m.id);

  // Build where condition for section/course enrolled students
  const sectionConditions = subjectAssignments.map((a) => ({
    departmentId: a.course.departmentId,
    section: a.section,
    year: Math.ceil(a.semester / 2),
  }));

  const whereOr = [
    { id: { in: [...counselorStudentIds, ...mentoredStudentIds] } },
  ];

  if (sectionConditions.length > 0) {
    whereOr.push(...sectionConditions);
  }

  const authorizedStudents = await prisma.student.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      OR: whereOr,
    },
    select: { id: true, registrationNumber: true, name: true, section: true, departmentId: true },
  });

  const idsSet = new Set(authorizedStudents.map((s) => s.id));
  return {
    studentIds: idsSet,
    counselorStudentIds: new Set(counselorStudentIds),
    students: authorizedStudents,
    assignedSections: [...new Set(subjectAssignments.map((a) => a.section))],
  };
}

/**
 * Retrieve the list of student IDs a mentor is authorized to access:
 * 1. Mentored students (Student.mentorId)
 * 2. Mentor assignments (MentorStudentAssignment where mentorId = mentorStaffId, active = true)
 * 3. Counselor assignments (CounselorAssignment where facultyId = mentorStaffId)
 */
async function getMentorAuthorizedStudents(mentorStaffId) {
  if (!mentorStaffId) {
    return { studentIds: new Set(), students: [] };
  }

  const directStudents = await prisma.student.findMany({
    where: { mentorId: mentorStaffId, status: 'ACTIVE', deletedAt: null },
    select: { id: true, registrationNumber: true, name: true, section: true, departmentId: true },
  });

  const mentorAssignments = await prisma.mentorStudentAssignment.findMany({
    where: { mentorId: mentorStaffId, active: true },
    select: { studentId: true },
  });
  const assignmentStudentIds = mentorAssignments.map((a) => a.studentId);

  const counselorAssignments = await prisma.counselorAssignment.findMany({
    where: { facultyId: mentorStaffId },
    select: { studentId: true },
  });
  const counselorStudentIds = counselorAssignments.map((c) => c.studentId);

  const allAssignedIds = [...new Set([
    ...directStudents.map((s) => s.id),
    ...assignmentStudentIds,
    ...counselorStudentIds,
  ])];

  const students = await prisma.student.findMany({
    where: {
      id: { in: allAssignedIds },
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: { id: true, registrationNumber: true, name: true, section: true, departmentId: true },
  });

  const idsSet = new Set(students.map((s) => s.id));
  return {
    studentIds: idsSet,
    students,
  };
}

/**
 * Check if the authenticated user is authorized to access a specific student's record
 */
async function verifyStudentAuthorization(user, studentId) {
  if (!studentId) return { authorized: false, reason: 'Student ID is required.' };

  if (user.role === 'ADMIN') {
    return { authorized: true };
  }

  if (user.role === 'STUDENT') {
    const ownId = user.studentProfile?.id;
    if (ownId && ownId === studentId) {
      return { authorized: true };
    }
    return {
      authorized: false,
      reason: 'I can only provide attendance information for your own account.',
      ownAccountOnly: true,
    };
  }

  if (user.role === 'PARENT') {
    const linkedId = user.parentProfile?.linkedStudentId;
    if (linkedId && linkedId === studentId) {
      return { authorized: true };
    }
    return {
      authorized: false,
      reason: "You don't have permission to access that information. Parents can only view their linked child's records.",
    };
  }

  if (user.role === 'HOD') {
    const hodDeptId = user.staffProfile?.departmentId;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { departmentId: true },
    });
    if (student && student.departmentId === hodDeptId) {
      return { authorized: true };
    }
    return {
      authorized: false,
      reason: 'Forbidden: You are only authorized to access students within your department.',
    };
  }

  if (user.role === 'MENTOR') {
    const mentorStaffId = user.staffProfile?.id;
    const { studentIds } = await getMentorAuthorizedStudents(mentorStaffId);
    if (studentIds.has(studentId)) {
      return { authorized: true };
    }
    return {
      authorized: false,
      reason: 'You only have access to your assigned students.',
    };
  }

  if (user.role === 'STAFF' || user.role === 'FACULTY') {
    const facultyStaffId = user.staffProfile?.id;
    const { studentIds } = await getFacultyAuthorizedStudents(facultyStaffId);
    if (studentIds.has(studentId)) {
      return { authorized: true };
    }
    return {
      authorized: false,
      reason: 'Forbidden: You are not assigned to instruct or mentor this student.',
    };
  }

  return { authorized: false, reason: "You don't have permission to access that information." };
}

/**
 * Search students with role-based scoping and ambiguity handling
 */
async function searchStudents(user, { query = '', section } = {}) {
  const trimmed = query.trim();

  // If Student role, they can only search / view themselves
  if (user.role === 'STUDENT') {
    const ownStudent = await prisma.student.findUnique({
      where: { id: user.studentProfile?.id },
      include: { department: true },
    });
    if (!ownStudent) return { students: [], count: 0 };

    if (!trimmed || ownStudent.name.toLowerCase().includes(trimmed.toLowerCase()) || ownStudent.registrationNumber.toLowerCase().includes(trimmed.toLowerCase())) {
      return {
        students: [formatStudentSummary(ownStudent)],
        count: 1,
      };
    }
    return {
      students: [],
      count: 0,
      message: 'I can only provide attendance information for your own account.',
    };
  }

  // If Parent role, only linked child
  if (user.role === 'PARENT') {
    const linkedId = user.parentProfile?.linkedStudentId;
    if (!linkedId) return { students: [], count: 0 };

    const child = await prisma.student.findUnique({
      where: { id: linkedId },
      include: { department: true },
    });
    if (!child) return { students: [], count: 0 };

    if (!trimmed || child.name.toLowerCase().includes(trimmed.toLowerCase()) || child.registrationNumber.toLowerCase().includes(trimmed.toLowerCase())) {
      return {
        students: [formatStudentSummary(child)],
        count: 1,
      };
    }
    return {
      students: [],
      count: 0,
      message: "You don't have permission to access other students. You can only view your linked child.",
    };
  }

  // ADMIN scope: System-wide
  if (user.role === 'ADMIN') {
    const where = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (section && section !== 'ALL') where.section = section;

    if (trimmed) {
      where.OR = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { registrationNumber: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: { department: true },
      take: 25,
      orderBy: { registrationNumber: 'asc' },
    });

    return {
      students: students.map(formatStudentSummary),
      count: students.length,
    };
  }

  // HOD scope: Entire Department
  if (user.role === 'HOD') {
    const departmentId = user.staffProfile?.departmentId;
    const where = {
      departmentId,
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (section && section !== 'ALL') where.section = section;

    if (trimmed) {
      where.OR = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { registrationNumber: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: { department: true },
      take: 25,
      orderBy: { registrationNumber: 'asc' },
    });

    return {
      students: students.map(formatStudentSummary),
      count: students.length,
    };
  }

  // Faculty scope: Assigned classes + counselor mentees
  if (user.role === 'STAFF' || user.role === 'FACULTY') {
    const facultyStaffId = user.staffProfile?.id;
    const { studentIds } = await getFacultyAuthorizedStudents(facultyStaffId);

    const where = {
      id: { in: Array.from(studentIds) },
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (section && section !== 'ALL') where.section = section;

    if (trimmed) {
      where.AND = [
        {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { registrationNumber: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: { department: true },
      take: 25,
      orderBy: { registrationNumber: 'asc' },
    });

    return {
      students: students.map(formatStudentSummary),
      count: students.length,
    };
  }

  // Mentor scope: strictly assigned students
  if (user.role === 'MENTOR') {
    const mentorStaffId = user.staffProfile?.id;
    const { studentIds } = await getMentorAuthorizedStudents(mentorStaffId);

    const where = {
      id: { in: Array.from(studentIds) },
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (section && section !== 'ALL') where.section = section;

    if (trimmed) {
      where.AND = [
        {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { registrationNumber: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: { department: true },
      take: 25,
      orderBy: { registrationNumber: 'asc' },
    });

    if (students.length === 0 && trimmed) {
      const existsElsewhere = await prisma.student.findFirst({
        where: {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { registrationNumber: { contains: trimmed, mode: 'insensitive' } },
          ],
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: { id: true },
      });
      if (existsElsewhere) {
        return {
          students: [],
          count: 0,
          message: 'You only have access to your assigned students.',
        };
      }
    }

    return {
      students: students.map(formatStudentSummary),
      count: students.length,
    };
  }

  return { students: [], count: 0 };
}

function formatStudentSummary(s) {
  return {
    studentId: s.id,
    name: s.name,
    registrationNumber: s.registrationNumber,
    section: s.section,
    year: s.year,
    departmentName: s.department?.name || 'Department',
    departmentCode: s.department?.code || 'CSE',
  };
}

/**
 * Exact single student lookup by Registration Number (Highest Priority)
 */
async function getStudentByRegistrationNumber(user, registrationNumber) {
  if (!registrationNumber) {
    return { error: 'Please provide a valid registration number.' };
  }

  const trimmed = registrationNumber.trim();
  const student = await prisma.student.findFirst({
    where: {
      registrationNumber: { equals: trimmed, mode: 'insensitive' },
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: {
      department: true,
      mentor: { select: { name: true, employeeId: true, email: true, cabinLocation: true } },
    },
  });

  if (!student) {
    return { error: `I couldn't find a student with registration number "${trimmed}" in the available records.` };
  }

  const auth = await verifyStudentAuthorization(user, student.id);
  if (!auth.authorized) {
    return { error: auth.reason, unauthorized: true };
  }

  const attendance = await getStudentAttendance(user, { studentId: student.id });

  return {
    studentId: student.id,
    name: student.name,
    registrationNumber: student.registrationNumber,
    department: student.department?.name,
    departmentCode: student.department?.code,
    year: student.year,
    semester: (student.year * 2) - 1,
    section: student.section,
    email: student.email,
    mobileNumber: student.mobileNumber ? `${student.mobileNumber.slice(-4).padStart(student.mobileNumber.length, '*')}` : 'Not provided',
    mentorName: student.mentor?.name || 'Assigned Mentor',
    mentorCabin: student.mentor?.cabinLocation || 'Faculty Block',
    attendanceSummary: attendance?.overall ? {
      overallPercentage: attendance.overall.rawPercentage || attendance.overall.percentage,
      rawPercentage: attendance.overall.rawPercentage || attendance.overall.percentage,
      adjustedPercentage: attendance.overall.adjustedPercentage || attendance.overall.percentage,
      totalClasses: attendance.overall.totalClasses,
      adjustedTotalClasses: attendance.overall.adjustedTotalClasses || attendance.overall.totalClasses,
      attendedClasses: attendance.overall.attendedClasses,
      absentClasses: attendance.overall.absentClasses,
      approvedOdPeriods: attendance.overall.approvedOdPeriods || 0,
      approvedLeavePeriods: attendance.overall.approvedLeavePeriods || 0,
      status: attendance.overall.status,
    } : null,
  };
}

/**
 * Get detailed student profile information (excluding passwords, hashes, secrets)
 */
async function getStudentDetails(user, { studentId, registrationNumber } = {}) {
  let targetId = studentId;

  if (!targetId && registrationNumber) {
    const found = await prisma.student.findFirst({
      where: {
        registrationNumber: { equals: registrationNumber.trim(), mode: 'insensitive' },
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true },
    });
    if (found) targetId = found.id;
  }

  // Fallback for student/parent if no ID is specified
  if (!targetId) {
    if (user.role === 'STUDENT') targetId = user.studentProfile?.id;
    if (user.role === 'PARENT') targetId = user.parentProfile?.linkedStudentId;
  }

  if (!targetId) {
    return { error: "I couldn't find that student in the available records." };
  }

  const auth = await verifyStudentAuthorization(user, targetId);
  if (!auth.authorized) {
    return { error: auth.reason, unauthorized: true };
  }

  const student = await prisma.student.findUnique({
    where: { id: targetId },
    include: {
      department: true,
      mentor: { select: { name: true, employeeId: true, email: true, cabinLocation: true } },
    },
  });

  if (!student) {
    return { error: "I couldn't find that student in the available records." };
  }

  // Also calculate current overall attendance for the summary card
  const attendance = await getStudentAttendance(user, { studentId: targetId });

  return {
    studentId: student.id,
    name: student.name,
    registrationNumber: student.registrationNumber,
    department: student.department?.name,
    departmentCode: student.department?.code,
    year: student.year,
    semester: (student.year * 2) - 1,
    section: student.section,
    email: student.email,
    mobileNumber: student.mobileNumber ? `${student.mobileNumber.slice(-4).padStart(student.mobileNumber.length, '*')}` : 'Not provided',
    mentorName: student.mentor?.name || 'Assigned Mentor',
    mentorCabin: student.mentor?.cabinLocation || 'Faculty Block',
    attendanceSummary: attendance?.overall ? {
      overallPercentage: attendance.overall.percentage,
      totalClasses: attendance.overall.totalClasses,
      attendedClasses: attendance.overall.attendedClasses,
      absentClasses: attendance.overall.absentClasses,
      status: attendance.overall.status,
    } : null,
  };
}

/**
 * Get comprehensive student attendance (Overall + Subject-wise breakdown)
 */
async function getStudentAttendance(user, { studentId, registrationNumber } = {}) {
  let targetId = studentId;

  if (!targetId && registrationNumber) {
    const found = await prisma.student.findUnique({
      where: { registrationNumber },
      select: { id: true },
    });
    if (found) targetId = found.id;
  }

  if (!targetId) {
    if (user.role === 'STUDENT') targetId = user.studentProfile?.id;
    if (user.role === 'PARENT') targetId = user.parentProfile?.linkedStudentId;
  }

  if (!targetId) {
    return { error: "I couldn't find attendance records for this student." };
  }

  const auth = await verifyStudentAuthorization(user, targetId);
  if (!auth.authorized) {
    return { error: auth.reason, unauthorized: true };
  }

  const student = await prisma.student.findUnique({
    where: { id: targetId },
    include: {
      department: true,
      attendanceRecords: {
        include: {
          course: true,
        },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!student) {
    return { error: "I couldn't find that student in the available records." };
  }

  const records = student.attendanceRecords;
  if (!records || records.length === 0) {
    return {
      student: formatStudentSummary(student),
      overall: {
        totalClasses: 0,
        attendedClasses: 0,
        absentClasses: 0,
        percentage: 0,
        status: 'NO_RECORDS',
      },
      subjects: [],
      message: "I couldn't find attendance records for this student.",
    };
  }

  const totalClasses = records.length;
  const attendedClasses = records.filter(
    (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
  ).length;
  const absentClasses = totalClasses - attendedClasses;
  const overallPercentage = Math.round((attendedClasses / totalClasses) * 1000) / 10;

  let overallStatus = 'SAFE';
  if (overallPercentage < HIGH_RISK_THRESHOLD) overallStatus = 'HIGH_RISK';
  else if (overallPercentage < DEFAULT_ATTENDANCE_THRESHOLD) overallStatus = 'AT_RISK';

  // Group by subject / course
  const subjectMap = new Map();
  records.forEach((r) => {
    const courseId = r.courseId;
    if (!subjectMap.has(courseId)) {
      subjectMap.set(courseId, {
        courseId,
        courseCode: r.course.courseCode,
        courseName: r.course.courseName,
        total: 0,
        present: 0,
        absent: 0,
      });
    }
    const subj = subjectMap.get(courseId);
    subj.total++;
    if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY) {
      subj.present++;
    } else {
      subj.absent++;
    }
  });

  const subjects = Array.from(subjectMap.values()).map((s) => {
    const pct = s.total > 0 ? Math.round((s.present / s.total) * 1000) / 10 : 0;
    let status = 'SAFE';
    if (pct < HIGH_RISK_THRESHOLD) status = 'HIGH_RISK';
    else if (pct < DEFAULT_ATTENDANCE_THRESHOLD) status = 'AT_RISK';

    return {
      courseId: s.courseId,
      courseCode: s.courseCode,
      courseName: s.courseName,
      totalClasses: s.total,
      presentClasses: s.present,
      absentClasses: s.absent,
      percentage: pct,
      status,
    };
  });

  // Sort subjects by percentage ascending to easily highlight lowest
  subjects.sort((a, b) => a.percentage - b.percentage);

  const lowestSubject = subjects.length > 0 ? subjects[0] : null;
  const subjectsBelowThreshold = subjects.filter((s) => s.percentage < DEFAULT_ATTENDANCE_THRESHOLD);

  // Calculate approved OD and Leave exemptions
  const attExemptions = await calculateStudentAttendanceWithExemptions(student.id);

  return {
    student: formatStudentSummary(student),
    overall: {
      totalClasses,
      adjustedTotalClasses: attExemptions ? attExemptions.adjusted.totalClasses : totalClasses,
      attendedClasses,
      absentClasses,
      percentage: overallPercentage, // Raw percentage
      rawPercentage: overallPercentage,
      adjustedPercentage: attExemptions ? attExemptions.adjusted.percentage : overallPercentage,
      approvedOdPeriods: attExemptions ? attExemptions.approvedOdPeriods : 0,
      approvedLeavePeriods: attExemptions ? attExemptions.approvedLeavePeriods : 0,
      totalApprovedExemptions: attExemptions ? attExemptions.totalApprovedExemptions : 0,
      status: overallStatus,
      threshold: DEFAULT_ATTENDANCE_THRESHOLD,
      differenceFromThreshold: Math.round(Math.abs(overallPercentage - DEFAULT_ATTENDANCE_THRESHOLD) * 10) / 10,
    },
    subjects,
    lowestSubject,
    subjectsBelowThreshold,
    exemptedDetails: attExemptions ? attExemptions.exemptedDetails : [],
  };
}

/**
 * Deterministic target classes calculation:
 * Formula: (current_present + x) / (current_total + x) >= target
 * => x >= (target * current_total - current_present) / (1 - target)
 */
async function calculateTargetClasses(user, { studentId, targetPercentage = DEFAULT_ATTENDANCE_THRESHOLD } = {}) {
  const target = Math.min(100, Math.max(1, Number(targetPercentage) || DEFAULT_ATTENDANCE_THRESHOLD));
  const attendanceData = await getStudentAttendance(user, { studentId });

  if (attendanceData.error) {
    return attendanceData;
  }

  const { overall, student } = attendanceData;
  const present = overall.attendedClasses;
  const total = overall.totalClasses;
  const currentPct = overall.percentage;

  if (total === 0) {
    return {
      student,
      currentPercentage: 0,
      targetPercentage: target,
      classesNeeded: 0,
      message: 'No classes have been conducted yet.',
    };
  }

  const targetRatio = target / 100;

  if (currentPct >= target) {
    // Student already meets or exceeds target. Calculate how many classes can be safely missed.
    // present / (total + y) >= targetRatio => y <= (present / targetRatio) - total
    const maxCanMiss = Math.max(0, Math.floor(present / targetRatio - total));
    return {
      student,
      currentPercentage: currentPct,
      targetPercentage: target,
      presentClasses: present,
      totalClasses: total,
      classesNeeded: 0,
      alreadyMeetsTarget: true,
      safeMarginClasses: maxCanMiss,
      explanation: `Your current attendance is ${currentPct}% (${present}/${total}), which already meets the ${target}% threshold. You need 0 additional consecutive classes. You can safely miss up to ${maxCanMiss} upcoming classes without falling below ${target}%.`,
    };
  }

  // Need to reach target
  // (present + x) / (total + x) >= targetRatio
  // present + x >= targetRatio * total + targetRatio * x
  // x * (1 - targetRatio) >= targetRatio * total - present
  // x >= (targetRatio * total - present) / (1 - targetRatio)
  const numerator = targetRatio * total - present;
  const denominator = 1 - targetRatio;
  const requiredClasses = Math.ceil(numerator / denominator);

  return {
    student,
    currentPercentage: currentPct,
    targetPercentage: target,
    presentClasses: present,
    totalClasses: total,
    classesNeeded: Math.max(0, requiredClasses),
    alreadyMeetsTarget: false,
    projectedTotal: total + requiredClasses,
    projectedPresent: present + requiredClasses,
    explanation: `Your current attendance is ${currentPct}% (${present}/${total}). To reach the required ${target}% threshold, you must attend the next ${requiredClasses} consecutive classes without absence.`,
  };
}

/**
 * Historical Attendance Trend & Trajectory Analysis
 */
async function getAttendanceTrend(user, { studentId } = {}) {
  const attendanceData = await getStudentAttendance(user, { studentId });
  if (attendanceData.error) return attendanceData;

  const { student } = attendanceData;
  const records = await prisma.attendance.findMany({
    where: { studentId: student.studentId },
    orderBy: { date: 'asc' },
    select: { date: true, status: true, period: true },
  });

  if (records.length < 6) {
    return {
      student,
      insufficientData: true,
      message: 'There isn’t enough historical attendance data to determine a reliable trend (at least 6 sessions required).',
      totalSessionsRecorded: records.length,
    };
  }

  const mid = Math.floor(records.length / 2);
  const firstHalf = records.slice(0, mid);
  const secondHalf = records.slice(mid);

  const p1 = firstHalf.filter((r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY).length / firstHalf.length;
  const p2 = secondHalf.filter((r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY).length / secondHalf.length;

  const pct1 = Math.round(p1 * 1000) / 10;
  const pct2 = Math.round(p2 * 1000) / 10;
  const diff = Math.round((pct2 - pct1) * 10) / 10;

  let trend = 'STABLE';
  if (diff >= 3) trend = 'IMPROVING';
  else if (diff <= -3) trend = 'DECLINING';

  return {
    student,
    overallPercentage: attendanceData.overall.percentage,
    trend,
    trajectoryChange: diff,
    firstHalfPercentage: pct1,
    recentPercentage: pct2,
    explanation: trend === 'IMPROVING'
      ? `Your attendance is improving! Your attendance rate climbed from ${pct1}% in the first half to ${pct2}% in recent sessions (+${diff}%). Keep it up!`
      : trend === 'DECLINING'
      ? `Your attendance is declining. Your attendance dropped from ${pct1}% in the first half to ${pct2}% recently (${diff}%). Immediate attention is recommended.`
      : `Your attendance is stable around ${attendanceData.overall.percentage}% across both earlier and recent sessions.`,
  };
}

/**
 * At-Risk / Defaulter Students Query (HOD & Faculty only)
 */
async function getAtRiskStudents(user, { section, threshold = DEFAULT_ATTENDANCE_THRESHOLD } = {}) {
  if (user.role === 'STUDENT' || user.role === 'PARENT') {
    return {
      error: "You don't have permission to access that information. Defaulter lists are restricted to faculty and department heads.",
      unauthorized: true,
    };
  }

  const numThreshold = Number(threshold) || DEFAULT_ATTENDANCE_THRESHOLD;

  let students = [];
  if (user.role === 'ADMIN') {
    const where = {
      status: 'ACTIVE',
      deletedAt: null,
    };
    if (section && section !== 'ALL') where.section = section;

    students = await prisma.student.findMany({
      where,
      include: {
        department: true,
        attendanceRecords: { select: { status: true } },
      },
    });
  } else if (user.role === 'HOD') {
    const departmentId = user.staffProfile?.departmentId;
    const where = {
      departmentId,
      status: 'ACTIVE',
      deletedAt: null,
    };
    if (section && section !== 'ALL') where.section = section;

    students = await prisma.student.findMany({
      where,
      include: {
        department: true,
        attendanceRecords: { select: { status: true } },
      },
    });
  } else if (user.role === 'STAFF' || user.role === 'FACULTY') {
    const facultyStaffId = user.staffProfile?.id;
    const { studentIds } = await getFacultyAuthorizedStudents(facultyStaffId);

    const where = {
      id: { in: Array.from(studentIds) },
      status: 'ACTIVE',
      deletedAt: null,
    };
    if (section && section !== 'ALL') where.section = section;

    students = await prisma.student.findMany({
      where,
      include: {
        department: true,
        attendanceRecords: { select: { status: true } },
      },
    });
  } else if (user.role === 'MENTOR') {
    const mentorStaffId = user.staffProfile?.id;
    const { studentIds } = await getMentorAuthorizedStudents(mentorStaffId);

    const where = {
      id: { in: Array.from(studentIds) },
      status: 'ACTIVE',
      deletedAt: null,
    };
    if (section && section !== 'ALL') where.section = section;

    students = await prisma.student.findMany({
      where,
      include: {
        department: true,
        attendanceRecords: { select: { status: true } },
      },
    });
  }

  const atRiskList = [];
  students.forEach((s) => {
    const total = s.attendanceRecords.length;
    const present = s.attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
    ).length;
    const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 100;

    if (pct < numThreshold) {
      atRiskList.push({
        studentId: s.id,
        name: s.name,
        registrationNumber: s.registrationNumber,
        section: s.section,
        year: s.year,
        totalClasses: total,
        presentClasses: present,
        absentClasses: total - present,
        percentage: pct,
        status: pct < HIGH_RISK_THRESHOLD ? 'HIGH_RISK' : 'AT_RISK',
      });
    }
  });

  // Sort lowest attendance first
  atRiskList.sort((a, b) => a.percentage - b.percentage);

  return {
    threshold: numThreshold,
    totalScanned: students.length,
    atRiskCount: atRiskList.length,
    students: atRiskList,
  };
}

/**
 * Section Attendance Aggregation (HOD & Faculty only)
 */
async function getSectionAttendance(user, { section = 'A', courseId } = {}) {
  if (user.role === 'STUDENT' || user.role === 'PARENT' || user.role === 'MENTOR') {
    return {
      error: user.role === 'MENTOR' ? "You only have access to your assigned students." : "You don't have permission to access that information.",
      unauthorized: true,
    };
  }

  const cleanSec = section.toUpperCase().trim();

  // If Faculty, verify they are assigned to this section
  if (user.role === 'STAFF' || user.role === 'FACULTY') {
    const facultyStaffId = user.staffProfile?.id;
    const { assignedSections } = await getFacultyAuthorizedStudents(facultyStaffId);
    if (!assignedSections.includes(cleanSec)) {
      return {
        error: `Forbidden: You are not assigned to instruct Section ${cleanSec}.`,
        unauthorized: true,
      };
    }
  }

  const departmentId = user.staffProfile?.departmentId;
  const whereStudents = {
    section: cleanSec,
    status: 'ACTIVE',
    deletedAt: null,
  };
  if (user.role !== 'ADMIN' && departmentId) {
    whereStudents.departmentId = departmentId;
  }

  const students = await prisma.student.findMany({
    where: whereStudents,
    include: {
      attendanceRecords: courseId ? { where: { courseId }, select: { status: true } } : { select: { status: true } },
    },
  });

  if (students.length === 0) {
    return {
      section: cleanSec,
      totalStudents: 0,
      averageAttendance: 0,
      message: `No active students found in Section ${cleanSec}.`,
    };
  }

  let totalClassesAll = 0;
  let presentClassesAll = 0;
  let below75Count = 0;
  let below65Count = 0;

  students.forEach((s) => {
    const total = s.attendanceRecords.length;
    const present = s.attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
    ).length;
    const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 100;

    totalClassesAll += total;
    presentClassesAll += present;

    if (pct < DEFAULT_ATTENDANCE_THRESHOLD) below75Count++;
    if (pct < HIGH_RISK_THRESHOLD) below65Count++;
  });

  const avgPct = totalClassesAll > 0 ? Math.round((presentClassesAll / totalClassesAll) * 1000) / 10 : 0;

  return {
    section: cleanSec,
    totalStudents: students.length,
    averageAttendance: avgPct,
    totalSessionsConducted: Math.round(totalClassesAll / (students.length || 1)),
    below75Count,
    below65Count,
    safeCount: students.length - below75Count,
  };
}

/**
 * Compare attendance between two sections (HOD & Faculty)
 */
async function compareSections(user, { sectionA = 'A', sectionB = 'B', courseId } = {}) {
  const dataA = await getSectionAttendance(user, { section: sectionA, courseId });
  if (dataA.error) return dataA;

  const dataB = await getSectionAttendance(user, { section: sectionB, courseId });
  if (dataB.error) return dataB;

  const diff = Math.round((dataA.averageAttendance - dataB.averageAttendance) * 10) / 10;
  const higher = diff >= 0 ? sectionA : sectionB;

  return {
    sectionA: dataA,
    sectionB: dataB,
    difference: Math.abs(diff),
    higherSection: higher,
    comparisonSummary: `Section ${sectionA} has an average attendance of ${dataA.averageAttendance}%, while Section ${sectionB} has ${dataB.averageAttendance}%. Section ${higher} leads by ${Math.abs(diff)} percentage points.`,
  };
}

/**
 * Faculty & Staff Directory (HOD only)
 */
async function searchFaculty(user, { query = '' } = {}) {
  if (user.role !== 'HOD') {
    return {
      error: "You don't have permission to access faculty directory details. This information is restricted to department heads.",
      unauthorized: true,
    };
  }

  const departmentId = user.staffProfile?.departmentId;
  const trimmed = query.trim();

  const where = {
    departmentId,
    status: 'ACTIVE',
    deletedAt: null,
  };

  if (trimmed) {
    where.OR = [
      { name: { contains: trimmed, mode: 'insensitive' } },
      { employeeId: { contains: trimmed, mode: 'insensitive' } },
      { designation: { contains: trimmed, mode: 'insensitive' } },
    ];
  }

  const facultyList = await prisma.staff.findMany({
    where,
    include: {
      department: true,
      subjectAssignments: {
        where: { status: 'ACTIVE' },
        include: { course: true },
      },
      counselorAssignments: true,
    },
    orderBy: { name: 'asc' },
  });

  return {
    count: facultyList.length,
    faculty: facultyList.map((f) => ({
      facultyId: f.id,
      name: f.name,
      employeeId: f.employeeId,
      designation: f.designation,
      department: f.department.name,
      cabinLocation: f.cabinLocation || 'Faculty Block',
      assignedClassesCount: f.subjectAssignments.length,
      counselorStudentsCount: f.counselorAssignments.length,
      assignedSubjects: f.subjectAssignments.map((a) => `${a.course.courseCode} (${a.section})`),
    })),
  };
}

/**
 * Attendance Report Summary Generator (HOD & Faculty)
 */
async function generateAttendanceReport(user, { section = 'A', reportType = 'summary' } = {}) {
  if (user.role === 'STUDENT' || user.role === 'PARENT') {
    return {
      error: "You don't have permission to generate departmental attendance reports.",
      unauthorized: true,
    };
  }

  const secData = await getSectionAttendance(user, { section });
  if (secData.error) return secData;

  const atRisk = await getAtRiskStudents(user, { section, threshold: DEFAULT_ATTENDANCE_THRESHOLD });

  return {
    reportTitle: `Section ${section.toUpperCase()} Comprehensive Attendance Report`,
    generatedAt: new Date().toISOString(),
    section: section.toUpperCase(),
    metrics: secData,
    defaultersList: atRisk.students || [],
  };
}

const COURSE_ALIASES = {
  cn: 'CS301',
  'computer networks': 'CS301',
  networks: 'CS301',
  dbms: 'CS303',
  database: 'CS303',
  databases: 'CS303',
  'database management systems': 'CS303',
  os: 'CS302',
  'operating systems': 'CS302',
  cloud: 'CS305',
  'cloud computing': 'CS305',
  cca: 'CS305',
  math: 'MA301',
  maths: 'MA301',
  'discrete math': 'MA301',
  'discrete mathematics': 'MA301',
};

function resolveCourseCode(raw) {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  if (COURSE_ALIASES[clean]) return COURSE_ALIASES[clean];
  return raw.trim().toUpperCase();
}

/**
 * Dynamic Student Listing & Multi-criteria Filtering
 */
async function listStudents(user, options = {}) {
  const {
    section,
    semester,
    year,
    subject,
    minAttendance,
    maxAttendance,
    atRiskOnly = false,
    sortBy = 'registrationNumber',
    sortOrder = 'asc',
    limit,
    fields,
  } = options;

  // Authorization Check
  if (user.role === 'STUDENT') {
    return {
      error: 'I can only provide information related to your own account.',
      unauthorized: true,
    };
  }

  if (user.role === 'PARENT') {
    return {
      error: "You don't have permission to access that information. Parents can only view their linked child's records.",
      unauthorized: true,
    };
  }

  let whereConditions = {
    status: 'ACTIVE',
    deletedAt: null,
  };

  const normalizedSection = section ? section.trim().toUpperCase() : null;
  if (normalizedSection && normalizedSection !== 'ALL') {
    whereConditions.section = normalizedSection;
  }

  const effectiveYear = year || (semester ? Math.ceil(Number(semester) / 2) : null);
  if (effectiveYear) {
    whereConditions.year = Number(effectiveYear);
  }

  if (user.role === 'HOD') {
    whereConditions.departmentId = user.staffProfile?.departmentId;
  } else if (user.role === 'STAFF' || user.role === 'FACULTY') {
    const facultyStaffId = user.staffProfile?.id;
    const { studentIds, assignedSections } = await getFacultyAuthorizedStudents(facultyStaffId);

    // If specific section was requested and faculty has no classes/students in it
    if (normalizedSection && normalizedSection !== 'ALL' && !assignedSections.includes(normalizedSection)) {
      const countInSection = await prisma.student.count({
        where: {
          id: { in: Array.from(studentIds) },
          section: normalizedSection,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });
      if (countInSection === 0) {
        return {
          error: `You do not have authorization or assignments for Section ${normalizedSection}.`,
          unauthorized: true,
        };
      }
    }

    whereConditions.id = { in: Array.from(studentIds) };
  } else if (user.role === 'MENTOR') {
    const mentorStaffId = user.staffProfile?.id;
    const { studentIds } = await getMentorAuthorizedStudents(mentorStaffId);
    whereConditions.id = { in: Array.from(studentIds) };
  }

  // Find course if subject filter is specified
  let targetCourse = null;
  if (subject) {
    const resolvedCode = resolveCourseCode(subject);
    targetCourse = await prisma.course.findFirst({
      where: {
        OR: [
          { courseCode: { equals: resolvedCode, mode: 'insensitive' } },
          { courseName: { contains: subject.trim(), mode: 'insensitive' } },
        ],
      },
    });
  }

  // Query matching students with attendance records
  const students = await prisma.student.findMany({
    where: whereConditions,
    include: {
      department: true,
      attendanceRecords: {
        include: { course: true },
      },
    },
    orderBy: { registrationNumber: 'asc' },
  });

  // Calculate attendance for each student
  let computedStudents = students.map((s) => {
    let relevantRecords = s.attendanceRecords;
    if (targetCourse) {
      relevantRecords = relevantRecords.filter((r) => r.courseId === targetCourse.id);
    }

    const total = relevantRecords.length;
    const present = relevantRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
    ).length;
    const percentage = total > 0 ? Math.round((present / total) * 1000) / 10 : (total === 0 ? 0 : 100);

    let status = 'SAFE';
    if (total === 0) status = 'NO_RECORDS';
    else if (percentage < HIGH_RISK_THRESHOLD) status = 'HIGH_RISK';
    else if (percentage < DEFAULT_ATTENDANCE_THRESHOLD) status = 'AT_RISK';

    return {
      studentId: s.id,
      name: s.name,
      registrationNumber: s.registrationNumber,
      section: s.section,
      year: s.year,
      semester: semester || (s.year * 2) - 1,
      department: s.department?.name,
      totalClasses: total,
      presentClasses: present,
      absentClasses: total - present,
      attendance: percentage,
      percentage,
      status,
      subjectName: targetCourse?.courseName || null,
      subjectCode: targetCourse?.courseCode || null,
    };
  });

  // Apply Attendance Threshold Filters
  if (atRiskOnly) {
    computedStudents = computedStudents.filter((s) => s.percentage < DEFAULT_ATTENDANCE_THRESHOLD);
  } else {
    const isRange = minAttendance !== undefined && minAttendance !== null && maxAttendance !== undefined && maxAttendance !== null;
    if (minAttendance !== undefined && minAttendance !== null) {
      computedStudents = computedStudents.filter((s) => s.percentage >= Number(minAttendance));
    }
    if (maxAttendance !== undefined && maxAttendance !== null) {
      computedStudents = computedStudents.filter((s) =>
        isRange ? s.percentage <= Number(maxAttendance) : s.percentage < Number(maxAttendance)
      );
    }
  }

  // Apply Sorting
  const orderMultiplier = sortOrder === 'desc' ? -1 : 1;
  computedStudents.sort((a, b) => {
    if (sortBy === 'attendance' || sortBy === 'percentage') {
      return (a.percentage - b.percentage) * orderMultiplier;
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name) * orderMultiplier;
    }
    if (sortBy === 'registrationNumber') {
      return a.registrationNumber.localeCompare(b.registrationNumber) * orderMultiplier;
    }
    if (sortBy === 'year' || sortBy === 'semester') {
      return (a.year - b.year) * orderMultiplier;
    }
    return a.registrationNumber.localeCompare(b.registrationNumber);
  });

  // Apply Limit (e.g. top 10)
  const totalCount = computedStudents.length;
  if (limit && Number(limit) > 0) {
    computedStudents = computedStudents.slice(0, Number(limit));
  }

  return {
    students: computedStudents,
    totalCount,
    returnedCount: computedStudents.length,
    section: normalizedSection || 'ALL',
    subject: targetCourse ? { code: targetCourse.courseCode, name: targetCourse.courseName } : null,
    filters: {
      section: normalizedSection,
      semester,
      year: effectiveYear,
      subject: targetCourse?.courseCode || subject,
      minAttendance,
      maxAttendance,
      atRiskOnly,
    },
    sorting: { sortBy, sortOrder },
    fields: fields || ['name', 'registrationNumber', 'section', 'attendance', 'status'],
  };
}

/**
 * Dynamic Student Counting & Group Aggregations
 */
async function countStudents(user, options = {}) {
  const { groupBy } = options;

  if (groupBy === 'section') {
    if (user.role === 'STUDENT') {
      return {
        error: 'I can only provide information related to your own account.',
        unauthorized: true,
      };
    }
    if (user.role === 'PARENT') {
      return {
        error: "You don't have permission to access that information. Parents can only view their linked child's records.",
        unauthorized: true,
      };
    }

    let whereConditions = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (user.role === 'HOD') {
      whereConditions.departmentId = user.staffProfile?.departmentId;
    } else if (user.role === 'STAFF' || user.role === 'FACULTY') {
      const facultyStaffId = user.staffProfile?.id;
      const { studentIds } = await getFacultyAuthorizedStudents(facultyStaffId);
      whereConditions.id = { in: Array.from(studentIds) };
    } else if (user.role === 'MENTOR') {
      const mentorStaffId = user.staffProfile?.id;
      const { studentIds } = await getMentorAuthorizedStudents(mentorStaffId);
      whereConditions.id = { in: Array.from(studentIds) };
    }

    const grouped = await prisma.student.groupBy({
      by: ['section'],
      where: whereConditions,
      _count: { id: true },
      orderBy: { section: 'asc' },
    });

    const breakdown = {};
    let total = 0;
    grouped.forEach((g) => {
      breakdown[`Section ${g.section}`] = g._count.id;
      total += g._count.id;
    });

    return {
      breakdown,
      total,
      groupBy: 'section',
    };
  }

  // Otherwise, run listStudents and return the total count
  const listResult = await listStudents(user, options);
  if (listResult.error) return listResult;

  return {
    count: listResult.totalCount,
    filters: listResult.filters,
    section: listResult.section,
    subject: listResult.subject,
  };
}

/**
 * Extreme Student Attendance (Who has highest/lowest)
 */
async function getTopOrBottomStudents(user, options = {}) {
  const { type = 'highest', section, subject, count = 1 } = options;
  const sortOrder = type === 'highest' ? 'desc' : 'asc';

  const listResult = await listStudents(user, {
    section,
    subject,
    sortBy: 'attendance',
    sortOrder,
    limit: count,
  });

  if (listResult.error) return listResult;

  return {
    type,
    students: listResult.students,
    section: listResult.section,
    subject: listResult.subject,
  };
}

/**
 * Explain why a student's adjusted attendance is higher (due to approved OD / Leave)
 */
async function explainAdjustedAttendance(user, { studentId, registrationNumber, nameQuery } = {}) {
  let targetStudentId = studentId;

  if (!targetStudentId && registrationNumber) {
    const student = await prisma.student.findFirst({
      where: { registrationNumber: { equals: registrationNumber.trim(), mode: 'insensitive' }, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });
    if (student) targetStudentId = student.id;
  }

  if (!targetStudentId && nameQuery) {
    const search = await searchStudents(user, { query: nameQuery });
    if (search.count === 1) targetStudentId = search.students[0].studentId;
  }

  if (!targetStudentId) {
    if (user.role === 'STUDENT') targetStudentId = user.studentProfile?.id;
    if (user.role === 'PARENT') targetStudentId = user.parentProfile?.linkedStudentId;
  }

  if (!targetStudentId) {
    return { error: "I couldn't find that student in the available records." };
  }

  const auth = await verifyStudentAuthorization(user, targetStudentId);
  if (!auth.authorized) {
    return { error: auth.reason, unauthorized: true };
  }

  const student = await prisma.student.findUnique({
    where: { id: targetStudentId },
    select: { id: true, name: true, registrationNumber: true, section: true },
  });

  const attData = await calculateStudentAttendanceWithExemptions(targetStudentId);
  const approvedRequests = await prisma.odLeaveRequest.findMany({
    where: { studentId: targetStudentId, status: OdLeaveStatus.APPROVED },
    include: { course: true },
    orderBy: { date: 'asc' },
  });

  return {
    student,
    rawPercentage: attData ? attData.raw.percentage : 0,
    adjustedPercentage: attData ? attData.adjusted.percentage : 0,
    rawPresent: attData ? attData.raw.presentClasses : 0,
    rawTotal: attData ? attData.raw.totalClasses : 0,
    adjustedTotal: attData ? attData.adjusted.totalClasses : 0,
    approvedOdPeriods: attData ? attData.approvedOdPeriods : 0,
    approvedLeavePeriods: attData ? attData.approvedLeavePeriods : 0,
    totalExemptions: attData ? attData.totalApprovedExemptions : 0,
    approvedRequests,
  };
}

/**
 * List pending OD/Leave requests for authorized scope
 */
async function listPendingOdRequests(user, { section, status = 'PENDING', requestType } = {}) {
  const where = { status };
  if (requestType) where.requestType = requestType;

  if (user.role === 'STUDENT') {
    where.studentId = user.studentProfile?.id;
  } else if (user.role === 'PARENT') {
    where.studentId = user.parentProfile?.linkedStudentId;
  } else if (user.role === 'HOD') {
    const deptId = user.staffProfile?.departmentId;
    where.student = { departmentId: deptId, deletedAt: null };
    if (section && section !== 'ALL') where.student.section = section.toUpperCase();
  } else if (user.role === 'STAFF' || user.role === 'FACULTY') {
    const { studentIds } = await getFacultyAuthorizedStudents(user.staffProfile?.id);
    where.studentId = { in: Array.from(studentIds) };
    if (section && section !== 'ALL') where.student = { section: section.toUpperCase() };
  } else if (user.role === 'ADMIN') {
    if (section && section !== 'ALL') where.student = { section: section.toUpperCase() };
  }

  const requests = await prisma.odLeaveRequest.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, registrationNumber: true, section: true } },
      course: { select: { courseName: true, courseCode: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return {
    status,
    count: requests.length,
    requests,
  };
}

/**
 * Count how many students currently have approved OD
 */
async function countStudentsWithApprovedOd(user, { section } = {}) {
  const where = {
    status: OdLeaveStatus.APPROVED,
    requestType: OdLeaveType.ON_DUTY,
  };

  if (user.role === 'STUDENT') {
    where.studentId = user.studentProfile?.id;
  } else if (user.role === 'PARENT') {
    where.studentId = user.parentProfile?.linkedStudentId;
  } else if (user.role === 'HOD') {
    const deptId = user.staffProfile?.departmentId;
    where.student = { departmentId: deptId, deletedAt: null };
    if (section && section !== 'ALL') where.student.section = section.toUpperCase();
  } else if (user.role === 'STAFF' || user.role === 'FACULTY') {
    const { studentIds } = await getFacultyAuthorizedStudents(user.staffProfile?.id);
    where.studentId = { in: Array.from(studentIds) };
    if (section && section !== 'ALL') where.student = { section: section.toUpperCase() };
  } else if (user.role === 'MENTOR') {
    const { studentIds } = await getMentorAuthorizedStudents(user.staffProfile?.id);
    where.studentId = { in: Array.from(studentIds) };
    if (section && section !== 'ALL') where.student = { section: section.toUpperCase() };
  } else if (user.role === 'ADMIN') {
    if (section && section !== 'ALL') where.student = { section: section.toUpperCase() };
  }

  const approved = await prisma.odLeaveRequest.findMany({
    where,
    select: {
      studentId: true,
      student: { select: { id: true, name: true, registrationNumber: true, section: true } },
    },
  });

  const uniqueStudentMap = new Map();
  approved.forEach((a) => {
    if (a.student && !uniqueStudentMap.has(a.studentId)) {
      uniqueStudentMap.set(a.studentId, a.student);
    }
  });

  return {
    count: uniqueStudentMap.size,
    students: Array.from(uniqueStudentMap.values()),
    section: section || 'All',
  };
}

/**
 * Show students whose raw attendance is below 75% but adjusted attendance is >= 75%
 */
async function getStudentsSavedByOd(user, { section, threshold = 75 } = {}) {
  // Fetch students in authorized scope
  const studentWhere = { status: 'ACTIVE', deletedAt: null };

  if (user.role === 'STUDENT') {
    studentWhere.id = user.studentProfile?.id;
  } else if (user.role === 'PARENT') {
    studentWhere.id = user.parentProfile?.linkedStudentId;
  } else if (user.role === 'HOD') {
    studentWhere.departmentId = user.staffProfile?.departmentId;
    if (section && section !== 'ALL') studentWhere.section = section.toUpperCase();
  } else if (user.role === 'STAFF' || user.role === 'FACULTY') {
    const { studentIds } = await getFacultyAuthorizedStudents(user.staffProfile?.id);
    studentWhere.id = { in: Array.from(studentIds) };
    if (section && section !== 'ALL') studentWhere.section = section.toUpperCase();
  } else if (user.role === 'MENTOR') {
    const { studentIds } = await getMentorAuthorizedStudents(user.staffProfile?.id);
    studentWhere.id = { in: Array.from(studentIds) };
    if (section && section !== 'ALL') studentWhere.section = section.toUpperCase();
  } else if (user.role === 'ADMIN') {
    if (section && section !== 'ALL') studentWhere.section = section.toUpperCase();
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true, name: true, registrationNumber: true, section: true },
    orderBy: { registrationNumber: 'asc' },
  });

  const savedStudents = [];

  for (const st of students) {
    const att = await calculateStudentAttendanceWithExemptions(st.id);
    if (att && att.raw.percentage < threshold && att.adjusted.percentage >= threshold) {
      savedStudents.push({
        studentId: st.id,
        name: st.name,
        registrationNumber: st.registrationNumber,
        section: st.section,
        rawPercentage: att.raw.percentage,
        adjustedPercentage: att.adjusted.percentage,
        approvedOdPeriods: att.approvedOdPeriods,
        approvedLeavePeriods: att.approvedLeavePeriods,
        totalExemptions: att.totalApprovedExemptions,
        rawPresent: att.raw.presentClasses,
        rawTotal: att.raw.totalClasses,
        adjustedTotal: att.adjusted.totalClasses,
      });
    }
  }

  return {
    threshold,
    section: section || 'All',
    count: savedStudents.length,
    students: savedStudents,
  };
}

module.exports = {
  DEFAULT_ATTENDANCE_THRESHOLD,
  HIGH_RISK_THRESHOLD,
  verifyStudentAuthorization,
  searchStudents,
  getStudentDetails,
  getStudentByRegistrationNumber,
  getStudentAttendance,
  calculateTargetClasses,
  getAttendanceTrend,
  getAtRiskStudents,
  getSectionAttendance,
  compareSections,
  searchFaculty,
  generateAttendanceReport,
  listStudents,
  countStudents,
  getTopOrBottomStudents,
  resolveCourseCode,
  explainAdjustedAttendance,
  listPendingOdRequests,
  countStudentsWithApprovedOd,
  getStudentsSavedByOd,
  getMentorAuthorizedStudents,
};

