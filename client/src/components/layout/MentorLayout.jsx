import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  HeartHandshake,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  GraduationCap,
  Bell,
  Menu,
  X,
  LogOut,
  UserCheck,
} from 'lucide-react';
import ProfileDropdown from '../common/ProfileDropdown';
import FloatingChatWidget from '../common/FloatingChatWidget';

export const MentorLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Close mobile menu on route change
    setMobileMenuOpen(false);

    // Fetch unread notifications count
    const fetchUnread = async () => {
      try {
        const res = await api.get('/mentor/dashboard');
        if (res.data?.success && res.data.data?.followUpsNeedingAttention) {
          setUnreadCount(res.data.data.followUpsNeedingAttention.length || 0);
        }
      } catch (err) {
        // Silently catch
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
        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div data-role="MENTOR" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 bg-slate-950 text-slate-100 flex-col flex-shrink-0 border-r border-slate-800 shadow-xl">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-900/60">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-black tracking-wider text-white leading-tight uppercase">
              Academic Agent
            </h1>
            <p className="text-[11px] text-emerald-400 font-semibold tracking-wide uppercase truncate">
              Mentor / Counselor
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          <NavLink to="/mentor/dashboard" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>Dashboard</span>
            </div>
          </NavLink>

          {/* AI Attendance Agent */}
          <NavLink to="/mentor/agent" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-amber-300">AI Attendance Agent</span>
            </div>
          </NavLink>

          {/* My Students */}
          <NavLink to="/mentor/students" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>My Students</span>
            </div>
          </NavLink>

          {/* At-Risk Students */}
          <NavLink to="/mentor/at-risk" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>At-Risk Students</span>
            </div>
          </NavLink>

          {/* Interventions */}
          <NavLink to="/mentor/interventions" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <HeartHandshake className="w-4 h-4 text-emerald-400" />
              <span>Interventions</span>
            </div>
          </NavLink>

          {/* Reports */}
          <NavLink to="/mentor/reports" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>Reports</span>
            </div>
          </NavLink>

          {/* Time Table (View-Only) */}
          <NavLink to="/mentor/timetable" className={({ isActive }) => navLinkClasses(isActive)}>
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Time Table</span>
            </div>
          </NavLink>
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-white truncate">
                {user?.staffProfile?.name || user?.name || 'Mentor'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.staffProfile?.department?.code ? `${user.staffProfile.department.code} Department` : 'Mentor Portal'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="hidden sm:block">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Mentor Workspace
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Student Monitoring, Counseling & Attendance Intervention
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {unreadCount > 0 && (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-full text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  <Bell className="w-3.5 h-3.5" />
                  <span>{unreadCount} follow-up{unreadCount > 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Standard Profile Dropdown (Profile, Settings, Logout) */}
              <ProfileDropdown
                profilePath="/mentor/profile"
                settingsPath="/mentor/settings"
              />
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1">
              <NavLink to="/mentor/dashboard" className={({ isActive }) => navLinkClasses(isActive)}>
                <div className="flex items-center space-x-3">
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span>Dashboard</span>
                </div>
              </NavLink>

              <NavLink to="/mentor/agent" className={({ isActive }) => navLinkClasses(isActive)}>
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>AI Attendance Agent</span>
                </div>
              </NavLink>

              <NavLink to="/mentor/students" className={({ isActive }) => navLinkClasses(isActive)}>
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>My Students</span>
                </div>
              </NavLink>

              <NavLink to="/mentor/at-risk" className={({ isActive }) => navLinkClasses(isActive)}>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>At-Risk Students</span>
                </div>
              </NavLink>

              <NavLink to="/mentor/interventions" className={({ isActive }) => navLinkClasses(isActive)}>
                <div className="flex items-center space-x-3">
                  <HeartHandshake className="w-4 h-4 text-emerald-400" />
                  <span>Interventions</span>
                </div>
              </NavLink>

              <NavLink to="/mentor/reports" className={({ isActive }) => navLinkClasses(isActive)}>
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  <span>Reports</span>
                </div>
              </NavLink>

              <NavLink to="/mentor/timetable" className={({ isActive }) => navLinkClasses(isActive)}>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Time Table</span>
                </div>
              </NavLink>
            </div>
          )}
        </header>

        {/* Page Content Container */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Persistent Floating Chat Widget */}
      <FloatingChatWidget />
    </div>
  );
};

export default MentorLayout;
