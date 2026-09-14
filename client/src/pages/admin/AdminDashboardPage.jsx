import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Users,
  GraduationCap,
  Briefcase,
  UserCheck,
  HeartHandshake,
  Layers,
  FileCheck2,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/dashboard');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setError('Unable to load real-time metrics from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-400">Loading system metrics from database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-2xl text-rose-300 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-6 h-6 text-rose-400" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-rose-900/60 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const counts = data?.counts || {};
  const atRisk = data?.atRiskStudents || [];
  const recentAtt = data?.recentAttendanceActivity || [];
  const recentUsers = data?.recentUsers || [];
  const hods = data?.currentHods || [];
  const recentLogs = data?.recentAuditLogs || [];

  const statCards = [
    { label: 'Total Students', value: counts.totalStudents || 0, icon: GraduationCap, color: 'from-blue-600 to-cyan-600', link: '/admin/students' },
    { label: 'Total Faculty', value: counts.totalFaculty || 0, icon: Briefcase, color: 'from-emerald-600 to-teal-600', link: '/admin/faculty' },
    { label: 'Total HODs', value: counts.totalHods || 0, icon: UserCheck, color: 'from-purple-600 to-indigo-600', link: '/admin/hod' },
    { label: 'Total Parents', value: counts.totalParents || 0, icon: HeartHandshake, color: 'from-pink-600 to-rose-600', link: '/admin/parents' },
    { label: 'Departments', value: counts.totalDepartments || 0, icon: Layers, color: 'from-amber-600 to-orange-600', link: '/admin/academics' },
    { label: 'Academic Sections', value: counts.totalSections || 0, icon: Calendar, color: 'from-violet-600 to-purple-600', link: '/admin/academics' },
    { label: 'Active Subjects', value: counts.totalSubjects || 0, icon: FileCheck2, color: 'from-indigo-600 to-blue-600', link: '/admin/academics' },
    { label: 'Attendance Records', value: counts.totalAttendanceRecords || 0, icon: Activity, color: 'from-teal-600 to-emerald-600', link: '/admin/attendance' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-900/40 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Enterprise Admin Control Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            System Administration Overview
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Live database visibility across students, faculty rosters, HOD assignments, academic configuration, and system-wide attendance records.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboard}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Data</span>
          </button>
          <Link
            to="/admin/agent"
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Agent Console</span>
          </Link>
        </div>
      </div>

      {/* 8 Primary Real-time Stat Cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
          Core Database Aggregates
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                to={card.link}
                className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">{card.label}</span>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-white group-hover:text-purple-300 transition-colors">
                    {card.value.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                    <span>Manage records</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Two Column Grid: At-Risk Students & Current HODs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* At-Risk Students Watchlist */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Students Below 75% Attendance</h3>
                  <p className="text-xs text-slate-400">Identified {counts.studentsAtRisk || 0} students at risk</p>
                </div>
              </div>
              <Link
                to="/admin/attendance"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {atRisk.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No students currently falling below the 75% threshold.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {atRisk.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{s.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {s.registrationNumber} • Sec {s.section} • {s.department?.code}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-1 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-xs font-black">
                        {s.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Current HOD Assignments */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Current Department HODs</h3>
                  <p className="text-xs text-slate-400">Active administrative appointments</p>
                </div>
              </div>
              <Link
                to="/admin/hod"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1"
              >
                <span>Change HOD</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-800/80">
              {hods.map((h) => (
                <div key={h.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{h.name}</p>
                    <p className="text-[11px] text-indigo-300 font-medium">
                      {h.department} ({h.departmentCode})
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    ID: {h.employeeId}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Attendance Activity & Recent Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance Records */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Recent Attendance Logs</h3>
                <p className="text-xs text-slate-400">Latest session entries</p>
              </div>
            </div>
            <Link
              to="/admin/attendance"
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800/80 text-xs">
            {recentAtt.map((att) => (
              <div key={att.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">
                    {att.student?.name} <span className="text-slate-500 font-mono">({att.student?.registrationNumber})</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {att.course?.courseCode} • Period {att.period} • {new Date(att.date).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    att.status === 'PRESENT'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                      : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                  }`}
                >
                  {att.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">System Audit Log Feed</h3>
                <p className="text-xs text-slate-400">Administrative activity history</p>
              </div>
            </div>
            <Link
              to="/admin/audit-logs"
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1"
            >
              <span>Full audit</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800/80 text-xs">
            {recentLogs.length === 0 ? (
              <p className="text-slate-500 py-6 text-center">No administrative actions logged yet.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-bold mr-2">
                      {log.action}
                    </span>
                    <span className="text-slate-300 font-medium">{log.targetName || log.targetType}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
