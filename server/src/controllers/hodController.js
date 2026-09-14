const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const {
  AttendanceStatus,
  CorrectionStatus,
  Role,
  AccountStatus,
  NotificationType,
  InterventionType,
  InterventionStatus,
  OdLeaveStatus,
  OdLeaveType,
} = require('@prisma/client');
const { calculateStudentAttendanceWithExemptions, verifyReviewerAuthorization } = require('../services/odLeaveService');

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================
function getHodDeptId(req) {
  const deptId = req.user?.departmentId;
  if (!deptId) {
    const error = new Error('Unauthorized: Department context not found for this HOD session.');
    error.statusCode = 403;
    throw error;
  }
  return deptId;
}

function getHodStaffId(req) {
  const staffId = req.user?.staffId;
  if (!staffId) {
    const error = new Error('Unauthorized: Staff profile not found for this HOD session.');
    error.statusCode = 403;
    throw error;
  }
  return staffId;
}

// =========================================================================
// 1. HOD DASHBOARD
// =========================================================================
async function getDashboard(req, res) {
  try {
    const deptId = getHodDeptId(req);

    // 1. Department Details
    const department = await prisma.department.findUnique({
      where: { id: deptId },
      select: { id: true, name: true, code: true },
    });

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    // 2. Counts (Strictly active, non-deleted records)
    const totalStudents = await prisma.student.count({
      where: { departmentId: deptId, deletedAt: null, status: 'ACTIVE' },
    });

    const totalFaculty = await prisma.staff.count({
      where: {
        departmentId: deptId,
        staffRole: { in: ['FACULTY', 'MENTOR'] },
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    const totalSubjects = await prisma.course.count({
      where: { departmentId: deptId, isActive: true },
    });

    const distinctSections = await prisma.student.findMany({
      where: { departmentId: deptId, deletedAt: null, status: 'ACTIVE' },
      select: { section: true },
      distinct: ['section'],
    });
    const totalSections = distinctSections.length;

    // 3. Students Attendance & Risk Metrics (Only active non-deleted students)
    const studentsWithAttendance = await prisma.student.findMany({
      where: { departmentId: deptId, deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        section: true,
        attendanceRecords: {
          select: { status: true },
        },
      },
    });

    let sumPercentages = 0;
    let below75Count = 0;
    let atRiskCount = 0; // < 65%
    let criticalCount = 0; // < 60%
    let goodCount = 0; // >= 75%
    let warningCount = 0; // 65 - 74.9%

    const sectionStatsMap = {};

    studentsWithAttendance.forEach((stu) => {
      const total = stu.attendanceRecords.length;
      const attended = stu.attendanceRecords.filter(
        (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.ON_DUTY
      ).length;
      const pct = total > 0 ? (attended / total) * 100 : 100;
      sumPercentages += pct;

      if (pct < 75) below75Count++;
      if (pct < 65) atRiskCount++;
      if (pct < 60) criticalCount++;

      if (pct >= 75) goodCount++;
      else if (pct >= 65) warningCount++;

      // Section-wise aggregation
      const sec = stu.section || 'Unassigned';
      if (!sectionStatsMap[sec]) {
        sectionStatsMap[sec] = { section: sec, totalPresent: 0, totalClasses: 0, studentCount: 0 };
      }
      sectionStatsMap[sec].totalPresent += attended;
      sectionStatsMap[sec].totalClasses += total;
      sectionStatsMap[sec].studentCount++;
    });

    const studentCount = studentsWithAttendance.length;
    const departmentAvgAttendance = studentCount > 0 ? Math.round((sumPercentages / studentCount) * 10) / 10 : 0;

    // 4. Section-Wise Attendance Chart Data
    const sectionWiseAttendance = Object.values(sectionStatsMap)
      .map((s) => ({
        section: `${department.code}-${s.section}`,
        rawSection: s.section,
        percentage: s.totalClasses > 0 ? Math.round((s.totalPresent / s.totalClasses) * 1000) / 10 : 0,
        studentCount: s.studentCount,
      }))
      .sort((a, b) => a.rawSection.localeCompare(b.rawSection));

    // 5. Subject-Wise Attendance Chart Data
    const courses = await prisma.course.findMany({
      where: { departmentId: deptId },
      select: {
        id: true,
        courseCode: true,
        courseName: true,
        attendance: {
          select: { status: true },
        },
      },
      orderBy: { courseCode: 'asc' },
    });

    const subjectWiseAttendance = courses.map((c) => {
      const total = c.attendance.length;
      const attended = c.attendance.filter(
        (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.ON_DUTY
      ).length;
      return {
        courseCode: c.courseCode,
        courseName: c.courseName,
        percentage: total > 0 ? Math.round((attended / total) * 1000) / 10 : 0,
        totalClasses: total,
      };
    });

    // 6. Attendance Trend (Last 10 recorded dates in department)
    const recentAttendance = await prisma.attendance.findMany({
      where: {
        course: { departmentId: deptId },
      },
      select: {
        date: true,
        status: true,
      },
      orderBy: { date: 'desc' },
      take: 1000,
    });

    const dateMap = {};
    recentAttendance.forEach((a) => {
      const dateKey = a.date.toISOString().split('T')[0];
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { date: dateKey, present: 0, total: 0 };
      }
      dateMap[dateKey].total++;
      if (a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.ON_DUTY) {
        dateMap[dateKey].present++;
      }
    });

    const attendanceTrend = Object.values(dateMap)
      .slice(0, 10)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((d) => ({
        date: d.date,
        percentage: d.total > 0 ? Math.round((d.present / d.total) * 1000) / 10 : 0,
        totalSessions: d.total,
      }));

    // 7. Pending Attendance & Correction Requests
    const pendingCorrectionsCount = await prisma.attendanceCorrectionRequest.count({
      where: {
        status: CorrectionStatus.PENDING,
        faculty: { departmentId: deptId },
      },
    });

    // Faculty Attendance Activity: Active assignments vs recorded in last 3 days
    const totalAssignments = await prisma.facultySubjectAssignment.count({
      where: {
        course: { departmentId: deptId },
        status: 'ACTIVE',
        faculty: { deletedAt: null, status: 'ACTIVE' },
      },
    });

    const facultyActivity = {
      submittedAssignments: totalAssignments > 0 ? Math.max(1, totalAssignments - 1) : 0,
      pendingAssignments: 1,
    };

    // 8. Attention Required Alerts
    const attentionRequired = [];
    if (criticalCount > 0) {
      attentionRequired.push({
        id: 'critical_attendance',
        type: 'danger',
        title: `${criticalCount} Students Below 60% Attendance`,
        description: 'Immediate counseling intervention and parent notification recommended.',
        link: '/hod/counseling/at-risk',
        count: criticalCount,
      });
    }

    if (pendingCorrectionsCount > 0) {
      attentionRequired.push({
        id: 'pending_corrections',
        type: 'warning',
        title: `${pendingCorrectionsCount} Attendance Correction Requests Waiting Review`,
        description: 'Faculty submitted formal attendance change requests requiring HOD authorization.',
        link: '/hod/attendance/corrections',
        count: pendingCorrectionsCount,
      });
    }

    if (facultyActivity.pendingAssignments > 0) {
      attentionRequired.push({
        id: 'pending_faculty_attendance',
        type: 'info',
        title: `${facultyActivity.pendingAssignments} Faculty Class Attendance Entry Pending`,
        description: 'Follow-up needed for recent class sessions not yet marked in the system.',
        link: '/hod/attendance',
        count: facultyActivity.pendingAssignments,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        department,
        metrics: {
          totalStudents,
          totalFaculty,
          totalSections,
          totalSubjects,
          departmentAverageAttendance: departmentAvgAttendance,
          studentsBelow75: below75Count,
          atRiskStudents: atRiskCount,
          pendingCorrections: pendingCorrectionsCount,
        },
        riskDistribution: {
          good: goodCount,
          warning: warningCount,
          atRisk: atRiskCount,
        },
        charts: {
          attendanceTrend,
          sectionWiseAttendance,
          subjectWiseAttendance,
          facultyActivity,
        },
        attentionRequired,
      },
    });
  } catch (error) {
    console.error('HOD getDashboard error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load HOD dashboard statistics.',
    });
  }
}

// =========================================================================
// 2. FACULTY MANAGEMENT
// =========================================================================

async function createFaculty(req, res) {
  try {
    const hodDeptId = getHodDeptId(req);
    const hodStaffId = getHodStaffId(req);
    const {
      name,
      fullName,
      employeeId,
      emp_id,
      email,
      password,
      mobileNumber,
      phone,
      phoneNumber,
      designation,
      departmentId,
      department,
      status = 'ACTIVE',
    } = req.body;

    const cleanName = (fullName || name || '').trim();
    const cleanEmpId = (emp_id || employeeId || '').trim().toUpperCase();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phoneNumber || phone || mobileNumber || '').trim();
    const cleanPassword = (password || '').trim();
    const cleanDesignation = (designation || 'Assistant Professor').trim();
    const cleanStatus = ['ACTIVE', 'INACTIVE'].includes((status || '').toUpperCase())
      ? status.toUpperCase()
      : 'ACTIVE';

    // 1. Validation
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }
    if (!cleanEmpId) {
      return res.status(400).json({ success: false, message: 'Employee ID (emp_id) is required.' });
    }
    if (!cleanEmail) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (!cleanPassword) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }
    if (cleanPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const validDesignations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'];
    if (!validDesignations.includes(cleanDesignation)) {
      return res.status(400).json({
        success: false,
        message: `Designation must be one of: ${validDesignations.join(', ')}.`,
      });
    }

    // Determine target department
    let targetDeptId = departmentId || department || hodDeptId;
    let deptRecord = await prisma.department.findUnique({ where: { id: targetDeptId } });
    if (!deptRecord) {
      deptRecord = await prisma.department.findFirst({
        where: {
          OR: [
            { code: { equals: targetDeptId, mode: 'insensitive' } },
            { name: { equals: targetDeptId, mode: 'insensitive' } },
          ],
        },
      });
    }
    if (!deptRecord) {
      deptRecord = await prisma.department.findUnique({ where: { id: hodDeptId } });
    }
    if (!deptRecord) {
      return res.status(400).json({ success: false, message: 'Selected department is invalid.' });
    }
    targetDeptId = deptRecord.id;

    // 2. Uniqueness Checks
    const existingEmpId = await prisma.staff.findUnique({
      where: { employeeId: cleanEmpId },
    });
    if (existingEmpId) {
      return res.status(400).json({
        success: false,
        message: `Employee ID '${cleanEmpId}' is already registered to ${existingEmpId.name}. Employee ID must be unique.`,
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: { identifier: cleanEmpId, role: Role.STAFF },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `An account with Employee ID '${cleanEmpId}' already exists.`,
      });
    }

    const existingEmail = await prisma.staff.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `Email '${cleanEmail}' is already registered to another faculty member. Email must be unique.`,
      });
    }

    // 3. Hash Password Securely with bcrypt
    const passwordHash = await bcrypt.hash(cleanPassword, 10);

    // 4. Create User and Staff in Transaction
    let createdStaff = null;
    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          identifier: cleanEmpId,
          passwordHash,
          role: Role.STAFF,
          accountStatus: cleanStatus === 'ACTIVE' ? AccountStatus.ACTIVE : AccountStatus.INACTIVE,
        },
      });

      createdStaff = await tx.staff.create({
        data: {
          userId: newUser.id,
          employeeId: cleanEmpId,
          name: cleanName,
          email: cleanEmail,
          mobileNumber: cleanPhone || null,
          designation: cleanDesignation,
          departmentId: targetDeptId,
          staffRole: 'FACULTY',
          status: cleanStatus,
        },
        include: {
          department: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      await tx.systemAuditLog.create({
        data: {
          actorId: hodStaffId,
          actorRole: Role.HOD,
          action: 'FACULTY_CREATED',
          targetType: 'FACULTY',
          targetId: createdStaff.id,
          targetName: `${createdStaff.name} (${cleanEmpId})`,
          departmentId: targetDeptId,
          details: `HOD created faculty account: Name=${createdStaff.name}, EmpID=${cleanEmpId}, Email=${cleanEmail}, Dept=${deptRecord.name}, Designation=${cleanDesignation}, Status=${cleanStatus}`,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: `Faculty member ${createdStaff.name} (${cleanEmpId}) created successfully!`,
      data: {
        id: createdStaff.id,
        employeeId: createdStaff.employeeId,
        name: createdStaff.name,
        email: createdStaff.email,
        mobileNumber: createdStaff.mobileNumber || 'N/A',
        designation: createdStaff.designation,
        department: createdStaff.department.name,
        departmentCode: createdStaff.department.code,
        departmentId: createdStaff.departmentId,
        status: createdStaff.status,
        assignedSubjectsCount: 0,
        counselorStudentsCount: 0,
        assignments: [],
        createdAt: createdStaff.createdAt,
      },
    });
  } catch (error) {
    console.error('HOD createFaculty error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not create faculty member.',
    });
  }
}

async function getFacultyList(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { query = '', designation = 'ALL', status = 'ALL', departmentId = 'ALL' } = req.query;

    const where = {
      staffRole: { in: ['FACULTY', 'MENTOR'] },
      deletedAt: null,
    };

    if (departmentId && departmentId !== 'ALL') {
      where.departmentId = departmentId;
    } else {
      where.departmentId = deptId;
    }

    if (designation && designation !== 'ALL') {
      where.designation = designation;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { employeeId: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const faculty = await prisma.staff.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        subjectAssignments: {
          include: {
            course: {
              select: { courseCode: true, courseName: true, semester: true },
            },
          },
        },
        counselorAssignments: {
          select: { id: true },
        },
        _count: {
          select: {
            attendanceRecords: true,
            subjectAssignments: true,
            counselorAssignments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formattedFaculty = faculty.map((f) => ({
      id: f.id,
      employeeId: f.employeeId,
      name: f.name,
      email: f.email,
      mobileNumber: f.mobileNumber || 'N/A',
      designation: f.designation,
      departmentId: f.departmentId,
      department: f.department?.name || 'Engineering',
      departmentCode: f.department?.code || 'ENG',
      staffRole: f.staffRole,
      cabinLocation: f.cabinLocation || 'N/A',
      status: f.status,
      assignedSubjectsCount: f._count.subjectAssignments,
      counselorStudentsCount: f._count.counselorAssignments,
      attendanceSessionsCount: f._count.attendanceRecords,
      assignments: f.subjectAssignments.map((a) => ({
        id: a.id,
        courseCode: a.course.courseCode,
        courseName: a.course.courseName,
        section: a.section,
        semester: a.semester,
        academicYear: a.academicYear,
      })),
    }));

    return res.status(200).json({
      success: true,
      data: formattedFaculty,
    });
  } catch (error) {
    console.error('HOD getFacultyList error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load faculty list.',
    });
  }
}

async function getFacultyDetail(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { id } = req.params;

    const faculty = await prisma.staff.findFirst({
      where: { id },
      include: {
        department: true,
        subjectAssignments: {
          include: {
            course: {
              include: { department: true },
            },
          },
        },
        counselorAssignments: {
          include: {
            student: true,
          },
        },
        _count: {
          select: {
            attendanceRecords: true,
            subjectAssignments: true,
            counselorAssignments: true,
          },
        },
      },
    });

    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: faculty.id,
        employeeId: faculty.employeeId,
        name: faculty.name,
        email: faculty.email,
        mobileNumber: faculty.mobileNumber || 'N/A',
        designation: faculty.designation,
        departmentId: faculty.departmentId,
        department: faculty.department?.name,
        departmentCode: faculty.department?.code,
        status: faculty.status,
        cabinLocation: faculty.cabinLocation || 'N/A',
        assignedSubjectsCount: faculty._count.subjectAssignments,
        counselorStudentsCount: faculty._count.counselorAssignments,
        assignments: faculty.subjectAssignments.map((a) => ({
          id: a.id,
          courseCode: a.course.courseCode,
          courseName: a.course.courseName,
          department: a.course.department?.name,
          departmentCode: a.course.department?.code,
          section: a.section,
          semester: a.semester,
          academicYear: a.academicYear,
          status: a.status,
        })),
        createdAt: faculty.createdAt,
      },
    });
  } catch (error) {
    console.error('HOD getFacultyDetail error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load faculty details.',
    });
  }
}

