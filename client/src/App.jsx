import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Layouts
import StudentLayout from './components/layout/StudentLayout';
import FacultyLayout from './components/layout/FacultyLayout';
import HodLayout from './components/layout/HodLayout';
import ParentLayout from './components/layout/ParentLayout';
import AdminLayout from './components/layout/AdminLayout';
import MentorLayout from './components/layout/MentorLayout';

// Shared Settings & Timetable Pages
import SettingsPage from './pages/common/SettingsPage';
import TimetablePage from './pages/common/TimetablePage';
import ChatboxPage from './pages/common/ChatboxPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminHodPage from './pages/admin/AdminHodPage';
import AdminFacultyPage from './pages/admin/AdminFacultyPage';
import AdminStudentsPage from './pages/admin/AdminStudentsPage';
import AdminParentsPage from './pages/admin/AdminParentsPage';
import AdminAcademicsPage from './pages/admin/AdminAcademicsPage';
import AdminAttendancePage from './pages/admin/AdminAttendancePage';
import AdminTimetablePage from './pages/admin/AdminTimetablePage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminOdLeavePage from './pages/admin/AdminOdLeavePage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import StudentSignupPage from './pages/auth/StudentSignupPage';

// Student Pages
import DashboardPage from './pages/student/DashboardPage';
import AttendancePage from './pages/student/AttendancePage';
import AttendanceCalendarPage from './pages/student/AttendanceCalendarPage';
import AttendancePredictorPage from './pages/student/AttendancePredictorPage';
import PerformancePage from './pages/student/PerformancePage';
import RiskAnalysisPage from './pages/student/RiskAnalysisPage';
import NotificationsPage from './pages/student/NotificationsPage';
import MentorPage from './pages/student/MentorPage';
import InterventionsPage from './pages/student/InterventionsPage';
import ProfilePage from './pages/student/ProfilePage';
import StudentOdLeavePage from './pages/student/StudentOdLeavePage';

// Faculty Pages
import FacultyDashboardPage from './pages/faculty/FacultyDashboardPage';
import MyClassesPage from './pages/faculty/MyClassesPage';
import MarkAttendancePage from './pages/faculty/MarkAttendancePage';
import UploadAttendancePage from './pages/faculty/UploadAttendancePage';
import EditAttendancePage from './pages/faculty/EditAttendancePage';
import AttendanceHistoryPage from './pages/faculty/AttendanceHistoryPage';
import FacultyAtRiskPage from './pages/faculty/FacultyAtRiskPage';
import FacultyPredictorPage from './pages/faculty/FacultyPredictorPage';
import FacultyInterventionsPage from './pages/faculty/FacultyInterventionsPage';
import FacultyNotificationsPage from './pages/faculty/FacultyNotificationsPage';
import FacultyReportsPage from './pages/faculty/FacultyReportsPage';
import FacultyStudentSearchPage from './pages/faculty/FacultyStudentSearchPage';
import FacultyProfilePage from './pages/faculty/FacultyProfilePage';
import FacultyOdLeavePage from './pages/faculty/FacultyOdLeavePage';

// HOD Pages
import HodDashboardPage from './pages/hod/HodDashboardPage';
import FacultyManagementPage from './pages/hod/FacultyManagementPage';
import StudentManagementPage from './pages/hod/StudentManagementPage';
import AttendanceMonitoringPage from './pages/hod/AttendanceMonitoringPage';
import AttendanceCorrectionsPage from './pages/hod/AttendanceCorrectionsPage';
import CounselingPage from './pages/hod/CounselingPage';
import HodReportsPage from './pages/hod/HodReportsPage';
import HodNotificationsPage from './pages/hod/HodNotificationsPage';
import HodProfilePage from './pages/hod/HodProfilePage';
import DeletedRecordsPage from './pages/hod/DeletedRecordsPage';
import HodOdLeavePage from './pages/hod/HodOdLeavePage';

// Parent Pages
import ParentDashboardPage from './pages/parent/ParentDashboardPage';
import ParentProfilePage from './pages/parent/ParentProfilePage';

// Mentor Pages
import MentorDashboardPage from './pages/mentor/MentorDashboardPage';
import MentorStudentsPage from './pages/mentor/MentorStudentsPage';
import MentorStudentDetailsPage from './pages/mentor/MentorStudentDetailsPage';
import MentorAtRiskPage from './pages/mentor/MentorAtRiskPage';
import MentorInterventionsPage from './pages/mentor/MentorInterventionsPage';
import MentorReportsPage from './pages/mentor/MentorReportsPage';
import MentorProfilePage from './pages/mentor/MentorProfilePage';

