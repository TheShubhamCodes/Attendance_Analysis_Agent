const XLSX = require('xlsx');
const { PrismaClient, AttendanceStatus } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service to generate Faculty Attendance Excel Export & Matrix Data
 * strictly from live PostgreSQL records without any default or hardcoded subjects.
 */

async function getSectionAttendanceReportData(params) {
  const {
    facultyId,
    section,
    semester,
    academicYear = '2026-2027',
    courseId,
    startDate,
    endDate,
  } = params;

  if (!facultyId || !section) {
    const err = new Error('Faculty ID and Section are required.');
    err.statusCode = 400;
    throw err;
  }

  const cleanSection = section.toString().trim().toUpperCase();

  // 1. Fetch Faculty Profile and verify active status
  const faculty = await prisma.staff.findUnique({
    where: { id: facultyId },
    include: { department: true },
  });

  if (!faculty || faculty.deletedAt !== null || faculty.status !== 'ACTIVE') {
    const err = new Error('Forbidden: Faculty account is deactivated or invalid.');
    err.statusCode = 403;
    throw err;
  }

  // 2. Query Authorized Teaching Assignments for this Faculty in this Section
  const assignmentWhere = {
    facultyId,
    section: cleanSection,
    status: 'ACTIVE',
    faculty: { deletedAt: null, status: 'ACTIVE' },
    course: { isActive: true },
  };

  if (semester && semester !== 'ALL') {
    assignmentWhere.semester = parseInt(semester, 10);
  }
  if (academicYear) {
    assignmentWhere.academicYear = academicYear;
  }
  if (courseId && courseId !== 'ALL') {
    assignmentWhere.courseId = courseId;
  }

  const assignments = await prisma.facultySubjectAssignment.findMany({
    where: assignmentWhere,
    include: {
      course: {
        include: { department: true },
      },
    },
    orderBy: [{ course: { courseCode: 'asc' } }],
  });

  // Check authorization: if 0 assignments match, verify if faculty has ANY assignment in section
  if (assignments.length === 0) {
    const anyAssignment = await prisma.facultySubjectAssignment.findFirst({
      where: {
        facultyId,
        section: cleanSection,
        status: 'ACTIVE',
        faculty: { deletedAt: null },
      },
    });

    if (!anyAssignment) {
      const err = new Error(`Forbidden: You are not authorized to access attendance records for Section ${cleanSection}.`);
      err.statusCode = 403;
      throw err;
    }

    // Faculty is assigned to section, but no subjects exist for selected filters
    const err = new Error(`No subjects found for Section ${cleanSection} in the database.`);
    err.statusCode = 404;
    throw err;
  }

  // 3. Extract Distinct Dynamic Subjects from PostgreSQL (Zero defaults!)
  const subjectMap = new Map();
  assignments.forEach((a) => {
    if (!subjectMap.has(a.course.id)) {
      subjectMap.set(a.course.id, {
        id: a.course.id,
        courseCode: a.course.courseCode,
        courseName: a.course.courseName,
        credits: a.course.credits,
        semester: a.semester,
        academicYear: a.academicYear,
      });
    }
  });

  const subjects = Array.from(subjectMap.values()).sort((a, b) =>
    a.courseCode.localeCompare(b.courseCode)
  );

  if (subjects.length === 0) {
    const err = new Error(`No subjects found for Section ${cleanSection} in the database.`);
    err.statusCode = 404;
    throw err;
  }

  // Resolve target semester and department
  const resolvedSemester =
    semester && semester !== 'ALL'
      ? parseInt(semester, 10)
      : subjects[0].semester || 5;

  const resolvedDeptId = faculty.departmentId;

  // 4. Fetch ALL Active Students in the Authorized Section (The Left-Join Model)
  // Ensures ALL active students are retrieved, completely resolving the absent-only bug.
  // Note: students in semester 5 may be recorded with year: 5 (semester) or year: 3 (study year)
  const candidateYears = resolvedSemester
    ? [resolvedSemester, Math.ceil(resolvedSemester / 2)]
    : [5, 3];

  let students = await prisma.student.findMany({
    where: {
      departmentId: resolvedDeptId,
      section: cleanSection,
      year: { in: candidateYears },
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: {
      id: true,
      registrationNumber: true,
      name: true,
      section: true,
      year: true,
    },
    orderBy: { registrationNumber: 'asc' },
  });

  // Fallback: if student semester/year differed slightly in legacy records, query section directly
  if (students.length === 0) {
    students = await prisma.student.findMany({
      where: {
        departmentId: resolvedDeptId,
        section: cleanSection,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        registrationNumber: true,
        name: true,
        section: true,
        year: true,
      },
      orderBy: { registrationNumber: 'asc' },
    });
  }

  if (students.length === 0) {
    const err = new Error(`No active students found in Section ${cleanSection}.`);
    err.statusCode = 404;
    throw err;
  }

  // 5. Fetch Attendance Records for the Assigned Subjects in this Section
  const subjectIds = subjects.map((s) => s.id);
  const attendanceWhere = {
    courseId: { in: subjectIds },
    section: cleanSection,
  };

  if (startDate && endDate) {
    attendanceWhere.date = {
      gte: new Date(`${startDate}T00:00:00.000Z`),
      lte: new Date(`${endDate}T23:59:59.999Z`),
    };
  } else if (startDate) {
    attendanceWhere.date = {
      gte: new Date(`${startDate}T00:00:00.000Z`),
    };
  } else if (endDate) {
    attendanceWhere.date = {
      lte: new Date(`${endDate}T23:59:59.999Z`),
    };
  }

  const attendanceRecords = await prisma.attendance.findMany({
    where: attendanceWhere,
    select: {
      id: true,
      studentId: true,
      courseId: true,
      date: true,
      period: true,
      status: true,
    },
  });

  // 6. Calculate Conducted Sessions per Subject
  // A conducted session is identified uniquely by (dateStr, period) per courseId & section
  const subjectConductedMap = new Map();
  const studentAttendedMap = new Map(); // courseId -> { studentId: count }
  const studentRecordsMap = new Map(); // courseId -> { studentId: count }

  subjects.forEach((s) => {
    subjectConductedMap.set(s.id, new Set());
    studentAttendedMap.set(s.id, {});
    studentRecordsMap.set(s.id, {});
  });

  attendanceRecords.forEach((rec) => {
    const subId = rec.courseId;
    if (!subjectConductedMap.has(subId)) return;

    const dateStr = new Date(rec.date).toISOString().split('T')[0];
    const sessionKey = `${dateStr}_P${rec.period}`;
    subjectConductedMap.get(subId).add(sessionKey);

    const attendedCounts = studentAttendedMap.get(subId);
    const recCounts = studentRecordsMap.get(subId);

    recCounts[rec.studentId] = (recCounts[rec.studentId] || 0) + 1;

    if (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.ON_DUTY) {
      attendedCounts[rec.studentId] = (attendedCounts[rec.studentId] || 0) + 1;
    }
  });

  // Conducted hours summary array
  const conductedCounts = {};
  let totalConductedAcrossSubjects = 0;
  subjects.forEach((s) => {
    const count = subjectConductedMap.get(s.id).size;
    conductedCounts[s.id] = count;
    totalConductedAcrossSubjects += count;
  });

  // 7. Assemble Student Rows (One row per student, Horizontal Subjects, Left-Join model)
  const studentRows = students.map((student, idx) => {
    let studentTotalAttended = 0;
    let studentTotalConducted = 0;
    const subjectAttendance = {};

    subjects.forEach((sub) => {
      const conducted = conductedCounts[sub.id] || 0;
      const attended = (studentAttendedMap.get(sub.id) || {})[student.id] || 0;
      const totalRecs = (studentRecordsMap.get(sub.id) || {})[student.id] || 0;

      if (conducted === 0 || totalRecs === 0) {
        // Missing attendance or no sessions conducted -> 'N/A' as per university standard
        subjectAttendance[sub.id] = {
          courseId: sub.id,
          courseCode: sub.courseCode,
          courseName: sub.courseName,
          conducted,
          attended,
          percentageStr: 'N/A',
          percentageVal: null,
        };
      } else {
        studentTotalAttended += attended;
        studentTotalConducted += conducted;
        const pct = Math.round((attended / conducted) * 10000) / 100;
        subjectAttendance[sub.id] = {
          courseId: sub.id,
          courseCode: sub.courseCode,
          courseName: sub.courseName,
          conducted,
          attended,
          percentageStr: `${pct.toFixed(2)}%`,
          percentageVal: pct,
        };
      }
    });

    let overallPercentageStr = 'N/A';
    let overallPercentageVal = null;
    if (studentTotalConducted > 0) {
      const overallPct = Math.round((studentTotalAttended / studentTotalConducted) * 10000) / 100;
      overallPercentageStr = `${overallPct.toFixed(2)}%`;
      overallPercentageVal = overallPct;
    }

    return {
      sl: idx + 1,
      studentId: student.id,
      registrationNumber: student.registrationNumber,
      name: student.name,
      section: student.section,
      semester: student.year,
      subjectAttendance,
      totalAttended: studentTotalAttended,
      totalConducted: studentTotalConducted,
      overallPercentageStr,
      overallPercentageVal,
    };
  });

  // Academic Year calculation
  const academicYearYearNum = Math.ceil(resolvedSemester / 2);
  const yearSuffix =
    academicYearYearNum === 1
      ? 'I'
      : academicYearYearNum === 2
      ? 'II'
      : academicYearYearNum === 3
      ? 'III'
      : 'IV';

  return {
    meta: {
      university: 'VFSTR :: Vadlamudi',
      department: faculty.department.name,
      departmentCode: faculty.department.code,
      year: `${yearSuffix} Year`,
      semester: resolvedSemester,
      section: cleanSection,
      academicYear,
      facultyName: faculty.name,
      facultyEmployeeId: faculty.employeeId,
      startDate: startDate || 'Commencement',
      endDate: endDate || 'Present',
      generatedAt: new Date().toISOString(),
    },
    subjects,
    conductedCounts,
    totalConductedAcrossSubjects,
    totalStudents: studentRows.length,
    students: studentRows,
  };
}

/**
 * Builds a styled .xlsx binary buffer following the university reference layout.
 */
function buildExcelBuffer(reportData) {
  const { meta, subjects, conductedCounts, totalConductedAcrossSubjects, students } = reportData;

  const totalCols = 3 + subjects.length + 2; // SL, REGD.NO, NAME + Subjects + TOTAL + %

  const aoa = [];

  // Row 0: University Header
  aoa.push([meta.university]);

  // Row 1: Department Header
  aoa.push([`B.Tech, ${meta.department}`]);

  // Row 2: Year - Semester, Section
  aoa.push([`${meta.year} - Semester ${meta.semester}, Section ${meta.section}`]);

  // Row 3: Report Title
  aoa.push(['Attendance Report']);

  // Row 4: Date Range
  aoa.push([`From: ${meta.startDate}    To: ${meta.endDate}`]);

  // Row 5: Department & Faculty Info
  aoa.push([
    `Department: ${meta.department}    Academic Year: ${meta.academicYear}    Faculty: ${meta.facultyName} (${meta.facultyEmployeeId})`,
  ]);

  // Row 6: Empty Separator
  aoa.push([]);

  // Row 7: Table Headers
  const headerRow = ['SL', 'REGD.NO', 'NAME'];
  subjects.forEach((s) => {
    headerRow.push(`${s.courseName}\n(${s.courseCode})`);
  });
  headerRow.push('TOTAL', '%');
  aoa.push(headerRow);

  // Row 8: Conducted Hours Row
  const conductedRow = ['No. Of Conducted Hours →', '', ''];
  subjects.forEach((s) => {
    conductedRow.push(conductedCounts[s.id] || 0);
  });
  conductedRow.push(totalConductedAcrossSubjects, '100.00%');
  aoa.push(conductedRow);

  // Row 9+: Student Rows (One row per student)
  students.forEach((stu) => {
    const row = [stu.sl, stu.registrationNumber, stu.name];

    subjects.forEach((s) => {
      const subInfo = stu.subjectAttendance[s.id];
      row.push(subInfo ? subInfo.percentageStr : 'N/A');
    });

    row.push(stu.totalAttended, stu.overallPercentageStr);
    aoa.push(row);
  });

  // Create SheetJS Worksheet
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Configure Merged Cells for Titles and Conducted Hours Label
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // University
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }, // Department
    { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } }, // Semester & Section
    { s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } }, // Report Title
    { s: { r: 4, c: 0 }, e: { r: 4, c: totalCols - 1 } }, // Date Range
    { s: { r: 5, c: 0 }, e: { r: 5, c: totalCols - 1 } }, // Faculty Details
    { s: { r: 8, c: 0 }, e: { r: 8, c: 2 } }, // Merge SL, REGD.NO, NAME for Conducted Hours label
  ];
  ws['!merges'] = merges;

  // Auto-compute Column Widths so text is never truncated
  const colWidths = [
    { wch: 6 }, // SL
    { wch: 16 }, // REGD.NO
    { wch: 28 }, // NAME
  ];
  subjects.forEach((s) => {
    const titleLen = Math.max(s.courseCode.length, s.courseName.length);
    colWidths.push({ wch: Math.min(30, Math.max(16, titleLen + 2)) });
  });
  colWidths.push({ wch: 10 }); // TOTAL
  colWidths.push({ wch: 12 }); // %
  ws['!cols'] = colWidths;

  // Set AutoFilter on Table Header (Row 7, Excel row 8)
  const lastColLetter = XLSX.utils.encode_col(totalCols - 1);
  const lastRowNumber = aoa.length;
  ws['!autofilter'] = { ref: `A8:${lastColLetter}${lastRowNumber}` };

  // Freeze Header Rows (up to Row 8) and Left Columns (SL, REGD.NO, NAME)
  ws['!views'] = [
    {
      state: 'frozen',
      xSplit: 3,
      ySplit: 8,
      topLeftCell: 'D9',
      activeCell: 'D9',
    },
  ];

  // Create Workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Sec ${meta.section} Attendance`);

  // Output as binary buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

module.exports = {
  getSectionAttendanceReportData,
  buildExcelBuffer,
};
