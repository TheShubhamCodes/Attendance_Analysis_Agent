const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { AttendanceStatus, Role, StaffRole, AccountStatus, OdLeaveStatus, OdLeaveType } = require('@prisma/client');
const { calculateStudentAttendanceWithExemptions } = require('../services/odLeaveService');

// ==========================================
// 1. DASHBOARD METRICS (Real Database Data)
// ==========================================

exports.getDashboardMetrics = async (req, res) => {
  try {
    const [
      totalStudents,
      totalFaculty,
      totalHods,
      totalParents,
      totalDepartments,
      totalSections,
      totalSubjects,
      totalAttendanceRecords,
      recentUsers,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.student.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.staff.count({ where: { staffRole: 'FACULTY', status: 'ACTIVE', deletedAt: null } }),
      prisma.staff.count({ where: { staffRole: 'HOD', status: 'ACTIVE', deletedAt: null } }),
      prisma.parent.count(),
      prisma.department.count(),
      prisma.section.count({ where: { status: 'ACTIVE' } }),
      prisma.course.count({ where: { isActive: true } }),
      prisma.attendance.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, identifier: true, role: true, accountStatus: true, createdAt: true },
      }),
      prisma.systemAuditLog.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Compute Students at Risk (< 75% attendance)
    const studentAttendanceAgg = await prisma.attendance.groupBy({
      by: ['studentId', 'status'],
      _count: { _all: true },
    });

    const studentMap = {};
    studentAttendanceAgg.forEach((entry) => {
      if (!studentMap[entry.studentId]) {
        studentMap[entry.studentId] = { total: 0, present: 0 };
      }
      studentMap[entry.studentId].total += entry._count._all;
      if (entry.status === 'PRESENT' || entry.status === 'ON_DUTY') {
        studentMap[entry.studentId].present += entry._count._all;
      }
    });

    let atRiskCount = 0;
    const atRiskStudentIds = [];
    Object.keys(studentMap).forEach((sId) => {
      const { total, present } = studentMap[sId];
      if (total > 0) {
        const pct = (present / total) * 100;
        if (pct < 75) {
          atRiskCount++;
          atRiskStudentIds.push({ studentId: sId, percentage: Math.round(pct * 10) / 10 });
        }
      }
    });

    // Fetch top 5 at-risk students details
    const topAtRiskDetails = await prisma.student.findMany({
      where: { id: { in: atRiskStudentIds.slice(0, 5).map((s) => s.studentId) } },
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        section: true,
        department: { select: { name: true, code: true } },
      },
    });

    const atRiskWithPct = topAtRiskDetails.map((student) => {
      const match = atRiskStudentIds.find((s) => s.studentId === student.id);
      return {
        ...student,
        percentage: match ? match.percentage : 0,
      };
    });

    // Recent Attendance Activity (latest 8 records)
    const recentAttendance = await prisma.attendance.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { name: true, registrationNumber: true, section: true } },
        course: { select: { courseName: true, courseCode: true } },
        faculty: { select: { name: true } },
      },
    });

    // Current HODs with Departments
    const currentHods = await prisma.staff.findMany({
      where: { staffRole: 'HOD', status: 'ACTIVE', deletedAt: null },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        counts: {
          totalStudents,
          totalFaculty,
          totalHods,
          totalParents,
          totalDepartments,
          totalSections,
          totalSubjects,
          totalAttendanceRecords,
          studentsAtRisk: atRiskCount,
        },
        atRiskStudents: atRiskWithPct,
        recentAttendanceActivity: recentAttendance,
        recentUsers,
        recentAuditLogs,
        currentHods: currentHods.map((h) => ({
          id: h.id,
          name: h.name,
          employeeId: h.employeeId,
          email: h.email,
          mobileNumber: h.mobileNumber,
          department: h.department.name,
          departmentCode: h.department.code,
          departmentId: h.department.id,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching admin dashboard metrics:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard metrics.' });
  }
};

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      status = '',
      departmentId = '',
    } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = {};
    if (role) where.role = role;
    if (status) where.accountStatus = status;

    if (search) {
      where.OR = [
        { identifier: { contains: search, mode: 'insensitive' } },
        { studentProfile: { name: { contains: search, mode: 'insensitive' } } },
        { studentProfile: { email: { contains: search, mode: 'insensitive' } } },
        { staffProfile: { name: { contains: search, mode: 'insensitive' } } },
        { staffProfile: { email: { contains: search, mode: 'insensitive' } } },
        { parentProfile: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (departmentId) {
      where.OR = [
        { studentProfile: { departmentId } },
        { staffProfile: { departmentId } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          identifier: true,
          role: true,
          accountStatus: true,
          createdAt: true,
          updatedAt: true,
          studentProfile: {
            select: {
              id: true,
              name: true,
              email: true,
              registrationNumber: true,
              year: true,
              section: true,
              department: { select: { id: true, name: true, code: true } },
            },
          },
          staffProfile: {
            select: {
              id: true,
              name: true,
              email: true,
              employeeId: true,
              staffRole: true,
              designation: true,
              department: { select: { id: true, name: true, code: true } },
            },
          },
          parentProfile: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              linkedStudent: {
                select: {
                  id: true,
                  name: true,
                  registrationNumber: true,
                  section: true,
                  department: { select: { name: true, code: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    // Format display attributes
    const formatted = users.map((u) => {
      let displayName = u.identifier;
      let email = '—';
      let department = '—';
      let subRole = u.role;

      if (u.studentProfile) {
        displayName = u.studentProfile.name;
        email = u.studentProfile.email;
        department = u.studentProfile.department?.name || '—';
      } else if (u.staffProfile) {
        displayName = u.staffProfile.name;
        email = u.staffProfile.email;
        department = u.staffProfile.department?.name || '—';
        subRole = u.staffProfile.staffRole;
      } else if (u.parentProfile) {
        displayName = u.parentProfile.name;
        email = u.parentProfile.email;
        department = u.parentProfile.linkedStudent?.department?.name || '—';
      }

      return {
        id: u.id,
        identifier: u.identifier,
        role: u.role,
        subRole,
        name: displayName,
        email,
        department,
        status: u.accountStatus,
        createdAt: u.createdAt,
        studentProfile: u.studentProfile,
        staffProfile: u.staffProfile,
        parentProfile: u.parentProfile,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        users: formatted,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const {
      identifier,
      name,
      email,
      role,
      password,
      departmentId,
      year = 1,
      section = 'A',
      designation = 'Faculty',
      mobileNumber = '',
      linkedStudentRegistration = '',
    } = req.body;

    if (!identifier || !name || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'Identifier, name, role, and password are required.',
      });
    }

    const trimmedId = String(identifier).trim().toUpperCase();

    // Check unique identifier
    const existing = await prisma.user.findFirst({
      where: { identifier: trimmedId },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A user with identifier "${trimmedId}" already exists.`,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role.toUpperCase();

    let createdUser;

    if (userRole === 'STUDENT') {
      if (!departmentId) {
        return res.status(400).json({ success: false, message: 'Department is required for students.' });
      }
      createdUser = await prisma.user.create({
        data: {
          identifier: trimmedId,
          passwordHash,
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          studentProfile: {
            create: {
              registrationNumber: trimmedId,
              name,
              email: email || `${trimmedId.toLowerCase()}@university.edu`,
              dateOfBirth: new Date('2004-01-01'),
              year: parseInt(year, 10) || 1,
              section: section || 'A',
              mobileNumber,
              departmentId,
            },
          },
        },
        include: { studentProfile: true },
      });
    } else if (userRole === 'STAFF' || userRole === 'FACULTY') {
      if (!departmentId) {
        return res.status(400).json({ success: false, message: 'Department is required for faculty.' });
      }
      createdUser = await prisma.user.create({
        data: {
          identifier: trimmedId,
          passwordHash,
          role: 'STAFF',
          accountStatus: 'ACTIVE',
          staffProfile: {
            create: {
              employeeId: trimmedId,
              name,
              email: email || `${trimmedId.toLowerCase()}@university.edu`,
              departmentId,
              staffRole: 'FACULTY',
              designation: designation || 'Associate Professor',
              mobileNumber,
            },
          },
        },
        include: { staffProfile: true },
      });
    } else if (userRole === 'HOD') {
      if (!departmentId) {
        return res.status(400).json({ success: false, message: 'Department is required for HOD.' });
      }
      createdUser = await prisma.user.create({
        data: {
          identifier: trimmedId,
          passwordHash,
          role: 'HOD',
          accountStatus: 'ACTIVE',
          staffProfile: {
            create: {
              employeeId: trimmedId,
              name,
              email: email || `${trimmedId.toLowerCase()}@university.edu`,
              departmentId,
              staffRole: 'HOD',
              designation: designation || 'Professor & Head of Department',
              mobileNumber,
            },
          },
        },
        include: { staffProfile: true },
      });
    } else if (userRole === 'MENTOR') {
      if (!departmentId) {
        return res.status(400).json({ success: false, message: 'Department is required for Mentor.' });
      }
      createdUser = await prisma.user.create({
        data: {
          identifier: trimmedId,
          passwordHash,
          role: 'MENTOR',
          accountStatus: 'ACTIVE',
          staffProfile: {
            create: {
              employeeId: trimmedId,
              name,
              email: email || `${trimmedId.toLowerCase()}@university.edu`,
              departmentId,
              staffRole: 'MENTOR',
              designation: designation || 'Mentor & Student Counselor',
              mobileNumber,
            },
          },
        },
        include: { staffProfile: true },
      });
    } else if (userRole === 'PARENT') {
      let linkedStudentId = null;
      if (linkedStudentRegistration) {
        const student = await prisma.student.findUnique({
          where: { registrationNumber: linkedStudentRegistration.trim().toUpperCase() },
        });
        if (!student) {
          return res.status(400).json({
            success: false,
            message: `Linked student "${linkedStudentRegistration}" not found.`,
          });
        }
        linkedStudentId = student.id;
      }

      if (!linkedStudentId) {
        return res.status(400).json({
          success: false,
          message: 'A valid student registration number is required to create a parent account.',
        });
      }

      createdUser = await prisma.user.create({
        data: {
          identifier: trimmedId,
          passwordHash,
          role: 'PARENT',
          accountStatus: 'ACTIVE',
          parentProfile: {
            create: {
              name,
              email: email || `parent_${trimmedId.toLowerCase()}@example.com`,
              mobile: mobileNumber || '9999999999',
              linkedStudentId,
            },
          },
        },
        include: { parentProfile: true },
      });

      // Also record in ParentStudentLink
      await prisma.parentStudentLink.create({
        data: {
          parentId: createdUser.parentProfile.id,
          studentId: linkedStudentId,
          relation: 'PARENT',
          isPrimary: true,
        },
      });
    } else if (userRole === 'ADMIN') {
      createdUser = await prisma.user.create({
        data: {
          identifier: trimmedId,
          passwordHash,
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
        },
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    // Immutable Audit Log
    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'USER_CREATED',
        targetType: 'USER',
        targetId: createdUser.id,
        targetName: name,
        departmentId: departmentId || null,
        details: JSON.stringify({
          identifier: trimmedId,
          role: userRole,
          name,
          email,
          createdByIdentifier: req.user.identifier,
        }),
      },
    });

    return res.status(201).json({
      success: true,
      message: `User ${name} (${trimmedId}) created successfully.`,
      data: {
        id: createdUser.id,
        identifier: createdUser.identifier,
        role: createdUser.role,
        accountStatus: createdUser.accountStatus,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create user.' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, departmentId, year, section, designation, mobileNumber } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true, staffProfile: true, parentProfile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.studentProfile) {
      await prisma.student.update({
        where: { id: user.studentProfile.id },
        data: {
          name: name || user.studentProfile.name,
          email: email || user.studentProfile.email,
          departmentId: departmentId || user.studentProfile.departmentId,
          year: year ? parseInt(year, 10) : user.studentProfile.year,
          section: section || user.studentProfile.section,
          mobileNumber: mobileNumber !== undefined ? mobileNumber : user.studentProfile.mobileNumber,
        },
      });
    } else if (user.staffProfile) {
      await prisma.staff.update({
        where: { id: user.staffProfile.id },
        data: {
          name: name || user.staffProfile.name,
          email: email || user.staffProfile.email,
          departmentId: departmentId || user.staffProfile.departmentId,
          designation: designation || user.staffProfile.designation,
          mobileNumber: mobileNumber !== undefined ? mobileNumber : user.staffProfile.mobileNumber,
        },
      });
    } else if (user.parentProfile) {
      await prisma.parent.update({
        where: { id: user.parentProfile.id },
        data: {
          name: name || user.parentProfile.name,
          email: email || user.parentProfile.email,
          mobile: mobileNumber || user.parentProfile.mobile,
        },
      });
    }

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'USER_UPDATED',
        targetType: 'USER',
        targetId: user.id,
        targetName: name || user.identifier,
        details: JSON.stringify({
          updatedBy: req.user.identifier,
          changes: { name, email, departmentId, year, section, designation },
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User details updated successfully.',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true, staffProfile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = status || (user.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');

    await prisma.user.update({
      where: { id },
      data: { accountStatus: newStatus },
    });

    if (user.studentProfile) {
      await prisma.student.update({
        where: { id: user.studentProfile.id },
        data: { status: newStatus },
      });
    }
    if (user.staffProfile) {
      await prisma.staff.update({
        where: { id: user.staffProfile.id },
        data: { status: newStatus },
      });
    }

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'USER_STATUS_CHANGED',
        targetType: 'USER',
        targetId: user.id,
        targetName: user.identifier,
        details: JSON.stringify({
          previousStatus: user.accountStatus,
          newStatus,
          changedBy: req.user.identifier,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: `User account is now ${newStatus.toLowerCase()}.`,
      data: { id: user.id, status: newStatus },
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    return res.status(500).json({ success: false, message: 'Failed to change user status.' });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'PASSWORD_RESET',
        targetType: 'USER',
        targetId: user.id,
        targetName: user.identifier,
        details: JSON.stringify({
          resetBy: req.user.identifier,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Password for ${user.identifier} has been securely reset.`,
    });
  } catch (error) {
    console.error('Error resetting user password:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
};

// ==========================================
// 3. HOD MANAGEMENT (Assignments & History)
// ==========================================

exports.getHods = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        staff: {
          where: { status: 'ACTIVE', deletedAt: null },
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            mobileNumber: true,
            designation: true,
            staffRole: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const result = departments.map((dept) => {
      const currentHod = dept.staff.find((s) => s.staffRole === 'HOD');
      const facultyList = dept.staff.filter((s) => s.staffRole === 'FACULTY');

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        currentHod: currentHod || null,
        availableFaculty: facultyList,
      };
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching HODs:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch HOD data.' });
  }
};

exports.assignHod = async (req, res) => {
  try {
    const { departmentId, facultyId, reason = 'Administrative appointment' } = req.body;

    if (!departmentId || !facultyId) {
      return res.status(400).json({
        success: false,
        message: 'Department ID and Faculty ID are required.',
      });
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const newHodStaff = await prisma.staff.findUnique({
      where: { id: facultyId },
      include: { user: true },
    });
    if (!newHodStaff) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    // Find current HOD of this department (if any)
    const currentHodStaff = await prisma.staff.findFirst({
      where: { departmentId, staffRole: 'HOD', status: 'ACTIVE' },
      include: { user: true },
    });

    // 1. Relieve previous HOD (DO NOT delete any historical records!)
    if (currentHodStaff && currentHodStaff.id !== facultyId) {
      await prisma.staff.update({
        where: { id: currentHodStaff.id },
        data: { staffRole: 'FACULTY', designation: 'Senior Faculty' },
      });
      await prisma.user.update({
        where: { id: currentHodStaff.userId },
        data: { role: 'STAFF' },
      });

      // Mark previous HOD history entry as completed
      await prisma.hodHistory.updateMany({
        where: { departmentId, facultyId: currentHodStaff.id, status: 'ACTIVE' },
        data: { status: 'RELIEVED', endDate: new Date() },
      });
    }

    // 2. Promote new HOD
    await prisma.staff.update({
      where: { id: newHodStaff.id },
      data: {
        staffRole: 'HOD',
        departmentId,
        designation: 'Professor & Head of Department',
      },
    });
    await prisma.user.update({
      where: { id: newHodStaff.userId },
      data: { role: 'HOD' },
    });

    // 3. Record in HodHistory
    await prisma.hodHistory.create({
      data: {
        departmentId,
        facultyId: newHodStaff.id,
        assignedById: req.user.id,
        startDate: new Date(),
        status: 'ACTIVE',
        notes: reason,
      },
    });

    // 4. Immutable Audit Log
    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'HOD_CHANGED',
        targetType: 'DEPARTMENT',
        targetId: department.id,
        targetName: department.name,
        departmentId: department.id,
        details: JSON.stringify({
          department: department.code,
          previousHod: currentHodStaff ? currentHodStaff.name : 'None',
          previousHodId: currentHodStaff ? currentHodStaff.id : null,
          newHod: newHodStaff.name,
          newHodId: newHodStaff.id,
          reason,
          changedBy: req.user.identifier,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: `${newHodStaff.name} is now appointed as HOD of ${department.name}. Previous records have been fully preserved.`,
      data: {
        departmentId,
        newHod: {
          id: newHodStaff.id,
          name: newHodStaff.name,
          employeeId: newHodStaff.employeeId,
        },
      },
    });
  } catch (error) {
    console.error('Error assigning HOD:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign HOD.' });
  }
};

exports.removeHod = async (req, res) => {
  try {
    const { departmentId, facultyId, reason = 'Relieved by administration' } = req.body;

    const staff = await prisma.staff.findUnique({
      where: { id: facultyId },
      include: { department: true },
    });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    await prisma.staff.update({
      where: { id: staff.id },
      data: { staffRole: 'FACULTY', designation: 'Faculty' },
    });
    await prisma.user.update({
      where: { id: staff.userId },
      data: { role: 'STAFF' },
    });

    await prisma.hodHistory.updateMany({
      where: { departmentId, facultyId, status: 'ACTIVE' },
      data: { status: 'RELIEVED', endDate: new Date() },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'HOD_REMOVED',
        targetType: 'DEPARTMENT',
        targetId: departmentId,
        targetName: staff.department?.name || 'Department',
        departmentId,
        details: JSON.stringify({
          relievedStaff: staff.name,
          employeeId: staff.employeeId,
          reason,
          changedBy: req.user.identifier,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: `HOD assignment for ${staff.name} removed. Role adjusted to Faculty.`,
    });
  } catch (error) {
    console.error('Error removing HOD:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove HOD.' });
  }
};

exports.getHodHistory = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const where = {};
    if (departmentId) where.departmentId = departmentId;

    const history = await prisma.hodHistory.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        faculty: { select: { id: true, name: true, employeeId: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching HOD history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch HOD history.' });
  }
};

// ==========================================
// 4. FACULTY MANAGEMENT & ASSIGNMENTS
// ==========================================

exports.getFaculty = async (req, res) => {
  try {
    const { departmentId, search } = req.query;
    const where = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const faculty = await prisma.staff.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        subjectAssignments: {
          where: { status: 'ACTIVE' },
          include: {
            course: { select: { id: true, courseName: true, courseCode: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = faculty.map((f) => ({
      id: f.id,
      employeeId: f.employeeId,
      name: f.name,
      email: f.email,
      mobileNumber: f.mobileNumber,
      designation: f.designation,
      staffRole: f.staffRole,
      department: f.department.name,
      departmentCode: f.department.code,
      departmentId: f.department.id,
      assignedSections: [...new Set(f.subjectAssignments.map((a) => a.section))],
      assignedSubjects: f.subjectAssignments.map((a) => ({
        assignmentId: a.id,
        courseId: a.course.id,
        courseName: a.course.courseName,
        courseCode: a.course.courseCode,
        section: a.section,
        semester: a.semester,
      })),
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch faculty list.' });
  }
};

exports.assignFacultySubject = async (req, res) => {
  try {
    const { facultyId, courseId, section, semester = 5, academicYear = '2026-2027' } = req.body;

    if (!facultyId || !courseId || !section) {
      return res.status(400).json({
        success: false,
        message: 'Faculty ID, Course ID, and Section are required.',
      });
    }

    const assignment = await prisma.facultySubjectAssignment.upsert({
      where: {
        facultyId_courseId_section_academicYear_semester: {
          facultyId,
          courseId,
          section: section.toUpperCase(),
          academicYear,
          semester: parseInt(semester, 10),
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        facultyId,
        courseId,
        section: section.toUpperCase(),
        academicYear,
        semester: parseInt(semester, 10),
        status: 'ACTIVE',
      },
      include: {
        course: true,
        faculty: true,
      },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'FACULTY_ASSIGNMENT_CHANGED',
        targetType: 'ASSIGNMENT',
        targetId: assignment.id,
        targetName: `${assignment.faculty.name} -> ${assignment.course.courseCode} (${section})`,
        departmentId: assignment.faculty.departmentId,
        details: JSON.stringify({
          facultyName: assignment.faculty.name,
          courseCode: assignment.course.courseCode,
          section,
          semester,
          assignedBy: req.user.identifier,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Assigned ${assignment.course.courseName} (${section}) to ${assignment.faculty.name}.`,
      data: assignment,
    });
  } catch (error) {
    console.error('Error assigning faculty subject:', error);
    return res.status(500).json({ success: false, message: 'Failed to create faculty assignment.' });
  }
};

exports.removeFacultySubject = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await prisma.facultySubjectAssignment.findUnique({
      where: { id },
      include: { faculty: true, course: true },
    });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    await prisma.facultySubjectAssignment.delete({ where: { id } });

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'FACULTY_ASSIGNMENT_REMOVED',
        targetType: 'ASSIGNMENT',
        targetId: id,
        targetName: `${assignment.faculty.name} - ${assignment.course.courseCode}`,
        details: JSON.stringify({
          removedBy: req.user.identifier,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Faculty assignment removed successfully.',
    });
  } catch (error) {
    console.error('Error removing faculty assignment:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove assignment.' });
  }
};

// ==========================================
// 5. STUDENT MANAGEMENT
// ==========================================

exports.getStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search = '',
      departmentId = '',
      section = '',
      year = '',
    } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = { status: 'ACTIVE', deletedAt: null };

    if (departmentId) where.departmentId = departmentId;
    if (section) where.section = section.toUpperCase();
    if (year) where.year = parseInt(year, 10);

    if (search) {
      where.OR = [
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take,
        include: {
          department: { select: { id: true, name: true, code: true } },
          parent: { select: { id: true, name: true, mobile: true, email: true } },
          attendanceRecords: {
            select: { status: true },
          },
        },
        orderBy: { registrationNumber: 'asc' },
      }),
    ]);

    const formatted = students.map((s) => {
      const totalAtt = s.attendanceRecords.length;
      const presentCount = s.attendanceRecords.filter(
        (a) => a.status === 'PRESENT' || a.status === 'ON_DUTY'
      ).length;
      const pct = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 1000) / 10 : 0;

      return {
        id: s.id,
        registrationNumber: s.registrationNumber,
        name: s.name,
        email: s.email,
        mobileNumber: s.mobileNumber,
        year: s.year,
        section: s.section,
        department: s.department.name,
        departmentCode: s.department.code,
        departmentId: s.department.id,
        attendancePercentage: pct,
        totalClasses: totalAtt,
        presentClasses: presentCount,
        parent: s.parent,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        students: formatted,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch student list.' });
  }
};

exports.getStudentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        department: true,
        mentor: true,
        parent: true,
        attendanceRecords: {
          take: 20,
          orderBy: { date: 'desc' },
          include: { course: true },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const totalAtt = await prisma.attendance.count({ where: { studentId: id } });
    const presentAtt = await prisma.attendance.count({
      where: { studentId: id, status: { in: ['PRESENT', 'ON_DUTY'] } },
    });
    const pct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 1000) / 10 : 0;

    return res.status(200).json({
      success: true,
      data: {
        ...student,
        stats: {
          totalAttendance: totalAtt,
          presentAttendance: presentAtt,
          percentage: pct,
          isAtRisk: pct < 75,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch student profile.' });
  }
};

// ==========================================
// 6. PARENT MANAGEMENT
// ==========================================

exports.getParents = async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
      ];
    }

    const parents = await prisma.parent.findMany({
      where,
      include: {
        user: { select: { id: true, identifier: true, accountStatus: true } },
        linkedStudent: {
          select: {
            id: true,
            registrationNumber: true,
            name: true,
            section: true,
            department: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const parentLinks = await prisma.parentStudentLink.findMany();
    const studentIds = parentLinks.map((l) => l.studentId);
    const linkedStudentsMap = {};
    if (studentIds.length > 0) {
      const extraStudents = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          registrationNumber: true,
          name: true,
          section: true,
          department: { select: { name: true, code: true } },
        },
      });
      extraStudents.forEach((s) => {
        linkedStudentsMap[s.id] = s;
      });
    }

    const formatted = parents.map((p) => {
      const extraLinks = parentLinks.filter((l) => l.parentId === p.id);
      const children = [];

      if (p.linkedStudent) {
        children.push(p.linkedStudent);
      }
      extraLinks.forEach((l) => {
        if (linkedStudentsMap[l.studentId] && !children.find((c) => c.id === l.studentId)) {
          children.push(linkedStudentsMap[l.studentId]);
        }
      });

      return {
        id: p.id,
        userId: p.userId,
        identifier: p.user.identifier,
        name: p.name,
        email: p.email,
        mobile: p.mobile,
        status: p.user.accountStatus,
        children,
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching parents:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch parents.' });
  }
};

exports.linkParentStudent = async (req, res) => {
  try {
    const { parentId, registrationNumber, studentId } = req.body;

    const parent = await prisma.parent.findUnique({ where: { id: parentId } });
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Parent record not found.' });
    }

    let student = null;
    if (studentId) {
      student = await prisma.student.findUnique({ where: { id: studentId } });
    } else if (registrationNumber) {
      student = await prisma.student.findUnique({
        where: { registrationNumber: registrationNumber.trim().toUpperCase() },
      });
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    await prisma.parentStudentLink.upsert({
      where: {
        parentId_studentId: { parentId, studentId: student.id },
      },
      update: {},
      create: {
        parentId,
        studentId: student.id,
        relation: 'PARENT',
      },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'PARENT_STUDENT_LINKED',
        targetType: 'PARENT',
        targetId: parent.id,
        targetName: parent.name,
        details: JSON.stringify({
          parentName: parent.name,
          studentName: student.name,
          registrationNumber: student.registrationNumber,
          linkedBy: req.user.identifier,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Linked student ${student.name} (${student.registrationNumber}) to parent ${parent.name}.`,
    });
  } catch (error) {
    console.error('Error linking parent student:', error);
    return res.status(500).json({ success: false, message: 'Failed to link parent to student.' });
  }
};

exports.unlinkParentStudent = async (req, res) => {
  try {
    const { parentId, studentId } = req.body;

    await prisma.parentStudentLink.deleteMany({
      where: { parentId, studentId },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'PARENT_STUDENT_UNLINKED',
        targetType: 'PARENT',
        targetId: parentId,
        details: JSON.stringify({
          parentId,
          studentId,
          unlinkedBy: req.user.identifier,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Parent-student relationship removed.',
    });
  } catch (error) {
    console.error('Error unlinking parent student:', error);
    return res.status(500).json({ success: false, message: 'Failed to unlink student.' });
  }
};

// ==========================================
// 7. ACADEMIC MANAGEMENT (Departments, Sections, Subjects)
// ==========================================

exports.getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            students: true,
            staff: true,
            courses: true,
            sections: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return res.status(200).json({ success: true, data: departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Name and Code are required.' });
    }

    const dept = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
      },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'DEPARTMENT_CREATED',
        targetType: 'DEPARTMENT',
        targetId: dept.id,
        targetName: dept.name,
        details: JSON.stringify({ code: dept.code, name: dept.name, createdBy: req.user.identifier }),
      },
    });

    return res.status(201).json({
      success: true,
      message: `Department ${dept.name} (${dept.code}) created successfully.`,
      data: dept,
    });
  } catch (error) {
    console.error('Error creating department:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create department.' });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    const dept = await prisma.department.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        code: code ? code.trim().toUpperCase() : undefined,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Department updated to ${dept.name} (${dept.code}).`,
      data: dept,
    });
  } catch (error) {
    console.error('Error updating department:', error);
    return res.status(500).json({ success: false, message: 'Failed to update department.' });
  }
};

exports.getSections = async (req, res) => {
  try {
    const { departmentId, year } = req.query;
    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (year) where.year = parseInt(year, 10);

    const sections = await prisma.section.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ department: { code: 'asc' } }, { year: 'asc' }, { name: 'asc' }],
    });

    const counts = await prisma.student.groupBy({
      by: ['departmentId', 'year', 'section'],
      _count: { _all: true },
      where: { status: 'ACTIVE', deletedAt: null },
    });

    const enriched = sections.map((sec) => {
      const match = counts.find(
        (c) =>
          c.departmentId === sec.departmentId &&
          c.year === sec.year &&
          c.section.toUpperCase() === sec.name.toUpperCase()
      );
      return {
        ...sec,
        enrolledStudentsCount: match ? match._count._all : 0,
      };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error('Error fetching sections:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sections.' });
  }
};

exports.createSection = async (req, res) => {
  try {
    const { departmentId, name, year = 1, semester = 1, capacity = 60 } = req.body;
    if (!departmentId || !name) {
      return res.status(400).json({ success: false, message: 'Department and Section Name are required.' });
    }

    const secName = name.trim().toUpperCase();
    const section = await prisma.section.create({
      data: {
        departmentId,
        name: secName,
        year: parseInt(year, 10),
        semester: parseInt(semester, 10),
        capacity: parseInt(capacity, 10) || 60,
      },
      include: { department: true },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'SECTION_CREATED',
        targetType: 'SECTION',
        targetId: section.id,
        targetName: `${section.department.code} - Year ${section.year} Sec ${section.name}`,
        departmentId,
        details: JSON.stringify({ createdBy: req.user.identifier }),
      },
    });

    return res.status(201).json({
      success: true,
      message: `Section ${secName} created under ${section.department.name}.`,
      data: section,
    });
  } catch (error) {
    console.error('Error creating section:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create section.' });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const { departmentId, semester } = req.query;
    const where = { isActive: true };
    if (departmentId) where.departmentId = departmentId;
    if (semester) where.semester = parseInt(semester, 10);

    const subjects = await prisma.course.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        faculty: { select: { id: true, name: true, employeeId: true } },
        subjectAssignments: {
          where: { status: 'ACTIVE' },
          include: { faculty: { select: { id: true, name: true, employeeId: true } } },
        },
      },
      orderBy: { courseCode: 'asc' },
    });

    return res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subjects.' });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { courseCode, courseName, departmentId, credits = 3, semester = 5, year = 3 } = req.body;
    if (!courseCode || !courseName || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Course Code, Course Name, and Department are required.',
      });
    }

    const code = courseCode.trim().toUpperCase();
    const subject = await prisma.course.create({
      data: {
        courseCode: code,
        courseName: courseName.trim(),
        departmentId,
        credits: parseInt(credits, 10) || 3,
        semester: parseInt(semester, 10) || 5,
        year: parseInt(year, 10) || 3,
      },
      include: { department: true },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'SUBJECT_CREATED',
        targetType: 'COURSE',
        targetId: subject.id,
        targetName: `${subject.courseCode} - ${subject.courseName}`,
        departmentId,
        details: JSON.stringify({ createdBy: req.user.identifier }),
      },
    });

    return res.status(201).json({
      success: true,
      message: `Subject ${subject.courseCode} (${subject.courseName}) created.`,
      data: subject,
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create subject.' });
  }
};

// ==========================================
// 8. ATTENDANCE MANAGEMENT & MANUAL CORRECTIONS
// ==========================================

exports.getAttendanceRecords = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 30,
      departmentId,
      section,
      year,
      date,
      period,
      courseId,
      facultyId,
      studentId,
      status,
    } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = {};

    if (status) where.status = status;
    if (period) where.period = parseInt(period, 10);
    if (courseId) where.courseId = courseId;
    if (facultyId) where.facultyId = facultyId;
    if (studentId) where.studentId = studentId;

    if (date) {
      const d = new Date(date);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      where.date = { gte: startOfDay, lte: endOfDay };
    }

    if (section) where.section = section.toUpperCase();

    if (departmentId || year) {
      where.student = {};
      if (departmentId) where.student.departmentId = departmentId;
      if (year) where.student.year = parseInt(year, 10);
    }

    const [total, records] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        skip,
        take,
        include: {
          student: {
            select: {
              id: true,
              registrationNumber: true,
              name: true,
              section: true,
              department: { select: { name: true, code: true } },
            },
          },
          course: { select: { id: true, courseName: true, courseCode: true } },
          faculty: { select: { id: true, name: true, employeeId: true } },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance records.' });
  }
};

exports.correctAttendanceRecord = async (req, res) => {
  try {
    const { attendanceId, newStatus, reason } = req.body;

    if (!attendanceId || !newStatus || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Attendance ID, new status, and reason are strictly required for administrative corrections.',
      });
    }

    const record = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        student: { include: { department: true } },
        course: true,
      },
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    const oldStatus = record.status;
    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: { status: newStatus },
    });

    // 1. Log in SystemAuditLog (Immutable system audit trail)
    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'ATTENDANCE_MODIFIED',
        targetType: 'ATTENDANCE',
        targetId: attendanceId,
        targetName: `${record.student.name} - ${record.course.courseName}`,
        departmentId: record.student.departmentId,
        details: JSON.stringify({
          student: record.student.name,
          registrationNumber: record.student.registrationNumber,
          course: record.course.courseName,
          date: record.date.toISOString().split('T')[0],
          period: record.period,
          previous: oldStatus,
          changedTo: newStatus,
          reason,
          modifiedBy: req.user.identifier,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // 2. Also log in AttendanceAuditLog for faculty/student historical records
    if (record.facultyId) {
      await prisma.attendanceAuditLog.create({
        data: {
          attendanceId,
          facultyId: record.facultyId,
          oldStatus,
          newStatus,
          reason: `Admin Correction: ${reason}`,
          approvedBy: `Admin (${req.user.identifier})`,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Attendance updated from ${oldStatus} to ${newStatus} for ${record.student.name}. Audit log created.`,
      data: updated,
    });
  } catch (error) {
    console.error('Error correcting attendance:', error);
    return res.status(500).json({ success: false, message: 'Failed to correct attendance record.' });
  }
};

// ==========================================
// 9. TIMETABLE MANAGEMENT (View & Scheduling Only)
// ==========================================

exports.getTimetable = async (req, res) => {
  try {
    const { section, semester = 5, dayOfWeek } = req.query;
    const where = {};
    if (section) where.section = section.toUpperCase();
    if (semester) where.semester = parseInt(semester, 10);
    if (dayOfWeek) where.dayOfWeek = dayOfWeek.toUpperCase();

    const routine = await prisma.timetable.findMany({
      where,
      include: {
        course: { select: { id: true, courseName: true, courseCode: true } },
        faculty: { select: { id: true, name: true, employeeId: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });

    return res.status(200).json({ success: true, data: routine });
  } catch (error) {
    console.error('Error fetching timetable:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch timetable.' });
  }
};

exports.createTimetableSlot = async (req, res) => {
  try {
    const {
      section,
      semester = 5,
      dayOfWeek,
      periodNumber,
      periodId,
      startTime,
      endTime,
      courseId,
      facultyId,
      subjectCode,
      subjectName,
      subjectType = 'Lecture',
      room,
    } = req.body;

    if (!section || !dayOfWeek || !periodNumber || !subjectCode || !subjectName) {
      return res.status(400).json({
        success: false,
        message: 'Section, Day, Period Number, and Subject info are required.',
      });
    }

    const slot = await prisma.timetable.upsert({
      where: {
        section_semester_academicYear_dayOfWeek_periodNumber: {
          section: section.toUpperCase(),
          semester: parseInt(semester, 10),
          academicYear: '2026-2027',
          dayOfWeek: dayOfWeek.toUpperCase(),
          periodNumber: parseInt(periodNumber, 10),
        },
      },
      update: {
        periodId: periodId || `P${periodNumber}`,
        startTime: startTime || '09:00',
        endTime: endTime || '09:50',
        courseId,
        facultyId,
        subjectCode: subjectCode.toUpperCase(),
        subjectName,
        subjectType,
        room,
      },
      create: {
        section: section.toUpperCase(),
        semester: parseInt(semester, 10),
        academicYear: '2026-2027',
        dayOfWeek: dayOfWeek.toUpperCase(),
        periodNumber: parseInt(periodNumber, 10),
        periodId: periodId || `P${periodNumber}`,
        startTime: startTime || '09:00',
        endTime: endTime || '09:50',
        courseId,
        facultyId,
        subjectCode: subjectCode.toUpperCase(),
        subjectName,
        subjectType,
        room,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Timetable slot saved for Sec ${slot.section} on ${slot.dayOfWeek} (Period ${slot.periodNumber}).`,
      data: slot,
    });
  } catch (error) {
    console.error('Error creating timetable slot:', error);
    return res.status(500).json({ success: false, message: 'Failed to create timetable slot.' });
  }
};

exports.deleteTimetableSlot = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.timetable.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Timetable slot removed.' });
  } catch (error) {
    console.error('Error deleting timetable slot:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete timetable slot.' });
  }
};

// ==========================================
// 10. AUDIT LOGS
// ==========================================

exports.getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 30,
      action = '',
      targetType = '',
      search = '',
    } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = {};
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { targetName: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.systemAuditLog.count({ where }),
      prisma.systemAuditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
};

// ==========================================
// 11. SYSTEM SETTINGS
// ==========================================

exports.getSystemSettings = async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    const settingsObj = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    return res.status(200).json({
      success: true,
      data: {
        settings: settingsObj,
        raw: settings,
      },
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch system settings.' });
  }
};

exports.updateSystemSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings object is required.' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          category: 'GENERAL',
        },
      });
    }

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'SETTINGS_UPDATED',
        targetType: 'SYSTEM_SETTINGS',
        targetId: 'GLOBAL',
        details: JSON.stringify({
          updatedBy: req.user.identifier,
          updatedKeys: Object.keys(settings),
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'System settings saved successfully.',
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to update system settings.' });
  }
};

// ==========================================
// 12. NOTIFICATIONS
// ==========================================

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { name: true, registrationNumber: true } },
        staff: { select: { name: true, employeeId: true } },
      },
    });

    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, type = 'SYSTEM', target = 'ALL' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and Message are required.' });
    }

    let staffMembers = [];
    let students = [];

    if (target === 'ALL' || target === 'STAFF') {
      staffMembers = await prisma.staff.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    }
    if (target === 'ALL' || target === 'STUDENTS') {
      students = await prisma.student.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    }

    const notificationsData = [
      ...staffMembers.map((s) => ({
        staffId: s.id,
        title,
        message,
        type: 'SYSTEM',
      })),
      ...students.map((st) => ({
        studentId: st.id,
        title,
        message,
        type: 'SYSTEM',
      })),
    ];

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({
        data: notificationsData.slice(0, 200),
      });
    }

    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'NOTIFICATION_BROADCAST',
        targetType: 'NOTIFICATION',
        targetId: 'BROADCAST',
        details: JSON.stringify({ title, target, sender: req.user.identifier }),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Notification broadcasted to ${notificationsData.length} recipients.`,
    });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    return res.status(500).json({ success: false, message: 'Failed to broadcast notification.' });
  }
};

// ==========================================
// 13. OD & APPROVED LEAVE MANAGEMENT (ADMIN)
// ==========================================

exports.getAdminOdLeaveRequests = async (req, res) => {
  try {
    const { departmentId, section, studentId, status, type, date, search } = req.query;
    const requestWhere = {};

    if (status && status !== 'ALL') requestWhere.status = status;
    if (type && type !== 'ALL') requestWhere.requestType = type;
    if (studentId) requestWhere.studentId = studentId;

    if (departmentId || section) {
      requestWhere.student = {};
      if (departmentId && departmentId !== 'ALL') requestWhere.student.departmentId = departmentId;
      if (section && section !== 'ALL') requestWhere.student.section = section.toUpperCase();
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
            department: { select: { id: true, name: true, code: true } },
          },
        },
        course: { select: { id: true, courseName: true, courseCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

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
            totalExemptions: att.totalApprovedExemptions,
          } : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: requestsWithAttendance,
    });
  } catch (error) {
    console.error('getAdminOdLeaveRequests error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch OD/Leave requests.' });
  }
};

exports.reviewAdminOdLeaveRequest = async (req, res) => {
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
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const newStatus = action === 'APPROVE' ? OdLeaveStatus.APPROVED : OdLeaveStatus.REJECTED;

    const updated = await prisma.odLeaveRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedById: req.user.id,
        reviewedByName: 'Administrator',
        reviewedByRole: 'ADMIN',
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
          ? `Your ${request.requestType === 'ON_DUTY' ? 'On-Duty' : 'Leave'} request for ${new Date(request.date).toISOString().split('T')[0]} has been APPROVED by Administration.`
          : `Your request for ${new Date(request.date).toISOString().split('T')[0]} was REJECTED by Administration. Reason: ${rejectionReason.trim()}`,
        type: 'SYSTEM',
      },
    });

    // Immutable SystemAuditLog
    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: action === 'APPROVE' ? 'OD_LEAVE_REQUEST_APPROVED' : 'OD_LEAVE_REQUEST_REJECTED',
        targetType: 'OD_LEAVE_REQUEST',
        targetId: id,
        targetName: `${request.student.name} (${request.student.registrationNumber})`,
        departmentId: request.student.departmentId,
        details: JSON.stringify({
          requestId: id,
          requestType: request.requestType,
          date: request.date,
          periods: request.periods,
          action,
          reviewedBy: req.user.identifier,
          rejectionReason: action === 'REJECT' ? rejectionReason.trim() : null,
        }),
      },
    });

    // Calculate updated student attendance
    const updatedAttendance = await calculateStudentAttendanceWithExemptions(request.studentId);

    return res.status(200).json({
      success: true,
      message: `Request has been successfully ${action === 'APPROVE' ? 'approved' : 'rejected'} by Administrator.`,
      data: {
        request: updated,
        updatedAttendance,
      },
    });
  } catch (error) {
    console.error('reviewAdminOdLeaveRequest error:', error);
    return res.status(500).json({ success: false, message: 'Failed to review OD/Leave request.' });
  }
};

exports.revokeAdminOdLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Revoked by administrator' } = req.body;

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

    if (request.status !== OdLeaveStatus.APPROVED) {
      return res.status(400).json({
        success: false,
        message: `Only APPROVED requests can be revoked. Current status is ${request.status}.`,
      });
    }

    const updated = await prisma.odLeaveRequest.update({
      where: { id },
      data: {
        status: OdLeaveStatus.REJECTED,
        rejectionReason: `[REVOKED]: ${reason}`,
        reviewedAt: new Date(),
        reviewedById: req.user.id,
        reviewedByName: 'Administrator',
        reviewedByRole: 'ADMIN',
      },
      include: { student: true, course: true },
    });

    // Notify Student
    await prisma.notification.create({
      data: {
        studentId: request.studentId,
        title: 'Approved On-Duty/Leave Exemption Revoked',
        message: `Your previously approved exemption for ${new Date(request.date).toISOString().split('T')[0]} has been revoked by Administrator. Reason: ${reason}`,
        type: 'SYSTEM',
      },
    });

    // Immutable SystemAuditLog
    await prisma.systemAuditLog.create({
      data: {
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'OD_LEAVE_REQUEST_REVOKED',
        targetType: 'OD_LEAVE_REQUEST',
        targetId: id,
        targetName: `${request.student.name} (${request.student.registrationNumber})`,
        departmentId: request.student.departmentId,
        details: JSON.stringify({
          requestId: id,
          requestType: request.requestType,
          date: request.date,
          periods: request.periods,
          revokedBy: req.user.identifier,
          reason,
        }),
      },
    });

    // Recalculate student attendance
    const updatedAttendance = await calculateStudentAttendanceWithExemptions(request.studentId);

    return res.status(200).json({
      success: true,
      message: 'Approved request revoked successfully. Adjusted attendance has been recalculated.',
      data: {
        request: updated,
        updatedAttendance,
      },
    });
  } catch (error) {
    console.error('revokeAdminOdLeaveRequest error:', error);
    return res.status(500).json({ success: false, message: 'Failed to revoke OD/Leave request.' });
  }
};

exports.getMentors = async (req, res) => {
  try {
    const { departmentId, search } = req.query;
    const where = {
      deletedAt: null,
      OR: [
        { staffRole: 'MENTOR' },
        { user: { role: 'MENTOR' } },
        { mentoredStudents: { some: {} } },
      ],
    };

    if (departmentId && departmentId !== 'ALL') {
      where.departmentId = departmentId;
    }

    if (search) {
      const q = search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { employeeId: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const mentors = await prisma.staff.findMany({
      where,
      include: {
        department: true,
        user: { select: { id: true, role: true, accountStatus: true } },
        mentoredStudents: { where: { status: 'ACTIVE', deletedAt: null }, select: { id: true } },
        mentorAssignments: { where: { active: true }, select: { id: true } },
      },
      orderBy: { name: 'asc' },
    });

    const data = mentors.map((m) => {
      const directCount = m.mentoredStudents?.length || 0;
      const assignCount = m.mentorAssignments?.length || 0;
      return {
        id: m.id,
        employeeId: m.employeeId,
        name: m.name,
        email: m.email,
        department: m.department?.name,
        departmentCode: m.department?.code,
        departmentId: m.departmentId,
        designation: m.designation,
        assignedStudentsCount: Math.max(directCount, assignCount),
        status: m.user?.accountStatus || m.status,
        role: m.user?.role || 'MENTOR',
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getMentors error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch mentors.' });
  }
};

exports.getMentorStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const mentor = await prisma.staff.findUnique({
      where: { id },
      include: { department: true },
    });
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found.' });
    }

    const directStudents = await prisma.student.findMany({
      where: { mentorId: id, status: 'ACTIVE', deletedAt: null },
      include: { department: true },
    });

    const assignments = await prisma.mentorStudentAssignment.findMany({
      where: { mentorId: id, active: true },
      include: { student: { include: { department: true } } },
    });

    const studentMap = new Map();
    directStudents.forEach((s) => studentMap.set(s.id, s));
    assignments.forEach((a) => {
      if (a.student && !studentMap.has(a.student.id)) {
        studentMap.set(a.student.id, a.student);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        mentor: { id: mentor.id, name: mentor.name, employeeId: mentor.employeeId, department: mentor.department?.name },
        students: Array.from(studentMap.values()),
      },
    });
  } catch (error) {
    console.error('getMentorStudents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch mentor students.' });
  }
};

exports.assignStudentsToMentor = async (req, res) => {
  try {
    const { mentorId, studentIds } = req.body;
    if (!mentorId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Mentor and at least one student ID are required.' });
    }

    const mentor = await prisma.staff.findUnique({ where: { id: mentorId } });
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found.' });
    }

    await prisma.$transaction(async (tx) => {
      for (const sId of studentIds) {
        await tx.student.update({
          where: { id: sId },
          data: { mentorId },
        });

        await tx.mentorStudentAssignment.upsert({
          where: {
            mentorId_studentId: { mentorId, studentId: sId },
          },
          update: { active: true, assignedById: req.user.id, assignedAt: new Date() },
          create: {
            mentorId,
            studentId: sId,
            active: true,
            assignedById: req.user.id,
          },
        });
      }

      await tx.systemAuditLog.create({
        data: {
          actorId: req.user.id,
          actorRole: 'ADMIN',
          action: 'STUDENTS_ASSIGNED_TO_MENTOR',
          targetType: 'STAFF',
          targetId: mentorId,
          targetName: mentor.name,
          departmentId: mentor.departmentId,
          details: JSON.stringify({ mentorId, count: studentIds.length, studentIds }),
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: `Successfully assigned ${studentIds.length} student(s) to ${mentor.name}.`,
    });
  } catch (error) {
    console.error('assignStudentsToMentor error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign students to mentor.' });
  }
};

exports.removeStudentsFromMentor = async (req, res) => {
  try {
    const { mentorId, studentIds } = req.body;
    if (!mentorId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Mentor and at least one student ID are required.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.student.updateMany({
        where: { id: { in: studentIds }, mentorId },
        data: { mentorId: null },
      });

      await tx.mentorStudentAssignment.updateMany({
        where: { mentorId, studentId: { in: studentIds } },
        data: { active: false },
      });

      await tx.systemAuditLog.create({
        data: {
          actorId: req.user.id,
          actorRole: 'ADMIN',
          action: 'STUDENTS_REMOVED_FROM_MENTOR',
          targetType: 'STAFF',
          targetId: mentorId,
          details: JSON.stringify({ mentorId, count: studentIds.length, studentIds }),
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: `Successfully removed ${studentIds.length} student(s) from mentor.`,
    });
  } catch (error) {
    console.error('removeStudentsFromMentor error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove students from mentor.' });
  }
};

