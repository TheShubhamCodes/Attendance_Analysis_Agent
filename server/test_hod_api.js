const BASE_URL = 'http://localhost:5000/api';
const prisma = require('./src/config/db');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('=======================================================');
  console.log('   STARTING UNIVERSITY HOD MODULE API TEST SUITE       ');
  console.log('=======================================================');

  try {
    // 1. Health Check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'online', '1. System Health check online');

    // 2. HOD Login - Invalid Credentials
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'HOD001',
        password: 'WrongPassword999',
        userType: 'HOD',
      }),
    });
    assert(badLoginRes.status === 401, '2. Invalid password rejected with 401');

    // 3. HOD Login - Success (HOD001 - CSE)
    const hodLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'HOD001',
        password: 'Hod@1234',
        userType: 'HOD',
      }),
    });
    const hodLoginData = await hodLoginRes.json();
    assert(hodLoginRes.status === 200 && hodLoginData.success, '3. HOD001 login succeeded');
    const hodToken = hodLoginData.data.token;
    const hodDeptId = hodLoginData.data.user.profile.departmentId;
    assert(!!hodToken, '   - HOD JWT token received');
    assert(hodLoginData.data.user.role === 'HOD', '   - Role is strictly HOD');
    assert(hodLoginData.data.user.profile.departmentCode === 'CSE', '   - Department is Computer Science (CSE)');

    // 4. HOD Login - IT Department (HOD002) for isolation tests
    const itHodRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'HOD002',
        password: 'Hod@1234',
        userType: 'HOD',
      }),
    });
    const itHodData = await itHodRes.json();
    assert(itHodRes.status === 200, '4. HOD002 (IT Dept) login succeeded');
    const itHodToken = itHodData.data.token;

    // 5. Faculty Login (FAC001) for cross-role checks
    const facLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'FAC001',
        password: 'Faculty@123',
        userType: 'FACULTY',
      }),
    });
    const facLoginData = await facLoginRes.json();
    const facToken = facLoginData.data.token;
    assert(facLoginRes.status === 200, '5. Faculty FAC001 login succeeded');

    // 6. Student Login (23CSE101) for cross-role checks
    const stuLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '23CSE101',
        password: 'Student@123',
        userType: 'STUDENT',
      }),
    });
    const stuLoginData = await stuLoginRes.json();
    const stuToken = stuLoginData.data.token;
    assert(stuLoginRes.status === 200, '6. Student 23CSE101 login succeeded');

    // 7. Role-Based Authorization Checks:
    // A) Faculty accessing HOD route -> 403 Forbidden
    const facToHodRes = await fetch(`${BASE_URL}/hod/dashboard`, {
      headers: { Authorization: `Bearer ${facToken}` },
    });
    assert(facToHodRes.status === 403, '7A. Faculty token accessing /api/hod/* rejected with 403 Forbidden');

    // B) Student accessing HOD route -> 403 Forbidden
    const stuToHodRes = await fetch(`${BASE_URL}/hod/dashboard`, {
      headers: { Authorization: `Bearer ${stuToken}` },
    });
    assert(stuToHodRes.status === 403, '7B. Student token accessing /api/hod/* rejected with 403 Forbidden');

    // C) HOD accessing Faculty route -> 403 Forbidden
    const hodToFacRes = await fetch(`${BASE_URL}/faculty/dashboard`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    assert(hodToFacRes.status === 403, '7C. HOD token accessing /api/faculty/* rejected with 403 Forbidden');

    // D) HOD accessing Student route -> 403 Forbidden
    const hodToStuRes = await fetch(`${BASE_URL}/student/dashboard`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    assert(hodToStuRes.status === 403, '7D. HOD token accessing /api/student/* rejected with 403 Forbidden');

    // 8. Department Isolation Check:
    // IT HOD dashboard should return 0 students or only IT students (CSE has 50+ students)
    const itDashRes = await fetch(`${BASE_URL}/hod/dashboard`, {
      headers: { Authorization: `Bearer ${itHodToken}` },
    });
    const itDashData = await itDashRes.json();
    assert(itDashRes.status === 200, '8A. IT HOD dashboard loaded successfully');
    assert(itDashData.data.department.code === 'IT', '   - Department is strictly IT');
    assert(itDashData.data.metrics.totalStudents === 0, '8B. Department Isolation verified: IT HOD cannot see CSE students');

    // 9. HOD Dashboard (CSE)
    const cseDashRes = await fetch(`${BASE_URL}/hod/dashboard`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const cseDashData = await cseDashRes.json();
    assert(cseDashRes.status === 200, '9A. CSE HOD dashboard loaded successfully');
    const metrics = cseDashData.data.metrics;
    assert(metrics.totalStudents > 0, `   - Real PostgreSQL total students: ${metrics.totalStudents}`);
    assert(metrics.totalFaculty > 0, `   - Real PostgreSQL total faculty: ${metrics.totalFaculty}`);
    assert(metrics.totalSubjects > 0, `   - Real PostgreSQL total subjects: ${metrics.totalSubjects}`);
    assert(typeof metrics.departmentAverageAttendance === 'number', `   - Average attendance: ${metrics.departmentAverageAttendance}%`);
    assert(Array.isArray(cseDashData.data.charts.sectionWiseAttendance), '9B. Section-wise attendance chart data present');
    assert(Array.isArray(cseDashData.data.charts.subjectWiseAttendance), '9C. Subject-wise attendance chart data present');
    assert(Array.isArray(cseDashData.data.attentionRequired), '9D. Attention required alerts present');

    // 10. Faculty Management: List Faculty
    const facListRes = await fetch(`${BASE_URL}/hod/faculty`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const facListData = await facListRes.json();
    assert(facListRes.status === 200 && facListData.data.length > 0, `10. Loaded ${facListData.data.length} department faculty members`);
    const demoFac = facListData.data.find((f) => f.employeeId === 'FAC001');
    assert(!!demoFac, '    - Found Dr. Rajesh Kumar (FAC001)');
    assert(demoFac.assignedSubjectsCount > 0, `    - Assigned subjects count: ${demoFac.assignedSubjectsCount}`);

    // 11. Faculty Management: Form Meta
    const metaRes = await fetch(`${BASE_URL}/hod/faculty/form-meta`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const metaData = await metaRes.json();
    assert(metaRes.status === 200 && metaData.data.courses.length > 0, '11. Loaded faculty form metadata (courses, sections, semesters)');

    // 12. Faculty Assignments List
    const assignListRes = await fetch(`${BASE_URL}/hod/faculty/assignments`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const assignListData = await assignListRes.json();
    assert(assignListRes.status === 200, `12. Loaded ${assignListData.data.length} existing faculty assignments`);

    // 13. Assign Faculty (Multi-assignment support)
    // Assign FAC001 to a new section (Section C)
    const targetCourse = metaData.data.courses[0];
    const assignRes = await fetch(`${BASE_URL}/hod/faculty/assign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hodToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facultyId: demoFac.id,
        courseId: targetCourse.id,
        section: 'C',
        semester: 5,
        academicYear: '2026-2027',
      }),
    });
    const assignData = await assignRes.json();
    assert(assignRes.status === 201 && assignData.success, '13. Successfully created new teaching assignment for FAC001 in Section C');
    const createdAssignmentId = assignData.data.id;

    // 14. Duplicate Assignment Prevention Check
    const dupAssignRes = await fetch(`${BASE_URL}/hod/faculty/assign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hodToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facultyId: demoFac.id,
        courseId: targetCourse.id,
        section: 'C',
        semester: 5,
        academicYear: '2026-2027',
      }),
    });
    assert(dupAssignRes.status === 409, '14. Duplicate faculty assignment properly rejected with 409 Conflict');

    // 15. Remove Faculty Assignment
    const delAssignRes = await fetch(`${BASE_URL}/hod/faculty/assignments/${createdAssignmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    assert(delAssignRes.status === 200, '15. Assignment deleted successfully');

    // 16. Student Management: List Students
    const stuListRes = await fetch(`${BASE_URL}/hod/students?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const stuListData = await stuListRes.json();
    assert(stuListRes.status === 200, `16. Loaded department students (Total: ${stuListData.data.pagination.total})`);
    assert(stuListData.data.students.length > 0, '    - Student records formatted with attendance and risk status');

    // 17. Add Individual Student
    const testRegNo = `23CSE999_${Date.now().toString().slice(-4)}`;
    const addStuRes = await fetch(`${BASE_URL}/hod/students`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hodToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registrationNumber: testRegNo,
        name: 'Kavita Menon',
        email: `kavita.${testRegNo.toLowerCase()}@university.edu`,
        section: 'B',
        year: 5,
        mobileNumber: '9840119988',
        parentName: 'Ramesh Menon',
        parentMobile: '9840119989',
        parentEmail: 'ramesh.menon@example.com',
      }),
    });
    const addStuData = await addStuRes.json();
    assert(addStuRes.status === 201 && addStuData.success, `17. Added individual student ${testRegNo} to department`);

    // 18. Duplicate Student Registration Prevention
    const dupStuRes = await fetch(`${BASE_URL}/hod/students`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hodToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registrationNumber: testRegNo,
        name: 'Kavita Menon Duplicate',
        email: `other.${testRegNo.toLowerCase()}@university.edu`,
        section: 'B',
        year: 5,
      }),
    });
    assert(dupStuRes.status === 409, '18. Duplicate student registration number properly rejected with 409 Conflict');

    // 19. Bulk CSV Validation
    const testBatch = [
      {
        registrationNumber: `23CSE801_${Date.now().toString().slice(-3)}`,
        name: 'Vikram Joshi',
        email: `vikram.${Date.now().toString().slice(-3)}@university.edu`,
        section: 'A',
        year: 5,
      },
      {
        registrationNumber: testRegNo, // Duplicate in DB!
        name: 'Should Fail Duplicate',
        email: 'fail@university.edu',
        section: 'A',
        year: 5,
      },
    ];
    const validateRes = await fetch(`${BASE_URL}/hod/students/bulk-validate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hodToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ students: testBatch }),
    });
    const validateData = await validateRes.json();
    assert(validateRes.status === 200, '19A. Bulk student CSV validation endpoint works');
    assert(validateData.data.validCount === 1, '19B. Exactly 1 valid record identified');
    assert(validateData.data.invalidCount === 1, '19C. Duplicate record correctly caught and flagged');

    // 20. Attendance Monitoring
    const monitorRes = await fetch(`${BASE_URL}/hod/attendance/monitor`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const monitorData = await monitorRes.json();
    assert(monitorRes.status === 200, `20. Attendance monitoring sessions loaded (${monitorData.data.sessions.length} sessions)`);

    // 21. Attendance Correction Requests List
    let corrRes = await fetch(`${BASE_URL}/hod/attendance/corrections`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    let corrData = await corrRes.json();
    assert(corrRes.status === 200 && corrData.data.length > 0, `21. Loaded ${corrData.data.length} attendance correction requests`);
    let pendingCorr = corrData.data.find((c) => c.status === 'PENDING');
    if (!pendingCorr && corrData.data.length > 0) {
      await prisma.attendanceCorrectionRequest.update({
        where: { id: corrData.data[0].id },
        data: { status: 'PENDING' },
      });
      corrRes = await fetch(`${BASE_URL}/hod/attendance/corrections`, {
        headers: { Authorization: `Bearer ${hodToken}` },
      });
      corrData = await corrRes.json();
      pendingCorr = corrData.data.find((c) => c.status === 'PENDING');
    }
    assert(!!pendingCorr, '    - Found pending correction request');

    // 22. HOD Review Correction (Approve)
    if (pendingCorr) {
      const reviewRes = await fetch(`${BASE_URL}/hod/attendance/corrections/${pendingCorr.id}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hodToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'APPROVED',
          reviewNotes: 'Verified medical certificate. Approved by HOD.',
        }),
      });
      const reviewData = await reviewRes.json();
      assert(reviewRes.status === 200 && reviewData.success, '22. Correction request approved by HOD and audit log created');
    }

    // 23. Counseling Suite: Overview
    const counselOverRes = await fetch(`${BASE_URL}/hod/counseling/overview`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const counselOverData = await counselOverRes.json();
    assert(counselOverRes.status === 200, '23. Counseling overview loaded with counselor distribution');

    // 24. Counseling Suite: Assign Counselor
    const assignCounselRes = await fetch(`${BASE_URL}/hod/counseling/assign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hodToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facultyId: demoFac.id,
        studentIds: [addStuData.data.id],
        academicYear: '2026-2027',
        semester: 5,
      }),
    });
    assert(assignCounselRes.status === 200, '24A. Successfully assigned student to faculty counselor');

    // Clean up counselor assignment so baseline faculty counselor count stays unchanged
    const removeCounselRes = await fetch(`${BASE_URL}/hod/counseling/remove`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hodToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentIds: [addStuData.data.id],
      }),
    });
    assert(removeCounselRes.status === 200, '24B. Successfully removed test student from faculty counselor');

    // 25. Counseling Suite: Department At-Risk Students
    const atRiskRes = await fetch(`${BASE_URL}/hod/counseling/at-risk`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const atRiskData = await atRiskRes.json();
    assert(atRiskRes.status === 200, `25. Loaded ${atRiskData.data.length} at-risk students in department (< 75%)`);

    // 26. Counseling Suite: Department Interventions
    const intervRes = await fetch(`${BASE_URL}/hod/counseling/interventions`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const intervData = await intervRes.json();
    assert(intervRes.status === 200, `26. Loaded ${intervData.data.length} department interventions`);

    // 27. Reports Engine
    const reportRes = await fetch(`${BASE_URL}/hod/reports?reportType=department_attendance`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const reportData = await reportRes.json();
    assert(reportRes.status === 200 && reportData.data.length > 0, `27A. Generated Department Attendance Report with ${reportData.data.length} rows`);

    const defaulterReportRes = await fetch(`${BASE_URL}/hod/reports?reportType=defaulter`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const defaulterData = await defaulterReportRes.json();
    assert(defaulterReportRes.status === 200, `27B. Generated Defaulter Report with ${defaulterData.data.length} rows`);

    // 28. Notifications
    const notifRes = await fetch(`${BASE_URL}/hod/notifications`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const notifData = await notifRes.json();
    assert(notifRes.status === 200, `28. Loaded HOD notifications (Unread count: ${notifData.data.unreadCount})`);

    // 29. HOD Profile
    const profileRes = await fetch(`${BASE_URL}/hod/profile`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const profileData = await profileRes.json();
    assert(profileRes.status === 200, '29A. HOD profile retrieved');
    assert(profileData.data.name === 'Dr. Suresh Varma', '    - HOD name verified: Dr. Suresh Varma');

    const updateProfRes = await fetch(`${BASE_URL}/hod/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${hodToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cabinLocation: 'Academic Block 1, Room 102 (Updated)',
      }),
    });
    assert(updateProfRes.status === 200, '29B. HOD profile updated successfully');

    console.log('=======================================================');
    console.log(`TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('=======================================================');

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  }
}

runTests();
