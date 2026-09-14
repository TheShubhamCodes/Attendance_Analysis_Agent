import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  GraduationCap,
  Briefcase,
  Users,
} from 'lucide-react';

export const ProfileDropdown = ({ profilePath, settingsPath }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.name || user?.profile?.name || user?.identifier || 'User';
  const displayIdentifier =
    user?.profile?.registrationNumber ||
    user?.profile?.employeeId ||
    user?.identifier ||
    '';

  const roleLabel =
    user?.role === 'ADMIN'
      ? 'System Admin'
      : user?.role === 'HOD'
      ? 'Head of Dept'
      : user?.role === 'MENTOR'
      ? 'Mentor'
      : user?.role === 'STAFF' || user?.role === 'FACULTY'
      ? 'Faculty'
      : user?.role === 'PARENT'
      ? 'Parent'
      : 'Student';

  const RoleIcon =
    user?.role === 'ADMIN'
      ? Shield
      : user?.role === 'HOD'
      ? Shield
      : user?.role === 'MENTOR'
      ? Briefcase
      : user?.role === 'STAFF' || user?.role === 'FACULTY'
      ? Briefcase
      : user?.role === 'PARENT'
      ? Users
      : GraduationCap;

  const initials = (displayName || 'U')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button: [ Profile Avatar ] [ User Name ] ▼ */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white dark:ring-slate-800">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px] leading-tight">
            {displayName}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
            {roleLabel} {displayIdentifier ? `• ${displayIdentifier}` : ''}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Card with User Summary */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {displayName}
                </p>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900">
                    <RoleIcon className="w-2.5 h-2.5 mr-1" />
                    {roleLabel}
                  </span>
                </div>
                {displayIdentifier && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                    ID: {displayIdentifier}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-1 space-y-0.5">
            {/* 1. Profile Option */}
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(profilePath || '/profile');
              }}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold leading-tight">Profile</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">View personal and academic details</p>
              </div>
            </button>

            {/* 2. Settings Option */}
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(settingsPath || '/settings');
              }}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold leading-tight">Settings</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Appearance, notifications & security</p>
              </div>
            </button>
          </div>

          {/* Separator */}
          <div className="my-1 border-t border-slate-100 dark:border-slate-800/80"></div>

          {/* 3. Visually Distinguishable Logout Option */}
          <div className="p-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-left group"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold leading-tight">Logout</p>
                <p className="text-[10px] text-rose-500/80 dark:text-rose-400/70">Safely end current session</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
