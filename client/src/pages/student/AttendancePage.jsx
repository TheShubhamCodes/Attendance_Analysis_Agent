import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ClipboardCheck, Lock, Search, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const AttendancePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await api.get('/student/attendance');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not fetch attendance records.');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  if (loading) return <LoadingSpinner text="Fetching official attendance logs..." />;

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700 text-sm">
        <p>{error || 'An error occurred while loading attendance records.'}</p>
      </div>
    );
  }

  const { summary, subjects } = data;

  const filteredSubjects = subjects.filter(
    (s) =>
      s.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-800 uppercase tracking-wider mb-1">
            <ClipboardCheck className="w-4 h-4" />
            <span>Official Attendance Registry</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">My Course Attendance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified attendance entries maintained by subject faculty and academic section
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Read-Only Official Record</span>
        </div>
      </div>

      {/* Dual Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Raw Attendance */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Raw Attendance
            </span>
            <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1 py-0.5 rounded">Unadjusted</span>
          </div>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-2xl font-black text-slate-900">{summary.rawPercentage ?? summary.overallPercentage}%</span>
            <span className="text-xs text-slate-500 font-medium">({summary.present}/{summary.totalClasses})</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Conducted classes attended</p>
        </div>

        {/* Adjusted Attendance */}
        <div className="bg-gradient-to-br from-indigo-50/80 to-brand-50/50 border border-indigo-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
              Adjusted Attendance
            </span>
            <span className="text-[9px] font-bold bg-indigo-600 text-white px-1 py-0.5 rounded">Official</span>
          </div>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-2xl font-black text-indigo-900">{summary.adjustedPercentage ?? summary.overallPercentage}%</span>
            <span className="text-xs text-indigo-700 font-medium">({summary.present}/{summary.effectiveTotal ?? summary.totalClasses})</span>
          </div>
          <p className="text-[10px] text-indigo-500 mt-1">OD & Leave periods exempted</p>
        </div>

        {/* Approved OD */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
            Approved On-Duty
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <p className="text-2xl font-black text-blue-700">{summary.approvedOdCount ?? 0}</p>
            <span className="text-xs text-slate-500">periods</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sanctioned representation</p>
        </div>

        {/* Approved Leave */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">
            Approved Leave
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <p className="text-2xl font-black text-purple-700">{summary.approvedLeaveCount ?? 0}</p>
            <span className="text-xs text-slate-500">periods</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sanctioned academic/medical</p>
        </div>
      </div>

      {/* Main Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Search / Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search course code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-900"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Exempted periods are deducted from denominator in Adjusted Attendance calculation.</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Subject Code</th>
                <th className="py-3.5 px-4">Subject Name</th>
                <th className="py-3.5 px-4">Faculty Advisor</th>
                <th className="py-3.5 px-4 text-center">Conducted</th>
                <th className="py-3.5 px-4 text-center">Present</th>
                <th className="py-3.5 px-4 text-center">Absent</th>
                <th className="py-3.5 px-4 text-center">OD/Leave Exempt</th>
                <th className="py-3.5 px-4 text-center">Raw %</th>
                <th className="py-3.5 px-4 text-center font-bold text-indigo-900">Adjusted %</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400">
                    No courses match your search.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subj) => (
                  <tr key={subj.courseId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-950">
                      {subj.courseCode}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {subj.courseName}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Credits: {subj.credits}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{subj.facultyName}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                      {subj.totalClasses}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {subj.present}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-rose-700">
                      {subj.absent}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {(subj.approvedExemptions || 0) > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {subj.approvedExemptions} exempt
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                      {subj.rawPercentage ?? subj.attendancePercentage}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`font-mono text-sm font-black ${
                          (subj.adjustedPercentage ?? subj.attendancePercentage) < 65
                            ? 'text-rose-600'
                            : (subj.adjustedPercentage ?? subj.attendancePercentage) < 75
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {subj.adjustedPercentage ?? subj.attendancePercentage}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={subj.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
