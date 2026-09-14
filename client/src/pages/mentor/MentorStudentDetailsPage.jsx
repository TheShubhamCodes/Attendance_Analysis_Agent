import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  ArrowLeft,
  User,
  BookOpen,
  AlertTriangle,
  HeartHandshake,
  Phone,
  Mail,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  Plus,
  Send,
  Sparkles,
  Award,
} from 'lucide-react';

export const MentorStudentDetailsPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);
  const [savingIntervention, setSavingIntervention] = useState(false);
  const [interventionFormError, setInterventionFormError] = useState('');

  // Intervention Form
  const [interventionForm, setInterventionForm] = useState({
    type: 'COUNSELLING',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    actionTaken: '',
    followUpDate: '',
    outcome: '',
    status: 'COMPLETED',
  });

  // Parent Communication Form
  const [parentForm, setParentForm] = useState({
    channel: 'SMS',
    notes: '',
  });
  const [savingParentComm, setSavingParentComm] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/mentor/students/${studentId}`);
      if (res.data?.success) {
        setStudentData(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to load student details.');
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Forbidden: You only have access to your assigned students.');
      } else {
        setError(err.response?.data?.message || 'Server error loading student.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [studentId]);

  const handleCreateIntervention = async (e) => {
    e.preventDefault();
    setInterventionFormError('');
    setSavingIntervention(true);

    try {
      const res = await api.post('/mentor/interventions', {
        studentId,
        ...interventionForm,
      });

      if (res.data?.success) {
        setShowInterventionModal(false);
        setInterventionForm({
          type: 'COUNSELLING',
          date: new Date().toISOString().split('T')[0],
          notes: '',
          actionTaken: '',
          followUpDate: '',
          outcome: '',
          status: 'COMPLETED',
        });
        await fetchDetails();
      } else {
        setInterventionFormError(res.data?.message || 'Failed to record intervention.');
      }
    } catch (err) {
      setInterventionFormError(err.response?.data?.message || 'Server error recording intervention.');
    } finally {
      setSavingIntervention(false);
    }
  };

  const handleRecordParentCommunication = async (e) => {
    e.preventDefault();
    setSavingParentComm(true);
    try {
      const res = await api.post('/mentor/parent-communication', {
        studentId,
        channel: parentForm.channel,
        notes: parentForm.notes,
      });
      if (res.data?.success) {
        setShowParentModal(false);
        setParentForm({ channel: 'SMS', notes: '' });
        await fetchDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record parent communication.');
    } finally {
      setSavingParentComm(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500">Loading student dossier...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
        <Link
          to="/mentor/students"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-teal-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to My Students</span>
        </Link>
      </div>
    );
  }

  const { student, attendance, risk, interventions = [], parentInfo } = studentData || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back link & Top actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/mentor/students"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Students</span>
        </Link>

        <div className="flex items-center gap-2">
          {parentInfo && (
            <button
              type="button"
              onClick={() => setShowParentModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-teal-500" />
              <span>Contact Parent</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowInterventionModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Intervention</span>
          </button>
        </div>
      </div>

      {/* Student Profile & Quick Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold text-xl border border-teal-200 dark:border-teal-800/60">
              {student.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  {student.name}
                </h1>
                <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                  {student.registrationNumber}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>{student.department?.name}</span>
                <span>•</span>
                <span>Section {student.section}</span>
                <span>•</span>
                <span>Year {student.year} (Semester {student.semester})</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center min-w-[90px]">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Raw Attn</div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {attendance.rawPercentage}%
              </div>
            </div>

            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50 rounded-xl text-center min-w-[90px]">
              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold uppercase">Adjusted</div>
              <div className="text-lg font-black text-teal-700 dark:text-teal-300">
                {attendance.adjustedPercentage}%
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center min-w-[90px]">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Projected</div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {risk.projectedAttendance}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 1. Attendance & Subject Breakdown | 2. Risk & Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Attendance Metrics & Subjects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Attended Sessions</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {attendance.presentClasses} <span className="text-xs text-slate-400 font-normal">/ {attendance.totalClasses}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Absent Sessions</div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {attendance.absentClasses}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Approved OD</div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {attendance.approvedOdPeriods} <span className="text-xs text-slate-400 font-normal">periods</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Approved Leave</div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {attendance.approvedLeavePeriods} <span className="text-xs text-slate-400 font-normal">periods</span>
              </div>
            </div>
          </div>

          {/* Subject-Wise Attendance Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>Subject-Wise Attendance Breakdown</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {attendance.subjectWise?.length || 0} Registered Courses
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3">Course</th>
                    <th className="px-4 py-3 text-center">Raw Attn</th>
                    <th className="px-4 py-3 text-center">Adjusted</th>
                    <th className="px-4 py-3 text-center">Attended / Total</th>
                    <th className="px-4 py-3 text-center">Exemptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendance.subjectWise?.map((sub, idx) => {
                    const isDeficit = sub.adjustedPercentage < 75;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-5 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">{sub.courseName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{sub.courseCode}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                          {sub.rawPercentage}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`font-black ${
                              isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {sub.adjustedPercentage}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                          {sub.attended} / {sub.total}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">
                          OD: {sub.approvedOd || 0} | L: {sub.approvedLeave || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Col 3: Risk & Trajectory Analysis */}
        <div className="space-y-6">
          {/* Risk Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span>Risk & Trajectory Analysis</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Risk Classification</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded ${
                    risk.riskLevel === 'HIGH_RISK'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : risk.riskLevel === 'MEDIUM_RISK'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {risk.riskLevel.replace('_', ' ')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Trend Direction</span>
                <span className="font-bold flex items-center space-x-1">
                  {risk.trendDirection === 'IMPROVING' ? (
                    <span className="text-emerald-600 flex items-center space-x-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Improving (+{risk.trendSlope})</span>
                    </span>
                  ) : risk.trendDirection === 'DECLINING' ? (
                    <span className="text-rose-600 flex items-center space-x-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Declining ({risk.trendSlope})</span>
                    </span>
                  ) : (
                    <span className="text-slate-600 flex items-center space-x-1">
                      <Minus className="w-3.5 h-3.5" />
                      <span>Stable</span>
                    </span>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Projected End-Semester</span>
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {risk.projectedAttendance}%
                </span>
              </div>

              {risk.riskReason && (
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  <span className="font-bold">Evaluation Reason: </span>
                  {risk.riskReason}
                </div>
              )}
            </div>
          </div>

          {/* Parent Contact Card (Authorized Only) */}
          {parentInfo && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 mb-3">
                <Phone className="w-4 h-4 text-teal-600" />
                <span>Authorized Parent Contact</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">{parentInfo.name}</div>
                <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{parentInfo.mobile || 'Not available'}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{parentInfo.email || 'Not available'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interventions & Effectiveness History Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <HeartHandshake className="w-4 h-4 text-teal-600" />
              <span>Interventions & Counseling History</span>
            </h3>
            <p className="text-xs text-slate-500">
              Tracks counseling logs and records observed attendance before vs. after intervention
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInterventionModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Session</span>
          </button>
        </div>

        {interventions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No counseling or interventions recorded yet for this mentee.
          </div>
        ) : (
          <div className="space-y-3">
            {interventions.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {inv.type.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                      {inv.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(inv.date).toLocaleDateString()}</span>
                  </div>
                </div>

                {inv.notes && (
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-white">Discussion / Notes: </span>
                    {inv.notes}
                  </p>
                )}

                {inv.actionTaken && (
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-white">Action Taken: </span>
                    {inv.actionTaken}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                  {inv.followUpDate && (
                    <div className="text-amber-700 dark:text-amber-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Follow-up: {new Date(inv.followUpDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {inv.outcome && (
                    <div className="text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">Outcome: </span>
                      {inv.outcome}
                    </div>
                  )}

                  {/* Observed Attendance Improvement Before vs After */}
                  {inv.attendanceBefore !== null && inv.attendanceBefore !== undefined && (
                    <div className="ml-auto flex items-center space-x-3 bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                      <span>Before: {inv.attendanceBefore}%</span>
                      <span>→</span>
                      <span>Now: {inv.attendanceAfter || attendance.adjustedPercentage}%</span>
                      {inv.improvement !== null && (
                        <span
                          className={`font-bold ${
                            inv.improvement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                          }`}
                        >
                          ({inv.improvement >= 0 ? `+${inv.improvement}` : inv.improvement}% pts)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Intervention Modal */}
      {showInterventionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <HeartHandshake className="w-5 h-5 text-teal-600" />
              <span>Record Counseling Session</span>
            </h3>

            {interventionFormError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs">
                {interventionFormError}
              </div>
            )}

            <form onSubmit={handleCreateIntervention} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Intervention Type
                </label>
                <select
                  value={interventionForm.type}
                  onChange={(e) => setInterventionForm({ ...interventionForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="COUNSELLING">Counselling</option>
                  <option value="MENTOR_MEETING">Mentor Meeting</option>
                  <option value="PARENT_COMMUNICATION">Parent Communication</option>
                  <option value="WARNING">Warning</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date Conducted
                  </label>
                  <input
                    type="date"
                    required
                    value={interventionForm.date}
                    onChange={(e) => setInterventionForm({ ...interventionForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={interventionForm.followUpDate}
                    onChange={(e) => setInterventionForm({ ...interventionForm, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Discussion Notes & Observations
                </label>
                <textarea
                  required
                  rows={3}
                  value={interventionForm.notes}
                  onChange={(e) => setInterventionForm({ ...interventionForm, notes: e.target.value })}
                  placeholder="Summarize reasons discussed with student (illness, lack of interest, personal issues)..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Action Taken / Commitment
                </label>
                <input
                  type="text"
                  value={interventionForm.actionTaken}
                  onChange={(e) => setInterventionForm({ ...interventionForm, actionTaken: e.target.value })}
                  placeholder="e.g. Student committed to attend 100% of upcoming laboratory and theory classes"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={interventionForm.status}
                    onChange={(e) => setInterventionForm({ ...interventionForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FOLLOW_UP_REQUIRED">Follow-up Required</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Outcome
                  </label>
                  <input
                    type="text"
                    value={interventionForm.outcome}
                    onChange={(e) => setInterventionForm({ ...interventionForm, outcome: e.target.value })}
                    placeholder="e.g. Cooperative, Agreed"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInterventionModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingIntervention}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  {savingIntervention ? 'Saving...' : 'Save Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Parent Communication Modal */}
      {showParentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Phone className="w-5 h-5 text-teal-600" />
              <span>Record Parent Communication</span>
            </h3>
            <p className="text-xs text-slate-500">
              Communicating with {parentInfo?.name} regarding {student.name}'s attendance status.
            </p>

            <form onSubmit={handleRecordParentCommunication} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Communication Channel
                </label>
                <select
                  value={parentForm.channel}
                  onChange={(e) => setParentForm({ ...parentForm, channel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="PHONE_CALL">Phone Call</option>
                  <option value="SMS">SMS Alert</option>
                  <option value="EMAIL">Email</option>
                  <option value="IN_PERSON">In-Person Meeting</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Discussion Summary / Outcome
                </label>
                <textarea
                  required
                  rows={3}
                  value={parentForm.notes}
                  onChange={(e) => setParentForm({ ...parentForm, notes: e.target.value })}
                  placeholder="Informed parent of low attendance. Parent acknowledged and promised to ensure regular attendance..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowParentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingParentComm}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  {savingParentComm ? 'Recording...' : 'Record Communication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorStudentDetailsPage;
