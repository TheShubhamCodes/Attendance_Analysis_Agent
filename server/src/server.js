const express = require('express');
const cors = require('cors');
const { PORT, CORS_ORIGIN } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const hodRoutes = require('./routes/hodRoutes');
const userRoutes = require('./routes/userRoutes');
const parentRoutes = require('./routes/parentRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const facultyAssignmentRoutes = require('./routes/facultyAssignmentRoutes');
const agentRoutes = require('./routes/agentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mentorRoutes = require('./routes/mentorRoutes');
const { startDatabase } = require('./utils/dbRunner');
const prisma = require('./config/db');
const bcrypt = require('bcryptjs');

const app = express();

const allowedOrigins = (CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (such as mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // In non-production, allow all localhost and 127.0.0.1
    if (process.env.NODE_ENV !== 'production') {
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
    }

    // Allow wildcard or explicitly configured origins
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Automatically allow Vercel production and preview domains
    try {
      const parsedUrl = new URL(origin);
      if (parsedUrl.hostname.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch (e) {}

    // Fallback: If no origins configured, allow to avoid blocking initial setup
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'test') {
      const duration = Date.now() - start;
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint (both /api/health and /health for Render)
app.get(['/api/health', '/health'], async (req, res) => {
  let dbStatus = 'connected';
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
  } catch (err) {
    dbStatus = 'disconnected';
  }

  res.status(200).json({
    status: 'online',
    database: dbStatus,
    service: 'Attendance & Student Performance Agent API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Route Mounting
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/faculty-assignments', facultyAssignmentRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mentor', mentorRoutes);

// Centralized Error Handler
app.use(errorHandler);

// Ensure Default Admin Account Exists
async function ensureAdminAccount() {
  try {
    const existing = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!existing) {
      const passwordHash = await bcrypt.hash('Admin@1234', 10);
      await prisma.user.create({
        data: {
          identifier: 'ADMIN001',
          passwordHash,
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
        },
      });
      console.log('[Admin Boot] Default ADMIN001 account verified/initialized.');
    }
  } catch (err) {
    console.error('[Admin Boot] Error verifying admin account:', err.message);
  }
}

// Ensure Default Departments Exist
async function ensureDefaultDepartments() {
  try {
    const count = await prisma.department.count();
    if (count === 0) {
      await prisma.department.createMany({
        data: [
          { name: 'Computer Science & Engineering', code: 'CSE' },
          { name: 'Information Technology', code: 'IT' },
          { name: 'Electronics & Communication Engineering', code: 'ECE' },
        ],
        skipDuplicates: true,
      });
      console.log('[Department Boot] Initialized default academic departments (CSE, IT, ECE).');
    }
  } catch (err) {
    console.error('[Department Boot] Error verifying departments:', err.message);
  }
}

// Ensure Default Starter Staff Accounts (HOD, Faculty, Mentor)
async function ensureDefaultStaffAccounts() {
  try {
    const cseDept = await prisma.department.findFirst({ where: { code: 'CSE' } });
    if (!cseDept) return;

    // 1. Ensure Default HOD (HOD001 / Hod@1234)
    const existingHod = await prisma.user.findFirst({ where: { identifier: 'HOD001' } });
    if (!existingHod) {
      const hodPasswordHash = await bcrypt.hash('Hod@1234', 10);
      const hodUser = await prisma.user.create({
        data: {
          identifier: 'HOD001',
          passwordHash: hodPasswordHash,
          role: 'HOD',
          accountStatus: 'ACTIVE',
        },
      });
      await prisma.staff.create({
        data: {
          userId: hodUser.id,
          employeeId: 'HOD001',
          name: 'Dr. Suresh Varma (HOD)',
          email: 'hod.cse@university.edu',
          mobileNumber: '9840556677',
          departmentId: cseDept.id,
          staffRole: 'HOD',
          designation: 'Professor & Head of Department',
          cabinLocation: 'Academic Block A, Room 101',
        },
      });
      console.log('[Staff Boot] Default HOD account (HOD001) initialized.');
    }

    // 2. Ensure Default Faculty (FAC001 / Faculty@123)
    const existingFaculty = await prisma.user.findFirst({ where: { identifier: 'FAC001' } });
    if (!existingFaculty) {
      const facultyPasswordHash = await bcrypt.hash('Faculty@123', 10);
      const facultyUser = await prisma.user.create({
        data: {
          identifier: 'FAC001',
          passwordHash: facultyPasswordHash,
          role: 'STAFF',
          accountStatus: 'ACTIVE',
        },
      });
      await prisma.staff.create({
        data: {
          userId: facultyUser.id,
          employeeId: 'FAC001',
          name: 'Dr. Rajesh Kumar (Faculty)',
          email: 'faculty.rajesh@university.edu',
          mobileNumber: '9840112233',
          departmentId: cseDept.id,
          staffRole: 'FACULTY',
          designation: 'Associate Professor',
          cabinLocation: 'Academic Block B, Room 204',
        },
      });
      console.log('[Staff Boot] Default Faculty account (FAC001) initialized.');
    }

    // 3. Ensure Default Mentor (STAFF001 / Staff@123)
    const existingMentor = await prisma.user.findFirst({ where: { identifier: 'STAFF001' } });
    if (!existingMentor) {
      const mentorPasswordHash = await bcrypt.hash('Staff@123', 10);
      const mentorUser = await prisma.user.create({
        data: {
          identifier: 'STAFF001',
          passwordHash: mentorPasswordHash,
          role: 'MENTOR',
          accountStatus: 'ACTIVE',
        },
      });
      await prisma.staff.create({
        data: {
          userId: mentorUser.id,
          employeeId: 'STAFF001',
          name: 'Dr. K. Ramanathan (Mentor)',
          email: 'mentor.ramanathan@university.edu',
          mobileNumber: '9840123456',
          departmentId: cseDept.id,
          staffRole: 'MENTOR',
          designation: 'Senior Mentor & Professor',
          cabinLocation: 'Academic Block C, Room 301',
        },
      });
      console.log('[Staff Boot] Default Mentor account (STAFF001) initialized.');
    }
  } catch (err) {
    console.error('[Staff Boot] Error initializing default staff accounts:', err.message);
  }
}

// Ensure Default Academic Curriculum (Sections, Courses/Subjects, Faculty Assignments, Timetable)
async function ensureDefaultAcademicCurriculum() {
  try {
    const cseDept = await prisma.department.findFirst({ where: { code: 'CSE' } });
    const itDept = await prisma.department.findFirst({ where: { code: 'IT' } });
    const eceDept = await prisma.department.findFirst({ where: { code: 'ECE' } });
    if (!cseDept) return;

    // 1. Ensure Sections exist
    const sectionCount = await prisma.section.count();
    if (sectionCount === 0) {
      const defaultSections = [
        { name: 'A', departmentId: cseDept.id, year: 3, semester: 5, capacity: 60, academicYear: '2026-2027' },
        { name: 'B', departmentId: cseDept.id, year: 3, semester: 5, capacity: 60, academicYear: '2026-2027' },
        { name: 'C', departmentId: cseDept.id, year: 3, semester: 5, capacity: 60, academicYear: '2026-2027' },
      ];
      if (itDept) {
        defaultSections.push(
          { name: 'A', departmentId: itDept.id, year: 3, semester: 5, capacity: 60, academicYear: '2026-2027' },
          { name: 'B', departmentId: itDept.id, year: 3, semester: 5, capacity: 60, academicYear: '2026-2027' }
        );
      }
      if (eceDept) {
        defaultSections.push(
          { name: 'A', departmentId: eceDept.id, year: 3, semester: 5, capacity: 60, academicYear: '2026-2027' },
          { name: 'B', departmentId: eceDept.id, year: 3, semester: 5, capacity: 60, academicYear: '2026-2027' }
        );
      }
      for (const s of defaultSections) {
        await prisma.section.create({ data: s });
      }
      console.log('[Curriculum Boot] Initialized default academic sections.');
    }

    // 2. Ensure Courses / Subjects exist
    const courseCount = await prisma.course.count();
    let courses = [];
    if (courseCount === 0) {
      const demoFaculty = await prisma.staff.findFirst({ where: { employeeId: 'FAC001' } });
      const demoHod = await prisma.staff.findFirst({ where: { employeeId: 'HOD001' } });
      const demoMentor = await prisma.staff.findFirst({ where: { employeeId: 'STAFF001' } });

      const courseDefs = [
        // CSE Semester 5
        { courseCode: 'CS301', courseName: 'Computer Networks', departmentId: cseDept.id, year: 3, semester: 5, credits: 4, facultyId: demoFaculty ? demoFaculty.id : null },
        { courseCode: 'CS302', courseName: 'Operating Systems', departmentId: cseDept.id, year: 3, semester: 5, credits: 4, facultyId: demoFaculty ? demoFaculty.id : null },
        { courseCode: 'CS303', courseName: 'Database Management Systems', departmentId: cseDept.id, year: 3, semester: 5, credits: 4, facultyId: demoFaculty ? demoFaculty.id : null },
        { courseCode: 'CS304', courseName: 'Software Engineering', departmentId: cseDept.id, year: 3, semester: 5, credits: 3, facultyId: demoFaculty ? demoFaculty.id : null },
        { courseCode: 'CS305', courseName: 'Cloud Computing Architecture', departmentId: cseDept.id, year: 3, semester: 5, credits: 3, facultyId: demoHod ? demoHod.id : null },
        { courseCode: 'MA301', courseName: 'Discrete Mathematics', departmentId: cseDept.id, year: 3, semester: 5, credits: 3, facultyId: demoMentor ? demoMentor.id : null },
      ];

      if (itDept) {
        courseDefs.push(
          { courseCode: 'IT301', courseName: 'Web Technologies', departmentId: itDept.id, year: 3, semester: 5, credits: 4 },
          { courseCode: 'IT302', courseName: 'Information Security', departmentId: itDept.id, year: 3, semester: 5, credits: 4 },
          { courseCode: 'IT303', courseName: 'Data Mining & Warehousing', departmentId: itDept.id, year: 3, semester: 5, credits: 3 }
        );
      }

      if (eceDept) {
        courseDefs.push(
          { courseCode: 'EC301', courseName: 'Digital Signal Processing', departmentId: eceDept.id, year: 3, semester: 5, credits: 4 },
          { courseCode: 'EC302', courseName: 'Microprocessors & Microcontrollers', departmentId: eceDept.id, year: 3, semester: 5, credits: 4 },
          { courseCode: 'EC303', courseName: 'Communication Systems', departmentId: eceDept.id, year: 3, semester: 5, credits: 3 }
        );
      }

      for (const cd of courseDefs) {
        const createdCourse = await prisma.course.create({ data: cd });
        courses.push(createdCourse);
      }
      console.log(`[Curriculum Boot] Initialized ${courses.length} default academic courses.`);

      // 3. Ensure Faculty Subject Assignments
      if (demoFaculty) {
        const cnCourse = courses.find(c => c.courseCode === 'CS301');
        const dbmsCourse = courses.find(c => c.courseCode === 'CS303');
        const cloudCourse = courses.find(c => c.courseCode === 'CS305');
        const mathCourse = courses.find(c => c.courseCode === 'MA301');

        if (cnCourse) {
          await prisma.facultySubjectAssignment.create({
            data: { facultyId: demoFaculty.id, courseId: cnCourse.id, section: 'A', semester: 5, academicYear: '2026-2027' }
          });
          await prisma.facultySubjectAssignment.create({
            data: { facultyId: demoFaculty.id, courseId: cnCourse.id, section: 'B', semester: 5, academicYear: '2026-2027' }
          });
        }
        if (dbmsCourse) {
          await prisma.facultySubjectAssignment.create({
            data: { facultyId: demoFaculty.id, courseId: dbmsCourse.id, section: 'A', semester: 5, academicYear: '2026-2027' }
          });
        }
        if (cloudCourse && demoHod) {
          await prisma.facultySubjectAssignment.create({
            data: { facultyId: demoHod.id, courseId: cloudCourse.id, section: 'A', semester: 5, academicYear: '2026-2027' }
          });
        }
        if (mathCourse && demoMentor) {
          await prisma.facultySubjectAssignment.create({
            data: { facultyId: demoMentor.id, courseId: mathCourse.id, section: 'A', semester: 5, academicYear: '2026-2027' }
          });
        }
        console.log('[Curriculum Boot] Initialized faculty subject assignments.');

        // 4. Ensure Timetable Slots for Section A, Semester 5
        const timetableCount = await prisma.timetable.count();
        if (timetableCount === 0 && cnCourse && dbmsCourse) {
          const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
          const scheduleSlots = [
            { periodNumber: 1, periodId: 'P1', startTime: '08:15', endTime: '09:05', courseId: cnCourse.id, subjectCode: 'CS301', subjectName: 'Computer Networks', facultyId: demoFaculty.id, room: 'N301' },
            { periodNumber: 2, periodId: 'P2', startTime: '09:05', endTime: '09:55', courseId: dbmsCourse.id, subjectCode: 'CS303', subjectName: 'Database Management Systems', facultyId: demoFaculty.id, room: 'N301' },
            { periodNumber: 3, periodId: 'P3', startTime: '10:15', endTime: '11:05', courseId: cloudCourse ? cloudCourse.id : null, subjectCode: 'CS305', subjectName: 'Cloud Computing Architecture', facultyId: demoHod ? demoHod.id : null, room: 'N301' },
            { periodNumber: 4, periodId: 'P4', startTime: '11:05', endTime: '11:55', courseId: mathCourse ? mathCourse.id : null, subjectCode: 'MA301', subjectName: 'Discrete Mathematics', facultyId: demoMentor ? demoMentor.id : null, room: 'N301' },
            { periodNumber: 5, periodId: 'P5', startTime: '12:45', endTime: '01:35', courseId: null, subjectCode: 'CS302', subjectName: 'Operating Systems', facultyId: demoFaculty.id, room: 'N301' },
          ];

          for (const day of days) {
            for (const slot of scheduleSlots) {
              await prisma.timetable.create({
                data: {
                  section: 'A',
                  semester: 5,
                  academicYear: '2026-2027',
                  dayOfWeek: day,
                  periodNumber: slot.periodNumber,
                  periodId: slot.periodId,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  courseId: slot.courseId,
                  subjectCode: slot.subjectCode,
                  subjectName: slot.subjectName,
                  facultyId: slot.facultyId,
                  room: slot.room,
                }
              });
            }
          }
          console.log('[Curriculum Boot] Initialized default weekly timetable slots.');
        }

        // 5. Ensure Counselor Assignment for existing students (e.g. 241FA04D34)
        const student = await prisma.student.findFirst({ where: { section: 'A' } });
        if (student) {
          const existingCounselor = await prisma.counselorAssignment.findFirst({
            where: { studentId: student.id }
          });
          if (!existingCounselor) {
            await prisma.counselorAssignment.create({
              data: {
                facultyId: demoFaculty.id,
                studentId: student.id,
                academicYear: '2026-2027',
                semester: 5,
              }
            });
            console.log('[Curriculum Boot] Linked student to counselor faculty.');
          }
        }
      }
    }
  } catch (err) {
    console.error('[Curriculum Boot] Error initializing academic curriculum:', err.message);
  }
}

// Server initialization
async function startServer() {
  try {
    // Ensure DB is running
    await startDatabase();
    await ensureDefaultDepartments();
    await ensureAdminAccount();
    await ensureDefaultStaffAccounts();
    await ensureDefaultAcademicCurriculum();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` Academic Agent Backend Server running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Health Check: /api/health or /health`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
