import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  UserCheck,
  Phone,
  Mail,
  Shield,
  Layers,
  Users,
  CheckCircle2,
  AlertCircle,
  Building,
  Save,
} from 'lucide-react';

export const FacultyProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [mobileNumber, setMobileNumber] = useState('');
  const [cabinLocation, setCabinLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchProfile = async () => {
    try {
      const res = await api.get('/faculty/profile');
      if (res.data?.success) {
        setProfile(res.data.data);
        setMobileNumber(res.data.data.mobileNumber || '');
        setCabinLocation(res.data.data.cabinLocation || '');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    // Strict Mandatory Mobile Number validation
    if (!mobileNumber || mobileNumber.trim().length === 0) {
      setErrorMsg('Mobile number is mandatory for two-factor OTP verification and cannot be removed.');
      return;
    }

    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/faculty/profile', {
        mobileNumber: cleanPhone,
        cabinLocation: cabinLocation.trim(),
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Profile updated successfully.');
        setMobileNumber(res.data.data.mobileNumber);
        setCabinLocation(res.data.data.cabinLocation || '');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading official faculty profile..." />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Faculty Roster</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Faculty & Staff Profile</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official academic credentials, teaching workload, and security verification contact info.
          </p>
        </div>

        <div className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold flex items-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Active Faculty Member</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Fixed Institutional Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs">
          <div className="text-center pb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-2 shadow-sm uppercase">
              {profile?.name ? profile.name.slice(0, 2) : 'FC'}
            </div>
            <h2 className="text-base font-bold text-slate-900">{profile?.name}</h2>
            <p className="text-blue-700 font-semibold text-xs mt-0.5">{profile?.designation}</p>
            <p className="text-slate-400 font-mono text-[11px] mt-0.5">EMP ID: {profile?.employeeId}</p>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
              <span className="font-bold text-slate-800">{profile?.departmentName} ({profile?.departmentCode})</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Official Email</span>
              <span className="font-mono text-slate-800 truncate block">{profile?.email}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Teaching Workload</span>
              <span className="font-bold text-slate-800">{profile?.assignedClassesCount} Course Sections</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Counselor Cohort</span>
              <span className="font-bold text-blue-700">{profile?.counselorStudentCount} Assigned Students</span>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Editable Security & Contact Fields + Workload */}
        <div className="md:col-span-2 space-y-6">
          {/* Contact & 2FA Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>Contact & 2FA Verification Settings</span>
            </h3>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registered Mobile Number <span className="text-rose-500">* (Mandatory for OTP)</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. 9840112233"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Required for two-factor security verification whenever editing historical attendance records.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cabin / Office Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cabinLocation}
                    onChange={(e) => setCabinLocation(e.target.value)}
                    placeholder="e.g. Academic Block 2, Room 304"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Profile Contact Info'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Assigned Subjects & Sections Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Official Assigned Curriculum Sections</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile?.assignedSubjects?.map((subj, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{subj.courseCode}</span>
                    <span className="text-[11px] text-slate-500 truncate block">{subj.courseName}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold rounded text-[10px]">
                    Sec {subj.section} (Sem {subj.semester})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyProfilePage;
