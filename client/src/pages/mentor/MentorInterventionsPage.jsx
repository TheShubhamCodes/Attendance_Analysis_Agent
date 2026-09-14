import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  HeartHandshake,
  Calendar,
  Clock,
  CheckCircle,
  Plus,
  Filter,
  TrendingUp,
  Search,
  ExternalLink,
  Edit2,
} from 'lucide-react';

export const MentorInterventionsPage = () => {
  const [interventions, setInterventions] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for New / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingInterventionId, setEditingInterventionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    studentId: '',
    type: 'COUNSELLING',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    actionTaken: '',
    followUpDate: '',
    outcome: '',
    status: 'COMPLETED',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [invRes, stuRes] = await Promise.all([
        api.get('/mentor/interventions'),
        api.get('/mentor/students'),
      ]);

      if (invRes.data?.success) {
        setInterventions(invRes.data.data.interventions || []);
      }
      if (stuRes.data?.success) {
        setAssignedStudents(stuRes.data.data.students || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load interventions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return interventions.filter((i) => {
      const q = searchTerm.toLowerCase().trim();
      const matchQ =
        !q ||
        i.student?.name?.toLowerCase().includes(q) ||
        i.student?.registrationNumber?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q);

      if (!matchQ) return false;
      if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && i.type !== typeFilter) return false;
      return true;
    });
  }, [interventions, searchTerm, statusFilter, typeFilter]);

  const openCreateModal = () => {
    setEditingInterventionId(null);
    setForm({
      studentId: assignedStudents[0]?.id || '',
      type: 'COUNSELLING',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      actionTaken: '',
      followUpDate: '',
      outcome: '',
      status: 'COMPLETED',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (inv) => {
    setEditingInterventionId(inv.id);
    setForm({
      studentId: inv.studentId,
      type: inv.type,
      date: new Date(inv.date).toISOString().split('T')[0],
      notes: inv.notes || '',
      actionTaken: inv.actionTaken || '',
      followUpDate: inv.followUpDate ? new Date(inv.followUpDate).toISOString().split('T')[0] : '',
      outcome: inv.outcome || '',
      status: inv.status,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (editingInterventionId) {
        const res = await api.put(`/mentor/interventions/${editingInterventionId}`, form);
        if (res.data?.success) {
          setShowModal(false);
          await fetchData();
        } else {
          setFormError(res.data?.message || 'Failed to update intervention.');
        }
      } else {
        const res = await api.post('/mentor/interventions', form);
        if (res.data?.success) {
          setShowModal(false);
          await fetchData();
        } else {
          setFormError(res.data?.message || 'Failed to create intervention.');
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Server error saving intervention.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <HeartHandshake className="w-5 h-5 text-teal-600" />
            <span>Intervention & Counseling Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Log counselling sessions, track action plans, and monitor verified attendance improvement over time.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={assignedStudents.length === 0}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Intervention</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student or notes..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="COMPLETED">Completed</option>
            <option value="FOLLOW_UP_REQUIRED">Follow-up Required</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
          >
            <option value="ALL">All Types</option>
            <option value="COUNSELLING">Counselling</option>
            <option value="MENTOR_MEETING">Mentor Meeting</option>
            <option value="PARENT_COMMUNICATION">Parent Communication</option>
            <option value="WARNING">Warning</option>
            <option value="FOLLOW_UP">Follow-up</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Loading intervention records...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <HeartHandshake className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No interventions match the selected criteria
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Click "New Intervention" to record a counseling session for an assigned mentee.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div
              key={inv.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/mentor/students/${inv.studentId}`}
                        className="font-bold text-slate-900 dark:text-white hover:underline text-sm"
                      >
                        {inv.student?.name}
                      </Link>
                      <span className="font-mono text-[11px] text-slate-400 font-semibold">
                        ({inv.student?.registrationNumber})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Sec {inv.student?.section} • Year {inv.student?.year}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    {inv.type.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inv.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : inv.status === 'FOLLOW_UP_REQUIRED'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {inv.status.replace('_', ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditModal(inv)}
                    className="p-1 text-slate-400 hover:text-teal-600 transition-colors"
                    title="Edit Intervention"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {inv.notes && (
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-900 dark:text-white">Discussion Notes: </span>
                  {inv.notes}
                </p>
              )}

              {inv.actionTaken && (
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-900 dark:text-white">Action Taken: </span>
                  {inv.actionTaken}
                </p>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Conducted: {new Date(inv.date).toLocaleDateString()}</span>
                  </span>

                  {inv.followUpDate && (
                    <span className="flex items-center space-x-1 text-amber-700 dark:text-amber-400 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Follow-up: {new Date(inv.followUpDate).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>

                {/* Track Attendance Improvement */}
                {inv.attendanceBefore !== null && inv.attendanceBefore !== undefined && (
                  <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                    <span>Attendance Before: <strong className="text-slate-900 dark:text-white">{inv.attendanceBefore}%</strong></span>
                    <span>→</span>
                    <span>Current: <strong className="text-slate-900 dark:text-white">{inv.attendanceAfter || '—'}%</strong></span>
                    {inv.improvement !== null && (
                      <span
                        className={`font-bold ${
                          inv.improvement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                        }`}
                      >
                        ({inv.improvement >= 0 ? `+${inv.improvement}` : inv.improvement}% points)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <HeartHandshake className="w-5 h-5 text-teal-600" />
              <span>{editingInterventionId ? 'Update Intervention' : 'Record New Intervention'}</span>
            </h3>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {!editingInterventionId && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Assigned Student
                  </label>
                  <select
                    required
                    value={form.studentId}
                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="">-- Choose Student --</option>
                    {assignedStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.registrationNumber}) - {s.overallAttendance}% Attn
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Intervention Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
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
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={form.followUpDate}
                    onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
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
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Summarize reasons discussed with mentee..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Action Taken
                </label>
                <input
                  type="text"
                  value={form.actionTaken}
                  onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
                  placeholder="Action taken or commitment made..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
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
                    Outcome
                  </label>
                  <input
                    type="text"
                    value={form.outcome}
                    onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                    placeholder="Outcome note..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  {submitting ? 'Saving...' : 'Save Intervention'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorInterventionsPage;
