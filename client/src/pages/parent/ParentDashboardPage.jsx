import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AgentDashboardCard from '../../components/common/AgentDashboardCard';
import {
  GraduationCap,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  UserCheck,
  Mail,
  Phone,
  Clock,
} from 'lucide-react';

export const ParentDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/parent/dashboard');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load parent dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading your student's attendance records..." />;

  if (error || !data) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-rose-700 dark:text-rose-300 text-xs">
        {error || 'Unable to load student attendance overview.'}
      </div>
    );
  }

  const { student, stats, subjectBreakdown, recentAttendance } = data;
  const isAtRisk = stats.overallPercentage < 75;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Academic Performance & Attendance Tracker</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Welcome, {data.parentName || 'Parent'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitoring daily attendance and academic progress for student{' '}
            <strong className="text-slate-800 dark:text-slate-200">{student.name}</strong> (Reg:{' '}
            {student.registrationNumber}).
          </p>
        </div>

        {/* Student Quick Bio Pill */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <p>
            <span className="text-slate-400">Department:</span>{' '}
            <strong className="text-slate-900 dark:text-white">{student.department}</strong>
          </p>
          <p>
            <span className="text-slate-400">Class:</span> Year {student.year}, Section {student.section}
          </p>
        </div>
      </div>

      {/* AI Attendance Analysis Agent Quick Card */}
      <AgentDashboardCard />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Percentage */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Overall Attendance
          </p>
          <div className="flex items-baseline space-x-2 mt-2">
            <span
              className={`text-3xl font-black ${
                isAtRisk ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {stats.overallPercentage}%
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {stats.attendedClasses} / {stats.totalClasses} classes
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isAtRisk ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(stats.overallPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Academic Risk Level */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Attendance Risk Status
          </p>
          <div className="flex items-center space-x-2 mt-3">
            {isAtRisk ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-900">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                At-Risk (&lt; 75%)
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Good Standing (≥ 75%)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Institutional minimum mandatory attendance threshold is 75%.
          </p>
        </div>

        {/* Mentor Contact */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm sm:col-span-2">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Assigned Faculty Mentor
          </p>
          {student.mentor ? (
            <div className="mt-2 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {student.mentor.name}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400 pt-1">
                <span className="flex items-center space-x-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{student.mentor.email}</span>
                </span>
                {student.mentor.mobile && (
                  <span className="flex items-center space-x-1 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{student.mentor.mobile}</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-2">Mentor currently not assigned.</p>
          )}
        </div>
      </div>

      {/* Subject Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Subject-Wise Attendance Breakdown
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 font-bold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3">Course Code</th>
                <th className="px-6 py-3">Course Name</th>
                <th className="px-6 py-3 text-center">Attended</th>
                <th className="px-6 py-3 text-center">Total</th>
                <th className="px-6 py-3 text-right">Percentage</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjectBreakdown.map((s, idx) => {
                const subAtRisk = parseFloat(s.percentage) < 75;
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3.5 font-bold font-mono text-slate-900 dark:text-slate-100">
                      {s.courseCode}
                    </td>
                    <td className="px-6 py-3.5 font-medium">{s.courseName}</td>
                    <td className="px-6 py-3.5 text-center font-semibold">{s.attendedClasses}</td>
                    <td className="px-6 py-3.5 text-center text-slate-500">{s.totalClasses}</td>
                    <td
                      className={`px-6 py-3.5 text-right font-bold ${
                        subAtRisk ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {s.percentage}%
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          subAtRisk
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {subAtRisk ? 'Critical' : 'Good'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Attendance Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 mb-4">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>Recent Class Logs</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {recentAttendance.slice(0, 9).map((rec) => (
            <div
              key={rec.id}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {rec.course?.courseCode || 'CLS'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    rec.status === 'PRESENT'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {rec.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {rec.course?.courseName}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {new Date(rec.date).toLocaleDateString()} • Period {rec.period}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParentDashboardPage;
