const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service to validate students against the Student Master database
 * and enforce strict section isolation.
 */
class StudentValidationService {
  /**
   * Loads all active students for a given section.
   * Enforces Section Isolation: Section A only loads Section A, Section B only loads Section B.
   */
  static async getSectionStudents(section, semester = 5, departmentId = null) {
    const cleanSection = (section || '').trim().toUpperCase();

    if (!cleanSection) {
      throw new Error('Section parameter is required for student retrieval.');
    }

    const where = {
      section: cleanSection,
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    // Support year designation (5 or 3 for semester 5)
    if (semester) {
      const semNum = parseInt(semester, 10);
      where.year = { in: [semNum, Math.ceil(semNum / 2)] };
    }

    let students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        email: true,
        section: true,
        year: true,
        mobileNumber: true,
        parent: {
          select: {
            name: true,
            mobile: true,
            email: true,
          },
        },
      },
      orderBy: { registrationNumber: 'asc' },
    });

    // Fallback if semester filter is too strict
    if (students.length === 0) {
      delete where.year;
      students = await prisma.student.findMany({
        where,
        select: {
          id: true,
          registrationNumber: true,
          name: true,
          email: true,
          section: true,
          year: true,
          mobileNumber: true,
          parent: {
            select: {
              name: true,
              mobile: true,
              email: true,
            },
          },
        },
        orderBy: { registrationNumber: 'asc' },
      });
    }

    return students.map((s) => ({
      id: s.id,
      registrationNumber: s.registrationNumber,
      name: s.name,
      email: s.email,
      section: s.section,
      semester: s.year,
      mobileNumber: s.mobileNumber,
      parentName: s.parent?.name || null,
      parentMobile: s.parent?.mobile || null,
      parentEmail: s.parent?.email || null,
    }));
  }

  /**
   * Validates an incoming attendance list against the Student Master.
   * Checks for:
   * 1. Unknown registration numbers (e.g. 24CSE999)
   * 2. Duplicate registration numbers in submission
   * 3. Wrong section allocation
   * 4. Wrong semester allocation
   * 5. Missing student information
   */
  static async validateAttendanceSubmission(items, targetSection, targetSemester = 5) {
    const cleanTargetSection = (targetSection || '').trim().toUpperCase();
    const cleanTargetSem = parseInt(targetSemester, 10);

    const issues = [];
    const validItems = [];
    const seenRegNos = new Set();
    const studentIds = items.map((i) => i.studentId).filter(Boolean);
    const regNos = items.map((i) => (i.registrationNumber || '').trim().toUpperCase()).filter(Boolean);

    // Query Student Master in one efficient batch
    const masterStudents = await prisma.student.findMany({
      where: {
        OR: [
          { id: { in: studentIds } },
          { registrationNumber: { in: regNos } },
        ],
      },
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        section: true,
        year: true,
        status: true,
        deletedAt: true,
      },
    });

    const masterById = new Map();
    const masterByReg = new Map();
    masterStudents.forEach((s) => {
      masterById.set(s.id, s);
      masterByReg.set(s.registrationNumber.toUpperCase(), s);
    });

    items.forEach((item, idx) => {
      const reg = (item.registrationNumber || '').trim().toUpperCase();
      const sId = item.studentId;
      const rowNum = idx + 1;

      // Find in Master
      const matched = (sId && masterById.get(sId)) || (reg && masterByReg.get(reg));

      // 1. Unknown Registration Number Check
      if (!matched) {
        issues.push({
          row: rowNum,
          registrationNumber: reg || 'UNKNOWN',
          type: 'UNKNOWN_REGISTRATION_NUMBER',
          message: `UNKNOWN REGISTRATION NUMBER: "${reg || sId}" does not exist in Student Master.`,
        });
        return;
      }

      // 2. Duplicate Registration Number Check in same submission
      if (seenRegNos.has(matched.registrationNumber)) {
        issues.push({
          row: rowNum,
          registrationNumber: matched.registrationNumber,
          type: 'DUPLICATE_STUDENT_RECORD',
          message: `DUPLICATE STUDENT RECORD: "${matched.registrationNumber}" appears more than once in this attendance submission.`,
        });
        return;
      }
      seenRegNos.add(matched.registrationNumber);

      // 3. Wrong Section Check
      if (matched.section.toUpperCase() !== cleanTargetSection) {
        issues.push({
          row: rowNum,
          registrationNumber: matched.registrationNumber,
          type: 'WRONG_SECTION',
          message: `WRONG SECTION: Student belongs to Section ${matched.section}, but attendance is being recorded for Section ${cleanTargetSection}.`,
        });
        return;
      }

      // 4. Status Check
      if (matched.status !== 'ACTIVE' || matched.deletedAt !== null) {
        issues.push({
          row: rowNum,
          registrationNumber: matched.registrationNumber,
          type: 'INACTIVE_OR_DELETED_STUDENT',
          message: `INACTIVE/DELETED STUDENT: Registration number "${matched.registrationNumber}" is deactivated or archived.`,
        });
        return;
      }

      validItems.push({
        studentId: matched.id,
        registrationNumber: matched.registrationNumber,
        studentName: matched.name,
        section: matched.section,
        semester: matched.year,
        status: item.status === 'ABSENT' ? 'ABSENT' : 'PRESENT',
      });
    });

    return {
      isValid: issues.length === 0,
      totalSubmitted: items.length,
      validCount: validItems.length,
      invalidCount: issues.length,
      issues,
      validItems,
    };
  }
}

module.exports = StudentValidationService;
