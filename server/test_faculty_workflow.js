const axios = require('axios');
const prisma = require('./src/config/db');
const bcrypt = require('bcryptjs');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== STARTING FACULTY MANAGEMENT WORKFLOW INTEGRATION TEST ===\n');

  try {
    // 0. Clean up any previous test record for FAC999
    const existingStaff = await prisma.staff.findUnique({ where: { employeeId: 'FAC999' } });
    if (existingStaff) {
      await prisma.facultySubjectAssignment.deleteMany({ where: { facultyId: existingStaff.id } });
      await prisma.staff.delete({ where: { id: existingStaff.id } });
      await prisma.user.delete({ where: { id: existingStaff.userId } });
      console.log('Cleaned up previous FAC999 test user.');
    }

    // 1. HOD Login
    console.log('1. Logging in as HOD...');
    const hodLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'HOD001',
      password: 'HOD@123',
      userType: 'HOD',
    });
    const hodToken = hodLoginRes.data.data.token;
    console.log('✓ HOD logged in successfully. Token acquired.');

    // 2. Fetch Form Metadata (departments, courses, etc.)
    console.log('\n2. Fetching form metadata for HOD...');
    const metaRes = await axios.get(`${BASE_URL}/hod/faculty/form-meta`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const { departments, courses } = metaRes.data.data;
    console.log(`✓ Metadata loaded: ${departments.length} departments, ${courses.length} courses.`);

    const cseDept = departments.find((d) => d.code === 'CSE') || departments[0];
    const sem5Course = courses.find((c) => c.semester === 5) || courses[0];
    console.log(`Using Department: ${cseDept.name} (${cseDept.id})`);
    console.log(`Using Course: ${sem5Course.courseCode} - ${sem5Course.courseName} (Sem ${sem5Course.semester})`);

    // 3. Create New Faculty
    console.log('\n3. Creating new faculty via POST /api/hod/faculty...');
    const newFacultyPayload = {
      name: 'Dr. Alan Turing',
      employeeId: 'FAC999',
      email: 'alan.turing@university.edu',
      password: 'SecurePassword123!',
      mobileNumber: '+91 9876543210',
      designation: 'Professor',
      departmentId: cseDept.id,
      status: 'ACTIVE',
    };

    const createRes = await axios.post(`${BASE_URL}/hod/faculty`, newFacultyPayload, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    console.log('✓ Create response:', createRes.data.message);
    const createdFaculty = createRes.data.data;
    console.log(`✓ Faculty created: ID=${createdFaculty.id}, EmpID=${createdFaculty.employeeId}, Status=${createdFaculty.status}`);

    // Verify password is NOT in response
    if (createRes.data.data.password || createRes.data.data.passwordHash) {
      throw new Error('SECURITY VIOLATION: Password hash exposed in API response!');
    }
    console.log('✓ Password hash is NOT exposed in API response.');

    // Verify in database that password is encrypted with bcrypt
    const dbUser = await prisma.user.findFirst({ where: { identifier: 'FAC999' } });
    if (!dbUser || dbUser.passwordHash === 'SecurePassword123!') {
      throw new Error('SECURITY VIOLATION: Password stored in plain text!');
    }
    const isBcryptValid = await bcrypt.compare('SecurePassword123!', dbUser.passwordHash);
    if (!isBcryptValid) {
      throw new Error('Bcrypt hash mismatch!');
    }
    console.log('✓ Password securely hashed with bcrypt in database.');

    // 4. Verify Duplicate Prevention for Faculty Creation
    console.log('\n4. Testing duplicate employee ID & email prevention...');
    try {
      await axios.post(`${BASE_URL}/hod/faculty`, newFacultyPayload, {
        headers: { Authorization: `Bearer ${hodToken}` },
      });
      throw new Error('Duplicate faculty creation should have failed!');
    } catch (err) {
      if (err.response?.status === 400) {
        console.log('✓ Duplicate creation successfully rejected with 400 Bad Request:', err.response.data.message);
      } else {
        throw err;
      }
    }

    // 5. Test Faculty Login with New Credentials (Zero Assignments)
    console.log('\n5. Logging in as newly created Faculty (FAC999)...');
    const facultyLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'FAC999',
      password: 'SecurePassword123!',
      userType: 'STAFF',
    });
    const facultyToken = facultyLoginRes.data.data.token;
    console.log('✓ Faculty logged in successfully with new credentials!');
    console.log('✓ Role:', facultyLoginRes.data.data.user.roleName || facultyLoginRes.data.data.user.role);

    // 6. Verify Faculty Access Controls
    console.log('\n6. Verifying Faculty authorization scope...');
    const classesRes = await axios.get(`${BASE_URL}/faculty/classes`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    console.log(`✓ Faculty classes fetched: ${classesRes.data.data.length} assigned classes (expected 0).`);

    // Verify Faculty CANNOT access HOD routes
    try {
      await axios.get(`${BASE_URL}/hod/faculty`, {
        headers: { Authorization: `Bearer ${facultyToken}` },
      });
      throw new Error('Security Breach: Faculty was able to access HOD route!');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('✓ Faculty access to HOD routes correctly blocked with 403 Forbidden.');
      } else {
        throw err;
      }
    }

    // 7. HOD Assigns Faculty to Class
    console.log('\n7. HOD assigning Faculty to course...');
    const assignPayload = {
      facultyId: createdFaculty.id,
      courseId: sem5Course.id,
      section: 'A',
      semester: sem5Course.semester,
      academicYear: '2026-2027',
    };

    const assignRes = await axios.post(`${BASE_URL}/hod/faculty/assign`, assignPayload, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    console.log('✓ Assignment response:', assignRes.data.message);
    const assignmentId = assignRes.data.data.id;

    // 8. Verify Duplicate Assignment Prevention
    console.log('\n8. Testing duplicate assignment rejection...');
    try {
      await axios.post(`${BASE_URL}/hod/faculty/assign`, assignPayload, {
        headers: { Authorization: `Bearer ${hodToken}` },
      });
      throw new Error('Duplicate assignment should have failed!');
    } catch (err) {
      if (err.response?.status === 409) {
        console.log('✓ Duplicate assignment correctly rejected with 409 Conflict:', err.response.data.message);
      } else {
        throw err;
      }
    }

    // 9. Verify Faculty Now Sees Assigned Class
    console.log('\n9. Checking assigned classes from faculty perspective...');
    const updatedClassesRes = await axios.get(`${BASE_URL}/faculty/classes`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    console.log(`✓ Faculty classes now count: ${updatedClassesRes.data.data.length}`);
    if (updatedClassesRes.data.data.length !== 1) {
      throw new Error('Expected 1 assigned class for faculty!');
    }
    console.log(`✓ Class: ${updatedClassesRes.data.data[0].courseCode} - ${updatedClassesRes.data.data[0].courseName} (${updatedClassesRes.data.data[0].section})`);

    // 10. Test Dedicated /api/faculty-assignments route
    console.log('\n10. Testing REST /api/faculty-assignments endpoints...');
    const listAssignRes = await axios.get(`${BASE_URL}/faculty-assignments?facultyId=${createdFaculty.id}`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    console.log(`✓ GET /api/faculty-assignments returned ${listAssignRes.data.data.length} records.`);

    // 11. Test Deactivation Blocks Login
    console.log('\n11. Testing faculty deactivation...');
    await axios.patch(`${BASE_URL}/hod/faculty/${createdFaculty.id}/status`, { status: 'INACTIVE' }, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    console.log('✓ Faculty status updated to INACTIVE.');

    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        identifier: 'FAC999',
        password: 'SecurePassword123!',
        userType: 'STAFF',
      });
      throw new Error('Deactivated faculty should not be able to log in!');
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        console.log('✓ Login blocked for deactivated faculty with error:', err.response.data.message);
      } else {
        throw err;
      }
    }

    // 12. Cleanup
    console.log('\n12. Cleaning up test data...');
    await axios.delete(`${BASE_URL}/faculty-assignments/${assignmentId}`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    await prisma.staff.delete({ where: { id: createdFaculty.id } });
    await prisma.user.delete({ where: { id: dbUser.id } });
    console.log('✓ Cleaned up test data.');

    console.log('\n======================================================');
    console.log('🎉 ALL FACULTY WORKFLOW INTEGRATION TESTS PASSED!');
    console.log('======================================================');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