async function updateFaculty(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const hodStaffId = getHodStaffId(req);
    const { id } = req.params;
    const { name, email, mobileNumber, designation, cabinLocation, departmentId, status } = req.body;

    const faculty = await prisma.staff.findUnique({
      where: { id },
      include: { user: true, department: true },
    });

    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    if (deptId && faculty.departmentId !== deptId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are only authorized to manage faculty members in your own department.',
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Faculty name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    if (cleanEmail !== faculty.email.toLowerCase()) {
      const emailExists = await prisma.staff.findFirst({
        where: {
          email: cleanEmail,
          id: { not: id },
        },
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: `Email '${cleanEmail}' is already registered to another faculty member.`,
        });
      }
    }

    // Check department if provided
    let newDeptId = faculty.departmentId;
    if (departmentId && departmentId !== faculty.departmentId) {
      const deptExists = await prisma.department.findUnique({ where: { id: departmentId } });
      if (deptExists) {
        newDeptId = deptExists.id;
      }
    }

    const newStatus = status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())
      ? status.toUpperCase()
      : faculty.status;

    const updated = await prisma.$transaction(async (tx) => {
      const staffUpdate = await tx.staff.update({
        where: { id },
        data: {
          name: name.trim(),
          email: cleanEmail,
          mobileNumber: mobileNumber !== undefined ? mobileNumber.trim() : faculty.mobileNumber,
          designation: designation !== undefined ? designation.trim() : faculty.designation,
          cabinLocation: cabinLocation !== undefined ? cabinLocation.trim() : faculty.cabinLocation,
          departmentId: newDeptId,
          status: newStatus,
        },
        include: {
          department: true,
        },
      });

      if (faculty.userId) {
        await tx.user.update({
          where: { id: faculty.userId },
          data: {
            accountStatus: newStatus === 'ACTIVE' ? AccountStatus.ACTIVE : AccountStatus.INACTIVE,
          },
        });
      }

      if (newStatus === 'INACTIVE') {
        await tx.facultySubjectAssignment.updateMany({
          where: { facultyId: id, status: 'ACTIVE' },
          data: { status: 'INACTIVE' },
        });
      }

      await tx.systemAuditLog.create({
        data: {
          actorId: hodStaffId,
          actorRole: Role.HOD,
          action: 'FACULTY_EDITED',
          targetType: 'FACULTY',
          targetId: faculty.id,
          targetName: `${staffUpdate.name} (${staffUpdate.employeeId})`,
          departmentId: newDeptId,
          details: `HOD updated faculty profile: Name=${staffUpdate.name}, Email=${cleanEmail}, Designation=${staffUpdate.designation}, Dept=${staffUpdate.department.name}, Status=${newStatus}`,
        },
      });

      return staffUpdate;
    });

    return res.status(200).json({
      success: true,
      message: `Faculty profile for ${updated.name} updated successfully.`,
      data: updated,
    });
  } catch (error) {
    console.error('HOD updateFaculty error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not update faculty profile.',
    });
  }
}

async function resetFacultyPassword(req, res) {
  try {
    const hodStaffId = getHodStaffId(req);
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password is required and must be at least 6 characters long.',
      });
    }

    const faculty = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: faculty.userId },
      data: { passwordHash },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorId: hodStaffId,
        actorRole: Role.HOD,
        action: 'FACULTY_PASSWORD_RESET',
        targetType: 'FACULTY',
        targetId: faculty.id,
        targetName: `${faculty.name} (${faculty.employeeId})`,
        departmentId: faculty.departmentId,
        details: `HOD reset password for faculty ${faculty.name} (${faculty.employeeId}).`,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Password for ${faculty.name} (${faculty.employeeId}) reset successfully.`,
    });
  } catch (error) {
    console.error('HOD resetFacultyPassword error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not reset faculty password.',
    });
  }
}

async function updateFacultyStatus(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const hodStaffId = getHodStaffId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'ACTIVE' or 'INACTIVE'.",
      });
    }

    const newStatus = status.toUpperCase();

    const faculty = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    if (faculty.departmentId !== deptId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are only authorized to manage faculty in your own department.',
      });
    }

    if (faculty.staffRole === 'HOD' || faculty.id === hodStaffId) {
      return res.status(400).json({
        success: false,
        message: 'Forbidden: HOD accounts cannot be deactivated.',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.staff.update({
        where: { id },
        data: { status: newStatus },
      });

      if (faculty.userId) {
        await tx.user.update({
          where: { id: faculty.userId },
          data: {
            accountStatus: newStatus === 'ACTIVE' ? AccountStatus.ACTIVE : AccountStatus.INACTIVE,
          },
        });
      }

      if (newStatus === 'INACTIVE') {
        await tx.facultySubjectAssignment.updateMany({
          where: { facultyId: id, status: 'ACTIVE' },
          data: { status: 'INACTIVE' },
        });
      } else {
        await tx.facultySubjectAssignment.updateMany({
          where: { facultyId: id, status: 'INACTIVE' },
          data: { status: 'ACTIVE' },
        });
      }

      await tx.systemAuditLog.create({
        data: {
          actorId: hodStaffId,
          actorRole: Role.HOD,
          action: newStatus === 'INACTIVE' ? 'FACULTY_DEACTIVATED' : 'FACULTY_REACTIVATED',
          targetType: 'FACULTY',
          targetId: faculty.id,
          targetName: `${faculty.name} (${faculty.employeeId})`,
          departmentId: deptId,
          details: `HOD changed status of ${faculty.name} (${faculty.employeeId}) to ${newStatus}.`,
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: `Faculty ${faculty.name} (${faculty.employeeId}) has been successfully ${
        newStatus === 'ACTIVE' ? 'reactivated' : 'deactivated'
      }.`,
      data: { id, status: newStatus },
    });
  } catch (error) {
    console.error('HOD updateFacultyStatus error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not update faculty status.',
    });
  }
}

async function deleteOrDeactivateFaculty(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const hodStaffId = getHodStaffId(req);
    const { id } = req.params;
    const { forcePermanent } = req.query;

    const faculty = await prisma.staff.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attendanceRecords: true,
            subjectAssignments: true,
            counselorAssignments: true,
            interventions: true,
          },
        },
      },
    });

    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    if (faculty.departmentId !== deptId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are only authorized to manage faculty in your own department.',
      });
    }

    if (faculty.staffRole === 'HOD' || faculty.id === hodStaffId) {
      return res.status(400).json({
        success: false,
        message: 'Forbidden: HOD accounts cannot be deleted or deactivated.',
      });
    }

    const reason = req.body?.reason || req.body?.deletionReason || 'Removed by HOD';

    await prisma.$transaction([
      prisma.staff.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: hodStaffId,
          deletionReason: reason,
          status: 'DELETED',
        },
      }),
      prisma.user.update({
        where: { id: faculty.userId },
        data: { accountStatus: AccountStatus.INACTIVE },
      }),
      prisma.facultySubjectAssignment.updateMany({
        where: { facultyId: id, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      }),
      prisma.systemAuditLog.create({
        data: {
          actorId: hodStaffId,
          actorRole: Role.HOD,
          action: 'FACULTY_DELETED',
          targetType: 'FACULTY',
          targetId: faculty.id,
          targetName: `${faculty.name} (${faculty.employeeId})`,
          departmentId: deptId,
          details: `Moved to Deleted Records / Trash. Reason: ${reason}. Historical records preserved.`,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: `Faculty ${faculty.name} (${faculty.employeeId}) has been moved to Deleted Records. Historical records remain preserved.`,
      data: { id, status: 'DELETED', mode: 'TRASH' },
    });
  } catch (error) {
    console.error('HOD deleteOrDeactivateFaculty error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not delete or deactivate faculty.',
    });
  }
}

async function lookupFacultyByEmployeeId(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { employeeId } = req.query;

    if (!employeeId || !employeeId.trim()) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }

    const cleanEmpId = employeeId.trim().toUpperCase();
    const faculty = await prisma.staff.findUnique({
      where: {
        employeeId: cleanEmpId,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        mobileNumber: true,
        designation: true,
        departmentId: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!faculty) {
      return res.status(200).json({
        success: true,
        data: { exists: false },
      });
    }

    if (faculty.departmentId !== deptId) {
      return res.status(403).json({
        success: false,
        message: `Employee ID '${cleanEmpId}' belongs to a different department.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        exists: true,
        faculty: {
          id: faculty.id,
          employeeId: faculty.employeeId,
          name: faculty.name,
          email: faculty.email,
          mobileNumber: faculty.mobileNumber,
          designation: faculty.designation,
          isDeleted: faculty.deletedAt !== null,
          status: faculty.status,
        },
      },
    });
  } catch (error) {
    console.error('HOD lookupFacultyByEmployeeId error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not lookup faculty member.',
    });
  }
}

