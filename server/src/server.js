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

// Server initialization
async function startServer() {
  try {
    // Ensure DB is running
    await startDatabase();
    await ensureDefaultDepartments();
    await ensureAdminAccount();

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
