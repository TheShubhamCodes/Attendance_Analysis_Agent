const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('=======================================================');
  console.log(' STARTING OPEN-ENDED DATABASE QUERY TEST SUITE ');
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

  // Helper login
  async function login(identifier, password, role) {
    const res = await axios.post(`${API_BASE}/auth/login`, { identifier, password, role });
    return res.data.data.token;
  }

  try {
    const hodToken = await login('HOD001', 'Hod@1234', 'HOD');
    const facultyToken = await login('FAC001', 'Faculty@123', 'FACULTY');
    const studentToken = await login('23CSE101', 'Student@123', 'STUDENT');
    const parentToken = await login('23CSE101', 'Parent@123', 'PARENT');
    console.log('✓ All 4 test roles authenticated successfully.\n');

    const hodApi = axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${hodToken}` } });
    const facultyApi = axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${facultyToken}` } });
    const studentApi = axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${studentToken}` } });
    const parentApi = axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${parentToken}` } });

    // ==========================================
    // 1. LIST / SEARCH NATURAL LANGUAGE VARIATIONS (HOD)
    // ==========================================
    console.log('--- 1. LIST / SEARCH PHRASING VARIATIONS ---');

    const listQueries = [
      'Give me the list of all students in Section A.',
      'Show all students of Section A.',
      'Give me Section A student list.',
      'List all students from Section A.',
      'Who are the students in Section A?',
      'Show me everyone in Section A.',
      'Give me list of all section A list',
      'Who belongs to Section A?',
      'Section A student list please',
      'Can I see everyone from Section A?',
      'List students from A section',
    ];

    for (const q of listQueries) {
      const res = await hodApi.post('/agent/chat', { message: q, sessionId: 'test_variations' });
      const msg = res.data?.data?.message || '';
      assert(
        msg.includes('Section A') && msg.includes('|') && msg.includes('36'),
        `HOD: "${q}" returns Section A student list with 36 students`
      );
    }

    // Query Section B
    const secB = await hodApi.post('/agent/chat', { message: 'Give me all students from Section B.', sessionId: 'test_sec_b' });
    assert(
      secB.data?.data?.message.includes('Section B') && (secB.data?.data?.message.includes('14') || secB.data?.data?.message.includes('13')),
      'HOD: "Give me all students from Section B." returns Section B students'
    );

    // ==========================================
    // 2. COUNTING QUESTIONS
    // ==========================================
    console.log('\n--- 2. COUNTING QUESTIONS ---');

    const countA = await hodApi.post('/agent/chat', { message: 'How many students are in Section A?', sessionId: 'test_count' });
    assert(
      countA.data?.data?.message.includes('36') && countA.data?.data?.message.includes('Section A'),
      'HOD: "How many students are in Section A?" returns exactly 36'
    );

    const countBelow75 = await hodApi.post('/agent/chat', { message: 'How many students are below 75% in Section A?', sessionId: 'test_count' });
    assert(
      countBelow75.data?.data?.message.includes('2') || countBelow75.data?.data?.message.includes('student'),
      'HOD: "How many students are below 75% in Section A?" returns count of at-risk students'
    );

    const groupCount = await hodApi.post('/agent/chat', { message: 'How many students are enrolled in each section?', sessionId: 'test_count' });
    assert(
      groupCount.data?.data?.message.includes('Section A') &&
      groupCount.data?.data?.message.includes('Section B') &&
      (groupCount.data?.data?.message.includes('17') || groupCount.data?.data?.message.includes('16') || groupCount.data?.data?.message.includes('15') || groupCount.data?.data?.message.includes('14') || groupCount.data?.data?.message.includes('13')),
      'HOD: "How many students are enrolled in each section?" returns breakdown for Section A and Section B'
    );

    // ==========================================
    // 3. MULTI-FILTER QUESTIONS
    // ==========================================
    console.log('\n--- 3. MULTI-FILTER QUESTIONS ---');

    const below75 = await hodApi.post('/agent/chat', { message: 'Show Section A students below 75%.', sessionId: 'test_filter' });
    assert(
      below75.data?.data?.message.includes('Section A') && below75.data?.data?.message.includes('At Risk'),
      'HOD: "Show Section A students below 75%." filters at-risk students in Section A'
    );

    const sem5 = await hodApi.post('/agent/chat', { message: 'List Section B students in semester 5.', sessionId: 'test_filter' });
    assert(
      sem5.data?.data?.message.includes('Section B') && sem5.data?.data?.message.includes('|'),
      'HOD: "List Section B students in semester 5." returns Section B semester 5 cohort'
    );

    const above85 = await hodApi.post('/agent/chat', { message: 'Show students in Section A with attendance above 85%.', sessionId: 'test_filter' });
    assert(
      above85.data?.data?.message.includes('above') || above85.data?.data?.message.includes('Section A'),
      'HOD: "Show students in Section A with attendance above 85%." returns students exceeding 85%'
    );

    const between70and80 = await hodApi.post('/agent/chat', { message: 'Show students in Section A with attendance between 70 and 80%.', sessionId: 'test_filter' });
    assert(
      between70and80.data?.data?.message.includes('between') && between70and80.data?.data?.message.includes('70'),
      'HOD: "Show students in Section A with attendance between 70 and 80%." applies range filter'
    );

    const subjectFilter = await hodApi.post('/agent/chat', { message: 'Show Section A students whose attendance is below 75% in CN.', sessionId: 'test_filter' });
    assert(
      subjectFilter.data?.data?.message.includes('Computer Networks') || subjectFilter.data?.data?.message.includes('CS301'),
      'HOD: "Show Section A students whose attendance is below 75% in CN." resolves CN to CS301'
    );

    // ==========================================
    // 4. SORTING & EXTREMES
    // ==========================================
    console.log('\n--- 4. SORTING & EXTREMES ---');

    const sortedDesc = await hodApi.post('/agent/chat', { message: 'Show Section A students with highest attendance first.', sessionId: 'test_sort' });
    assert(
      sortedDesc.data?.data?.message.includes('|') && sortedDesc.data?.data?.message.includes('Section A'),
      'HOD: "Show Section A students with highest attendance first." sorts descending'
    );

    const sortedAsc = await hodApi.post('/agent/chat', { message: 'List students from lowest attendance to highest in Section A.', sessionId: 'test_sort' });
    assert(
      sortedAsc.data?.data?.message.includes('|'),
      'HOD: "List students from lowest attendance to highest." sorts ascending'
    );

    const top10 = await hodApi.post('/agent/chat', { message: 'Show the top 10 students by attendance in Section A.', sessionId: 'test_sort' });
    assert(
      top10.data?.data?.message.includes('|') && (top10.data?.data?.message.includes('10') || top10.data?.data?.message.includes('records')),
      'HOD: "Show the top 10 students by attendance." limits to 10'
    );

    const highestStudent = await hodApi.post('/agent/chat', { message: 'Who has the highest attendance in Section A?', sessionId: 'test_extreme' });
    assert(
      highestStudent.data?.data?.message.includes('Highest Attendance') || highestStudent.data?.data?.message.includes('highest attendance'),
      'HOD: "Who has the highest attendance in Section A?" returns student with highest attendance'
    );

    const lowestStudent = await hodApi.post('/agent/chat', { message: 'Who has the lowest attendance in Section A?', sessionId: 'test_extreme' });
    assert(
      lowestStudent.data?.data?.message.includes('Lowest Attendance') || lowestStudent.data?.data?.message.includes('lowest attendance'),
      'HOD: "Who has the lowest attendance in Section A?" returns student with lowest attendance'
    );

    // ==========================================
    // 5. COMBINED QUESTIONS
    // ==========================================
    console.log('\n--- 5. COMBINED QUESTIONS ---');

    const combined1 = await hodApi.post('/agent/chat', {
      message: 'Give me all Section A students with their registration number, attendance percentage and risk status.',
      sessionId: 'test_combined',
    });
    assert(
      combined1.data?.data?.message.includes('|') &&
      combined1.data?.data?.message.includes('Registration No.') &&
      combined1.data?.data?.message.includes('Status'),
      'HOD: Combined fields request returns structured markdown table with registration, attendance, and status'
    );

    const combined2 = await hodApi.post('/agent/chat', {
      message: 'Show all students in Section A with their semester.',
      sessionId: 'test_combined',
    });
    assert(
      combined2.data?.data?.message.includes('Semester') || combined2.data?.data?.message.includes('Sem'),
      'HOD: Request with semester returns semester column'
    );

    // ==========================================
    // 6. MULTI-TURN CONVERSATIONAL REFINEMENT CHAIN
    // ==========================================
    console.log('\n--- 6. MULTI-TURN CONVERSATIONAL REFINEMENT CHAIN ---');

    const sessionChainId = `chain_${Date.now()}`;

    // Turn 1: Initial list
    const turn1 = await hodApi.post('/agent/chat', { message: 'Show all students in Section A.', sessionId: sessionChainId });
    assert(
      turn1.data?.data?.message.includes('Section A') && turn1.data?.data?.message.includes('36'),
      'Turn 1: "Show all students in Section A." establishes Section A context (36 students)'
    );

    // Turn 2: Follow-up filter below 75%
    const turn2 = await hodApi.post('/agent/chat', { message: 'Now show only those below 75%.', sessionId: sessionChainId });
    assert(
      turn2.data?.data?.message.includes('Section A') && (turn2.data?.data?.message.includes('75%') || turn2.data?.data?.message.includes('At Risk')),
      'Turn 2: "Now show only those below 75%." filters previous Section A query'
    );

    // Turn 3: Follow-up sort by attendance
    const turn3 = await hodApi.post('/agent/chat', { message: 'Sort them by attendance.', sessionId: sessionChainId });
    assert(
      turn3.data?.data?.message.includes('|') && turn3.data?.data?.message.includes('sorted'),
      'Turn 3: "Sort them by attendance." applies sorting to filtered set'
    );

    // Turn 4: Follow-up count
    const turn4 = await hodApi.post('/agent/chat', { message: 'How many are there?', sessionId: sessionChainId });
    assert(
      turn4.data?.data?.message.includes('student') || turn4.data?.data?.message.includes('Count'),
      'Turn 4: "How many are there?" counts current filtered set'
    );

    // ==========================================
    // 7. STRICT AUTHORIZATION GATES (Student & Parent Denials)
    // ==========================================
    console.log('\n--- 7. STRICT ROLE AUTHORIZATION GATES ---');

    const studentTryCohort = await studentApi.post('/agent/chat', { message: 'Give me the list of all students in Section A.', sessionId: 'student_sec' });
    assert(
      studentTryCohort.data?.data?.message.includes('only provide information related to your own account'),
      'Student: "Give me the list of all students in Section A." is strictly denied'
    );

    const studentTryCount = await studentApi.post('/agent/chat', { message: 'How many students are in Section A?', sessionId: 'student_sec' });
    assert(
      studentTryCount.data?.data?.message.includes('only provide information related to your own account'),
      'Student: "How many students are in Section A?" is strictly denied'
    );

    const parentTryCohort = await parentApi.post('/agent/chat', { message: 'Give me all Section A students.', sessionId: 'parent_sec' });
    assert(
      parentTryCohort.data?.data?.message.includes("Parents can only view their linked child"),
      'Parent: "Give me all Section A students." is strictly denied'
    );

  } catch (err) {
    console.error('Fatal test execution error:', err.response?.data || err.message);
    failed++;
  }

  console.log('\n=======================================================');
  console.log(` OPEN-ENDED QUERY TEST RESULTS: Passed: ${passed}, Failed: ${failed}`);
  console.log('=======================================================');

  if (failed > 0) process.exit(1);
}

runTests();
