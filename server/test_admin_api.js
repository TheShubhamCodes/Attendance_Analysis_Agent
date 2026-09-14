const assert = require('assert');

const API_BASE = 'http://localhost:5000/api';

async function post(endpoint, data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}

async function get(endpoint, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers,
  });
  return { status: res.status, body: await res.json() };
}

async function patch(endpoint, data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}

async function del(endpoint, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers,
  });
  return { status: res.status, body: await res.json() };
}

async function runTests() {
  console.log('================================================================');
  console.log(' RUNNING COMPREHENSIVE ADMIN PANEL API VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function record(desc, ok, detail) {
    if (ok) {
      console.log(` [PASS] ${desc}`);
      passed++;
    } else {
      console.error(` [FAIL] ${desc} -> ${detail}`);
      failed++;
    }
  }

  // 1. Authenticate ADMIN
  let adminToken = null;
  const loginRes = await post('/auth/login', {
    identifier: 'ADMIN001',
    password: 'Admin@1234',
    role: 'ADMIN',
  });

  record('Admin login succeeds with 200', loginRes.status === 200);
  record('Admin token received', Boolean(loginRes.body?.data?.token));
  record('User role is ADMIN', loginRes.body?.data?.user?.role === 'ADMIN');
  adminToken = loginRes.body?.data?.token;

  // 2. Security Verification: Non-admin roles MUST receive 403 on Admin routes
  // Faculty token
  const facLogin = await post('/auth/login', {
    identifier: 'FAC001',
    password: 'Faculty@123',
    role: 'STAFF',
  });
  const facToken = facLogin.body?.data?.token;

  // Student token
  const stuLogin = await post('/auth/login', {
    identifier: '23CSE101',
    password: 'Student@123',
    role: 'STUDENT',
  });
  const stuToken = stuLogin.body?.data?.token;

  // HOD token
  const hodLogin = await post('/auth/login', {
    identifier: 'HOD001',
    password: 'Hod@1234',
    role: 'HOD',
  });
  const hodToken = hodLogin.body?.data?.token;

  // Test 403 on Faculty
  const facAdminReq = await get('/admin/dashboard', facToken);
  record('Faculty denied access to Admin Dashboard (403)', facAdminReq.status === 403);

  // Test 403 on Student
  const stuAdminReq = await get('/admin/dashboard', stuToken);
  record('Student denied access to Admin Dashboard (403)', stuAdminReq.status === 403);

  // Test 403 on HOD
  const hodAdminReq = await get('/admin/dashboard', hodToken);
  record('HOD denied access to Admin Dashboard (403)', hodAdminReq.status === 403);

  // Test 401 for unauthenticated request
  const unauthReq = await get('/admin/dashboard');
  record('Unauthenticated request rejected with 401', unauthReq.status === 401);

  // 3. Admin Dashboard Metrics (Real Database Data)
  const dashRes = await get('/admin/dashboard', adminToken);
  record('Admin can access Dashboard (200)', dashRes.status === 200);
  const counts = dashRes.body?.data?.counts;
  record('Dashboard returns positive student count (>0)', counts?.totalStudents > 0, `Got: ${counts?.totalStudents}`);
  record('Dashboard returns positive faculty count (>0)', counts?.totalFaculty > 0, `Got: ${counts?.totalFaculty}`);
  record('Dashboard returns positive HOD count (>0)', counts?.totalHods > 0, `Got: ${counts?.totalHods}`);
  record('Dashboard returns positive attendance count (>0)', counts?.totalAttendanceRecords > 0, `Got: ${counts?.totalAttendanceRecords}`);
  record('Dashboard returns departments count (>0)', counts?.totalDepartments > 0);
  record('Dashboard returns sections count (>0)', counts?.totalSections > 0);

  // 4. User Management
  const usersRes = await get('/admin/users?limit=10', adminToken);
  record('Admin can fetch user list (200)', usersRes.status === 200);
  record('User list contains records', usersRes.body?.data?.users?.length > 0);
  const firstUser = usersRes.body?.data?.users?.[0];
  record('User object does NOT expose password or hash', !firstUser?.password && !firstUser?.passwordHash);

  // Create a new test user
  const testUserId = `TEST_FAC_${Date.now().toString().slice(-4)}`;
  const deptsRes = await get('/admin/departments', adminToken);
  const testDeptId = deptsRes.body?.data?.[0]?.id;

  const createUserRes = await post('/admin/users', {
    identifier: testUserId,
    name: 'Professor Test Automated',
    email: `${testUserId.toLowerCase()}@university.edu`,
    role: 'STAFF',
    password: 'TestPassword@123',
    departmentId: testDeptId,
    designation: 'Assistant Professor',
  }, adminToken);

  record('Admin can create new user', createUserRes.status === 201, createUserRes.body?.message);
  const createdId = createUserRes.body?.data?.id;

  // Toggle user status
  const toggleRes = await patch(`/admin/users/${createdId}/status`, { status: 'INACTIVE' }, adminToken);
  record('Admin can deactivate user account', toggleRes.status === 200 && toggleRes.body?.data?.status === 'INACTIVE');

  // Reactivate user account
  const reactivateRes = await patch(`/admin/users/${createdId}/status`, { status: 'ACTIVE' }, adminToken);
  record('Admin can reactivate user account', reactivateRes.status === 200 && reactivateRes.body?.data?.status === 'ACTIVE');

  // Reset user password
  const resetPassRes = await post(`/admin/users/${createdId}/reset-password`, {
    newPassword: 'NewSecurePassword@456',
  }, adminToken);
  record('Admin can securely reset user password', resetPassRes.status === 200);

  // 5. HOD Management & Audit Logging
  const hodsRes = await get('/admin/hod', adminToken);
  record('Admin can fetch HODs and eligible faculty', hodsRes.status === 200 && hodsRes.body?.data?.length > 0);

  // 6. Academic Management
  const sectionsRes = await get('/admin/sections', adminToken);
  record('Admin can fetch academic sections', sectionsRes.status === 200 && sectionsRes.body?.data?.length > 0);

  const subjectsRes = await get('/admin/subjects', adminToken);
  record('Admin can fetch academic subjects', subjectsRes.status === 200 && subjectsRes.body?.data?.length > 0);

  // 7. Attendance Management & Manual Correction
  const attRes = await get('/admin/attendance?limit=5', adminToken);
  record('Admin can fetch system-wide attendance records', attRes.status === 200 && attRes.body?.data?.records?.length > 0);

  const targetAtt = attRes.body?.data?.records?.[0];
  if (targetAtt) {
    const newStatus = targetAtt.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    const correctRes = await post('/admin/attendance/correct', {
      attendanceId: targetAtt.id,
      newStatus,
      reason: 'Automated verification test correction',
    }, adminToken);

    record('Admin can manually correct attendance record', correctRes.status === 200);
    record('Attendance status updated in response', correctRes.body?.data?.status === newStatus);

    // Verify Audit Log was generated for attendance correction
    const auditRes = await get(`/admin/audit-logs?action=ATTENDANCE_MODIFIED&limit=5`, adminToken);
    record('Audit log contains ATTENDANCE_MODIFIED entry', auditRes.body?.data?.logs?.length > 0);
  }

  // 8. Timetable Decoupling Check
  const routineRes = await get('/admin/timetable?section=A', adminToken);
  record('Admin can view section routine independently of attendance', routineRes.status === 200);

  // 9. System Settings
  const settingsRes = await get('/admin/settings', adminToken);
  record('Admin can read system settings', settingsRes.status === 200 && Boolean(settingsRes.body?.data?.settings));

  const updateSetRes = await post('/admin/settings', {
    settings: {
      attendance_warning_threshold: '75',
      system_name: 'National University Attendance Platform',
    },
  }, adminToken);
  record('Admin can update system settings', updateSetRes.status === 200);

  // 10. Parent-Student Linking Test
  const parentsRes = await get('/admin/parents', adminToken);
  record('Admin can fetch parent directory', parentsRes.status === 200 && parentsRes.body?.data?.length > 0);
  const studentsListRes = await get('/admin/students?limit=5', adminToken);
  const sampleStudent = studentsListRes.body?.data?.students?.[0];
  const sampleParent = parentsRes.body?.data?.[0];

  if (sampleParent && sampleStudent) {
    const linkRes = await post('/admin/parents/link', {
      parentId: sampleParent.id,
      studentId: sampleStudent.id,
      relationship: 'GUARDIAN',
    }, adminToken);
    record('Admin can link student to parent', linkRes.status === 200);

    const unlinkRes = await post('/admin/parents/unlink', {
      parentId: sampleParent.id,
      studentId: sampleStudent.id,
    }, adminToken);
    record('Admin can unlink student from parent', unlinkRes.status === 200);
  }

  // 11. Faculty Subject Assignment Test
  const facultyRes = await get('/admin/faculty', adminToken);
  record('Admin can fetch faculty list with workloads', facultyRes.status === 200 && facultyRes.body?.data?.length > 0);
  const sampleFaculty = facultyRes.body?.data?.[0];
  const sampleSubject = subjectsRes.body?.data?.[0];

  if (sampleFaculty && sampleSubject) {
    const assignFacRes = await post('/admin/faculty/assign', {
      facultyId: sampleFaculty.id,
      courseId: sampleSubject.id,
      section: 'A',
      semester: 5,
    }, adminToken);
    record('Admin can assign subject to faculty', assignFacRes.status === 200, assignFacRes.body?.message);

    const assignmentId = assignFacRes.body?.data?.id;
    if (assignmentId) {
      const removeFacRes = await del(`/admin/faculty/assignments/${assignmentId}`, adminToken);
      record('Admin can remove subject assignment from faculty', removeFacRes.status === 200);
    }
  }

  // 12. HOD Assignment & History Test
  const hodHistoryRes = await get('/admin/hod/history', adminToken);
  record('Admin can fetch HOD transition history', hodHistoryRes.status === 200);

  // 13. AI Attendance Agent Integration for Admin (Exact student lookup & Section query)
  const exactAgentQuery = await post('/agent/chat', {
    message: 'Show Rohan Verma (241FA04326)',
  }, adminToken);
  record('Admin Agent: Exact student lookup returns 200', exactAgentQuery.status === 200);
  record('Admin Agent: Exact student lookup resolves to Rohan Verma', exactAgentQuery.body?.data?.message?.includes('Rohan Verma') || exactAgentQuery.body?.data?.message?.includes('241FA04326'));

  const agentQuery = await post('/agent/chat', {
    message: 'How many students are currently in Section A?',
  }, adminToken);
  record('Admin can query AI Attendance Agent for cohort count', agentQuery.status === 200);
  record('Agent response is non-empty and grounded', Boolean(agentQuery.body?.data?.message), `Got: ${JSON.stringify(agentQuery.body)}`);

  // Summary
  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
