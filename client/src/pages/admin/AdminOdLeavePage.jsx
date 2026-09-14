import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Award,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Building2,
  FileText,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const AdminOdLeavePage = () => {
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals & Action States
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'APPROVE' or 'REJECT'
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('requestType', typeFilter);
      if (deptFilter) params.append('department', deptFilter);
      if (sectionFilter) params.append('section', sectionFilter);
      if (searchFilter) params.append('search', searchFilter);
      if (dateFilter) params.append('date', dateFilter);

      const res = await api.get(`/admin/od-leave?${params.toString()}`);
      if (res.data?.success) {
        setRequests(res.data.data.requests || []);
        if (res.data.data.departments) setDepartments(res.data.data.departments);
        if (res.data.data.sections) setSections(res.data.data.sections);
      }
    } catch (err) {
      console.error('Failed to load OD/Leave requests:', err);
      setMessage({
        text: err.response?.data?.message || 'Failed to fetch OD/Leave requests.',
        isError: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, typeFilter, deptFilter, sectionFilter, dateFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !reviewAction) return;

    if (reviewAction === 'REJECT' && !rejectionReason.trim()) {
      setMessage({ text: 'Rejection reason is mandatory.', isError: true });
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.put(`/admin/od-leave/${selectedRequest.id}/review`, {
        action: reviewAction,
        rejectionReason: reviewAction === 'REJECT' ? rejectionReason.trim() : undefined
      });

      if (res.data?.success) {
        setMessage({
          text: `Request successfully ${reviewAction === 'APPROVE' ? 'Approved' : 'Rejected'}.`,
          isError: false
        });
        setSelectedRequest(null);
        setReviewAction(null);
        setRejectionReason('');
        fetchRequests();
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to review request.',
        isError: true
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !revokeReason.trim()) {
      setMessage({ text: 'Please specify the rationale for revoking this approved request.', isError: true });
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post(`/admin/od-leave/${selectedRequest.id}/revoke`, {
        reason: revokeReason.trim()
      });

      if (res.data?.success) {
        setMessage({
          text: 'Approved request revoked successfully. Student adjusted attendance has been recalculated immediately.',
          isError: false
        });
        setShowRevokeModal(false);
        setSelectedRequest(null);
        setRevokeReason('');
        fetchRequests();
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to revoke request.',
        isError: true
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Attendance Management</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            OD & Approved Leave Administration
          </h1>
          <p className="text-xs text-slate-400 max-w-3xl mt-1">
            Oversee, filter, approve, reject, or revoke On-Duty and Leave requests across all university departments. Every administrative action creates an immutable audit trail and immediately updates adjusted attendance metrics.
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
          <div className="flex items-center space-x-2">
            {message.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage({ text: '', isError: false })}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search student name, reg no, or event..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </form>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Type */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Types</option>
          <option value="ON_DUTY">On Duty (OD)</option>
          <option value="APPROVED_LEAVE">Approved Leave</option>
        </select>

        {/* Department */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Section */}
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Sections</option>
          {sections.map((s) => (
            <option key={s} value={s}>Sec {s}</option>
          ))}
        </select>

        {/* Date Filter */}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        />

        {/* Reset */}
        {(statusFilter || typeFilter || deptFilter || sectionFilter || searchFilter || dateFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setTypeFilter('');
              setDeptFilter('');
              setSectionFilter('');
              setSearchFilter('');
              setDateFilter('');
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Requests Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4">Dept / Sec</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Periods</th>
                <th className="py-3 px-4">Event / Reason</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Reviewer</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-500">
                    <LoadingSpinner text="Querying enterprise OD & Leave database..." />
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-500">
                    No requests found matching criteria.
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const isOd = req.requestType === 'ON_DUTY';
                  const dateStr = req.startDate ? new Date(req.startDate).toISOString().split('T')[0] : 'N/A';

                  return (
                    <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        {req.student?.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {req.student?.rollNumber || req.student?.user?.identifier}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {req.student?.department} ({req.student?.section})
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOd
                            ? 'bg-blue-900/40 text-blue-300 border border-blue-800'
                            : 'bg-purple-900/40 text-purple-300 border border-purple-800'
                        }`}>
                          {isOd ? 'ON-DUTY' : 'APPROVED LEAVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{dateStr}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-200">
                        {req.startPeriod === req.endPeriod
                          ? `P${req.startPeriod}`
                          : `P${req.startPeriod}-P${req.endPeriod}`}
                      </td>
                      <td className="py-3 px-4 max-w-[180px]">
                        <div className="font-semibold text-slate-200 truncate">{req.eventName || req.reason}</div>
                        <div className="text-[10px] text-slate-400 truncate">{req.description || req.reason}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : req.status === 'PENDING'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {req.reviewedBy ? (
                          <div>
                            <span className="font-semibold text-slate-300">{req.reviewerRole}</span>
                            <span className="text-[10px] text-slate-500 block">
                              {new Date(req.reviewedAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="italic text-slate-500">Unreviewed</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setViewModalOpen(true);
                            }}
                            title="Inspect Details"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {req.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setReviewAction('APPROVE');
                                }}
                                title="Approve Request"
                                className="p-1.5 text-emerald-400 hover:bg-emerald-950/50 rounded-lg transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setReviewAction('REJECT');
                                  setRejectionReason('');
                                }}
                                title="Reject Request"
                                className="p-1.5 text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {req.status === 'APPROVED' && (
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setRevokeReason('');
                                setShowRevokeModal(true);
                              }}
                              title="Revoke Approval (Audit Logged)"
                              className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/80 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {viewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white">OD / Leave Full Particulars</h2>
              </div>
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedRequest(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Student</span>
                  <p className="font-bold text-white text-sm">{selectedRequest.student?.name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Registration No</span>
                  <p className="font-mono font-bold text-slate-300">{selectedRequest.student?.rollNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Department & Section</span>
                  <p className="text-slate-300">{selectedRequest.student?.department} • Sec {selectedRequest.student?.section}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Status</span>
                  <span className="font-extrabold text-purple-300">{selectedRequest.status}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Date & Periods</span>
                <p className="font-semibold text-slate-200">
                  {new Date(selectedRequest.startDate).toISOString().split('T')[0]} | Periods {selectedRequest.startPeriod} to {selectedRequest.endPeriod}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Event / Activity</span>
                <p className="font-bold text-white">{selectedRequest.eventName || 'N/A'}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Sanction Reason</span>
                <p className="text-slate-300">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.description && (
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Description</span>
                  <p className="text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    {selectedRequest.description}
                  </p>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <div className="bg-rose-950/40 border border-rose-900/80 p-3 rounded-xl text-rose-300">
                  <span className="text-[10px] font-bold uppercase">Rejection / Revocation Reason:</span>
                  <p className="mt-0.5">{selectedRequest.rejectionReason}</p>
                </div>
              )}

              {selectedRequest.reviewedBy && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Review Metadata:</span>
                  <p className="text-slate-300 mt-1">
                    Processed by <span className="font-semibold text-white">{selectedRequest.reviewerRole}</span> on {new Date(selectedRequest.reviewedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {reviewAction && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                {reviewAction === 'APPROVE' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <h2 className="text-base font-bold text-white">
                  {reviewAction === 'APPROVE' ? 'Admin Approve Request' : 'Admin Reject Request'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setReviewAction(null);
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReview} className="space-y-4 text-xs">
              <p className="text-slate-300">
                You are executing an Administrative {reviewAction} on request for{' '}
                <span className="font-bold text-white">{selectedRequest.student?.name}</span> ({selectedRequest.student?.rollNumber}).
              </p>

              {reviewAction === 'APPROVE' ? (
                <div className="bg-emerald-950/40 border border-emerald-800/80 p-3 rounded-xl text-emerald-300 text-[11px]">
                  <strong>System Action:</strong> Approval will exclude corresponding absence periods from the student's adjusted attendance denominator. Raw records remain unmutated.
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setReviewAction(null);
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-lg font-semibold hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 rounded-lg font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${
                    reviewAction === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : reviewAction === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Revoke Approved OD / Leave</h2>
              </div>
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setSelectedRequest(null);
                  setRevokeReason('');
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRevoke} className="space-y-4 text-xs">
              <div className="bg-amber-950/40 border border-amber-800/80 p-3.5 rounded-xl text-amber-300 text-[11px] space-y-1.5">
                <p className="font-bold">Administrative Revocation Impact:</p>
                <p>
                  Revoking this approved request will remove its exemption from the student's adjusted attendance calculation.
                </p>
                <p>
                  The adjusted attendance percentage will instantly revert back to normal. Raw records remain untouched. An immutable audit entry will be registered.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Reason for Revocation *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Document why this approval is being revoked (e.g. Disciplinary revocation, erroneous submission)..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowRevokeModal(false);
                    setSelectedRequest(null);
                    setRevokeReason('');
                  }}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-lg font-semibold hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Revoking...' : 'Confirm Revoke'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOdLeavePage;
