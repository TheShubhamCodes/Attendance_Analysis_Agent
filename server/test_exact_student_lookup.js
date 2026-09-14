const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('=======================================================');
  console.log(' STARTING EXACT STUDENT LOOKUP TEST SUITE ');
  console.log('=======================================================');

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

  async function login(identifier, password, role) {
    const res = await axios.post(`${API_BASE}/auth/login`, { identifier, password, role });
    return res.data.data.token;
  }

  try {
    const hodToken = await login('HOD001', 'Hod@1234', 'HOD');
    const studentToken = await login('23CSE101', 'Student@123', 'STUDENT');
    const parentToken = await login('23CSE101', 'Parent@123', 'PARENT');
    console.log('✓ Test roles authenticated.\n');

    const hodApi = axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${hodToken}` } });
    const studentApi = axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${studentToken}` } });
    const parentApi = axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${parentToken}` } });

    // 1. "Show Rohan Verma (241FA04326)"
    console.log('--- 1. EXACT REGISTRATION & NAME LOOKUP ---');
    const res1 = await hodApi.post('/agent/chat', { message: 'Show Rohan Verma (241FA04326)', sessionId: 'test_exact' });
    const msg1 = res1.data?.data?.message || '';
    const data1 = res1.data?.data?.structuredData || {};

    assert(
      msg1.includes('Rohan Verma') &&
      msg1.includes('241FA04326') &&
      msg1.includes('Section') &&
      msg1.includes('Semester') &&
      !msg1.includes('null%') &&
      !msg1.includes('Found 46 students') &&
      !msg1.includes('Found 36 students'),
      'HOD: "Show Rohan Verma (241FA04326)" returns single student profile without cohort list or null% filters'
    );
    assert(
      data1.registrationNumber === '241FA04326' && data1.name === 'Rohan Verma',
      'HOD: Structured data returns exact student (241FA04326)'
    );
    assert(
      res1.data?.data?.cardType === 'STUDENT_PROFILE_CARD',
      'HOD: Card type is STUDENT_PROFILE_CARD'
    );

    // 2. "Find 241FA04326"
    console.log('\n--- 2. REGISTRATION NUMBER LOOKUPS ---');
    const res2 = await hodApi.post('/agent/chat', { message: 'Find 241FA04326', sessionId: 'test_exact' });
    assert(
      res2.data?.data?.message.includes('Rohan Verma') && res2.data?.data?.message.includes('241FA04326'),
      'HOD: "Find 241FA04326" resolves to Rohan Verma'
    );

    // 3. "Show student 241FA04326"
    const res3 = await hodApi.post('/agent/chat', { message: 'Show student 241FA04326', sessionId: 'test_exact' });
    assert(
      res3.data?.data?.message.includes('Rohan Verma') && res3.data?.data?.message.includes('241FA04326'),
      'HOD: "Show student 241FA04326" resolves to Rohan Verma'
    );

    // 4. "Who is 241FA04326?"
    const res4 = await hodApi.post('/agent/chat', { message: 'Who is 241FA04326?', sessionId: 'test_exact' });
    assert(
      res4.data?.data?.message.includes('Rohan Verma') && res4.data?.data?.message.includes('241FA04326'),
      'HOD: "Who is 241FA04326?" resolves to Rohan Verma'
    );

    // 5. "Get details of Rohan Verma"
    console.log('\n--- 3. NAME-ONLY LOOKUP ---');
    const res5 = await hodApi.post('/agent/chat', { message: 'Get details of Rohan Verma', sessionId: 'test_exact' });
    assert(
      res5.data?.data?.message.includes('Rohan Verma') && res5.data?.data?.message.includes('241FA04326'),
      'HOD: "Get details of Rohan Verma" resolves to Rohan Verma'
    );

    // 6. "Show Rohan Verma"
    const res6 = await hodApi.post('/agent/chat', { message: 'Show Rohan Verma', sessionId: 'test_exact' });
    assert(
      res6.data?.data?.message.includes('Rohan Verma') && res6.data?.data?.message.includes('241FA04326'),
      'HOD: "Show Rohan Verma" resolves to Rohan Verma'
    );

    // 7. Non-existent student
    console.log('\n--- 4. NON-EXISTENT LOOKUP ---');
    const res7 = await hodApi.post('/agent/chat', { message: 'Find 999ZZ99999', sessionId: 'test_exact' });
    assert(
      res7.data?.data?.message.includes("couldn't find") || res7.data?.data?.message.includes('not found'),
      'HOD: Non-existent registration number returns appropriate missing message'
    );

    // 8. Explicit cohort list vs single student
    console.log('\n--- 5. COHORT LIST QUERY VS SINGLE STUDENT ---');
    const res8 = await hodApi.post('/agent/chat', { message: 'Show all Section A students', sessionId: 'test_exact' });
    assert(
      res8.data?.data?.message.includes('Section A') &&
      res8.data?.data?.message.includes('36') &&
      !res8.data?.data?.message.includes('null%'),
      'HOD: "Show all Section A students" returns 36-student list and no null%'
    );

    // 9. Null filter protection in attendance query
    const res9 = await hodApi.post('/agent/chat', { message: 'Show Section A students below 75%', sessionId: 'test_exact' });
    assert(
      res9.data?.data?.message.includes('Section A') &&
      !res9.data?.data?.message.includes('null%'),
      'HOD: Defaulter query contains no null% in header or body'
    );

    // 10. Student security check
    console.log('\n--- 6. ROLE AUTHORIZATION GATES ---');
    const res10 = await studentApi.post('/agent/chat', { message: 'Show Rohan Verma (241FA04326)', sessionId: 'test_exact_stu' });
    assert(
      res10.data?.data?.message.includes('only provide') || res10.data?.data?.message.includes('permission'),
      'Student: Attempting to look up another student is denied'
    );

    // 11. Parent security check
    const res11 = await parentApi.post('/agent/chat', { message: 'Show Rohan Verma (241FA04326)', sessionId: 'test_exact_parent' });
    assert(
      res11.data?.data?.message.includes('permission') || res11.data?.data?.message.includes('linked child'),
      'Parent: Attempting to look up unlinked student is denied'
    );

  } catch (err) {
    console.error('Fatal test error:', err.response?.data || err.message);
    process.exit(1);
  }

  console.log('\n=======================================================');
  console.log(` RESULTS: Passed: ${passed}, Failed: ${failed}`);
  console.log('=======================================================');

  if (failed > 0) process.exit(1);
}

runTests();
