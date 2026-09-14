const { PrismaClient, AttendanceStatus, NotificationType } = require('@prisma/client');
const prisma = new PrismaClient();
const timetableService = require('../services/timetableService');
const StudentValidationService = require('../services/studentValidationService');
const AttendanceAnalysisAgentService = require('../services/attendanceAnalysisAgentService');

function getStaffId(req) {
  if ((req.user?.role === 'HOD' || req.user?.role === 'ADMIN') && req.query.facultyId) {
    return req.query.facultyId;
  }
  return req.user?.staffId || null;
}

/**
 * 1. Get Faculty Today / Live Schedule
 */
async function getFacultySchedule(req, res) {
  try {
    const facultyId = getStaffId(req);
    if (!facultyId) {
      return res.status(403).json({ success: false, message: 'Faculty profile not identified.' });
    }

    const schedule = await timetableService.getFacultySchedule(facultyId, req.query);
    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error('getFacultySchedule error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not retrieve faculty schedule.',
    });
  }
}

/**
 * 2. Get Section Weekly Timetable Grid (Section A or Section B)
 * Enforces strict role-based access control:
 * - Students can only query their own section.
 * - Parents can only query their linked child's section.
 * - Faculty and HOD can query Section A or B.
 */
async function getSectionTimetable(req, res) {
  try {
    const { section } = req.params;
    const { semester = 5, academicYear = '2026-2027' } = req.query;

    if (!section) {
      return res.status(400).json({ success: false, message: 'Section is required.' });
    }

    const cleanSection = section.toString().trim().toUpperCase();
    const userRole = req.user?.role;

    // Student Security: Prevent Section A student from accessing Section B (and vice-versa)
    if (userRole === 'STUDENT') {
      const studentSection = req.user.studentProfile?.section?.toUpperCase();
      if (studentSection && studentSection !== cleanSection) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You belong to Section ${studentSection}. You are not authorized to view the timetable for Section ${cleanSection}.`,
        });
      }
    }

    // Parent Security: Prevent parent from querying an unlinked section
    if (userRole === 'PARENT') {
      const linkedChildren = await timetableService.getParentLinkedChildren(
        req.user.id,
        req.user.parentProfile?.email,
        req.user.parentProfile?.mobile
      );
      const allowedSections = linkedChildren.map((c) => c.section.toUpperCase());
      if (allowedSections.length > 0 && !allowedSections.includes(cleanSection)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are only authorized to view timetable for your child's section (${allowedSections.join(', ')}).`,
        });
      }
    }

    const grid = await timetableService.getSectionTimetableGrid(cleanSection, semester, academicYear);
    return res.status(200).json({
      success: true,
      data: grid,
    });
  } catch (error) {
    console.error('getSectionTimetable error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Could not retrieve section timetable.',
    });
  }
}

/**
 * Smart endpoint that automatically returns the user's role-appropriate timetable.
 */
async function getMyTimetable(req, res) {
  try {
    const userRole = req.user?.role;

    if (userRole === 'STUDENT') {
      const student = req.user.studentProfile;
      const section = student?.section?.toUpperCase() || 'A';
      const semester = student?.year || 5;
      const grid = await timetableService.getSectionTimetableGrid(section, semester);

      return res.status(200).json({
        success: true,
        data: {
          role: 'STUDENT',
          student: {
            id: student?.id,
            name: student?.name,
            registrationNumber: student?.registrationNumber,
            section,
            semester,
            department: req.user.departmentId,
          },
          timetable: grid,
        },
      });
    }

    if (userRole === 'PARENT') {
      const linkedChildren = await timetableService.getParentLinkedChildren(
        req.user.id,
        req.user.parentProfile?.email,
        req.user.parentProfile?.mobile
      );

      if (linkedChildren.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No student profiles are linked to this parent account.',
        });
      }

      // If specific child requested, verify it is linked
      const requestedStudentId = req.query.studentId;
      let activeChild = linkedChildren[0];
      if (requestedStudentId) {
        const found = linkedChildren.find((c) => c.id === requestedStudentId);
        if (found) activeChild = found;
      }

      const grid = await timetableService.getSectionTimetableGrid(
        activeChild.section,
        activeChild.semester
      );

      return res.status(200).json({
        success: true,
        data: {
          role: 'PARENT',
          activeChild,
          linkedChildren,
          timetable: grid,
        },
      });
    }

    if (userRole === 'STAFF' || userRole === 'FACULTY') {
      const staffId = getStaffId(req);
      if (!staffId) {
        return res.status(403).json({ success: false, message: 'Faculty profile not found.' });
      }

      const facultySchedule = await timetableService.getFacultyWeeklySchedule(staffId);
      return res.status(200).json({
        success: true,
        data: {
          role: 'FACULTY',
          facultySchedule,
        },
      });
    }

    // HOD / Admin
    const { section = 'A', semester = 5 } = req.query;
    const grid = await timetableService.getSectionTimetableGrid(section.toUpperCase(), semester);
    return res.status(200).json({
      success: true,
      data: {
        role: 'HOD',
        section: section.toUpperCase(),
        timetable: grid,
      },
    });
  } catch (error) {
    console.error('getMyTimetable error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Could not retrieve timetable.',
    });
  }
}

