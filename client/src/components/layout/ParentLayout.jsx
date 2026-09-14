import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ProfileDropdown from '../common/ProfileDropdown';
import {
  LayoutDashboard,
  UserCheck,
  Sliders,
  BookOpen,
  ChevronRight,
  Menu,
  X,
  Users,
  Calendar,
  Sparkles,
} from 'lucide-react';
import FloatingChatWidget from '../common/FloatingChatWidget';

const NAV_ITEMS = [
  { path: '/parent/dashboard', label: 'Child Dashboard', icon: LayoutDashboard },
  { path: '/parent/agent', label: 'AI Attendance Agent', icon: Sparkles },
  { path: '/parent/timetable', label: 'Time Table', icon: Calendar },
  { path: '/parent/profile', label: 'Parent Profile', icon: UserCheck },
  { path: '/parent/settings', label: 'Settings', icon: Sliders },
];

export const ParentLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div data-role="PARENT" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-200">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 dark:bg-slate-950 text-slate-100 flex-col flex-shrink-0 border-r border-slate-800 shadow-xl">
        {/* University Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] flex items-center justify-center text-white font-bold shadow-md">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
              ACADEMIC AGENT
            </h1>
            <p className="text-[11px] text-amber-400 font-medium tracking-wide uppercase">
              Parent Portal
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
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-600 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Bottom User Summary */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-amber-700 border border-amber-600 flex items-center justify-center text-xs font-bold text-white uppercase">
              {(user?.name || user?.identifier || 'P').slice(0, 2)}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || user?.identifier}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                Reg: {user?.identifier}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 dark:bg-slate-950 text-white px-4 py-3 flex items-center justify-between shadow-md border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold tracking-tight">Parent Portal</span>
        </div>
        <div className="flex items-center space-x-2">
          <ProfileDropdown profilePath="/parent/profile" settingsPath="/parent/settings" />
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
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm ${
                  isActive ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Desktop Bar with ProfileDropdown */}
        <header className="hidden md:flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-3.5 items-center justify-between transition-colors">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Parent Portal
            </span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {NAV_ITEMS.find((n) => n.path === location.pathname)?.label || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <ProfileDropdown profilePath="/parent/profile" settingsPath="/parent/settings" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-950">
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

export default ParentLayout;