// Root redirect handler
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user && user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (user && user.role === 'STUDENT') {
    return <Navigate to="/student/dashboard" replace />;
  }
  if (user && user.role === 'MENTOR') {
    return <Navigate to="/mentor/dashboard" replace />;
  }
  if (user && (user.role === 'STAFF' || user.role === 'FACULTY')) {
    return <Navigate to="/faculty/dashboard" replace />;
  }
  if (user && user.role === 'HOD') {
    return <Navigate to="/hod/dashboard" replace />;
  }
  if (user && user.role === 'PARENT') {
    return <Navigate to="/parent/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/student/signup" element={<StudentSignupPage />} />

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="hod" element={<AdminHodPage />} />
                <Route path="faculty" element={<AdminFacultyPage />} />
                <Route path="students" element={<AdminStudentsPage />} />
                <Route path="parents" element={<AdminParentsPage />} />
                <Route path="academics" element={<AdminAcademicsPage />} />
                <Route path="attendance" element={<AdminAttendancePage />} />
                <Route path="od-leave" element={<AdminOdLeavePage />} />
                <Route path="timetable" element={<AdminTimetablePage />} />
                <Route path="agent" element={<ChatboxPage />} />
                <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
            </Route>

            {/* Protected Student Routes */}
            <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
              <Route path="/student" element={<StudentLayout />}>
                <Route index element={<Navigate to="/student/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="od-leave" element={<StudentOdLeavePage />} />
                <Route path="attendance-calendar" element={<AttendanceCalendarPage />} />
                <Route path="attendance-predictor" element={<AttendancePredictorPage />} />
                <Route path="performance" element={<PerformancePage />} />
                <Route path="risk-analysis" element={<RiskAnalysisPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="mentor" element={<MentorPage />} />
                <Route path="interventions" element={<InterventionsPage />} />
                <Route path="timetable" element={<TimetablePage />} />
                <Route path="agent" element={<ChatboxPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Protected Faculty Routes */}
            <Route element={<ProtectedRoute allowedRoles={['STAFF', 'FACULTY']} />}>
              <Route path="/faculty" element={<FacultyLayout />}>
                <Route index element={<Navigate to="/faculty/dashboard" replace />} />
                <Route path="dashboard" element={<FacultyDashboardPage />} />
                <Route path="classes" element={<MyClassesPage />} />
                <Route path="attendance/mark" element={<MarkAttendancePage />} />
                <Route path="attendance/upload" element={<UploadAttendancePage />} />
                <Route path="attendance/edit" element={<EditAttendancePage />} />
                <Route path="attendance/history" element={<AttendanceHistoryPage />} />
                <Route path="od-leave" element={<FacultyOdLeavePage />} />
                <Route path="at-risk-students" element={<FacultyAtRiskPage />} />
                <Route path="attendance-predictor" element={<FacultyPredictorPage />} />
                <Route path="interventions" element={<FacultyInterventionsPage />} />
                <Route path="notifications" element={<FacultyNotificationsPage />} />
                <Route path="reports" element={<FacultyReportsPage />} />
                <Route path="student-search" element={<FacultyStudentSearchPage />} />
                <Route path="timetable" element={<TimetablePage />} />
                <Route path="agent" element={<ChatboxPage />} />
                <Route path="profile" element={<FacultyProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Protected HOD Routes */}
            <Route element={<ProtectedRoute allowedRoles={['HOD']} />}>
              <Route path="/hod" element={<HodLayout />}>
                <Route index element={<Navigate to="/hod/dashboard" replace />} />
                <Route path="dashboard" element={<HodDashboardPage />} />

                {/* Faculty Group */}
                <Route path="faculty" element={<FacultyManagementPage />} />
                <Route path="faculty/assign" element={<FacultyManagementPage />} />
                <Route path="faculty/assignments" element={<FacultyManagementPage />} />

                {/* Students */}
                <Route path="students" element={<StudentManagementPage />} />

                {/* Attendance Group */}
                <Route path="attendance" element={<AttendanceMonitoringPage />} />
                <Route path="attendance/corrections" element={<AttendanceCorrectionsPage />} />
                <Route path="od-leave" element={<HodOdLeavePage />} />

                {/* Counseling Group */}
                <Route path="counseling" element={<CounselingPage />} />
                <Route path="counseling/at-risk" element={<CounselingPage />} />
                <Route path="counseling/interventions" element={<CounselingPage />} />

                {/* Reports */}
                <Route path="reports" element={<HodReportsPage />} />

                {/* Notifications */}
                <Route path="notifications" element={<HodNotificationsPage />} />

                {/* Profile, Settings & Timetable */}
                <Route path="timetable" element={<TimetablePage />} />
                <Route path="agent" element={<ChatboxPage />} />
                <Route path="profile" element={<HodProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />

                {/* Deleted Records Archive */}
                <Route path="deleted-records" element={<DeletedRecordsPage />} />
              </Route>
            </Route>

            {/* Protected Mentor Routes */}
            <Route element={<ProtectedRoute allowedRoles={['MENTOR']} />}>
              <Route path="/mentor" element={<MentorLayout />}>
                <Route index element={<Navigate to="/mentor/dashboard" replace />} />
                <Route path="dashboard" element={<MentorDashboardPage />} />
                <Route path="students" element={<MentorStudentsPage />} />
                <Route path="students/:studentId" element={<MentorStudentDetailsPage />} />
                <Route path="at-risk" element={<MentorAtRiskPage />} />
                <Route path="interventions" element={<MentorInterventionsPage />} />
                <Route path="reports" element={<MentorReportsPage />} />
                <Route path="timetable" element={<TimetablePage />} />
                <Route path="agent" element={<ChatboxPage />} />
                <Route path="profile" element={<MentorProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Protected Parent Routes */}
            <Route element={<ProtectedRoute allowedRoles={['PARENT']} />}>
              <Route path="/parent" element={<ParentLayout />}>
                <Route index element={<Navigate to="/parent/dashboard" replace />} />
                <Route path="dashboard" element={<ParentDashboardPage />} />
                <Route path="timetable" element={<TimetablePage />} />
                <Route path="agent" element={<ChatboxPage />} />
                <Route path="profile" element={<ParentProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Fallback 404 */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
