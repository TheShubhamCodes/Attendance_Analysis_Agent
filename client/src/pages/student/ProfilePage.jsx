import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  UserCheck,
  Lock,
  Edit2,
  Save,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  Building,
  Users,
  Shield,
} from 'lucide-react';

export const ProfilePage = () => {
  const { updateUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editable safe fields
  const [personalEmail, setPersonalEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', isError: false });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/profile');
      if (res.data?.success) {
        setProfile(res.data.data);
        setPersonalEmail(res.data.data.personalEmail || '');
        setMobileNumber(res.data.data.mobileNumber || '');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not fetch student profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setFeedback({ text: '', isError: false });
    setSaving(true);

    try {
      const res = await api.put('/student/profile', {
        personalEmail,
        mobileNumber,
      });

      if (res.data?.success) {
        setFeedback({ text: 'Contact details updated successfully.', isError: false });
        setProfile(res.data.data);
        updateUserProfile({
          personalEmail: res.data.data.personalEmail,
          mobileNumber: res.data.data.mobileNumber,
        });
      }
    } catch (err) {
      setFeedback({
        text: err.response?.data?.message || 'Could not update contact information.',
        isError: true,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading verified student profile..." />;

  if (error || !profile) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700 text-sm">
        <p>{error || 'An error occurred while loading profile.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-800 uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Academic Identity & Bio</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Student Profile Registry</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified academic credentials and personal communications contact record
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span>Institutional Registration ID</span>
        </div>
      </div>

      {feedback.text && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-start space-x-2.5 ${
            feedback.isError
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {feedback.isError ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Main Form & Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Non-Editable Academic Identity (Padlocked) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Institutional Academic Record</h2>
              <p className="text-xs text-slate-500">
                Immutable university records governed by the Dean of Academic Affairs
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 flex items-center">
              <Lock className="w-3 h-3 mr-1" /> Locked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Full Legal Name
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>{profile.name}</span>
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Registration Number
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-brand-950 flex items-center justify-between">
                <span>{profile.registrationNumber}</span>
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Official College Email
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>{profile.email}</span>
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>
                  {new Date(profile.dateOfBirth).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Department
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>
                  {profile.department?.name} ({profile.department?.code})
                </span>
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Year of Study
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>Year {profile.year}</span>
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Section
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>Section {profile.section}</span>
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Assigned Mentor
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>
                  {profile.mentor ? `${profile.mentor.name} (${profile.mentor.email})` : 'Unassigned'}
                </span>
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Safe Editable Fields & Guardian Summary */}
        <div className="space-y-6">
          {/* Safe Editable Contact Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4">
              <Edit2 className="w-4 h-4 text-brand-900" />
              <h2 className="text-sm font-bold text-slate-900">Personal Contact Details</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Authorized personal channels for SMS alerts and urgent notifications.
            </p>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alternative Personal Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. personal@gmail.com"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876500001"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 bg-brand-900 hover:bg-brand-950 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 disabled:opacity-60 transition-colors shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving Updates...' : 'Save Contact Updates'}</span>
              </button>
            </form>
          </div>

          {/* Linked Parent Information Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900">Linked Parent / Guardian</h3>
              <Lock className="w-3 h-3 text-slate-400" />
            </div>

            {profile.parent ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block uppercase">Name:</span>
                  <span className="font-semibold text-slate-800">{profile.parent.name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block uppercase">Contact Number:</span>
                  <span className="font-semibold text-slate-800 font-mono">{profile.parent.mobile}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block uppercase">Email Address:</span>
                  <span className="font-semibold text-slate-800">{profile.parent.email}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No guardian record attached.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
