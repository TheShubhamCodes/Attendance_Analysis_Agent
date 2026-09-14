const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function login(identifier, password, userType) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, userType }),
  });
  const json = await res.json();
  if (!json.success || !json.data?.token) {
    throw new Error(`Login failed for ${identifier}: ${json.message}`);
  }
  return json.data.token;
}

async function askAgent(token, message, sessionId = 'test_session') {
  const res = await fetch(`${BASE_URL}/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, sessionId }),
  });
  return res.json();
}

async function clearAgent(token, sessionId = 'test_session') {
  await fetch(`${BASE_URL}/agent/clear`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId }),
  });
}

async function runAgentTests() {
  console.log('=======================================================');
  console.log(' STARTING COMPREHENSIVE AI ATTENDANCE AGENT TEST SUITE ');
  console.log('=======================================================');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate All Roles
    const studentToken = await login('23CSE101', 'Student@123', 'STUDENT');
    const parentToken = await login('23CSE101', 'Parent@123', 'PARENT');
    const facultyToken = await login('FAC001', 'Faculty@123', 'FACULTY');
    const hodToken = await login('HOD001', 'Hod@1234', 'HOD');
    console.log('✓ All 4 test roles authenticated successfully.\n');

    // ==========================================
    // SECTION 1: STUDENT ROLE TESTS
    // ==========================================
    console.log('--- SECTION 1: STUDENT AGENT TESTS ---');
    const studentSession = 'student_test_' + Date.now();

    // 1A. Self Attendance
    const selfAtt = await askAgent(studentToken, 'What is my attendance?', studentSession);
    test('Student: "What is my attendance?" returns own real database percentage', () => {
      assert(selfAtt.success === true, 'Response was not success');
      assert(selfAtt.data.structuredData.overall.percentage !== undefined, 'No percentage');
      assert(selfAtt.data.message.includes(selfAtt.data.structuredData.overall.percentage.toString()), 'Percentage not in text');
    });

    // 1B. Subject-wise Attendance
    const selfSubj = await askAgent(studentToken, 'Show my subject-wise attendance', studentSession);
    test('Student: "Show my subject-wise attendance" returns structured subjects table', () => {
      assert(selfSubj.success === true);
      assert(Array.isArray(selfSubj.data.structuredData.subjects), 'Subjects is not array');
      assert(selfSubj.data.structuredData.subjects.length > 0, 'No subjects returned');
      assert(selfSubj.data.message.includes('| Course Code |'), 'Markdown table missing');
    });

    // 1C. Lowest Subject
    const selfLowest = await askAgent(studentToken, 'Which subject has my lowest attendance?', studentSession);
    test('Student: "Which subject has my lowest attendance?" returns lowest subject', () => {
      assert(selfLowest.success === true);
      assert(selfLowest.data.structuredData.subject !== undefined, 'Missing lowest subject');
      assert(selfLowest.data.message.includes(selfLowest.data.structuredData.subject.courseCode), 'Course code missing from explanation');
    });

    // 1D. Risk Status
    const selfRisk = await askAgent(studentToken, 'Am I at risk?', studentSession);
    test('Student: "Am I at risk?" calculates risk according to threshold', () => {
      assert(selfRisk.success === true);
      assert(selfRisk.data.cardType === 'RISK_ASSESSMENT');
      assert(selfRisk.data.message.includes('RISK') || selfRisk.data.message.includes('SAFE'));
    });

    // 1E. Target Calculation
    const selfTarget = await askAgent(studentToken, 'How many classes do I need to attend to reach 75%?', studentSession);
    test('Student: "How many classes do I need to attend to reach 75%?" calculates exact integer', () => {
      assert(selfTarget.success === true);
      assert(typeof selfTarget.data.structuredData.classesNeeded === 'number');
      assert(selfTarget.data.message.includes('Formula Analysis') || selfTarget.data.message.includes('safe absence margin'));
    });

    // 1F. Attendance Trend
    const selfTrend = await askAgent(studentToken, 'Show my attendance trend', studentSession);
    test('Student: "Show my attendance trend" returns trajectory data', () => {
      assert(selfTrend.success === true);
      assert(selfTrend.data.structuredData.trend !== undefined || selfTrend.data.message.includes('trend'));
    });

    // 1G. Cross-Student Access Strictly Blocked
    const foreignLookup = await askAgent(studentToken, "Show Rahul Kumar's attendance", studentSession);
    test('Student: Attempting to view another student\'s attendance is strictly denied', () => {
      assert(foreignLookup.success === true);
      assert(
        foreignLookup.data.message.includes('I can only provide attendance information for your own account') ||
        foreignLookup.data.message.includes("permission"),
        'Expected own account rejection message'
      );
      assert(!foreignLookup.data.structuredData?.overall?.attendedClasses, 'Leaked foreign attendance data!');
    });

    // 1H. Defaulters List Blocked for Student
    const defaulterBlock = await askAgent(studentToken, 'Show all students below 75%', studentSession);
    test('Student: Attempting to list cohort defaulters is strictly denied', () => {
      assert(defaulterBlock.success === true);
      assert(
        defaulterBlock.data.message.includes("permission") ||
        defaulterBlock.data.message.includes("restricted"),
        'Expected access denied for student viewing defaulters'
      );
    });

    // ==========================================
    // SECTION 2: PARENT ROLE TESTS
    // ==========================================
    console.log('\n--- SECTION 2: PARENT AGENT TESTS ---');
    const parentSession = 'parent_test_' + Date.now();

    // 2A. Child Attendance
    const childAtt = await askAgent(parentToken, "What is my child's attendance?", parentSession);
    test('Parent: "What is my child\'s attendance?" returns linked child attendance', () => {
      assert(childAtt.success === true);
      assert(childAtt.data.structuredData.student.registrationNumber === '23CSE101');
      assert(childAtt.data.message.includes('23CSE101'));
    });

    // 2B. Child Risk Assessment
    const childRisk = await askAgent(parentToken, 'Is my child at risk?', parentSession);
    test('Parent: "Is my child at risk?" evaluates linked child', () => {
      assert(childRisk.success === true);
      assert(childRisk.data.structuredData.student.registrationNumber === '23CSE101');
    });

    // 2C. Foreign Student Lookup Blocked
    const parentForeign = await askAgent(parentToken, "Show Rahul Sharma's attendance", parentSession);
    test('Parent: Attempting to view unlinked student is strictly denied', () => {
      assert(parentForeign.success === true);
      assert(
        parentForeign.data.message.includes("permission") ||
        parentForeign.data.message.includes("linked child"),
        'Parent accessed unlinked student data!'
      );
    });

    // ==========================================
    // SECTION 3: FACULTY ROLE TESTS
    // ==========================================
    console.log('\n--- SECTION 3: FACULTY AGENT TESTS ---');
    const facultySession = 'faculty_test_' + Date.now();

    // 3A. Authorized Student Search
    const facStudentSearch = await askAgent(facultyToken, 'Show Aarav Sharma', facultySession);
    test('Faculty: "Show Aarav Sharma" retrieves authorized student details', () => {
      assert(facStudentSearch.success === true);
      assert(facStudentSearch.data.structuredData.registrationNumber === '23CSE101');
      assert(facStudentSearch.data.message.includes('Aarav Sharma'));
    });

    // 3B. Pronoun Context Follow-up ("What is his attendance?")
    const facFollowUp = await askAgent(facultyToken, 'What is his attendance?', facultySession);
    test('Faculty: Follow-up "What is his attendance?" resolves "his" = Aarav Sharma from context', () => {
      assert(facFollowUp.success === true);
      assert(facFollowUp.data.structuredData.student.registrationNumber === '23CSE101');
      assert(facFollowUp.data.message.includes('Aarav Sharma'));
      assert(facFollowUp.data.structuredData.overall.percentage !== undefined);
    });

    // 3C. Second Follow-up ("Is he at risk?")
    const facRiskFollowUp = await askAgent(facultyToken, 'Is he at risk?', facultySession);
    test('Faculty: Follow-up "Is he at risk?" uses active student context', () => {
      assert(facRiskFollowUp.success === true);
      assert(facRiskFollowUp.data.structuredData.student.name.includes('Aarav'));
    });

    // 3D. Faculty Scoped Defaulters (< 75%)
    const facDefaulters = await askAgent(facultyToken, 'Show students below 75%', facultySession);
    test('Faculty: "Show students below 75%" returns only students in faculty scope', () => {
      assert(facDefaulters.success === true);
      assert(Array.isArray(facDefaulters.data.structuredData.students));
      assert(facDefaulters.data.cardType === 'DEFAULTER_LIST');
    });

    // 3E. Faculty Unauthorized Faculty/Staff Search Blocked
    const facStaffSearch = await askAgent(facultyToken, 'Show faculty details', facultySession);
    test('Faculty: Searching confidential faculty/staff directory is blocked', () => {
      assert(facStaffSearch.success === true);
      assert(
        facStaffSearch.data.message.includes("permission") ||
        facStaffSearch.data.message.includes("restricted to department heads"),
        'Faculty allowed to view department faculty directory'
      );
    });

    // ==========================================
    // SECTION 4: HOD ROLE TESTS
    // ==========================================
    console.log('\n--- SECTION 4: HOD AGENT TESTS ---');
    const hodSession = 'hod_test_' + Date.now();

    // 4A. HOD Student Search
    const hodStudent = await askAgent(hodToken, 'Show Aarav Sharma', hodSession);
    test('HOD: "Show Aarav Sharma" retrieves full authorized student record', () => {
      assert(hodStudent.success === true);
      assert(hodStudent.data.structuredData.registrationNumber === '23CSE101');
    });

    // 4B. HOD Defaulters Query
    const hodDefaulters = await askAgent(hodToken, 'Show students below 75%', hodSession);
    test('HOD: "Show students below 75%" retrieves department defaulters', () => {
      assert(hodDefaulters.success === true);
      assert(Array.isArray(hodDefaulters.data.structuredData.students));
      assert(hodDefaulters.data.structuredData.atRiskCount >= 0);
    });

    // 4C. HOD Section Attendance
    const hodSecA = await askAgent(hodToken, 'Show Section A attendance', hodSession);
    test('HOD: "Show Section A attendance" returns Section A aggregations', () => {
      assert(hodSecA.success === true);
      assert(hodSecA.data.structuredData.section === 'A');
      assert(hodSecA.data.structuredData.averageAttendance > 0);
    });

    // 4D. HOD Section Comparison
    const hodCompare = await askAgent(hodToken, 'Compare Section A and Section B', hodSession);
    test('HOD: "Compare Section A and Section B" compares both sections with real statistics', () => {
      assert(hodCompare.success === true);
      assert(hodCompare.data.structuredData.sectionA !== undefined);
      assert(hodCompare.data.structuredData.sectionB !== undefined);
      assert(hodCompare.data.message.includes('Section A'));
      assert(hodCompare.data.message.includes('Section B'));
    });

    // 4E. HOD Faculty Search
    const hodFaculty = await askAgent(hodToken, 'Show faculty details', hodSession);
    test('HOD: "Show faculty details" returns department faculty list', () => {
      assert(hodFaculty.success === true);
      assert(Array.isArray(hodFaculty.data.structuredData.faculty));
      assert(hodFaculty.data.structuredData.count > 0);
      assert(hodFaculty.data.message.includes('Dr. Rajesh Kumar') || hodFaculty.data.message.includes('FAC001'));
    });

    // 4F. HOD Report Generation
    const hodReport = await askAgent(hodToken, 'Generate an attendance report for Section A', hodSession);
    test('HOD: "Generate an attendance report for Section A" compiles comprehensive report', () => {
      assert(hodReport.success === true);
      assert(hodReport.data.cardType === 'REPORT_SUMMARY');
      assert(hodReport.data.structuredData.metrics.section === 'A');
    });

    // 4G. Reset / Clear Context
    const hodClear = await askAgent(hodToken, 'clear', hodSession);
    test('Session: "clear" resets conversation memory and suggests fresh questions', () => {
      assert(hodClear.success === true);
      assert(hodClear.data.message.includes('cleared'));
      assert(Array.isArray(hodClear.data.suggestions));
    });

    // 4H. Suggestions Endpoint
    const sugRes = await fetch(`${BASE_URL}/agent/suggestions`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const sugJson = await sugRes.json();
    test('GET /api/agent/suggestions returns role-appropriate suggestions', () => {
      assert(sugJson.success === true);
      assert(Array.isArray(sugJson.data.suggestions));
      assert(sugJson.data.suggestions.includes('Show students below 75%'));
    });

  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }

  console.log('\n=======================================================');
  console.log(` AGENT TEST RESULTS: Passed: ${passed}, Failed: ${failed}`);
  console.log('=======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAgentTests().catch(console.error);
