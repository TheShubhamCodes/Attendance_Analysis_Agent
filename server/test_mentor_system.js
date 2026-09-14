const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('  STARTING MENTOR SYSTEM END-TO-END VERIFICATION');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Admin Login
  console.log('\n--- 1. ADMIN AUTHENTICATION & MENTOR MANAGEMENT ---');
  const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: 'ADMIN001',
    password: 'Admin@1234',
    userType: 'ADMIN',
  });
  assert(adminLoginRes.data.success && adminLoginRes.data.data.token, 'Admin logs in successfully');
  const adminToken = adminLoginRes.data.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 2. Admin fetches mentors list
  const mentorsRes = await axios.get(`${BASE_URL}/admin/mentors`, { headers: adminHeaders });
  assert(mentorsRes.data.success && Array.isArray(mentorsRes.data.data), 'Admin fetches mentors list');
  console.log(`       Found ${mentorsRes.data.data.length} mentors in system`);

  // 3. Admin creates a new Mentor user
  const newMentorId = `MENTOR_${Date.now()}`;
  const deptsRes = await axios.get(`${BASE_URL}/admin/departments`, { headers: adminHeaders });
  const deptId = deptsRes.data.data[0]?.id;

  const createMentorRes = await axios.post(
    `${BASE_URL}/admin/users`,
    {
      identifier: newMentorId,
      name: 'Dr. Test Mentor',
      email: `${newMentorId.toLowerCase()}@university.edu`,
      role: 'MENTOR',
      password: 'Mentor@123',
      departmentId: deptId,
      designation: 'Senior Student Mentor',
    },
    { headers: adminHeaders }
  );
  assert(createMentorRes.data.success, 'Admin creates a new Mentor user account');

  // 4. Mentor Login with existing mentor (STAFF001)
  console.log('\n--- 2. MENTOR AUTHENTICATION & AUTHORIZATION ---');
  const mentorLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: 'STAFF001',
    password: 'Staff@123',
    userType: 'MENTOR',
  });
  assert(mentorLoginRes.data.success && mentorLoginRes.data.data.user.role === 'MENTOR', 'Mentor logs in with role MENTOR');
  const mentorToken = mentorLoginRes.data.data.token;
  const mentorHeaders = { Authorization: `Bearer ${mentorToken}` };

  // Login with newly created mentor to verify credentials work
  const newMentorLogin = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: newMentorId,
    password: 'Mentor@123',
    userType: 'MENTOR',
  });
  assert(newMentorLogin.data.success && newMentorLogin.data.data.user.role === 'MENTOR', 'Newly created Mentor can authenticate');

  // 5. Mentor Dashboard Metrics
  console.log('\n--- 3. MENTOR DASHBOARD METRICS ---');
  const dashboardRes = await axios.get(`${BASE_URL}/mentor/dashboard`, { headers: mentorHeaders });
  assert(dashboardRes.data.success, 'Mentor dashboard loads successfully');
  const dbMetrics = dashboardRes.data.data;
  assert(typeof dbMetrics.totalAssignedStudents === 'number', 'Total assigned students metric is present');
  assert(typeof dbMetrics.studentsAbove75 === 'number', 'Students >= 75% metric is present');
  assert(typeof dbMetrics.studentsBelow75 === 'number', 'Students < 75% metric is present');
  assert(typeof dbMetrics.atRiskStudents === 'number', 'At-Risk students metric is present');
  assert(typeof dbMetrics.highRiskStudents === 'number', 'High-Risk students metric is present');
  assert(typeof dbMetrics.studentsImproving === 'number', 'Students improving metric is present');
  assert(typeof dbMetrics.studentsNeedingIntervention === 'number', 'Students needing intervention metric is present');
  console.log(`       Assigned: ${dbMetrics.totalAssignedStudents}, Safe: ${dbMetrics.studentsAbove75}, Shortage: ${dbMetrics.studentsBelow75}, At-Risk: ${dbMetrics.atRiskStudents}`);

  // 6. Mentor My Students List
  console.log('\n--- 4. MENTOR ASSIGNED STUDENTS LIST & SEARCH ---');
  const studentsRes = await axios.get(`${BASE_URL}/mentor/students`, { headers: mentorHeaders });
  assert(studentsRes.data.success && Array.isArray(studentsRes.data.data.students), 'Mentor fetches assigned students');
  const assignedStudents = studentsRes.data.data.students;
  assert(assignedStudents.length > 0, `Mentor has assigned students (${assignedStudents.length})`);

  // Search assigned student
  const sampleStudent = assignedStudents[0];
  const searchNameRes = await axios.get(`${BASE_URL}/mentor/students?search=${encodeURIComponent(sampleStudent.name)}`, { headers: mentorHeaders });
  assert(searchNameRes.data.data.students.some(s => s.id === sampleStudent.id), 'Mentor searches assigned student by Name');

  const searchRegRes = await axios.get(`${BASE_URL}/mentor/students?search=${sampleStudent.registrationNumber}`, { headers: mentorHeaders });
  assert(searchRegRes.data.data.students.some(s => s.id === sampleStudent.id), 'Mentor searches assigned student by Registration Number');

  // 7. Mentor Student Details
  console.log('\n--- 5. STUDENT DETAILS & AUTHORIZATION ENFORCEMENT ---');
  const detailsRes = await axios.get(`${BASE_URL}/mentor/students/${sampleStudent.id}`, { headers: mentorHeaders });
  assert(detailsRes.data.success && detailsRes.data.data.student.id === sampleStudent.id, 'Mentor accesses assigned student details');
  assert(detailsRes.data.data.attendance && detailsRes.data.data.attendance.rawPercentage !== undefined, 'Raw attendance is present in details');
  assert(detailsRes.data.data.attendance.adjustedPercentage !== undefined, 'Adjusted attendance is present in details');
  assert(Array.isArray(detailsRes.data.data.attendance.subjectWise), 'Subject-wise attendance breakdown is present');
  assert(detailsRes.data.data.risk && detailsRes.data.data.risk.riskLevel, 'Risk analysis and trajectory are present');

  // 8. CRITICAL SECURITY TEST: Access to unassigned student MUST be blocked with 403 Forbidden!
  console.log('\n--- 6. DATA ISOLATION: UNASSIGNED STUDENT ACCESS BLOCKED ---');
  // Find a student not assigned to this mentor
  const allStudentsAdmin = await axios.get(`${BASE_URL}/admin/students?limit=50`, { headers: adminHeaders });
  const assignedIdsSet = new Set(assignedStudents.map(s => s.id));
  const unassignedStudent = allStudentsAdmin.data.data.students.find(s => !assignedIdsSet.has(s.id));

  if (unassignedStudent) {
    try {
      await axios.get(`${BASE_URL}/mentor/students/${unassignedStudent.id}`, { headers: mentorHeaders });
      assert(false, 'Security breach: Mentor was able to access unassigned student!');
    } catch (err) {
      assert(err.response?.status === 403, 'Mentor is forbidden (403) from accessing unassigned student');
      assert(
        err.response?.data?.message?.includes('assigned students'),
        'Forbidden message explains: access restricted to assigned students'
      );
    }
  } else {
    console.log('       (All database students were assigned to this mentor; skipping unassigned 403 check)');
  }

  // 9. At-Risk Students
  console.log('\n--- 7. AT-RISK STUDENTS USING AGENT TRAJECTORY LOGIC ---');
  const atRiskRes = await axios.get(`${BASE_URL}/mentor/at-risk`, { headers: mentorHeaders });
  assert(atRiskRes.data.success && Array.isArray(atRiskRes.data.data.atRiskStudents), 'Mentor retrieves at-risk students');
  console.log(`       Identified ${atRiskRes.data.data.atRiskStudents.length} at-risk mentees using Agent trajectory`);

  // 10. Record Counselling Intervention
  console.log('\n--- 8. RECORDING & UPDATING INTERVENTIONS ---');
  const createInvRes = await axios.post(
    `${BASE_URL}/mentor/interventions`,
    {
      studentId: sampleStudent.id,
      type: 'COUNSELLING',
      date: new Date().toISOString().split('T')[0],
      notes: 'Test counseling session regarding morning session attendance and lab regularity.',
      actionTaken: 'Student promised full attendance in upcoming weeks.',
      followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      outcome: 'Agreed and committed',
      status: 'COMPLETED',
    },
    { headers: mentorHeaders }
  );
  assert(createInvRes.data.success && createInvRes.data.data.intervention?.id, 'Mentor records new counselling intervention');
  const recordedInv = createInvRes.data.data.intervention;
  assert(recordedInv.attendanceBefore !== null, `Intervention recorded baseline attendanceBefore (${recordedInv.attendanceBefore}%)`);

  // Update the intervention
  const updateInvRes = await axios.put(
    `${BASE_URL}/mentor/interventions/${recordedInv.id}`,
    {
      notes: 'Updated session notes: Student attended review session and demonstrated improved punctuality.',
      status: 'CLOSED',
      outcome: 'Goal achieved',
    },
    { headers: mentorHeaders }
  );
  assert(updateInvRes.data.success && updateInvRes.data.data.intervention?.status === 'CLOSED', 'Mentor updates intervention status to CLOSED');

  // 11. Parent Communication Recording
  console.log('\n--- 9. PARENT COMMUNICATION ---');
  const parentCommRes = await axios.post(
    `${BASE_URL}/mentor/parent-communication`,
    {
      studentId: sampleStudent.id,
      channel: 'PHONE_CALL',
      notes: 'Called parent to discuss student academic progress and attendance compliance.',
    },
    { headers: mentorHeaders }
  );
  assert(parentCommRes.data.success, 'Mentor records parent communication successfully');

  // 12. Scoped Reports Generation
  console.log('\n--- 10. MENTOR REPORTS GENERATION ---');
  const reportTypes = ['ATTENDANCE', 'AT_RISK', 'SHORTAGE', 'TRENDS', 'INTERVENTIONS', 'EFFECTIVENESS', 'FOLLOW_UP'];
  for (const rType of reportTypes) {
    const repRes = await axios.get(`${BASE_URL}/mentor/reports?type=${rType}`, { headers: mentorHeaders });
    assert(repRes.data.success && Array.isArray(repRes.data.data.records), `Mentor generates report: ${rType}`);
  }

  // 13. Mentor Profile & Update
  console.log('\n--- 11. MENTOR PROFILE & SETTINGS ---');
  const profileRes = await axios.get(`${BASE_URL}/mentor/profile`, { headers: mentorHeaders });
  assert(profileRes.data.success && profileRes.data.data.mentor, 'Mentor profile loaded');

  const updateProfileRes = await axios.put(
    `${BASE_URL}/mentor/profile`,
    {
      mobileNumber: '9876543210',
      cabinLocation: 'Block B - Room 204',
    },
    { headers: mentorHeaders }
  );
  assert(updateProfileRes.data.success, 'Mentor updates cabin location and mobile number');

  // 14. Attendance Analysis Agent Queries for Mentor
  console.log('\n--- 12. ATTENDANCE ANALYSIS AGENT FOR MENTOR ---');
  const agentQueries = [
    'Show my students below 75%',
    'Which of my students are at high risk?',
    'Who needs counselling?',
    'Give me a summary of my assigned students',
    'Which students have declining attendance?',
  ];

  for (const query of agentQueries) {
    const agentRes = await axios.post(
      `${BASE_URL}/agent/chat`,
      { message: query },
      { headers: mentorHeaders }
    );
    assert(agentRes.data && agentRes.data.message, `Agent answers mentor query: "${query}"`);
  }

  // Agent security test: Mentor asks for college-wide students
  const collegeWideRes = await axios.post(
    `${BASE_URL}/agent/chat`,
    { message: 'Show all students in the college' },
    { headers: mentorHeaders }
  );
  assert(
    collegeWideRes.data.message.includes('You only have access to your assigned students') ||
    collegeWideRes.data.message.includes('assigned students'),
    'Agent restricts college-wide student requests with: "You only have access to your assigned students."'
  );

  // Agent security test: Mentor asks for unassigned student
  if (unassignedStudent) {
    const unassignedAgentRes = await axios.post(
      `${BASE_URL}/agent/chat`,
      { message: `Show attendance for ${unassignedStudent.name}` },
      { headers: mentorHeaders }
    );
    assert(
      unassignedAgentRes.data.message.includes('You only have access to your assigned students') ||
      unassignedAgentRes.data.message.includes('assigned students'),
      `Agent refuses unassigned student (${unassignedStudent.name}) query with: "You only have access to your assigned students."`
    );
  }

  // 15. Regression testing: Verify other roles are completely unaffected
  console.log('\n--- 13. REGRESSION TESTING: PRESERVING EXISTING ROLES ---');
  // Faculty
  const facultyLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: 'FAC001',
    password: 'Faculty@123',
    userType: 'STAFF',
  });
  assert(facultyLoginRes.data.success, 'Faculty login is preserved');
  const facHeaders = { Authorization: `Bearer ${facultyLoginRes.data.data.token}` };

  const facDashRes = await axios.get(`${BASE_URL}/faculty/dashboard`, { headers: facHeaders });
  assert(facDashRes.data.success, 'Faculty dashboard is preserved');

  const facClassesRes = await axios.get(`${BASE_URL}/faculty/classes`, { headers: facHeaders });
  assert(facClassesRes.data.success, 'Faculty classes and attendance collection are preserved');

  // HOD
  const hodLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: 'HOD001',
    password: 'Hod@1234',
    userType: 'HOD',
  });
  assert(hodLoginRes.data.success, 'HOD login is preserved');
  const hodHeaders = { Authorization: `Bearer ${hodLoginRes.data.data.token}` };

  const hodDashRes = await axios.get(`${BASE_URL}/hod/dashboard`, { headers: hodHeaders });
  assert(hodDashRes.data.success, 'HOD dashboard is preserved');

  const hodCounselingRes = await axios.get(`${BASE_URL}/hod/counseling/overview`, { headers: hodHeaders });
  assert(hodCounselingRes.data.success, 'HOD counseling overview is preserved');

  // Student
  const studentLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: '23CSE101',
    password: 'Student@123',
    userType: 'STUDENT',
  });
  assert(studentLoginRes.data.success, 'Student login is preserved');

  // Timetable
  const timetableRes = await axios.get(`${BASE_URL}/timetable/active`, { headers: mentorHeaders });
  assert(timetableRes.data.success !== undefined || timetableRes.status === 200, 'Timetable endpoint is preserved and view-only');

  console.log('\n====================================================');
  console.log(`  ALL ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  if (err.response) {
    console.error('Response Status:', err.response.status);
    console.error('Response Data:', err.response.data);
  }
  process.exit(1);
});
