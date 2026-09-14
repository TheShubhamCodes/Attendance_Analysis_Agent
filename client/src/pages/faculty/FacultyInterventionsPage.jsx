import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  ShieldCheck,
  Plus,
  Filter,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  X,
  Edit2,
  MessageSquare,
} from 'lucide-react';

export const FacultyInterventionsPage = () => {
  const [searchParams] = useSearchParams();

  const [interventions, setInterventions] = useState([]);
  const [counselorStudents, setCounselorStudents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New intervention modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studentId: searchParams.get('studentId') || '',
    type: 'ATTENDANCE_COUNSELLING',
    description: '',
    date: new Date().toISOString().split('T')[0],
    followUpDate: '',
    status: 'SCHEDULED',
  });

  // Edit status modal
  const [editingIntervention, setEditingIntervention] = useState(null);
  const [editStatus, setEditStatus] = useState('IN_PROGRESS');
  const [editFollowUpDate, setEditFollowUpDate] = useState('');

  const fetchInterventions = async () => {
    setLoading(true);
    try {
      const query = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
      const res = await api.get(`/faculty/interventions${query}`);
      if (res.data?.success) {
        setInterventions(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load interventions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCounselorStudents = async () => {
    try {
      const res = await api.get('/faculty/predictor');
      if (res.data?.success) {
        setCounselorStudents(res.data.data);
        if (!formData.studentId && res.data.data.length > 0) {
          setFormData((prev) => ({ ...prev, studentId: res.data.data[0].id }));
        }
      }
    } catch (e) {
      // Silently fail
    }
  };

  useEffect(() => {
    fetchInterventions();
    fetchCounselorStudents();
  }, [statusFilter]);

  const handleCreateIntervention = async (e) => {
    e.preventDefault();
    if (!formData.studentId || !formData.description.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post('/faculty/interventions', formData);
      if (res.data?.success) {
        setShowModal(false);
        setFormData({
          studentId: counselorStudents[0]?.id || '',
          type: 'ATTENDANCE_COUNSELLING',
          description: '',
          date: new Date().toISOString().split('T')[0],
          followUpDate: '',
          status: 'SCHEDULED',
        });
        fetchInterventions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create intervention.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingIntervention) return;
    try {
      const res = await api.put(`/faculty/interventions/${editingIntervention.id}`, {
        status: editStatus,
        followUpDate: editFollowUpDate,
      });
      if (res.data?.success) {
        setEditingIntervention(null);
        fetchInterventions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update intervention.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mentorship & Academic Guidance</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Counselor Interventions Registry</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log, track, and review advisory actions, parent discussions, and corrective counseling for your cohort.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Intervention</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg w-fit text-xs font-semibold">
        {[
          { label: 'All Interventions', val: 'ALL' },
          { label: 'Scheduled / Open', val: 'SCHEDULED' },
          { label: 'In Progress', val: 'IN_PROGRESS' },
          { label: 'Completed', val: 'COMPLETED' },
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => setStatusFilter(tab.val)}
            className={`px-3 py-1.5 rounded-md transition-all ${
              statusFilter === tab.val
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interventions List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner text="Loading interventions records..." />
          </div>
        ) : error ? (
          <div className="p-6 text-xs text-rose-700">{error}</div>
        ) : interventions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No intervention records found for the selected status.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {interventions.map((item) => {
              let badgeColor = 'bg-blue-100 text-blue-800';
              if (item.status === 'COMPLETED') badgeColor = 'bg-emerald-100 text-emerald-800';
              if (item.status === 'IN_PROGRESS') badgeColor = 'bg-amber-100 text-amber-800';

              return (
                <div key={item.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                        {item.student?.registrationNumber}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">{item.student?.name}</h3>
                      <span className="text-xs text-slate-400 font-mono">Sec {item.student?.section}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeColor}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                      <button
                        onClick={() => {
                          setEditingIntervention(item);
                          setEditStatus(item.status);
                          setEditFollowUpDate(
                            item.followUpDate ? new Date(item.followUpDate).toISOString().split('T')[0] : ''
                          );
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title="Update Status"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-700 leading-relaxed pl-1">{item.description}</p>

                  <div className="mt-3 flex items-center space-x-4 text-[11px] text-slate-500 pl-1">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Date Logged: {new Date(item.date).toISOString().split('T')[0]}</span>
                    </span>
                    {item.followUpDate && (
                      <span className="flex items-center space-x-1 font-semibold text-blue-700">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Follow-up: {new Date(item.followUpDate).toISOString().split('T')[0]}</span>
                      </span>
                    )}
                    <span className="text-slate-400 uppercase tracking-wider text-[10px]">
                      Type: {item.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Record Counselor Intervention</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIntervention} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Counselor Student</label>
                <select
                  required
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  {counselorStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.registrationNumber} - {s.name} (Sec {s.section})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Intervention Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="ATTENDANCE_COUNSELLING">Attendance Advisory Counseling</option>
                  <option value="ACADEMIC_SUPPORT">Academic Peer Support / Tutorials</option>
                  <option value="PARENT_MEETING">Parent Communication / Meeting</option>
                  <option value="BEHAVIORAL">Classroom Engagement Guidance</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Notes & Action Plan</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details of discussion, student explanation, and agreed target schedule..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Session Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Intervention'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {editingIntervention && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 text-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-3">Update Intervention Status</h3>
            <p className="text-slate-500 mb-4 font-mono">{editingIntervention.student?.name}</p>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="SCHEDULED">Scheduled / Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={editFollowUpDate}
                  onChange={(e) => setEditFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingIntervention(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyInterventionsPage;
