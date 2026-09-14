const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { AttendanceStatus, InterventionStatus, NotificationType, OdLeaveStatus, OdLeaveType } = require('@prisma/client');
const smsService = require('../services/smsService');
const facultyAttendanceExportService = require('../services/facultyAttendanceExportService');
const { calculateStudentAttendanceWithExemptions, verifyReviewerAuthorization } = require('../services/odLeaveService');
const attendanceUploadService = require('../services/attendanceUploadService');

/**
 * Helper to get authenticated faculty Staff ID
 */
function getFacultyStaffId(req) {
  return req.user?.staffId || null;
}

// =========================================================================
// 1. FACULTY DASHBOARD (COUNSELOR-SCOPED ONLY)
// =========================================================================
async function getDashboard(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    if (!facultyId) {
      return res.status(403).json({ success: false, message: 'Faculty profile not identified.' });
    }

    // 1. My Classes count
    const assignedClasses = await prisma.facultySubjectAssignment.findMany({
      where: { facultyId },
      include: {
        course: true,
      },
    });

    // 2. Fetch counselor-assigned students ONLY
    const counselorAssignments = await prisma.counselorAssignment.findMany({
      where: { facultyId },
      include: {
        student: {
          include: {
            department: true,
            attendanceRecords: true,
          },
        },
      },
    });

    const counselorStudents = counselorAssignments.map((ca) => ca.student).filter(Boolean);
    const totalCounselorStudents = counselorStudents.length;

    // 3. Compute Attendance metrics STRICTLY for counselor-assigned students
    let totalClassesAttendedSum = 0;
    let totalClassesScheduledSum = 0;
    let below75Count = 0;
    let atRiskCount = 0;
    const studentSummaries = [];

    counselorStudents.forEach((student) => {
      const records = student.attendanceRecords || [];
      const total = records.length;
      const present = records.filter(
        (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
      ).length;

      const percentage = total > 0 ? Math.round((present / total) * 1000) / 10 : 100;

      totalClassesAttendedSum += present;
      totalClassesScheduledSum += total;

      if (percentage < 75) {
        below75Count++;
      }
      if (percentage < 65) {
        atRiskCount++;
      }

      studentSummaries.push({
        id: student.id,
        registrationNumber: student.registrationNumber,
        name: student.name,
        section: student.section,
        department: student.department?.code || student.department?.name,
        totalClasses: total,
        presentClasses: present,
        attendancePercentage: percentage,
        isDefaulter: percentage < 75,
        isAtRisk: percentage < 65,
      });
    });

    const averageAttendance =
      totalClassesScheduledSum > 0
        ? Math.round((totalClassesAttendedSum / totalClassesScheduledSum) * 1000) / 10
        : totalCounselorStudents > 0
        ? 100
        : 0;

    // Top Defaulters among counselor students (sorted ascending by percentage)
    const defaultersList = studentSummaries
      .filter((s) => s.isDefaulter)
      .sort((a, b) => a.attendancePercentage - b.attendancePercentage)
      .slice(0, 10);

    // Recent Attendance Sessions conducted by this faculty
    const recentAttendance = await prisma.attendance.findMany({
      where: { facultyId },
      orderBy: { date: 'desc' },
      take: 60,
      include: {
        course: true,
      },
    });

    // Group recent attendance by date + courseId + section + period
    const sessionMap = new Map();
    recentAttendance.forEach((rec) => {
      const dateStr = new Date(rec.date).toISOString().split('T')[0];
      const key = `${dateStr}_${rec.courseId}_${rec.section}_${rec.period}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          date: dateStr,
          courseCode: rec.course.courseCode,
          courseName: rec.course.courseName,
          section: rec.section,
          period: rec.period,
          present: 0,
          absent: 0,
          total: 0,
        });
      }
      const s = sessionMap.get(key);
      s.total++;
      if (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.ON_DUTY) {
        s.present++;
      } else {
        s.absent++;
      }
    });

    const recentSessions = Array.from(sessionMap.values()).slice(0, 5);

    // Pending Interventions Count
    const activeInterventionsCount = await prisma.intervention.count({
      where: {
        mentorId: facultyId,
        status: { in: [InterventionStatus.SCHEDULED, InterventionStatus.IN_PROGRESS] },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        facultyName: req.user.staffProfile?.name || 'Faculty Member',
        employeeId: req.user.staffProfile?.employeeId,
        department: req.user.staffProfile?.department?.name || 'Engineering',
        stats: {
          myClassesCount: assignedClasses.length,
          counselorStudentsCount: totalCounselorStudents,
          averageAttendance,
          below75Count,
          atRiskCount,
          activeInterventionsCount,
        },
        defaulters: defaultersList,
        recentSessions,
      },
    });
  } catch (error) {
    console.error('Faculty getDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Could not load faculty dashboard.' });
  }
}

// =========================================================================
// 2. MY CLASSES
// =========================================================================
async function getClasses(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    if (!facultyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const assignments = await prisma.facultySubjectAssignment.findMany({
      where: { facultyId },
      include: {
        course: {
          include: {
            department: true,
          },
        },
      },
      orderBy: [{ semester: 'asc' }, { section: 'asc' }],
    });

    // Count enrolled students for each class assignment (by departmentId + section)
    const classList = await Promise.all(
      assignments.map(async (a) => {
        const calculatedYear = Math.ceil(a.semester / 2);
        const studentCount = await prisma.student.count({
          where: {
            departmentId: a.course.departmentId,
            section: a.section,
            year: calculatedYear,
            status: 'ACTIVE',
            deletedAt: null,
          },
        });

        return {
          assignmentId: a.id,
          courseId: a.course.id,
          courseCode: a.course.courseCode,
          courseName: a.course.courseName,
          credits: a.course.credits,
          semester: a.semester,
          academicYear: a.academicYear,
          section: a.section,
          departmentId: a.course.departmentId,
          departmentName: a.course.department.name,
          departmentCode: a.course.department.code,
          enrolledStudentsCount: studentCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: classList,
    });
  } catch (error) {
    console.error('Faculty getClasses error:', error);
    return res.status(500).json({ success: false, message: 'Could not load faculty classes.' });
  }
}

// =========================================================================
// 3. MARK ATTENDANCE - FORM METADATA & SECTION STUDENTS
// =========================================================================
async function getClassesFormMeta(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    if (!facultyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const assignments = await prisma.facultySubjectAssignment.findMany({
      where: { facultyId },
      include: {
        course: {
          include: { department: true },
        },
      },
    });

    // Extract unique departments, courses, sections, and semesters assigned
    const departmentsMap = new Map();
    const coursesMap = new Map();
    const sectionsSet = new Set();
    const semestersSet = new Set();

    assignments.forEach((a) => {
      departmentsMap.set(a.course.department.id, {
        id: a.course.department.id,
        name: a.course.department.name,
        code: a.course.department.code,
      });

      coursesMap.set(a.course.id, {
        id: a.course.id,
        courseCode: a.course.courseCode,
        courseName: a.course.courseName,
        departmentId: a.course.departmentId,
        semester: a.semester,
        section: a.section,
      });

      sectionsSet.add(a.section);
      semestersSet.add(a.semester);
    });

    return res.status(200).json({
      success: true,
      data: {
        departments: Array.from(departmentsMap.values()),
        courses: Array.from(coursesMap.values()),
        sections: Array.from(sectionsSet).sort(),
        semesters: Array.from(semestersSet).sort(),
        assignments: assignments.map((a) => ({
          courseId: a.courseId,
          courseCode: a.course.courseCode,
          courseName: a.course.courseName,
          departmentId: a.course.departmentId,
          section: a.section,
          semester: a.semester,
        })),
      },
    });
  } catch (error) {
    console.error('Faculty getClassesFormMeta error:', error);
    return res.status(500).json({ success: false, message: 'Could not load form metadata.' });
  }
}

async function getSectionStudents(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { departmentId, section, semester, courseId, page = 1, limit = 50 } = req.query;

    let resolvedDeptId = departmentId;
    if (!resolvedDeptId && courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId }, select: { departmentId: true } });
      if (course) resolvedDeptId = course.departmentId;
    }
    if (!resolvedDeptId) {
      const faculty = await prisma.staff.findUnique({ where: { id: facultyId }, select: { departmentId: true } });
      if (faculty) resolvedDeptId = faculty.departmentId;
    }

    if (!resolvedDeptId || !section) {
      return res.status(400).json({ success: false, message: 'Department and Section are required.' });
    }

    // Authorization check: Verify faculty has active assignment for this class
    const assignmentWhere = {
      facultyId,
      section: section.toString().trim(),
      status: 'ACTIVE',
      course: { departmentId: resolvedDeptId },
    };

    if (courseId) {
      assignmentWhere.courseId = courseId;
    }

    const assignment = await prisma.facultySubjectAssignment.findFirst({
      where: assignmentWhere,
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to handle this class, subject, or section.',
      });
    }

    const isAll = limit === 'all' || limit === '0' || limit === 0;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = isAll ? 0 : Math.min(100, Math.max(1, parseInt(limit || 50, 10)));

    const studentWhere = {
      departmentId,
      section: section.toString().trim(),
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (semester) {
      const semNum = parseInt(semester, 10);
      studentWhere.year = { in: [semNum, Math.ceil(semNum / 2)] };
    }

    const totalStudents = await prisma.student.count({
      where: studentWhere,
    });

    const queryOptions = {
      where: studentWhere,
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        section: true,
        year: true,
      },
      orderBy: { registrationNumber: 'asc' },
    };

    if (!isAll && pageLimit > 0) {
      queryOptions.skip = (pageNum - 1) * pageLimit;
      queryOptions.take = pageLimit;
    }

    const students = await prisma.student.findMany(queryOptions);

    return res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          totalStudents,
          page: isAll ? 1 : pageNum,
          limit: isAll ? totalStudents : pageLimit,
          totalPages: isAll ? 1 : (Math.ceil(totalStudents / pageLimit) || 1),
        },
      },
    });
  } catch (error) {
    console.error('Faculty getSectionStudents error:', error);
    return res.status(500).json({ success: false, message: 'Could not load students for section.' });
  }
}

// =========================================================================
// 4. SUBMIT ATTENDANCE (WITH DUPLICATE PREVENTION)
// =========================================================================
async function markAttendance(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { courseId, section, semester, period, date, attendanceList } = req.body;

    if (!courseId || !section || !period || !date || !Array.isArray(attendanceList) || attendanceList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All fields (course, section, period, date, attendance records) are required.',
      });
    }

    // 1. Authorization check: Faculty must be assigned to this course and section
    const assignment = await prisma.facultySubjectAssignment.findFirst({
      where: {
        facultyId,
        courseId,
        section: section.toString().trim(),
        status: 'ACTIVE',
        faculty: { deletedAt: null, status: 'ACTIVE' },
      },
      include: { course: true },
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to mark attendance for this subject and section.',
      });
    }

    // 2. Duplicate Check: Prevent accidental duplicate attendance
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const attendanceDate = new Date(`${dateStr}T00:00:00.000Z`);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        courseId,
        section: section.toString().trim(),
        period: parseInt(period, 10),
        date: attendanceDate,
      },
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        message: `Attendance for ${assignment.course.courseCode}, Section ${section}, Period ${period} on ${attendanceDate.toISOString().split('T')[0]} has already been submitted. Use 'Edit Attendance' with OTP verification to modify existing records.`,
      });
    }

    // 3. Save records in PostgreSQL transaction
    let presentCount = 0;
    let absentCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of attendanceList) {
        const status = item.status === 'ABSENT' ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
        if (status === AttendanceStatus.PRESENT) presentCount++;
        else absentCount++;

        await tx.attendance.create({
          data: {
            studentId: item.studentId,
            courseId,
            facultyId,
            section: section.toString().trim(),
            period: parseInt(period, 10),
            date: attendanceDate,
            status,
          },
        });
      }

      // Record system notification for faculty
      await tx.notification.create({
        data: {
          staffId: facultyId,
          title: 'Attendance Submission Successful',
          message: `Attendance recorded for ${assignment.course.courseCode} (${section}), Period ${period} on ${date}. Total: ${attendanceList.length} (Present: ${presentCount}, Absent: ${absentCount}).`,
          type: NotificationType.SYSTEM,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: `Attendance successfully saved for ${assignment.course.courseCode}, Section ${section}, Period ${period}.`,
      data: {
        total: attendanceList.length,
        present: presentCount,
        absent: absentCount,
      },
    });
  } catch (error) {
    console.error('Faculty markAttendance error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Duplicate attendance record detected for one or more students. Please check or use Edit Attendance.',
      });
    }
    return res.status(500).json({ success: false, message: 'Failed to record attendance.' });
  }
}

// =========================================================================
// 5. ATTENDANCE HISTORY
// =========================================================================
async function getAttendanceHistory(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { departmentId, section, semester, courseId, viewMode = 'daily', startDate, endDate } = req.query;

    const whereClause = {
      facultyId,
    };

    if (section && section !== 'ALL') {
      whereClause.section = section.toString().trim();
    }
    if (courseId && courseId !== 'ALL') {
      whereClause.courseId = courseId;
    }

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        course: {
          include: { department: true },
        },
      },
      orderBy: [{ date: 'desc' }, { period: 'asc' }],
    });

    // Group records into sessions: Date + Course + Section + Period
    const sessionMap = new Map();

    records.forEach((rec) => {
      const dateStr = new Date(rec.date).toISOString().split('T')[0];
      const key = `${dateStr}_${rec.courseId}_${rec.section}_${rec.period}`;

      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          sessionId: key,
          date: dateStr,
          rawDate: rec.date,
          period: rec.period,
          courseId: rec.courseId,
          courseCode: rec.course.courseCode,
          courseName: rec.course.courseName,
          section: rec.section,
          departmentName: rec.course.department.name,
          presentCount: 0,
          absentCount: 0,
          totalCount: 0,
        });
      }

      const s = sessionMap.get(key);
      s.totalCount++;
      if (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.ON_DUTY) {
        s.presentCount++;
      } else {
        s.absentCount++;
      }
    });

    const sessions = Array.from(sessionMap.values()).map((s) => ({
      ...s,
      attendancePercentage: s.totalCount > 0 ? Math.round((s.presentCount / s.totalCount) * 1000) / 10 : 0,
    }));

    return res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Faculty getAttendanceHistory error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch attendance history.' });
  }
}

// Fetch individual student records for a specific session
async function getSessionAttendanceDetails(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { courseId, section, date, period } = req.query;

    if (!courseId || !section || !date || !period) {
      return res.status(400).json({ success: false, message: 'Missing session parameters.' });
    }

    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const sessionDate = new Date(`${dateStr}T00:00:00.000Z`);

    const records = await prisma.attendance.findMany({
      where: {
        facultyId,
        courseId,
        section: section.toString().trim(),
        period: parseInt(period, 10),
        date: sessionDate,
      },
      include: {
        student: {
          select: {
            id: true,
            registrationNumber: true,
            name: true,
          },
        },
      },
      orderBy: {
        student: {
          registrationNumber: 'asc',
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: records.map((r) => ({
        attendanceId: r.id,
        studentId: r.student.id,
        registrationNumber: r.student.registrationNumber,
        name: r.student.name,
        status: r.status,
      })),
    });
  } catch (error) {
    console.error('Faculty getSessionAttendanceDetails error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch session details.' });
  }
}

// =========================================================================
// 6. EDIT ATTENDANCE WITH MANDATORY OTP & AUDIT LOGGING
// =========================================================================
async function requestEditOtp(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { courseId, section, date, period } = req.body;

    const faculty = await prisma.staff.findUnique({
      where: { id: facultyId },
    });

    if (!faculty || !faculty.mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'A registered mobile number is mandatory to request an OTP for editing attendance. Please update your profile.',
      });
    }

    // 1. Generate 6-digit numeric OTP
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(plainOtp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 2. Store in FacultyOtpVerification table
    const verification = await prisma.facultyOtpVerification.create({
      data: {
        facultyId,
        otpHash,
        action: 'EDIT_ATTENDANCE',
        targetData: JSON.stringify({ courseId, section, date, period }),
        expiresAt,
        attempts: 0,
      },
    });

    // 3. Dispatch via SMS service abstraction
    const smsResult = await smsService.sendOtp({
      mobileNumber: faculty.mobileNumber,
      otp: plainOtp,
      facultyName: faculty.name,
      purpose: 'attendance modification',
    });

    return res.status(200).json({
      success: true,
      message: smsResult.message,
      data: {
        verificationId: verification.id,
        expiresAt: verification.expiresAt,
        mobileMasked: faculty.mobileNumber.slice(-4).padStart(faculty.mobileNumber.length, '*'),
        devOtpHint: smsResult.devOtpHint, // visible for development ease
      },
    });
  } catch (error) {
    console.error('Faculty requestEditOtp error:', error);
    return res.status(500).json({ success: false, message: 'Could not send verification OTP.' });
  }
}

async function verifyEditOtp(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { verificationId, otp } = req.body;

    if (!verificationId || !otp) {
      return res.status(400).json({ success: false, message: 'Verification ID and OTP are required.' });
    }

    const record = await prisma.facultyOtpVerification.findUnique({
      where: { id: verificationId },
    });

    if (!record || record.facultyId !== facultyId) {
      return res.status(404).json({ success: false, message: 'Verification session not found.' });
    }

    if (record.verifiedAt) {
      return res.status(200).json({ success: true, message: 'OTP is already verified.' });
    }

    // Check expiration
    if (new Date() > record.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP has expired (validity is 5 minutes). Please request a new OTP.' });
    }

    // Check attempt limit
    if (record.attempts >= 5) {
      return res.status(400).json({ success: false, message: 'Maximum verification attempts exceeded. Please request a new OTP.' });
    }

    // Compare hash
    const isMatch = await bcrypt.compare(otp.toString().trim(), record.otpHash);
    if (!isMatch) {
      await prisma.facultyOtpVerification.update({
        where: { id: verificationId },
        data: { attempts: record.attempts + 1 },
      });
      const remaining = 5 - (record.attempts + 1);
      return res.status(400).json({
        success: false,
        message: `Invalid OTP code. ${remaining} attempt(s) remaining.`,
      });
    }

    // Mark as verified
    await prisma.facultyOtpVerification.update({
      where: { id: verificationId },
      data: { verifiedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You may now modify attendance records.',
      data: { verificationId },
    });
  } catch (error) {
    console.error('Faculty verifyEditOtp error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed.' });
  }
}

async function submitAttendanceEdit(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { verificationId, reason, updates } = req.body;

    if (!verificationId || !reason || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Verification ID, mandatory reason for change, and update list are required.',
      });
    }

    if (reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a meaningful reason for editing the official attendance records (minimum 5 characters).',
      });
    }

    // Verify that OTP was verified and not older than 15 minutes
    const verification = await prisma.facultyOtpVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification || verification.facultyId !== facultyId || !verification.verifiedAt) {
      return res.status(403).json({
        success: false,
        message: 'Security validation failed. Please verify via OTP before submitting attendance changes.',
      });
    }

    const elapsed = Date.now() - new Date(verification.verifiedAt).getTime();
    if (elapsed > 15 * 60 * 1000) {
      return res.status(403).json({
        success: false,
        message: 'OTP verification session timed out. Please verify again.',
      });
    }

    let modifiedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const { attendanceId, newStatus } = update;
        const currentRecord = await tx.attendance.findUnique({
          where: { id: attendanceId },
        });

        if (!currentRecord) continue;

        if (currentRecord.status !== newStatus) {
          // Update attendance record
          await tx.attendance.update({
            where: { id: attendanceId },
            data: { status: newStatus },
          });

          // Log into AttendanceAuditLog
          await tx.attendanceAuditLog.create({
            data: {
              attendanceId: currentRecord.id,
              facultyId,
              oldStatus: currentRecord.status,
              newStatus,
              reason: reason.trim(),
            },
          });

          modifiedCount++;
        }
      }

      // Record notification
      await tx.notification.create({
        data: {
          staffId: facultyId,
          title: 'Attendance Edit Audit Logged',
          message: `Modified ${modifiedCount} attendance record(s). Reason: "${reason.trim()}".`,
          type: NotificationType.SYSTEM,
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: `Successfully updated ${modifiedCount} attendance record(s) with audit logging.`,
      data: { modifiedCount },
    });
  } catch (error) {
    console.error('Faculty submitAttendanceEdit error:', error);
    return res.status(500).json({ success: false, message: 'Could not update attendance records.' });
  }
}

// =========================================================================
// 7. AT-RISK STUDENTS (COUNSELOR-ASSIGNED ONLY)
// =========================================================================
async function getAtRiskStudents(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { section, riskLevel, minAttendance, maxAttendance } = req.query;

    // Fetch counselor students only
    const assignments = await prisma.counselorAssignment.findMany({
      where: { facultyId },
      include: {
        student: {
          include: {
            department: true,
            attendanceRecords: {
              include: { course: true },
            },
          },
        },
      },
    });

    const counselorStudents = assignments.map((a) => a.student).filter(Boolean);

    // Compute detailed subject-wise & overall attendance for each student
    const analyzedStudents = counselorStudents.map((student) => {
      const records = student.attendanceRecords || [];
      const total = records.length;
      const present = records.filter(
        (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
      ).length;

      const overallPercentage = total > 0 ? Math.round((present / total) * 1000) / 10 : 100;

      // Group by subject
      const subjectMap = new Map();
      records.forEach((r) => {
        if (!subjectMap.has(r.courseId)) {
          subjectMap.set(r.courseId, {
            courseCode: r.course.courseCode,
            courseName: r.course.courseName,
            total: 0,
            present: 0,
          });
        }
        const s = subjectMap.get(r.courseId);
        s.total++;
        if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY) {
          s.present++;
        }
      });

      const lowAttendanceSubjects = Array.from(subjectMap.values())
        .map((s) => ({
          ...s,
          percentage: s.total > 0 ? Math.round((s.present / s.total) * 1000) / 10 : 100,
        }))
        .filter((s) => s.percentage < 75);

      // Determine risk level
      let calculatedRisk = 'SAFE';
      let suggestedAction = 'Maintain good attendance habits';

      if (overallPercentage < 65) {
        calculatedRisk = 'HIGH_RISK';
        suggestedAction = 'Schedule urgent counseling & contact guardian immediately';
      } else if (overallPercentage < 75) {
        calculatedRisk = 'WARNING';
        suggestedAction = 'Issue attendance warning & monitor morning class regularity';
      }

      return {
        id: student.id,
        registrationNumber: student.registrationNumber,
        name: student.name,
        section: student.section,
        department: student.department?.name,
        departmentCode: student.department?.code,
        overallAttendance: overallPercentage,
        riskLevel: calculatedRisk,
        lowAttendanceSubjects,
        suggestedAction,
        totalClasses: total,
        presentClasses: present,
      };
    });

    // Apply filters
    let filtered = analyzedStudents;

    if (section && section !== 'ALL') {
      filtered = filtered.filter((s) => s.section === section);
    }

    if (riskLevel && riskLevel !== 'ALL') {
      filtered = filtered.filter((s) => s.riskLevel === riskLevel);
    } else {
      // Default: show at-risk and warning students first
      filtered = filtered.filter((s) => s.riskLevel === 'HIGH_RISK' || s.riskLevel === 'WARNING');
    }

    if (minAttendance !== undefined && minAttendance !== '') {
      filtered = filtered.filter((s) => s.overallAttendance >= parseFloat(minAttendance));
    }
    if (maxAttendance !== undefined && maxAttendance !== '') {
      filtered = filtered.filter((s) => s.overallAttendance <= parseFloat(maxAttendance));
    }

    filtered.sort((a, b) => a.overallAttendance - b.overallAttendance);

    return res.status(200).json({
      success: true,
      data: filtered,
    });
  } catch (error) {
    console.error('Faculty getAtRiskStudents error:', error);
    return res.status(500).json({ success: false, message: 'Could not load at-risk students.' });
  }
}

// =========================================================================
// 8. ATTENDANCE PREDICTOR (COUNSELOR-ASSIGNED ONLY)
// =========================================================================
async function getPredictorData(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);

    // Fetch counselor students with real attendance records from PostgreSQL
    const assignments = await prisma.counselorAssignment.findMany({
      where: { facultyId },
      include: {
        student: {
          include: {
            department: true,
            attendanceRecords: {
              include: { course: true },
            },
          },
        },
      },
    });

    const students = assignments.map((a) => {
      const s = a.student;
      const records = s.attendanceRecords || [];

      // Subject breakdown
      const courseMap = new Map();
      let overallPresent = 0;
      let overallTotal = records.length;

      records.forEach((r) => {
        if (!courseMap.has(r.courseId)) {
          courseMap.set(r.courseId, {
            courseId: r.courseId,
            courseCode: r.course.courseCode,
            courseName: r.course.courseName,
            totalClasses: 0,
            presentClasses: 0,
          });
        }
        const c = courseMap.get(r.courseId);
        c.totalClasses++;
        if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY) {
          c.presentClasses++;
          overallPresent++;
        }
      });

      const subjects = Array.from(courseMap.values()).map((c) => ({
        ...c,
        percentage: c.totalClasses > 0 ? Math.round((c.presentClasses / c.totalClasses) * 1000) / 10 : 100,
      }));

      const overallPercentage =
        overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 1000) / 10 : 100;

      return {
        id: s.id,
        registrationNumber: s.registrationNumber,
        name: s.name,
        section: s.section,
        department: s.department.name,
        overall: {
          totalClasses: overallTotal,
          presentClasses: overallPresent,
          percentage: overallPercentage,
        },
        subjects,
      };
    });

    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error('Faculty getPredictorData error:', error);
    return res.status(500).json({ success: false, message: 'Could not load predictor data.' });
  }
}

// =========================================================================
// 9. INTERVENTIONS (COUNSELOR-ASSIGNED ONLY)
// =========================================================================
async function getInterventions(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { status } = req.query;

    const whereClause = {
      mentorId: facultyId,
    };

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const interventions = await prisma.intervention.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            registrationNumber: true,
            name: true,
            section: true,
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
    console.error('Faculty getInterventions error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch interventions.' });
  }
}

async function createIntervention(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { studentId, type, description, date, followUpDate, status = 'SCHEDULED' } = req.body;

    if (!studentId || !type || !description) {
      return res.status(400).json({ success: false, message: 'Student, type, and description are required.' });
    }

    // Verify student is counselor-assigned to this faculty
    const isCounselor = await prisma.counselorAssignment.findFirst({
      where: { facultyId, studentId },
    });

    if (!isCounselor) {
      return res.status(403).json({
        success: false,
        message: 'You can only record interventions for your counselor-assigned students.',
      });
    }

    const intervention = await prisma.intervention.create({
      data: {
        studentId,
        mentorId: facultyId,
        type,
        description: description.trim(),
        date: date ? new Date(date) : new Date(),
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        status,
      },
      include: {
        student: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Intervention successfully logged.',
      data: intervention,
    });
  } catch (error) {
    console.error('Faculty createIntervention error:', error);
    return res.status(500).json({ success: false, message: 'Could not create intervention.' });
  }
}

async function updateIntervention(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { id } = req.params;
    const { status, followUpDate, description } = req.body;

    const existing = await prisma.intervention.findUnique({
      where: { id },
    });

    if (!existing || existing.mentorId !== facultyId) {
      return res.status(404).json({ success: false, message: 'Intervention record not found.' });
    }

    const updated = await prisma.intervention.update({
      where: { id },
      data: {
        status: status || existing.status,
        followUpDate: followUpDate !== undefined ? (followUpDate ? new Date(followUpDate) : null) : existing.followUpDate,
        description: description ? description.trim() : existing.description,
      },
      include: { student: true },
    });

    return res.status(200).json({
      success: true,
      message: 'Intervention status updated.',
      data: updated,
    });
  } catch (error) {
    console.error('Faculty updateIntervention error:', error);
    return res.status(500).json({ success: false, message: 'Could not update intervention.' });
  }
}

// =========================================================================
// 10. NOTIFICATIONS
// =========================================================================
async function getNotifications(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);

    const notifications = await prisma.notification.findMany({
      where: { staffId: facultyId },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { notificationsEnabled: true },
    });

    let filtered = notifications;
    if (user && user.notificationsEnabled === false) {
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
    console.error('Faculty getNotifications error:', error);
    return res.status(500).json({ success: false, message: 'Could not load notifications.' });
  }
}

async function markNotificationRead(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { id } = req.params;

    await prisma.notification.updateMany({
      where: { id, staffId: facultyId },
      data: { isRead: true },
    });

    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error marking notification.' });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);

    await prisma.notification.updateMany({
      where: { staffId: facultyId, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error marking notifications.' });
  }
}

// =========================================================================
// 11. REPORTS WITH EXPORT
// =========================================================================
async function getReports(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { reportType = 'master', courseId, section, startDate, endDate, semester, academicYear } = req.query;

    // 0. Section Master Attendance Sheet (Excel Export / Matrix Preview)
    if (reportType === 'master' || reportType === 'matrix') {
      if (!section || section === 'ALL') {
        return res.status(400).json({
          success: false,
          message: 'Please select a specific section for the Section Master Attendance Sheet.',
        });
      }

      const reportData = await facultyAttendanceExportService.getSectionAttendanceReportData({
        facultyId,
        section,
        semester,
        academicYear,
        courseId,
        startDate,
        endDate,
      });

      if (req.query.export === 'excel' || req.query.format === 'excel') {
        const buffer = facultyAttendanceExportService.buildExcelBuffer(reportData);
        const filename = `Attendance_Report_Sec${reportData.meta.section}_Sem${reportData.meta.semester}_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);
      }

      return res.status(200).json({
        success: true,
        reportTitle: `${reportData.meta.university} - Section ${reportData.meta.section} Attendance Report`,
        data: reportData,
      });
    }

    // Defaulter Report (Counselor Students)
    if (reportType === 'defaulter') {
      const assignments = await prisma.counselorAssignment.findMany({
        where: { facultyId },
        include: {
          student: {
            include: {
              department: true,
              attendanceRecords: { include: { course: true } },
            },
          },
        },
      });

      const rows = [];
      assignments.forEach((a) => {
        const s = a.student;
        const total = s.attendanceRecords.length;
        const present = s.attendanceRecords.filter(
          (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
        ).length;
        const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 100;

        if (pct < 75) {
          rows.push({
            registrationNumber: s.registrationNumber,
            name: s.name,
            department: s.department.code,
            section: s.section,
            totalClasses: total,
            presentClasses: present,
            absentClasses: total - present,
            percentage: `${pct}%`,
            status: pct < 65 ? 'High Risk' : 'Warning',
          });
        }
      });

      return res.status(200).json({
        success: true,
        reportTitle: 'Counselor Student Defaulter Report (< 75%)',
        columns: ['registrationNumber', 'name', 'department', 'section', 'totalClasses', 'presentClasses', 'absentClasses', 'percentage', 'status'],
        data: rows,
      });
    }

    // Section-wise / Attendance History Report (Assigned Classes)
    if (reportType === 'section' || reportType === 'daily' || reportType === 'monthly') {
      const where = { facultyId };
      if (courseId && courseId !== 'ALL') where.courseId = courseId;
      if (section && section !== 'ALL') where.section = section;
      if (startDate && endDate) {
        where.date = { gte: new Date(startDate), lte: new Date(endDate) };
      }

      const records = await prisma.attendance.findMany({
        where,
        include: { course: true, student: true },
        orderBy: [{ date: 'desc' }, { period: 'asc' }],
      });

      const sessionMap = new Map();
      records.forEach((r) => {
        const d = new Date(r.date).toISOString().split('T')[0];
        const key = `${d}_${r.courseId}_${r.section}_${r.period}`;
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            date: d,
            subjectCode: r.course.courseCode,
            subjectName: r.course.courseName,
            section: r.section,
            period: r.period,
            present: 0,
            absent: 0,
            total: 0,
          });
        }
        const s = sessionMap.get(key);
        s.total++;
        if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY) {
          s.present++;
        } else {
          s.absent++;
        }
      });

      const rows = Array.from(sessionMap.values()).map((s) => ({
        ...s,
        percentage: `${s.total > 0 ? Math.round((s.present / s.total) * 1000) / 10 : 0}%`,
      }));

      return res.status(200).json({
        success: true,
        reportTitle: `${reportType.toUpperCase()} Attendance Summary Report`,
        columns: ['date', 'subjectCode', 'subjectName', 'section', 'period', 'present', 'absent', 'total', 'percentage'],
        data: rows,
      });
    }

    // Interventions Report
    if (reportType === 'interventions') {
      const interventions = await prisma.intervention.findMany({
        where: { mentorId: facultyId },
        include: { student: true },
        orderBy: { date: 'desc' },
      });

      const rows = interventions.map((i) => ({
        date: new Date(i.date).toISOString().split('T')[0],
        registrationNumber: i.student.registrationNumber,
        name: i.student.name,
        section: i.student.section,
        type: i.type,
        status: i.status,
        followUpDate: i.followUpDate ? new Date(i.followUpDate).toISOString().split('T')[0] : 'N/A',
        description: i.description,
      }));

      return res.status(200).json({
        success: true,
        reportTitle: 'Counselor Interventions & Mentoring Report',
        columns: ['date', 'registrationNumber', 'name', 'section', 'type', 'status', 'followUpDate', 'description'],
        data: rows,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid report type requested.' });
  } catch (error) {
    console.error('Faculty getReports error:', error);
    return res.status(500).json({ success: false, message: 'Could not generate report.' });
  }
}

// =========================================================================
// 12. LIMITED STUDENT PROFILE SEARCH (AUTHORIZED STUDENTS ONLY)
// =========================================================================
async function searchStudents(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { query = '', section } = req.query;

    // Get authorized sections from assigned classes and counselor students
    const assignments = await prisma.facultySubjectAssignment.findMany({
      where: { facultyId },
      select: { section: true, course: { select: { departmentId: true } } },
    });

    const counselorAssignments = await prisma.counselorAssignment.findMany({
      where: { facultyId },
      select: { studentId: true },
    });
    const counselorStudentIds = counselorAssignments.map((c) => c.studentId);

    const authorizedSections = [...new Set(assignments.map((a) => a.section))];
    const authorizedDeptIds = [...new Set(assignments.map((a) => a.course.departmentId))];

    const whereConditions = {
      deletedAt: null,
      status: 'ACTIVE',
      OR: [
        { id: { in: counselorStudentIds } },
        {
          departmentId: { in: authorizedDeptIds },
          section: { in: authorizedSections },
        },
      ],
    };

    if (section && section !== 'ALL') {
      whereConditions.section = section;
    }

    if (query && query.trim()) {
      const q = query.trim();
      whereConditions.AND = [
        {
          OR: [
            { registrationNumber: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const students = await prisma.student.findMany({
      where: whereConditions,
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        section: true,
        year: true,
        department: { select: { name: true, code: true } },
        attendanceRecords: {
          select: { status: true },
        },
      },
      take: 30,
      orderBy: { registrationNumber: 'asc' },
    });

    const result = students.map((s) => {
      const total = s.attendanceRecords.length;
      const present = s.attendanceRecords.filter(
        (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
      ).length;
      const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 100;

      return {
        id: s.id,
        registrationNumber: s.registrationNumber,
        name: s.name,
        section: s.section,
        year: s.year,
        departmentName: s.department.name,
        departmentCode: s.department.code,
        overallAttendance: pct,
        isCounselorAssigned: counselorStudentIds.includes(s.id),
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Faculty searchStudents error:', error);
    return res.status(500).json({ success: false, message: 'Error searching students.' });
  }
}

// =========================================================================
// 13. FACULTY PROFILE
// =========================================================================
async function getProfile(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);

    const faculty = await prisma.staff.findUnique({
      where: { id: facultyId },
      include: {
        department: true,
        subjectAssignments: {
          include: { course: true },
        },
        counselorAssignments: true,
      },
    });

    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty profile not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: faculty.id,
        employeeId: faculty.employeeId,
        name: faculty.name,
        email: faculty.email,
        mobileNumber: faculty.mobileNumber || '',
        designation: faculty.designation,
        cabinLocation: faculty.cabinLocation,
        departmentId: faculty.departmentId,
        departmentName: faculty.department.name,
        departmentCode: faculty.department.code,
        assignedClassesCount: faculty.subjectAssignments.length,
        counselorStudentCount: faculty.counselorAssignments.length,
        assignedSubjects: faculty.subjectAssignments.map((a) => ({
          courseCode: a.course.courseCode,
          courseName: a.course.courseName,
          section: a.section,
          semester: a.semester,
        })),
      },
    });
  } catch (error) {
    console.error('Faculty getProfile error:', error);
    return res.status(500).json({ success: false, message: 'Could not load profile.' });
  }
}

async function updateProfile(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    const { mobileNumber, cabinLocation } = req.body;

    // Mandatory mobile number check
    if (!mobileNumber || mobileNumber.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Registered mobile number is strictly mandatory for security verification and cannot be removed.',
      });
    }

    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.',
      });
    }

    const updated = await prisma.staff.update({
      where: { id: facultyId },
      data: {
        mobileNumber: cleanPhone,
        cabinLocation: cabinLocation !== undefined ? cabinLocation.trim() : undefined,
      },
      include: { department: true },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile contact details successfully updated.',
      data: {
        mobileNumber: updated.mobileNumber,
        cabinLocation: updated.cabinLocation,
      },
    });
  } catch (error) {
    console.error('Faculty updateProfile error:', error);
    return res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
}

