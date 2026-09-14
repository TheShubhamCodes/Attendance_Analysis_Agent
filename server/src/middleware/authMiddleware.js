const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const prisma = require('../config/db');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication session expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        studentProfile: true,
        parentProfile: true,
        staffProfile: true,
      },
    });

    if (!user || user.accountStatus !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive or no longer exists.',
      });
    }

    req.user = {
      id: user.id,
      identifier: user.identifier,
      role: (decoded.role === 'MENTOR' || user.role === 'MENTOR') ? 'MENTOR' : user.role,
      studentProfile: user.studentProfile,
      parentProfile: user.parentProfile,
      staffProfile: user.staffProfile,
      studentId: user.studentProfile ? user.studentProfile.id : null,
      parentId: user.parentProfile ? user.parentProfile.id : null,
      staffId: user.staffProfile ? user.staffProfile.id : null,
      departmentId: user.staffProfile ? user.staffProfile.departmentId : (user.studentProfile ? user.studentProfile.departmentId : null),
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error.',
    });
  }
}

module.exports = authMiddleware;
