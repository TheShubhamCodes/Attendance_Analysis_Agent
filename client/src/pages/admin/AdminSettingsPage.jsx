import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Settings,
  Building2,
  Percent,
  Bell,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
} from 'lucide-react';

export const AdminSettingsPage = () => {
  const [settings, setSettings] = useState({
    institution_name: 'National Institute of Advanced Technology',
    institution_code: 'NIAT-2026',
    academic_year: '2026-2027',
    active_semester: '5',
    attendance_warning_threshold: '75',
    attendance_critical_threshold: '65',
    sms_alerts_enabled: 'true',
    email_alerts_enabled: 'true',
    system_theme: 'DARK',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/settings');
      if (res.data?.success && res.data.data?.settings) {
        setSettings((prev) => ({ ...prev, ...res.data.data.settings }));
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', isError: false });

    try {
      const res = await api.post('/admin/settings', { settings });
      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to update system settings.',
        isError: true,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        Loading institutional settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-400" />
          System Settings & Institutional Policies
        </h1>
        <p className="text-xs text-slate-400">
          Global academic calendar, attendance thresholds, and system governance configurations.
        </p>
      </div>

      {message.text && (
        <div
          className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-semibold ${
            message.isError
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
          }`}
        >
          {message.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Institution Details */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <Building2 className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Institution Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">University / College Name</label>
              <input
                type="text"
                required
                value={settings.institution_name}
                onChange={(e) => setSettings({ ...settings, institution_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Institutional Code</label>
              <input
                type="text"
                required
                value={settings.institution_code}
                onChange={(e) => setSettings({ ...settings, institution_code: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Academic Configuration */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Academic Calendar Configuration</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Current Academic Year</label>
              <input
                type="text"
                required
                value={settings.academic_year}
                onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Active Academic Semester</label>
              <select
                value={settings.active_semester}
                onChange={(e) => setSettings({ ...settings, active_semester: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
              >
                <option value="1">Semester 1 (Autumn / Odd)</option>
                <option value="2">Semester 2 (Spring / Even)</option>
                <option value="3">Semester 3 (Autumn / Odd)</option>
                <option value="4">Semester 4 (Spring / Even)</option>
                <option value="5">Semester 5 (Autumn / Odd)</option>
                <option value="6">Semester 6 (Spring / Even)</option>
                <option value="7">Semester 7 (Autumn / Odd)</option>
                <option value="8">Semester 8 (Spring / Even)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Attendance Thresholds */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <Percent className="w-5 h-5 text-rose-400" />
            <h2 className="text-sm font-bold text-white">Attendance Policy Thresholds</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">
                Standard Warning Threshold (%) <span className="text-amber-400 font-bold">(Default: 75%)</span>
              </label>
              <input
                type="number"
                min="50"
                max="100"
                required
                value={settings.attendance_warning_threshold}
                onChange={(e) => setSettings({ ...settings, attendance_warning_threshold: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Students below this percentage are flagged as At Risk.</p>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">
                Critical Exam Debarment Threshold (%) <span className="text-rose-400 font-bold">(Default: 65%)</span>
              </label>
              <input
                type="number"
                min="40"
                max="90"
                required
                value={settings.attendance_critical_threshold}
                onChange={(e) => setSettings({ ...settings, attendance_critical_threshold: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Critical threshold triggering mandatory counselor meetings.</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Settings...' : 'Save Institutional Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettingsPage;
