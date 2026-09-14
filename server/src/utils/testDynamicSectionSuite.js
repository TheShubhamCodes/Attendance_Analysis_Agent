const axios = require('axios');
const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5000/api';

async function runSuite() {
  console.log('===============================================================');
  console.log('   DYNAMIC SECTION CAPACITY & ATTENDANCE VERIFICATION SUITE    ');
  console.log('===============================================================');

  try {
    // 1. Authenticate as HOD
    console.log('\n[TEST 1] Authenticating as HOD...');
    const hodLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'HOD001',
      password: 'Hod@1234',
      role: 'HOD',
    });

    assert(hodLoginRes.data.success, 'HOD login must succeed');
    const hodToken = hodLoginRes.data.data.token;
    const hodHeaders = { Authorization: `Bearer ${hodToken}` };
    console.log('✓ HOD authenticated successfully.');

    // 2. Query initial dynamic section counts
    console.log('\n[TEST 2] Verifying HOD getStudents dynamic section aggregation...');
    const initialStudentsRes = await axios.get(`${BASE_URL}/hod/students?page=1&limit=10`, {
      headers: hodHeaders,
    });
    assert(initialStudentsRes.data.success, 'HOD getStudents must succeed');
    const { sectionCounts: initialSectionCounts, totalActiveStudents: initialTotal } = initialStudentsRes.data.data;
    console.log('Initial dynamic section counts from PostgreSQL:', initialSectionCounts);
    console.log('Initial total active students:', initialTotal);
    assert(Array.isArray(initialSectionCounts), 'sectionCounts must be an array');
    assert(typeof initialTotal === 'number', 'totalActiveStudents must be a number');
    console.log('✓ Dynamic section breakdown returned from PostgreSQL.');

    // 3. Authenticate as Faculty FAC001
    console.log('\n[TEST 3] Authenticating as Faculty FAC001...');
    const facultyLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'FAC001',
      password: 'Faculty@123',
      role: 'FACULTY',
    });
    assert(facultyLoginRes.data.success, 'Faculty login must succeed');
    const facultyToken = facultyLoginRes.data.data.token;
    const facultyHeaders = { Authorization: `Bearer ${facultyToken}` };
    console.log('✓ Faculty FAC001 authenticated successfully.');

    // 4. Check Faculty classes enrolled counts
    console.log('\n[TEST 4] Checking Faculty My Classes enrolled students count...');
    const classesRes = await axios.get(`${BASE_URL}/faculty/classes`, {
      headers: facultyHeaders,
    });
    assert(classesRes.data.success, 'Faculty getClasses must succeed');
    const assignedClasses = classesRes.data.data;
    assert(assignedClasses.length > 0, 'Faculty must have at least one teaching assignment');
    console.log(`✓ Faculty has ${assignedClasses.length} assigned classes:`);
    assignedClasses.forEach((c) => {
      console.log(`   - ${c.courseCode} (${c.courseName}) | Section ${c.section} | Enrolled: ${c.enrolledStudentsCount} Students`);
    });

    const targetClass = assignedClasses.find((c) => c.section === 'A') || assignedClasses[0];
    console.log(`Using target class for attendance test: ${targetClass.courseCode} Sec ${targetClass.section} (Dept: ${targetClass.departmentId})`);

    // 5. Generate CSV with 63 students in Section A
    console.log('\n[TEST 5] Generating 63 students for Section A (testing beyond 40-student limit)...');
    const testStudents = [];
    for (let i = 1; i <= 63; i++) {
      const pad = String(i).padStart(3, '0');
      testStudents.push({
        registrationNumber: `REG63_${pad}`,
        name: `Student 63 Test ${pad}`,
        email: `student63_${pad}@university.edu`,
        section: targetClass.section,
        year: targetClass.semester,
        mobileNumber: `9840${pad}000`,
        parentName: `Parent 63 ${pad}`,
        parentMobile: `9840${pad}999`,
        parentEmail: `parent63_${pad}@gmail.com`,
      });
    }
    assert(testStudents.length === 63, 'Must have generated exactly 63 students');
    console.log(`✓ Generated ${testStudents.length} students with registration numbers REG63_001 to REG63_063.`);

    // 6. Bulk Validate Students
    console.log('\n[TEST 6] Validating 63 students via HOD CSV Bulk Validate API...');
    const validateRes = await axios.post(
      `${BASE_URL}/hod/students/bulk-validate`,
      { students: testStudents },
      { headers: hodHeaders }
    );
    assert(validateRes.data.success, 'Bulk validate must succeed');
    assert(validateRes.data.data.validCount === 63, `Expected 63 valid rows, got ${validateRes.data.data.validCount}`);
    assert(validateRes.data.data.invalidCount === 0, `Expected 0 invalid rows, got ${validateRes.data.data.invalidCount}`);
    console.log(`✓ CSV Validation successful: 63 valid rows, 0 invalid rows.`);

    // 7. Bulk Import Students
    console.log('\n[TEST 7] Importing all 63 students into PostgreSQL...');
    const importRes = await axios.post(
      `${BASE_URL}/hod/students/bulk-import`,
      { students: validateRes.data.data.validRows },
      { headers: hodHeaders }
    );
    assert(importRes.data.success, 'Bulk import must succeed');
    assert(importRes.data.data.importedCount === 63, `Expected importedCount 63, got ${importRes.data.data.importedCount}`);
    assert(
      importRes.data.data.sectionSummary && importRes.data.data.sectionSummary[targetClass.section] === 63,
      `Expected sectionSummary for ${targetClass.section} to be 63`
    );
    console.log(`✓ Bulk Import successful: ${importRes.data.data.importedCount} students imported.`);
    console.log('Section summary returned:', importRes.data.data.sectionSummary);

    // 8. Direct PostgreSQL verification
    console.log('\n[TEST 8] Querying PostgreSQL directly to verify student persistence...');
    const dbCount = await prisma.student.count({
      where: {
        registrationNumber: { startsWith: 'REG63_' },
        section: targetClass.section,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
    assert(dbCount === 63, `Expected 63 students in DB, found ${dbCount}`);
    console.log(`✓ Verified in PostgreSQL: exactly ${dbCount} students created in Section ${targetClass.section}.`);

    // 9. Verify HOD dynamic section count updated automatically
    console.log('\n[TEST 9] Verifying HOD getStudents reflects the updated section counts...');
    const updatedStudentsRes = await axios.get(`${BASE_URL}/hod/students?page=1&limit=10`, {
      headers: hodHeaders,
    });
    assert(updatedStudentsRes.data.success, 'HOD getStudents must succeed');
    const updatedCounts = updatedStudentsRes.data.data.sectionCounts;
    const targetSecObj = updatedCounts.find((s) => s.section === targetClass.section);
    console.log('Updated dynamic section counts:', updatedCounts);
    assert(targetSecObj && targetSecObj.count >= 63, `Expected Section ${targetClass.section} count >= 63, got ${targetSecObj?.count}`);
    console.log(`✓ Dynamic section count for Section ${targetClass.section} is now ${targetSecObj.count} students (dynamically updated from PostgreSQL).`);

    // 10. Verify Faculty getSectionStudents with limit=all returns all students (>= 63)
    console.log('\n[TEST 10] Verifying Faculty getSectionStudents with limit=all...');
    const facultySectionRes = await axios.get(
      `${BASE_URL}/faculty/attendance/students?departmentId=${targetClass.departmentId}&section=${targetClass.section}&courseId=${targetClass.courseId}&semester=${targetClass.semester}&limit=all`,
      { headers: facultyHeaders }
    );
    assert(facultySectionRes.data.success, 'Faculty getSectionStudents must succeed');
    const sectionStudents = facultySectionRes.data.data.students;
    console.log(`Total students loaded for attendance marking session: ${sectionStudents.length}`);
    assert(sectionStudents.length >= 63, `Expected at least 63 students, got ${sectionStudents.length}`);
    console.log('✓ Full section loaded without 40 or 50 student truncation limit.');

    // 11. Mark attendance for the entire section (simulating multi-page UI submission)
    console.log('\n[TEST 11] Submitting attendance for the entire section (including all 63 test students)...');
    const attendanceDate = new Date().toISOString().split('T')[0];
    const period = 8; // Use period 8 to avoid collision with any existing test

    // Filter to the 63 test students to test complete submission
    const testDbStudents = await prisma.student.findMany({
      where: { registrationNumber: { startsWith: 'REG63_' } },
      select: { id: true, registrationNumber: true },
      orderBy: { registrationNumber: 'asc' },
    });

    const attendanceList = testDbStudents.map((s, idx) => ({
      studentId: s.id,
      // First 50 (Page 1) are Present, Remaining 13 (Page 2) are Absent
      status: idx < 50 ? 'PRESENT' : 'ABSENT',
    }));

    const attendanceSubmitRes = await axios.post(
      `${BASE_URL}/faculty/attendance`,
      {
        courseId: targetClass.courseId,
        section: targetClass.section,
        semester: targetClass.semester,
        period,
        date: attendanceDate,
        attendanceList,
      },
      { headers: facultyHeaders }
    );

    assert(attendanceSubmitRes.data.success, 'Attendance submission must succeed');
    assert(attendanceSubmitRes.data.data.present === 50, `Expected 50 present, got ${attendanceSubmitRes.data.data.present}`);
    assert(attendanceSubmitRes.data.data.absent === 13, `Expected 13 absent, got ${attendanceSubmitRes.data.data.absent}`);
    console.log(`✓ Attendance successfully recorded for all ${attendanceList.length} students across both pages (Present: ${attendanceSubmitRes.data.data.present}, Absent: ${attendanceSubmitRes.data.data.absent}).`);

    // 12. Verify PostgreSQL Attendance records
    console.log('\n[TEST 12] Verifying attendance records persisted in PostgreSQL...');
    const dbAttendanceCount = await prisma.attendance.count({
      where: {
        student: { registrationNumber: { startsWith: 'REG63_' } },
        courseId: targetClass.courseId,
        section: targetClass.section,
        period,
      },
    });
    assert(dbAttendanceCount === 63, `Expected 63 attendance records in PostgreSQL, found ${dbAttendanceCount}`);
    console.log(`✓ Exactly ${dbAttendanceCount} attendance records verified in PostgreSQL.`);

    // 13. Clean up test records (ONLY the REG63_ test records created in this run)
    console.log('\n[TEST 13] Cleaning up test-created records (REG63_*)...');
    await prisma.attendance.deleteMany({
      where: { student: { registrationNumber: { startsWith: 'REG63_' } } },
    });
    await prisma.parent.deleteMany({
      where: { linkedStudent: { registrationNumber: { startsWith: 'REG63_' } } },
    });
    await prisma.student.deleteMany({
      where: { registrationNumber: { startsWith: 'REG63_' } },
    });
    await prisma.user.deleteMany({
      where: { identifier: { startsWith: 'REG63_' } },
    });
    console.log('✓ Successfully cleaned up all 63 test student accounts, parent accounts, and attendance records.');

    console.log('\n===============================================================');
    console.log('   ALL TESTS PASSED! DYNAMIC SECTION CAPACITY FULLY VERIFIED   ');
    console.log('===============================================================');
  } catch (error) {
    console.error('Test Suite Failure:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSuite();
