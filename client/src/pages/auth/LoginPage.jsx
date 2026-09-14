import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Eye, EyeOff, Lock, User, AlertCircle, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';
import api from '../../services/api';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('STUDENT');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Parent Activation Modal State
  const [showActivateParentModal, setShowActivateParentModal] = useState(false);
  const [parentActivationData, setParentActivationData] = useState({
    registrationNumber: '',
    parentEmail: '',
    parentMobile: '',
    password: '',
    confirmPassword: '',
  });
  const [activationMessage, setActivationMessage] = useState({ text: '', isError: false });
  const [activating, setActivating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both your identifier and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(identifier.trim(), password, userType);
      if (user.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else if (user.role === 'PARENT') {
        navigate('/parent/dashboard');
      } else if (user.role === 'MENTOR') {
        navigate('/mentor/dashboard');
      } else if (user.role === 'STAFF' || user.role === 'FACULTY') {
        navigate('/faculty/dashboard');
      } else if (user.role === 'HOD') {
        navigate('/hod/dashboard');
      } else if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Invalid registration number or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (type) => {
    setUserType(type);
    if (type === 'STUDENT') {
      setIdentifier('23CSE101');
      setPassword('Student@123');
    } else if (type === 'PARENT') {
      setIdentifier('23CSE101');
      setPassword('Parent@123');
    } else if (type === 'MENTOR') {
      setUserType('MENTOR');
      setIdentifier('STAFF001');
      setPassword('Staff@123');
    } else if (type === 'FACULTY' || type === 'STAFF') {
      setUserType('STAFF');
      setIdentifier('FAC001');
      setPassword('Faculty@123');
    } else if (type === 'HOD') {
      setUserType('HOD');
      setIdentifier('HOD001');
      setPassword('Hod@1234');
    } else if (type === 'ADMIN') {
      setUserType('ADMIN');
      setIdentifier('ADMIN001');
      setPassword('Admin@1234');
    }
  };

  const handleActivateParent = async (e) => {
    e.preventDefault();
    setActivationMessage({ text: '', isError: false });

    if (parentActivationData.password !== parentActivationData.confirmPassword) {
      setActivationMessage({ text: 'Passwords do not match.', isError: true });
      return;
    }

    setActivating(true);
    try {
      const res = await api.post('/auth/activate/parent', parentActivationData);
      setActivationMessage({ text: res.data.message, isError: false });
      setTimeout(() => {
        setShowActivateParentModal(false);
        setUserType('PARENT');
        setIdentifier(parentActivationData.registrationNumber);
        setPassword(parentActivationData.password);
      }, 2000);
    } catch (err) {
      setActivationMessage({
        text: err.response?.data?.message || 'Parent activation failed.',
        isError: true,
      });
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Academic Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-900 text-white shadow-md mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Attendance & Student Performance Agent
        </h1>
        <p className="mt-1.5 text-xs text-brand-700 font-medium tracking-wide uppercase">
          AI-Powered Academic Monitoring & Intervention System
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* 1. Registration Number / Employee ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {userType === 'STAFF' || userType === 'HOD' ? 'Employee ID' : 'Registration Number'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    userType === 'ADMIN'
                      ? 'e.g. ADMIN001'
                      : userType === 'HOD'
                      ? 'e.g. HOD001'
                      : userType === 'STAFF'
                      ? 'e.g. FAC001'
                      : 'e.g. 23CSE101'
                  }
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:border-brand-900 transition-colors uppercase font-mono"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
              </div>
              {userType === 'PARENT' && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Note: Parents enter their child's student registration number with their separate parent password.
                </p>
              )}
            </div>

            {/* 2. Select User */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select User
              </label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:border-brand-900 transition-colors"
              >
                <option value="STUDENT">Student</option>
                <option value="PARENT">Parent</option>
                <option value="STAFF">Faculty / Staff</option>
                <option value="HOD">Head of Department (HOD)</option>
                <option value="ADMIN">System Administrator (Admin)</option>
              </select>
            </div>

            {/* 3. Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:border-brand-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 4. SIGN IN Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-brand-900 hover:bg-brand-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-900 disabled:opacity-60 transition-colors"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'SIGN IN'
                )}
              </button>
            </div>
          </form>

          {/* Links Section */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col space-y-3 text-center text-xs">
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-brand-700 hover:text-brand-900 font-medium hover:underline"
            >
              Forgotten or Set password?
            </button>

            <div>
              <span className="text-slate-500">New Student? </span>
              <Link
                to="/student/signup"
                className="text-brand-700 hover:text-brand-900 font-semibold hover:underline"
              >
                Create Account
              </Link>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowActivateParentModal(true)}
                className="text-slate-500 hover:text-brand-800 text-[11px] underline"
              >
                Parent Account Activation
              </button>
            </div>
          </div>
        </div>

        {/* Development Quick Credentials Bar */}
        <div className="mt-6 bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
              Development Demo Credentials
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
              Click to autofill
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
            <button
              type="button"
              onClick={() => fillDemoCredentials('STUDENT')}
              className="px-2 py-1.5 bg-white rounded border border-slate-300 hover:border-brand-600 hover:bg-brand-50 transition-colors text-left"
            >
              <div className="font-semibold text-slate-900">Student</div>
              <div className="text-[10px] text-slate-500 font-mono">23CSE101</div>
              <div className="text-[10px] text-slate-400">Student@123</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoCredentials('PARENT')}
              className="px-2 py-1.5 bg-white rounded border border-slate-300 hover:border-brand-600 hover:bg-brand-50 transition-colors text-left"
            >
              <div className="font-semibold text-slate-900">Parent</div>
              <div className="text-[10px] text-slate-500 font-mono">23CSE101</div>
              <div className="text-[10px] text-slate-400">Parent@123</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoCredentials('MENTOR')}
              className="px-2 py-1.5 bg-white rounded border border-teal-300 hover:border-teal-600 hover:bg-teal-50 transition-colors text-left"
            >
              <div className="font-semibold text-teal-900">Mentor</div>
              <div className="text-[10px] text-teal-600 font-mono font-bold">STAFF001</div>
              <div className="text-[10px] text-slate-400">Staff@123</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoCredentials('STAFF')}
              className="px-2 py-1.5 bg-white rounded border border-slate-300 hover:border-brand-600 hover:bg-brand-50 transition-colors text-left"
            >
              <div className="font-semibold text-slate-900">Faculty</div>
              <div className="text-[10px] text-slate-500 font-mono">FAC001</div>
              <div className="text-[10px] text-slate-400">Faculty@123</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoCredentials('HOD')}
              className="px-2 py-1.5 bg-white rounded border border-indigo-300 hover:border-indigo-600 hover:bg-indigo-50 transition-colors text-left"
            >
              <div className="font-semibold text-indigo-900">HOD</div>
              <div className="text-[10px] text-indigo-600 font-mono font-bold">HOD001</div>
              <div className="text-[10px] text-slate-400">Hod@1234</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoCredentials('ADMIN')}
              className="px-2 py-1.5 bg-white rounded border border-purple-300 hover:border-purple-600 hover:bg-purple-50 transition-colors text-left"
            >
              <div className="font-semibold text-purple-900">Admin</div>
              <div className="text-[10px] text-purple-600 font-mono font-bold">ADMIN001</div>
              <div className="text-[10px] text-slate-400">Admin@1234</div>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot / Reset Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center space-x-2 text-brand-900 mb-3">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-base font-bold">Forgotten or Set Password</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              In accordance with university IT policy:
              <br />• <strong>Students:</strong> Please contact your Academic Dean / Exam Section or use the authorized self-service password reset terminal.
              <br />• <strong>Parents:</strong> Use the <em>Parent Account Activation</em> link below to set or update your dedicated parent portal password.
              <br />• <strong>Staff:</strong> Contact University Systems Administration.
            </p>
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parent Account Activation Modal */}
      {showActivateParentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center space-x-2 text-brand-900 mb-2">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-base font-bold">Parent Portal Activation</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Activate your dedicated parent credentials using the linked student's registration number and registered guardian contact details.
            </p>

            {activationMessage.text && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs flex items-start space-x-2 ${
                  activationMessage.isError
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {activationMessage.isError ? (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span>{activationMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleActivateParent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Student Registration Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 23CSE101"
                  value={parentActivationData.registrationNumber}
                  onChange={(e) =>
                    setParentActivationData({ ...parentActivationData, registrationNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-xs uppercase font-mono focus:ring-1 focus:ring-brand-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Registered Guardian Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rajesh.sharma@parentmail.com"
                  value={parentActivationData.parentEmail}
                  onChange={(e) =>
                    setParentActivationData({ ...parentActivationData, parentEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-brand-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  New Parent Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={parentActivationData.password}
                  onChange={(e) =>
                    setParentActivationData({ ...parentActivationData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-brand-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Confirm Parent Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Confirm password"
                  value={parentActivationData.confirmPassword}
                  onChange={(e) =>
                    setParentActivationData({ ...parentActivationData, confirmPassword: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-brand-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowActivateParentModal(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activating}
                  className="px-4 py-2 bg-brand-900 text-white rounded text-xs font-semibold hover:bg-brand-950 disabled:opacity-60"
                >
                  {activating ? 'Activating...' : 'Activate Parent Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
