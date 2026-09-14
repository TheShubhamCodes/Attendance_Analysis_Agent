const prisma = require('../config/db');
const mentorService = require('../services/mentorService');

function getMentorStaffId(req) {
  return req.user?.staffId || null;
}

// 1. Mentor Dashboard
async function getDashboard(req, res) {
  try {
    const mentorStaffId = getMentorStaffId(req);
    if (!mentorStaffId) {
      return res.status(403).json({ success: false, message: 'Mentor profile not identified.' });
    }

    const data = await mentorService.getMentorDashboard(mentorStaffId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Mentor getDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load mentor dashboard.' });
  }
}

// 2. Assigned Students List
async function getStudents(req, res) {
  try {
    const mentorStaffId = getMentorStaffId(req);
    if (!mentorStaffId) {
      return res.status(403).json({ success: false, message: 'Mentor profile not identified.' });
    }

    const { search, filter } = req.query;
    const data = await mentorService.getAssignedStudentsList(mentorStaffId, { search, filter });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Mentor getStudents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assigned students.' });
  }
}

// 3. Student Details
async function getStudentDetails(req, res) {
  try {
    const mentorStaffId = getMentorStaffId(req);
    const { id } = req.params;

    const data = await mentorService.getStudentDetails(mentorStaffId, id);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Mentor getStudentDetails error:', error);
    const status = error.message.includes('Forbidden') ? 403 : error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to fetch student details.' });
  }
}

// 4. At-Risk Students
async function getAtRisk(req, res) {
  try {
    const mentorStaffId = getMentorStaffId(req);
    const atRiskStudents = await mentorService.getAtRiskStudents(mentorStaffId);
    return res.status(200).json({
      success: true,
      data: {
        atRiskStudents,
        count: atRiskStudents.length,
      },
    });
  } catch (error) {
    console.error('Mentor getAtRisk error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch at-risk students.' });
  }
}

// 5. Interventions List
async function getInterventions(req, res) {
  try {
    const mentorStaffId = getMentorStaffId(req);
    const { status, studentId } = req.query;

    const where = { mentorId: mentorStaffId };
    if (status && status !== 'ALL') where.status = status;
    if (studentId) where.studentId = studentId;

    const interventions = await prisma.intervention.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            section: true,
            year: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: interventions,
    });
  } catch (error) {
    console.error('Mentor getInterventions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch interventions.' });
  }
}

// 6. Record Intervention
async function createIntervention(req, res) {
  try {
    const mentorStaffId = getMentorStaffId(req);
    const { studentId, type, date, description, notes, actionTaken, followUpDate, outcome, status } = req.body;
    const finalDescription = notes || description || '';

    if (!studentId || !type || !finalDescription) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, intervention type, and notes/description are required.',
      });
    }

    const intervention = await mentorService.recordIntervention(mentorStaffId, {
      studentId,
      type,
      date,
      description: finalDescription,
      actionTaken,
      followUpDate,
      outcome,
      status: status || 'SCHEDULED',
      userId: req.user.id,
      userRole: req.user.role,
    });

    return res.status(201).json({
      success: true,
      message: 'Intervention recorded successfully.',
      data: { intervention, ...intervention },
    });
  } catch (error) {
    console.error('Mentor createIntervention error:', error);
    const status = error.message.includes('Forbidden') ? 403 : 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to record intervention.' });
  }
}

// 7. Update Intervention
async function updateIntervention(req, res) {
  try {
    const mentorStaffId = getMentorStaffId(req);
    const { id } = req.params;
    const { description, notes, actionTaken, followUpDate, outcome, status } = req.body;

    const updated = await mentorService.updateIntervention(mentorStaffId, id, {
      description: notes || description,
      actionTaken,
      followUpDate,
      outcome,
      status,
      userId: req.user.id,
      userRole: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: 'Intervention successfully updated.',
      data: { intervention: updated, ...updated },
    });
  } catch (error) {
    console.error('Mentor updateIntervention error:', error);
    const status = error.message.includes('Forbidden') ? 403 : 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to update intervention.' });
  }
}

// 8. Parent Communication
async function recordParentCommunication(req, res) {
  try {
    const mentorStaffId = getMentorStaffId(req);
    const { studentId, message, notes, description, communicationType, followUpDate } = req.body;
    const finalMsg = message || notes || description || '';

    if (!studentId || !finalMsg) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and communication message are required.',
      });
    }

    const result = await mentorService.recordParentCommunication(mentorStaffId, {
      studentId,
      message: finalMsg,
      communicationType: communicationType || 'ATTENDANCE_WARNING',
      followUpDate,
      userId: req.user.id,
      userRole: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('Mentor recordParentCommunication error:', error);
    const status = error.message.includes('Forbidden') ? 403 : 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to record parent communication.' });
  }
}

// 9. Reports
async function getReports(req, res) {
  try {
    const mentorStaffId = getMentorStaffId(req);
    const data = await mentorService.getMentorReports(mentorStaffId, req.query);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Mentor getReports error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate mentor reports.' });
  }
}

// 10. Profile
async function getProfile(req, res) {
  try {
    const mentorStaffId = getMentorStaffId(req);
    const staff = await prisma.staff.findUnique({
      where: { id: mentorStaffId },
      include: { department: true },
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Mentor profile not found.' });
    }

    const { students } = await mentorService.getMentorAssignedStudents(mentorStaffId);

    const mentorData = {
      id: staff.id,
      employeeId: staff.employeeId,
      name: staff.name,
      email: staff.email,
      mobileNumber: staff.mobileNumber,
      designation: staff.designation,
      cabinLocation: staff.cabinLocation,
      department: staff.department?.name,
      departmentCode: staff.department?.code,
      assignedStudentsCount: students.length,
    };

    return res.status(200).json({
      success: true,
      data: {
        mentor: mentorData,
        ...mentorData,
      },
    });
  } catch (error) {
    console.error('Mentor getProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch mentor profile.' });
  }
}

async function updateProfile(req, res) {
  try {
    const mentorStaffId = getMentorStaffId(req);
    const { mobileNumber, cabinLocation } = req.body;

    const updated = await prisma.staff.update({
      where: { id: mentorStaffId },
      data: {
        mobileNumber: mobileNumber !== undefined ? mobileNumber : undefined,
        cabinLocation: cabinLocation !== undefined ? cabinLocation : undefined,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Mentor profile updated successfully.',
      data: {
        mentor: updated,
        ...updated,
      },
    });
  } catch (error) {
    console.error('Mentor updateProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

module.exports = {
  getDashboard,
  getStudents,
  getStudentDetails,
  getAtRisk,
  getInterventions,
  createIntervention,
  updateIntervention,
  recordParentCommunication,
  getReports,
  getProfile,
  updateProfile,
};