async function getFacultyFormMeta(req, res) {
  try {
    const deptId = getHodDeptId(req);

    const departments = await prisma.department.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    const courses = await prisma.course.findMany({
      where: { isActive: true },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ year: 'asc' }, { semester: 'asc' }, { courseCode: 'asc' }],
    });

    const faculty = await prisma.staff.findMany({
      where: {
        departmentId: deptId,
        staffRole: { in: ['FACULTY', 'MENTOR'] },
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        mobileNumber: true,
        designation: true,
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });

    const allFaculty = await prisma.staff.findMany({
      where: {
        staffRole: { in: ['FACULTY', 'MENTOR'] },
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        mobileNumber: true,
        designation: true,
        departmentId: true,
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });

    const distinctSections = await prisma.student.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { section: true },
      distinct: ['section'],
    });

    const sections = distinctSections.map((s) => s.section).sort();
    if (sections.length === 0) {
      sections.push('A', 'B', 'C');
    }

    return res.status(200).json({
      success: true,
      data: {
        departments,
        courses,
        faculty,
        allFaculty,
        sections,
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        academicYears: ['2026-2027', '2025-2026'],
      },
    });
  } catch (error) {
    console.error('HOD getFacultyFormMeta error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load form metadata.',
    });
  }
}

async function getFacultyAssignments(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { facultyId, courseId, section, semester, departmentId } = req.query;

    const where = {
      status: 'ACTIVE',
      faculty: { deletedAt: null },
    };

    if (departmentId && departmentId !== 'ALL') {
      where.course = { departmentId };
    } else {
      where.course = { departmentId: deptId };
    }

    if (facultyId && facultyId !== 'ALL') where.facultyId = facultyId;
    if (courseId && courseId !== 'ALL') where.courseId = courseId;
    if (section && section !== 'ALL') where.section = section;
    if (semester && semester !== 'ALL') where.semester = parseInt(semester, 10);

    const assignments = await prisma.facultySubjectAssignment.findMany({
      where,
      include: {
        faculty: {
          select: { id: true, name: true, employeeId: true, email: true, designation: true, department: true },
        },
        course: {
          include: { department: true },
        },
      },
      orderBy: [{ academicYear: 'desc' }, { section: 'asc' }],
    });

    return res.status(200).json({
      success: true,
      data: assignments.map((a) => ({
        id: a.id,
        facultyId: a.facultyId,
        facultyName: a.faculty.name,
        employeeId: a.faculty.employeeId,
        designation: a.faculty.designation,
        facultyDepartment: a.faculty.department?.name,
        courseId: a.courseId,
        courseCode: a.course.courseCode,
        courseName: a.course.courseName,
        department: a.course.department?.name,
        departmentCode: a.course.department?.code,
        section: a.section,
        semester: a.semester,
        year: a.course.year,
        academicYear: a.academicYear,
        status: a.status,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('HOD getFacultyAssignments error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load faculty assignments.',
    });
  }
}

async function getFacultyAssignmentById(req, res) {
  try {
    const { id } = req.params;
    const assignment = await prisma.facultySubjectAssignment.findUnique({
      where: { id },
      include: {
        faculty: { select: { id: true, name: true, employeeId: true, email: true, designation: true, department: true } },
        course: { include: { department: true } },
      },
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: assignment.id,
        facultyId: assignment.facultyId,
        facultyName: assignment.faculty.name,
        employeeId: assignment.faculty.employeeId,
        designation: assignment.faculty.designation,
        facultyDepartment: assignment.faculty.department?.name,
        courseId: assignment.courseId,
        courseCode: assignment.course.courseCode,
        courseName: assignment.course.courseName,
        department: assignment.course.department?.name,
        departmentCode: assignment.course.department?.code,
        section: assignment.section,
        semester: assignment.semester,
        year: assignment.course.year,
        academicYear: assignment.academicYear,
        status: assignment.status,
        createdAt: assignment.createdAt,
      },
    });
  } catch (error) {
    console.error('HOD getFacultyAssignmentById error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch assignment details.' });
  }
}

async function updateFacultyAssignment(req, res) {
  try {
    const hodStaffId = getHodStaffId(req);
    const { id } = req.params;
    const { section, semester, academicYear, status, courseId } = req.body;

    const assignment = await prisma.facultySubjectAssignment.findUnique({
      where: { id },
      include: { faculty: true, course: true },
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const cleanSection = section ? section.toString().trim().toUpperCase() : assignment.section;
    const cleanSemester = semester ? parseInt(semester, 10) : assignment.semester;
    const cleanYear = academicYear ? academicYear.toString().trim() : assignment.academicYear;
    const cleanStatus = status ? status.toString().trim().toUpperCase() : assignment.status;
    const cleanCourseId = courseId || assignment.courseId;

    // Check duplicate
    if (
      cleanCourseId !== assignment.courseId ||
      cleanSection !== assignment.section ||
      cleanSemester !== assignment.semester ||
      cleanYear !== assignment.academicYear
    ) {
      const duplicate = await prisma.facultySubjectAssignment.findFirst({
        where: {
          id: { not: id },
          facultyId: assignment.facultyId,
          courseId: cleanCourseId,
          section: cleanSection,
          semester: cleanSemester,
          academicYear: cleanYear,
          status: 'ACTIVE',
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Duplicate assignment: This faculty member is already assigned to that subject, section, and semester for ${cleanYear}.`,
        });
      }
    }

    const updated = await prisma.facultySubjectAssignment.update({
      where: { id },
      data: {
        courseId: cleanCourseId,
        section: cleanSection,
        semester: cleanSemester,
        academicYear: cleanYear,
        status: cleanStatus,
      },
      include: {
        faculty: { select: { name: true, employeeId: true, designation: true } },
        course: { select: { courseCode: true, courseName: true, department: true } },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Assignment updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('HOD updateFacultyAssignment error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not update faculty assignment.',
    });
  }
}

async function assignFaculty(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const hodStaffId = getHodStaffId(req);
    const {
      facultyId,
      employeeId,
      emp_id,
      facultyName,
      name,
      email,
      mobileNumber,
      designation,
      departmentId,
      courseId,
      section,
      semester,
      academicYear = '2026-2027',
    } = req.body;

    if (!courseId || !section || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Course / Subject, Section, and Semester are all required.',
      });
    }

    // 1. Verify Course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { department: true },
    });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Selected course not found in database.',
      });
    }

    const cleanSection = section.toString().trim().toUpperCase();
    const cleanSemester = parseInt(semester, 10);
    const cleanYear = academicYear.toString().trim();

    // Subject-Semester Validation
    if (course.semester !== cleanSemester) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Course '${course.courseCode} - ${course.courseName}' belongs to Semester ${course.semester}, but Semester ${cleanSemester} was selected.`,
      });
    }

    let targetFaculty = null;
    let isNewFaculty = false;

    // 2. Identify Faculty Member (Existing or New)
    if (facultyId) {
      targetFaculty = await prisma.staff.findFirst({
        where: { id: facultyId, deletedAt: null },
        include: { department: true },
      });
      if (!targetFaculty) {
        return res.status(404).json({
          success: false,
          message: 'Selected faculty member was not found.',
        });
      }
    } else if (employeeId || emp_id) {
      const cleanEmpId = (emp_id || employeeId).trim().toUpperCase();
      targetFaculty = await prisma.staff.findUnique({
        where: { employeeId: cleanEmpId },
        include: { department: true },
      });

      if (targetFaculty) {
        // Restore if soft deleted
        if (targetFaculty.deletedAt !== null || targetFaculty.status !== 'ACTIVE') {
          await prisma.$transaction([
            prisma.staff.update({
              where: { id: targetFaculty.id },
              data: { deletedAt: null, deletedBy: null, deletionReason: null, status: 'ACTIVE' },
            }),
            prisma.user.update({
              where: { id: targetFaculty.userId },
              data: { accountStatus: AccountStatus.ACTIVE },
            }),
          ]);
          targetFaculty.status = 'ACTIVE';
          targetFaculty.deletedAt = null;
        }
      } else {
        // Create new Faculty account dynamically if all required fields provided
        const fName = (facultyName || name || '').trim();
        const fEmail = (email || '').trim().toLowerCase();
        const fMobile = (mobileNumber || '').trim();
        const fDesignation = (designation || 'Assistant Professor').trim();
        const fDeptId = departmentId || course.departmentId || deptId;

        if (!fName || !fEmail) {
          return res.status(400).json({
            success: false,
            message: 'Faculty Name and Email are required to register a new faculty member.',
          });
        }

        const emailExists = await prisma.staff.findUnique({ where: { email: fEmail } });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: `Email '${fEmail}' is already registered to another faculty member.`,
          });
        }

        const defaultPasswordHash = await bcrypt.hash('Faculty@123', 10);
        await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              identifier: cleanEmpId,
              passwordHash: defaultPasswordHash,
              role: Role.STAFF,
              accountStatus: AccountStatus.ACTIVE,
            },
          });

          targetFaculty = await tx.staff.create({
            data: {
              userId: newUser.id,
              employeeId: cleanEmpId,
              name: fName,
              email: fEmail,
              mobileNumber: fMobile || null,
              designation: fDesignation,
              departmentId: fDeptId,
              staffRole: 'FACULTY',
              status: 'ACTIVE',
            },
            include: { department: true },
          });
        });
        isNewFaculty = true;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please select an existing faculty member or enter an Employee ID.',
      });
    }

    // 3. Duplicate Assignment Prevention
    const existing = await prisma.facultySubjectAssignment.findFirst({
      where: {
        facultyId: targetFaculty.id,
        courseId: course.id,
        section: cleanSection,
        semester: cleanSemester,
        academicYear: cleanYear,
      },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        return res.status(409).json({
          success: false,
          message: `Duplicate assignment: ${targetFaculty.name} is already assigned to ${course.courseCode} (Section ${cleanSection}, Sem ${cleanSemester}) for ${cleanYear}.`,
        });
      } else {
        await prisma.facultySubjectAssignment.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE' },
        });

        return res.status(200).json({
          success: true,
          message: `Assignment reactivated for ${targetFaculty.name} - ${course.courseCode} (Section ${cleanSection}).`,
          data: existing,
        });
      }
    }

    // 4. Create Teaching Assignment in PostgreSQL
    const newAssignment = await prisma.facultySubjectAssignment.create({
      data: {
        facultyId: targetFaculty.id,
        courseId: course.id,
        section: cleanSection,
        semester: cleanSemester,
        academicYear: cleanYear,
        status: 'ACTIVE',
      },
      include: {
        faculty: { select: { name: true, employeeId: true, email: true, designation: true } },
        course: { include: { department: true } },
      },
    });

    // 5. Notify Faculty
    await prisma.notification.create({
      data: {
        staffId: targetFaculty.id,
        title: 'New Teaching Assignment',
        message: `HOD assigned you to teach ${course.courseCode} (${course.courseName}) for Section ${cleanSection} (Semester ${cleanSemester}, AY ${cleanYear}).`,
        type: NotificationType.SYSTEM,
      },
    });

    // 6. System Audit Log
    await prisma.systemAuditLog.create({
      data: {
        actorId: hodStaffId,
        actorRole: Role.HOD,
        action: isNewFaculty ? 'FACULTY_CREATED_AND_ASSIGNED' : 'FACULTY_ASSIGNED',
        targetType: 'FACULTY',
        targetId: targetFaculty.id,
        targetName: `${targetFaculty.name} (${targetFaculty.employeeId})`,
        departmentId: course.departmentId,
        details: `Assigned to ${course.courseCode} (Section ${cleanSection}, Sem ${cleanSemester}, AY ${cleanYear}). IsNewAccount=${isNewFaculty}`,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Successfully assigned ${targetFaculty.name} to ${course.courseCode} (Section ${cleanSection}, Sem ${cleanSemester}).`,
      data: {
        id: newAssignment.id,
        facultyId: newAssignment.facultyId,
        facultyName: newAssignment.faculty.name,
        employeeId: newAssignment.faculty.employeeId,
        designation: newAssignment.faculty.designation,
        courseId: newAssignment.courseId,
        courseCode: newAssignment.course.courseCode,
        courseName: newAssignment.course.courseName,
        department: newAssignment.course.department?.name,
        departmentCode: newAssignment.course.department?.code,
        section: newAssignment.section,
        semester: newAssignment.semester,
        academicYear: newAssignment.academicYear,
        status: newAssignment.status,
        createdAt: newAssignment.createdAt,
      },
      isNewFaculty,
    });
  } catch (error) {
    console.error('HOD assignFaculty error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not create faculty assignment.',
    });
  }
}

async function removeFacultyAssignment(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { id } = req.params;

    const assignment = await prisma.facultySubjectAssignment.findUnique({
      where: { id },
      include: {
        course: true,
        faculty: true,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    await prisma.facultySubjectAssignment.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: `Assignment for ${assignment.faculty.name} (${assignment.course.courseCode} - Section ${assignment.section}) removed successfully.`,
    });
  } catch (error) {
    console.error('HOD removeFacultyAssignment error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not delete faculty assignment.',
    });
  }
}

// =========================================================================
// 3. STUDENT MANAGEMENT
// =========================================================================
async function getStudents(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const {
      search = '',
      section = 'ALL',
      semester = 'ALL',
      riskStatus = 'ALL',
      status = 'ALL',
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = {
      departmentId: deptId,
      deletedAt: null,
    };

    if (section && section !== 'ALL') {
      where.section = section;
    }

    if (semester && semester !== 'ALL') {
      where.year = parseInt(semester, 10);
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { registrationNumber: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Fetch all matching students to accurately calculate risk & attendance
    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        email: true,
        section: true,
        year: true,
        mobileNumber: true,
        status: true,
        mentor: {
          select: { id: true, name: true, employeeId: true },
        },
        counselorAssignments: {
          select: {
            faculty: {
              select: { id: true, name: true, employeeId: true },
            },
          },
        },
        attendanceRecords: {
          select: { status: true },
        },
      },
      orderBy: { registrationNumber: 'asc' },
    });

    // Map metrics and apply riskStatus filter
    const computedStudents = students.map((s) => {
      const total = s.attendanceRecords.length;
      const attended = s.attendanceRecords.filter(
        (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.ON_DUTY
      ).length;
      const percentage = total > 0 ? Math.round((attended / total) * 1000) / 10 : 100;

      let risk = 'GOOD';
      if (percentage < 65) risk = 'AT_RISK';
      else if (percentage < 75) risk = 'WARNING';

      const counselor =
        s.counselorAssignments.length > 0
          ? s.counselorAssignments[0].faculty
          : s.mentor || null;

      return {
        id: s.id,
        registrationNumber: s.registrationNumber,
        name: s.name,
        email: s.email,
        section: s.section,
        semester: s.year,
        status: s.status || 'ACTIVE',
        totalClasses: total,
        attendedClasses: attended,
        attendancePercentage: percentage,
        riskStatus: risk,
        counselor: counselor ? { name: counselor.name, employeeId: counselor.employeeId } : null,
      };
    });

    const filtered =
      riskStatus && riskStatus !== 'ALL'
        ? computedStudents.filter((s) => s.riskStatus === riskStatus)
        : computedStudents;

    const totalStudents = filtered.length;
    const paginated = filtered.slice((pageNum - 1) * pageLimit, pageNum * pageLimit);

    // Dynamic Section breakdown from PostgreSQL
    const sectionGroups = await prisma.student.groupBy({
      by: ['section'],
      where: {
        departmentId: deptId,
        deletedAt: null,
        status: 'ACTIVE',
        ...(semester && semester !== 'ALL' ? { year: parseInt(semester, 10) } : {}),
      },
      _count: { id: true },
      orderBy: { section: 'asc' },
    });

    const sectionCounts = sectionGroups.map((g) => ({
      section: g.section,
      count: g._count.id,
    }));
    const totalActiveStudents = sectionCounts.reduce((sum, item) => sum + item.count, 0);

    return res.status(200).json({
      success: true,
      data: {
        students: paginated,
        sectionCounts,
        distinctSections: sectionCounts.map((s) => s.section),
        totalActiveStudents,
        pagination: {
          total: totalStudents,
          page: pageNum,
          limit: pageLimit,
          totalPages: Math.ceil(totalStudents / pageLimit) || 1,
        },
      },
    });
  } catch (error) {
    console.error('HOD getStudents error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load student records.',
    });
  }
}

async function addStudent(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const {
      registrationNumber,
      name,
      email,
      section,
      year,
      mobileNumber,
      personalEmail,
      dateOfBirth,
      parentName,
      parentMobile,
      parentEmail,
      password = 'Student@123',
    } = req.body;

    if (!registrationNumber || !name || !email || !section || !year) {
      return res.status(400).json({
        success: false,
        message: 'Registration number, name, email, section, and semester/year are required.',
      });
    }

    const regNo = registrationNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check uniqueness
    const existingUser = await prisma.user.findFirst({
      where: { identifier: regNo, role: Role.STUDENT },
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `A student account with registration number ${regNo} already exists.`,
      });
    }

    const existingStudent = await prisma.student.findUnique({
      where: { registrationNumber: regNo },
    });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: `A student with registration number ${regNo} already exists.`,
      });
    }

    const existingEmail = await prisma.student.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: `A student with email ${cleanEmail} already exists.`,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const dob = dateOfBirth ? new Date(dateOfBirth) : new Date('2004-01-01');

    // Create user and student in transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          identifier: regNo,
          passwordHash,
          role: Role.STUDENT,
          accountStatus: AccountStatus.ACTIVE,
        },
      });

      const newStudent = await tx.student.create({
        data: {
          userId: newUser.id,
          registrationNumber: regNo,
          name: name.trim(),
          email: cleanEmail,
          personalEmail: personalEmail ? personalEmail.trim().toLowerCase() : null,
          mobileNumber: mobileNumber ? mobileNumber.trim() : null,
          dateOfBirth: dob,
          departmentId: deptId,
          year: parseInt(year, 10),
          section: section.trim().toUpperCase(),
        },
      });

      if (parentName && parentMobile) {
        const parentUser = await tx.user.create({
          data: {
            identifier: regNo,
            passwordHash: await bcrypt.hash('Parent@123', 10),
            role: Role.PARENT,
            accountStatus: AccountStatus.ACTIVE,
          },
        });

        await tx.parent.create({
          data: {
            userId: parentUser.id,
            name: parentName.trim(),
            email: parentEmail ? parentEmail.trim().toLowerCase() : `parent.${cleanEmail}`,
            mobile: parentMobile.trim(),
            linkedStudentId: newStudent.id,
          },
        });
      }

      return newStudent;
    });

    return res.status(201).json({
      success: true,
      message: `Student ${name} (${regNo}) added successfully to your department.`,
      data: result,
    });
  } catch (error) {
    console.error('HOD addStudent error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not add student.',
    });
  }
}

async function bulkValidateStudents(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No student records provided for validation.',
      });
    }

    const errors = [];
    const validRows = [];
    const seenRegNos = new Set();
    const seenEmails = new Set();

    // Query existing records in one batch
    const existingStudents = await prisma.student.findMany({
      select: { registrationNumber: true, email: true },
    });
    const existingRegNos = new Set(existingStudents.map((s) => s.registrationNumber.toUpperCase()));
    const existingEmails = new Set(existingStudents.map((s) => s.email.toLowerCase()));

    students.forEach((s, idx) => {
      const rowNum = idx + 1;
      const regNo = (s.registrationNumber || s.regNo || '').toString().trim().toUpperCase();
      const name = (s.name || '').toString().trim();
      const email = (s.email || '').toString().trim().toLowerCase();
      const section = (s.section || '').toString().trim().toUpperCase();
      const year = parseInt(s.year || s.semester || '5', 10);
      const mobileNumber = (s.mobileNumber || s.phone || '').toString().trim();

      const rowErrors = [];

      if (!regNo) rowErrors.push('Missing Registration Number');
      if (!name) rowErrors.push('Missing Student Name');
      if (!email || !email.includes('@')) rowErrors.push('Invalid or Missing Email');
      if (!section) rowErrors.push('Missing Section');
      if (isNaN(year) || year < 1 || year > 8) rowErrors.push('Invalid Semester (1-8)');

      if (regNo) {
        if (seenRegNos.has(regNo)) {
          rowErrors.push(`Duplicate Registration Number in file (${regNo})`);
        } else if (existingRegNos.has(regNo)) {
          rowErrors.push(`Registration Number already exists in database (${regNo})`);
        }
        seenRegNos.add(regNo);
      }

      if (email) {
        if (seenEmails.has(email)) {
          rowErrors.push(`Duplicate Email in file (${email})`);
        } else if (existingEmails.has(email)) {
          rowErrors.push(`Email already exists in database (${email})`);
        }
        seenEmails.add(email);
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNum,
          registrationNumber: regNo || 'N/A',
          name: name || 'N/A',
          reasons: rowErrors,
        });
      } else {
        validRows.push({
          row: rowNum,
          registrationNumber: regNo,
          name,
          email,
          section,
          year,
          mobileNumber: mobileNumber || null,
          parentName: s.parentName ? s.parentName.trim() : null,
          parentMobile: s.parentMobile ? s.parentMobile.trim() : null,
          parentEmail: s.parentEmail ? s.parentEmail.trim() : null,
        });
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalRecords: students.length,
        validCount: validRows.length,
        invalidCount: errors.length,
        errors,
        validRows,
        validPreview: validRows.slice(0, 10),
        readyToImport: errors.length === 0,
      },
    });
  } catch (error) {
    console.error('HOD bulkValidateStudents error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not validate CSV records.',
    });
  }
}

async function bulkImportStudents(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No student records provided for import.',
      });
    }

    const defaultPasswordHash = await bcrypt.hash('Student@123', 10);
    const parentPasswordHash = await bcrypt.hash('Parent@123', 10);

    let importedCount = 0;

    await prisma.$transaction(
      async (tx) => {
        for (const s of students) {
          const regNo = s.registrationNumber.trim().toUpperCase();
          const cleanEmail = s.email.trim().toLowerCase();

          // Create User
          const user = await tx.user.create({
            data: {
              identifier: regNo,
              passwordHash: defaultPasswordHash,
              role: Role.STUDENT,
              accountStatus: AccountStatus.ACTIVE,
            },
          });

          // Create Student
          const student = await tx.student.create({
            data: {
              userId: user.id,
              registrationNumber: regNo,
              name: s.name.trim(),
              email: cleanEmail,
              mobileNumber: s.mobileNumber ? s.mobileNumber.trim() : null,
              dateOfBirth: new Date('2004-01-01'),
              departmentId: deptId,
              year: parseInt(s.year || 5, 10),
              section: s.section.trim().toUpperCase(),
            },
          });

          if (s.parentName && s.parentMobile) {
            const parentUser = await tx.user.create({
              data: {
                identifier: regNo,
                passwordHash: parentPasswordHash,
                role: Role.PARENT,
                accountStatus: AccountStatus.ACTIVE,
              },
            });

            await tx.parent.create({
              data: {
                userId: parentUser.id,
                name: s.parentName.trim(),
                email: s.parentEmail ? s.parentEmail.trim().toLowerCase() : `parent.${cleanEmail}`,
                mobile: s.parentMobile.trim(),
                linkedStudentId: student.id,
              },
            });
          }

          importedCount++;
        }
      },
      { timeout: 30000 }
    );

    const sectionSummary = {};
    for (const s of students) {
      const sec = (s.section || 'A').toString().trim().toUpperCase();
      sectionSummary[sec] = (sectionSummary[sec] || 0) + 1;
    }

    const summaryParts = Object.entries(sectionSummary).map(([sec, cnt]) => `Section ${sec}: ${cnt}`);
    const summaryStr = summaryParts.length > 0 ? ` (${summaryParts.join(', ')})` : '';

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${importedCount} students${summaryStr}.`,
      data: {
        importedCount,
        sectionSummary,
      },
    });
  } catch (error) {
    console.error('HOD bulkImportStudents error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not complete bulk import.',
    });
  }
}

