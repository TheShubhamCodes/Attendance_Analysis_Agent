const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PERIOD_SCHEDULE = [
  { periodNumber: 1, periodId: 'P1', startTime: '08:15', endTime: '09:05' },
  { periodNumber: 2, periodId: 'P2', startTime: '09:05', endTime: '09:55' },
  { periodNumber: 3, periodId: 'P3', startTime: '09:55', endTime: '10:45' },
  // 10:45 - 11:00 BREAK
  { periodNumber: 4, periodId: 'P4', startTime: '11:00', endTime: '11:50' },
  { periodNumber: 5, periodId: 'P5', startTime: '11:50', endTime: '12:40' },
  // 12:40 - 13:30 BREAK
  { periodNumber: 6, periodId: 'P6', startTime: '13:30', endTime: '14:20' },
  { periodNumber: 7, periodId: 'P7', startTime: '14:20', endTime: '15:10' },
  { periodNumber: 8, periodId: 'P8', startTime: '15:10', endTime: '16:00' },
];

async function seedTimetableData() {
  console.log('--- SEEDING TIMETABLE, SUBJECTS & FACULTY ---');

  // 1. Get CSE Department
  let dept = await prisma.department.findFirst({
    where: { code: 'CSE' },
  });
  if (!dept) {
    dept = await prisma.department.findFirst();
  }
  if (!dept) {
    throw new Error('No department found in database.');
  }

  const defaultPasswordHash = await bcrypt.hash('Faculty@123', 10);

  // 2. Ensure Required Faculty Members Exist
  const facultyDefinitions = [
    {
      employeeId: 'FAC001',
      name: 'Dr. Rajesh Kumar',
      email: 'rajesh.kumar@university.edu',
      designation: 'Associate Professor',
    },
    {
      employeeId: 'FAC002',
      name: 'Mr. Sourav Mondal',
      email: 'sourav.mondal@university.edu',
      designation: 'Assistant Professor',
    },
    {
      employeeId: 'FAC003',
      name: 'Dr. James Deva Koresh H',
      email: 'james.devakoresh@university.edu',
      designation: 'Associate Professor',
    },
    {
      employeeId: 'FAC004',
      name: 'Ms. K. Anitha J',
      email: 'anitha.k@university.edu',
      designation: 'Assistant Professor',
    },
    {
      employeeId: 'FAC005',
      name: 'Ms. K. Gireesha',
      email: 'gireesha.k@university.edu',
      designation: 'Assistant Professor',
    },
    {
      employeeId: 'FAC006',
      name: 'Dr. A. Loganathan',
      email: 'loganathan.a@university.edu',
      designation: 'Professor',
    },
    {
      employeeId: 'STAFF002',
      name: 'Prof. Ananya Sharma',
      email: 'ananya.sharma@university.edu',
      designation: 'Assistant Professor',
    },
    {
      employeeId: 'STAFF001',
      name: 'Dr. K. Ramanathan',
      email: 'k.ramanathan@university.edu',
      designation: 'Professor & Head',
    },
  ];

  const facultyMap = {}; // key: employeeId or name -> staff record

  for (const f of facultyDefinitions) {
    let staff = await prisma.staff.findUnique({
      where: { employeeId: f.employeeId },
    });

    if (!staff) {
      let user = await prisma.user.findFirst({
        where: { identifier: f.employeeId, role: 'STAFF' },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            identifier: f.employeeId,
            passwordHash: defaultPasswordHash,
            role: 'STAFF',
            accountStatus: 'ACTIVE',
          },
        });
      }

      staff = await prisma.staff.create({
        data: {
          userId: user.id,
          employeeId: f.employeeId,
          name: f.name,
          email: f.email,
          departmentId: dept.id,
          staffRole: 'FACULTY',
          designation: f.designation,
          status: 'ACTIVE',
        },
      });
      console.log(`Created faculty: ${f.name} (${f.employeeId})`);
    } else {
      // Update name if needed
      staff = await prisma.staff.update({
        where: { id: staff.id },
        data: { name: f.name, status: 'ACTIVE', deletedAt: null },
      });
    }

    facultyMap[f.employeeId] = staff;
    facultyMap[f.name] = staff;
  }

  // 3. Ensure Official Timetable Courses Exist in PostgreSQL
  const courseDefinitions = [
    { code: 'ML', name: 'Machine Learning', sem: 5, credits: 4 },
    { code: 'CS301', name: 'Computer Networks', sem: 5, credits: 4, alias: 'CN' },
    { code: 'CV', name: 'Computer Vision', sem: 5, credits: 4 },
    { code: 'OT', name: 'Optimization Techniques', sem: 5, credits: 3 },
    { code: 'CE', name: 'Computing Ethics', sem: 5, credits: 2 },
    { code: 'DAV', name: 'Data Analytics and Visualization', sem: 5, credits: 4 },
    { code: 'CS305', name: 'Cloud Computing Architecture', sem: 5, credits: 4, alias: 'CC' },
    { code: 'PC_LAB', name: 'PC Lab', sem: 5, credits: 2, alias: 'PC LAB' },
    { code: 'NPTEL', name: 'NPTEL Online Courses', sem: 5, credits: 2 },
    { code: 'TRAINING', name: 'Technical Training', sem: 5, credits: 2 },
    { code: 'LIB', name: 'Library & Research Study', sem: 5, credits: 1 },
    { code: 'COUN', name: 'Student Counselling & Mentoring', sem: 5, credits: 1 },
    { code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', sem: 5, credits: 3 },
  ];

  const courseMap = {}; // key: code or alias -> Course record

  for (const c of courseDefinitions) {
    let existing = await prisma.course.findFirst({
      where: {
        OR: [
          { courseCode: c.code },
          ...(c.alias ? [{ courseCode: c.alias }] : []),
          { courseName: { equals: c.name, mode: 'insensitive' } },
        ],
      },
    });

    if (!existing) {
      existing = await prisma.course.create({
        data: {
          courseCode: c.code,
          courseName: c.name,
          departmentId: dept.id,
          semester: c.sem,
          credits: c.credits,
          academicYear: '2026-2027',
          isActive: true,
        },
      });
      console.log(`Created course: ${c.code} - ${c.name}`);
    }

    courseMap[c.code] = existing;
    if (c.alias) courseMap[c.alias] = existing;
  }

  // Also map 'CS301' to 'CN' and 'CS305' to 'CC'
  const cnCourse = await prisma.course.findFirst({ where: { courseCode: 'CS301' } });
  if (cnCourse) courseMap['CN'] = cnCourse;

  const ccCourse = await prisma.course.findFirst({ where: { courseCode: 'CS305' } });
  if (ccCourse) courseMap['CC'] = ccCourse;

  // 4. Clear existing timetable entries for 2026-2027 Semester 5 Sections A and B to ensure idempotency
  await prisma.timetableFacultyAssignment.deleteMany({
    where: { timetable: { academicYear: '2026-2027', semester: 5 } },
  });
  await prisma.timetable.deleteMany({
    where: { academicYear: '2026-2027', semester: 5 },
  });
  console.log('Cleaned existing timetable slots for Section A & B.');

  // 5. Define Section A Timetable
  const rawTimetableSectionA = {
    MONDAY: [
      { p: 1, code: 'ML', name: 'Machine Learning', type: 'Tutorial', room: 'N306', faculty: 'Mr. Sourav Mondal' },
      { p: 2, code: 'CN', name: 'Computer Networks', type: 'Lecture', room: 'N306', faculty: 'Dr. James Deva Koresh H', additionalFaculty: ['Ms. K. Anitha J', 'Ms. K. Gireesha', 'Dr. Rajesh Kumar'] },
      { p: 3, code: 'CN', name: 'Computer Networks', type: 'Lecture', room: 'N306', faculty: 'Dr. James Deva Koresh H', additionalFaculty: ['Ms. K. Anitha J', 'Ms. K. Gireesha', 'Dr. Rajesh Kumar'] },
      { p: 4, code: 'CV', name: 'Computer Vision', type: 'Tutorial', room: 'N408', faculty: 'Prof. Ananya Sharma' },
      { p: 5, code: 'CV', name: 'Computer Vision', type: 'Lecture', room: 'N408', faculty: 'Prof. Ananya Sharma' },
      { p: 6, code: 'OT', name: 'Optimization Techniques', type: 'Tutorial', room: 'N407', faculty: 'Dr. A. Loganathan' },
      { p: 7, code: 'FREE', name: 'No Regular Subject / Leisure', type: 'Activity', room: null, faculty: null },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
    TUESDAY: [
      { p: 1, code: 'CN', name: 'Computer Networks', type: 'Lecture', room: 'N306', faculty: 'Dr. James Deva Koresh H', additionalFaculty: ['Ms. K. Anitha J'] },
      { p: 2, code: 'CE', name: 'Computing Ethics', type: 'Tutorial', room: 'N306', faculty: 'Dr. K. Ramanathan' },
      { p: 3, code: 'CE', name: 'Computing Ethics', type: 'Tutorial', room: 'N306', faculty: 'Dr. K. Ramanathan' },
      { p: 4, code: 'CC', name: 'Cloud Computing Architecture', type: 'Lecture', room: 'N408', faculty: 'Dr. Rajesh Kumar' },
      { p: 5, code: 'CV', name: 'Computer Vision', type: 'Lecture', room: 'N408', faculty: 'Prof. Ananya Sharma' },
      { p: 6, code: 'DAV', name: 'Data Analytics and Visualization', type: 'Lecture', room: 'N408', faculty: 'Prof. Ananya Sharma' },
      { p: 7, code: 'ML', name: 'Machine Learning', type: 'Lecture', room: 'N306', faculty: 'Mr. Sourav Mondal' },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
    WEDNESDAY: [
      { p: 1, code: 'CV', name: 'Computer Vision', type: 'Lecture', room: 'N507', faculty: 'Prof. Ananya Sharma' },
      { p: 2, code: 'TRAINING', name: 'Technical Training', type: 'Activity', room: 'N507', faculty: 'Mr. Sourav Mondal' },
      { p: 3, code: 'TRAINING', name: 'Technical Training', type: 'Activity', room: 'N507', faculty: 'Mr. Sourav Mondal' },
      { p: 4, code: 'DAV', name: 'Data Analytics and Visualization', type: 'Lecture', room: 'N408', faculty: 'Prof. Ananya Sharma' },
      { p: 5, code: 'CC', name: 'Cloud Computing Architecture', type: 'Lecture', room: 'N408', faculty: 'Dr. Rajesh Kumar' },
      { p: 6, code: 'CN', name: 'Computer Networks', type: 'Tutorial', room: 'N407', faculty: 'Ms. K. Anitha J', additionalFaculty: ['Dr. James Deva Koresh H', 'Dr. Rajesh Kumar'] },
      { p: 7, code: 'CN', name: 'Computer Networks', type: 'Tutorial', room: 'N407', faculty: 'Ms. K. Anitha J', additionalFaculty: ['Dr. James Deva Koresh H', 'Dr. Rajesh Kumar'] },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
    THURSDAY: [
      { p: 1, code: 'CV', name: 'Computer Vision', type: 'Practical', room: 'N515', faculty: 'Prof. Ananya Sharma' },
      { p: 2, code: 'LIB', name: 'Library & Research Study', type: 'Activity', room: 'N408', faculty: 'Dr. A. Loganathan' },
      { p: 3, code: 'LIB', name: 'Library & Research Study', type: 'Activity', room: 'N408', faculty: 'Dr. A. Loganathan' },
      { p: 4, code: 'ML', name: 'Machine Learning', type: 'Lecture', room: 'N306', faculty: 'Mr. Sourav Mondal' },
      { p: 5, code: 'OT', name: 'Optimization Techniques', type: 'Lecture', room: 'N407', faculty: 'Dr. A. Loganathan' },
      { p: 6, code: 'NPTEL', name: 'NPTEL Online Courses', type: 'Activity', room: null, faculty: 'Dr. K. Ramanathan' },
      { p: 7, code: 'NPTEL', name: 'NPTEL Online Courses', type: 'Activity', room: null, faculty: 'Dr. K. Ramanathan' },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
    FRIDAY: [
      { p: 1, code: 'CN', name: 'Computer Networks', type: 'Lecture', room: 'N306', faculty: 'Dr. James Deva Koresh H', additionalFaculty: ['Dr. Rajesh Kumar'] },
      { p: 2, code: 'TRAINING', name: 'Technical Training', type: 'Activity', room: 'N507', faculty: 'Mr. Sourav Mondal' },
      { p: 3, code: 'TRAINING', name: 'Technical Training', type: 'Activity', room: 'N507', faculty: 'Mr. Sourav Mondal' },
      { p: 4, code: 'PC_LAB', name: 'PC Lab', type: 'Practical', room: 'N505', faculty: 'Dr. Rajesh Kumar', additionalFaculty: ['Mr. Sourav Mondal'] },
      { p: 5, code: 'PC_LAB', name: 'PC Lab', type: 'Practical', room: 'N505', faculty: 'Dr. Rajesh Kumar', additionalFaculty: ['Mr. Sourav Mondal'] },
      { p: 6, code: 'ML', name: 'Machine Learning', type: 'Practical', room: 'N506', faculty: 'Mr. Sourav Mondal' },
      { p: 7, code: 'ML', name: 'Machine Learning', type: 'Practical', room: 'N506', faculty: 'Mr. Sourav Mondal' },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
    SATURDAY: [
      { p: 1, code: 'OT', name: 'Optimization Techniques', type: 'Lecture', room: 'N407', faculty: 'Dr. A. Loganathan' },
      { p: 2, code: 'TRAINING', name: 'Technical Training', type: 'Activity', room: 'N507', faculty: 'Mr. Sourav Mondal' },
      { p: 3, code: 'TRAINING', name: 'Technical Training', type: 'Activity', room: 'N507', faculty: 'Mr. Sourav Mondal' },
      { p: 4, code: 'CN', name: 'Computer Networks', type: 'Practical', room: 'N415', faculty: 'Ms. K. Gireesha', additionalFaculty: ['Dr. James Deva Koresh H', 'Dr. Rajesh Kumar'] },
      { p: 5, code: 'CN', name: 'Computer Networks', type: 'Practical', room: 'N415', faculty: 'Ms. K. Gireesha', additionalFaculty: ['Dr. James Deva Koresh H', 'Dr. Rajesh Kumar'] },
      { p: 6, code: 'DAV', name: 'Data Analytics and Visualization', type: 'Practical', room: 'N506', faculty: 'Prof. Ananya Sharma' },
      { p: 7, code: 'DAV', name: 'Data Analytics and Visualization', type: 'Practical', room: 'N506', faculty: 'Prof. Ananya Sharma' },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
  };

  // 6. Define Section B Timetable
  const rawTimetableSectionB = {
    MONDAY: [
      { p: 1, code: 'CN', name: 'Computer Networks', type: 'Lecture', room: 'N415', faculty: 'Dr. James Deva Koresh H', additionalFaculty: ['Dr. Rajesh Kumar'] },
      { p: 2, code: 'NPTEL', name: 'NPTEL Online Courses', type: 'Activity', room: null, faculty: 'Dr. K. Ramanathan' },
      { p: 3, code: 'NPTEL', name: 'NPTEL Online Courses', type: 'Activity', room: null, faculty: 'Dr. K. Ramanathan' },
      { p: 4, code: 'CN', name: 'Computer Networks', type: 'Practical', room: 'N415', faculty: 'Ms. K. Anitha J', additionalFaculty: ['Ms. K. Gireesha', 'Dr. Rajesh Kumar'] },
      { p: 5, code: 'CN', name: 'Computer Networks', type: 'Practical', room: 'N415', faculty: 'Ms. K. Anitha J', additionalFaculty: ['Ms. K. Gireesha', 'Dr. Rajesh Kumar'] },
      { p: 6, code: 'ML', name: 'Machine Learning', type: 'Lecture', room: 'N415', faculty: 'Mr. Sourav Mondal' },
      { p: 7, code: 'CC', name: 'Cloud Computing Architecture', type: 'Lecture', room: 'N415', faculty: 'Dr. Rajesh Kumar' },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
    TUESDAY: [
      { p: 1, code: 'PC_LAB', name: 'PC Lab', type: 'Practical', room: 'N507', faculty: 'Dr. Rajesh Kumar', additionalFaculty: ['Mr. Sourav Mondal'] },
      { p: 2, code: 'DAV', name: 'Data Analytics and Visualization', type: 'Lecture', room: 'N507', faculty: 'Prof. Ananya Sharma' },
      { p: 3, code: 'DAV', name: 'Data Analytics and Visualization', type: 'Lecture', room: 'N507', faculty: 'Prof. Ananya Sharma' },
      { p: 4, code: 'CN', name: 'Computer Networks', type: 'Tutorial', room: 'N415', faculty: 'Ms. K. Gireesha', additionalFaculty: ['Dr. James Deva Koresh H'] },
      { p: 5, code: 'CN', name: 'Computer Networks', type: 'Tutorial', room: 'N415', faculty: 'Ms. K. Gireesha', additionalFaculty: ['Dr. James Deva Koresh H'] },
      { p: 6, code: 'OT', name: 'Optimization Techniques', type: 'Tutorial', room: 'N407', faculty: 'Dr. A. Loganathan' },
      { p: 7, code: 'OT', name: 'Optimization Techniques', type: 'Tutorial', room: 'N407', faculty: 'Dr. A. Loganathan' },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
    WEDNESDAY: [
      { p: 1, code: 'DAV', name: 'Data Analytics and Visualization', type: 'Practical', room: 'N506', faculty: 'Prof. Ananya Sharma' },
      { p: 2, code: 'ML', name: 'Machine Learning', type: 'Lecture', room: 'N506', faculty: 'Mr. Sourav Mondal' },
      { p: 3, code: 'ML', name: 'Machine Learning', type: 'Lecture', room: 'N506', faculty: 'Mr. Sourav Mondal' },
      { p: 4, code: 'CN', name: 'Computer Networks', type: 'Lecture', room: 'N415', faculty: 'Dr. James Deva Koresh H' },
      { p: 5, code: 'CV', name: 'Computer Vision', type: 'Lecture', room: 'N415', faculty: 'Prof. Ananya Sharma' },
      { p: 6, code: 'TRAINING', name: 'Technical Training', type: 'Activity', room: 'N417', faculty: 'Mr. Sourav Mondal' },
      { p: 7, code: 'TRAINING', name: 'Technical Training', type: 'Activity', room: 'N417', faculty: 'Mr. Sourav Mondal' },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
    THURSDAY: [
      { p: 1, code: 'OT', name: 'Optimization Techniques', type: 'Lecture', room: 'N407', faculty: 'Dr. A. Loganathan' },
      { p: 2, code: 'ML', name: 'Machine Learning', type: 'Tutorial', room: 'N306', faculty: 'Mr. Sourav Mondal' },
      { p: 3, code: 'ML', name: 'Machine Learning', type: 'Tutorial', room: 'N306', faculty: 'Mr. Sourav Mondal' },
      { p: 4, code: 'CN', name: 'Computer Networks', type: 'Lecture', room: 'N415', faculty: 'Ms. K. Anitha J' },
      { p: 5, code: 'CV', name: 'Computer Vision', type: 'Lecture', room: 'N415', faculty: 'Prof. Ananya Sharma' },
      { p: 6, code: 'CE', name: 'Computing Ethics', type: 'Tutorial', room: 'N306', faculty: 'Dr. K. Ramanathan' },
      { p: 7, code: 'CE', name: 'Computing Ethics', type: 'Tutorial', room: 'N306', faculty: 'Dr. K. Ramanathan' },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
    FRIDAY: [
      { p: 1, code: 'CV', name: 'Computer Vision', type: 'Tutorial', room: 'N408', faculty: 'Prof. Ananya Sharma' },
      { p: 2, code: 'COUN', name: 'Student Counselling & Mentoring', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar', additionalFaculty: ['Dr. K. Ramanathan'] },
      { p: 3, code: 'COUN', name: 'Student Counselling & Mentoring', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar', additionalFaculty: ['Dr. K. Ramanathan'] },
      { p: 4, code: 'OT', name: 'Optimization Techniques', type: 'Lecture', room: 'N407', faculty: 'Dr. A. Loganathan' },
      { p: 5, code: 'DAV', name: 'Data Analytics and Visualization', type: 'Lecture', room: 'N408', faculty: 'Prof. Ananya Sharma' },
      { p: 6, code: 'TRAINING', name: 'Technical Training', type: 'Activity', room: 'N417', faculty: 'Mr. Sourav Mondal' },
      { p: 7, code: 'TRAINING', name: 'Technical Training', type: 'Activity', room: 'N417', faculty: 'Mr. Sourav Mondal' },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
    SATURDAY: [
      { p: 1, code: 'ML', name: 'Machine Learning', type: 'Practical', room: 'N506', faculty: 'Mr. Sourav Mondal' },
      { p: 2, code: 'LIB', name: 'Library & Research Study', type: 'Activity', room: 'N408', faculty: 'Dr. A. Loganathan' },
      { p: 3, code: 'LIB', name: 'Library & Research Study', type: 'Activity', room: 'N408', faculty: 'Dr. A. Loganathan' },
      { p: 4, code: 'CV', name: 'Computer Vision', type: 'Practical', room: 'N515', faculty: 'Prof. Ananya Sharma' },
      { p: 5, code: 'CV', name: 'Computer Vision', type: 'Practical', room: 'N515', faculty: 'Prof. Ananya Sharma' },
      { p: 6, code: 'FREE', name: 'No Regular Subject Shown', type: 'Activity', room: null, faculty: null },
      { p: 7, code: 'FREE', name: 'No Regular Subject Shown', type: 'Activity', room: null, faculty: null },
      { p: 8, code: 'PROJECT', name: 'Experiential Learning / Self Learning / Project', type: 'Activity', room: null, faculty: 'Dr. Rajesh Kumar' },
    ],
  };

  // Helper to insert section timetable
  async function insertSectionTimetable(sectionName, sectionData) {
    let count = 0;
    for (const [dayOfWeek, slots] of Object.entries(sectionData)) {
      for (const slot of slots) {
        const periodMeta = PERIOD_SCHEDULE.find((p) => p.periodNumber === slot.p);
        if (!periodMeta) continue;

        const course = courseMap[slot.code] || null;
        const primaryFaculty = slot.faculty ? facultyMap[slot.faculty] : null;

        const createdSlot = await prisma.timetable.create({
          data: {
            section: sectionName,
            semester: 5,
            academicYear: '2026-2027',
            dayOfWeek,
            periodNumber: slot.p,
            periodId: periodMeta.periodId,
            startTime: periodMeta.startTime,
            endTime: periodMeta.endTime,
            courseId: course ? course.id : null,
            subjectCode: slot.code,
            subjectName: slot.name,
            subjectType: slot.type,
            room: slot.room,
            facultyId: primaryFaculty ? primaryFaculty.id : null,
            isBreak: false,
            isCancelled: false,
          },
        });

        // Add primary faculty to assignment table
        if (primaryFaculty) {
          await prisma.timetableFacultyAssignment.create({
            data: {
              timetableId: createdSlot.id,
              facultyId: primaryFaculty.id,
              isPrimary: true,
            },
          });

          // Ensure FacultySubjectAssignment exists for authorization
          if (course) {
            await prisma.facultySubjectAssignment.upsert({
              where: {
                facultyId_courseId_section_academicYear_semester: {
                  facultyId: primaryFaculty.id,
                  courseId: course.id,
                  section: sectionName,
                  academicYear: '2026-2027',
                  semester: 5,
                },
              },
              update: { status: 'ACTIVE' },
              create: {
                facultyId: primaryFaculty.id,
                courseId: course.id,
                section: sectionName,
                academicYear: '2026-2027',
                semester: 5,
                status: 'ACTIVE',
              },
            });
          }
        }

        // Add additional assigned faculty members if any
        if (slot.additionalFaculty && slot.additionalFaculty.length > 0) {
          for (const afName of slot.additionalFaculty) {
            const addFac = facultyMap[afName];
            if (addFac && addFac.id !== primaryFaculty?.id) {
              await prisma.timetableFacultyAssignment.create({
                data: {
                  timetableId: createdSlot.id,
                  facultyId: addFac.id,
                  isPrimary: false,
                },
              });

              if (course) {
                await prisma.facultySubjectAssignment.upsert({
                  where: {
                    facultyId_courseId_section_academicYear_semester: {
                      facultyId: addFac.id,
                      courseId: course.id,
                      section: sectionName,
                      academicYear: '2026-2027',
                      semester: 5,
                    },
                  },
                  update: { status: 'ACTIVE' },
                  create: {
                    facultyId: addFac.id,
                    courseId: course.id,
                    section: sectionName,
                    academicYear: '2026-2027',
                    semester: 5,
                    status: 'ACTIVE',
                  },
                });
              }
            }
          }
        }

        count++;
      }
    }
    console.log(`Inserted ${count} timetable slots for Section ${sectionName}.`);
  }

  await insertSectionTimetable('A', rawTimetableSectionA);
  await insertSectionTimetable('B', rawTimetableSectionB);

  console.log('--- TIMETABLE SEEDING COMPLETE ---');
}

if (require.main === module) {
  seedTimetableData()
    .then(() => {
      console.log('Seed execution finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error seeding timetable data:', err);
      process.exit(1);
    });
}

module.exports = { seedTimetableData, PERIOD_SCHEDULE };
