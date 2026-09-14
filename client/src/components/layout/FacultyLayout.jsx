import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Edit3,
  History,
  AlertTriangle,
  Calculator,
  ShieldCheck,
  Bell,
  FileSpreadsheet,
  Search,
  UserCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Layers,
  Sliders,
  Calendar,
  Sparkles,
  Award,
  Upload,
} from 'lucide-react';
import ProfileDropdown from '../common/ProfileDropdown';
import FloatingChatWidget from '../common/FloatingChatWidget';

export const FacultyLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [attendanceSubmenuOpen, setAttendanceSubmenuOpen] = useState(true);

  useEffect(() => {
    // Automatically keep attendance submenu open if on an attendance page
    if (location.pathname.startsWith('/faculty/attendance')) {
      setAttendanceSubmenuOpen(true);
    }

    // Fetch unread notifications count
    const fetchUnread = async () => {
      try {
        const res = await api.get('/faculty/notifications');
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
        ? 'bg-cyan-600 text-white font-semibold shadow-sm'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  const subNavLinkClasses = (isActive) =>
    `flex items-center space-x-2.5 pl-9 pr-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
      isActive
        ? 'bg-cyan-600/25 text-cyan-300 font-semibold border-l-2 border-cyan-500'
        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
    }`;

  return (
    <div data-role="FACULTY" className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 bg-slate-950 text-slate-100 flex-col flex-shrink-0 border-r border-slate-800 shadow-xl">
        {/* University Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-900/60">
          <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-bold shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-black tracking-wider text-white leading-tight uppercase">
              Academic Agent
            </h1>
            <p className="text-[11px] text-cyan-400 font-semibold tracking-wide uppercase truncate">
              Faculty / Staff ERP
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          <NavLink to="/faculty/dashboard" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </NavLink>

          {/* AI Attendance Agent */}
          <NavLink to="/faculty/agent" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-indigo-300">AI Attendance Agent</span>
            </div>
          </NavLink>

          {/* My Classes */}
          <NavLink to="/faculty/classes" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Layers className="w-4 h-4" />
              <span>My Classes</span>
            </div>
          </NavLink>

          {/* Time Table */}
          <NavLink to="/faculty/timetable" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-brand-400" />
              <span>Time Table</span>
            </div>
          </NavLink>

          {/* Attendance Management Collapsible Group */}
          <div>
            <button
              type="button"
              onClick={() => setAttendanceSubmenuOpen(!attendanceSubmenuOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                location.pathname.startsWith('/faculty/attendance')
                  ? 'bg-slate-900 text-blue-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ClipboardCheck className="w-4 h-4" />
                <span>Attendance</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  attendanceSubmenuOpen ? 'rotate-180 text-blue-400' : 'text-slate-500'
                }`}
              />
            </button>

            {attendanceSubmenuOpen && (
              <div className="mt-1 space-y-1">
                <NavLink
                  to="/faculty/attendance/mark"
                  className={({ isActive }) => subNavLinkClasses(isActive)}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Mark Attendance</span>
                </NavLink>

                <NavLink
                  to="/faculty/attendance/upload"
                  className={({ isActive }) => subNavLinkClasses(isActive)}
                >
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Upload Attendance</span>
                </NavLink>

                <NavLink
                  to="/faculty/attendance/edit"
                  className={({ isActive }) => subNavLinkClasses(isActive)}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit (OTP)</span>
                </NavLink>

                <NavLink
                  to="/faculty/attendance/history"
                  className={({ isActive }) => subNavLinkClasses(isActive)}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Attendance History</span>
                </NavLink>

                <NavLink
                  to="/faculty/od-leave"
                  className={({ isActive }) => subNavLinkClasses(isActive)}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>OD / Leave Requests</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* At-Risk Students */}
          <NavLink to="/faculty/at-risk-students" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>At-Risk Students</span>
            </div>
          </NavLink>

          {/* Attendance Predictor */}
          <NavLink to="/faculty/attendance-predictor" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Calculator className="w-4 h-4 text-indigo-400" />
              <span>Predictor Engine</span>
            </div>
          </NavLink>

          {/* Interventions */}
          <NavLink to="/faculty/interventions" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Interventions</span>
            </div>
          </NavLink>

          {/* Notifications */}
          <NavLink to="/faculty/notifications" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </div>
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </NavLink>

          {/* Reports */}
          <NavLink to="/faculty/reports" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Reports & Export</span>
            </div>
          </NavLink>

          {/* Student Profile Search */}
          <NavLink to="/faculty/student-search" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Search className="w-4 h-4" />
              <span>Student Profile</span>
            </div>
          </NavLink>

          {/* Faculty Profile */}
          <NavLink to="/faculty/profile" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <UserCheck className="w-4 h-4" />
              <span>Faculty Profile</span>
            </div>
          </NavLink>

          {/* Settings */}
          <NavLink to="/faculty/settings" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Sliders className="w-4 h-4" />
              <span>Settings</span>
            </div>
          </NavLink>
        </nav>

        {/* User Card & Logout at Sidebar Bottom */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-cyan-600 border border-cyan-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                {(user?.name || user?.identifier || 'F').slice(0, 2)}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.name || user?.identifier}
                </p>
                <p className="text-[10px] text-cyan-400 font-mono truncate">
                  {user?.profile?.employeeId || user?.identifier}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-slate-950 text-white px-4 py-3 flex items-center justify-between shadow-md border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white font-bold">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-tight block leading-none">ACADEMIC AGENT</span>
            <span className="text-[10px] text-cyan-400 font-semibold uppercase">Faculty Portal</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/faculty/notifications')}
            className="relative p-1.5 text-slate-300 hover:text-white"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 py-3 space-y-1">
          <NavLink
            to="/faculty/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/faculty/agent"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-cyan-300 font-semibold"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>AI Attendance Agent</span>
          </NavLink>
          <NavLink
            to="/faculty/classes"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <Layers className="w-4 h-4" />
            <span>My Classes</span>
          </NavLink>
          <NavLink
            to="/faculty/timetable"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <Calendar className="w-4 h-4 text-brand-400" />
            <span>Time Table</span>
          </NavLink>
          <NavLink
            to="/faculty/attendance/mark"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Mark Attendance</span>
          </NavLink>
          <NavLink
            to="/faculty/attendance/upload"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Upload Attendance</span>
          </NavLink>
          <NavLink
            to="/faculty/attendance/edit"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Attendance (OTP)</span>
          </NavLink>
          <NavLink
            to="/faculty/attendance/history"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <History className="w-4 h-4" />
            <span>Attendance History</span>
          </NavLink>
          <NavLink
            to="/faculty/od-leave"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <Award className="w-4 h-4 text-blue-400" />
            <span>OD / Leave Requests</span>
          </NavLink>
          <NavLink
            to="/faculty/at-risk-students"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>At-Risk Students</span>
          </NavLink>
          <NavLink
            to="/faculty/attendance-predictor"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <Calculator className="w-4 h-4 text-indigo-400" />
            <span>Predictor Engine</span>
          </NavLink>
          <NavLink
            to="/faculty/interventions"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Interventions</span>
          </NavLink>
          <NavLink
            to="/faculty/reports"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Reports</span>
          </NavLink>
          <NavLink
            to="/faculty/student-search"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <Search className="w-4 h-4" />
            <span>Student Search</span>
          </NavLink>
          <NavLink
            to="/faculty/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-200"
          >
            <UserCheck className="w-4 h-4" />
            <span>Faculty Profile</span>
          </NavLink>

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Faculty ID: {user?.profile?.employeeId || user?.identifier}</span>
            <button onClick={handleLogout} className="text-rose-400 flex items-center space-x-1 font-semibold">
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Desktop Bar */}
        <header className="hidden md:flex bg-white border-b border-slate-200 px-8 py-3.5 items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="font-semibold text-cyan-700 dark:text-cyan-400">Faculty & Staff Portal</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-800 dark:text-white">
              {location.pathname.includes('/attendance/mark')
                ? 'Mark Attendance'
                : location.pathname.includes('/attendance/edit')
                ? 'Edit Attendance (OTP)'
                : location.pathname.includes('/attendance/history')
                ? 'Attendance History'
                : location.pathname.includes('/od-leave')
                ? 'OD / Leave Requests'
                : location.pathname.includes('/classes')
                ? 'My Classes'
                : location.pathname.includes('/at-risk')
                ? 'At-Risk Students'
                : location.pathname.includes('/predictor')
                ? 'Attendance Predictor'
                : location.pathname.includes('/interventions')
                ? 'Interventions'
                : location.pathname.includes('/notifications')
                ? 'Notifications'
                : location.pathname.includes('/reports')
                ? 'Reports'
                : location.pathname.includes('/student-search')
                ? 'Student Profile Search'
                : location.pathname.includes('/profile')
                ? 'Faculty Profile'
                : 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center space-x-5">
            {/* Quick Action to Mark Attendance */}
            <button
              onClick={() => navigate('/faculty/attendance/mark')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Mark Attendance</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => navigate('/faculty/notifications')}
              className="relative p-2 text-slate-500 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Faculty Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
              )}
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

            <ProfileDropdown
              profilePath="/faculty/profile"
              settingsPath="/faculty/settings"
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Global Floating AI Agent Chat Widget */}
        <FloatingChatWidget />
      </div>
    </div>
  );
};

export default FacultyLayout;