/**
 * Returns all students linked to the authenticated parent.
 */
async function getParentChildren(req, res) {
  try {
    const linkedChildren = await timetableService.getParentLinkedChildren(
      req.user.id,
      req.user.parentProfile?.email,
      req.user.parentProfile?.mobile
    );

    return res.status(200).json({
      success: true,
      data: linkedChildren,
    });
  } catch (error) {
    console.error('getParentChildren error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Could not retrieve linked children.',
    });
  }
}

/**
 * Returns faculty personal weekly timetable.
 */
async function getFacultyWeeklySchedule(req, res) {
  try {
    const staffId = getStaffId(req);
    if (!staffId) {
      return res.status(403).json({ success: false, message: 'Faculty profile not identified.' });
    }

    const schedule = await timetableService.getFacultyWeeklySchedule(staffId);
    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error('getFacultyWeeklySchedule error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Could not retrieve faculty weekly schedule.',
    });
  }
}

/**
 * Validates manual attendance selections against configured timetable.
 * Provides validation banner data (matching status vs mismatch notice) with override enabled.
 */
async function validateSelection(req, res) {
  try {
    const { section, semester, date, periodNumber, courseId, subjectCode } = req.body;
    const result = await timetableService.validateSelectionAgainstTimetable({
      section,
      semester,
      date,
      periodNumber,
      courseId,
      subjectCode,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('validateSelection error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Could not validate timetable selection.',
    });
  }
}


/**
 * 3. Get Slot Details & Section Students
 */
async function getSlotDetails(req, res) {
  try {
    const facultyId = getStaffId(req);
    const { slotId } = req.params;
    const { date } = req.query;

    const currentKolkata = timetableService.getKolkataCurrentDateTime();
    const selectedDateStr = date || currentKolkata.dateStr;
    const isToday = selectedDateStr === currentKolkata.dateStr;

    // 1. Fetch slot with course and assigned faculty
    const slot = await prisma.timetable.findUnique({
      where: { id: slotId },
      include: {
        course: true,
        faculty: { select: { id: true, name: true, employeeId: true } },
        assignedFaculty: {
          include: {
            faculty: { select: { id: true, name: true, employeeId: true } },
          },
        },
      },
    });

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found.' });
    }

    // 2. Authorization check: Faculty must be assigned to this slot
    const isPrimary = slot.facultyId === facultyId;
    const isAssigned = isPrimary || slot.assignedFaculty.some((af) => af.facultyId === facultyId);

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class.',
      });
    }

    // 3. Check existing attendance for this date & slot
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        courseId: slot.courseId,
        section: slot.section,
        period: slot.periodNumber,
        date: new Date(`${selectedDateStr}T00:00:00.000Z`),
      },
    });

    const isSubmitted = !!existingAttendance;

    // 4. Evaluate live status
    const statusEvaluation = timetableService.evaluateSlotStatus(
      slot,
      currentKolkata.timeStr,
      isToday,
      isSubmitted
    );

    // 5. Load section students (Enforces Section Isolation)
    const students = await StudentValidationService.getSectionStudents(
      slot.section,
      slot.semester
    );

    return res.status(200).json({
      success: true,
      data: {
        slot: {
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
          assignedFaculty: slot.assignedFaculty.map((af) => ({
            id: af.faculty.id,
            name: af.faculty.name,
            employeeId: af.faculty.employeeId,
          })),
        },
        liveEvaluation: {
          currentServerTime: currentKolkata.timeStr,
          currentServerDate: currentKolkata.dateStr,
          timezone: 'Asia/Kolkata',
          status: statusEvaluation.status,
          canMark: statusEvaluation.canMark,
          badgeText: statusEvaluation.badgeText,
          message: statusEvaluation.message,
          isSubmitted,
        },
        students,
        totalStudents: students.length,
      },
    });
  } catch (error) {
    console.error('getSlotDetails error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not retrieve slot details.',
    });
  }
}

/**
 * 4. Record Timetable Attendance
 *
 * Enforces all timetable attendance rules:
 * - currentTime >= periodStartTime in Asia/Kolkata
 * - Breaks prohibited
 * - Faculty authorization
 * - Roll number validation against Student Master
 * - Duplicate prevention
 * - Automatic dispatch to Attendance Analysis Agent
 */