// =========================================================================
// 13. MASTER SECTION ATTENDANCE EXCEL EXPORT & MATRIX
// =========================================================================
async function exportSectionAttendanceExcel(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    if (!facultyId) {
      return res.status(401).json({ success: false, message: 'Unauthorized faculty request.' });
    }

    const { section, semester, academicYear, courseId, startDate, endDate } = req.query;

    if (!section || section === 'ALL') {
      return res.status(400).json({ success: false, message: 'Please select a specific section to export.' });
    }

    const reportData = await facultyAttendanceExportService.getSectionAttendanceReportData({
      facultyId,
      section,
      semester,
      academicYear,
      courseId,
      startDate,
      endDate,
    });

    const buffer = facultyAttendanceExportService.buildExcelBuffer(reportData);
    const filename = `Attendance_Report_Sec${reportData.meta.section}_Sem${reportData.meta.semester}_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (error) {
    console.error('exportSectionAttendanceExcel error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to generate attendance Excel export.',
    });
  }
}

async function getSectionAttendanceMatrix(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    if (!facultyId) {
      return res.status(401).json({ success: false, message: 'Unauthorized faculty request.' });
    }

    const { section, semester, academicYear, courseId, startDate, endDate } = req.query;

    if (!section || section === 'ALL') {
      return res.status(400).json({ success: false, message: 'Please select a specific section.' });
    }

    const reportData = await facultyAttendanceExportService.getSectionAttendanceReportData({
      facultyId,
      section,
      semester,
      academicYear,
      courseId,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    console.error('getSectionAttendanceMatrix error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to load attendance matrix.',
    });
  }
}

// =========================================================================
// OD & APPROVED LEAVE MANAGEMENT FOR FACULTY
// =========================================================================

async function getFacultyOdLeaveRequests(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    if (!facultyId) {
      return res.status(404).json({ success: false, message: 'Faculty profile not found.' });
    }

    const { status, type, section, search } = req.query;

    // Get sections assigned to faculty
    const assignments = await prisma.facultySubjectAssignment.findMany({
      where: { facultyId, status: 'ACTIVE' },
      select: { section: true },
    });
    const assignedSections = [...new Set(assignments.map((a) => a.section))];

    // Find students belonging to these sections or mentored/counseled
    const studentWhere = {
      OR: [
        { section: { in: assignedSections } },
        { mentorId: facultyId },
        { counselorAssignments: { some: { facultyId } } },
      ],
      status: 'ACTIVE',
      deletedAt: null,
    };

    const authorizedStudents = await prisma.student.findMany({
      where: studentWhere,
      select: { id: true },
    });
    const studentIds = authorizedStudents.map((s) => s.id);

    const requestWhere = {
      studentId: { in: studentIds },
    };

    if (status && status !== 'ALL') requestWhere.status = status;
    if (type && type !== 'ALL') requestWhere.requestType = type;
    if (section && section !== 'ALL') {
      requestWhere.student = { section: section.toUpperCase() };
    }
    if (search) {
      requestWhere.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { registrationNumber: { contains: search, mode: 'insensitive' } } },
        { eventName: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
      ];
    }

    const requests = await prisma.odLeaveRequest.findMany({
      where: requestWhere,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            section: true,
            department: { select: { name: true, code: true } },
          },
        },
        course: { select: { id: true, courseName: true, courseCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('getFacultyOdLeaveRequests error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch OD/Leave requests.' });
  }
}

async function reviewFacultyOdLeaveRequest(req, res) {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "APPROVE" or "REJECT".',
      });
    }

    if (action === 'REJECT' && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a request.',
      });
    }

    const request = await prisma.odLeaveRequest.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            section: true,
            departmentId: true,
            mentorId: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Authorization check
    const auth = await verifyReviewerAuthorization(req.user, request.studentId);
    if (!auth.authorized) {
      return res.status(403).json({ success: false, message: auth.reason });
    }

    const reviewerName = req.user.staffProfile?.name || req.user.identifier;
    const newStatus = action === 'APPROVE' ? OdLeaveStatus.APPROVED : OdLeaveStatus.REJECTED;

    const updated = await prisma.odLeaveRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedById: req.user.id,
        reviewedByName: reviewerName,
        reviewedByRole: 'FACULTY',
        rejectionReason: action === 'REJECT' ? rejectionReason.trim() : null,
      },
      include: { student: true, course: true },
    });

    // Notify Student
    await prisma.notification.create({
      data: {
        studentId: request.studentId,
        title: `${request.requestType === 'ON_DUTY' ? 'On-Duty' : 'Approved Leave'} Request ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
        message: action === 'APPROVE'
          ? `Your ${request.requestType === 'ON_DUTY' ? 'On-Duty' : 'Leave'} request for ${new Date(request.date).toISOString().split('T')[0]} has been APPROVED by ${reviewerName}.`
          : `Your request for ${new Date(request.date).toISOString().split('T')[0]} was REJECTED. Reason: ${rejectionReason.trim()}`,
        type: 'SYSTEM',
      },
    });

    // Immutable SystemAuditLog
    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'FACULTY',
        action: action === 'APPROVE' ? 'OD_LEAVE_REQUEST_APPROVED' : 'OD_LEAVE_REQUEST_REJECTED',
        targetType: 'OD_LEAVE_REQUEST',
        targetId: id,
        targetName: `${request.student.name} (${request.student.registrationNumber})`,
        details: JSON.stringify({
          requestId: id,
          requestType: request.requestType,
          date: request.date,
          periods: request.periods,
          action,
          reviewedBy: reviewerName,
          rejectionReason: action === 'REJECT' ? rejectionReason.trim() : null,
        }),
      },
    });

    // Calculate updated student attendance
    const updatedAttendance = await calculateStudentAttendanceWithExemptions(request.studentId);

    return res.status(200).json({
      success: true,
      message: `Request has been successfully ${action === 'APPROVE' ? 'approved' : 'rejected'}.`,
      data: {
        request: updated,
        updatedAttendance,
      },
    });
  } catch (error) {
    console.error('reviewFacultyOdLeaveRequest error:', error);
    return res.status(500).json({ success: false, message: 'Failed to review OD/Leave request.' });
  }
}

