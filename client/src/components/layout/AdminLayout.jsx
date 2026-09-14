import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Briefcase,
  GraduationCap,
  HeartHandshake,
  Layers,
  ClipboardCheck,
  Calendar,
  Sparkles,
  Bell,
  Shield,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Award,
} from 'lucide-react';
import ProfileDropdown from '../common/ProfileDropdown';
import FloatingChatWidget from '../common/FloatingChatWidget';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Directory', icon: Users },
    { to: '/admin/hod', label: 'HOD Management', icon: UserCheck },
    { to: '/admin/faculty', label: 'Faculty & Rosters', icon: Briefcase },
    { to: '/admin/students', label: 'Student Directory', icon: GraduationCap },
    { to: '/admin/parents', label: 'Parent Relationships', icon: HeartHandshake },
    { to: '/admin/academics', label: 'Academic Structure', icon: Layers },
    { to: '/admin/attendance', label: 'Attendance & Edits', icon: ClipboardCheck },
    { to: '/admin/od-leave', label: 'OD / Leave Requests', icon: Award },
    { to: '/admin/timetable', label: 'Timetable Routine', icon: Calendar },
    { to: '/admin/agent', label: 'AI Attendance Agent', icon: Sparkles, badge: 'Active' },
    { to: '/admin/audit-logs', label: 'System Audit Logs', icon: FileText },
    { to: '/admin/settings', label: 'Admin Settings', icon: Settings },
  ];

  const navLinkClasses = (isActive) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-white shadow-md shadow-purple-950/50 font-bold'
        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
    }`;

  return (
    <div data-role="ADMIN" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-slate-100 flex-col flex-shrink-0 border-r border-slate-800 shadow-2xl">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-950">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#5B21B6] flex items-center justify-center text-white font-black text-base shadow-lg shadow-purple-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Admin Portal
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#7C3AED]/20 text-[#C4B5FD] border border-[#7C3AED]/40 uppercase">
                Root
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Academic Enterprise Admin</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            System Administration
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/admin/dashboard' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 opacity-40 ${isActive ? 'opacity-90' : ''}`} />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info & quick logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-[10px] text-slate-400 font-mono">ADMIN PRIVILEGES: ACTIVE</span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#5B21B6] flex items-center justify-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Admin Console</h1>
            <p className="text-[10px] text-[#A78BFA] font-mono">System-Wide Access</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={navLinkClasses(isActive)}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900/70 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800/80 shadow-sm">
              <Shield className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
              SYSTEM ADMINISTRATOR • ALL DEPARTMENTS
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <ProfileDropdown
              profilePath="/admin/dashboard"
              settingsPath="/admin/settings"
            />
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          <Outlet />
        </main>
      </div>

      {/* Global AI Attendance Chat Widget */}
      <FloatingChatWidget />
    </div>
  );
};

export default AdminLayout;