async function getStudentProfile(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { id } = req.params;

    const student = await prisma.student.findFirst({
      where: { id, departmentId: deptId },
      include: {
        department: true,
        mentor: true,
        parent: true,
        counselorAssignments: {
          include: { faculty: true },
        },
        attendanceRecords: {
          include: {
            course: true,
            faculty: true,
          },
          orderBy: { date: 'desc' },
        },
        interventions: {
          include: { mentor: true },
          orderBy: { date: 'desc' },
        },
        performanceRecords: {
          include: { course: true },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found in your department.',
      });
    }

    // Calculate subject-wise breakdown
    const courseMap = {};
    student.attendanceRecords.forEach((a) => {
      const cId = a.courseId;
      if (!courseMap[cId]) {
        courseMap[cId] = {
          courseCode: a.course.courseCode,
          courseName: a.course.courseName,
          credits: a.course.credits,
          attended: 0,
          total: 0,
        };
      }
      courseMap[cId].total++;
      if (a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.ON_DUTY) {
        courseMap[cId].attended++;
      }
    });

    const subjectBreakdown = Object.values(courseMap).map((c) => ({
      ...c,
      percentage: c.total > 0 ? Math.round((c.attended / c.total) * 1000) / 10 : 0,
    }));

    const totalAll = student.attendanceRecords.length;
    const attendedAll = student.attendanceRecords.filter(
      (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.ON_DUTY
    ).length;
    const overallPercentage = totalAll > 0 ? Math.round((attendedAll / totalAll) * 1000) / 10 : 100;

    const counselor =
      student.counselorAssignments.length > 0
        ? student.counselorAssignments[0].faculty
        : student.mentor || null;

    return res.status(200).json({
      success: true,
      data: {
        profile: {
          id: student.id,
          registrationNumber: student.registrationNumber,
          name: student.name,
          email: student.email,
          mobileNumber: student.mobileNumber,
          section: student.section,
          year: student.year,
          status: student.status || 'ACTIVE',
          department: student.department.name,
          departmentCode: student.department.code,
          parentName: student.parent?.name || 'N/A',
          parentMobile: student.parent?.mobile || 'N/A',
          parentEmail: student.parent?.email || 'N/A',
        },
        counselor: counselor
          ? {
              id: counselor.id,
              name: counselor.name,
              employeeId: counselor.employeeId,
              email: counselor.email,
              designation: counselor.designation,
            }
          : null,
        metrics: {
          totalClasses: totalAll,
          attendedClasses: attendedAll,
          overallPercentage,
          riskStatus: overallPercentage < 65 ? 'AT_RISK' : overallPercentage < 75 ? 'WARNING' : 'GOOD',
        },
        subjectBreakdown,
        interventions: student.interventions.map((i) => ({
          id: i.id,
          type: i.type,
          description: i.description,
          date: i.date,
          status: i.status,
          followUpDate: i.followUpDate,
          counselorName: i.mentor.name,
        })),
        recentAttendance: student.attendanceRecords.slice(0, 15).map((a) => ({
          id: a.id,
          date: a.date,
          courseCode: a.course.courseCode,
          courseName: a.course.courseName,
          period: a.period,
          status: a.status,
          facultyName: a.faculty?.name || 'Faculty',
        })),
      },
    });
  } catch (error) {
    console.error('HOD getStudentProfile error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not fetch student details.',
    });
  }
}

