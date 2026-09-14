const prisma = require('../config/db');
const { AttendanceStatus, NotificationType } = require('@prisma/client');
const AttendanceAnalysisAgentService = require('./attendanceAnalysisAgentService');
const { calculateStudentAttendanceWithExemptions } = require('./odLeaveService');

class MentorService {
  /**
   * Retrieves all student IDs assigned to a given mentor Staff ID:
   * 1. Student.mentorId === mentorStaffId
   * 2. MentorStudentAssignment where mentorId === mentorStaffId and active === true
   * 3. CounselorAssignment where facultyId === mentorStaffId
   */
  static async getMentorAssignedStudents(mentorStaffId) {
    if (!mentorStaffId) {
      return { studentIds: new Set(), students: [], count: 0 };
    }

    // 1. Check Student.mentorId
    const directStudents = await prisma.student.findMany({
      where: {
        mentorId: mentorStaffId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        department: true,
        parent: true,
      },
    });

    // 2. Check MentorStudentAssignment
    const mentorAssignments = await prisma.mentorStudentAssignment.findMany({
      where: {
        mentorId: mentorStaffId,
        active: true,
      },
      include: {
        student: {
          include: {
            department: true,
            parent: true,
          },
        },
      },
    });

    // 3. Check CounselorAssignment (fallback for mentor/counselor dual roles)
    const counselorAssignments = await prisma.counselorAssignment.findMany({
      where: {
        facultyId: mentorStaffId,
      },
      include: {
        student: {
          include: {
            department: true,
            parent: true,
          },
        },
      },
    });

    const studentMap = new Map();

    directStudents.forEach((s) => studentMap.set(s.id, s));
    mentorAssignments.forEach((ma) => {
      if (ma.student && ma.student.status === 'ACTIVE' && ma.student.deletedAt === null) {
        studentMap.set(ma.student.id, ma.student);
      }
    });
    counselorAssignments.forEach((ca) => {
      if (ca.student && ca.student.status === 'ACTIVE' && ca.student.deletedAt === null) {
        studentMap.set(ca.student.id, ca.student);
      }
    });

    const students = Array.from(studentMap.values());
    const studentIds = new Set(students.map((s) => s.id));

    return {
      studentIds,
      students,
      count: students.length,
    };
  }

