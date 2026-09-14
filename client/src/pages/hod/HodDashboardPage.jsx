import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AgentDashboardCard from '../../components/common/AgentDashboardCard';
import {
  Users,
  GraduationCap,
  Layers,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  ClipboardCheck,
  CheckSquare,
  ArrowRight,
  RefreshCw,
  Clock,
  Sparkles,
  Award,
  Calendar,
  Building2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const HodDashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setError('');
      const res = await api.get('/hod/dashboard');
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.message || 'Could not load dashboard statistics.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch HOD dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 rounded-xl"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 rounded-xl"></div>
          <div className="h-72 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-rose-900">Dashboard Loading Error</h3>
        <p className="text-xs text-rose-700">{error || 'Unable to retrieve department metrics.'}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { department, metrics, riskDistribution, charts, attentionRequired } = data;

  const totalEvaluated =
    (riskDistribution.good || 0) + (riskDistribution.warning || 0) + (riskDistribution.atRisk || 0);
  const goodPct = totalEvaluated > 0 ? Math.round((riskDistribution.good / totalEvaluated) * 100) : 0;
  const warningPct = totalEvaluated > 0 ? Math.round((riskDistribution.warning / totalEvaluated) * 100) : 0;
  const atRiskPct = totalEvaluated > 0 ? Math.round((riskDistribution.atRisk / totalEvaluated) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                {department.code} HOD Office
              </span>
              <span className="text-xs text-blue-300 font-medium">Academic Year 2026-2027</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {department.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Department-level attendance analytics, teaching assignments, counseling interventions, and PostgreSQL audit controls.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
              title="Refresh real-time data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <Link
              to="/hod/faculty/assign"
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Assign Faculty</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* AI Attendance Analysis Agent Quick Card */}
      <AgentDashboardCard />

      {/* 2. Primary 8 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Students
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{metrics.totalStudents}</span>
            <span className="text-[11px] text-slate-400 ml-1.5 font-medium">Enrolled</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500 truncate">Across all academic years</p>
        </div>

        {/* Total Faculty */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Faculty
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{metrics.totalFaculty}</span>
            <span className="text-[11px] text-slate-400 ml-1.5 font-medium">Staff</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500 truncate">Professors & Mentors</p>
        </div>

        {/* Average Attendance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Avg Attendance
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-black ${
                metrics.departmentAverageAttendance >= 75
                  ? 'text-emerald-600'
                  : metrics.departmentAverageAttendance >= 65
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {metrics.departmentAverageAttendance}%
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500 truncate">Department aggregate</p>
        </div>

        {/* Total Sections */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Sections
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{metrics.totalSections}</span>
            <span className="text-[11px] text-slate-400 ml-1.5 font-medium">Classes</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500 truncate">Active section batches</p>
        </div>

        {/* Total Subjects */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Subjects
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{metrics.totalSubjects}</span>
            <span className="text-[11px] text-slate-400 ml-1.5 font-medium">Courses</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500 truncate">Curriculum courses</p>
        </div>

        {/* Below 75% Defaulters */}
        <Link
          to="/hod/reports?reportType=defaulter"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Below 75%
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-600">{metrics.studentsBelow75}</span>
            <span className="text-[11px] text-slate-400 ml-1.5 font-medium">Students</span>
          </div>
          <p className="mt-1 text-[10px] text-amber-600 font-medium flex items-center">
            <span>View Defaulters</span>
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </p>
        </Link>

        {/* At-Risk Students (< 65%) */}
        <Link
          to="/hod/counseling/at-risk"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              At Risk (&lt;65%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-600">{metrics.atRiskStudents}</span>
            <span className="text-[11px] text-slate-400 ml-1.5 font-medium">Critical</span>
          </div>
          <p className="mt-1 text-[10px] text-rose-600 font-medium flex items-center">
            <span>Intervention Required</span>
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </p>
        </Link>

        {/* Pending Corrections */}
        <Link
          to="/hod/attendance/corrections"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Corrections
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-indigo-600">{metrics.pendingCorrections}</span>
            <span className="text-[11px] text-slate-400 ml-1.5 font-medium">Pending</span>
          </div>
          <p className="mt-1 text-[10px] text-indigo-600 font-medium flex items-center">
            <span>Review Requests</span>
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </p>
        </Link>
      </div>

      {/* 3. Attention Required Section */}
      {attentionRequired && attentionRequired.length > 0 && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Department Alerts & Attention Required
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              {attentionRequired.length} action items requiring HOD review
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {attentionRequired.map((item) => (
              <Link
                key={item.id}
                to={item.link}
                className="bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-3.5 rounded-lg transition-colors flex items-start space-x-3 group"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                    item.type === 'danger'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : item.type === 'warning'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {item.count}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{item.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors mt-1" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 4. Analytics & Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section-Wise Attendance Comparison */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Section-Wise Attendance Comparison
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Average attendance across department sections</p>
            </div>
            <Link
              to="/hod/attendance"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              <span>Monitor All</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {charts.sectionWiseAttendance.map((sec) => (
              <div key={sec.section} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800">{sec.section}</span>
                    <span className="text-[11px] text-slate-400">({sec.studentCount} students)</span>
                  </div>
                  <span
                    className={`font-mono font-bold ${
                      sec.percentage >= 75
                        ? 'text-emerald-600'
                        : sec.percentage >= 65
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {sec.percentage}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sec.percentage >= 75
                        ? 'bg-emerald-500'
                        : sec.percentage >= 65
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, sec.percentage))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Section Attendance Benchmark Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-1.5"></span> &ge;75% Good
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full mr-1.5"></span> 65-74% Warning
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full mr-1.5"></span> &lt;65% At-Risk
              </span>
            </div>
            <span className="font-mono text-slate-400">Statutory Threshold: 75%</span>
          </div>
        </div>

        {/* Student Risk Distribution Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Student Risk Distribution
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Department attendance compliance</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">{totalEvaluated} Total</span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner mb-4">
              <div
                style={{ width: `${goodPct}%` }}
                className="bg-emerald-500 h-full"
                title={`Good (${riskDistribution.good} students)`}
              ></div>
              <div
                style={{ width: `${warningPct}%` }}
                className="bg-amber-500 h-full"
                title={`Warning (${riskDistribution.warning} students)`}
              ></div>
              <div
                style={{ width: `${atRiskPct}%` }}
                className="bg-rose-500 h-full"
                title={`At-Risk (${riskDistribution.atRisk} students)`}
              ></div>
            </div>

            {/* Breakdown Legend Cards */}
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Good Standing</p>
                    <p className="text-[10px] text-emerald-700">&ge;75% Attendance</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-900">{riskDistribution.good}</span>
                  <span className="text-[10px] text-emerald-600 ml-1 font-mono">({goodPct}%)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div>
                    <p className="text-xs font-bold text-amber-900">Warning Zone</p>
                    <p className="text-[10px] text-amber-700">65% - 74.9% Attendance</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-amber-900">{riskDistribution.warning}</span>
                  <span className="text-[10px] text-amber-600 ml-1 font-mono">({warningPct}%)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div>
                    <p className="text-xs font-bold text-rose-900">Critical At-Risk</p>
                    <p className="text-[10px] text-rose-700">&lt;65% Attendance</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-rose-900">{riskDistribution.atRisk}</span>
                  <span className="text-[10px] text-rose-600 ml-1 font-mono">({atRiskPct}%)</span>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/hod/counseling/at-risk"
            className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold text-center transition-colors block"
          >
            Review At-Risk Students &rarr;
          </Link>
        </div>
      </div>

      {/* 5. Subject-Wise Attendance & Attendance Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject-Wise Attendance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Subject-Wise Attendance Breakdown
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Average attendance across department courses</p>
            </div>
            <Link
              to="/hod/reports?reportType=department_attendance"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Report View &rarr;
            </Link>
          </div>

          <div className="space-y-3.5">
            {charts.subjectWiseAttendance.map((sub) => (
              <div key={sub.courseCode} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 mr-2">{sub.courseCode}</span>
                    <span className="text-xs text-slate-600 truncate">{sub.courseName}</span>
                  </div>
                  <span
                    className={`font-mono font-bold text-xs ${
                      sub.percentage >= 75
                        ? 'text-emerald-600'
                        : sub.percentage >= 65
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {sub.percentage}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      sub.percentage >= 75
                        ? 'bg-emerald-500'
                        : sub.percentage >= 65
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, sub.percentage))}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>{sub.totalClasses} total student attendance instances</span>
                  <span>Target: 75%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Attendance Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Department Attendance Trend
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Timeline of recent class session submissions</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Past 10 Dates</span>
            </div>

            {charts.attendanceTrend && charts.attendanceTrend.length > 0 ? (
              <div className="space-y-2">
                {charts.attendanceTrend.map((t) => (
                  <div key={t.date} className="flex items-center space-x-3 text-xs">
                    <span className="font-mono text-[11px] text-slate-500 w-24 flex-shrink-0">
                      {t.date}
                    </span>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          t.percentage >= 75
                            ? 'bg-indigo-600'
                            : t.percentage >= 65
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(10, t.percentage))}%` }}
                      ></div>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-800 w-12 text-right">
                      {t.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No recent attendance records found.
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Faculty Submissions: {charts.facultyActivity?.submittedAssignments || 0} active</span>
            <Link
              to="/hod/attendance"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Monitor Live Sessions &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HodDashboardPage;
