const prisma = require('../config/db');
const { calculateRiskAnalysis } = require('../services/riskAnalysisService');

async function getParentProfile(req) {
  if (req.user?.parentProfile) {
    return req.user.parentProfile;
  }
  const parent = await prisma.parent.findUnique({
    where: { userId: req.user?.id },
    include: {
      linkedStudent: {
        include: {
          department: true,
          mentor: true,
        },
      },
    },
  });
  return parent;
}

async function getDashboard(req, res) {
  try {
    const parent = await getParentProfile(req);
    if (!parent || !parent.linkedStudentId) {
      return res.status(404).json({
        success: false,
        message: 'No student is linked to this parent account.',
      });
    }

    const studentId = parent.linkedStudentId;

    // Fetch student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        department: true,
        mentor: true,
      },
    });

    // Attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: { studentId },
      include: {
        course: true,
        faculty: true,
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    // All attendance for calculating aggregate percentage
    const allAttendance = await prisma.attendance.findMany({
      where: { studentId },
      include: { course: true },
    });

    const totalClasses = allAttendance.length;
    const attendedClasses = allAttendance.filter(
      (a) => a.status === 'PRESENT' || a.status === 'ON_DUTY'
    ).length;
    const overallPercentage = totalClasses > 0 ? ((attendedClasses / totalClasses) * 100).toFixed(1) : '100.0';

    // Subject-wise attendance calculation
    const subjectMap = {};
    allAttendance.forEach((rec) => {
      const code = rec.course?.courseCode || 'OTHER';
      const name = rec.course?.courseName || 'Subject';
      if (!subjectMap[code]) {
        subjectMap[code] = { code, name, total: 0, present: 0 };
      }
      subjectMap[code].total += 1;
      if (rec.status === 'PRESENT' || rec.status === 'ON_DUTY') {
        subjectMap[code].present += 1;
      }
    });

    const subjectBreakdown = Object.values(subjectMap).map((s) => ({
      courseCode: s.code,
      courseName: s.name,
      totalClasses: s.total,
      attendedClasses: s.present,
      percentage: s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : '100.0',
    }));

    // Risk analysis
    let risk = null;
    try {
      risk = await calculateRiskAnalysis(studentId);
    } catch (err) {
      risk = { riskLevel: parseFloat(overallPercentage) < 75 ? 'HIGH' : 'LOW' };
    }

    return res.status(200).json({
      success: true,
      data: {
        parentName: parent.name,
        student: {
          id: student.id,
          name: student.name,
          registrationNumber: student.registrationNumber,
          department: student.department?.name,
          year: student.year,
          section: student.section,
          mentor: student.mentor ? {
            name: student.mentor.name,
            email: student.mentor.email,
            mobile: student.mentor.mobileNumber,
          } : null,
        },
        stats: {
          totalClasses,
          attendedClasses,
          overallPercentage: parseFloat(overallPercentage),
          riskLevel: risk?.riskLevel || (parseFloat(overallPercentage) < 75 ? 'HIGH' : 'LOW'),
        },
        subjectBreakdown,
        recentAttendance: attendanceRecords,
      },
    });
  } catch (error) {
    console.error('Parent getDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve parent dashboard data.' });
  }
}

async function getProfile(req, res) {
  try {
    const parent = await getParentProfile(req);
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Parent record not found.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: parent.linkedStudentId },
      include: { department: true, mentor: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        name: parent.name,
        email: parent.email,
        mobile: parent.mobile,
        student: student ? {
          name: student.name,
          registrationNumber: student.registrationNumber,
          department: student.department?.name,
          year: student.year,
          section: student.section,
          mentor: student.mentor ? {
            name: student.mentor.name,
            email: student.mentor.email,
          } : null,
        } : null,
      },
    });
  } catch (error) {
    console.error('Parent getProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve parent profile.' });
  }
}

async function updateProfile(req, res) {
  try {
    const { email, mobile } = req.body;
    const parent = await getParentProfile(req);
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Parent record not found.' });
    }

    const updated = await prisma.parent.update({
      where: { id: parent.id },
      data: {
        email: email ? email.trim().toLowerCase() : parent.email,
        mobile: mobile ? mobile.trim() : parent.mobile,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Parent contact information updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('Parent updateProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update parent profile.' });
  }
}

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
};
