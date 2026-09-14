async function runTests() {
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

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200 && healthJson.status === 'online', 'Health check endpoint works');

    // 2. Departments
    const deptRes = await fetch(`${BASE_URL}/auth/departments`);
    const deptJson = await deptRes.json();
    assert(deptRes.status === 200 && deptJson.data.length >= 3, 'Fetch departments returns list');
    const cseDeptId = deptJson.data.find(d => d.code === 'CSE')?.id;

    // 3. Student Login with correct password
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
    assert(studentLoginRes.status === 200 && studentLoginJson.data.token, 'Student login succeeds with 200 and JWT');
    const studentToken = studentLoginJson.data?.token;

    // 4. Student Login with wrong password
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '23CSE101',
        password: 'WrongPassword@999',
        userType: 'STUDENT',
      }),
    });
    const wrongPassJson = await wrongPassRes.json();
    assert(wrongPassRes.status === 401 && wrongPassJson.message === 'Invalid registration number or password.', 'Wrong password rejected with generic error');

    // 5. Parent Login with Parent password (same registration number 23CSE101!)
    const parentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '23CSE101',
        password: 'Parent@123',
        userType: 'PARENT',
      }),
    });
    const parentLoginJson = await parentLoginRes.json();
    assert(parentLoginRes.status === 200 && parentLoginJson.data.user.role === 'PARENT', 'Parent login succeeds with separate password');
    const parentToken = parentLoginJson.data?.token;

    // 6. RBAC: Parent trying to access Student-only routes
    const parentForbiddenRes = await fetch(`${BASE_URL}/student/dashboard`, {
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    assert(parentForbiddenRes.status === 403, 'Parent token denied access (403) to Student dashboard');

    // 7. Student accessing Dashboard
    const dashRes = await fetch(`${BASE_URL}/student/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const dashJson = await dashRes.json();
    assert(dashRes.status === 200 && dashJson.data.overallAttendance && dashJson.data.subjectWiseAttendance.length > 0, 'Student dashboard returns attendance & subjects');

    // 8. Student accessing Attendance Table
    const attRes = await fetch(`${BASE_URL}/student/attendance`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const attJson = await attRes.json();
    assert(attRes.status === 200 && attJson.data.subjects.length > 0, 'Student attendance table returns subject statistics');

    // 9. Student accessing Attendance Calendar
    const calRes = await fetch(`${BASE_URL}/student/attendance/calendar?month=8&year=2026`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const calJson = await calRes.json();
    assert(calRes.status === 200 && calJson.data.days, 'Attendance calendar returns dayMap');

    // 10. Student accessing Performance
    const perfRes = await fetch(`${BASE_URL}/student/performance`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const perfJson = await perfRes.json();
    assert(perfRes.status === 200 && perfJson.data.overallAverage > 0, 'Student performance returns assessments and averages');

    // 11. Student accessing AI Risk Analysis
    const riskRes = await fetch(`${BASE_URL}/student/risk`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const riskJson = await riskRes.json();
    assert(riskRes.status === 200 && ['LOW', 'MEDIUM', 'HIGH'].includes(riskJson.data.level) && riskJson.data.reasons.length > 0, 'Risk analysis returns rule-based reasons and recommendations');

    // 12. Student Notifications
    const notifRes = await fetch(`${BASE_URL}/student/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const notifJson = await notifRes.json();
    assert(notifRes.status === 200 && notifJson.data.notifications.length > 0, 'Student notifications fetched');
    const firstNotifId = notifJson.data.notifications[0].id;

    // 13. Mark Notification as Read
    const markReadRes = await fetch(`${BASE_URL}/student/notifications/${firstNotifId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(markReadRes.status === 200, 'Notification marked as read');

    // 14. Mentor Connection & Meeting Request
    const mentorRes = await fetch(`${BASE_URL}/student/mentor`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const mentorJson = await mentorRes.json();
    assert(mentorRes.status === 200 && mentorJson.data.mentor, 'Assigned mentor info retrieved');

    const meetReqRes = await fetch(`${BASE_URL}/student/mentor/meeting-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        reason: 'Academic Guidance & Attendance Improvement',
        preferredDate: '2026-09-22T10:00:00.000Z',
        message: 'Requesting review of Computer Networks marks and attendance makeup schedule.',
      }),
    });
    assert(meetReqRes.status === 201, 'Mentor meeting request created in PostgreSQL');

    // 15. Student Interventions
    const intervRes = await fetch(`${BASE_URL}/student/interventions`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const intervJson = await intervRes.json();
    assert(intervRes.status === 200 && intervJson.data.length > 0, 'Student intervention records retrieved');

    // 16. Student Registration
    const testRegNo = `24CSE201_${Date.now()}`;
    const regRes = await fetch(`${BASE_URL}/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationNumber: testRegNo,
        name: 'Priya Sundaram',
        email: `priya.${testRegNo.toLowerCase()}@university.edu`,
        dateOfBirth: '2005-08-20',
        departmentId: cseDeptId,
        year: 2,
        section: 'B',
        password: 'StudentSecure@2026',
        confirmPassword: 'StudentSecure@2026',
        parentName: 'Sundaram K',
        parentMobile: `984${Date.now().toString().slice(-7)}`,
        parentEmail: `sundaram.${testRegNo.toLowerCase()}@gmail.com`,
      }),
    });
    const regJson = await regRes.json();
    assert(regRes.status === 201 && regJson.message === 'Student account created successfully.', 'Student registration creates PostgreSQL records');

    // 17. Duplicate Student Registration Check
    const dupRes = await fetch(`${BASE_URL}/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationNumber: testRegNo,
        name: 'Another Student',
        email: 'another@university.edu',
        dateOfBirth: '2005-08-20',
        departmentId: cseDeptId,
        year: 2,
        section: 'B',
        password: 'StudentSecure@2026',
        confirmPassword: 'StudentSecure@2026',
        parentName: 'Sundaram K',
        parentMobile: '9840198401',
        parentEmail: 'sundaram.parent@gmail.com',
      }),
    });
    const dupJson = await dupRes.json();
    assert(dupRes.status === 400 && dupJson.message === 'An account with this registration number already exists.', 'Duplicate registration blocked with exact requirement message');

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runTests();
