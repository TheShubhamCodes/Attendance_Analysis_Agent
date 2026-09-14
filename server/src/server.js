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

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Attendance & Student Performance Agent API',
    timestamp: new Date().toISOString(),
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

// Server initialization
async function startServer() {
  try {
    // Ensure DB is running
    await startDatabase();
    await ensureAdminAccount();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` Academic Agent Backend Server running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` API URL: http://localhost:${PORT}/api`);
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
