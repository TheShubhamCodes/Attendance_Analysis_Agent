const prisma = require('../config/db');
const { PERIODS, DAYS, SUBJECT_CATALOG, TIMETABLES } = require('../data/timetableData');

/**
 * Helper to get student's section from user
 */
async function getStudentSection(user) {
  if (user.studentProfile?.section) {
    return user.studentProfile.section.trim().toUpperCase();
  }
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { section: true },
  });
  return student?.section ? student.section.trim().toUpperCase() : 'A';
}

/**
 * Helper to get parent's linked children & sections
 */
async function getParentWards(user) {
  const parent = await prisma.parent.findUnique({
    where: { userId: user.id },
    include: {
      linkedStudent: {
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          section: true,
          year: true,
        },
      },
    },
  });

  if (!parent || !parent.linkedStudent) {
    return [];
  }

  // Also query if multiple students share guardian contact details
  const sharedStudents = await prisma.student.findMany({
    where: {
      OR: [
        { parent: { id: parent.id } },
        { parent: { email: parent.email } },
        { parent: { mobile: parent.mobile } },
      ],
    },
    select: {
      id: true,
      name: true,
      registrationNumber: true,
      section: true,
      year: true,
    },
  });

  return sharedStudents.length > 0
    ? sharedStudents
    : [
        {
          id: parent.linkedStudent.id,
          name: parent.linkedStudent.name,
          registrationNumber: parent.linkedStudent.registrationNumber,
          section: parent.linkedStudent.section,
          year: parent.linkedStudent.year,
        },
      ];
}

/**
 * Helper to get faculty authorized sections
 */
async function getFacultySections(user) {
  if (!user.staffProfile?.id) {
    return ['A', 'B'];
  }
  const assignments = await prisma.facultySubjectAssignment.findMany({
    where: {
      facultyId: user.staffProfile.id,
      status: 'ACTIVE',
    },
    select: { section: true },
  });

  const sections = Array.from(new Set(assignments.map((a) => a.section.trim().toUpperCase())));
  return sections.length > 0 ? sections : ['A', 'B'];
}

/**
 * 1. Smart route: GET /api/timetable/my-routine
 * Resolves caller's role, accessible sections, and returns the appropriate weekly routine.
 */
async function getMyTimetable(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    let authorizedSections = ['A', 'B'];
    let activeSection = 'A';
    let canSwitchSection = false;
    let wards = [];
    let activeWard = null;

    if (user.role === 'STUDENT') {
      const studentSec = await getStudentSection(user);
      authorizedSections = [studentSec];
      activeSection = studentSec;
      canSwitchSection = false;
    } else if (user.role === 'PARENT') {
      wards = await getParentWards(user);
      if (wards.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No student is linked to this parent account.',
        });
      }

      const selectedChildId = req.query.studentId;
      activeWard = selectedChildId
        ? wards.find((w) => w.id === selectedChildId) || wards[0]
        : wards[0];

      const wardSec = activeWard.section?.trim().toUpperCase() || 'A';
      authorizedSections = [wardSec];
      activeSection = wardSec;
      canSwitchSection = false;
    } else if (user.role === 'STAFF' || user.role === 'FACULTY') {
      authorizedSections = await getFacultySections(user);
      const reqSec = req.query.section?.trim().toUpperCase();
      activeSection = authorizedSections.includes(reqSec) ? reqSec : authorizedSections[0];
      canSwitchSection = authorizedSections.length > 1;
    } else if (user.role === 'HOD' || user.role === 'MENTOR' || user.role === 'ADMIN') {
      authorizedSections = ['A', 'B'];
      const reqSec = req.query.section?.trim().toUpperCase();
      activeSection = reqSec === 'B' ? 'B' : 'A';
      canSwitchSection = true;
    }

    const routine = TIMETABLES[activeSection] || TIMETABLES.A;

    return res.status(200).json({
      success: true,
      data: {
        role: user.role,
        activeSection,
        authorizedSections,
        canSwitchSection,
        wards,
        activeWard,
        periods: PERIODS,
        days: DAYS,
        routine,
        subjectCatalog: SUBJECT_CATALOG,
      },
    });
  } catch (error) {
    console.error('getMyTimetable error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve timetable.' });
  }
}

/**
 * 2. Explicit section route: GET /api/timetable/view/:section
 * Strictly enforces role-based access control:
 * - Student cannot view another section.
 * - Parent cannot view an unrelated section.
 */
async function getSectionTimetable(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const requestedSection = req.params.section?.trim().toUpperCase();
    if (!requestedSection || !['A', 'B'].includes(requestedSection)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section requested. Supported sections: A, B.',
      });
    }

    // Role-based security checks
    if (user.role === 'STUDENT') {
      const studentSec = await getStudentSection(user);
      if (studentSec !== requestedSection) {
        return res.status(403).json({
          success: false,
          message: `Access Denied: You are assigned to Section ${studentSec}. You are not authorized to view the timetable for Section ${requestedSection}.`,
        });
      }
    } else if (user.role === 'PARENT') {
      const wards = await getParentWards(user);
      const allowedSections = wards.map((w) => w.section?.trim().toUpperCase());
      if (!allowedSections.includes(requestedSection)) {
        return res.status(403).json({
          success: false,
          message: `Access Denied: You are only authorized to view timetable for your linked ward's section (${allowedSections.join(', ')}).`,
        });
      }
    } else if (user.role === 'STAFF' || user.role === 'FACULTY') {
      const authorizedSections = await getFacultySections(user);
      if (!authorizedSections.includes(requestedSection)) {
        return res.status(403).json({
          success: false,
          message: `Access Denied: You are not authorized to view Section ${requestedSection}.`,
        });
      }
    }

    const routine = TIMETABLES[requestedSection] || TIMETABLES.A;

    return res.status(200).json({
      success: true,
      data: {
        section: requestedSection,
        periods: PERIODS,
        days: DAYS,
        routine,
        subjectCatalog: SUBJECT_CATALOG,
      },
    });
  } catch (error) {
    console.error('getSectionTimetable error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve section timetable.' });
  }
}

module.exports = {
  getMyTimetable,
  getSectionTimetable,
};
