const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PERIOD_SCHEDULE = [
  { periodNumber: 1, periodId: 'P1', startTime: '08:15', endTime: '09:05', isBreak: false },
  { periodNumber: 2, periodId: 'P2', startTime: '09:05', endTime: '09:55', isBreak: false },
  { periodNumber: 3, periodId: 'P3', startTime: '09:55', endTime: '10:45', isBreak: false },
  { periodNumber: 0, periodId: 'BREAK1', startTime: '10:45', endTime: '11:00', isBreak: true, label: 'Morning Break' },
  { periodNumber: 4, periodId: 'P4', startTime: '11:00', endTime: '11:50', isBreak: false },
  { periodNumber: 5, periodId: 'P5', startTime: '11:50', endTime: '12:40', isBreak: false },
  { periodNumber: 0, periodId: 'BREAK2', startTime: '12:40', endTime: '13:30', isBreak: true, label: 'Lunch Break' },
  { periodNumber: 6, periodId: 'P6', startTime: '13:30', endTime: '14:20', isBreak: false },
  { periodNumber: 7, periodId: 'P7', startTime: '14:20', endTime: '15:10', isBreak: false },
  { periodNumber: 8, periodId: 'P8', startTime: '15:10', endTime: '16:00', isBreak: false },
];

/**
 * Helper to get live server date, day, and time in Asia/Kolkata timezone.
 * Enforces server time as source of truth.
 */
