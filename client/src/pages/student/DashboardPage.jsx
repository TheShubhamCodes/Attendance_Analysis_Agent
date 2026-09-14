import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AgentDashboardCard from '../../components/common/AgentDashboardCard';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Clock,
  BookOpen,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/student/dashboard');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load dashboard information.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner text="Compiling academic overview..." />;

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700 text-sm">
        <div className="flex items-center space-x-2 font-bold mb-1">
          <AlertOctagon className="w-5 h-5" />
          <span>Error Loading Dashboard</span>
        </div>
        <p>{error || 'An error occurred while loading your academic metrics.'}</p>
      </div>
    );
  }

  const {
    overallAttendance,
    academicPerformance,
    riskStatus,
    attendanceTrend,
    subjectWiseAttendance,
    importantAlerts,
    recommendations,
  } = data;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-800 uppercase tracking-wider mb-1">
            <span>Academic Term 2026-2027</span>
            <span>•</span>
            <span>Semester 5</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Welcome back, {data.student.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.student.department} • Year {data.student.year} • Section {data.student.section}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/student/attendance-predictor"
            className="px-3.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <span>Attendance Predictor</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/student/risk-analysis"
            className="px-3.5 py-2 bg-brand-900 hover:bg-brand-950 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <span>View Risk Report</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* AI Attendance Analysis Agent Quick Card */}
      <AgentDashboardCard />

      {/* Top KPI Cards (Attendance, Academic Performance, Risk Status) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* 1. Dual Attendance Card (Raw vs Adjusted) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Adjusted Attendance
              </span>
              <StatusBadge status={overallAttendance.status} />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {overallAttendance.adjustedPercentage ?? overallAttendance.percentage}%
              </span>
              <span className="text-xs text-slate-500">
                (Req: {overallAttendance.requiredPercentage}%)
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5">
              Effective: <span className="font-semibold text-slate-800">{overallAttendance.classesAttended}</span> / <span className="font-semibold text-slate-800">{overallAttendance.effectiveClasses ?? overallAttendance.totalClasses}</span> periods.
            </p>

            {/* Raw Attendance Reference */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Raw Attendance:</span>
              <span className="font-bold text-slate-700">
                {overallAttendance.rawPercentage ?? overallAttendance.percentage}% ({overallAttendance.classesAttended}/{overallAttendance.totalClasses})
              </span>
            </div>

            {/* Exemptions Badge */}
            {((overallAttendance.approvedOdCount || 0) + (overallAttendance.approvedLeaveCount || 0)) > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {(overallAttendance.approvedOdCount || 0) > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    OD: {overallAttendance.approvedOdCount} exempt
                  </span>
                )}
                {(overallAttendance.approvedLeaveCount || 0) > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    Leave: {overallAttendance.approvedLeaveCount} exempt
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  (overallAttendance.adjustedPercentage ?? overallAttendance.percentage) < 65
                    ? 'bg-rose-500'
                    : (overallAttendance.adjustedPercentage ?? overallAttendance.percentage) < 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, overallAttendance.adjustedPercentage ?? overallAttendance.percentage)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 2. Academic Performance Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Academic Average
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Continuous Eval
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {academicPerformance.average}%
              </span>
              <span className="text-xs text-emerald-600 font-semibold flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Good
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Based on <span className="font-semibold text-slate-800">{academicPerformance.totalAssessments}</span> internal assessments & assignments.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-brand-800 font-semibold">
            <Link to="/student/performance" className="hover:underline flex items-center">
              <span>View Grade Breakdown</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>

        {/* 3. Risk Status Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Risk Classification
              </span>
              <StatusBadge status={riskStatus.level} />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {riskStatus.level === 'HIGH' ? 'HIGH RISK' : riskStatus.level === 'MEDIUM' ? 'MEDIUM RISK' : 'LOW RISK'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Index: {riskStatus.score}/100
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2 line-clamp-2">
              {riskStatus.summary}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-brand-800 font-semibold">
            <Link to="/student/risk-analysis" className="hover:underline flex items-center">
              <span>Full Risk Intelligence</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Charts & Subject Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Attendance Trajectory</h2>
              <p className="text-xs text-slate-500">Historical monthly attendance percentage</p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Downwards Trajectory</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis domain={[50, 100]} stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Attendance']}
                  contentStyle={{
                    backgroundColor: '#0f2744',
                    borderColor: '#1e3a8a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="#1e3a8a"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#1e3a8a' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Recommendations Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-brand-700" />
              <h2 className="text-sm font-bold text-slate-900">Recommended Interventions</h2>
            </div>

            <ul className="space-y-3">
              {recommendations.slice(0, 4).map((rec, idx) => (
                <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-700 mt-1.5 flex-shrink-0"></div>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              to="/student/mentor"
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>Connect with Assigned Mentor</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Subject-Wise Attendance Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Subject-wise Attendance Status</h2>
            <p className="text-xs text-slate-500">Current semester subject breakdown and safety risk</p>
          </div>
          <Link
            to="/student/attendance"
            className="text-xs font-semibold text-brand-800 hover:text-brand-950 flex items-center"
          >
            <span>View Full Table</span>
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjectWiseAttendance.map((subj) => (
            <div
              key={subj.courseId}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-brand-900 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 font-mono">
                  {subj.courseCode}
                </span>
                <StatusBadge status={subj.status} />
              </div>

              <h3 className="text-xs font-bold text-slate-800 truncate mb-2" title={subj.courseName}>
                {subj.courseName}
              </h3>

              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-extrabold text-slate-900">
                  {subj.attendancePercentage}%
                </span>
                <span className="text-[11px] text-slate-500">
                  {subj.classesAttended}/{subj.totalClasses} classes
                </span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${
                    subj.attendancePercentage < 65
                      ? 'bg-rose-500'
                      : subj.attendancePercentage < 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, subj.attendancePercentage)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Alerts Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Recent Academic Alerts</h2>
          </div>
          <Link
            to="/student/notifications"
            className="text-xs font-semibold text-brand-800 hover:text-brand-950 flex items-center"
          >
            <span>All Notifications</span>
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {importantAlerts.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No alerts at this time.</p>
          ) : (
            importantAlerts.map((alert) => (
              <div key={alert.id} className="py-3 flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-brand-600 mt-1.5"></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{alert.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{alert.message}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-4">
                  {new Date(alert.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
