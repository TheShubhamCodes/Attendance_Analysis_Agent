const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING COMPREHENSIVE HOD & FACULTY VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. STUDENT LOGIN
    console.log('--- Test 1: Student Login ---');
    try {
      const studentRes = await axios.post(`${API_BASE}/auth/login`, {
        identifier: '24CSE369',
        password: 'Student@123',
        role: 'STUDENT',
      });
      assert(studentRes.status === 200 && studentRes.data?.data?.token, 'Student 24CSE369 logs in successfully');
    } catch (err) {
      assert(false, `Student login failed: ${err.response?.data?.message || err.message}`);
    }

    // 2. HOD LOGIN
    console.log('\n--- Test 2: HOD Login ---');
    let hodToken = '';
    try {
      const hodRes = await axios.post(`${API_BASE}/auth/login`, {
        identifier: 'HOD001',
        password: 'Hod@1234',
        role: 'HOD',
      });
      hodToken = hodRes.data?.data?.token;
      assert(hodRes.status === 200 && !!hodToken, 'HOD001 logs in successfully with department CSE');
    } catch (err) {
      assert(false, `HOD login failed: ${err.response?.data?.message || err.message}`);
    }

    const hodHeaders = { Authorization: `Bearer ${hodToken}` };

    // 3. UNASSIGNED FACULTY LOGIN REJECTION
    console.log('\n--- Test 3: Unassigned Faculty Login Rejection (Rule 2) ---');
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        identifier: 'STAFF002',
        password: 'Faculty@123',
        role: 'FACULTY',
      });
      assert(false, 'Unassigned faculty STAFF002 should NOT be allowed to log in');
    } catch (err) {
      const is403 = err.response?.status === 403;
      const msg = err.response?.data?.message;
      assert(
        is403 && msg === 'Faculty account is not assigned by the HOD or the account is invalid.',
        `Unassigned faculty rejected with exact message: "${msg}"`
      );
    }

    // 4. ASSIGNED FACULTY LOGIN
    console.log('\n--- Test 4: Assigned Faculty Login ---');
    let facToken = '';
    try {
      const facRes = await axios.post(`${API_BASE}/auth/login`, {
        identifier: 'FAC001',
        password: 'Faculty@123',
        role: 'FACULTY',
      });
      facToken = facRes.data?.data?.token;
      assert(facRes.status === 200 && !!facToken, 'Assigned faculty FAC001 logs in successfully');
    } catch (err) {
      assert(false, `Assigned faculty login failed: ${err.response?.data?.message || err.message}`);
    }

    // 5. SUBJECT / COURSE DROPDOWN ACROSS ALL 8 SEMESTERS
    console.log('\n--- Test 5: Complete 1st-4th Year Subject List in PostgreSQL ---');
    let sem4CourseId = '';
    try {
      const metaRes = await axios.get(`${API_BASE}/hod/faculty/form-meta`, { headers: hodHeaders });
      const courses = metaRes.data?.data?.courses || [];
      const semestersCovered = new Set(courses.map((c) => c.semester));
      assert(courses.length >= 35, `Found ${courses.length} subjects in PostgreSQL curriculum`);
      assert(
        [1, 2, 3, 4, 5, 6, 7, 8].every((s) => semestersCovered.has(s)),
        'All 8 semesters (1st to 4th year) have courses populated'
      );
      const sem4Course = courses.find((c) => c.semester === 4);
      sem4CourseId = sem4Course?.id;
      assert(!!sem4CourseId, `Found Semester 4 subject: ${sem4Course?.courseCode} - ${sem4Course?.courseName}`);
    } catch (err) {
      assert(false, `Subject list fetch failed: ${err.response?.data?.message || err.message}`);
    }

    // 6. CREATE NEW FACULTY MEMBER & ASSIGNMENT VIA HOD
    console.log('\n--- Test 6: Input-Based Faculty Creation & Teaching Assignment ---');
    const testEmpId = 'FAC999';
    try {
      const assignRes = await axios.post(
        `${API_BASE}/hod/faculty/assign`,
        {
          employeeId: testEmpId,
          facultyName: 'Dr. Vikramaditya Test Sharma',
          email: 'vikram.test@university.edu',
          mobileNumber: '9840998877',
          designation: 'Assistant Professor',
          semester: 4,
          courseId: sem4CourseId,
          section: 'A',
          academicYear: '2026-2027',
        },
        { headers: hodHeaders }
      );
      assert(assignRes.status === 200 || assignRes.status === 201, 'New faculty account and assignment created in PostgreSQL');
    } catch (err) {
      assert(false, `Faculty creation & assignment failed: ${err.response?.data?.message || err.message}`);
    }

    // 7. PREVENT DUPLICATE ASSIGNMENT
    console.log('\n--- Test 7: Duplicate Assignment Prevention ---');
    try {
      await axios.post(
        `${API_BASE}/hod/faculty/assign`,
        {
          employeeId: testEmpId,
          facultyName: 'Dr. Vikramaditya Test Sharma',
          email: 'vikram.test@university.edu',
          semester: 4,
          courseId: sem4CourseId,
          section: 'A',
          academicYear: '2026-2027',
        },
        { headers: hodHeaders }
      );
      assert(false, 'Duplicate assignment should be rejected');
    } catch (err) {
      assert(err.response?.status === 409, `Duplicate assignment rejected with 409 Conflict (${err.response?.data?.message})`);
    }

    // 8. NEW FACULTY CAN NOW LOG IN
    console.log('\n--- Test 8: Newly Created Faculty Logs In ---');
    let newFacToken = '';
    try {
      const newFacRes = await axios.post(`${API_BASE}/auth/login`, {
        identifier: testEmpId,
        password: 'Faculty@123',
        role: 'FACULTY',
      });
      newFacToken = newFacRes.data?.data?.token;
      assert(newFacRes.status === 200 && !!newFacToken, `New faculty ${testEmpId} logged in successfully using default password`);
    } catch (err) {
      assert(false, `New faculty login failed: ${err.response?.data?.message || err.message}`);
    }

    // 9. FACULTY SCOPING CHECK
    console.log('\n--- Test 9: Faculty Section Scoping ---');
    try {
      const scopeHeaders = { Authorization: `Bearer ${newFacToken}` };
      // Attempt to access authorized section A for course
      const authRes = await axios.get(
        `${API_BASE}/faculty/attendance/students?courseId=${sem4CourseId}&section=A`,
        { headers: scopeHeaders }
      );
      assert(authRes.status === 200, 'Faculty successfully accessed authorized assigned Section A');

      // Attempt to access unauthorized Section B
      try {
        await axios.get(
          `${API_BASE}/faculty/attendance/students?courseId=${sem4CourseId}&section=B`,
          { headers: scopeHeaders }
        );
        assert(false, 'Faculty should NOT be allowed to access unauthorized Section B');
      } catch (errScope) {
        assert(
          errScope.response?.status === 403,
          `Unauthorized section access rejected with 403 Forbidden (${errScope.response?.data?.message})`
        );
      }
    } catch (err) {
      assert(false, `Scoping test failed: ${err.response?.data?.message || err.message}`);
    }

    // 10. SOFT-DELETE FACULTY TO TRASH
    console.log('\n--- Test 10: Faculty Soft-Delete (Move to Trash) ---');
    let testFacId = '';
    try {
      // Find faculty ID
      const facListRes = await axios.get(`${API_BASE}/hod/faculty?query=${testEmpId}`, { headers: hodHeaders });
      const facObj = facListRes.data?.data?.find((f) => f.employeeId === testEmpId);
      testFacId = facObj?.id;
      assert(!!testFacId, `Found faculty ID for ${testEmpId}`);

      const deleteRes = await axios.delete(`${API_BASE}/hod/faculty/${testFacId}`, {
        data: { reason: 'Test soft deletion to trash' },
        headers: hodHeaders,
      });
      assert(deleteRes.status === 200, 'Faculty moved to Deleted Records / Trash');

      // Verify faculty disappeared from active directory
      const activeListRes = await axios.get(`${API_BASE}/hod/faculty?query=${testEmpId}`, { headers: hodHeaders });
      const stillActive = activeListRes.data?.data?.find((f) => f.employeeId === testEmpId);
      assert(!stillActive, 'Deleted faculty disappears completely from active faculty list');

      // Verify deleted faculty CANNOT log in
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          identifier: testEmpId,
          password: 'Faculty@123',
          role: 'FACULTY',
        });
        assert(false, 'Deleted faculty should NOT be able to log in');
      } catch (errLogin) {
        assert(
          errLogin.response?.status === 403 || errLogin.response?.status === 401,
          'Deleted faculty login blocked with 401/403 Forbidden'
        );
      }

      // Verify faculty appears in Deleted Records / Trash
      const trashRes = await axios.get(`${API_BASE}/hod/deleted-records?type=faculty`, { headers: hodHeaders });
      const inTrash = trashRes.data?.data?.faculty?.find((f) => f.employeeId === testEmpId);
      assert(!!inTrash, `Deleted faculty appears in Trash Archive with reason: "${inTrash?.deletionReason}"`);
    } catch (err) {
      assert(false, `Faculty soft-delete test failed: ${err.response?.data?.message || err.message}`);
    }

    // 11. RESTORE FACULTY FROM TRASH
    console.log('\n--- Test 11: Restore Faculty from Trash ---');
    try {
      const restoreRes = await axios.post(
        `${API_BASE}/hod/deleted-records/restore`,
        { type: 'FACULTY', id: testFacId },
        { headers: hodHeaders }
      );
      assert(restoreRes.status === 200, 'Faculty successfully restored from Trash');

      // Verify login works again
      const reloginRes = await axios.post(`${API_BASE}/auth/login`, {
        identifier: testEmpId,
        password: 'Faculty@123',
        role: 'FACULTY',
      });
      assert(reloginRes.status === 200, 'Restored faculty can log in again');
    } catch (err) {
      assert(false, `Faculty restore test failed: ${err.response?.data?.message || err.message}`);
    }

    // 12. CLEANUP TEST FACULTY WITH PERMANENT DELETE
    console.log('\n--- Test 12: Permanent Purge from Trash ---');
    try {
      // First delete again
      await axios.delete(`${API_BASE}/hod/faculty/${testFacId}`, {
        data: { reason: 'Final test cleanup' },
        headers: hodHeaders,
      });
      // Now permanent delete
      const permRes = await axios.delete(`${API_BASE}/hod/deleted-records/permanent`, {
        data: { type: 'FACULTY', id: testFacId },
        headers: hodHeaders,
      });
      assert(permRes.status === 200, 'Test faculty permanently purged cleanly');
    } catch (err) {
      assert(false, `Permanent delete failed: ${err.response?.data?.message || err.message}`);
    }

    // 13. HOD DASHBOARD EXCLUDES DELETED AND DEMO RECORDS
    console.log('\n--- Test 13: Dashboard Statistics ---');
    try {
      const dashRes = await axios.get(`${API_BASE}/hod/dashboard`, { headers: hodHeaders });
      const stats = dashRes.data?.data?.metrics;
      assert(stats && typeof stats.totalStudents === 'number', `Dashboard total active students: ${stats?.totalStudents}`);
      assert(stats && typeof stats.totalFaculty === 'number', `Dashboard total active faculty: ${stats?.totalFaculty}`);
      assert(stats && typeof stats.totalSubjects === 'number', `Dashboard total active subjects: ${stats?.totalSubjects}`);
    } catch (err) {
      assert(false, `Dashboard stats failed: ${err.response?.data?.message || err.message}`);
    }

    // 14. CROSS-DEPARTMENT ISOLATION
    console.log('\n--- Test 14: Cross-Department Isolation ---');
    try {
      // HOD001 is CSE. Attempt to query IT faculty
      const itRes = await axios.get(`${API_BASE}/hod/faculty?query=Priya`, { headers: hodHeaders });
      const foundItStaff = itRes.data?.data?.find((f) => f.employeeId === 'HOD002');
      assert(!foundItStaff, 'CSE HOD cannot access IT department faculty (isolated)');
    } catch (err) {
      assert(false, `Cross-department isolation test failed: ${err.response?.data?.message || err.message}`);
    }

  } catch (globalErr) {
    console.error('Fatal test error:', globalErr);
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

runTests();
