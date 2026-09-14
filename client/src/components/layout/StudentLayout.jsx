import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  LayoutDashboard,
  ClipboardCheck,
  Calendar,
  Calculator,
  GraduationCap,
  Activity,
  Bell,
  Users,
  ShieldCheck,
  UserCheck,
  Sliders,
  LogOut,
  Menu,
  X,
  BookOpen,
  ChevronRight,
  Sparkles,
  Award,
} from 'lucide-react';
import ProfileDropdown from '../common/ProfileDropdown';
import FloatingChatWidget from '../common/FloatingChatWidget';

const NAV_ITEMS = [
  { path: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/student/agent', label: 'AI Attendance Agent', icon: Sparkles },
  { path: '/student/timetable', label: 'Time Table', icon: Calendar },
  { path: '/student/attendance', label: 'My Attendance', icon: ClipboardCheck },
  { path: '/student/od-leave', label: 'OD / Leave Requests', icon: Award },
  { path: '/student/attendance-calendar', label: 'Attendance Calendar', icon: Calendar },
  { path: '/student/attendance-predictor', label: 'Attendance Predictor', icon: Calculator },
  { path: '/student/performance', label: 'My Performance', icon: GraduationCap },
  { path: '/student/risk-analysis', label: 'AI Risk Analysis', icon: Activity },
  { path: '/student/notifications', label: 'Notifications', icon: Bell, hasBadge: true },
  { path: '/student/mentor', label: 'Mentor', icon: Users },
  { path: '/student/interventions', label: 'Interventions', icon: ShieldCheck },
  { path: '/student/profile', label: 'Profile', icon: UserCheck },
  { path: '/student/settings', label: 'Settings', icon: Sliders },
];

export const StudentLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch unread notifications count
    const fetchUnread = async () => {
      try {
        const res = await api.get('/student/notifications');
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

  return (
    <div data-role="STUDENT" className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 bg-brand-950 text-slate-100 flex-col flex-shrink-0 border-r border-brand-900 shadow-xl">
        {/* University Brand Header */}
        <div className="p-5 border-b border-brand-900/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-brand-700 flex items-center justify-center text-white font-bold shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
              ACADEMIC AGENT
            </h1>
            <p className="text-[11px] text-brand-300 font-medium tracking-wide uppercase">
              Student Portal
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-700 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-brand-900/60 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.hasBadge && unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout at Sidebar Bottom */}
        <div className="p-3 border-t border-brand-900/80 bg-brand-950/80">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-800 border border-brand-700 flex items-center justify-center text-xs font-bold text-white uppercase">
                {(user?.name || user?.identifier || 'S').slice(0, 2)}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.name || user?.identifier}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.identifier}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-brand-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-brand-950 text-white px-4 py-3 flex items-center justify-between shadow-md border-b border-brand-900">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center text-white font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold tracking-tight">ACADEMIC AGENT</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/student/notifications')}
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
        <div className="md:hidden bg-brand-950 border-b border-brand-900 px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  isActive ? 'bg-brand-700 text-white font-semibold' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.hasBadge && unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
          <div className="pt-2 border-t border-brand-900 flex justify-between items-center text-xs text-slate-400">
            <span>Signed in as {user?.identifier}</span>
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
        <header className="hidden md:flex bg-white border-b border-slate-200 px-8 py-3.5 items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Student Portal</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="font-semibold text-slate-800">
              {NAV_ITEMS.find((n) => n.path === location.pathname)?.label || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center space-x-5">
            <button
              onClick={() => navigate('/student/notifications')}
              className="relative p-2 text-slate-500 hover:text-brand-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
              )}
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

            <ProfileDropdown
              profilePath="/student/profile"
              settingsPath="/student/settings"
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
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

export default StudentLayout;
