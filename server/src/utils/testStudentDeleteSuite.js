const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function runStudentTests() {
  console.log('====================================================');
  console.log('RUNNING STUDENT SOFT-DELETE, RESTORE & LOGIN TEST SUITE');
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
    // 1. Log in as HOD
    const hodRes = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'HOD001',
      password: 'Hod@1234',
      role: 'HOD',
    });
    const hodHeaders = { Authorization: `Bearer ${hodRes.data.data.token}` };

    // 2. Pick a student (e.g. 241FA04D50 - Umesh Tiwari)
    const stuReg = '241FA04D50';
    const stuListRes = await axios.get(`${API_BASE}/hod/students?query=${stuReg}`, { headers: hodHeaders });
    const studentsArr = stuListRes.data?.data?.students || stuListRes.data?.data || [];
    const targetStudent = studentsArr.find((s) => s.registrationNumber === stuReg);
    assert(!!targetStudent, `Found target student ${stuReg} (${targetStudent?.name})`);

    // 3. Test Student Login BEFORE delete
    try {
      const stuLoginRes = await axios.post(`${API_BASE}/auth/login`, {
        identifier: stuReg,
        password: 'Student@123',
        role: 'STUDENT',
      });
      assert(stuLoginRes.status === 200, `Student ${stuReg} logs in successfully before delete`);
    } catch (err) {
      console.log(`Note: Student login error: ${err.response?.data?.message || err.message}`);
    }

    // 4. Soft-delete Student to Trash
    const delRes = await axios.delete(`${API_BASE}/hod/students/${targetStudent.id}`, {
      data: { reason: 'Graduated / Transferred out' },
      headers: hodHeaders,
    });
    assert(delRes.status === 200, `Student ${stuReg} moved to Deleted Records / Trash`);

    // 5. Verify Student Disappeared from Active Student List
    const activeListRes = await axios.get(`${API_BASE}/hod/students?query=${stuReg}`, { headers: hodHeaders });
    const activeArr = activeListRes.data?.data?.students || activeListRes.data?.data || [];
    const stillInActive = activeArr.find((s) => s.registrationNumber === stuReg);
    assert(!stillInActive, 'Deleted student completely disappears from active Student Management roster');

    // 6. Verify Student Login is BLOCKED
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        identifier: stuReg,
        password: 'Student@123',
        role: 'STUDENT',
      });
      assert(false, 'Deleted student should NOT be allowed to log in');
    } catch (errLogin) {
      assert(
        errLogin.response?.status === 401 || errLogin.response?.status === 403,
        `Deleted student login blocked with status ${errLogin.response?.status} (${errLogin.response?.data?.message})`
      );
    }

    // 7. Verify Student Appears in Deleted Records Trash
    const trashRes = await axios.get(`${API_BASE}/hod/deleted-records?type=student`, { headers: hodHeaders });
    const inTrash = trashRes.data?.data?.students?.find((s) => s.registrationNumber === stuReg);
    assert(!!inTrash, `Deleted student appears in Trash Archive with reason: "${inTrash?.deletionReason}"`);

    // 8. Restore Student from Trash
    const restoreRes = await axios.post(
      `${API_BASE}/hod/deleted-records/restore`,
      { type: 'STUDENT', id: targetStudent.id },
      { headers: hodHeaders }
    );
    assert(restoreRes.status === 200, `Student ${stuReg} restored from Trash`);

    // 9. Verify Student Reappears in Active List
    const reactivatedRes = await axios.get(`${API_BASE}/hod/students?query=${stuReg}`, { headers: hodHeaders });
    const reactivatedArr = reactivatedRes.data?.data?.students || reactivatedRes.data?.data || [];
    const backInActive = reactivatedArr.find((s) => s.registrationNumber === stuReg);
    assert(!!backInActive, 'Restored student reappears in active Student Management roster');

    // 10. Verify Student Can Log in Again
    try {
      const reloginRes = await axios.post(`${API_BASE}/auth/login`, {
        identifier: stuReg,
        password: 'Student@123',
        role: 'STUDENT',
      });
      assert(reloginRes.status === 200, `Restored student ${stuReg} logs in successfully`);
    } catch (err) {
      assert(false, `Restored student login failed: ${err.response?.data?.message || err.message}`);
    }

  } catch (err) {
    console.error('Fatal student test error:', err);
  }

  console.log('\n====================================================');
  console.log(`STUDENT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

runStudentTests();