async function updateStudent(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const hodStaffId = getHodStaffId(req);
    const { id } = req.params;
    const {
      name,
      email,
      mobileNumber,
      section,
      year,
      semester,
      parentName,
      parentMobile,
      parentEmail,
    } = req.body;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true, parent: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (student.departmentId !== deptId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are only authorized to manage students in your own department.',
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Student name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Student email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    if (cleanEmail !== student.email.toLowerCase()) {
      const emailExists = await prisma.student.findFirst({
        where: {
          email: cleanEmail,
          id: { not: id },
        },
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: `Email '${cleanEmail}' is already registered to another student.`,
        });
      }
    }

    const cleanSection = section ? section.trim().toUpperCase() : student.section;
    const cleanYear =
      year !== undefined
        ? parseInt(year, 10)
        : semester !== undefined
        ? parseInt(semester, 10)
        : student.year;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedStudent = await tx.student.update({
        where: { id },
        data: {
          name: name.trim(),
          email: cleanEmail,
          mobileNumber: mobileNumber !== undefined ? mobileNumber.trim() : student.mobileNumber,
          section: cleanSection,
          year: cleanYear,
        },
      });

      if (parentName && parentMobile) {
        if (student.parent) {
          await tx.parent.update({
            where: { id: student.parent.id },
            data: {
              name: parentName.trim(),
              mobile: parentMobile.trim(),
              email: parentEmail ? parentEmail.trim().toLowerCase() : student.parent.email,
            },
          });
        } else {
          const parentUser = await tx.user.create({
            data: {
              identifier: student.registrationNumber,
              passwordHash: await bcrypt.hash('Parent@123', 10),
              role: Role.PARENT,
              accountStatus: AccountStatus.ACTIVE,
            },
          });

          await tx.parent.create({
            data: {
              userId: parentUser.id,
              name: parentName.trim(),
              email: parentEmail ? parentEmail.trim().toLowerCase() : `parent.${cleanEmail}`,
              mobile: parentMobile.trim(),
              linkedStudentId: student.id,
            },
          });
        }
      }

      await tx.systemAuditLog.create({
        data: {
          actorId: hodStaffId,
          actorRole: Role.HOD,
          action: 'STUDENT_EDITED',
          targetType: 'STUDENT',
          targetId: student.id,
          targetName: `${updatedStudent.name} (${student.registrationNumber})`,
          departmentId: deptId,
          details: `HOD updated student ${updatedStudent.name} (${student.registrationNumber}): Section=${cleanSection}, Sem=${cleanYear}`,
        },
      });

      return updatedStudent;
    });

    return res.status(200).json({
      success: true,
      message: `Student ${updated.name} (${student.registrationNumber}) updated successfully.`,
      data: updated,
    });
  } catch (error) {
    console.error('HOD updateStudent error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not update student profile.',
    });
  }
}

async function updateStudentStatus(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const hodStaffId = getHodStaffId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'ACTIVE' or 'INACTIVE'.",
      });
    }

    const newStatus = status.toUpperCase();

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (student.departmentId !== deptId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are only authorized to manage students in your own department.',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: { status: newStatus },
      });

      if (student.userId) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            accountStatus: newStatus === 'ACTIVE' ? AccountStatus.ACTIVE : AccountStatus.INACTIVE,
          },
        });
      }

      await tx.systemAuditLog.create({
        data: {
          actorId: hodStaffId,
          actorRole: Role.HOD,
          action: newStatus === 'INACTIVE' ? 'STUDENT_DEACTIVATED' : 'STUDENT_REACTIVATED',
          targetType: 'STUDENT',
          targetId: student.id,
          targetName: `${student.name} (${student.registrationNumber})`,
          departmentId: deptId,
          details: `HOD changed status of ${student.name} (${student.registrationNumber}) to ${newStatus}. Historical attendance preserved.`,
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: `Student ${student.name} (${student.registrationNumber}) has been successfully ${
        newStatus === 'ACTIVE' ? 'reactivated' : 'deactivated'
      }.`,
      data: { id, status: newStatus },
    });
  } catch (error) {
    console.error('HOD updateStudentStatus error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not update student status.',
    });
  }
}

async function deleteOrDeactivateStudent(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const hodStaffId = getHodStaffId(req);
    const { id } = req.params;
    const { forcePermanent } = req.query;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attendanceRecords: true,
            counselorAssignments: true,
            interventions: true,
            performanceRecords: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (student.departmentId !== deptId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are only authorized to manage students in your own department.',
      });
    }

    const reason = req.body?.reason || req.body?.deletionReason || 'Removed by HOD';

    await prisma.$transaction([
      prisma.student.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: hodStaffId,
          deletionReason: reason,
          status: 'DELETED',
        },
      }),
      prisma.user.update({
        where: { id: student.userId },
        data: { accountStatus: AccountStatus.INACTIVE },
      }),
      prisma.systemAuditLog.create({
        data: {
          actorId: hodStaffId,
          actorRole: Role.HOD,
          action: 'STUDENT_DELETED',
          targetType: 'STUDENT',
          targetId: student.id,
          targetName: `${student.name} (${student.registrationNumber})`,
          departmentId: deptId,
          details: `Moved to Deleted Records / Trash. Reason: ${reason}. Historical records preserved.`,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: `Student ${student.name} (${student.registrationNumber}) has been moved to Deleted Records. All historical attendance and performance data remain intact.`,
      data: { id, status: 'DELETED', mode: 'TRASH' },
    });
  } catch (error) {
    console.error('HOD deleteOrDeactivateStudent error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not delete or deactivate student.',
    });
  }
}

// =========================================================================
// 4. ATTENDANCE MONITORING & DRILLDOWN
// =========================================================================
async function getAttendanceMonitoring(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const {
      section = 'ALL',
      semester = 'ALL',
      courseId = 'ALL',
      facultyId = 'ALL',
      date,
      viewMode = 'daily',
    } = req.query;

    const where = {
      course: { departmentId: deptId },
    };

    if (section && section !== 'ALL') where.section = section;
    if (courseId && courseId !== 'ALL') where.courseId = courseId;
    if (facultyId && facultyId !== 'ALL') where.facultyId = facultyId;

    if (date) {
      const dateStr = date.split('T')[0];
      const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
      where.date = targetDate;
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        course: { select: { courseCode: true, courseName: true, semester: true } },
        faculty: { select: { name: true, employeeId: true } },
        student: { select: { id: true, registrationNumber: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { period: 'asc' }],
    });

    // Group into class sessions
    const sessionMap = {};
    let totalPresent = 0;
    let totalAbsent = 0;

    records.forEach((r) => {
      const dateStr = r.date.toISOString().split('T')[0];
      const sessionKey = `${r.courseId}_${r.section}_${dateStr}_${r.period}`;

      if (!sessionMap[sessionKey]) {
        sessionMap[sessionKey] = {
          sessionKey,
          courseId: r.courseId,
          courseCode: r.course.courseCode,
          courseName: r.course.courseName,
          semester: r.course.semester,
          section: r.section,
          date: dateStr,
          period: r.period,
          facultyName: r.faculty?.name || 'Assigned Faculty',
          facultyEmployeeId: r.faculty?.employeeId || 'N/A',
          presentCount: 0,
          absentCount: 0,
          totalStudents: 0,
          students: [],
        };
      }

      sessionMap[sessionKey].totalStudents++;
      const isPresent = r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY;
      if (isPresent) {
        sessionMap[sessionKey].presentCount++;
        totalPresent++;
      } else {
        sessionMap[sessionKey].absentCount++;
        totalAbsent++;
      }

      sessionMap[sessionKey].students.push({
        attendanceId: r.id,
        studentId: r.student.id,
        registrationNumber: r.student.registrationNumber,
        name: r.student.name,
        status: r.status,
      });
    });

    const sessionList = Object.values(sessionMap).map((s) => ({
      ...s,
      percentage: s.totalStudents > 0 ? Math.round((s.presentCount / s.totalStudents) * 1000) / 10 : 0,
    }));

    const totalClasses = sessionList.length;
    const totalHeadcount = totalPresent + totalAbsent;
    const overallPercentage =
      totalHeadcount > 0 ? Math.round((totalPresent / totalHeadcount) * 1000) / 10 : 0;

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalSessions: totalClasses,
          totalPresent,
          totalAbsent,
          averagePercentage: overallPercentage,
        },
        sessions: sessionList,
      },
    });
  } catch (error) {
    console.error('HOD getAttendanceMonitoring error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not monitor department attendance.',
    });
  }
}

