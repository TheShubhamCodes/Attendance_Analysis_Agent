/**
 * Risk Analysis Service (Rule-Based Academic Risk Engine)
 * 
 * NOTE: This service implements a transparent, auditable rule-based calculation
 * evaluating attendance thresholds, historical trajectory, academic performance,
 * and recent absence volatility.
 * 
 * The architecture is decoupled so that future machine learning or neural predictive
 * models can seamlessly wrap or replace this service without changing frontend contracts.
 */

const { AttendanceStatus } = require('@prisma/client');

function calculateRiskAnalysis({ attendanceRecords, performanceRecords, courses }) {
  const totalClasses = attendanceRecords.length;
  const presentClasses = attendanceRecords.filter(
    (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY
  ).length;

  const overallAttendancePercentage = totalClasses > 0 
    ? Math.round((presentClasses / totalClasses) * 1000) / 10 
    : 100;

  // 1. Subject-wise Attendance Calculation
  const subjectAttendanceMap = {};
  courses.forEach((c) => {
    subjectAttendanceMap[c.id] = {
      courseId: c.id,
      courseCode: c.courseCode,
      courseName: c.courseName,
      total: 0,
      present: 0,
      absent: 0,
    };
  });

  attendanceRecords.forEach((record) => {
    if (subjectAttendanceMap[record.courseId]) {
      subjectAttendanceMap[record.courseId].total += 1;
      if (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.ON_DUTY) {
        subjectAttendanceMap[record.courseId].present += 1;
      } else {
        subjectAttendanceMap[record.courseId].absent += 1;
      }
    }
  });

  const subjectStats = Object.values(subjectAttendanceMap).map((subj) => {
    const percentage = subj.total > 0 ? Math.round((subj.present / subj.total) * 1000) / 10 : 100;
    let status = 'SAFE';
    if (percentage < 65) status = 'HIGH_RISK';
    else if (percentage < 75) status = 'WARNING';
    return { ...subj, percentage, status };
  });

  // 2. Academic Performance Calculation
  let totalScore = 0;
  let maxPossibleScore = 0;
  const subjectPerformanceMap = {};

  performanceRecords.forEach((p) => {
    totalScore += p.marks;
    maxPossibleScore += p.maximumMarks;

    if (!subjectPerformanceMap[p.courseId]) {
      subjectPerformanceMap[p.courseId] = { marksObtained: 0, maxMarks: 0 };
    }
    subjectPerformanceMap[p.courseId].marksObtained += p.marks;
    subjectPerformanceMap[p.courseId].maxMarks += p.maximumMarks;
  });

  const overallAcademicPercentage = maxPossibleScore > 0 
    ? Math.round((totalScore / maxPossibleScore) * 1000) / 10 
    : 75;

  // 3. Trend Analysis (Weekly Trajectory)
  // Sort records ascending by date
  const sortedAttendance = [...attendanceRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Divide into up to 4 sequential time buckets (representing recent periods)
  const chunkSize = Math.max(1, Math.floor(sortedAttendance.length / 4));
  const trendPeriods = [];
  for (let i = 0; i < sortedAttendance.length; i += chunkSize) {
    const chunk = sortedAttendance.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      const p = chunk.filter((r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.ON_DUTY).length;
      trendPeriods.push(Math.round((p / chunk.length) * 100));
    }
  }

  // Check if declining for consecutive periods
  let isDeclining = false;
  if (trendPeriods.length >= 3) {
    const last3 = trendPeriods.slice(-3);
    if (last3[0] > last3[1] && last3[1] > last3[2]) {
      isDeclining = true;
    }
  }

  // 4. Recent Absences (Last 10 records)
  const recentRecords = sortedAttendance.slice(-10);
  const recentAbsences = recentRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;

  // 5. Rule Evaluation Engine
  let riskScore = 0; // 0 to 100 scale
  const reasons = [];
  const recommendedActions = [];

  // Attendance Rules
  if (overallAttendancePercentage < 65) {
    riskScore += 45;
    reasons.push(`Overall attendance is severely low at ${overallAttendancePercentage}% (below critical 65% limit).`);
    recommendedActions.push('Prioritize daily attendance immediately; attend all upcoming classes without exception.');
  } else if (overallAttendancePercentage < 75) {
    riskScore += 25;
    reasons.push(`Overall attendance is ${overallAttendancePercentage}%, below the university required 75% minimum.`);
    recommendedActions.push('Attend next consecutive classes to cross the 75% threshold before final exam lock.');
  }

  // Subject-Specific High Risk Rules
  const highRiskSubjects = subjectStats.filter((s) => s.percentage < 65);
  const warningSubjects = subjectStats.filter((s) => s.percentage >= 65 && s.percentage < 75);

  if (highRiskSubjects.length > 0) {
    riskScore += 20;
    const names = highRiskSubjects.map((s) => `${s.courseName} (${s.percentage}%)`).join(', ');
    reasons.push(`Critical attendance deficit in: ${names}.`);
    recommendedActions.push(`Request makeup/tutorial classes or academic counselling for ${highRiskSubjects[0].courseName}.`);
  }

  if (warningSubjects.length > 0 && highRiskSubjects.length === 0) {
    riskScore += 10;
    const names = warningSubjects.map((s) => `${s.courseName} (${s.percentage}%)`).join(', ');
    reasons.push(`Borderline attendance in: ${names}.`);
  }

  // Trend Rule
  if (isDeclining) {
    riskScore += 15;
    reasons.push('Attendance trend has been declining across the last 3 assessment intervals.');
    recommendedActions.push('Re-establish a strict attendance routine to break the negative trajectory.');
  }

  // Recent Absence Volatility
  if (recentAbsences >= 4) {
    riskScore += 15;
    reasons.push(`High recent absence frequency (${recentAbsences} missed sessions in the last 10 scheduled classes).`);
    recommendedActions.push('Discuss recent attendance gaps with your assigned faculty advisor.');
  }

  // Academic Score Rules
  if (overallAcademicPercentage < 50) {
    riskScore += 35;
    reasons.push(`Cumulative academic performance average is below passing threshold (${overallAcademicPercentage}%).`);
    recommendedActions.push('Schedule remedial support and review core course concepts with subject faculty.');
  } else if (overallAcademicPercentage < 65) {
    riskScore += 15;
    reasons.push(`Academic average is moderate (${overallAcademicPercentage}%), showing vulnerability in internal assessments.`);
    recommendedActions.push('Improve marks in forthcoming internal assessments and submit all pending assignments.');
  }

  // Mentor Connection Action
  if (riskScore >= 30) {
    recommendedActions.push('Schedule an advisory meeting with your designated mentor.');
  }

  // Default baseline recommendation
  if (recommendedActions.length === 0) {
    recommendedActions.push('Maintain consistent attendance across all subjects.');
    recommendedActions.push('Continue strong performance in upcoming mid-term and semester examinations.');
  }

  // Determine Level
  let level = 'LOW';
  if (riskScore >= 60 || overallAttendancePercentage < 65) {
    level = 'HIGH';
  } else if (riskScore >= 30 || overallAttendancePercentage < 75) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
    if (reasons.length === 0) {
      reasons.push('Attendance and academic metrics consistently comply with university regulations.');
      reasons.push('No significant risk triggers detected.');
    }
  }

  return {
    level,
    score: Math.min(100, riskScore),
    overallAttendancePercentage,
    overallAcademicPercentage,
    reasons,
    recommendedActions,
    engineType: 'Rule-Based Academic Risk Engine v1.0',
    modelDisclaimer: 'Classification is derived from transparent university risk rules. Machine Learning predictive models will be introduced in subsequent updates.',
    subjectStats,
  };
}

module.exports = { calculateRiskAnalysis };
