import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  UserCheck,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Users,
} from 'lucide-react';

export const ParentProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [feedback, setFeedback] = useState({ text: '', isError: false });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/parent/profile');
      if (res.data?.success) {
        setProfile(res.data.data);
        setEmail(res.data.data.email || '');
        setMobile(res.data.data.mobile || '');
      }
    } catch (err) {
      setFeedback({ text: 'Could not load parent profile.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setFeedback({ text: '', isError: false });
    setSaving(true);

    try {
      const res = await api.put('/parent/profile', { email, mobile });
      if (res.data?.success) {
        setFeedback({ text: 'Contact details updated successfully.', isError: false });
      }
    } catch (err) {
      setFeedback({
        text: err.response?.data?.message || 'Could not update contact details.',
        isError: true,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading verified parent profile..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
          <Users className="w-4 h-4" />
          <span>Guardian & Parent Records</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Parent Profile</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Registered parent/guardian identity and communication channel details.
        </p>
      </div>

      {feedback.text && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-2 ${
            feedback.isError
              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
          }`}
        >
          {feedback.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Profile Form & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Linked Student Summary Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <GraduationCap className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Linked Ward Information
            </h2>
          </div>

          {profile?.student ? (
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Student Name</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {profile.student.name}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Registration No</span>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {profile.student.registrationNumber}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Department</span>
                <p className="text-slate-700 dark:text-slate-300">{profile.student.department}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Class / Section</span>
                <p className="text-slate-700 dark:text-slate-300">
                  Year {profile.student.year}, Section {profile.student.section}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No student linked.</p>
          )}
        </div>

        {/* Editable Parent Contact Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Contact Details</h2>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Parent / Guardian Name
              </label>
              <input
                type="text"
                disabled
                value={profile?.name || ''}
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm disabled:opacity-60 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Contact Updates'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ParentProfilePage;