async function recordTimetableAttendance(req, res) {
  try {
    const facultyId = getStaffId(req);
    const { slotId, date, attendanceList } = req.body;

    if (!slotId || !Array.isArray(attendanceList) || attendanceList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Slot ID and student attendance list are required.',
      });
    }

    const currentKolkata = timetableService.getKolkataCurrentDateTime();
    const targetDateStr = date || currentKolkata.dateStr;
    const attendanceDate = new Date(`${targetDateStr}T00:00:00.000Z`);

    // 1. Fetch Timetable Slot
    const slot = await prisma.timetable.findUnique({
      where: { id: slotId },
      include: {
        course: true,
        assignedFaculty: true,
      },
    });

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found.' });
    }

    if (!slot.courseId) {
      return res.status(400).json({
        success: false,
        message: 'This timetable slot is not associated with an active academic subject.',
      });
    }

    // 2. Authorization Check: Faculty must be assigned to this slot
    const isPrimary = slot.facultyId === facultyId;
    const isAssigned = isPrimary || slot.assignedFaculty.some((af) => af.facultyId === facultyId);

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class.',
      });
    }

    // 3. Time Window Validation in Asia/Kolkata (Rule: currentTime >= periodStartTime)
    timetableService.validateSlotAttendanceWindow(slot, targetDateStr);

    // 4. Student Master & Roll Number Validation
    const validationResult = await StudentValidationService.validateAttendanceSubmission(
      attendanceList,
      slot.section,
      slot.semester
    );

    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Attendance validation failed against Student Master.',
        validationErrors: validationResult.issues,
      });
    }

    // 5. Duplicate Attendance Prevention
    const existing = await prisma.attendance.findFirst({
      where: {
        courseId: slot.courseId,
        section: slot.section,
        period: slot.periodNumber,
        date: attendanceDate,
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        message: `Attendance has already been recorded for this student/section for this period (${slot.subjectCode}, Section ${slot.section}, Period ${slot.periodNumber} on ${targetDateStr}).`,
      });
    }

    // 6. Save Attendance in PostgreSQL Transaction
    let presentCount = 0;
    let absentCount = 0;
    const submittedAt = new Date();

    await prisma.$transaction(async (tx) => {
      for (const item of validationResult.validItems) {
        const status = item.status === 'ABSENT' ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
        if (status === AttendanceStatus.PRESENT) presentCount++;
        else absentCount++;

        await tx.attendance.create({
          data: {
            studentId: item.studentId,
            courseId: slot.courseId,
            facultyId,
            section: slot.section,
            period: slot.periodNumber,
            periodId: slot.periodId,
            classStartTime: slot.startTime,
            classEndTime: slot.endTime,
            attendanceSubmittedAt: submittedAt,
            subjectType: slot.subjectType,
            day: slot.dayOfWeek,
            semester: slot.semester,
            date: attendanceDate,
            status,
          },
        });
      }

      // Record system notification for faculty
      await tx.notification.create({
        data: {
          staffId: facultyId,
          title: 'Timetable Attendance Recorded',
          message: `Attendance saved for ${slot.subjectName} (${slot.subjectCode}), Sec ${slot.section}, ${slot.periodId} (${slot.startTime}-${slot.endTime}). Total: ${validationResult.validItems.length} (Present: ${presentCount}, Absent: ${absentCount}).`,
          type: NotificationType.SYSTEM,
        },
      });
    });

    // 7. Dispatch to Attendance Analysis Agent
    let agentOutcome = null;
    try {
      agentOutcome = await AttendanceAnalysisAgentService.ingestAndAnalyzeSession({
        courseId: slot.courseId,
        section: slot.section,
        period: slot.periodNumber,
        date: targetDateStr,
        attendanceList: validationResult.validItems,
        facultyId,
      });
    } catch (agentErr) {
      console.error('Attendance Analysis Agent background error:', agentErr);
    }

    return res.status(201).json({
      success: true,
      message: `Attendance successfully saved for ${slot.subjectName} (${slot.subjectCode}), Section ${slot.section}, Period ${slot.periodNumber}.`,
      sessionSummary: {
        slotId: slot.id,
        section: slot.section,
        subjectCode: slot.subjectCode,
        subjectName: slot.subjectName,
        subjectType: slot.subjectType,
        classStartTime: slot.startTime,
        classEndTime: slot.endTime,
        attendanceSubmittedAt: submittedAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        date: targetDateStr,
        periodNumber: slot.periodNumber,
        periodId: slot.periodId,
        totalStudents: validationResult.validItems.length,
        presentCount,
        absentCount,
      },
      agentOutcome,
    });
  } catch (error) {
    console.error('recordTimetableAttendance error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Attendance has already been recorded for this student for this period.',
      });
    }
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to record timetable attendance.',
    });
  }
}

/**
 * 5. Get Comprehensive Analysis Report
 */
async function getAnalysisReport(req, res) {
  try {
    const { section = 'A', semester = 5 } = req.query;
    const report = await AttendanceAnalysisAgentService.generateComprehensiveReport(
      section,
      parseInt(semester, 10)
    );

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('getAnalysisReport error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Could not generate analysis report.',
    });
  }
}

module.exports = {
  getFacultySchedule,
  getSectionTimetable,
  getMyTimetable,
  getParentChildren,
  getFacultyWeeklySchedule,
  validateSelection,
  getSlotDetails,
  recordTimetableAttendance,
  getAnalysisReport,
};

