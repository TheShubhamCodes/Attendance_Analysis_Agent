/**
 * Comprehensive Backend Automated Test Suite for Faculty System
 */
const http = require('http');

const BASE_URL = 'http://localhost:5000/api';
let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('--- STARTING FACULTY BACKEND TEST SUITE ---');

  try {
    // 1. Faculty Login with FAC001
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
    assert(loginRes.status === 200 && loginJson.data?.token, 'Faculty login succeeds with 200 and token');
    const facultyToken = loginJson.data?.token;
    assert(loginJson.data?.user?.profile?.employeeId === 'FAC001', 'Faculty profile has correct employeeId');

    // 2. Wrong password for faculty
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'FAC001',
        password: 'WrongPassword@123',
        userType: 'FACULTY',
      }),
    });
    assert(wrongPassRes.status === 401, 'Faculty wrong password correctly returns 401');

    // 3. Student login for RBAC check
    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '23CSE101',
        password: 'Student@123',
        userType: 'STUDENT',
      }),
    });
    const studentLoginJson = await studentLoginRes.json();
    const studentToken = studentLoginJson.data?.token;

    // 4. RBAC: Student accessing Faculty Dashboard
    const studentAccessFacultyRes = await fetch(`${BASE_URL}/faculty/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentAccessFacultyRes.status === 403, 'Student token denied access (403) to Faculty Dashboard');

    // 5. RBAC: Faculty accessing Student Dashboard
    const facultyAccessStudentRes = await fetch(`${BASE_URL}/student/dashboard`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert(facultyAccessStudentRes.status === 403, 'Faculty token denied access (403) to Student Dashboard');

    // 6. Faculty Dashboard statistics (COUNSELOR-SCOPED)
    const dashRes = await fetch(`${BASE_URL}/faculty/dashboard`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const dashJson = await dashRes.json();
    assert(dashRes.status === 200 && dashJson.data?.stats, 'Faculty dashboard returns 200 with stats');
    assert(dashJson.data.stats.counselorStudentsCount === 20, 'Dashboard student count is strictly 20 counselor students');
    assert(typeof dashJson.data.stats.averageAttendance === 'number', 'Dashboard calculates counselor average attendance');
    assert(dashJson.data.stats.myClassesCount === 4, 'Dashboard shows 4 assigned classes');

    // 7. My Classes
    const classesRes = await fetch(`${BASE_URL}/faculty/classes`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const classesJson = await classesRes.json();
    assert(classesRes.status === 200 && classesJson.data.length === 4, 'My Classes returns exactly 4 assigned classes');
    const classA = classesJson.data.find(c => c.section === 'A' && c.courseCode === 'CS301');
    assert(classA && classA.enrolledStudentsCount > 0, 'Class contains enrolled students count');

    // 8. Classes Form Meta
    const formMetaRes = await fetch(`${BASE_URL}/faculty/classes/form-meta`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const formMetaJson = await formMetaRes.json();
    assert(formMetaRes.status === 200 && formMetaJson.data.departments.length > 0, 'Form metadata returns departments');

    // 9. Section Students (Max 50 per page)
    const studentsRes = await fetch(`${BASE_URL}/faculty/attendance/students?departmentId=${classA.departmentId}&section=A&courseId=${classA.courseId}&page=1&limit=50`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const studentsJson = await studentsRes.json();
    assert(studentsRes.status === 200 && studentsJson.data.students.length > 0, 'Returns section students list');
    assert(studentsJson.data.students.length <= 50, 'Enforces max 50 students per page limit');
    assert(studentsJson.data.students[0].registrationNumber, 'Students list contains registration numbers');

    // 10. Mark Attendance (New Session)
    const testDate = '2026-09-29';
    const testPeriod = 7;
    // Clean any prior test session for this exact slot
    const prismaClient = new (require('@prisma/client').PrismaClient)();
    await prismaClient.attendance.deleteMany({
      where: {
        courseId: classA.courseId,
        section: 'A',
        period: testPeriod,
        date: new Date(`${testDate}T00:00:00.000Z`),
      },
    });
    await prismaClient.$disconnect();

    const sampleStudents = studentsJson.data.students.slice(0, 5);
    const attendancePayload = {
      courseId: classA.courseId,
      section: 'A',
      semester: 5,
      period: testPeriod,
      date: testDate,
      attendanceList: sampleStudents.map((s, idx) => ({
        studentId: s.id,
        status: idx === 0 ? 'ABSENT' : 'PRESENT',
      })),
    };

    const markRes = await fetch(`${BASE_URL}/faculty/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify(attendancePayload),
    });
    const markJson = await markRes.json();
    assert(markRes.status === 201 && markJson.success, 'Mark attendance creates attendance records in PostgreSQL');

    // 11. Duplicate Attendance Prevention
    const duplicateRes = await fetch(`${BASE_URL}/faculty/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify(attendancePayload),
    });
    assert(duplicateRes.status === 409, 'Duplicate attendance session submission is rejected with 409 Conflict');

    // 12. Attendance History
    const historyRes = await fetch(`${BASE_URL}/faculty/attendance/history?section=A&courseId=${classA.courseId}`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const historyJson = await historyRes.json();
    assert(historyRes.status === 200 && historyJson.data.length > 0, 'Attendance history returns list of sessions');
    const recordedSession = historyJson.data.find(s => s.date === testDate && s.period === testPeriod);
    assert(recordedSession && recordedSession.totalCount === 5, 'History includes newly marked attendance session');

    // 13. OTP Flow: Request Edit OTP
    const otpReqRes = await fetch(`${BASE_URL}/faculty/attendance/request-edit-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        courseId: classA.courseId,
        section: 'A',
        date: testDate,
        period: testPeriod,
      }),
    });
    const otpReqJson = await otpReqRes.json();
    assert(otpReqRes.status === 200 && otpReqJson.data?.verificationId, 'Request Edit OTP generates verification record');
    const verificationId = otpReqJson.data?.verificationId;
    const devOtp = otpReqJson.data?.devOtpHint;

    // 14. Invalid OTP rejection
    const invalidOtpRes = await fetch(`${BASE_URL}/faculty/attendance/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        verificationId,
        otp: '000000',
      }),
    });
    assert(invalidOtpRes.status === 400, 'Invalid OTP is rejected with 400');

    // 15. Valid OTP verification
    const validOtpRes = await fetch(`${BASE_URL}/faculty/attendance/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        verificationId,
        otp: devOtp,
      }),
    });
    const validOtpJson = await validOtpRes.json();
    assert(validOtpRes.status === 200 && validOtpJson.success, 'Valid OTP verifies successfully');

    // 16. Edit Attendance with Reason and Audit Log
    const sessionDetailsRes = await fetch(`${BASE_URL}/faculty/attendance/session-students?courseId=${classA.courseId}&section=A&date=${testDate}&period=${testPeriod}`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const sessionDetailsJson = await sessionDetailsRes.json();
    const firstStudentAttendance = sessionDetailsJson.data[0];

    const editRes = await fetch(`${BASE_URL}/faculty/attendance/edit`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        verificationId,
        reason: 'Student arrived late with approved permission slip from HOD.',
        updates: [
          {
            attendanceId: firstStudentAttendance.attendanceId,
            newStatus: 'PRESENT',
          },
        ],
      }),
    });
    const editJson = await editRes.json();
    assert(editRes.status === 200 && editJson.success, 'Attendance edit succeeds after OTP verification');

    // 17. At-Risk Students (COUNSELOR-ASSIGNED ONLY)
    const atRiskRes = await fetch(`${BASE_URL}/faculty/at-risk`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const atRiskJson = await atRiskRes.json();
    assert(atRiskRes.status === 200 && atRiskJson.data.length > 0, 'At-risk endpoint returns counselor defaulters');
    assert(atRiskJson.data.every(s => s.overallAttendance < 75), 'All returned students have attendance < 75%');

    // 18. Predictor Data (COUNSELOR-ASSIGNED ONLY)
    const predictorRes = await fetch(`${BASE_URL}/faculty/predictor`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const predictorJson = await predictorRes.json();
    assert(predictorRes.status === 200 && predictorJson.data.length === 20, 'Predictor returns exactly 20 counselor students');
    assert(predictorJson.data[0].overall.totalClasses > 0, 'Predictor data includes real PostgreSQL total classes');

    // 19. Interventions
    const interventionsRes = await fetch(`${BASE_URL}/faculty/interventions`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const interventionsJson = await interventionsRes.json();
    assert(interventionsRes.status === 200 && interventionsJson.data.length > 0, 'Interventions list returned');

    // 20. Reports
    const reportsRes = await fetch(`${BASE_URL}/faculty/reports?reportType=defaulter`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const reportsJson = await reportsRes.json();
    assert(reportsRes.status === 200 && reportsJson.data.length > 0, 'Reports endpoint returns defaulter data');

    // 21. Student Search
    const searchRes = await fetch(`${BASE_URL}/faculty/students/search?query=Aarav`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const searchJson = await searchRes.json();
    assert(searchRes.status === 200 && searchJson.data.length > 0, 'Student search returns matching authorized student');

    // 22. Faculty Profile
    const profileRes = await fetch(`${BASE_URL}/faculty/profile`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const profileJson = await profileRes.json();
    assert(profileRes.status === 200 && profileJson.data.mobileNumber, 'Faculty profile returns registered mobile number');

    // 23. Profile Update: Mandatory mobile number validation
    const emptyMobileRes = await fetch(`${BASE_URL}/faculty/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({ mobileNumber: '' }),
    });
    assert(emptyMobileRes.status === 400, 'Empty mobile number is strictly rejected on profile update');

    console.log(`\n========================================`);
    console.log(`FACULTY TEST RESULTS: Passed: ${passed}, Failed: ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

// Ensure server is running before executing
setTimeout(runTests, 1000);
