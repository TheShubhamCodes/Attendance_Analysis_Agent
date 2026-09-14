import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Search,
  Filter,
  User,
  BookOpen,
  Calendar,
  FileText,
  History,
} from 'lucide-react';

export const AttendanceCorrectionsPage = () => {
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [reqRes, auditRes] = await Promise.all([
        api.get(`/hod/attendance/corrections?status=${statusFilter}`),
        api.get('/hod/reports?reportType=audit_log'),
      ]);

      if (reqRes.data?.success) setRequests(reqRes.data.data);
      if (auditRes.data?.success) setAuditLogs(auditRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load correction requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const openReviewModal = (req, action) => {
    setSelectedRequest(req);
    setReviewAction(action);
    setReviewNotes(
      action === 'APPROVED' ? 'Approved after verification of official documentation.' : ''
    );
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setSubmittingReview(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await api.post(`/hod/attendance/corrections/${selectedRequest.id}/review`, {
        action: reviewAction,
        reviewNotes,
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message);
        setSelectedRequest(null);
        setReviewNotes('');
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to review correction request.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <span>Attendance Corrections & Audit Control</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional oversight and approval workflow for faculty attendance change requests with complete audit logs.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>{pendingCount} Pending Review</span>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'requests'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Correction Requests ({requests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail & Historical Log ({auditLogs.length})</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: CORRECTION REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Status Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center">
                <Filter className="w-3.5 h-3.5 mr-1" />
                Status:
              </span>
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Real-time PostgreSQL Audit Source
            </span>
          </div>

          {/* Requests Cards / Table */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 animate-pulse">
                Loading attendance correction requests...
              </div>
            ) : requests.length > 0 ? (
              requests.map((r) => (
                <div
                  key={r.id}
                  className={`bg-white rounded-xl border p-4 shadow-xs transition-colors ${
                    r.status === 'PENDING'
                      ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Faculty & Course Info */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {r.courseCode}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs text-slate-700 font-medium">{r.courseName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Sec {r.section}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : r.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>
                          Faculty:{' '}
                          <strong className="text-slate-800 font-semibold">
                            {r.facultyName} ({r.facultyEmployeeId})
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Student:{' '}
                          <strong className="text-slate-800 font-semibold">
                            {r.studentName} ({r.registrationNumber})
                          </strong>
                        </span>
                        <span>•</span>
                        <span className="font-mono">
                          Date: {r.date} (Period {r.period})
                        </span>
                      </div>
                    </div>

                    {/* Status Change Badge */}
                    <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-lg border border-slate-200 self-start sm:self-auto">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 block uppercase">Original</span>
                        <span className="text-xs font-bold text-rose-600 font-mono">{r.oldStatus}</span>
                      </div>
                      <span className="text-slate-400">&rarr;</span>
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 block uppercase">Requested</span>
                        <span className="text-xs font-bold text-emerald-600 font-mono">
                          {r.requestedStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reason & Review Section */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-700">
                        <span className="font-bold text-slate-900">Reason: </span>
                        {r.reason}
                      </p>
                      {r.reviewedBy && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Reviewed by {r.reviewedBy} on {new Date(r.reviewedAt).toLocaleString()}
                          {r.reviewNotes && ` — Note: "${r.reviewNotes}"`}
                        </p>
                      )}
                    </div>

                    {/* Actions if Pending */}
                    {r.status === 'PENDING' && (
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => openReviewModal(r, 'REJECTED')}
                          className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>

                        <button
                          onClick={() => openReviewModal(r, 'APPROVED')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                No attendance correction requests found with status: {statusFilter}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Permanent PostgreSQL Attendance Audit Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every modification to student attendance records is cryptographically tracked with timestamps and authorizers.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">{auditLogs.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Faculty</th>
                  <th className="px-4 py-3 text-center">Change</th>
                  <th className="px-4 py-3">Reason / Documentation</th>
                  <th className="px-4 py-3">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{log.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.registrationNumber}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{log.subject}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{log.faculty}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold whitespace-nowrap">
                      <span className="text-rose-600">{log.oldStatus}</span> &rarr;{' '}
                      <span className="text-emerald-600">{log.newStatus}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{log.reason}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-700">{log.approvedBy}</td>
                  </tr>
                ))}

                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      No attendance modifications recorded in the audit log yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVIEW CONFIRMATION MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  reviewAction === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {reviewAction === 'APPROVED' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {reviewAction === 'APPROVED' ? 'Approve' : 'Reject'} Correction Request
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedRequest.studentName} ({selectedRequest.registrationNumber})
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <p>
                <strong>Subject:</strong> {selectedRequest.courseCode} ({selectedRequest.courseName})
              </p>
              <p>
                <strong>Status Change:</strong> {selectedRequest.oldStatus} &rarr;{' '}
                <strong className="text-emerald-700">{selectedRequest.requestedStatus}</strong>
              </p>
              <p>
                <strong>Faculty Reason:</strong> {selectedRequest.reason}
              </p>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  HOD Review Notes / Authorization Remarks:
                </label>
                <textarea
                  rows={3}
                  required={reviewAction === 'REJECTED'}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVED'
                      ? 'e.g. Verified with sports office certificate. Approved.'
                      : 'e.g. Duty leave slip not stamped by academic dean.'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-colors ${
                    reviewAction === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingReview
                    ? 'Submitting...'
                    : `Confirm ${reviewAction === 'APPROVED' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCorrectionsPage;
