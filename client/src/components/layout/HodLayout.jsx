import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Layers,
  GraduationCap,
  ClipboardCheck,
  CheckSquare,
  History,
  HeartHandshake,
  AlertTriangle,
  FileSpreadsheet,
  Bell,
  UserCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Sliders,
  Calendar,
  Award,
} from 'lucide-react';
import ProfileDropdown from '../common/ProfileDropdown';
import FloatingChatWidget from '../common/FloatingChatWidget';

export const HodLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Grouped Collapsible Menus State
  const [facultyGroupOpen, setFacultyGroupOpen] = useState(
    location.pathname.startsWith('/hod/faculty')
  );
  const [attendanceGroupOpen, setAttendanceGroupOpen] = useState(
    location.pathname.startsWith('/hod/attendance')
  );
  const [counselingGroupOpen, setCounselingGroupOpen] = useState(
    location.pathname.startsWith('/hod/counseling')
  );

  useEffect(() => {
    // Keep groups open if user navigates into them
    if (location.pathname.startsWith('/hod/faculty')) setFacultyGroupOpen(true);
    if (location.pathname.startsWith('/hod/attendance')) setAttendanceGroupOpen(true);
    if (location.pathname.startsWith('/hod/counseling')) setCounselingGroupOpen(true);

    // Fetch unread notifications count
    const fetchUnread = async () => {
      try {
        const res = await api.get('/hod/notifications');
        if (res.data?.success) {
          setUnreadCount(res.data.data.unreadCount || 0);
        }
      } catch (err) {
        // Silently fail notification count fetch
      }
    };
    fetchUnread();
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClasses = (isActive) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
      isActive
        ? 'bg-blue-600 text-white font-semibold shadow-sm'
        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
    }`;

  const subNavLinkClasses = (isActive) =>
    `flex items-center space-x-2.5 pl-8 pr-3 py-2 rounded-lg text-xs font-medium transition-colors ${
      isActive
        ? 'bg-blue-600/25 text-blue-300 font-semibold border-l-2 border-blue-500'
        : 'text-slate-400 hover:bg-slate-900/70 hover:text-slate-200'
    }`;

  const deptName = user?.profile?.department || 'Department of Engineering';
  const deptCode = user?.profile?.departmentCode || 'DEPT';

  return (
    <div data-role="HOD" className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 bg-slate-950 text-slate-100 flex-col flex-shrink-0 border-r border-slate-800 shadow-xl">
        {/* University Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-900/80">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-600/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-black tracking-wider text-white leading-tight uppercase">
              HOD Portal
            </h1>
            <p className="text-[11px] text-blue-400 font-semibold tracking-wide uppercase truncate">
              {deptCode} Administration
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {/* 1. Dashboard */}
          <NavLink to="/hod/dashboard" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </NavLink>

          {/* AI Attendance Agent */}
          <NavLink to="/hod/agent" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-indigo-300">AI Attendance Agent</span>
            </div>
          </NavLink>

          {/* 2. Faculty (Collapsible Group) */}
          <div>
            <button
              type="button"
              onClick={() => setFacultyGroupOpen(!facultyGroupOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                location.pathname.startsWith('/hod/faculty')
                  ? 'bg-slate-900 text-blue-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4" />
                <span>Faculty</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  facultyGroupOpen ? 'rotate-180 text-blue-400' : 'text-slate-500'
                }`}
              />
            </button>

            {facultyGroupOpen && (
              <div className="mt-1 space-y-1">
                <NavLink to="/hod/faculty" end className={({ isActive }) => subNavLinkClasses(isActive)}>
                  <Users className="w-3.5 h-3.5" />
                  <span>Faculty List</span>
                </NavLink>

                <NavLink to="/hod/faculty/assign" className={({ isActive }) => subNavLinkClasses(isActive)}>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Assign Faculty</span>
                </NavLink>

                <NavLink to="/hod/faculty/assignments" className={({ isActive }) => subNavLinkClasses(isActive)}>
                  <Layers className="w-3.5 h-3.5" />
                  <span>Faculty Assignments</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* 3. Students */}
          <NavLink to="/hod/students" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <GraduationCap className="w-4 h-4" />
              <span>Students</span>
            </div>
          </NavLink>

          {/* 4. Attendance (Collapsible Group) */}
          <div>
            <button
              type="button"
              onClick={() => setAttendanceGroupOpen(!attendanceGroupOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                location.pathname.startsWith('/hod/attendance')
                  ? 'bg-slate-900 text-blue-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ClipboardCheck className="w-4 h-4" />
                <span>Attendance</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  attendanceGroupOpen ? 'rotate-180 text-blue-400' : 'text-slate-500'
                }`}
              />
            </button>

            {attendanceGroupOpen && (
              <div className="mt-1 space-y-1">
                <NavLink to="/hod/attendance" end className={({ isActive }) => subNavLinkClasses(isActive)}>
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Monitor Attendance</span>
                </NavLink>

                <NavLink to="/hod/attendance/corrections" className={({ isActive }) => subNavLinkClasses(isActive)}>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Attendance Corrections</span>
                </NavLink>

                <NavLink to="/hod/od-leave" className={({ isActive }) => subNavLinkClasses(isActive)}>
                  <Award className="w-3.5 h-3.5" />
                  <span>OD / Leave Requests</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* 5. Counseling (Collapsible Group) */}
          <div>
            <button
              type="button"
              onClick={() => setCounselingGroupOpen(!counselingGroupOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                location.pathname.startsWith('/hod/counseling')
                  ? 'bg-slate-900 text-blue-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <HeartHandshake className="w-4 h-4" />
                <span>Counseling</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  counselingGroupOpen ? 'rotate-180 text-blue-400' : 'text-slate-500'
                }`}
              />
            </button>

            {counselingGroupOpen && (
              <div className="mt-1 space-y-1">
                <NavLink to="/hod/counseling" end className={({ isActive }) => subNavLinkClasses(isActive)}>
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Counselor Management</span>
                </NavLink>

                <NavLink to="/hod/counseling/at-risk" className={({ isActive }) => subNavLinkClasses(isActive)}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>At-Risk Students</span>
                </NavLink>

                <NavLink to="/hod/counseling/interventions" className={({ isActive }) => subNavLinkClasses(isActive)}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Interventions</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* 6. Reports */}
          <NavLink to="/hod/reports" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Reports</span>
            </div>
          </NavLink>

          {/* Time Table */}
          <NavLink to="/hod/timetable" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-brand-400" />
              <span>Time Table</span>
            </div>
          </NavLink>

          {/* 7. Notifications */}
          <NavLink to="/hod/notifications" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </div>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </NavLink>

          {/* 8. HOD Profile */}
          <NavLink to="/hod/profile" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <UserCheck className="w-4 h-4" />
              <span>HOD Profile</span>
            </div>
          </NavLink>

          {/* Settings */}
          <NavLink to="/hod/settings" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Sliders className="w-4 h-4" />
              <span>Settings</span>
            </div>
          </NavLink>

          {/* 9. Deleted Records Archive */}
          <NavLink to="/hod/deleted-records" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Deleted Records</span>
            </div>
          </NavLink>
        </nav>

        {/* Sidebar Footer / HOD Identity */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {user?.profile?.name?.charAt(0) || 'H'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.profile?.name || user?.identifier}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.profile?.employeeId} • {deptCode}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            {/* Mobile Hamburger */}
            <div className="flex items-center space-x-3 md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-sm">{deptCode} HOD</span>
              </div>
            </div>

            {/* Department Context Badge */}
            <div className="hidden sm:flex items-center space-x-2.5">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                <Building2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
                {deptName} ({deptCode})
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Academic Year 2026-2027
              </span>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center space-x-3">
              {/* Notification Icon */}
              <NavLink
                to="/hod/notifications"
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </NavLink>

              {/* Profile Dropdown Corner */}
              <div className="hidden md:flex items-center pl-3 border-l border-slate-200 dark:border-slate-800">
                <ProfileDropdown profilePath="/hod/profile" settingsPath="/hod/settings" />
              </div>
            </div>
          </div>

          {/* Mobile Dropdown Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-slate-950 text-slate-200 border-b border-slate-800 px-4 py-3 space-y-1">
              <NavLink
                to="/hod/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/agent"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-blue-300">AI Attendance Agent</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/faculty"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4" />
                  <span>Faculty List</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/faculty/assign"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <UserPlus className="w-4 h-4" />
                  <span>Assign Faculty</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/students"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <GraduationCap className="w-4 h-4" />
                  <span>Students</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/attendance"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Monitor Attendance</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/attendance/corrections"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <CheckSquare className="w-4 h-4" />
                  <span>Attendance Corrections</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/od-leave"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <Award className="w-4 h-4 text-blue-400" />
                  <span>OD / Leave Requests</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/counseling"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <HeartHandshake className="w-4 h-4" />
                  <span>Counselor Management</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/counseling/at-risk"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-4 h-4" />
                  <span>At-Risk Students</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/reports"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Reports</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/timetable"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-brand-400" />
                  <span>Time Table</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <UserCheck className="w-4 h-4" />
                  <span>Profile</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <Sliders className="w-4 h-4" />
                  <span>Settings</span>
                </div>
              </NavLink>

              <NavLink
                to="/hod/deleted-records"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Deleted Records</span>
                </div>
              </NavLink>

              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-950/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </header>

        {/* Child Views */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        {/* Global Floating AI Agent Chat Widget */}
        <FloatingChatWidget />
      </div>
    </div>
  );
};

export default HodLayout;
