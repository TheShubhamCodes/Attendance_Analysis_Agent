const XLSX = require('xlsx');
const prisma = require('../config/db');
const { AttendanceStatus, NotificationType } = require('@prisma/client');
const AttendanceAnalysisAgentService = require('./attendanceAnalysisAgentService');

/**
 * Normalizes string for safe comparison (removes multiple spaces, trims, case-insensitive)
 */
function normalizeStr(str) {
  if (!str) return '';
  return str.toString().trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Normalizes attendance status to PRESENT or ABSENT.
 * Returns null if invalid.
 */
function parseAttendanceStatus(val) {
  if (!val) return null;
  const clean = val.toString().trim().toUpperCase();
  if (clean === 'PRESENT' || clean === 'P') {
    return AttendanceStatus.PRESENT;
  }
  if (clean === 'ABSENT' || clean === 'A') {
    return AttendanceStatus.ABSENT;
  }
  return null;
}

class AttendanceUploadService {
  /**
   * Generates a downloadable sample Excel file (.xlsx).
   * If section/department is provided, pre-fills actual registered students
   * so faculty can easily fill in attendance. Otherwise provides standard sample rows.
   */
  static async generateTemplate({ departmentId, section, courseId, year, semester }) {
    let students = [];
    if (section) {
      const where = {
        section: section.toString().trim().toUpperCase(),
        status: 'ACTIVE',
        deletedAt: null,
      };
      if (departmentId) {
        where.departmentId = departmentId;
      }
      if (year) {
        where.year = parseInt(year, 10);
      }
      students = await prisma.student.findMany({
        where,
        select: {
          registrationNumber: true,
          name: true,
        },
        orderBy: { registrationNumber: 'asc' },
      });
    }

    const rows = [
      ['Registration Number', 'Student Name', 'Attendance'],
    ];

    if (students.length > 0) {
      students.forEach((s) => {
        rows.push([s.registrationNumber, s.name, 'Present']);
      });
    } else {
      // Standard sample demo rows
      rows.push(
        ['24CSE301', 'Rahul Kumar', 'Present'],
        ['24CSE302', 'Aman Singh', 'Absent'],
        ['24CSE303', 'Rohan Verma', 'Present']
      );
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set readable column widths
    ws['!cols'] = [
      { wch: 25 }, // Registration Number
      { wch: 30 }, // Student Name
      { wch: 18 }, // Attendance
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Attendance_Upload');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Parses uploaded Excel file buffer into structured rows
   */
  static parseExcelBuffer(buffer) {
    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (err) {
      throw new Error('Unable to read Excel file. Please ensure it is a valid .xlsx or .xls file.');
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('The uploaded Excel file contains no worksheets.');
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!rawData || rawData.length === 0) {
      throw new Error('The uploaded Excel worksheet is empty.');
    }

    // Identify header row (row index 0)
    const headerRow = rawData[0];
    let regColIdx = -1;
    let nameColIdx = -1;
    let attColIdx = -1;

    headerRow.forEach((cell, idx) => {
      const text = (cell || '').toString().trim().toLowerCase();
      if (/registration\s*(number|no\.?)|reg\s*(no\.?|number)|roll\s*(no\.?|number)|regno|rollno/.test(text)) {
        regColIdx = idx;
      } else if (/student\s*name|student_name|name/.test(text)) {
        nameColIdx = idx;
      } else if (/attendance(\s*status)?|attendance\s*value|status/.test(text)) {
        attColIdx = idx;
      }
    });

    if (regColIdx === -1 || attColIdx === -1) {
      throw new Error(
        "Invalid Excel structure. The file must have column headers: 'Registration Number', 'Student Name', and 'Attendance'."
      );
    }

    // Extract student rows
    const parsedRows = [];
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      // Check if entire row is empty
      const isRowEmpty = row.every((cell) => cell === null || cell === undefined || cell.toString().trim() === '');
      if (isRowEmpty) continue;

      const excelRowNumber = i + 1; // 1-based index matching spreadsheet view
      const rawRegNo = row[regColIdx] !== undefined ? row[regColIdx].toString().trim() : '';
      const rawName = nameColIdx !== -1 && row[nameColIdx] !== undefined ? row[nameColIdx].toString().trim() : '';
      const rawAtt = row[attColIdx] !== undefined ? row[attColIdx].toString().trim() : '';

      parsedRows.push({
        excelRow: excelRowNumber,
        registrationNumber: rawRegNo,
        studentName: rawName,
        attendanceRaw: rawAtt,
      });
    }

    if (parsedRows.length === 0) {
      throw new Error('The uploaded Excel file contains no student data rows below the header.');
    }

    return parsedRows;
  }

  /**
   * Complete All-or-Nothing Validation against Student Master and Academic criteria
   */
  static async validateUpload({
    fileData,
    facultyId,
    departmentId,
    section,
    year,
    semester,
    courseId,
    date,
    period,
    userId,
    userRole,
  }) {
    // 1. Basic Academic Field Validation
    if (!departmentId || !section || !year || !semester || !courseId || !date || !period) {
      throw new Error('All academic fields (Department, Section, Year, Semester, Subject, Date, Period) are required.');
    }

    const cleanSection = section.toString().trim().toUpperCase();
    const cleanYear = parseInt(year, 10);
    const cleanSemester = parseInt(semester, 10);
    const cleanPeriod = parseInt(period, 10);

    if (isNaN(cleanPeriod) || cleanPeriod < 1 || cleanPeriod > 8) {
      throw new Error('Period must be a valid period number between 1 and 8.');
    }

    if (isNaN(cleanYear) || cleanYear < 1 || cleanYear > 4) {
      throw new Error('Year must be between 1 and 4.');
    }

    if (isNaN(cleanSemester) || cleanSemester < 1 || cleanSemester > 8) {
      throw new Error('Semester must be between 1 and 8.');
    }

    const attendanceDate = new Date(typeof date === 'string' ? `${date.split('T')[0]}T00:00:00.000Z` : date);
    if (isNaN(attendanceDate.getTime())) {
      throw new Error('Invalid attendance date provided.');
    }

    // 2. Validate Subject & Backend Authorization
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { department: true },
    });

    if (!course) {
      throw new Error('Selected subject does not exist in the database.');
    }

    if (course.departmentId !== departmentId) {
      throw new Error('Selected subject does not belong to the selected Department.');
    }

    // Verify faculty assignment
    const assignment = await prisma.facultySubjectAssignment.findFirst({
      where: {
        facultyId,
        courseId,
        section: cleanSection,
        status: 'ACTIVE',
        faculty: { deletedAt: null, status: 'ACTIVE' },
      },
    });

    if (!assignment) {
      throw new Error('Forbidden: You are not authorized to manage or upload attendance for this subject and section.');
    }

    // 3. Prevent duplicate whole-session attendance
    const existingSession = await prisma.attendance.findFirst({
      where: {
        courseId,
        section: cleanSection,
        period: cleanPeriod,
        date: attendanceDate,
      },
    });

    if (existingSession) {
      const errorMsg = `Attendance already exists for ${course.courseCode}, Section ${cleanSection}, Period ${cleanPeriod} on ${attendanceDate.toISOString().split('T')[0]}. Duplicate attendance sessions cannot be uploaded.`;
      
      // Log rejection to SystemAuditLog
      await this.logAudit({
        actorId: userId,
        actorRole: userRole,
        action: 'UPLOAD_ATTENDANCE_REJECTED',
        targetId: courseId,
        targetName: course.courseCode,
        departmentId,
        details: {
          facultyId,
          section: cleanSection,
          courseCode: course.courseCode,
          date: attendanceDate.toISOString().split('T')[0],
          period: cleanPeriod,
          reason: errorMsg,
        },
      });

      return {
        isValid: false,
        isSessionDuplicate: true,
        totalRecords: 0,
        validCount: 0,
        invalidCount: 1,
        message: errorMsg,
        errors: [
          {
            excelRow: '-',
            registrationNumber: 'SESSION_CONFLICT',
            studentName: '-',
            error: errorMsg,
          },
        ],
      };
    }

    // 4. Parse Excel Data
    let buffer;
    if (Buffer.isBuffer(fileData)) {
      buffer = fileData;
    } else if (typeof fileData === 'string') {
      const base64Index = fileData.indexOf(';base64,');
      const cleanBase64 = base64Index !== -1 ? fileData.slice(base64Index + 8) : fileData;
      buffer = Buffer.from(cleanBase64, 'base64');
    } else {
      throw new Error('Invalid Excel file data provided.');
    }

    const rows = this.parseExcelBuffer(buffer);

    // 5. Query Student Master in batch for all registration numbers in Excel
    const regNosInExcel = rows
      .map((r) => (r.registrationNumber || '').trim().toUpperCase())
      .filter((r) => r.length > 0);

    const masterStudents = await prisma.student.findMany({
      where: {
        registrationNumber: { in: regNosInExcel },
      },
      include: {
        department: true,
      },
    });

    const masterByReg = new Map();
    masterStudents.forEach((s) => {
      masterByReg.set(s.registrationNumber.toUpperCase(), s);
    });

    // Also fetch any existing individual attendance records for this date/period/course to prevent duplicate student records
    const studentIds = masterStudents.map((s) => s.id);
    const existingStudentAttendances = await prisma.attendance.findMany({
      where: {
        courseId,
        date: attendanceDate,
        period: cleanPeriod,
        studentId: { in: studentIds },
      },
      select: { studentId: true },
    });
    const existingAttendanceStudentIds = new Set(existingStudentAttendances.map((a) => a.studentId));

    // 6. Strict All-or-Nothing Row-by-Row Validation
    const issues = [];
    const validRows = [];
    const seenRegNos = new Set();

    for (const item of rows) {
      const { excelRow, registrationNumber: rawReg, studentName: rawName, attendanceRaw } = item;
      const cleanReg = (rawReg || '').trim().toUpperCase();

      // Rule 10: No required field is empty
      if (!cleanReg) {
        issues.push({
          excelRow,
          registrationNumber: 'EMPTY',
          studentName: rawName || 'N/A',
          error: 'Registration Number is required and cannot be empty.',
        });
        continue;
      }

      if (!rawName || rawName.trim() === '') {
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: 'EMPTY',
          error: 'Student Name is required and cannot be empty.',
        });
        continue;
      }

      if (!attendanceRaw || attendanceRaw.trim() === '') {
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: rawName,
          error: 'Attendance value is required and cannot be empty (must be Present or Absent).',
        });
        continue;
      }

      // Rule 9: No duplicate Registration Numbers exist in the Excel
      if (seenRegNos.has(cleanReg)) {
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: rawName,
          error: `Duplicate Registration Number in Excel file: "${cleanReg}". Each student must appear only once.`,
        });
        continue;
      }
      seenRegNos.add(cleanReg);

      // Rule 7 & 8: Attendance value must only be 'Present' or 'Absent'
      const parsedStatus = parseAttendanceStatus(attendanceRaw);
      if (!parsedStatus) {
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: rawName,
          error: `Invalid attendance value "${attendanceRaw}". Must strictly be "Present" or "Absent".`,
        });
        continue;
      }

      // Rule 1: Registration Number exists in the database
      const student = masterByReg.get(cleanReg);
      if (!student) {
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: rawName,
          error: `Student not found in Student Master database.`,
        });
        continue;
      }

      // Check active status
      if (student.status !== 'ACTIVE' || student.deletedAt !== null) {
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: rawName,
          error: `Student account is deactivated or archived in Student Master.`,
        });
        continue;
      }

      // Rule 2: Student exists in the selected section
      if (student.section.toUpperCase() !== cleanSection) {
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: rawName,
          error: `Section mismatch: Student belongs to Section "${student.section}", but selected section is "${cleanSection}".`,
        });
        continue;
      }

      // Rule 3: Student belongs to the selected Department
      if (student.departmentId !== departmentId) {
        const studentDept = student.department?.name || student.departmentId;
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: rawName,
          error: `Department mismatch: Student belongs to "${studentDept}", not selected Department.`,
        });
        continue;
      }

      // Rule 4: Student belongs to the selected Year
      if (student.year !== cleanYear) {
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: rawName,
          error: `Year mismatch: Student belongs to Year ${student.year}, not selected Year ${cleanYear}.`,
        });
        continue;
      }

      // Rule 5: Student belongs to the selected Semester
      // In academic calendar: Year 1 = Sem 1, 2; Year 2 = Sem 3, 4; Year 3 = Sem 5, 6; Year 4 = Sem 7, 8
      const expectedSemesters = [student.year * 2 - 1, student.year * 2];
      if (!expectedSemesters.includes(cleanSemester)) {
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: rawName,
          error: `Semester mismatch: Student is in Year ${student.year} (Semesters ${expectedSemesters.join(' & ')}), which does not match selected Semester ${cleanSemester}.`,
        });
        continue;
      }

      // Rule 6: Student Name matches the saved student record
      const normalizedExcelName = normalizeStr(rawName);
      const normalizedDbName = normalizeStr(student.name);
      if (normalizedExcelName !== normalizedDbName) {
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: rawName,
          error: `Student name does not match Student Master record. Excel: "${rawName}", Saved: "${student.name}".`,
        });
        continue;
      }

      // Rule 15: Prevent duplicate attendance records for the same student, date, period, subject
      if (existingAttendanceStudentIds.has(student.id)) {
        issues.push({
          excelRow,
          registrationNumber: cleanReg,
          studentName: rawName,
          error: `Attendance already exists for this student for the selected date, period and subject.`,
        });
        continue;
      }

      validRows.push({
        excelRow,
        studentId: student.id,
        registrationNumber: student.registrationNumber,
        studentName: student.name,
        section: student.section,
        department: student.department?.name || student.department?.code,
        status: parsedStatus,
      });
    }

    const totalSubmitted = rows.length;
    const isSuccess = issues.length === 0;

    // 7. Audit Logging for Validation Step
    await this.logAudit({
      actorId: userId,
      actorRole: userRole,
      action: isSuccess ? 'UPLOAD_ATTENDANCE_VALIDATED' : 'UPLOAD_ATTENDANCE_VALIDATION_REJECTED',
      targetId: courseId,
      targetName: course.courseCode,
      departmentId,
      details: {
        facultyId,
        section: cleanSection,
        courseCode: course.courseCode,
        courseName: course.courseName,
        date: attendanceDate.toISOString().split('T')[0],
        period: cleanPeriod,
        totalChecked: totalSubmitted,
        validCount: validRows.length,
        invalidCount: issues.length,
        status: isSuccess ? 'VALIDATION_PASSED' : 'REJECTED',
        errorsSummary: issues.slice(0, 10).map((e) => `Row ${e.excelRow}: ${e.error}`),
      },
    });

    if (!isSuccess) {
      return {
        isValid: false,
        totalRecords: totalSubmitted,
        validCount: validRows.length,
        invalidCount: issues.length,
        message: `Attendance Upload Rejected: ${issues.length} invalid record(s) detected out of ${totalSubmitted} total rows. Under the All-or-Nothing policy, no attendance has been saved.`,
        errors: issues,
      };
    }

    const presentCount = validRows.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absentCount = validRows.filter((r) => r.status === AttendanceStatus.ABSENT).length;

    return {
      isValid: true,
      totalRecords: totalSubmitted,
      validCount: validRows.length,
      invalidCount: 0,
      presentCount,
      absentCount,
      message: `Validation Successful: ${validRows.length}/${totalSubmitted} student records matched successfully. Attendance is ready to be imported.`,
      preview: validRows,
      academicSummary: {
        departmentName: course.department?.name,
        courseCode: course.courseCode,
        courseName: course.courseName,
        section: cleanSection,
        year: cleanYear,
        semester: cleanSemester,
        date: attendanceDate.toISOString().split('T')[0],
        period: cleanPeriod,
      },
    };
  }

  /**
   * Atomic Import: Commits validated attendance list to database in a single transaction.
   * If any error occurs, rolls back transaction completely.
   */
  static async commitImport({
    facultyId,
    departmentId,
    section,
    year,
    semester,
    courseId,
    date,
    period,
    validatedRecords,
    userId,
    userRole,
  }) {
    if (!Array.isArray(validatedRecords) || validatedRecords.length === 0) {
      throw new Error('No validated attendance records provided for import.');
    }

    const cleanSection = section.toString().trim().toUpperCase();
    const cleanPeriod = parseInt(period, 10);
    const attendanceDate = new Date(typeof date === 'string' ? `${date.split('T')[0]}T00:00:00.000Z` : date);

    // Verify course & assignment
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { department: true },
    });
    if (!course) {
      throw new Error('Invalid subject ID.');
    }

    const assignment = await prisma.facultySubjectAssignment.findFirst({
      where: {
        facultyId,
        courseId,
        section: cleanSection,
        status: 'ACTIVE',
        faculty: { deletedAt: null, status: 'ACTIVE' },
      },
    });
    if (!assignment) {
      throw new Error('Forbidden: You are not authorized to import attendance for this class.');
    }

    let presentCount = 0;
    let absentCount = 0;

    // Atomic PostgreSQL Transaction
    try {
      await prisma.$transaction(async (tx) => {
        // Double check for duplicate session inside transaction
        const existingSession = await tx.attendance.findFirst({
          where: {
            courseId,
            section: cleanSection,
            period: cleanPeriod,
            date: attendanceDate,
          },
        });

        if (existingSession) {
          throw new Error(
            `Attendance has already been recorded for ${course.courseCode} Section ${cleanSection}, Period ${cleanPeriod} on ${attendanceDate.toISOString().split('T')[0]}. Import aborted.`
          );
        }

        // Insert all attendance records
        for (const item of validatedRecords) {
          const status = item.status === 'ABSENT' ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
          if (status === AttendanceStatus.PRESENT) presentCount++;
          else absentCount++;

          await tx.attendance.create({
            data: {
              studentId: item.studentId,
              courseId,
              facultyId,
              section: cleanSection,
              period: cleanPeriod,
              semester: parseInt(semester, 10),
              date: attendanceDate,
              status,
            },
          });
        }

        // Create Faculty Notification
        await tx.notification.create({
          data: {
            staffId: facultyId,
            title: 'Attendance Excel Upload Successful',
            message: `Excel attendance imported for ${course.courseCode} (${cleanSection}), Period ${cleanPeriod} on ${attendanceDate.toISOString().split('T')[0]}. Total: ${validatedRecords.length} (Present: ${presentCount}, Absent: ${absentCount}).`,
            type: NotificationType.SYSTEM,
          },
        });
      });
    } catch (txError) {
      console.error('Attendance Upload Transaction Error:', txError);

      // Audit Log failure
      await this.logAudit({
        actorId: userId,
        actorRole: userRole,
        action: 'UPLOAD_ATTENDANCE_IMPORT_FAILED',
        targetId: courseId,
        targetName: course.courseCode,
        departmentId,
        details: {
          facultyId,
          section: cleanSection,
          courseCode: course.courseCode,
          date: attendanceDate.toISOString().split('T')[0],
          period: cleanPeriod,
          error: txError.message,
        },
      });

      throw new Error(`Database transaction failed: ${txError.message}`);
    }

    // Record Audit Log for successful atomic import
    await this.logAudit({
      actorId: userId,
      actorRole: userRole,
      action: 'UPLOAD_ATTENDANCE_SUCCESS',
      targetId: courseId,
      targetName: course.courseCode,
      departmentId,
      details: {
        facultyId,
        section: cleanSection,
        courseCode: course.courseCode,
        courseName: course.courseName,
        date: attendanceDate.toISOString().split('T')[0],
        period: cleanPeriod,
        totalImported: validatedRecords.length,
        presentCount,
        absentCount,
        status: 'SUCCESS',
      },
    });

    // Ingest session into Attendance Analysis Agent Service to update all analytics,
    // trajectories, risk flags, and agent query tables
    try {
      await AttendanceAnalysisAgentService.ingestAndAnalyzeSession({
        courseId,
        section: cleanSection,
        period: cleanPeriod,
        date: attendanceDate,
        attendanceList: validatedRecords.map((r) => ({
          studentId: r.studentId,
          status: r.status,
        })),
        facultyId,
      });
    } catch (agentErr) {
      console.warn('AttendanceAnalysisAgentService background sync warning:', agentErr.message);
    }

    return {
      success: true,
      message: `Attendance Uploaded Successfully`,
      totalStudents: validatedRecords.length,
      presentCount,
      absentCount,
      academicDetails: {
        date: attendanceDate.toISOString().split('T')[0],
        period: cleanPeriod,
        courseCode: course.courseCode,
        courseName: course.courseName,
        section: cleanSection,
        departmentName: course.department?.name,
      },
    };
  }

  /**
   * Helper to write audit events safely to SystemAuditLog
   */
  static async logAudit({ actorId, actorRole, action, targetId, targetName, departmentId, details }) {
    try {
      await prisma.systemAuditLog.create({
        data: {
          actorId: actorId || 'SYSTEM',
          actorRole: actorRole || 'STAFF',
          action,
          targetType: 'ATTENDANCE_UPLOAD',
          targetId: targetId || 'GENERAL',
          targetName: targetName || null,
          departmentId: departmentId || null,
          details: typeof details === 'string' ? details : JSON.stringify(details),
        },
      });
    } catch (err) {
      console.error('SystemAuditLog creation warning:', err.message);
    }
  }
}

module.exports = AttendanceUploadService;
