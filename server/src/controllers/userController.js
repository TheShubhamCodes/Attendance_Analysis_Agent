const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

/**
 * Get user settings (Appearance / Notifications)
 */
async function getSettings(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        identifier: true,
        role: true,
        darkMode: true,
        notificationsEnabled: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        darkMode: Boolean(user.darkMode),
        notificationsEnabled: user.notificationsEnabled !== false,
      },
    });
  } catch (error) {
    console.error('getSettings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user settings.' });
  }
}

/**
 * Update user settings (Appearance / Notifications)
 */
async function updateSettings(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { darkMode, notificationsEnabled } = req.body;
    const updateData = {};

    if (typeof darkMode === 'boolean') {
      updateData.darkMode = darkMode;
    }
    if (typeof notificationsEnabled === 'boolean') {
      updateData.notificationsEnabled = notificationsEnabled;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid settings provided to update.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        identifier: true,
        role: true,
        darkMode: true,
        notificationsEnabled: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully.',
      data: {
        darkMode: Boolean(updatedUser.darkMode),
        notificationsEnabled: updatedUser.notificationsEnabled !== false,
      },
    });
  } catch (error) {
    console.error('updateSettings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
}

/**
 * Securely change password
 */
async function changePassword(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required.' });
    }

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must meet the required security requirements (minimum 8 characters).',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Verify current password against stored hash or initial default
    let isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      if (user.role === 'STAFF' && (currentPassword === 'Faculty@123' || currentPassword === 'FAC@123')) {
        isCurrentValid = true;
      } else if (user.role === 'STUDENT' && currentPassword === 'Student@123') {
        isCurrentValid = true;
      } else if (user.role === 'HOD' && (currentPassword === 'Hod@1234' || currentPassword === 'HOD@123')) {
        isCurrentValid = true;
      } else if (user.role === 'PARENT' && currentPassword === 'Parent@123') {
        isCurrentValid = true;
      }
    }

    if (!isCurrentValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    // Securely hash and update
    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('changePassword error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
}

/**
 * Unified profile information
 */
async function getProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: { department: true, mentor: true },
        },
        parentProfile: {
          include: {
            linkedStudent: {
              include: { department: true },
            },
          },
        },
        staffProfile: {
          include: { department: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let profileData = null;
    let displayName = user.identifier;

    if (user.role === 'STUDENT' && user.studentProfile) {
      displayName = user.studentProfile.name;
      profileData = user.studentProfile;
    } else if (user.role === 'PARENT' && user.parentProfile) {
      displayName = user.parentProfile.name;
      profileData = user.parentProfile;
    } else if ((user.role === 'STAFF' || user.role === 'HOD') && user.staffProfile) {
      displayName = user.staffProfile.name;
      profileData = user.staffProfile;
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        identifier: user.identifier,
        role: user.role,
        name: displayName,
        darkMode: Boolean(user.darkMode),
        notificationsEnabled: user.notificationsEnabled !== false,
        profile: profileData,
      },
    });
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  changePassword,
  getProfile,
};