function getKolkataCurrentDateTime(targetDate = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
  });

  const parts = formatter.formatToParts(targetDate);
  const partMap = {};
  parts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  const year = partMap.year;
  const month = partMap.month;
  const day = partMap.day;
  const hour = partMap.hour;
  const minute = partMap.minute;
  const weekday = (partMap.weekday || '').toUpperCase();

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}`;

  return {
    dateStr,
    timeStr,
    dayOfWeek: weekday, // "MONDAY", "TUESDAY", etc.
    timezone: 'Asia/Kolkata',
    fullTimestamp: new Date().toISOString(),
  };
}

/**
 * Determines the live attendance status for a timetable slot.
 *
 * Rules:
 * - Breaks never permit attendance.
 * - If already submitted for this date + period: COMPLETED
 * - If current time < periodStartTime: LOCKED
 * - If current time >= periodStartTime: AVAILABLE
 *   (Remains available even after periodEndTime. Period end does NOT close attendance.)
 */
function evaluateSlotStatus(slot, currentTimeStr, isToday, isSubmitted) {
  if (slot.isBreak || slot.periodNumber === 0) {
    return {
      status: 'BREAK',
      canMark: false,
      badgeText: 'Break Time',
      badgeColor: 'amber',
      message: 'Break period: No attendance scheduled.',
    };
  }

  if (slot.isCancelled) {
    return {
      status: 'CANCELLED',
      canMark: false,
      badgeText: 'Cancelled',
      badgeColor: 'slate',
      message: 'Class has been cancelled.',
    };
  }

  if (isSubmitted) {
    return {
      status: 'COMPLETED',
      canMark: false,
      badgeText: 'Completed',
      badgeColor: 'blue',
      message: 'Attendance has already been recorded for this session.',
    };
  }

  // If looking at a past date, class start time has already passed -> AVAILABLE
  if (!isToday) {
    return {
      status: 'AVAILABLE',
      canMark: true,
      badgeText: 'Attendance Available',
      badgeColor: 'emerald',
      message: `Past session available for recording. Scheduled: ${slot.startTime} - ${slot.endTime}`,
    };
  }

  // Live Today Comparison
  if (currentTimeStr < slot.startTime) {
    return {
      status: 'LOCKED',
      canMark: false,
      badgeText: `Locked until ${slot.startTime}`,
      badgeColor: 'rose',
      message: `Attendance opens at scheduled start time (${slot.startTime} AM/PM).`,
    };
  }

  // currentTime >= slot.startTime (Available during AND after period ends)
  return {
    status: 'AVAILABLE',
    canMark: true,
    badgeText: 'Attendance Available',
    badgeColor: 'emerald',
    message: `Attendance is open. Scheduled class time: ${slot.startTime} - ${slot.endTime}`,
  };
}

/**
 * Retrieves today's timetable slots for a specific faculty member.
 * Returns slots filtered to their assignments, or all slots for their sections.
 */
async function getFacultySchedule(facultyId, queryParams = {}) {
  const currentKolkata = getKolkataCurrentDateTime();
  const selectedDateStr = queryParams.date || currentKolkata.dateStr;
  const isToday = selectedDateStr === currentKolkata.dateStr;

  // Day of week: if user provided a specific date, determine that date's day of week
  let dayOfWeek = currentKolkata.dayOfWeek;
  if (queryParams.date) {
    const d = new Date(`${queryParams.date}T12:00:00.000Z`);
    dayOfWeek = getKolkataCurrentDateTime(d).dayOfWeek;
  }
  if (queryParams.day) {
    dayOfWeek = queryParams.day.toUpperCase();
  }

  const { section } = queryParams;

  // 1. Fetch Faculty Record & check active status
  const faculty = await prisma.staff.findUnique({
    where: { id: facultyId },
    include: { department: true },
  });

  if (!faculty || faculty.status !== 'ACTIVE' || faculty.deletedAt !== null) {
    const err = new Error('Unauthorized: Faculty account is inactive or not found.');
    err.statusCode = 403;
    throw err;
  }

  // 2. Query Timetable Slots for this Day
  const where = {
    dayOfWeek,
    semester: 5,
    academicYear: '2026-2027',
  };

  if (section && section !== 'ALL') {
    where.section = section.toString().trim().toUpperCase();
  }

  const allSlots = await prisma.timetable.findMany({
    where,
    include: {
      course: true,
      faculty: {
        select: { id: true, name: true, employeeId: true, staffRole: true },
      },
      assignedFaculty: {
        include: {
          faculty: {
            select: { id: true, name: true, employeeId: true, staffRole: true },
          },
        },
      },
    },
    orderBy: [{ section: 'asc' }, { periodNumber: 'asc' }],
  });

  // 3. Query existing attendance submissions for this date to flag COMPLETED
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      date: new Date(`${selectedDateStr}T00:00:00.000Z`),
      ...(section && section !== 'ALL' ? { section } : {}),
    },
    select: {
      courseId: true,
      section: true,
      period: true,
      facultyId: true,
    },
  });

  const submittedKeys = new Set();
  attendanceRecords.forEach((r) => {
    submittedKeys.add(`${r.courseId}_${r.section}_${r.period}`);
  });

  // 4. Filter & decorate slots
  // For the faculty, show slots where they are primary or in assignedFaculty pool
  // (or if they want to view the section's full schedule, mark authorization accordingly)
  const decoratedSlots = allSlots.map((slot) => {
    const isPrimary = slot.facultyId === facultyId;
    const isAssigned =
      isPrimary || slot.assignedFaculty.some((af) => af.facultyId === facultyId);

    const submissionKey = `${slot.courseId}_${slot.section}_${slot.periodNumber}`;
    const isSubmitted = submittedKeys.has(submissionKey);

    const statusEvaluation = evaluateSlotStatus(
      slot,
      currentKolkata.timeStr,
      isToday,
      isSubmitted
    );

    // If faculty is NOT assigned to this slot, they cannot take attendance
    const finalCanMark = isAssigned && statusEvaluation.canMark;
    const authStatus = isAssigned
      ? statusEvaluation.status
      : 'NOT_ASSIGNED';

    return {
      id: slot.id,
      section: slot.section,
      semester: slot.semester,
      academicYear: slot.academicYear,
      dayOfWeek: slot.dayOfWeek,
      periodNumber: slot.periodNumber,
      periodId: slot.periodId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courseId: slot.courseId,
      subjectCode: slot.subjectCode,
      subjectName: slot.subjectName,
      subjectType: slot.subjectType,
      room: slot.room,
      isPrimary,
      isAssigned,
      assignedFacultyList: slot.assignedFaculty.map((af) => ({
        id: af.faculty.id,
        name: af.faculty.name,
        employeeId: af.faculty.employeeId,
      })),
      isSubmitted,
      status: authStatus,
      canMark: finalCanMark,
      badgeText: isAssigned
        ? statusEvaluation.badgeText
        : 'Not Assigned to You',
      badgeColor: isAssigned ? statusEvaluation.badgeColor : 'slate',
      message: isAssigned
        ? statusEvaluation.message
        : 'You are not assigned to conduct this timetable slot.',
    };
  });

  // Separate into:
  // - availableClasses: started/open for attendance right now
  // - upcomingClasses: locked until start time
  // - completedClasses: attendance already submitted
  // - otherClasses: breaks / unassigned
  const mySlots = decoratedSlots.filter((s) => s.isAssigned);
  const availableClasses = mySlots.filter((s) => s.status === 'AVAILABLE');
  const upcomingClasses = mySlots.filter((s) => s.status === 'LOCKED');
  const completedClasses = mySlots.filter((s) => s.status === 'COMPLETED');

  return {
    meta: {
      facultyName: faculty.name,
      employeeId: faculty.employeeId,
      department: faculty.department.name,
      departmentCode: faculty.department.code,
      currentDate: selectedDateStr,
      currentTime: currentKolkata.timeStr,
      currentDay: dayOfWeek,
      isToday,
      timezone: 'Asia/Kolkata',
    },
    periods: PERIOD_SCHEDULE,
    mySlots,
    allSectionSlots: decoratedSlots,
    availableClasses,
    upcomingClasses,
    completedClasses,
    totalMySlotsToday: mySlots.length,
    availableCount: availableClasses.length,
  };
}

/**
 * Retrieves full weekly timetable grid for Section A or B.
 */
async function getSectionTimetableGrid(sectionName, semester = 5, academicYear = '2026-2027') {
  const cleanSection = (sectionName || 'A').toUpperCase();

  const slots = await prisma.timetable.findMany({
    where: {
      section: cleanSection,
      semester: parseInt(semester, 10),
      academicYear,
    },
    include: {
      course: true,
      faculty: {
        select: { id: true, name: true, employeeId: true },
      },
      assignedFaculty: {
        include: {
          faculty: {
            select: { id: true, name: true, employeeId: true },
          },
        },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
  });

  const daysOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const gridByDay = {};

  daysOrder.forEach((day) => {
    gridByDay[day] = [];
    const daySlots = slots.filter((s) => s.dayOfWeek === day);

    PERIOD_SCHEDULE.forEach((p) => {
      if (p.isBreak) {
        gridByDay[day].push({
          periodNumber: 0,
          periodId: p.periodId,
          startTime: p.startTime,
          endTime: p.endTime,
          isBreak: true,
          subjectCode: 'BREAK',
          subjectName: p.label,
          room: null,
          facultyName: null,
        });
      } else {
        const matching = daySlots.find((s) => s.periodNumber === p.periodNumber);
        if (matching) {
          gridByDay[day].push({
            id: matching.id,
            periodNumber: matching.periodNumber,
            periodId: matching.periodId,
            startTime: matching.startTime,
            endTime: matching.endTime,
            isBreak: false,
            courseId: matching.courseId,
            subjectCode: matching.subjectCode,
            subjectName: matching.subjectName,
            subjectType: matching.subjectType,
            room: matching.room,
            facultyName: matching.faculty?.name || matching.assignedFaculty[0]?.faculty?.name || 'Unassigned',
            facultyList: matching.assignedFaculty.map((af) => af.faculty.name),
          });
        } else {
          gridByDay[day].push({
            periodNumber: p.periodNumber,
            periodId: p.periodId,
            startTime: p.startTime,
            endTime: p.endTime,
            isBreak: false,
            subjectCode: 'FREE',
            subjectName: 'No Scheduled Subject',
            room: null,
            facultyName: null,
          });
        }
      }
    });
  });

  return {
    section: cleanSection,
    semester,
    academicYear,
    periods: PERIOD_SCHEDULE,
    grid: gridByDay,
    totalSlots: slots.length,
  };
}

/**
 * Validates whether attendance is currently permitted for this slot.
 * Backend security enforcement using server time in Asia/Kolkata.
 */
function validateSlotAttendanceWindow(slot, clientDateStr) {
  const currentKolkata = getKolkataCurrentDateTime();
  const dateStr = clientDateStr || currentKolkata.dateStr;
  const isToday = dateStr === currentKolkata.dateStr;

  if (slot.isBreak || slot.periodNumber === 0) {
    const err = new Error('Attendance cannot be taken during a break period.');
    err.statusCode = 400;
    throw err;
  }

  if (slot.isCancelled) {
    const err = new Error('This class session has been cancelled.');
    err.statusCode = 400;
    throw err;
  }

  // If session is today and current server time < period start time, reject!
  if (isToday && currentKolkata.timeStr < slot.startTime) {
    const err = new Error(
      `Attendance LOCKED: Scheduled start time is ${slot.startTime} AM/PM. Attendance cannot be recorded prior to class commencement.`
    );
    err.statusCode = 403;
    throw err;
  }

  return true;
}

/**
 * Retrieves the personal weekly timetable schedule for a faculty member.
 * Displays only slots where the faculty is assigned across Section A and Section B.
 */
async function getFacultyWeeklySchedule(facultyId) {
  if (!facultyId) {
    const err = new Error('Faculty ID is required.');
    err.statusCode = 400;
    throw err;
  }

  const slots = await prisma.timetable.findMany({
    where: {
      OR: [
        { facultyId },
        { assignedFaculty: { some: { facultyId } } },
      ],
      isCancelled: false,
    },
    include: {
      course: true,
      faculty: { select: { id: true, name: true, employeeId: true } },
      assignedFaculty: {
        include: { faculty: { select: { id: true, name: true, employeeId: true } } },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
  });

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const scheduleByDay = {};
  days.forEach((d) => {
    scheduleByDay[d] = [];
  });

  slots.forEach((s) => {
    if (scheduleByDay[s.dayOfWeek]) {
      scheduleByDay[s.dayOfWeek].push({
        id: s.id,
        section: s.section,
        semester: s.semester,
        academicYear: s.academicYear,
        dayOfWeek: s.dayOfWeek,
        periodNumber: s.periodNumber,
        periodId: s.periodId,
        startTime: s.startTime,
        endTime: s.endTime,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        subjectType: s.subjectType,
        room: s.room,
        batch: s.batch,
        facultyName: s.faculty?.name || 'Assigned',
        facultyList: s.assignedFaculty.map((af) => af.faculty.name),
      });
    }
  });

  return {
    facultyId,
    totalAssignedClasses: slots.length,
    periods: PERIOD_SCHEDULE,
    schedule: scheduleByDay,
  };
}

/**
 * Finds all students linked to a parent user account.
 */
async function getParentLinkedChildren(userId, parentEmail = null, parentMobile = null) {
  const studentMap = new Map();

  // Query Parent records linked by userId, email, or mobile
  const parentConditions = [{ userId }];
  if (parentEmail) parentConditions.push({ email: parentEmail });
  if (parentMobile) parentConditions.push({ mobile: parentMobile });

  const parentRecords = await prisma.parent.findMany({
    where: { OR: parentConditions },
    include: {
      linkedStudent: {
        include: { department: true },
      },
    },
  });

  parentRecords.forEach((p) => {
    if (p.linkedStudent && !p.linkedStudent.deletedAt && p.linkedStudent.status === 'ACTIVE') {
      studentMap.set(p.linkedStudent.id, {
        id: p.linkedStudent.id,
        registrationNumber: p.linkedStudent.registrationNumber,
        name: p.linkedStudent.name,
        section: p.linkedStudent.section,
        year: p.linkedStudent.year,
        semester: p.linkedStudent.year || 5,
        department: p.linkedStudent.department?.name || 'CSE',
        departmentCode: p.linkedStudent.department?.code || 'CSE',
      });
    }
  });

  return Array.from(studentMap.values());
}


/**
 * Validates manual attendance selections against configured timetable.
 * Does NOT lock out the faculty; provides structured validation data.
 */
async function validateSelectionAgainstTimetable({ section, semester = 5, date, periodNumber, courseId, subjectCode }) {
  if (!section || !periodNumber || !date) {
    return {
      isValid: true,
      isMatch: true,
      message: 'Insufficient parameters for timetable check.',
    };
  }

  const cleanSection = section.toString().trim().toUpperCase();
  const periodNum = parseInt(periodNumber, 10);
  const parsedDate = new Date(date);
  const kolkataDate = getKolkataCurrentDateTime(parsedDate);
  const dayOfWeek = kolkataDate.dayOfWeek;

  const slot = await prisma.timetable.findFirst({
    where: {
      section: cleanSection,
      dayOfWeek,
      periodNumber: periodNum,
      isBreak: false,
    },
    include: {
      course: true,
      faculty: { select: { name: true } },
      assignedFaculty: { include: { faculty: { select: { name: true } } } },
    },
  });

  if (!slot) {
    return {
      isValid: true,
      isMatch: false,
      isConfigured: false,
      dayOfWeek,
      periodNumber: periodNum,
      section: cleanSection,
      message: `No class configured in the official timetable for Section ${cleanSection} on ${dayOfWeek}, Period ${periodNum}.`,
    };
  }

  // Check if subject matches by courseId, subjectCode, or course name
  const codeMatches = subjectCode && (
    slot.subjectCode.toUpperCase() === subjectCode.toString().toUpperCase() ||
    (slot.course && slot.course.courseCode.toUpperCase() === subjectCode.toString().toUpperCase())
  );
  const courseIdMatches = courseId && slot.courseId === courseId;

  const isMatch = Boolean(codeMatches || courseIdMatches);

  const facultyName = slot.faculty?.name || slot.assignedFaculty[0]?.faculty?.name || 'Assigned Faculty';

  if (isMatch) {
    return {
      isValid: true,
      isMatch: true,
      isConfigured: true,
      dayOfWeek,
      periodNumber: periodNum,
      section: cleanSection,
      slot: {
        id: slot.id,
        subjectCode: slot.subjectCode,
        subjectName: slot.subjectName,
        subjectType: slot.subjectType,
        room: slot.room,
        facultyName,
      },
      message: `Timetable match: ${slot.subjectName} (${slot.subjectCode}) in Room ${slot.room || 'N/A'}.`,
    };
  } else {
    return {
      isValid: true,
      isMatch: false,
      isConfigured: true,
      dayOfWeek,
      periodNumber: periodNum,
      section: cleanSection,
      expected: {
        subjectCode: slot.subjectCode,
        subjectName: slot.subjectName,
        subjectType: slot.subjectType,
        room: slot.room,
        facultyName,
      },
      message: `Selected subject does not match the configured timetable for Section ${cleanSection}, Period ${periodNum} on ${dayOfWeek}. (Scheduled: ${slot.subjectName} [${slot.subjectCode}] in ${slot.room || 'Room TBD'}).`,
    };
  }
}

module.exports = {
  PERIOD_SCHEDULE,
  getKolkataCurrentDateTime,
  evaluateSlotStatus,
  getFacultySchedule,
  getSectionTimetableGrid,
  validateSlotAttendanceWindow,
  getFacultyWeeklySchedule,
  getParentLinkedChildren,
  validateSelectionAgainstTimetable,
};

