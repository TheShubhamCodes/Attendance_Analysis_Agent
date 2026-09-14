import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AgentDashboardCard from '../../components/common/AgentDashboardCard';
import {
  Layers,
  Users,
  Percent,
  AlertTriangle,
  ShieldAlert,
  ClipboardCheck,
  ArrowRight,
  TrendingDown,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export const FacultyDashboardPage = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/faculty/dashboard');
        if (res.data?.success) {
          setDashboardData(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading Counselor & Academic Dashboard..." />;
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        <p className="font-semibold">Error Loading Faculty Dashboard</p>
        <p className="mt-1 text-xs">{error}</p>
      </div>
    );
  }

  const { facultyName, employeeId, department, stats, defaulters = [], recentSessions = [] } = dashboardData || {};

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Counselor & Class In-Charge Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Welcome, {facultyName}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
              Department of {department} • Employee ID: <span className="font-mono text-cyan-400 font-semibold">{employeeId}</span>. All student metrics below are strictly scoped to your assigned counselor cohort.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/faculty/attendance/mark')}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Mark Today's Attendance</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Attendance Analysis Agent Quick Card */}
      <AgentDashboardCard />

      {/* 5 Primary Counselor KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* 1. My Classes */}
        <div
          onClick={() => navigate('/faculty/classes')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              My Classes
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">{stats?.myClassesCount || 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Assigned course sections</p>
          </div>
        </div>

        {/* 2. Counselor Students */}
        <div
          onClick={() => navigate('/faculty/at-risk-students')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Counselor Students
            </span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">{stats?.counselorStudentsCount || 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Under direct mentorship</p>
          </div>
        </div>

        {/* 3. Average Attendance */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Average Attendance
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">
              {stats?.averageAttendance || 0}%
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              Counselor cohort average
            </p>
          </div>
        </div>

        {/* 4. Below 75% Defaulters */}
        <div
          onClick={() => navigate('/faculty/at-risk-students?riskLevel=WARNING')}
          className="bg-white border border-amber-200 rounded-xl p-4 shadow-xs hover:border-amber-400 transition-all cursor-pointer group bg-gradient-to-br from-white to-amber-50/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Below 75%
            </span>
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-amber-900">{stats?.below75Count || 0}</p>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">Attendance warning</p>
          </div>
        </div>

        {/* 5. At-Risk Students (<65%) */}
        <div
          onClick={() => navigate('/faculty/at-risk-students?riskLevel=HIGH_RISK')}
          className="bg-white border border-rose-200 rounded-xl p-4 shadow-xs hover:border-rose-400 transition-all cursor-pointer group bg-gradient-to-br from-white to-rose-50/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              At-Risk (&lt; 65%)
            </span>
            <div className="p-2 bg-rose-100 rounded-lg text-rose-700 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-rose-900">{stats?.atRiskCount || 0}</p>
            <p className="text-[11px] text-rose-700 font-medium mt-0.5">Severe deficit / Urgent</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Defaulters List & Recent Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Defaulter Counselor Students */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Counselor Defaulters List (&lt; 75% Attendance)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Students assigned to your counseling mentorship who require immediate academic intervention.
              </p>
            </div>
            <button
              onClick={() => navigate('/faculty/at-risk-students')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {defaulters.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="font-semibold text-slate-700">All Counselor Students In Good Standing</p>
              <p className="text-slate-400 mt-1">None of your assigned counselor students have fallen below 75%.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead>
                  <tr className="text-slate-500 text-left font-semibold uppercase tracking-wider bg-slate-50/60">
                    <th className="py-2.5 px-3">Reg. Number</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Attendance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {defaulters.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {s.registrationNumber}
                      </td>
                      <td className="py-3 px-3">{s.name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">
                          Sec {s.section}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-bold font-mono ${
                              s.isAtRisk ? 'text-rose-600' : 'text-amber-600'
                            }`}
                          >
                            {s.attendancePercentage}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                s.isAtRisk ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, s.attendancePercentage)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {s.isAtRisk ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            High Risk
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Defaulter
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => navigate(`/faculty/interventions`)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Intervene
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Column: Recent Attendance Sessions */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Recent Class Sessions</span>
              </h2>
              <button
                onClick={() => navigate('/faculty/attendance/history')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                History
              </button>
            </div>

            {recentSessions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No recent attendance recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">
                        {session.courseCode} • Sec {session.section}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Period {session.period}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span>{session.date}</span>
                      <span className="font-semibold text-slate-700">
                        <span className="text-emerald-600 font-bold">{session.present} P</span> /{' '}
                        <span className="text-rose-600 font-bold">{session.absent} A</span> (
                        {session.total})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Guidance Box */}
          <div className="mt-5 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
            <div className="flex items-start space-x-2">
              <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">University Attendance Mandate</p>
                <p className="text-[11px] text-blue-800/80 mt-0.5 leading-relaxed">
                  Students maintaining below 75% attendance are automatically flagged for semester exam debarment. Schedule counseling interventions promptly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboardPage;
