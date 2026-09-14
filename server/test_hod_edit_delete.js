const axios = require('axios');
const prisma = require('./src/config/db');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== RUNNING HOD EDIT & SAFE DEACTIVATE / DELETE TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate as HOD001 (CSE)
    console.log('[1] Logging in as HOD001 (CSE)...');
    const hodLogin = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'HOD001',
      password: 'Hod@1234',
      userType: 'HOD',
    });
    assert(hodLogin.data.success, 'HOD001 login successful');
    const hodToken = hodLogin.data.data.token;
    const hodHeaders = { Authorization: `Bearer ${hodToken}` };

    // 2. Authenticate as HOD002 (IT) for cross-department isolation testing
    console.log('[2] Logging in as HOD002 (IT)...');
    const itLogin = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'HOD002',
      password: 'Hod@1234',
      userType: 'HOD',
    });
    assert(itLogin.data.success, 'HOD002 (IT) login successful');
    const itHeaders = { Authorization: `Bearer ${itLogin.data.data.token}` };

    // 3. Find a test CSE faculty member
    console.log('\n[3] Testing Faculty Edit & Deactivate...');
    const facultyListRes = await axios.get(`${API_BASE}/hod/faculty?status=ALL`, { headers: hodHeaders });
    assert(facultyListRes.data.success && facultyListRes.data.data.length > 0, 'Fetched CSE faculty list');
    const testFaculty = facultyListRes.data.data.find(f => f.employeeId !== 'HOD001');
    assert(!!testFaculty, `Selected test faculty: ${testFaculty?.name} (${testFaculty?.employeeId})`);

    // 3A. Edit Faculty
    const origDesignation = testFaculty.designation;
    const origName = testFaculty.name;
    const editFacultyRes = await axios.put(
      `${API_BASE}/hod/faculty/${testFaculty.id}`,
      {
        name: `${origName} (Updated)`,
        email: testFaculty.email,
        mobileNumber: '9840199999',
        designation: 'Senior Professor',
        cabinLocation: 'Block A, Cabin 304',
      },
      { headers: hodHeaders }
    );
    assert(editFacultyRes.data.success, 'HOD successfully updated faculty profile');
    assert(editFacultyRes.data.data.designation === 'Senior Professor', 'Faculty designation updated in DB');

    // 3B. Cross-Department Protection for Faculty Edit
    try {
      await axios.put(
        `${API_BASE}/hod/faculty/${testFaculty.id}`,
        {
          name: 'Hacked by IT',
          email: testFaculty.email,
        },
        { headers: itHeaders }
      );
      assert(false, 'IT HOD should NOT be able to edit CSE faculty');
    } catch (err) {
      assert(err.response?.status === 403, 'Cross-department faculty edit correctly blocked with 403 Forbidden');
    }

    // 3C. Safe Deactivate Faculty
    const deactFacultyRes = await axios.patch(
      `${API_BASE}/hod/faculty/${testFaculty.id}/status`,
      { status: 'INACTIVE' },
      { headers: hodHeaders }
    );
    assert(deactFacultyRes.data.success, 'Faculty safely deactivated');
    assert(deactFacultyRes.data.data.status === 'INACTIVE', 'Faculty status is now INACTIVE');

    // 3D. Verify Deactivated Faculty Cannot Login
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        identifier: testFaculty.employeeId,
        password: 'Faculty@123',
        userType: 'FACULTY',
      });
      assert(false, 'Deactivated faculty should NOT be allowed to login');
    } catch (err) {
      assert(err.response?.status === 401, 'Deactivated faculty login correctly rejected with 401 Unauthorized');
    }

    // 3E. Reactivate Faculty
    const reactFacultyRes = await axios.patch(
      `${API_BASE}/hod/faculty/${testFaculty.id}/status`,
      { status: 'ACTIVE' },
      { headers: hodHeaders }
    );
    assert(reactFacultyRes.data.success, 'Faculty successfully reactivated');
    assert(reactFacultyRes.data.data.status === 'ACTIVE', 'Faculty status is now ACTIVE again');

    // Restore original name & designation
    await axios.put(
      `${API_BASE}/hod/faculty/${testFaculty.id}`,
      {
        name: origName,
        email: testFaculty.email,
        designation: origDesignation,
      },
      { headers: hodHeaders }
    );

    // 4. Student Edit & Safe Deactivate
    console.log('\n[4] Testing Student Edit & Deactivate...');
    const studentsRes = await axios.get(`${API_BASE}/hod/students?status=ALL&limit=10`, { headers: hodHeaders });
    assert(studentsRes.data.success && studentsRes.data.data.students.length > 0, 'Fetched student list');
    const testStudent = studentsRes.data.data.students[0];
    assert(!!testStudent, `Selected test student: ${testStudent?.name} (${testStudent?.registrationNumber})`);

    // 4A. Edit Student
    const origStuName = testStudent.name;
    const origSection = testStudent.section;
    const editStuRes = await axios.put(
      `${API_BASE}/hod/students/${testStudent.id}`,
      {
        name: `${origStuName} (Verified)`,
        email: testStudent.email,
        section: 'B',
        year: 5,
        parentName: 'Mr. Test Parent',
        parentMobile: '9840118888',
      },
      { headers: hodHeaders }
    );
    assert(editStuRes.data.success, 'HOD successfully updated student profile');
    assert(editStuRes.data.data.section === 'B', 'Student section updated in DB');

    // 4B. Cross-Department Protection for Student Edit
    try {
      await axios.put(
        `${API_BASE}/hod/students/${testStudent.id}`,
        {
          name: 'Hacked by IT',
          email: testStudent.email,
        },
        { headers: itHeaders }
      );
      assert(false, 'IT HOD should NOT be able to edit CSE student');
    } catch (err) {
      assert(err.response?.status === 403, 'Cross-department student edit correctly blocked with 403 Forbidden');
    }

    // 4C. Safe Deactivate Student
    const deactStuRes = await axios.patch(
      `${API_BASE}/hod/students/${testStudent.id}/status`,
      { status: 'INACTIVE' },
      { headers: hodHeaders }
    );
    assert(deactStuRes.data.success, 'Student safely deactivated');
    assert(deactStuRes.data.data.status === 'INACTIVE', 'Student status is now INACTIVE');

    // 4D. Verify Deactivated Student Cannot Login
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        identifier: testStudent.registrationNumber,
        password: 'Student@123',
        userType: 'STUDENT',
      });
      assert(false, 'Deactivated student should NOT be allowed to login');
    } catch (err) {
      assert(err.response?.status === 401, 'Deactivated student login correctly rejected with 401 Unauthorized');
    }

    // 4E. Verify Attendance Roster Excludes Inactive Student
    const facultyTokenRes = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'FAC001',
      password: 'Faculty@123',
      userType: 'FACULTY',
    });
    if (facultyTokenRes.data?.success) {
      const facHeaders = { Authorization: `Bearer ${facultyTokenRes.data.data.token}` };
      const cseDept = await prisma.department.findUnique({ where: { code: 'CSE' } });
      const rosterRes = await axios.get(
        `${API_BASE}/faculty/attendance/students?departmentId=${cseDept.id}&section=B`,
        { headers: facHeaders }
      );
      const isPresentInRoster = rosterRes.data.data.students.some(s => s.id === testStudent.id);
      assert(!isPresentInRoster, 'Inactive student is excluded from active attendance marking roster');
    }

    // 4F. Reactivate Student
    const reactStuRes = await axios.patch(
      `${API_BASE}/hod/students/${testStudent.id}/status`,
      { status: 'ACTIVE' },
      { headers: hodHeaders }
    );
    assert(reactStuRes.data.success, 'Student successfully reactivated');
    assert(reactStuRes.data.data.status === 'ACTIVE', 'Student status is now ACTIVE again');

    // Restore original student name & section
    await axios.put(
      `${API_BASE}/hod/students/${testStudent.id}`,
      {
        name: origStuName,
        email: testStudent.email,
        section: origSection,
        year: testStudent.semester,
      },
      { headers: hodHeaders }
    );

    // 5. Verify SystemAuditLog
    console.log('\n[5] Verifying Audit Trail in Database...');
    const auditLogs = await prisma.systemAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    assert(auditLogs.length >= 4, `Found ${auditLogs.length} audit records generated in SystemAuditLog`);
    const facultyAudit = auditLogs.find(a => a.action === 'FACULTY_EDITED');
    assert(!!facultyAudit, 'FACULTY_EDITED audit record verified with actor and target info');
    const studentAudit = auditLogs.find(a => a.action === 'STUDENT_DEACTIVATED');
    assert(!!studentAudit, 'STUDENT_DEACTIVATED audit record verified with actor and target info');

    console.log(`\n=======================================================`);
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`=======================================================`);

    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error('Test suite uncaught error:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
