import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  ClipboardCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileCheck2,
  RefreshCw,
} from 'lucide-react';

export const AdminAttendancePage = () => {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [departments, setDepartments] = useState([]);

  // Attendance Correction Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [newStatus, setNewStatus] = useState('PRESENT');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      if (res.data?.success) setDepartments(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
      });
      if (statusFilter) params.append('status', statusFilter);
      if (sectionFilter) params.append('section', sectionFilter);
      if (deptFilter) params.append('departmentId', deptFilter);
      if (dateFilter) params.append('date', dateFilter);

      const res = await api.get(`/admin/attendance?${params.toString()}`);
      if (res.data?.success) {
        setRecords(res.data.data.records);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load attendance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchRecords(1);
  }, [statusFilter, sectionFilter, deptFilter, dateFilter]);

  const openCorrectionModal = (rec) => {
    setSelectedRecord(rec);
    setNewStatus(rec.status === 'PRESENT' ? 'ABSENT' : 'PRESENT');
    setReason('');
    setShowCorrectionModal(true);
  };

  const handleCorrectAttendance = async (e) => {
    e.preventDefault();
    if (!selectedRecord || !reason.trim()) return;

    setSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const res = await api.post('/admin/attendance/correct', {
        attendanceId: selectedRecord.id,
        newStatus,
        reason: reason.trim(),
      });

      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        setShowCorrectionModal(false);
        fetchRecords(pagination.page);
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to correct attendance record.',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-400" />
            System-Wide Attendance & Manual Corrections
          </h1>
          <p className="text-xs text-slate-400">
            Audit and filter institutional attendance logs. Every administrative override requires mandatory reason documentation and generates an immutable audit record.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            message.isError
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', isError: false })}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>

        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Sections</option>
          <option value="A">Section A</option>
          <option value="B">Section B</option>
          <option value="C">Section C</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Statuses</option>
          <option value="PRESENT">PRESENT</option>
          <option value="ABSENT">ABSENT</option>
          <option value="ON_DUTY">ON_DUTY</option>
          <option value="EXCUSED">EXCUSED</option>
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        />

        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
          >
            Clear Date
          </button>
        )}

        <button
          onClick={() => fetchRecords(pagination.page)}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors ml-auto"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Records Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Period</th>
                <th className="py-3.5 px-4">Recorded By</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Admin Correction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading attendance entries...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No attendance records found matching filters.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{rec.student?.name}</div>
                      <div className="text-[11px] text-purple-300 font-mono">
                        {rec.student?.registrationNumber} • Sec {rec.student?.section}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {rec.course?.courseCode} - {rec.course?.courseName}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {new Date(rec.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">Period {rec.period}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {rec.faculty?.name || 'System / Auto'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.status === 'PRESENT'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : rec.status === 'ABSENT'
                            ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {rec.status === 'PRESENT' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{rec.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openCorrectionModal(rec)}
                        className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-800 text-purple-300 rounded-lg text-xs font-semibold transition-colors inline-flex items-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Override</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {records.length} of {pagination.total} records
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchRecords(pagination.page - 1)}
              className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-300">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchRecords(pagination.page + 1)}
              className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ATTENDANCE CORRECTION MODAL */}
      {showCorrectionModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-400" />
                Administrative Attendance Correction
              </h3>
              <button onClick={() => setShowCorrectionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Session Details */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-white">{selectedRecord.student?.name} ({selectedRecord.student?.registrationNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Course:</span>
                <span className="text-purple-300 font-semibold">{selectedRecord.course?.courseCode} - {selectedRecord.course?.courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Period:</span>
                <span className="text-slate-300">{new Date(selectedRecord.date).toLocaleDateString()} • Period {selectedRecord.period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-bold text-amber-400">{selectedRecord.status}</span>
              </div>
            </div>

            <form onSubmit={handleCorrectAttendance} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">New Attendance Status</label>
                <select
                  required
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="ON_DUTY">ON_DUTY</option>
                  <option value="EXCUSED">EXCUSED</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Reason for Modification <span className="text-rose-400">* (Mandatory for audit trail)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Approved medical certificate submitted, or attendance reader sensor malfunction..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300">
                ⚠️ Notice: This correction will be permanently recorded in the <strong>System Audit Log</strong> with your administrator credentials and timestamp.
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reason.trim()}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? 'Applying...' : 'Apply Correction & Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendancePage;
