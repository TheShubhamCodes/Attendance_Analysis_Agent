import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Users,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  HeartHandshake,
  ArrowRight,
  Clock,
  Calendar,
  Sparkles,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

export const MentorDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get('/mentor/dashboard');
        if (res.data?.success) {
          setData(res.data.data);
        } else {
          setError(res.data?.message || 'Failed to load dashboard data.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error connecting to server.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Loading mentor workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400 text-sm">
        {error}
      </div>
    );
  }

  const {
    totalAssignedStudents = 0,
    studentsAbove75 = 0,
    studentsBelow75 = 0,
    atRiskStudents = 0,
    highRiskStudents = 0,
    studentsImproving = 0,
    studentsNeedingIntervention = 0,
    averageAttendance = 0,
    riskDistribution = { safe: 0, low: 0, medium: 0, high: 0 },
    recentInterventions = [],
    followUpsNeedingAttention = [],
    improvingStudents = [],
    mentorProfile,
  } = data || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-emerald-500/20 rounded-full border border-emerald-400/30 text-[11px] font-semibold tracking-wide uppercase mb-2">
              <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Assigned Mentorship Workspace</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Welcome, {mentorProfile?.name || 'Mentor'}
            </h1>
            <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
              Monitor academic attendance trajectories, proactively counsel students at risk, and measure the real impact of interventions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/mentor/agent"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Ask Agent</span>
            </Link>
          </div>
        </div>
      </div>

      {/* No Students Assigned Notice */}
      {totalAssignedStudents === 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-amber-900 dark:text-amber-300">
            No students are currently assigned to you.
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1 max-w-md mx-auto">
            Your department head or administrator will assign mentees to you. Once assigned, their live attendance trends and risk assessments will populate here.
          </p>
        </div>
      )}

      {/* Key Metrics Cards (7 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Total Assigned */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Assigned</span>
            <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalAssignedStudents}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">Total mentees</div>
        </div>

        {/* Above 75% */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">≥ 75% Safe</span>
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {studentsAbove75}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">Eligible for exams</div>
        </div>

        {/* Below 75% */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">&lt; 75% Short</span>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {studentsBelow75}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">Attendance shortage</div>
        </div>

        {/* At-Risk */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">At-Risk</span>
            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
            {atRiskStudents}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">Predicted deficit</div>
        </div>

        {/* High-Risk */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">High-Risk</span>
            <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {highRiskStudents}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">Immediate action</div>
        </div>

        {/* Improving */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Improving</span>
            <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
            {studentsImproving}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">Positive trajectory</div>
        </div>

        {/* Requiring Intervention */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Intervene</span>
            <HeartHandshake className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {studentsNeedingIntervention}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">Need counselling</div>
        </div>
      </div>

      {/* Main Grid: Overview & Follow-Ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Risk & Trajectory Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk Distribution Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Risk Classification Distribution
                </h3>
                <p className="text-xs text-slate-500">
                  Calculated from multi-session attendance trajectories and projected end-of-semester margins
                </p>
              </div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                Avg: {averageAttendance}%
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {riskDistribution.safe}
                </div>
                <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">Safe</div>
                <div className="text-[10px] text-emerald-600/80">&gt; 75% Stable</div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50">
                <div className="text-xl font-bold text-cyan-700 dark:text-cyan-400">
                  {riskDistribution.low}
                </div>
                <div className="text-[11px] font-semibold text-cyan-800 dark:text-cyan-300 mt-0.5">Low Risk</div>
                <div className="text-[10px] text-cyan-600/80">70% - 75%</div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {riskDistribution.medium}
                </div>
                <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 mt-0.5">Medium Risk</div>
                <div className="text-[10px] text-amber-600/80">65% - 70%</div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50">
                <div className="text-xl font-bold text-rose-700 dark:text-rose-400">
                  {riskDistribution.high}
                </div>
                <div className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 mt-0.5">High Risk</div>
                <div className="text-[10px] text-rose-600/80">&lt; 65% Critical</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Identified using Attendance Analysis Agent trajectory regression
              </span>
              <Link
                to="/mentor/at-risk"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center space-x-1"
              >
                <span>View All At-Risk</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Attendance Improvement Trends */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Observed Attendance Improvement
                </h3>
                <p className="text-xs text-slate-500">
                  Mentees showing upward attendance momentum after counseling interventions
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                {improvingStudents.length} Improving
              </span>
            </div>

            {improvingStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No students currently marked with improving momentum. Continue counseling sessions.
              </div>
            ) : (
              <div className="space-y-2.5">
                {improvingStudents.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{s.registrationNumber} • Sec {s.section}</div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {s.currentAttendance}%
                        </div>
                        <div className="text-[10px] text-slate-400">Proj: {s.projectedAttendance}%</div>
                      </div>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        <TrendingUp className="w-3 h-3" />
                        <span>Improving</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Follow-ups & Recent Interventions */}
        <div className="space-y-6">
          {/* Action Required: Follow-Ups */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Follow-Up Reminders</span>
              </h3>
              <span className="text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                {followUpsNeedingAttention.length} Pending
              </span>
            </div>

            {followUpsNeedingAttention.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                All planned follow-ups are up to date!
              </div>
            ) : (
              <div className="space-y-2.5">
                {followUpsNeedingAttention.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>{f.student?.name}</span>
                      <span className="text-[10px] font-normal text-amber-700 dark:text-amber-400">
                        Due: {new Date(f.followUpDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {f.notes || f.actionTaken || 'Follow-up scheduled.'}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Link
                        to={`/mentor/students/${f.studentId}`}
                        className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                      >
                        Review Student →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Interventions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <HeartHandshake className="w-4 h-4 text-emerald-500" />
                <span>Recent Interventions</span>
              </h3>
              <Link
                to="/mentor/interventions"
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                View All
              </Link>
            </div>

            {recentInterventions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No interventions recorded yet. Click on any student to record a counseling session.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentInterventions.map((i) => (
                  <div
                    key={i.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {i.student?.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(i.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400">
                        {i.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Status: {i.status.replace('_', ' ')}
                      </span>
                    </div>
                    {i.improvement !== null && i.improvement !== undefined && (
                      <div className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Change: {i.improvement >= 0 ? `+${i.improvement}` : i.improvement}% points
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorDashboardPage;