// =========================================================================
// 14. EXCEL ATTENDANCE UPLOAD & VALIDATION WORKFLOW
// =========================================================================
async function getAttendanceUploadTemplate(req, res) {
  try {
    const { departmentId, section, courseId, year, semester } = req.query;
    const buffer = await attendanceUploadService.generateTemplate({
      departmentId,
      section,
      courseId,
      year,
      semester,
    });

    const fileName = `Attendance_Template_${section || 'Sample'}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('getAttendanceUploadTemplate error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to generate attendance template.' });
  }
}

async function validateAttendanceUpload(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    if (!facultyId) {
      return res.status(403).json({ success: false, message: 'Faculty profile not found.' });
    }

    const { fileData, academicDetails } = req.body;
    if (!fileData) {
      return res.status(400).json({ success: false, message: 'No Excel file data uploaded.' });
    }
    if (!academicDetails) {
      return res.status(400).json({ success: false, message: 'Academic details are required.' });
    }

    const { departmentId, section, year, semester, courseId, date, period } = academicDetails;

    const result = await attendanceUploadService.validateUpload({
      fileData,
      facultyId,
      departmentId,
      section,
      year,
      semester,
      courseId,
      date,
      period,
      userId: req.user.id,
      userRole: req.user.role,
    });

    if (!result.isValid) {
      return res.status(422).json({
        success: false,
        data: result,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    console.error('validateAttendanceUpload error:', error);
    const status = error.message.includes('Forbidden')
      ? 403
      : error.message.includes('Invalid') || error.message.includes('required') || error.message.includes('Excel')
      ? 400
      : 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to validate uploaded attendance.' });
  }
}

async function confirmAttendanceUpload(req, res) {
  try {
    const facultyId = getFacultyStaffId(req);
    if (!facultyId) {
      return res.status(403).json({ success: false, message: 'Faculty profile not found.' });
    }

    const { academicDetails, validatedRecords } = req.body;
    if (!academicDetails || !Array.isArray(validatedRecords) || validatedRecords.length === 0) {
      return res.status(400).json({ success: false, message: 'Valid academic details and student records are required.' });
    }

    const { departmentId, section, year, semester, courseId, date, period } = academicDetails;

    const result = await attendanceUploadService.commitImport({
      facultyId,
      departmentId,
      section,
      year,
      semester,
      courseId,
      date,
      period,
      validatedRecords,
      userId: req.user.id,
      userRole: req.user.role,
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('confirmAttendanceUpload error:', error);
    const status = error.message.includes('Forbidden')
      ? 403
      : error.message.includes('already been recorded')
      ? 409
      : 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to import attendance.' });
  }
}

module.exports = {
  getDashboard,
  getClasses,
  getClassesFormMeta,
  getSectionStudents,
  markAttendance,
  getAttendanceHistory,
  getSessionAttendanceDetails,
  requestEditOtp,
  verifyEditOtp,
  submitAttendanceEdit,
  getAtRiskStudents,
  getPredictorData,
  getInterventions,
  createIntervention,
  updateIntervention,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getReports,
  exportSectionAttendanceExcel,
  getSectionAttendanceMatrix,
  searchStudents,
  getProfile,
  updateProfile,
  getFacultyOdLeaveRequests,
  reviewFacultyOdLeaveRequest,
  getAttendanceUploadTemplate,
  validateAttendanceUpload,
  confirmAttendanceUpload,
};
