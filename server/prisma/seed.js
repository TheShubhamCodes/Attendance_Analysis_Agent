const {
  PrismaClient,
  Role,
  StaffRole,
  AccountStatus,
  AttendanceStatus,
  AssessmentType,
  NotificationType,
  InterventionType,
  InterventionStatus,
  MeetingStatus,
  CorrectionStatus,
} = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with realistic university faculty, staff, and student data...');

  // Clean existing records in reverse dependency order
  await prisma.attendanceCorrectionRequest.deleteMany();
  await prisma.attendanceAuditLog.deleteMany();
  await prisma.facultyOtpVerification.deleteMany();
  await prisma.mentorMeetingRequest.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.performance.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.counselorAssignment.deleteMany();
  await prisma.facultySubjectAssignment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Departments
  const cseDept = await prisma.department.create({
    data: {
      name: 'Computer Science & Engineering',
      code: 'CSE',
    },
  });

  const itDept = await prisma.department.create({
    data: {
      name: 'Information Technology',
      code: 'IT',
    },
  });

  const eceDept = await prisma.department.create({
    data: {
      name: 'Electronics & Communication Engineering',
      code: 'ECE',
    },
  });

  // 2. Hash Passwords
  const studentPasswordHash = await bcrypt.hash('Student@123', 10);
  const parentPasswordHash = await bcrypt.hash('Parent@123', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@123', 10);
  const facultyPasswordHash = await bcrypt.hash('Faculty@123', 10);
  const hodPasswordHash = await bcrypt.hash('Hod@1234', 10);

  // 3. Create HOD, Staff & Faculty Accounts
  // A) DEMO HOD: HOD001 / Hod@1234 (Computer Science & Engineering)
  const hodUser1 = await prisma.user.create({
    data: {
      identifier: 'HOD001',
      passwordHash: hodPasswordHash,
      role: Role.HOD,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  const demoHod = await prisma.staff.create({
    data: {
      userId: hodUser1.id,
      employeeId: 'HOD001',
      name: 'Dr. Suresh Varma',
      email: 'suresh.varma@university.edu',
      mobileNumber: '9840556677',
      departmentId: cseDept.id,
      staffRole: StaffRole.HOD,
      designation: 'Professor & Head of Department',
      cabinLocation: 'Academic Block 1, Room 101',
      status: 'ACTIVE',
    },
  });

  // B) HOD002 / Hod@1234 (Information Technology - for cross-dept isolation testing)
  const hodUser2 = await prisma.user.create({
    data: {
      identifier: 'HOD002',
      passwordHash: hodPasswordHash,
      role: Role.HOD,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  const itHod = await prisma.staff.create({
    data: {
      userId: hodUser2.id,
      employeeId: 'HOD002',
      name: 'Dr. Priya Nambiar',
      email: 'priya.nambiar@university.edu',
      mobileNumber: '9840778899',
      departmentId: itDept.id,
      staffRole: StaffRole.HOD,
      designation: 'Professor & Head of Department',
      cabinLocation: 'IT Block, Room 201',
      status: 'ACTIVE',
    },
  });

  // C) DEMO FACULTY: FAC001 / Faculty@123
  const facultyUser1 = await prisma.user.create({
    data: {
      identifier: 'FAC001',
      passwordHash: facultyPasswordHash,
      role: Role.STAFF,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  const demoFaculty = await prisma.staff.create({
    data: {
      userId: facultyUser1.id,
      employeeId: 'FAC001',
      name: 'Dr. Rajesh Kumar',
      email: 'rajesh.kumar@university.edu',
      mobileNumber: '9840112233',
      departmentId: cseDept.id,
      staffRole: StaffRole.FACULTY,
      designation: 'Associate Professor',
      cabinLocation: 'Academic Block 2, Room 304',
      status: 'ACTIVE',
    },
  });

  // B) STAFF001 (Mentor)
  const staffUser1 = await prisma.user.create({
    data: {
      identifier: 'STAFF001',
      passwordHash: staffPasswordHash,
      role: Role.STAFF,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  const mentorStaff = await prisma.staff.create({
    data: {
      userId: staffUser1.id,
      employeeId: 'STAFF001',
      name: 'Dr. K. Ramanathan',
      email: 'k.ramanathan@university.edu',
      mobileNumber: '9840123456',
      departmentId: cseDept.id,
      staffRole: StaffRole.MENTOR,
      designation: 'Professor & Head',
      cabinLocation: 'Academic Block 3, Room 412',
      status: 'ACTIVE',
    },
  });

  // C) STAFF002 (Faculty)
  const staffUser2 = await prisma.user.create({
    data: {
      identifier: 'STAFF002',
      passwordHash: staffPasswordHash,
      role: Role.STAFF,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  const facultyStaff2 = await prisma.staff.create({
    data: {
      userId: staffUser2.id,
      employeeId: 'STAFF002',
      name: 'Prof. Ananya Sharma',
      email: 'ananya.sharma@university.edu',
      mobileNumber: '9840987654',
      departmentId: cseDept.id,
      staffRole: StaffRole.FACULTY,
      designation: 'Assistant Professor',
      cabinLocation: 'Academic Block 3, Room 208',
      status: 'ACTIVE',
    },
  });

  // 4. Create Courses
  const cnCourse = await prisma.course.create({
    data: {
      courseCode: 'CS301',
      courseName: 'Computer Networks',
      departmentId: cseDept.id,
      facultyId: demoFaculty.id,
      credits: 4,
      semester: 5,
      academicYear: '2026-2027',
    },
  });

  const dbmsCourse = await prisma.course.create({
    data: {
      courseCode: 'CS303',
      courseName: 'Database Management Systems',
      departmentId: cseDept.id,
      facultyId: demoFaculty.id,
      credits: 4,
      semester: 5,
      academicYear: '2026-2027',
    },
  });

  const cloudCourse = await prisma.course.create({
    data: {
      courseCode: 'CS305',
      courseName: 'Cloud Computing Architecture',
      departmentId: cseDept.id,
      facultyId: demoFaculty.id,
      credits: 3,
      semester: 5,
      academicYear: '2026-2027',
    },
  });

  const osCourse = await prisma.course.create({
    data: {
      courseCode: 'CS302',
      courseName: 'Operating Systems',
      departmentId: cseDept.id,
      facultyId: facultyStaff2.id,
      credits: 4,
      semester: 5,
      academicYear: '2026-2027',
    },
  });

  const mathCourse = await prisma.course.create({
    data: {
      courseCode: 'MA301',
      courseName: 'Discrete Mathematics',
      departmentId: cseDept.id,
      facultyId: mentorStaff.id,
      credits: 3,
      semester: 5,
      academicYear: '2026-2027',
    },
  });

  // 5. Assign Subjects/Classes to Demo Faculty (FAC001)
  const assignments = [
    { facultyId: demoFaculty.id, courseId: cnCourse.id, section: 'A', semester: 5, academicYear: '2026-2027' },
    { facultyId: demoFaculty.id, courseId: cnCourse.id, section: 'B', semester: 5, academicYear: '2026-2027' },
    { facultyId: demoFaculty.id, courseId: dbmsCourse.id, section: 'A', semester: 5, academicYear: '2026-2027' },
    { facultyId: demoFaculty.id, courseId: cloudCourse.id, section: 'A', semester: 5, academicYear: '2026-2027' },
  ];

  for (const a of assignments) {
    await prisma.facultySubjectAssignment.create({ data: a });
  }

  // 6. Create Students
  // A) Student 1: 23CSE101 (Preserve existing student for student portal)
  const studentUser1 = await prisma.user.create({
    data: {
      identifier: '23CSE101',
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  const studentAarav = await prisma.student.create({
    data: {
      userId: studentUser1.id,
      registrationNumber: '23CSE101',
      name: 'Aarav Sharma',
      email: 'aarav.23cse101@university.edu',
      dateOfBirth: new Date('2004-05-15'),
      departmentId: cseDept.id,
      year: 3,
      section: 'A',
      mobileNumber: '9876500001',
      personalEmail: 'aarav.personal@gmail.com',
      mentorId: mentorStaff.id,
    },
  });

  // Create Parent for 23CSE101
  const parentUser1 = await prisma.user.create({
    data: {
      identifier: '23CSE101',
      passwordHash: parentPasswordHash,
      role: Role.PARENT,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  await prisma.parent.create({
    data: {
      userId: parentUser1.id,
      name: 'Rajesh Sharma',
      email: 'rajesh.sharma@parentmail.com',
      mobile: '9876543210',
      linkedStudentId: studentAarav.id,
    },
  });

  // B) Create 45 additional students to populate Section A and Section B with realistic university registration numbers
  // Format resembling university registration numbers: 241FA04326, 241FA04601, etc.
  const sampleRollSuffixes = [
    '241FA04326', '241FA04601', '241FA04740', '241FA04A63', '241FA04A64', '241FA04A71',
    '241FA04A75', '241FA04A82', '241FA04A90', '241FA04B01', '241FA04B05', '241FA04B12',
    '241FA04B18', '241FA04B22', '241FA04B29', '241FA04B35', '241FA04B40', '241FA04B47',
    '241FA04B53', '241FA04B60', '241FA04B68', '241FA04B74', '241FA04B80', '241FA04B88',
    '241FA04B95', '241FA04C02', '241FA04C10', '241FA04C18', '241FA04C25', '241FA04C31',
    '241FA04C40', '241FA04C48', '241FA04C55', '241FA04C62', '241FA04C70', '241FA04C78',
    '241FA04C85', '241FA04C92', '241FA04D01', '241FA04D10', '241FA04D18', '241FA04D25',
    '241FA04D33', '241FA04D40', '241FA04D50',
  ];

  const firstNames = [
    'Rohan', 'Pooja', 'Vikram', 'Sneha', 'Karthik', 'Divya', 'Siddharth', 'Ananya',
    'Pranav', 'Meera', 'Aditya', 'Ishita', 'Arjun', 'Tanvi', 'Rahul', 'Neha',
    'Gautam', 'Priya', 'Varun', 'Rhea', 'Nikhil', 'Shreya', 'Sanjay', 'Deepika',
    'Harish', 'Swati', 'Vishal', 'Kavya', 'Akash', 'Monika', 'Abhinav', 'Bhavna',
    'Tarun', 'Anushka', 'Manoj', 'Gayatri', 'Chirag', 'Rashmi', 'Kunal', 'Jyoti',
    'Suraj', 'Pallavi', 'Hemant', 'Nandini', 'Umesh',
  ];

  const lastNames = [
    'Verma', 'Patel', 'Reddy', 'Iyer', 'Nair', 'Singh', 'Gupta', 'Rao',
    'Chopra', 'Mishra', 'Deshmukh', 'Joshi', 'Bhat', 'Menon', 'Pillai', 'Saxena',
    'Malhotra', 'Aggarwal', 'Tripathi', 'Pandey', 'Dutta', 'Ghosh', 'Chatterjee', 'Sen',
    'Bose', 'Das', 'Roy', 'Chakraborty', 'Mukherjee', 'Banerjee', 'Nath', 'Kulkarni',
    'Patil', 'Shinde', 'Pawar', 'More', 'Chavan', 'Gaikwad', 'Salunkhe', 'Bhosale',
    'Jadhav', 'Kadam', 'Sawant', 'Rane', 'Tiwari',
  ];

  const createdStudents = [studentAarav];

  for (let i = 0; i < sampleRollSuffixes.length; i++) {
    const regNo = sampleRollSuffixes[i];
    const sName = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
    const section = i < 35 ? 'A' : 'B'; // 35 in Section A (plus Aarav = 36), 10 in Section B

    const user = await prisma.user.create({
      data: {
        identifier: regNo,
        passwordHash: studentPasswordHash,
        role: Role.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        registrationNumber: regNo,
        name: sName,
        email: `${regNo.toLowerCase()}@university.edu`,
        dateOfBirth: new Date('2004-06-10'),
        departmentId: cseDept.id,
        year: 3,
        section,
        mobileNumber: `98765${String(10000 + i).slice(-5)}`,
        personalEmail: `${firstNames[i % firstNames.length].toLowerCase()}.${regNo.toLowerCase()}@gmail.com`,
        mentorId: i % 2 === 0 ? demoFaculty.id : mentorStaff.id,
      },
    });

    createdStudents.push(student);
  }

  // 7. Assign Counselor Students to FAC001
  // Assign 20 students to Demo Faculty as counselor students
  const counselorStudents = createdStudents.slice(0, 20);
  for (const cs of counselorStudents) {
    await prisma.counselorAssignment.create({
      data: {
        facultyId: demoFaculty.id,
        studentId: cs.id,
        academicYear: '2026-2027',
        semester: 5,
      },
    });
  }

  console.log(`Assigned ${counselorStudents.length} counselor students to FAC001.`);

  // 8. Seed Attendance Records for Counselor Students & Classes
  // We want counselor stats to produce realistic distribution:
  // - 3 High Risk (< 65%)
  // - 4 Warning (< 75%)
  // - 13 Safe (>= 75%)
  // Overall counselor average around 77-79%

  const totalSessionsPerCourse = 30;
  const attendanceRows = [];
  const baseDate = new Date('2026-07-01');

  // Generate 30 class dates across July, August, early September 2026
  const classDates = [];
  for (let d = 0; d < totalSessionsPerCourse; d++) {
    const dt = new Date(baseDate);
    dt.setDate(baseDate.getDate() + Math.floor(d * 2.3));
    // Monday-Friday
    if (dt.getDay() === 0) dt.setDate(dt.getDate() + 1);
    if (dt.getDay() === 6) dt.setDate(dt.getDate() + 2);
    classDates.push(dt);
  }

  // Attendance for Section A students across CS301, CS303, CS305
  const coursesToSeed = [
    { course: cnCourse, period: 2 },
    { course: dbmsCourse, period: 4 },
    { course: cloudCourse, period: 5 },
  ];

  // We assign specific attendance profiles to counselor students
  // index 0..2: high risk (~55-63%)
  // index 3..6: below 75% warning (~68-73%)
  // index 7..19: safe (78-95%)
  for (let sIdx = 0; sIdx < createdStudents.length; sIdx++) {
    const s = createdStudents[sIdx];
    const isCounselor = sIdx < 20;

    let targetRate = 0.85; // default 85%
    if (isCounselor) {
      if (sIdx < 3) targetRate = 0.58; // High risk
      else if (sIdx < 7) targetRate = 0.71; // Warning / below 75%
      else if (sIdx < 12) targetRate = 0.82; // Safe
      else targetRate = 0.92; // Very safe
    } else {
      targetRate = 0.75 + ((sIdx % 5) * 0.05);
    }

    // Only create records for Section A students in Section A courses
    if (s.section === 'A') {
      for (const { course, period } of coursesToSeed) {
        for (let i = 0; i < classDates.length; i++) {
          const dt = classDates[i];
          // Determine status based on targetRate with declining trend towards recent dates
          const rand = Math.random();
          let status = AttendanceStatus.PRESENT;
          const threshold = i > 20 ? targetRate - 0.1 : targetRate; // slight drop in recent classes
          if (rand > threshold) {
            status = AttendanceStatus.ABSENT;
          }

          attendanceRows.push({
            studentId: s.id,
            courseId: course.id,
            facultyId: demoFaculty.id,
            date: dt,
            period,
            section: 'A',
            status,
          });
        }
      }
    }
  }

  // Insert in batches of 1000
  console.log(`Seeding ${attendanceRows.length} attendance records...`);
  for (let i = 0; i < attendanceRows.length; i += 1000) {
    const chunk = attendanceRows.slice(i, i + 1000);
    await prisma.attendance.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  // 9. Seed Interventions for Demo Faculty Counselor Students
  const highRiskCounselor1 = counselorStudents[0];
  const highRiskCounselor2 = counselorStudents[1];
  const warningCounselor = counselorStudents[3];

  await prisma.intervention.createMany({
    data: [
      {
        studentId: highRiskCounselor1.id,
        mentorId: demoFaculty.id,
        type: InterventionType.ATTENDANCE_COUNSELLING,
        description: 'First stage counseling regarding repeated absences in Computer Networks and DBMS morning sessions.',
        date: new Date('2026-09-02'),
        status: InterventionStatus.IN_PROGRESS,
        followUpDate: new Date('2026-09-18'),
      },
      {
        studentId: highRiskCounselor2.id,
        mentorId: demoFaculty.id,
        type: InterventionType.PARENT_MEETING,
        description: 'Parent notified via phone call regarding attendance dropping below 60%. Guardian agreed to monitor transit timing.',
        date: new Date('2026-09-05'),
        status: InterventionStatus.COMPLETED,
        followUpDate: new Date('2026-09-22'),
      },
      {
        studentId: warningCounselor.id,
        mentorId: demoFaculty.id,
        type: InterventionType.ACADEMIC_SUPPORT,
        description: 'Assigned peer study buddy for Discrete Math and Computer Networks tutorial problem sets.',
        date: new Date('2026-09-08'),
        status: InterventionStatus.SCHEDULED,
        followUpDate: new Date('2026-09-25'),
      },
    ],
  });

  // 10. Seed Notifications for Demo Faculty (FAC001)
  await prisma.notification.createMany({
    data: [
      {
        staffId: demoFaculty.id,
        title: 'Counselor Alert: Attendance Warning',
        message: `Student ${highRiskCounselor1.name} (${highRiskCounselor1.registrationNumber}) has fallen below 60% overall attendance.`,
        type: NotificationType.ATTENDANCE_WARNING,
        isRead: false,
        createdAt: new Date('2026-09-10T09:00:00.000Z'),
      },
      {
        staffId: demoFaculty.id,
        title: 'Intervention Follow-up Due',
        message: `Follow-up counseling review due on 18 Sept 2026 for ${highRiskCounselor1.name}.`,
        type: NotificationType.INTERVENTION_UPDATE,
        isRead: false,
        createdAt: new Date('2026-09-09T14:30:00.000Z'),
      },
      {
        staffId: demoFaculty.id,
        title: 'Attendance Submission Confirmed',
        message: 'Attendance for CS301 (Section A, Period 2) on 09-09-2026 recorded successfully.',
        type: NotificationType.SYSTEM,
        isRead: true,
        createdAt: new Date('2026-09-09T11:00:00.000Z'),
      },
    ],
  });

  // 11. Seed an Attendance Audit Log entry for Demo Faculty
  const sampleAttendance = await prisma.attendance.findFirst({
    where: { facultyId: demoFaculty.id, section: 'A' },
  });

  if (sampleAttendance) {
    await prisma.attendanceAuditLog.create({
      data: {
        attendanceId: sampleAttendance.id,
        facultyId: demoFaculty.id,
        oldStatus: AttendanceStatus.ABSENT,
        newStatus: AttendanceStatus.PRESENT,
        reason: 'Student submitted medical certificate approved by HOD.',
        changedAt: new Date('2026-09-08T15:00:00.000Z'),
      },
    });
  }

  // 12. Also preserve student 23CSE101 notifications and performance for student portal
  await prisma.performance.createMany({
    data: [
      { studentId: studentAarav.id, courseId: cnCourse.id, assessmentType: AssessmentType.INTERNAL_1, marks: 62, maximumMarks: 100, date: new Date('2026-07-15') },
      { studentId: studentAarav.id, courseId: cnCourse.id, assessmentType: AssessmentType.INTERNAL_2, marks: 70, maximumMarks: 100, date: new Date('2026-08-20') },
      { studentId: studentAarav.id, courseId: dbmsCourse.id, assessmentType: AssessmentType.INTERNAL_1, marks: 85, maximumMarks: 100, date: new Date('2026-07-17') },
      { studentId: studentAarav.id, courseId: dbmsCourse.id, assessmentType: AssessmentType.INTERNAL_2, marks: 90, maximumMarks: 100, date: new Date('2026-08-22') },
    ],
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: [
      {
        studentId: studentAarav.id,
        title: 'Attendance Warning: Computer Networks',
        message: 'Your attendance in Computer Networks is currently 64%, below the 75% threshold.',
        type: NotificationType.ATTENDANCE_WARNING,
        isRead: false,
        createdAt: new Date('2026-09-10T09:30:00.000Z'),
      },
    ],
    skipDuplicates: true,
  });

  // 13. Seed Attendance Correction Requests for HOD Review
  if (sampleAttendance) {
    await prisma.attendanceCorrectionRequest.create({
      data: {
        attendanceId: sampleAttendance.id,
        facultyId: demoFaculty.id,
        studentId: sampleAttendance.studentId,
        oldStatus: AttendanceStatus.ABSENT,
        requestedStatus: AttendanceStatus.PRESENT,
        reason: 'Student was participating in Inter-College Technical Hackathon (Duty Leave / Medical Cert approved).',
        status: CorrectionStatus.PENDING,
        createdAt: new Date('2026-09-10T11:00:00.000Z'),
      },
    });

    const secondAttendance = await prisma.attendance.findFirst({
      where: { facultyId: demoFaculty.id, status: AttendanceStatus.ABSENT, NOT: { id: sampleAttendance.id } },
    });

    if (secondAttendance) {
      await prisma.attendanceCorrectionRequest.create({
        data: {
          attendanceId: secondAttendance.id,
          facultyId: demoFaculty.id,
          studentId: secondAttendance.studentId,
          oldStatus: AttendanceStatus.ABSENT,
          requestedStatus: AttendanceStatus.ON_DUTY,
          reason: 'University sports team tournament participation.',
          status: CorrectionStatus.PENDING,
          createdAt: new Date('2026-09-11T09:15:00.000Z'),
        },
      });
    }
  }

  // 14. Seed HOD Notifications
  await prisma.notification.createMany({
    data: [
      {
        staffId: demoHod.id,
        title: 'Pending Attendance Correction Request',
        message: 'Dr. Rajesh Kumar submitted an attendance correction request for CS301 (Section A).',
        type: NotificationType.SYSTEM,
        isRead: false,
        createdAt: new Date('2026-09-11T09:30:00.000Z'),
      },
      {
        staffId: demoHod.id,
        title: 'Department At-Risk Alert',
        message: '2 students in CSE 3rd Year Section A have dropped below 60% attendance.',
        type: NotificationType.ATTENDANCE_WARNING,
        isRead: false,
        createdAt: new Date('2026-09-11T08:00:00.000Z'),
      },
      {
        staffId: demoHod.id,
        title: 'Pending Attendance Entry Alert',
        message: 'Prof. Ananya Sharma has 1 pending attendance submission for CS302 (Section B).',
        type: NotificationType.SYSTEM,
        isRead: true,
        createdAt: new Date('2026-09-10T16:00:00.000Z'),
      },
    ],
  });

  console.log('Database seeding completed successfully!');
  console.log('=======================================================');
  console.log('DEMO CREDENTIALS:');
  console.log('HOD:     Employee ID: HOD001    | Password: Hod@1234');
  console.log('Faculty: Employee ID: FAC001    | Password: Faculty@123');
  console.log('Student: Reg No:      23CSE101  | Password: Student@123');
  console.log('Parent:  Reg No:      23CSE101  | Password: Parent@123');
  console.log('Staff:   Employee ID: STAFF001  | Password: Staff@123');
  console.log('=======================================================');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
