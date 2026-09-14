const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const XLSX = require('xlsx');
const {
  getSectionAttendanceReportData,
  buildExcelBuffer,
} = require('../services/facultyAttendanceExportService');

async function runTestSuite() {
  console.log('===============================================================');
  console.log(' STARTING FACULTY ATTENDANCE EXCEL EXPORT COMPREHENSIVE SUITE  ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Fetch real faculty Dr. Rajesh Kumar (FAC001)
    const faculty = await prisma.staff.findUnique({
      where: { employeeId: 'FAC001' },
      include: { department: true },
    });
    assert(!!faculty, 'FAC001 exists in PostgreSQL');

    // 2. Test Authorization: Faculty attempting to export Section C (Unassigned section)
    try {
      await getSectionAttendanceReportData({
        facultyId: faculty.id,
        section: 'C',
        semester: 5,
      });
      assert(false, 'Should fail with 403 when faculty requests unassigned Section C');
    } catch (err) {
      assert(
        err.statusCode === 403,
        `Backend authorization blocks unassigned Section C (Status: ${err.statusCode}, Message: "${err.message}")`
      );
    }

    // 3. Test Authorization: Faculty attempting to export non-existent/unassigned subject
    try {
      await getSectionAttendanceReportData({
        facultyId: faculty.id,
        section: 'A',
        semester: 5,
        courseId: 'non-existent-course-id-999',
      });
      assert(false, 'Should fail with 404 when requested subject does not exist');
    } catch (err) {
      assert(
        err.statusCode === 404,
        `Returns 404 when subject does not exist (Status: ${err.statusCode}, Message: "${err.message}")`
      );
    }

    // 4. Test "All Subjects" Export for Authorized Section A
    const reportA = await getSectionAttendanceReportData({
      facultyId: faculty.id,
      section: 'A',
      semester: 5,
    });

    assert(reportA.meta.university === 'VFSTR :: Vadlamudi', 'University header is VFSTR :: Vadlamudi');
    assert(reportA.meta.section === 'A', 'Section is A');
    assert(reportA.meta.facultyName === faculty.name, `Faculty name matches database (${reportA.meta.facultyName})`);

    // 5. Test Dynamic Subjects from PostgreSQL (Zero default subjects)
    assert(reportA.subjects.length === 3, `Found ${reportA.subjects.length} active subjects for Section A`);
    const subjectCodes = reportA.subjects.map((s) => s.courseCode);
    console.log('  Live Subjects in DB:', subjectCodes);
    assert(
      subjectCodes.includes('CS301') && subjectCodes.includes('CS303') && subjectCodes.includes('CS305'),
      'Subjects strictly loaded from PostgreSQL assignments (CS301, CS303, CS305)'
    );

    // 6. Test Conducted Hours Calculation from PostgreSQL
    console.log('  Audited Conducted Sessions:', reportA.conductedCounts);
    assert(
      reportA.conductedCounts[reportA.subjects[0].id] > 0,
      `Subject 1 (${reportA.subjects[0].courseCode}) has actual conducted hours > 0 (${reportA.conductedCounts[reportA.subjects[0].id]})`
    );
    assert(
      reportA.totalConductedAcrossSubjects > 0,
      `Total conducted across subjects is ${reportA.totalConductedAcrossSubjects} hours`
    );

    // 7. Test Student Coverage: ALL 75 Active Students MUST appear (Fix Absent-Only Bug)
    console.log(`  Total Students in Section A Report: ${reportA.totalStudents}`);
    assert(reportA.totalStudents === 75, `All 75 active students in Section A are exported (Found: ${reportA.totalStudents})`);

    // 8. Test Deleted Students Exclusion
    const deletedInSecA = await prisma.student.findMany({
      where: { section: 'A', deletedAt: { not: null } },
      select: { registrationNumber: true },
    });
    const exportedRegNos = new Set(reportA.students.map((s) => s.registrationNumber));
    let deletedAppeared = false;
    deletedInSecA.forEach((d) => {
      if (exportedRegNos.has(d.registrationNumber)) {
        deletedAppeared = true;
      }
    });
    assert(!deletedAppeared, `Deleted students (${deletedInSecA.map((d) => d.registrationNumber).join(', ')}) are strictly excluded`);

    // 9. Test Missing Attendance Handling (Student without attendance has 'N/A', not 'Absent' or dropped)
    const newStudent = reportA.students.find((s) => s.registrationNumber === '24CSE423');
    assert(!!newStudent, 'Student with zero attendance records (24CSE423) is present in report');
    if (newStudent) {
      const subKey = reportA.subjects[0].id;
      assert(
        newStudent.subjectAttendance[subKey].percentageStr === 'N/A',
        `Student without records has percentage 'N/A' (Found: ${newStudent.subjectAttendance[subKey].percentageStr})`
      );
      assert(
        newStudent.overallPercentageStr === 'N/A',
        `Student without records has overall percentage 'N/A' (Found: ${newStudent.overallPercentageStr})`
      );
    }

    // 10. Test Single Subject Export
    const singleSubjectReport = await getSectionAttendanceReportData({
      facultyId: faculty.id,
      section: 'A',
      semester: 5,
      courseId: reportA.subjects[0].id,
    });
    assert(singleSubjectReport.subjects.length === 1, 'Single subject filter exports exactly 1 subject column');
    assert(
      singleSubjectReport.totalStudents === 75,
      `Single subject export still includes all 75 students (Found: ${singleSubjectReport.totalStudents})`
    );

    // 11. Test Date Range Filter
    const dateFilteredReport = await getSectionAttendanceReportData({
      facultyId: faculty.id,
      section: 'A',
      semester: 5,
      startDate: '2026-09-01',
      endDate: '2026-09-12',
    });
    assert(dateFilteredReport.totalStudents === 75, 'Date filtered report still includes all 75 active students');

    // 12. Test Excel Binary Generation & Structural Integrity
    const excelBuffer = buildExcelBuffer(reportA);
    assert(Buffer.isBuffer(excelBuffer) && excelBuffer.length > 5000, `Excel buffer generated (${excelBuffer.length} bytes)`);

    const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
    assert(workbook.SheetNames.length >= 1, `Workbook contains sheet: ${workbook.SheetNames[0]}`);

    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Header validation
    assert(sheetData[0][0] === 'VFSTR :: Vadlamudi', `Row 1 is University: "${sheetData[0][0]}"`);
    assert(sheetData[1][0].includes('B.Tech'), `Row 2 is B.Tech Department: "${sheetData[1][0]}"`);
    assert(sheetData[3][0] === 'Attendance Report', `Row 4 is Title: "${sheetData[3][0]}"`);

    // Table Headers validation (Row 7, index 7)
    const tableHeader = sheetData[7];
    assert(tableHeader[0] === 'SL' && tableHeader[1] === 'REGD.NO' && tableHeader[2] === 'NAME', 'Columns start with SL, REGD.NO, NAME');
    assert(tableHeader[tableHeader.length - 2] === 'TOTAL', 'Second-to-last column is TOTAL');
    assert(tableHeader[tableHeader.length - 1] === '%', 'Last column is %');

    // Conducted hours row validation (Row 8, index 8)
    const conductedRow = sheetData[8];
    assert(conductedRow[0] === 'No. Of Conducted Hours →', `Row 8 is Conducted Hours: "${conductedRow[0]}"`);

    // Student rows validation
    assert(sheetData.length === 84, `Excel contains exactly 84 rows (9 header/conducted rows + 75 student rows)`);
    assert(sheetData[9][0] === 1, `Row 9 is Student #1 (${sheetData[9][1]} - ${sheetData[9][2]})`);
    assert(sheetData[83][0] === 75, `Row 83 is Student #75 (${sheetData[83][1]} - ${sheetData[83][2]})`);

    // Autofilter validation
    assert(!!ws['!autofilter'], 'Autofilter is configured on header row');
  } catch (error) {
    console.error('Test suite uncaught error:', error);
    failed++;
  }

  console.log('===============================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED `);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