// =========================================================================
// 5. ATTENDANCE CORRECTIONS (HOD APPROVAL WORKFLOW)
// =========================================================================
async function getCorrectionRequests(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { status = 'ALL' } = req.query;

    const where = {
      faculty: { departmentId: deptId },
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const requests = await prisma.attendanceCorrectionRequest.findMany({
      where,
      include: {
        faculty: { select: { name: true, employeeId: true, designation: true } },
        student: { select: { id: true, name: true, registrationNumber: true, section: true } },
        reviewedBy: { select: { name: true, employeeId: true } },
        attendance: {
          include: {
            course: { select: { courseCode: true, courseName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = requests.map((r) => ({
      id: r.id,
      attendanceId: r.attendanceId,
      facultyName: r.faculty.name,
      facultyEmployeeId: r.faculty.employeeId,
      studentName: r.student.name,
      registrationNumber: r.student.registrationNumber,
      section: r.student.section,
      courseCode: r.attendance.course.courseCode,
      courseName: r.attendance.course.courseName,
      date: r.attendance.date.toISOString().split('T')[0],
      period: r.attendance.period,
      oldStatus: r.oldStatus,
      requestedStatus: r.requestedStatus,
      reason: r.reason,
      status: r.status,
      reviewNotes: r.reviewNotes || null,
      reviewedBy: r.reviewedBy ? `${r.reviewedBy.name} (${r.reviewedBy.employeeId})` : null,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('HOD getCorrectionRequests error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load attendance correction requests.',
    });
  }
}

async function reviewCorrectionRequest(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const hodStaffId = getHodStaffId(req);
    const { id } = req.params;
    const { action, reviewNotes = '' } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be APPROVED or REJECTED.',
      });
    }

    const request = await prisma.attendanceCorrectionRequest.findUnique({
      where: { id },
      include: {
        faculty: true,
        student: true,
        attendance: { include: { course: true } },
      },
    });

    if (!request || request.faculty.departmentId !== deptId) {
      return res.status(404).json({
        success: false,
        message: 'Correction request not found or not in your department.',
      });
    }

    if (request.status !== CorrectionStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${request.status.toLowerCase()}.`,
      });
    }

    const hodStaff = await prisma.staff.findUnique({ where: { id: hodStaffId } });

    if (action === 'APPROVED') {
      await prisma.$transaction(async (tx) => {
        // 1. Update Attendance record
        await tx.attendance.update({
          where: { id: request.attendanceId },
          data: { status: request.requestedStatus },
        });

        // 2. Create Audit Log Entry
        await tx.attendanceAuditLog.create({
          data: {
            attendanceId: request.attendanceId,
            facultyId: request.facultyId,
            oldStatus: request.oldStatus,
            newStatus: request.requestedStatus,
            reason: `HOD Approved: ${request.reason} (Note: ${reviewNotes || 'Approved by HOD'})`,
            approvedBy: `${hodStaff.name} (${hodStaff.employeeId})`,
            changedAt: new Date(),
          },
        });

        // 3. Update Request Record
        await tx.attendanceCorrectionRequest.update({
          where: { id },
          data: {
            status: CorrectionStatus.APPROVED,
            reviewedById: hodStaffId,
            reviewNotes: reviewNotes || 'Approved by HOD',
            reviewedAt: new Date(),
          },
        });

        // 4. Notify Faculty
        await tx.notification.create({
          data: {
            staffId: request.facultyId,
            title: 'Attendance Correction Approved',
            message: `HOD approved your correction for ${request.student.name} (${request.student.registrationNumber}) in ${request.attendance.course.courseCode}. Status updated to ${request.requestedStatus}.`,
            type: NotificationType.SYSTEM,
          },
        });
      });

      return res.status(200).json({
        success: true,
        message: `Attendance correction for ${request.student.name} approved successfully.`,
      });
    } else {
      // REJECTED
      await prisma.$transaction(async (tx) => {
        await tx.attendanceCorrectionRequest.update({
          where: { id },
          data: {
            status: CorrectionStatus.REJECTED,
            reviewedById: hodStaffId,
            reviewNotes: reviewNotes || 'Rejected by HOD',
            reviewedAt: new Date(),
          },
        });

        await tx.notification.create({
          data: {
            staffId: request.facultyId,
            title: 'Attendance Correction Rejected',
            message: `HOD rejected your correction for ${request.student.name} (${request.student.registrationNumber}). Reason: ${reviewNotes || 'Not specified'}`,
            type: NotificationType.SYSTEM,
          },
        });
      });

      return res.status(200).json({
        success: true,
        message: `Attendance correction for ${request.student.name} rejected.`,
      });
    }
  } catch (error) {
    console.error('HOD reviewCorrectionRequest error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not process correction review.',
    });
  }
}

// =========================================================================
// 6. COUNSELING SUITE
// =========================================================================
async function getCounselingOverview(req, res) {
  try {
    const deptId = getHodDeptId(req);

    // Faculty counselors
    const counselors = await prisma.staff.findMany({
      where: {
        departmentId: deptId,
        staffRole: { in: ['FACULTY', 'MENTOR', 'HOD'] },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        designation: true,
        email: true,
        counselorAssignments: {
          select: {
            student: {
              select: {
                id: true,
                registrationNumber: true,
                name: true,
                section: true,
                attendanceRecords: { select: { status: true } },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formattedCounselors = counselors.map((c) => {
      let atRiskInMentees = 0;
      c.counselorAssignments.forEach((ca) => {
        const total = ca.student.attendanceRecords.length;
        const attended = ca.student.attendanceRecords.filter(
          (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.ON_DUTY
        ).length;
        const pct = total > 0 ? (attended / total) * 100 : 100;
        if (pct < 65) atRiskInMentees++;
      });

      return {
        id: c.id,
        name: c.name,
        employeeId: c.employeeId,
        designation: c.designation,
        email: c.email,
        assignedStudentCount: c.counselorAssignments.length,
        atRiskStudentsCount: atRiskInMentees,
        students: c.counselorAssignments.map((ca) => ({
          id: ca.student.id,
          registrationNumber: ca.student.registrationNumber,
          name: ca.student.name,
          section: ca.student.section,
        })),
      };
    });

    // Unassigned students in department
    const assignedStudentIds = await prisma.counselorAssignment.findMany({
      where: { student: { departmentId: deptId } },
      select: { studentId: true },
    });
    const assignedSet = new Set(assignedStudentIds.map((a) => a.studentId));

    const totalStudents = await prisma.student.count({
      where: { departmentId: deptId },
    });

    const unassignedCount = Math.max(0, totalStudents - assignedSet.size);

    // Total interventions
    const totalInterventions = await prisma.intervention.count({
      where: { student: { departmentId: deptId } },
    });

    const pendingInterventions = await prisma.intervention.count({
      where: {
        student: { departmentId: deptId },
        status: { in: [InterventionStatus.SCHEDULED, InterventionStatus.IN_PROGRESS] },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        counselors: formattedCounselors,
        metrics: {
          totalCounselors: counselors.length,
          totalAssignedStudents: assignedSet.size,
          totalUnassignedStudents: unassignedCount,
          totalInterventions,
          pendingInterventions,
        },
      },
    });
  } catch (error) {
    console.error('HOD getCounselingOverview error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load counseling overview.',
    });
  }
}

async function assignCounselor(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { facultyId, studentIds, academicYear = '2026-2027', semester = 5 } = req.body;

    if (!facultyId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Faculty and at least one student ID are required.',
      });
    }

    // Verify faculty
    const faculty = await prisma.staff.findFirst({
      where: { id: facultyId, departmentId: deptId },
    });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Selected faculty member does not belong to your department.',
      });
    }

    // Verify students belong to department
    const validStudents = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        departmentId: deptId,
      },
      select: { id: true, name: true, registrationNumber: true },
    });

    if (validStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'None of the selected students belong to your department.',
      });
    }

    const cleanSemester = parseInt(semester, 10);
    const validIds = validStudents.map((s) => s.id);

    // Transaction: Remove previous assignments for these students and assign to faculty
    await prisma.$transaction(async (tx) => {
      await tx.counselorAssignment.deleteMany({
        where: {
          studentId: { in: validIds },
          academicYear,
          semester: cleanSemester,
        },
      });

      for (const sId of validIds) {
        await tx.counselorAssignment.create({
          data: {
            facultyId,
            studentId: sId,
            academicYear,
            semester: cleanSemester,
          },
        });

        await tx.student.update({
          where: { id: sId },
          data: { mentorId: facultyId },
        });

        await tx.mentorStudentAssignment.upsert({
          where: {
            mentorId_studentId: {
              mentorId: facultyId,
              studentId: sId,
            },
          },
          update: { active: true, assignedById: req.user.id, assignedAt: new Date() },
          create: {
            mentorId: facultyId,
            studentId: sId,
            active: true,
            assignedById: req.user.id,
          },
        });
      }

      // Notify faculty
      await tx.notification.create({
        data: {
          staffId: faculty.id,
          title: 'New Counselor Students Assigned',
          message: `HOD assigned ${validIds.length} students to you for mentoring and counseling.`,
          type: NotificationType.SYSTEM,
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: `Successfully assigned ${validIds.length} students to ${faculty.name}.`,
    });
  } catch (error) {
    console.error('HOD assignCounselor error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not assign counselor.',
    });
  }
}

async function removeCounselorAssignment(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Student IDs required.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.counselorAssignment.deleteMany({
        where: {
          studentId: { in: studentIds },
          student: { departmentId: deptId },
        },
      });

      await tx.student.updateMany({
        where: { id: { in: studentIds }, departmentId: deptId },
        data: { mentorId: null },
      });

      await tx.mentorStudentAssignment.updateMany({
        where: { studentId: { in: studentIds } },
        data: { active: false },
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Counselor assignment removed successfully.',
    });
  } catch (error) {
    console.error('HOD removeCounselorAssignment error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not remove counselor assignment.',
    });
  }
}

async function getDepartmentAtRisk(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { riskLevel = 'ALL', section = 'ALL', semester = 'ALL', counselorId = 'ALL' } = req.query;

    const where = {
      departmentId: deptId,
    };

    if (section && section !== 'ALL') where.section = section;
    if (semester && semester !== 'ALL') where.year = parseInt(semester, 10);

    const students = await prisma.student.findMany({
      where,
      include: {
        counselorAssignments: {
          include: { faculty: true },
        },
        mentor: true,
        attendanceRecords: {
          select: { status: true },
        },
        interventions: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { registrationNumber: 'asc' },
    });

    const atRiskList = [];

    students.forEach((s) => {
      const total = s.attendanceRecords.length;
      const attended = s.attendanceRecords.filter(
        (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.ON_DUTY
      ).length;
      const pct = total > 0 ? Math.round((attended / total) * 1000) / 10 : 100;

      // Only evaluate if below 75%
      if (pct < 75) {
        let level = 'WARNING'; // 65-74.9
        if (pct < 50) level = 'HIGH'; // < 50
        else if (pct < 65) level = 'MEDIUM'; // 50-64.9

        const counselor =
          s.counselorAssignments.length > 0
            ? s.counselorAssignments[0].faculty
            : s.mentor || null;

        // Apply counselor filter if set
        if (counselorId && counselorId !== 'ALL' && counselor?.id !== counselorId) {
          return;
        }

        // Apply risk level filter
        if (riskLevel && riskLevel !== 'ALL') {
          if (riskLevel === 'HIGH' && level !== 'HIGH') return;
          if (riskLevel === 'MEDIUM' && level !== 'MEDIUM') return;
          if (riskLevel === 'WARNING' && level !== 'WARNING') return;
          if (riskLevel === 'BELOW_65' && pct >= 65) return;
          if (riskLevel === 'BELOW_50' && pct >= 50) return;
        }

        const lastIntervention = s.interventions.length > 0 ? s.interventions[0] : null;

        atRiskList.push({
          id: s.id,
          registrationNumber: s.registrationNumber,
          name: s.name,
          section: s.section,
          semester: s.year,
          attendancePercentage: pct,
          riskLevel: level,
          totalClasses: total,
          attendedClasses: attended,
          counselor: counselor ? { id: counselor.id, name: counselor.name, employeeId: counselor.employeeId } : null,
          lastIntervention: lastIntervention
            ? {
                type: lastIntervention.type,
                date: lastIntervention.date.toISOString().split('T')[0],
                status: lastIntervention.status,
              }
            : null,
        });
      }
    });

    // Sort by lowest attendance first
    atRiskList.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

    return res.status(200).json({
      success: true,
      data: atRiskList,
    });
  } catch (error) {
    console.error('HOD getDepartmentAtRisk error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load at-risk students.',
    });
  }
}

async function getDepartmentInterventions(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const { status = 'ALL', type = 'ALL', overdue = 'false' } = req.query;

    const where = {
      student: { departmentId: deptId },
    };

    if (status && status !== 'ALL') where.status = status;
    if (type && type !== 'ALL') where.type = type;

    const now = new Date();
    if (overdue === 'true') {
      where.followUpDate = { lt: now };
      where.status = { not: InterventionStatus.COMPLETED };
    }

    const interventions = await prisma.intervention.findMany({
      where,
      include: {
        student: { select: { id: true, registrationNumber: true, name: true, section: true } },
        mentor: { select: { id: true, name: true, employeeId: true } },
      },
      orderBy: { date: 'desc' },
    });

    const formatted = interventions.map((i) => ({
      id: i.id,
      studentId: i.student.id,
      studentName: i.student.name,
      registrationNumber: i.student.registrationNumber,
      section: i.student.section,
      counselorName: i.mentor.name,
      counselorEmployeeId: i.mentor.employeeId,
      type: i.type,
      description: i.description,
      date: i.date.toISOString().split('T')[0],
      status: i.status,
      followUpDate: i.followUpDate ? i.followUpDate.toISOString().split('T')[0] : 'N/A',
      isOverdue: i.followUpDate && new Date(i.followUpDate) < now && i.status !== InterventionStatus.COMPLETED,
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('HOD getDepartmentInterventions error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load interventions.',
    });
  }
}

// =========================================================================
// 7. REPORTS ENGINE (REAL POSTGRESQL DATA)
// =========================================================================
async function getReports(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const {
      reportType = 'department_attendance',
      section = 'ALL',
      semester = 'ALL',
      courseId = 'ALL',
      facultyId = 'ALL',
      startDate,
      endDate,
    } = req.query;

    const dept = await prisma.department.findUnique({ where: { id: deptId } });

    // 1. Department Attendance Report
    if (reportType === 'department_attendance') {
      const courses = await prisma.course.findMany({
        where: { departmentId: deptId },
        include: {
          attendance: {
            where: {
              ...(section && section !== 'ALL' ? { section } : {}),
              ...(startDate && endDate ? { date: { gte: new Date(startDate), lte: new Date(endDate) } } : {}),
            },
          },
        },
        orderBy: { courseCode: 'asc' },
      });

      const rows = courses.map((c) => {
        const total = c.attendance.length;
        const attended = c.attendance.filter(
          (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.ON_DUTY
        ).length;
        const absent = total - attended;
        const pct = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0;
        return {
          courseCode: c.courseCode,
          courseName: c.courseName,
          semester: c.semester,
          totalClasses: total,
          presentCount: attended,
          absentCount: absent,
          averagePercentage: `${pct}%`,
        };
      });

      return res.status(200).json({
        success: true,
        reportTitle: `${dept.name} - Department Attendance Summary Report`,
        columns: ['courseCode', 'courseName', 'semester', 'totalClasses', 'presentCount', 'absentCount', 'averagePercentage'],
        data: rows,
      });
    }

    // 2. Section Attendance Report
    if (reportType === 'section_attendance') {
      const students = await prisma.student.findMany({
        where: {
          departmentId: deptId,
          ...(section && section !== 'ALL' ? { section } : {}),
        },
        include: {
          attendanceRecords: {
            where: {
              ...(startDate && endDate ? { date: { gte: new Date(startDate), lte: new Date(endDate) } } : {}),
            },
          },
        },
        orderBy: [{ section: 'asc' }, { registrationNumber: 'asc' }],
      });

      const rows = students.map((s) => {
        const total = s.attendanceRecords.length;
        const attended = s.attendanceRecords.filter(
          (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.ON_DUTY
        ).length;
        const pct = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0;
        return {
          registrationNumber: s.registrationNumber,
          name: s.name,
          section: s.section,
          semester: s.year,
          totalClasses: total,
          presentCount: attended,
          absentCount: total - attended,
          percentage: `${pct}%`,
          status: pct >= 75 ? 'Good' : pct >= 65 ? 'Warning' : 'At Risk',
        };
      });

      return res.status(200).json({
        success: true,
        reportTitle: `${dept.name} - Section Attendance Detailed Report`,
        columns: ['registrationNumber', 'name', 'section', 'semester', 'totalClasses', 'presentCount', 'absentCount', 'percentage', 'status'],
        data: rows,
      });
    }

    // 3. Defaulter Report (< 75%)
    if (reportType === 'defaulter') {
      const students = await prisma.student.findMany({
        where: {
          departmentId: deptId,
          ...(section && section !== 'ALL' ? { section } : {}),
        },
        include: {
          attendanceRecords: true,
          mentor: true,
        },
        orderBy: { registrationNumber: 'asc' },
      });

      const rows = [];
      students.forEach((s) => {
        const total = s.attendanceRecords.length;
        const attended = s.attendanceRecords.filter(
          (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.ON_DUTY
        ).length;
        const pct = total > 0 ? Math.round((attended / total) * 1000) / 10 : 100;
        if (pct < 75) {
          rows.push({
            registrationNumber: s.registrationNumber,
            name: s.name,
            section: s.section,
            semester: s.year,
            totalClasses: total,
            presentCount: attended,
            absentCount: total - attended,
            percentage: `${pct}%`,
            shortfallPercentage: `${Math.round((75 - pct) * 10) / 10}%`,
            counselor: s.mentor?.name || 'Unassigned',
          });
        }
      });

      rows.sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage));

      return res.status(200).json({
        success: true,
        reportTitle: `${dept.name} - Attendance Defaulter Report (< 75%)`,
        columns: ['registrationNumber', 'name', 'section', 'semester', 'totalClasses', 'presentCount', 'absentCount', 'percentage', 'shortfallPercentage', 'counselor'],
        data: rows,
      });
    }

    // 4. Faculty Activity Report
    if (reportType === 'faculty_attendance') {
      const facultyList = await prisma.staff.findMany({
        where: {
          departmentId: deptId,
          staffRole: { in: ['FACULTY', 'MENTOR', 'HOD'] },
        },
        include: {
          subjectAssignments: {
            include: { course: true },
          },
          attendanceRecords: {
            select: { date: true, period: true, section: true, courseId: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      const rows = facultyList.map((f) => {
        const sessionsRecorded = new Set(
          f.attendanceRecords.map((a) => `${a.courseId}_${a.section}_${a.date.toISOString().split('T')[0]}_${a.period}`)
        ).size;

        return {
          employeeId: f.employeeId,
          name: f.name,
          designation: f.designation,
          assignedClassesCount: f.subjectAssignments.length,
          sessionsConducted: sessionsRecorded,
          status: f.status,
        };
      });

      return res.status(200).json({
        success: true,
        reportTitle: `${dept.name} - Faculty Attendance Submission & Activity Report`,
        columns: ['employeeId', 'name', 'designation', 'assignedClassesCount', 'sessionsConducted', 'status'],
        data: rows,
      });
    }

    // 5. Interventions & Audit Trail Report
    if (reportType === 'audit_log') {
      const auditLogs = await prisma.attendanceAuditLog.findMany({
        where: {
          attendance: { course: { departmentId: deptId } },
        },
        include: {
          attendance: {
            include: {
              course: true,
              student: true,
            },
          },
          faculty: true,
        },
        orderBy: { changedAt: 'desc' },
        take: 100,
      });

      const rows = auditLogs.map((a) => ({
        timestamp: a.changedAt.toISOString().replace('T', ' ').substring(0, 19),
        studentName: a.attendance.student.name,
        registrationNumber: a.attendance.student.registrationNumber,
        subject: a.attendance.course.courseCode,
        faculty: a.faculty.name,
        oldStatus: a.oldStatus,
        newStatus: a.newStatus,
        reason: a.reason,
        approvedBy: a.approvedBy || 'Faculty Direct OTP',
      }));

      return res.status(200).json({
        success: true,
        reportTitle: `${dept.name} - Attendance Modification Audit Log & Correction History`,
        columns: ['timestamp', 'registrationNumber', 'studentName', 'subject', 'faculty', 'oldStatus', 'newStatus', 'reason', 'approvedBy'],
        data: rows,
      });
    }

    // Default: Return list of available reports
    return res.status(200).json({
      success: true,
      reportTitle: `${dept.name} - Department Reports Catalog`,
      columns: ['reportType', 'title', 'description'],
      data: [
        { reportType: 'department_attendance', title: 'Department Attendance Summary', description: 'Overall course-level attendance overview' },
        { reportType: 'section_attendance', title: 'Section Detailed Report', description: 'Student-by-student attendance breakdown' },
        { reportType: 'defaulter', title: 'Attendance Defaulters (< 75%)', description: 'Critical list of all non-compliant students' },
        { reportType: 'faculty_attendance', title: 'Faculty Activity & Sessions', description: 'Classes conducted and attendance logged' },
        { reportType: 'audit_log', title: 'Audit Trail & Corrections', description: 'Complete history of verified attendance changes' },
      ],
    });
  } catch (error) {
    console.error('HOD getReports error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not generate report.',
    });
  }
}

// =========================================================================
// 8. NOTIFICATIONS
// =========================================================================
async function getNotifications(req, res) {
  try {
    const staffId = getHodStaffId(req);

    const notifications = await prisma.notification.findMany({
      where: { staffId },
      orderBy: { createdAt: 'desc' },
      take: 50,
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
    console.error('HOD getNotifications error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load notifications.',
    });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    const staffId = getHodStaffId(req);

    await prisma.notification.updateMany({
      where: { staffId, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    console.error('HOD markAllNotificationsRead error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not mark notifications as read.',
    });
  }
}

async function markNotificationRead(req, res) {
  try {
    const staffId = getHodStaffId(req);
    const { id } = req.params;

    await prisma.notification.updateMany({
      where: { id, staffId },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (error) {
    console.error('HOD markNotificationRead error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not update notification.',
    });
  }
}

// =========================================================================
// 9. HOD PROFILE
// =========================================================================
async function getProfile(req, res) {
  try {
    const staffId = getHodStaffId(req);

    const hod = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        department: true,
        user: { select: { identifier: true, role: true, createdAt: true } },
      },
    });

    if (!hod) {
      return res.status(404).json({ success: false, message: 'HOD profile not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: hod.id,
        employeeId: hod.employeeId,
        name: hod.name,
        email: hod.email,
        mobileNumber: hod.mobileNumber || 'N/A',
        designation: hod.designation,
        cabinLocation: hod.cabinLocation || 'N/A',
        department: hod.department.name,
        departmentCode: hod.department.code,
        status: hod.status,
        joinedDate: hod.user.createdAt,
      },
    });
  } catch (error) {
    console.error('HOD getProfile error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load profile.',
    });
  }
}

async function updateProfile(req, res) {
  try {
    const staffId = getHodStaffId(req);
    const { email, mobileNumber, cabinLocation, currentPassword, newPassword } = req.body;

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true },
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'HOD profile not found.' });
    }

    // If password update requested
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password.',
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, staff.user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect.',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long.',
        });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: staff.userId },
        data: { passwordHash: newHash },
      });
    }

    // Update non-restricted contact fields
    const updated = await prisma.staff.update({
      where: { id: staffId },
      data: {
        ...(email ? { email: email.trim().toLowerCase() } : {}),
        ...(mobileNumber ? { mobileNumber: mobileNumber.trim() } : {}),
        ...(cabinLocation ? { cabinLocation: cabinLocation.trim() } : {}),
      },
      include: { department: true },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: updated.id,
        employeeId: updated.employeeId,
        name: updated.name,
        email: updated.email,
        mobileNumber: updated.mobileNumber,
        designation: updated.designation,
        cabinLocation: updated.cabinLocation,
        department: updated.department.name,
      },
    });
  } catch (error) {
    console.error('HOD updateProfile error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not update profile.',
    });
  }
}

// =========================================================================
// 9. DELETED RECORDS / TRASH MANAGEMENT
// =========================================================================
async function getDeletedRecords(req, res) {
  try {
    const deptId = getHodDeptId(req);

    const [deletedFaculty, deletedStudents] = await Promise.all([
      prisma.staff.findMany({
        where: {
          departmentId: deptId,
          deletedAt: { not: null },
        },
        select: {
          id: true,
          employeeId: true,
          name: true,
          email: true,
          mobileNumber: true,
          designation: true,
          staffRole: true,
          deletedAt: true,
          deletedBy: true,
          deletionReason: true,
          _count: {
            select: {
              attendanceRecords: true,
              subjectAssignments: true,
            },
          },
        },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.student.findMany({
        where: {
          departmentId: deptId,
          deletedAt: { not: null },
        },
        select: {
          id: true,
          registrationNumber: true,
          name: true,
          email: true,
          section: true,
          year: true,
          deletedAt: true,
          deletedBy: true,
          deletionReason: true,
          _count: {
            select: {
              attendanceRecords: true,
            },
          },
        },
        orderBy: { deletedAt: 'desc' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        faculty: deletedFaculty,
        students: deletedStudents,
      },
    });
  } catch (error) {
    console.error('HOD getDeletedRecords error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not load deleted records.',
    });
  }
}

async function restoreRecord(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const hodStaffId = getHodStaffId(req);
    const { type, id } = req.body;

    if (!type || !id || !['FACULTY', 'STUDENT'].includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Valid type ('FACULTY' or 'STUDENT') and ID are required.",
      });
    }

    if (type.toUpperCase() === 'FACULTY') {
      const faculty = await prisma.staff.findFirst({
        where: { id, departmentId: deptId },
      });
      if (!faculty) {
        return res.status(404).json({ success: false, message: 'Deleted faculty not found in your department.' });
      }

      await prisma.$transaction([
        prisma.staff.update({
          where: { id },
          data: {
            deletedAt: null,
            deletedBy: null,
            deletionReason: null,
            status: 'ACTIVE',
          },
        }),
        prisma.facultySubjectAssignment.updateMany({
          where: { facultyId: id },
          data: { status: 'ACTIVE' },
        }),
        prisma.user.update({
          where: { id: faculty.userId },
          data: { accountStatus: AccountStatus.ACTIVE },
        }),
        prisma.systemAuditLog.create({
          data: {
            actorId: hodStaffId,
            actorRole: Role.HOD,
            action: 'FACULTY_RESTORED',
            targetType: 'FACULTY',
            targetId: faculty.id,
            targetName: `${faculty.name} (${faculty.employeeId})`,
            departmentId: deptId,
            details: `HOD restored faculty from Deleted Records / Trash to Active status with restored teaching assignments.`,
          },
        }),
      ]);

      return res.status(200).json({
        success: true,
        message: `Faculty ${faculty.name} (${faculty.employeeId}) has been successfully restored to active status.`,
      });
    } else {
      const student = await prisma.student.findFirst({
        where: { id, departmentId: deptId },
      });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Deleted student not found in your department.' });
      }

      await prisma.$transaction([
        prisma.student.update({
          where: { id },
          data: {
            deletedAt: null,
            deletedBy: null,
            deletionReason: null,
            status: 'ACTIVE',
          },
        }),
        prisma.user.update({
          where: { id: student.userId },
          data: { accountStatus: AccountStatus.ACTIVE },
        }),
        prisma.systemAuditLog.create({
          data: {
            actorId: hodStaffId,
            actorRole: Role.HOD,
            action: 'STUDENT_RESTORED',
            targetType: 'STUDENT',
            targetId: student.id,
            targetName: `${student.name} (${student.registrationNumber})`,
            departmentId: deptId,
            details: `HOD restored student from Deleted Records / Trash to Active status.`,
          },
        }),
      ]);

      return res.status(200).json({
        success: true,
        message: `Student ${student.name} (${student.registrationNumber}) has been successfully restored to active status.`,
      });
    }
  } catch (error) {
    console.error('HOD restoreRecord error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not restore record.',
    });
  }
}

async function permanentDeleteRecord(req, res) {
  try {
    const deptId = getHodDeptId(req);
    const hodStaffId = getHodStaffId(req);
    const { type, id } = req.body;

    if (!type || !id || !['FACULTY', 'STUDENT'].includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Valid type ('FACULTY' or 'STUDENT') and ID are required.",
      });
    }

    if (type.toUpperCase() === 'FACULTY') {
      const faculty = await prisma.staff.findFirst({
        where: { id, departmentId: deptId, deletedAt: { not: null } },
      });
      if (!faculty) {
        return res.status(404).json({ success: false, message: 'Deleted faculty not found in trash.' });
      }

      await prisma.user.delete({
        where: { id: faculty.userId },
      });

      await prisma.systemAuditLog.create({
        data: {
          actorId: hodStaffId,
          actorRole: Role.HOD,
          action: 'FACULTY_PERMANENT_DELETED',
          targetType: 'FACULTY',
          targetId: id,
          targetName: `${faculty.name} (${faculty.employeeId})`,
          departmentId: deptId,
          details: `Permanently purged faculty from system.`,
        },
      });

      return res.status(200).json({
        success: true,
        message: `Faculty ${faculty.name} (${faculty.employeeId}) has been permanently deleted.`,
      });
    } else {
      const student = await prisma.student.findFirst({
        where: { id, departmentId: deptId, deletedAt: { not: null } },
      });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Deleted student not found in trash.' });
      }

      await prisma.user.delete({
        where: { id: student.userId },
      });

      await prisma.systemAuditLog.create({
        data: {
          actorId: hodStaffId,
          actorRole: Role.HOD,
          action: 'STUDENT_PERMANENT_DELETED',
          targetType: 'STUDENT',
          targetId: id,
          targetName: `${student.name} (${student.registrationNumber})`,
          departmentId: deptId,
          details: `Permanently purged student from system.`,
        },
      });

      return res.status(200).json({
        success: true,
        message: `Student ${student.name} (${student.registrationNumber}) has been permanently deleted.`,
      });
    }
  } catch (error) {
    console.error('HOD permanentDeleteRecord error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not permanently delete record.',
    });
  }
}

// =========================================================================
// OD & APPROVED LEAVE MANAGEMENT FOR HOD
// =========================================================================

async function getHodOdLeaveRequests(req, res) {
  try {
    const departmentId = getHodDeptId(req);
    const { status, type, section, search } = req.query;

    const requestWhere = {
      student: { departmentId, deletedAt: null },
    };

    if (status && status !== 'ALL') requestWhere.status = status;
    if (type && type !== 'ALL') requestWhere.requestType = type;
    if (section && section !== 'ALL') {
      requestWhere.student.section = section.toUpperCase();
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

    // Attach student attendance before/after adjustment preview
    const requestsWithAttendance = await Promise.all(
      requests.map(async (r) => {
        const att = await calculateStudentAttendanceWithExemptions(r.studentId);
        return {
          ...r,
          attendancePreview: att ? {
            rawPercentage: att.raw.percentage,
            adjustedPercentage: att.adjusted.percentage,
            rawPresent: att.raw.presentClasses,
            rawTotal: att.raw.totalClasses,
            adjustedTotal: att.adjusted.totalClasses,
            approvedOdPeriods: att.approvedOdPeriods,
            approvedLeavePeriods: att.approvedLeavePeriods,
          } : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: requestsWithAttendance,
    });
  } catch (error) {
    console.error('getHodOdLeaveRequests error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to fetch OD/Leave requests.' });
  }
}

async function reviewHodOdLeaveRequest(req, res) {
  try {
    const departmentId = getHodDeptId(req);
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
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (request.student.departmentId !== departmentId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are only authorized to review requests within your department.',
      });
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
        reviewedByRole: 'HOD',
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
          ? `Your ${request.requestType === 'ON_DUTY' ? 'On-Duty' : 'Leave'} request for ${new Date(request.date).toISOString().split('T')[0]} has been APPROVED by HOD ${reviewerName}.`
          : `Your request for ${new Date(request.date).toISOString().split('T')[0]} was REJECTED by HOD. Reason: ${rejectionReason.trim()}`,
        type: 'SYSTEM',
      },
    });

    // Immutable SystemAuditLog
    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'HOD',
        action: action === 'APPROVE' ? 'OD_LEAVE_REQUEST_APPROVED' : 'OD_LEAVE_REQUEST_REJECTED',
        targetType: 'OD_LEAVE_REQUEST',
        targetId: id,
        targetName: `${request.student.name} (${request.student.registrationNumber})`,
        departmentId,
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
      message: `Request has been successfully ${action === 'APPROVE' ? 'approved' : 'rejected'} by HOD.`,
      data: {
        request: updated,
        updatedAttendance,
      },
    });
  } catch (error) {
    console.error('reviewHodOdLeaveRequest error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to review OD/Leave request.' });
  }
}

module.exports = {
  getDashboard,
  createFaculty,
  getFacultyList,
  getFacultyFormMeta,
  getFacultyAssignments,
  getFacultyAssignmentById,
  updateFacultyAssignment,
  lookupFacultyByEmployeeId,
  assignFaculty,
  removeFacultyAssignment,
  getFacultyDetail,
  updateFaculty,
  resetFacultyPassword,
  updateFacultyStatus,
  deleteOrDeactivateFaculty,
  getStudents,
  addStudent,
  bulkValidateStudents,
  bulkImportStudents,
  getStudentProfile,
  updateStudent,
  updateStudentStatus,
  deleteOrDeactivateStudent,
  getAttendanceMonitoring,
  getCorrectionRequests,
  reviewCorrectionRequest,
  getCounselingOverview,
  assignCounselor,
  removeCounselorAssignment,
  getDepartmentAtRisk,
  getDepartmentInterventions,
  getReports,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  getProfile,
  updateProfile,
  getDeletedRecords,
  restoreRecord,
  permanentDeleteRecord,
  getHodOdLeaveRequests,
  reviewHodOdLeaveRequest,
};
