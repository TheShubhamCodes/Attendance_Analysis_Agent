-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'PARENT', 'STAFF', 'HOD', 'ADMIN', 'MENTOR');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'DEAN', 'HOD', 'MENTOR', 'FACULTY', 'EXAM_SECTION');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'ON_DUTY', 'EXCUSED');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('INTERNAL_1', 'INTERNAL_2', 'ASSIGNMENT', 'MID_TERM', 'SEMESTER_EXAM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ATTENDANCE_WARNING', 'PERFORMANCE_WARNING', 'MENTOR_MESSAGE', 'INTERVENTION_UPDATE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "InterventionType" AS ENUM ('ATTENDANCE_COUNSELLING', 'ACADEMIC_SUPPORT', 'PARENT_MEETING', 'BEHAVIORAL', 'COUNSELLING', 'MENTOR_MEETING', 'PARENT_COMMUNICATION', 'WARNING', 'FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PLANNED', 'FOLLOW_UP_REQUIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('PENDING', 'APPROVED', 'RESCHEDULED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OdLeaveType" AS ENUM ('ON_DUTY', 'APPROVED_LEAVE');

-- CreateEnum
CREATE TYPE "OdLeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "mobileNumber" TEXT,
    "personalEmail" TEXT,
    "mentorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "linkedStudentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNumber" TEXT,
    "departmentId" TEXT NOT NULL,
    "staffRole" "StaffRole" NOT NULL DEFAULT 'FACULTY',
    "designation" TEXT NOT NULL DEFAULT 'Associate Professor',
    "cabinLocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "facultyId" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 3,
    "year" INTEGER NOT NULL DEFAULT 1,
    "semester" INTEGER NOT NULL DEFAULT 5,
    "academicYear" TEXT NOT NULL DEFAULT '2026-2027',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacultySubjectAssignment" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "semester" INTEGER NOT NULL DEFAULT 5,
    "academicYear" TEXT NOT NULL DEFAULT '2026-2027',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacultySubjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounselorAssignment" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2026-2027',
    "semester" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounselorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "facultyId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "period" INTEGER NOT NULL DEFAULT 1,
    "periodId" TEXT,
    "classStartTime" TEXT,
    "classEndTime" TEXT,
    "attendanceSubmittedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "subjectType" TEXT,
    "day" TEXT,
    "semester" INTEGER DEFAULT 5,
    "section" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timetable" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "semester" INTEGER NOT NULL DEFAULT 5,
    "academicYear" TEXT NOT NULL DEFAULT '2026-2027',
    "dayOfWeek" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "periodId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "courseId" TEXT,
    "subjectCode" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL DEFAULT 'Lecture',
    "room" TEXT,
    "batch" TEXT,
    "facultyId" TEXT,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableFacultyAssignment" (
    "id" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimetableFacultyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceAuditLog" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "oldStatus" "AttendanceStatus" NOT NULL,
    "newStatus" "AttendanceStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCorrectionRequest" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "oldStatus" "AttendanceStatus" NOT NULL,
    "requestedStatus" "AttendanceStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AttendanceCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacultyOtpVerification" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'EDIT_ATTENDANCE',
    "targetData" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacultyOtpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Performance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "assessmentType" "AssessmentType" NOT NULL,
    "marks" DOUBLE PRECISION NOT NULL,
    "maximumMarks" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "staffId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "type" "InterventionType" NOT NULL,
    "description" TEXT NOT NULL,
    "actionTaken" TEXT,
    "outcome" TEXT,
    "attendanceBefore" DOUBLE PRECISION,
    "attendanceAfter" DOUBLE PRECISION,
    "improvement" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "InterventionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorMeetingRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorMeetingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT,
    "departmentId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2026-2027',
    "capacity" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HodHistory" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "assignedById" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HodHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentStudentLink" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'PARENT',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OdLeaveRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestType" "OdLeaveType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "startPeriod" INTEGER NOT NULL DEFAULT 1,
    "endPeriod" INTEGER NOT NULL DEFAULT 1,
    "periods" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "courseId" TEXT,
    "reason" TEXT NOT NULL,
    "eventName" TEXT,
    "description" TEXT,
    "documentUrl" TEXT,
    "status" "OdLeaveStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedByRole" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OdLeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorStudentAssignment" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorStudentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_identifier_idx" ON "User"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "User_identifier_role_key" ON "User"("identifier", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_registrationNumber_key" ON "Student"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_registrationNumber_idx" ON "Student"("registrationNumber");

-- CreateIndex
CREATE INDEX "Student_departmentId_idx" ON "Student"("departmentId");

-- CreateIndex
CREATE INDEX "Student_section_idx" ON "Student"("section");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_linkedStudentId_key" ON "Parent"("linkedStudentId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_employeeId_key" ON "Staff"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE INDEX "Staff_employeeId_idx" ON "Staff"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_courseCode_key" ON "Course"("courseCode");

-- CreateIndex
CREATE INDEX "FacultySubjectAssignment_facultyId_idx" ON "FacultySubjectAssignment"("facultyId");

-- CreateIndex
CREATE INDEX "FacultySubjectAssignment_courseId_section_idx" ON "FacultySubjectAssignment"("courseId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "FacultySubjectAssignment_facultyId_courseId_section_academi_key" ON "FacultySubjectAssignment"("facultyId", "courseId", "section", "academicYear", "semester");

-- CreateIndex
CREATE INDEX "CounselorAssignment_facultyId_idx" ON "CounselorAssignment"("facultyId");

-- CreateIndex
CREATE INDEX "CounselorAssignment_studentId_idx" ON "CounselorAssignment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CounselorAssignment_facultyId_studentId_academicYear_semest_key" ON "CounselorAssignment"("facultyId", "studentId", "academicYear", "semester");

-- CreateIndex
CREATE INDEX "Attendance_studentId_date_idx" ON "Attendance"("studentId", "date");

-- CreateIndex
CREATE INDEX "Attendance_studentId_courseId_idx" ON "Attendance"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "Attendance_courseId_section_date_period_idx" ON "Attendance"("courseId", "section", "date", "period");

-- CreateIndex
CREATE INDEX "Attendance_facultyId_idx" ON "Attendance"("facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_courseId_date_period_key" ON "Attendance"("studentId", "courseId", "date", "period");

-- CreateIndex
CREATE INDEX "Timetable_section_dayOfWeek_idx" ON "Timetable"("section", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Timetable_facultyId_idx" ON "Timetable"("facultyId");

-- CreateIndex
CREATE INDEX "Timetable_courseId_idx" ON "Timetable"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Timetable_section_semester_academicYear_dayOfWeek_periodNum_key" ON "Timetable"("section", "semester", "academicYear", "dayOfWeek", "periodNumber");

-- CreateIndex
CREATE INDEX "TimetableFacultyAssignment_timetableId_idx" ON "TimetableFacultyAssignment"("timetableId");

-- CreateIndex
CREATE INDEX "TimetableFacultyAssignment_facultyId_idx" ON "TimetableFacultyAssignment"("facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableFacultyAssignment_timetableId_facultyId_key" ON "TimetableFacultyAssignment"("timetableId", "facultyId");

-- CreateIndex
CREATE INDEX "AttendanceAuditLog_attendanceId_idx" ON "AttendanceAuditLog"("attendanceId");

-- CreateIndex
CREATE INDEX "AttendanceAuditLog_facultyId_idx" ON "AttendanceAuditLog"("facultyId");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionRequest_facultyId_idx" ON "AttendanceCorrectionRequest"("facultyId");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionRequest_attendanceId_idx" ON "AttendanceCorrectionRequest"("attendanceId");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionRequest_studentId_idx" ON "AttendanceCorrectionRequest"("studentId");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionRequest_status_idx" ON "AttendanceCorrectionRequest"("status");

-- CreateIndex
CREATE INDEX "FacultyOtpVerification_facultyId_action_idx" ON "FacultyOtpVerification"("facultyId", "action");

-- CreateIndex
CREATE INDEX "Performance_studentId_courseId_idx" ON "Performance"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "Notification_studentId_isRead_idx" ON "Notification"("studentId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_staffId_isRead_idx" ON "Notification"("staffId", "isRead");

-- CreateIndex
CREATE INDEX "Intervention_studentId_idx" ON "Intervention"("studentId");

-- CreateIndex
CREATE INDEX "Intervention_mentorId_idx" ON "Intervention"("mentorId");

-- CreateIndex
CREATE INDEX "MentorMeetingRequest_studentId_idx" ON "MentorMeetingRequest"("studentId");

-- CreateIndex
CREATE INDEX "MentorMeetingRequest_mentorId_idx" ON "MentorMeetingRequest"("mentorId");

-- CreateIndex
CREATE INDEX "SystemAuditLog_actorId_idx" ON "SystemAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "SystemAuditLog_departmentId_idx" ON "SystemAuditLog"("departmentId");

-- CreateIndex
CREATE INDEX "SystemAuditLog_targetType_targetId_idx" ON "SystemAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Section_departmentId_year_semester_idx" ON "Section"("departmentId", "year", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "Section_departmentId_year_semester_name_academicYear_key" ON "Section"("departmentId", "year", "semester", "name", "academicYear");

-- CreateIndex
CREATE INDEX "HodHistory_departmentId_idx" ON "HodHistory"("departmentId");

-- CreateIndex
CREATE INDEX "HodHistory_facultyId_idx" ON "HodHistory"("facultyId");

-- CreateIndex
CREATE INDEX "ParentStudentLink_parentId_idx" ON "ParentStudentLink"("parentId");

-- CreateIndex
CREATE INDEX "ParentStudentLink_studentId_idx" ON "ParentStudentLink"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudentLink_parentId_studentId_key" ON "ParentStudentLink"("parentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "OdLeaveRequest_studentId_date_idx" ON "OdLeaveRequest"("studentId", "date");

-- CreateIndex
CREATE INDEX "OdLeaveRequest_status_idx" ON "OdLeaveRequest"("status");

-- CreateIndex
CREATE INDEX "OdLeaveRequest_requestType_idx" ON "OdLeaveRequest"("requestType");

-- CreateIndex
CREATE INDEX "MentorStudentAssignment_mentorId_idx" ON "MentorStudentAssignment"("mentorId");

-- CreateIndex
CREATE INDEX "MentorStudentAssignment_studentId_idx" ON "MentorStudentAssignment"("studentId");

-- CreateIndex
CREATE INDEX "MentorStudentAssignment_active_idx" ON "MentorStudentAssignment"("active");

-- CreateIndex
CREATE UNIQUE INDEX "MentorStudentAssignment_mentorId_studentId_key" ON "MentorStudentAssignment"("mentorId", "studentId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_linkedStudentId_fkey" FOREIGN KEY ("linkedStudentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultySubjectAssignment" ADD CONSTRAINT "FacultySubjectAssignment_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultySubjectAssignment" ADD CONSTRAINT "FacultySubjectAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselorAssignment" ADD CONSTRAINT "CounselorAssignment_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselorAssignment" ADD CONSTRAINT "CounselorAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableFacultyAssignment" ADD CONSTRAINT "TimetableFacultyAssignment_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableFacultyAssignment" ADD CONSTRAINT "TimetableFacultyAssignment_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAuditLog" ADD CONSTRAINT "AttendanceAuditLog_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAuditLog" ADD CONSTRAINT "AttendanceAuditLog_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyOtpVerification" ADD CONSTRAINT "FacultyOtpVerification_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMeetingRequest" ADD CONSTRAINT "MentorMeetingRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMeetingRequest" ADD CONSTRAINT "MentorMeetingRequest_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HodHistory" ADD CONSTRAINT "HodHistory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HodHistory" ADD CONSTRAINT "HodHistory_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdLeaveRequest" ADD CONSTRAINT "OdLeaveRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdLeaveRequest" ADD CONSTRAINT "OdLeaveRequest_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorStudentAssignment" ADD CONSTRAINT "MentorStudentAssignment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorStudentAssignment" ADD CONSTRAINT "MentorStudentAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

