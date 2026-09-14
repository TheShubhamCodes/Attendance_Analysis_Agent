import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Mail,
  Building,
  Briefcase,
  Phone,
  MapPin,
  Users,
  ShieldCheck,
  Save,
  CheckCircle,
} from 'lucide-react';

export const MentorProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    mobileNumber: '',
    cabinLocation: '',
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/mentor/profile');
      if (res.data?.success) {
        const p = res.data.data.mentor;
        setProfile(p);
        setForm({
          mobileNumber: p.mobileNumber || '',
          cabinLocation: p.cabinLocation || '',
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setSaving(true);

    try {
      const res = await api.put('/mentor/profile', form);
      if (res.data?.success) {
        setSuccess('Profile details updated successfully.');
        await fetchProfile();
      } else {
        setError(res.data?.message || 'Failed to update profile.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500">Loading mentor profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
            {profile?.name?.slice(0, 2).toUpperCase() || 'ME'}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              {profile?.name}
            </h1>
            <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
              {profile?.designation || 'Mentor & Academic Counselor'}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Employee ID: {profile?.employeeId}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Profile Details Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Mentor Information & Contact Details
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={profile?.name || ''}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-500 mb-1">Email Address</label>
              <input
                type="text"
                disabled
                value={profile?.email || ''}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-500 mb-1">Department</label>
              <input
                type="text"
                disabled
                value={profile?.department?.name || ''}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-500 mb-1">Assigned Mentees</label>
              <input
                type="text"
                disabled
                value={`${profile?.assignedStudentsCount || 0} Students`}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                value={form.mobileNumber}
                onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                placeholder="e.g. +91 9876543210"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cabin / Office Location
              </label>
              <input
                type="text"
                value={form.cabinLocation}
                onChange={(e) => setForm({ ...form, cabinLocation: e.target.value })}
                placeholder="e.g. Academic Block 2, Room 304"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MentorProfilePage;