  /**
   * Computes rich, database-backed Mentor Dashboard Metrics for assigned students only
   */
  static async getMentorDashboard(mentorStaffId) {
    const { students, count } = await this.getMentorAssignedStudents(mentorStaffId);

    if (count === 0) {
      return {
        hasStudents: false,
        message: 'No students are currently assigned to you.',
        totalAssignedStudents: 0,
        studentsAbove75: 0,
        studentsBelow75: 0,
        atRiskStudents: 0,
        highRiskStudents: 0,
        studentsImproving: 0,
        studentsNeedingIntervention: 0,
        studentsRequiringIntervention: 0,
        averageAttendance: 0,
        metrics: {
          totalAssignedStudents: 0,
          studentsAbove75: 0,
          studentsBelow75: 0,
          atRiskStudents: 0,
          highRiskStudents: 0,
          studentsImproving: 0,
          studentsRequiringIntervention: 0,
          averageAttendance: 0,
        },
        riskDistribution: {
          safe: 0,
          low: 0,
          medium: 0,
          high: 0,
          lowRisk: 0,
          moderateRisk: 0,
          highRisk: 0,
          critical: 0,
        },
        recentInterventions: [],
        studentsNeedingFollowUp: [],
        followUpsNeedingAttention: [],
        improvementTrends: [],
        improvingStudents: [],
      };
    }

    const studentIds = students.map((s) => s.id);

    // Fetch all attendance records for these assigned students
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
      },
      orderBy: { date: 'asc' },
    });

    // Group records by studentId
    const recordsByStudent = new Map();
    studentIds.forEach((id) => recordsByStudent.set(id, []));
    attendanceRecords.forEach((r) => {
      if (recordsByStudent.has(r.studentId)) {
        recordsByStudent.get(r.studentId).push(r);
      }
    });

    let studentsAbove75 = 0;
    let studentsBelow75 = 0;
    let atRiskStudents = 0;
    let highRiskStudents = 0;
    let studentsImproving = 0;
    let studentsRequiringIntervention = 0;
    let totalPercentageSum = 0;

    const riskDistribution = {
      safe: 0,
      lowRisk: 0,
      moderateRisk: 0,
      highRisk: 0,
      critical: 0,
    };

    const improvementTrends = [];

    // Analyze each assigned student with Agent's trajectory and risk logic
    for (const student of students) {
      const records = recordsByStudent.get(student.id) || [];
      const total = records.length;
      const present = records.filter(
        (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
      ).length;

      const rawPct = total > 0 ? Math.round((present / total) * 1000) / 10 : 100;
      totalPercentageSum += rawPct;

      const { trend, trendSlope, projectedPct } = AttendanceAnalysisAgentService.calculateTrajectory(records, rawPct);
      const riskAssessment = AttendanceAnalysisAgentService.determineRisk(rawPct, trend, trendSlope, projectedPct);

      if (rawPct >= 75) {
        studentsAbove75++;
        riskDistribution.safe++;
      } else {
        studentsBelow75++;
        if (rawPct >= 70) riskDistribution.lowRisk++;
        else if (rawPct >= 65) riskDistribution.moderateRisk++;
        else if (rawPct >= 60) riskDistribution.highRisk++;
        else riskDistribution.critical++;
      }

      if (rawPct < 65 || riskAssessment.level === 'HIGH' || riskAssessment.level === 'CRITICAL') {
        atRiskStudents++;
      }

      if (rawPct < 60 || riskAssessment.level === 'CRITICAL') {
        highRiskStudents++;
      }

      if (trend === 'IMPROVING' || trendSlope > 0) {
        studentsImproving++;
        improvementTrends.push({
          studentId: student.id,
          name: student.name,
          registrationNumber: student.registrationNumber,
          section: student.section,
          currentPercentage: rawPct,
          projectedPercentage: projectedPct,
          trendSlope,
          trend,
        });
      }

      if (rawPct < 75 || riskAssessment.level === 'HIGH' || riskAssessment.level === 'CRITICAL') {
        studentsRequiringIntervention++;
      }
    }

    const averageAttendance = count > 0 ? Math.round((totalPercentageSum / count) * 10) / 10 : 0;

    // Fetch recent interventions recorded by this mentor
    const recentInterventions = await prisma.intervention.findMany({
      where: {
        mentorId: mentorStaffId,
      },
      include: {
        student: {
          select: { id: true, name: true, registrationNumber: true, section: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 6,
    });

    // Students needing follow-up
    const followUpInterventions = await prisma.intervention.findMany({
      where: {
        mentorId: mentorStaffId,
        status: { in: ['PLANNED', 'FOLLOW_UP_REQUIRED', 'IN_PROGRESS', 'SCHEDULED'] },
      },
      include: {
        student: {
          select: { id: true, name: true, registrationNumber: true, section: true },
        },
      },
      orderBy: { followUpDate: 'asc' },
      take: 8,
    });

    const formattedInterventions = recentInterventions.map((i) => ({
      id: i.id,
      studentName: i.student.name,
      registrationNumber: i.student.registrationNumber,
      section: i.student.section,
      type: i.type,
      date: i.date.toISOString().split('T')[0],
      status: i.status,
      description: i.notes || i.description,
      notes: i.notes,
      outcome: i.outcome,
      improvement: i.improvement,
      attendanceBefore: i.attendanceBefore,
      attendanceAfter: i.attendanceAfter,
    }));

    const formattedFollowUps = followUpInterventions.map((i) => ({
      id: i.id,
      interventionId: i.id,
      studentId: i.student.id,
      student: i.student,
      studentName: i.student.name,
      registrationNumber: i.student.registrationNumber,
      section: i.student.section,
      type: i.type,
      status: i.status,
      notes: i.notes,
      actionTaken: i.actionTaken,
      followUpDate: i.followUpDate ? i.followUpDate.toISOString().split('T')[0] : null,
    }));

    return {
      hasStudents: true,
      totalAssignedStudents: count,
      studentsAbove75,
      studentsBelow75,
      atRiskStudents,
      highRiskStudents,
      studentsImproving,
      studentsNeedingIntervention: studentsRequiringIntervention,
      studentsRequiringIntervention,
      averageAttendance,
      metrics: {
        totalAssignedStudents: count,
        studentsAbove75,
        studentsBelow75,
        atRiskStudents,
        highRiskStudents,
        studentsImproving,
        studentsRequiringIntervention,
        averageAttendance,
      },
      riskDistribution: {
        safe: riskDistribution.safe,
        low: riskDistribution.lowRisk,
        medium: riskDistribution.moderateRisk,
        high: riskDistribution.highRisk + riskDistribution.critical,
        lowRisk: riskDistribution.lowRisk,
        moderateRisk: riskDistribution.moderateRisk,
        highRisk: riskDistribution.highRisk,
        critical: riskDistribution.critical,
      },
      recentInterventions: formattedInterventions,
      studentsNeedingFollowUp: formattedFollowUps,
      followUpsNeedingAttention: formattedFollowUps,
      improvementTrends: improvementTrends.slice(0, 6),
      improvingStudents: improvementTrends.map(t => ({
        id: t.studentId,
        name: t.name,
        registrationNumber: t.registrationNumber,
        section: t.section,
        currentAttendance: t.currentPercentage,
        projectedAttendance: t.projectedPercentage,
        trend: t.trend,
        slope: t.trendSlope,
      })),
    };
  }

  /**
   * Retrieves assigned students with search, filters, attendance %, risk level, and trend
   */
  static async getAssignedStudentsList(mentorStaffId, { search = '', filter = 'all' } = {}) {
    const { students, count } = await this.getMentorAssignedStudents(mentorStaffId);
    if (count === 0) return { students: [], totalCount: 0 };

    const studentIds = students.map((s) => s.id);

    // Fetch attendance records in batch
    const attendanceRecords = await prisma.attendance.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { date: 'asc' },
    });

    const recordsByStudent = new Map();
    studentIds.forEach((id) => recordsByStudent.set(id, []));
    attendanceRecords.forEach((r) => {
      if (recordsByStudent.has(r.studentId)) {
        recordsByStudent.get(r.studentId).push(r);
      }
    });

    // Fetch latest intervention per student
    const interventions = await prisma.intervention.findMany({
      where: { mentorId: mentorStaffId, studentId: { in: studentIds } },
      orderBy: { date: 'desc' },
    });
    const latestInterventionMap = new Map();
    interventions.forEach((inv) => {
      if (!latestInterventionMap.has(inv.studentId)) {
        latestInterventionMap.set(inv.studentId, inv);
      }
    });

    const list = [];

    for (const student of students) {
      const records = recordsByStudent.get(student.id) || [];
      const total = records.length;
      const present = records.filter(
        (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
      ).length;

      const rawPct = total > 0 ? Math.round((present / total) * 1000) / 10 : 100;

      const { trend, trendSlope, projectedPct } = AttendanceAnalysisAgentService.calculateTrajectory(records, rawPct);
      const riskAssessment = AttendanceAnalysisAgentService.determineRisk(rawPct, trend, trendSlope, projectedPct);
      const latestInv = latestInterventionMap.get(student.id);

      const formattedRisk =
        riskAssessment.level === 'CRITICAL' || riskAssessment.level === 'HIGH'
          ? 'HIGH_RISK'
          : riskAssessment.level === 'MEDIUM'
          ? 'MEDIUM_RISK'
          : 'LOW_RISK';

      const studentItem = {
        id: student.id,
        registrationNumber: student.registrationNumber,
        name: student.name,
        section: student.section,
        year: student.year,
        semester: student.year * 2 - 1, // standard semester mapping e.g. Year 3 = Sem 5
        department: student.department?.code || student.department?.name,
        overallAttendance: rawPct,
        rawPercentage: rawPct,
        totalClasses: total,
        presentClasses: present,
        absentClasses: total - present,
        riskLevel: formattedRisk,
        rawRiskLevel: riskAssessment.level,
        trend,
        trendSlope,
        projectedPercentage: projectedPct,
        interventionRequired: rawPct < 75 || riskAssessment.level === 'HIGH' || riskAssessment.level === 'CRITICAL',
        latestIntervention: latestInv
          ? {
              id: latestInv.id,
              type: latestInv.type,
              date: latestInv.date.toISOString().split('T')[0],
              status: latestInv.status,
              outcome: latestInv.outcome,
              improvement: latestInv.improvement,
            }
          : null,
        interventionStatus: latestInv ? latestInv.status : 'NONE',
      };

      list.push(studentItem);
    }

    // Apply Search Filter
    let filtered = list;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (s) => s.name.toLowerCase().includes(q) || s.registrationNumber.toLowerCase().includes(q)
      );
    }

    // Apply Quick Category Filter
    if (filter === 'below_75') {
      filtered = filtered.filter((s) => s.overallAttendance < 75);
    } else if (filter === 'high_risk') {
      filtered = filtered.filter((s) => s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL');
    } else if (filter === 'medium_risk') {
      filtered = filtered.filter((s) => s.riskLevel === 'MODERATE');
    } else if (filter === 'low_risk') {
      filtered = filtered.filter((s) => s.riskLevel === 'LOW' || s.riskLevel === 'SAFE');
    } else if (filter === 'improving') {
      filtered = filtered.filter((s) => s.trend === 'IMPROVING' || s.trendSlope > 0);
    } else if (filter === 'declining') {
      filtered = filtered.filter((s) => s.trend === 'DECLINING' || s.trendSlope < 0);
    } else if (filter === 'intervention_required') {
      filtered = filtered.filter(
        (s) =>
          s.overallAttendance < 75 ||
          s.riskLevel === 'HIGH' ||
          s.riskLevel === 'CRITICAL' ||
          s.interventionStatus === 'FOLLOW_UP_REQUIRED'
      );
    }

    return {
      students: filtered,
      totalCount: filtered.length,
    };
  }

  /**
   * Retrieves full details for an assigned student:
   * Info, Raw & Adjusted Attendance, Subject-wise breakdown, Trajectory, Risk, Interventions with Improvement
   */
  static async getStudentDetails(mentorStaffId, studentId) {
    const { studentIds } = await this.getMentorAssignedStudents(mentorStaffId);

    if (!studentIds.has(studentId)) {
      throw new Error('Forbidden: You are only authorized to access your assigned students.');
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        department: true,
        parent: true,
      },
    });

    if (!student) {
      throw new Error('Student not found.');
    }

    // 1. Raw vs Adjusted Attendance with exemptions
    const attendanceWithExemptions = await calculateStudentAttendanceWithExemptions(studentId);

    // 2. Fetch all student attendance records including courses
    const records = await prisma.attendance.findMany({
      where: { studentId },
      include: {
        course: {
          include: { department: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // 3. Subject-wise attendance calculation
    const subjectMap = new Map();
    records.forEach((r) => {
      const cId = r.courseId;
      if (!subjectMap.has(cId)) {
        subjectMap.set(cId, {
          courseId: cId,
          courseCode: r.course.courseCode,
          courseName: r.course.courseName,
          credits: r.course.credits,
          totalClasses: 0,
          presentClasses: 0,
          absentClasses: 0,
          onDutyClasses: 0,
        });
      }
      const s = subjectMap.get(cId);
      s.totalClasses++;
      if (r.status === AttendanceStatus.PRESENT) {
        s.presentClasses++;
      } else if (r.status === AttendanceStatus.ON_DUTY) {
        s.presentClasses++;
        s.onDutyClasses++;
      } else {
        s.absentClasses++;
      }
    });

    const subjectWiseAttendance = Array.from(subjectMap.values()).map((sub) => ({
      ...sub,
      percentage: sub.totalClasses > 0 ? Math.round((sub.presentClasses / sub.totalClasses) * 1000) / 10 : 100,
    }));

    // 4. Trajectory & Risk
    const rawPct = attendanceWithExemptions?.raw?.percentage ?? 100;
    const { trend, trendSlope, projectedPct } = AttendanceAnalysisAgentService.calculateTrajectory(records, rawPct);
    const riskAssessment = AttendanceAnalysisAgentService.determineRisk(rawPct, trend, trendSlope, projectedPct);
    const recommendation = AttendanceAnalysisAgentService.recommendIntervention(
      rawPct,
      AttendanceAnalysisAgentService.classifyBand(rawPct),
      trend,
      riskAssessment.level
    );

    // 5. Interventions history with before/after attendance metrics
    const interventions = await prisma.intervention.findMany({
      where: { studentId },
      include: {
        mentor: {
          select: { name: true, employeeId: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return {
      student: {
        id: student.id,
        registrationNumber: student.registrationNumber,
        name: student.name,
        email: student.email,
        mobileNumber: student.mobileNumber,
        section: student.section,
        year: student.year,
        semester: student.year * 2 - 1,
        department: student.department?.name,
        departmentCode: student.department?.code,
      },
      attendance: {
        rawPercentage: rawPct,
        adjustedPercentage: attendanceWithExemptions?.adjusted?.percentage ?? rawPct,
        totalClasses: attendanceWithExemptions?.raw?.totalClasses ?? records.length,
        classesAttended: attendanceWithExemptions?.raw?.presentClasses ?? 0,
        presentClasses: attendanceWithExemptions?.raw?.presentClasses ?? 0,
        classesAbsent: (attendanceWithExemptions?.raw?.totalClasses ?? records.length) - (attendanceWithExemptions?.raw?.presentClasses ?? 0),
        absentClasses: (attendanceWithExemptions?.raw?.totalClasses ?? records.length) - (attendanceWithExemptions?.raw?.presentClasses ?? 0),
        approvedOdPeriods: attendanceWithExemptions?.approvedOdPeriods ?? 0,
        approvedLeavePeriods: attendanceWithExemptions?.approvedLeavePeriods ?? 0,
        subjectWise: subjectWiseAttendance,
      },
      risk: {
        riskLevel: riskAssessment.level,
        currentRiskLevel: riskAssessment.level,
        riskScore: riskAssessment.score,
        riskFactors: riskAssessment.factors,
        riskReason: riskAssessment.factors?.join(', ') || 'Attendance deficit observed',
        trendDirection: trend,
        trendSlope,
        projectedAttendance: projectedPct,
        recommendedAction: recommendation.action,
        urgency: recommendation.urgency,
      },
      interventions: interventions.map((i) => ({
        id: i.id,
        type: i.type,
        date: i.date.toISOString().split('T')[0],
        description: i.description,
        notes: i.notes || i.description,
        actionTaken: i.actionTaken,
        outcome: i.outcome,
        status: i.status,
        followUpDate: i.followUpDate ? i.followUpDate.toISOString().split('T')[0] : null,
        attendanceBefore: i.attendanceBefore,
        attendanceAfter: i.attendanceAfter,
        improvement: i.improvement,
        mentorName: i.mentor?.name,
      })),
      parentContact: student.parent
        ? {
            name: student.parent.name,
            email: student.parent.email,
            mobile: student.parent.mobile,
          }
        : null,
      parentInfo: student.parent
        ? {
            name: student.parent.name,
            email: student.parent.email,
            mobile: student.parent.mobile,
          }
        : null,
    };
  }

  /**
   * Retrieves At-Risk students strictly scoped to logged-in Mentor's assigned students
   */
  static async getAtRiskStudents(mentorStaffId) {
    const { students, count } = await this.getMentorAssignedStudents(mentorStaffId);
    if (count === 0) return [];

    const studentIds = students.map((s) => s.id);
    const records = await prisma.attendance.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { date: 'asc' },
    });

    const recordsByStudent = new Map();
    studentIds.forEach((id) => recordsByStudent.set(id, []));
    records.forEach((r) => {
      if (recordsByStudent.has(r.studentId)) recordsByStudent.get(r.studentId).push(r);
    });

    const atRiskList = [];

    for (const student of students) {
      const studentRecords = recordsByStudent.get(student.id) || [];
      const total = studentRecords.length;
      const present = studentRecords.filter(
        (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
      ).length;

      const rawPct = total > 0 ? Math.round((present / total) * 1000) / 10 : 100;
      const { trend, trendSlope, projectedPct } = AttendanceAnalysisAgentService.calculateTrajectory(studentRecords, rawPct);
      const riskAssessment = AttendanceAnalysisAgentService.determineRisk(rawPct, trend, trendSlope, projectedPct);
      const recommendation = AttendanceAnalysisAgentService.recommendIntervention(
        rawPct,
        AttendanceAnalysisAgentService.classifyBand(rawPct),
        trend,
        riskAssessment.level
      );

      // Flag students with attendance < 75% or high/critical risk
      if (rawPct < 75 || riskAssessment.level === 'HIGH' || riskAssessment.level === 'CRITICAL') {
        const formattedRisk =
          riskAssessment.level === 'CRITICAL' || riskAssessment.level === 'HIGH'
            ? 'HIGH_RISK'
            : 'MEDIUM_RISK';

        atRiskList.push({
          id: student.id,
          name: student.name,
          registrationNumber: student.registrationNumber,
          section: student.section,
          year: student.year,
          departmentName: student.department?.name || student.department?.code,
          student: {
            id: student.id,
            name: student.name,
            registrationNumber: student.registrationNumber,
            section: student.section,
            year: student.year,
            department: student.department?.code || student.department?.name,
          },
          currentAttendance: rawPct,
          projectedAttendance: projectedPct,
          riskLevel: formattedRisk,
          rawRiskLevel: riskAssessment.level,
          trend,
          trendSlope,
          reason: riskAssessment.factors.join('; ') || 'Attendance falling below mandatory university threshold.',
          riskReason: riskAssessment.factors.join('; ') || 'Attendance falling below mandatory university threshold.',
          recommendedIntervention: recommendation.action,
          recommendedAction: recommendation.action,
          urgency: recommendation.urgency,
        });
      }
    }

    return atRiskList.sort((a, b) => a.currentAttendance - b.currentAttendance);
  }

  /**
   * Records a new Counselling/Intervention and snapshots current attendance as `attendanceBefore`
   */
  static async recordIntervention(
    mentorStaffId,
    { studentId, type, date, description, actionTaken, followUpDate, outcome, status = 'SCHEDULED', userId, userRole }
  ) {
    const { studentIds } = await this.getMentorAssignedStudents(mentorStaffId);
    if (!studentIds.has(studentId)) {
      throw new Error('Forbidden: You can only record interventions for your assigned students.');
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { department: true },
    });

    // Compute current attendance percentage snapshot (attendanceBefore)
    const att = await calculateStudentAttendanceWithExemptions(studentId);
    const attendanceBefore = att?.raw?.percentage ?? null;

    const intervention = await prisma.intervention.create({
      data: {
        studentId,
        mentorId: mentorStaffId,
        type,
        date: new Date(date || new Date()),
        description: description || 'Intervention recorded by mentor',
        actionTaken: actionTaken || null,
        outcome: outcome || null,
        attendanceBefore,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        status,
      },
      include: {
        student: true,
      },
    });

    // Record SystemAuditLog
    await prisma.systemAuditLog.create({
      data: {
        actorId: userId || mentorStaffId,
        actorRole: userRole || 'MENTOR',
        action: 'CREATE_INTERVENTION',
        targetType: 'STUDENT',
        targetId: studentId,
        targetName: student?.name,
        departmentId: student?.departmentId,
        details: JSON.stringify({
          interventionId: intervention.id,
          type,
          status,
          attendanceBefore,
          followUpDate,
        }),
      },
    });

    return intervention;
  }

  /**
   * Updates an existing intervention, computes observed `attendanceAfter` and `improvement`
   */
  static async updateIntervention(
    mentorStaffId,
    interventionId,
    { description, actionTaken, followUpDate, outcome, status, userId, userRole }
  ) {
    const existing = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: { student: true },
    });

    if (!existing || existing.mentorId !== mentorStaffId) {
      throw new Error('Forbidden: You are not authorized to modify this intervention record.');
    }

    // Compute observed current attendance (attendanceAfter) & improvement
    const att = await calculateStudentAttendanceWithExemptions(existing.studentId);
    const attendanceAfter = att?.raw?.percentage ?? null;

    let improvement = null;
    if (existing.attendanceBefore !== null && attendanceAfter !== null) {
      improvement = Math.round((attendanceAfter - existing.attendanceBefore) * 10) / 10;
    }

    const updated = await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        description: description !== undefined ? description : existing.description,
        actionTaken: actionTaken !== undefined ? actionTaken : existing.actionTaken,
        outcome: outcome !== undefined ? outcome : existing.outcome,
        status: status !== undefined ? status : existing.status,
        followUpDate: followUpDate !== undefined ? (followUpDate ? new Date(followUpDate) : null) : existing.followUpDate,
        attendanceAfter,
        improvement,
      },
      include: { student: true },
    });

    // Audit Log
    await prisma.systemAuditLog.create({
      data: {
        actorId: userId || mentorStaffId,
        actorRole: userRole || 'MENTOR',
        action: 'UPDATE_INTERVENTION',
        targetType: 'INTERVENTION',
        targetId: interventionId,
        targetName: existing.student?.name,
        details: JSON.stringify({
          status: updated.status,
          attendanceBefore: existing.attendanceBefore,
          attendanceAfter,
          improvement,
        }),
      },
    });

    return updated;
  }

  /**
   * Records parent communication event and sends notification/audit log
   */
  static async recordParentCommunication(
    mentorStaffId,
    { studentId, message, communicationType = 'ATTENDANCE_WARNING', followUpDate, userId, userRole }
  ) {
    const { studentIds } = await this.getMentorAssignedStudents(mentorStaffId);
    if (!studentIds.has(studentId)) {
      throw new Error('Forbidden: You can only communicate with parents of your assigned students.');
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });

    if (!student) throw new Error('Student not found.');

    const att = await calculateStudentAttendanceWithExemptions(studentId);
    const attendanceBefore = att?.raw?.percentage ?? null;

    // 1. Create Intervention record of type PARENT_COMMUNICATION
    const intervention = await prisma.intervention.create({
      data: {
        studentId,
        mentorId: mentorStaffId,
        type: 'PARENT_COMMUNICATION',
        date: new Date(),
        description: `Parent Communication: ${message}`,
        actionTaken: `Communicated with parent (${student.parent?.name || 'Authorized Guardian'}) regarding ${communicationType}`,
        status: 'COMPLETED',
        attendanceBefore,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
    });

    // 2. Create Notification for Student
    await prisma.notification.create({
      data: {
        studentId,
        title: 'Mentor Notice / Parent Communication',
        message: `Your mentor conducted a communication review: "${message}"`,
        type: NotificationType.MENTOR_MESSAGE,
      },
    });

    // 3. Log Audit
    await prisma.systemAuditLog.create({
      data: {
        actorId: userId || mentorStaffId,
        actorRole: userRole || 'MENTOR',
        action: 'PARENT_COMMUNICATION',
        targetType: 'PARENT',
        targetId: student.parent?.id || studentId,
        targetName: student.parent?.name || student.name,
        departmentId: student.departmentId,
        details: JSON.stringify({
          studentId,
          registrationNumber: student.registrationNumber,
          communicationType,
          message,
        }),
      },
    });

    return {
      success: true,
      message: 'Parent communication recorded successfully.',
      interventionId: intervention.id,
      parentContact: student.parent ? { name: student.parent.name, mobile: student.parent.mobile } : null,
    };
  }

  /**
   * Generates structured reports for Mentor's assigned students
   */
  static async getMentorReports(mentorStaffId, query = {}) {
    const reportType = (query.type || query.reportType || 'ATTENDANCE').toUpperCase();
    const { students } = await this.getMentorAssignedStudents(mentorStaffId);
    const studentList = await this.getAssignedStudentsList(mentorStaffId);
    const atRiskStudents = await this.getAtRiskStudents(mentorStaffId);

    const defaulters = studentList.students.filter((s) => s.overallAttendance < 75);
    const highRisk = studentList.students.filter((s) => s.riskLevel === 'HIGH_RISK' || s.rawRiskLevel === 'HIGH' || s.rawRiskLevel === 'CRITICAL');
    const interventions = await prisma.intervention.findMany({
      where: { mentorId: mentorStaffId },
      include: {
        student: { select: { id: true, name: true, registrationNumber: true, section: true } },
      },
      orderBy: { date: 'desc' },
    });

    const effectiveness = interventions
      .filter((i) => i.attendanceBefore !== null && i.attendanceAfter !== null)
      .map((i) => ({
        id: i.id,
        studentName: i.student.name,
        registrationNumber: i.student.registrationNumber,
        type: i.type,
        date: i.date.toISOString().split('T')[0],
        before: i.attendanceBefore,
        after: i.attendanceAfter,
        improvement: i.improvement,
        outcome: i.outcome,
      }));

    let records = [];
    let reportTitle = 'Assigned Students Attendance Report';

    switch (reportType) {
      case 'ATTENDANCE':
        reportTitle = 'Assigned Students Attendance Report';
        records = studentList.students.map((s) => ({
          registrationNumber: s.registrationNumber,
          name: s.name,
          section: s.section,
          year: s.year,
          overallAttendance: `${s.overallAttendance}%`,
          totalClasses: s.totalClasses,
          attendedClasses: s.presentClasses,
          absentClasses: s.absentClasses,
          trend: s.trend,
          riskLevel: s.riskLevel,
        }));
        break;

      case 'AT_RISK':
        reportTitle = 'At-Risk Students Report';
        records = atRiskStudents.map((s) => ({
          registrationNumber: s.registrationNumber,
          name: s.name,
          section: s.section,
          currentAttendance: `${s.currentAttendance}%`,
          projectedAttendance: `${s.projectedAttendance}%`,
          riskLevel: s.riskLevel,
          trend: s.trend,
          recommendedIntervention: s.recommendedIntervention || s.recommendedAction,
          reason: s.reason || s.riskReason,
        }));
        break;

      case 'SHORTAGE':
        reportTitle = 'Attendance Shortage (<75%) Report';
        records = defaulters.map((s) => ({
          registrationNumber: s.registrationNumber,
          name: s.name,
          section: s.section,
          overallAttendance: `${s.overallAttendance}%`,
          totalClasses: s.totalClasses,
          attendedClasses: s.presentClasses,
          absentClasses: s.absentClasses,
          trend: s.trend,
          riskLevel: s.riskLevel,
        }));
        break;

      case 'TRENDS':
        reportTitle = 'Attendance Trajectory & Trends Report';
        records = studentList.students.map((s) => ({
          registrationNumber: s.registrationNumber,
          name: s.name,
          section: s.section,
          overallAttendance: `${s.overallAttendance}%`,
          projectedAttendance: `${s.projectedPercentage}%`,
          trendDirection: s.trend,
          trendSlope: `${s.trendSlope}%`,
          riskLevel: s.riskLevel,
        }));
        break;

      case 'INTERVENTIONS':
        reportTitle = 'Mentor Counselling & Interventions Report';
        records = interventions.map((i) => ({
          date: i.date.toISOString().split('T')[0],
          studentName: i.student.name,
          registrationNumber: i.student.registrationNumber,
          type: i.type,
          status: i.status,
          notes: i.description,
          actionTaken: i.actionTaken || '—',
          followUpDate: i.followUpDate ? i.followUpDate.toISOString().split('T')[0] : '—',
          outcome: i.outcome || '—',
        }));
        break;

      case 'EFFECTIVENESS':
        reportTitle = 'Intervention Effectiveness Report';
        records = effectiveness.map((e) => ({
          date: e.date,
          studentName: e.studentName,
          registrationNumber: e.registrationNumber,
          type: e.type,
          attendanceBefore: `${e.before}%`,
          attendanceAfter: `${e.after}%`,
          improvement: e.improvement !== null ? `${e.improvement > 0 ? '+' : ''}${e.improvement}%` : 'Pending observation',
          outcome: e.outcome || '—',
        }));
        break;

      case 'FOLLOW_UP':
        reportTitle = 'Pending Intervention Follow-Ups Report';
        records = interventions
          .filter((i) => i.status === 'FOLLOW_UP_REQUIRED' || (i.followUpDate && new Date(i.followUpDate) >= new Date()))
          .map((i) => ({
            followUpDate: i.followUpDate ? i.followUpDate.toISOString().split('T')[0] : 'Not scheduled',
            studentName: i.student.name,
            registrationNumber: i.student.registrationNumber,
            type: i.type,
            status: i.status,
            notes: i.description,
            actionTaken: i.actionTaken || '—',
          }));
        break;

      default:
        reportTitle = 'Assigned Students Comprehensive Report';
        records = studentList.students.map((s) => ({
          registrationNumber: s.registrationNumber,
          name: s.name,
          section: s.section,
          overallAttendance: `${s.overallAttendance}%`,
          trend: s.trend,
          riskLevel: s.riskLevel,
        }));
        break;
    }

    return {
      reportType,
      reportTitle,
      records,
      count: records.length,
      summary: {
        totalStudents: students.length,
        defaultersCount: defaulters.length,
        highRiskCount: highRisk.length,
        interventionsCount: interventions.length,
      },
      students: studentList.students,
      defaulters,
      highRisk,
      interventions: interventions.map((i) => ({
        id: i.id,
        studentName: i.student.name,
        registrationNumber: i.student.registrationNumber,
        type: i.type,
        status: i.status,
        date: i.date.toISOString().split('T')[0],
        followUpDate: i.followUpDate ? i.followUpDate.toISOString().split('T')[0] : null,
        description: i.description,
        actionTaken: i.actionTaken,
        outcome: i.outcome,
        improvement: i.improvement,
      })),
      effectiveness,
    };
  }
}

module.exports = MentorService;
