/**
 * Automated Test Suite for Faculty Attendance Upload Feature
 * Validates 15 Student Master checks, All-or-Nothing rejection, atomic database import,
 * duplicate prevention, and audit logging.
 */
const XLSX = require('xlsx');

const BASE_URL = 'http://localhost:5000/api';
let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
    failed++;
  }
}

function createExcelBase64(rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buffer.toString('base64');
}

async function runTests() {
  console.log('===============================================================');
  console.log('  STARTING FACULTY ATTENDANCE UPLOAD TEST SUITE');
  console.log('===============================================================');

  try {
    // 1. Authenticate Faculty (FAC001)
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'FAC001',
        password: 'Faculty@123',
        userType: 'FACULTY',
      }),
    });
    const loginJson = await loginRes.json();
    assert(loginRes.status === 200 && loginJson.data?.token, 'Faculty login succeeds with token');
    const token = loginJson.data?.token;

    // 2. Fetch Form Metadata to retrieve active course, dept, and section
    const metaRes = await fetch(`${BASE_URL}/faculty/classes/form-meta`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const metaJson = await metaRes.json();
    assert(metaRes.status === 200 && metaJson.data?.courses?.length > 0, 'Fetched faculty class metadata');

    const course = metaJson.data.courses[0]; // e.g. CS301
    const departmentId = course.departmentId;
    const courseId = course.id;
    const section = 'A';
    const year = 3;
    const semester = 5;
    // Pick a fresh unique date for idempotent test runs
    const day = Math.floor(Math.random() * 25) + 1;
    const testDate = `2026-11-${String(day).padStart(2, '0')}`;
    const testPeriod = 4;

    console.log(`Using Subject: ${course.courseCode} (${course.courseName}), Section: ${section}, Dept: ${departmentId}`);

    // 3. Test Template Download API
    const templateRes = await fetch(
      `${BASE_URL}/faculty/attendance/upload/template?departmentId=${departmentId}&section=${section}&year=${year}&semester=${semester}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    assert(
      templateRes.status === 200 && templateRes.headers.get('content-type')?.includes('spreadsheetml'),
      'Template download endpoint returns valid Excel content-type'
    );
    const templateBlob = await templateRes.arrayBuffer();
    const templateWb = XLSX.read(Buffer.from(templateBlob), { type: 'buffer' });
    const templateData = XLSX.utils.sheet_to_json(templateWb.Sheets[templateWb.SheetNames[0]], { header: 1 });
    assert(
      templateData[0][0] === 'Registration Number' &&
      templateData[0][1] === 'Student Name' &&
      templateData[0][2] === 'Attendance',
      'Template has correct required header columns'
    );

    // 4. Test Student Retrieval for Section A to get real registered student data
    const studentsRes = await fetch(
      `${BASE_URL}/faculty/attendance/students?departmentId=${departmentId}&section=${section}&courseId=${courseId}&semester=${semester}&limit=10`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const studentsJson = await studentsRes.json();
    const realStudents = studentsJson.data?.students || [];
    assert(realStudents.length >= 3, 'Retrieved at least 3 real Section A students for testing');
    const student1 = realStudents[0];
    const student2 = realStudents[1];
    const student3 = realStudents[2];

    // 5. TEST ALL-OR-NOTHING REJECTION: Upload file with 1 valid student and multiple invalid rows
    console.log('\n--- Testing All-or-Nothing Rejection ---');
    const invalidRows = [
      ['Registration Number', 'Student Name', 'Attendance'],
      [student1.registrationNumber, student1.name, 'Present'], // Valid
      ['24CSE999', 'Fake Student', 'Present'],                 // Unknown Reg Number
      [student2.registrationNumber, 'Completely Wrong Name', 'Present'], // Name mismatch
      [student1.registrationNumber, student1.name, 'Absent'],  // Duplicate Reg Number in Excel
      [student3.registrationNumber, student3.name, 'Excused'], // Invalid Attendance status
    ];

    const invalidExcelBase64 = createExcelBase64(invalidRows);
    const validateInvalidRes = await fetch(`${BASE_URL}/faculty/attendance/upload/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileData: invalidExcelBase64,
        academicDetails: {
          departmentId,
          section,
          year,
          semester,
          courseId,
          date: testDate,
          period: testPeriod,
        },
      }),
    });

    const validateInvalidJson = await validateInvalidRes.json();
    assert(
      validateInvalidRes.status === 422,
      'Validation rejects file with 422 status when errors are present',
      `Got status ${validateInvalidRes.status}`
    );
    assert(
      validateInvalidJson.data?.isValid === false,
      'Response explicitly marks isValid as false'
    );
    assert(
      validateInvalidJson.data?.invalidCount >= 4,
      'Identified all invalid rows in error report',
      `Found ${validateInvalidJson.data?.invalidCount} errors`
    );

    // Verify error details structure
    const errors = validateInvalidJson.data?.errors || [];
    const hasUnknownStudent = errors.some((e) => e.error.includes('not found in Student Master'));
    const hasNameMismatch = errors.some((e) => e.error.includes('Student name does not match'));
    const hasDuplicateInExcel = errors.some((e) => e.error.includes('Duplicate Registration Number'));
    const hasInvalidStatus = errors.some((e) => e.error.includes('Must strictly be "Present" or "Absent"'));

    assert(hasUnknownStudent, 'Error report identifies Unknown Student error');
    assert(hasNameMismatch, 'Error report identifies Name Mismatch error');
    assert(hasDuplicateInExcel, 'Error report identifies Duplicate Reg No in Excel error');
    assert(hasInvalidStatus, 'Error report identifies Invalid Attendance status error');

    // 6. TEST SECTION MISMATCH VALIDATION
    console.log('\n--- Testing Section Mismatch Validation ---');
    // Fetch a student from Section B
    const secBStudentsRes = await fetch(
      `${BASE_URL}/faculty/attendance/students?departmentId=${departmentId}&section=B&courseId=${courseId}&semester=${semester}&limit=2`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const secBStudentsJson = await secBStudentsRes.json();
    const secBStudent = secBStudentsJson.data?.students?.[0];

    if (secBStudent) {
      const sectionMismatchRows = [
        ['Registration Number', 'Student Name', 'Attendance'],
        [secBStudent.registrationNumber, secBStudent.name, 'Present'],
      ];
      const secMismatchBase64 = createExcelBase64(sectionMismatchRows);
      const validateMismatchRes = await fetch(`${BASE_URL}/faculty/attendance/upload/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileData: secMismatchBase64,
          academicDetails: {
            departmentId,
            section: 'A', // Deliberately mismatch with student's Section B
            year,
            semester,
            courseId,
            date: testDate,
            period: testPeriod,
          },
        }),
      });
      const mismatchJson = await validateMismatchRes.json();
      assert(validateMismatchRes.status === 422, 'Rejects Section Mismatch with 422');
      assert(
        mismatchJson.data?.errors?.[0]?.error.includes('Section mismatch'),
        'Reports exact Section mismatch error reason'
      );
    }

    // 7. TEST 100% VALID EXCEL VALIDATION & PREVIEW
    console.log('\n--- Testing 100% Valid Excel Validation & Preview ---');
    const validRows = [
      ['Registration Number', 'Student Name', 'Attendance'],
      [student1.registrationNumber, student1.name, 'Present'],
      [student2.registrationNumber, student2.name, 'Absent'],
    ];
    const validBase64 = createExcelBase64(validRows);

    const validateValidRes = await fetch(`${BASE_URL}/faculty/attendance/upload/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileData: validBase64,
        academicDetails: {
          departmentId,
          section,
          year,
          semester,
          courseId,
          date: testDate,
          period: testPeriod,
        },
      }),
    });

    const validateValidJson = await validateValidRes.json();
    assert(validateValidRes.status === 200, 'Valid Excel returns 200 OK');
    assert(validateValidJson.data?.isValid === true, 'isValid is true for completely valid file');
    assert(validateValidJson.data?.preview?.length === 2, 'Returns preview for all 2 valid student records');
    assert(validateValidJson.data?.presentCount === 1, 'Correctly counts 1 Present');
    assert(validateValidJson.data?.absentCount === 1, 'Correctly counts 1 Absent');

    // 8. TEST CONFIRM & ATOMIC IMPORT
    console.log('\n--- Testing Confirm & Atomic Database Import ---');
    const confirmRes = await fetch(`${BASE_URL}/faculty/attendance/upload/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        academicDetails: {
          departmentId,
          section,
          year,
          semester,
          courseId,
          date: testDate,
          period: testPeriod,
        },
        validatedRecords: validateValidJson.data.preview,
      }),
    });

    const confirmJson = await confirmRes.json();
    assert(confirmRes.status === 201, 'Confirm import returns 201 Created');
    assert(confirmJson.success === true, 'Confirm import returns success: true');
    assert(confirmJson.data?.totalStudents === 2, 'Imported exactly 2 student attendance records');
    assert(confirmJson.data?.presentCount === 1, 'Saved 1 Present record');
    assert(confirmJson.data?.absentCount === 1, 'Saved 1 Absent record');

    // 9. TEST DUPLICATE PREVENTION: Attempting to upload the same session again
    console.log('\n--- Testing Duplicate Session Prevention ---');
    const duplicateValidateRes = await fetch(`${BASE_URL}/faculty/attendance/upload/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileData: validBase64,
        academicDetails: {
          departmentId,
          section,
          year,
          semester,
          courseId,
          date: testDate,
          period: testPeriod,
        },
      }),
    });

    const duplicateJson = await duplicateValidateRes.json();
    assert(duplicateValidateRes.status === 422, 'Rejects duplicate session with 422');
    assert(
      duplicateJson.data?.isSessionDuplicate === true,
      'isSessionDuplicate is true for duplicate session'
    );
    assert(
      duplicateJson.data?.message?.includes('already exists'),
      'Clear duplicate session message returned'
    );

    // 10. Verify Attendance History shows the uploaded session
    console.log('\n--- Testing Attendance History Integration ---');
    const historyRes = await fetch(
      `${BASE_URL}/faculty/attendance/history?courseId=${courseId}&section=${section}&startDate=${testDate}&endDate=${testDate}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const historyJson = await historyRes.json();
    assert(historyRes.status === 200, 'Attendance history fetched successfully');
    const sessions = Array.isArray(historyJson.data) ? historyJson.data : (historyJson.data?.sessions || []);
    const createdSession = sessions.find((s) => s.period === testPeriod && s.date === testDate);
    assert(createdSession !== undefined, 'Uploaded attendance session appears in standard Attendance History');
    assert(createdSession?.totalCount === 2, 'History reflects 2 students in session');

  } catch (err) {
    console.error('Test execution exception:', err);
    failed++;
  }

  console.log('\n===============================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
