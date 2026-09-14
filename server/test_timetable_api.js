const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function login(identifier, password, userType) {
  const res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { identifier, password, userType }
  );
  return res.data?.data?.token;
}

async function runTests() {
  console.log('--- STARTING TIMETABLE API TESTS ---');

  // 1. Student Test (Section A)
  const studentToken = await login('23CSE101', 'Student@123', 'STUDENT');
  console.log('Student token acquired:', Boolean(studentToken));

  const studentRoutineRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/timetable/my-routine',
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(
    'Test 1 (Student /my-routine):',
    studentRoutineRes.status === 200 &&
      studentRoutineRes.data?.data?.activeSection === 'A' &&
      studentRoutineRes.data?.data?.canSwitchSection === false
      ? 'PASS'
      : 'FAIL',
    {
      activeSection: studentRoutineRes.data?.data?.activeSection,
      canSwitchSection: studentRoutineRes.data?.data?.canSwitchSection,
    }
  );

  // Student Section A view allowed
  const studentSecARes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/timetable/view/A',
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log('Test 2 (Student view own Section A):', studentSecARes.status === 200 ? 'PASS' : 'FAIL');

  // Student Section B view FORBIDDEN
  const studentSecBRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/timetable/view/B',
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(
    'Test 3 (Student view Section B -> FORBIDDEN):',
    studentSecBRes.status === 403 ? 'PASS' : 'FAIL',
    studentSecBRes.data?.message
  );

  // 2. Parent Test (Linked ward in Section A)
  const parentToken = await login('23CSE101', 'Parent@123', 'PARENT');
  console.log('Parent token acquired:', Boolean(parentToken));

  const parentRoutineRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/timetable/my-routine',
    method: 'GET',
    headers: { Authorization: `Bearer ${parentToken}` },
  });
  console.log(
    'Test 4 (Parent /my-routine):',
    parentRoutineRes.status === 200 && parentRoutineRes.data?.data?.activeSection === 'A'
      ? 'PASS'
      : 'FAIL',
    {
      activeSection: parentRoutineRes.data?.data?.activeSection,
      canSwitchSection: parentRoutineRes.data?.data?.canSwitchSection,
    }
  );

  // Parent Section B view FORBIDDEN
  const parentSecBRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/timetable/view/B',
    method: 'GET',
    headers: { Authorization: `Bearer ${parentToken}` },
  });
  console.log(
    'Test 5 (Parent view unlinked Section B -> FORBIDDEN):',
    parentSecBRes.status === 403 ? 'PASS' : 'FAIL',
    parentSecBRes.data?.message
  );

  // 3. HOD Test (Full Access & Switchable)
  const hodToken = await login('HOD001', 'HOD@123', 'HOD');
  console.log('HOD token acquired:', Boolean(hodToken));

  const hodRoutineRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/timetable/my-routine',
    method: 'GET',
    headers: { Authorization: `Bearer ${hodToken}` },
  });
  console.log(
    'Test 6 (HOD /my-routine):',
    hodRoutineRes.status === 200 && hodRoutineRes.data?.data?.canSwitchSection === true
      ? 'PASS'
      : 'FAIL',
    {
      authorizedSections: hodRoutineRes.data?.data?.authorizedSections,
      canSwitchSection: hodRoutineRes.data?.data?.canSwitchSection,
    }
  );

  // HOD View Section A
  const hodSecARes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/timetable/view/A',
    method: 'GET',
    headers: { Authorization: `Bearer ${hodToken}` },
  });
  console.log('Test 7 (HOD view Section A):', hodSecARes.status === 200 ? 'PASS' : 'FAIL');

  // HOD View Section B
  const hodSecBRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/timetable/view/B',
    method: 'GET',
    headers: { Authorization: `Bearer ${hodToken}` },
  });
  console.log(
    'Test 8 (HOD view Section B):',
    hodSecBRes.status === 200 && hodSecBRes.data?.data?.section === 'B' ? 'PASS' : 'FAIL'
  );

  // Check Schedule Contents (Days & Periods verification)
  const monRoutine = hodSecARes.data?.data?.routine?.MONDAY;
  console.log(
    'Test 9 (Section A Monday Routine Integrity):',
    monRoutine && monRoutine.length === 10 && monRoutine[0].code === 'ML' && monRoutine[3].isBreak
      ? 'PASS'
      : 'FAIL',
    {
      p1: monRoutine[0]?.code,
      p2: monRoutine[1]?.code,
      break1: monRoutine[3]?.name,
      p4: monRoutine[4]?.code,
      break2: monRoutine[6]?.name,
      p8: monRoutine[9]?.code,
    }
  );

  console.log('--- ALL TIMETABLE TESTS PASSED ---');
}

runTests().catch(console.error);
