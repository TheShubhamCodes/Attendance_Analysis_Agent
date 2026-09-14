import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Award,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  AlertCircle,
  X,
  FileText,
  Calendar,
  Building2,
  TrendingUp,
  Check,
  ShieldAlert
} from 'lucide-react';

export const HodOdLeavePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [requests, setRequests] = useState([]);

  // Filters
  const [activeTab, setActiveTab] = useState('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'APPROVE' or 'REJECT'
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/hod/od-leave');
      if (res.data?.success) {
        setRequests(res.data.data.requests || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load department OD / Leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReview = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !reviewAction) return;

    if (reviewAction === 'REJECT' && !rejectionReason.trim()) {
      setError('Please provide a mandatory rejection reason.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      const res = await api.put(`/hod/od-leave/${selectedRequest.id}/review`, {
        action: reviewAction,
        rejectionReason: reviewAction === 'REJECT' ? rejectionReason : undefined
      });

      if (res.data?.success) {
        setSuccessMsg(
          `Request successfully ${reviewAction === 'APPROVE' ? 'Approved' : 'Rejected'}.`
        );
        setSelectedRequest(null);
        setReviewAction(null);
        setRejectionReason('');
        fetchRequests();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to review request.');
    } finally {
      setActionLoading(false);
    }
  };

  const sectionsList = Array.from(
    new Set(requests.map((r) => r.student?.section).filter(Boolean))
  ).sort();

  const filteredRequests = requests.filter((r) => {
    const matchesTab = activeTab === 'ALL' ? true : r.status === activeTab;
    const matchesType = typeFilter === 'ALL' ? true : r.requestType === typeFilter;
    const matchesSection = sectionFilter === 'ALL' ? true : r.student?.section === sectionFilter;
    const sTerm = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      r.student?.name?.toLowerCase().includes(sTerm) ||
      r.student?.rollNumber?.toLowerCase().includes(sTerm) ||
      r.student?.user?.identifier?.toLowerCase().includes(sTerm) ||
      r.eventName?.toLowerCase().includes(sTerm) ||
      r.reason?.toLowerCase().includes(sTerm);

    return matchesTab && matchesType && matchesSection && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  if (loading && requests.length === 0) {
    return <LoadingSpinner text="Fetching department OD & Leave requests..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Department Administration</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Department OD & Leave Approvals</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review sanction requests for all students within your department. View real-time attendance impact before and after adjustment.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-600">Pending Adjudication:</span>
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
            {pendingCount} Requests
          </span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-rose-700 text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-rose-100 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-emerald-800 text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-100 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Controls & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-2">
            {[
              { id: 'PENDING', label: 'Pending', count: pendingCount, color: 'text-amber-700 bg-amber-50' },
              { id: 'APPROVED', label: 'Approved', count: approvedCount, color: 'text-emerald-700 bg-emerald-50' },
              { id: 'REJECTED', label: 'Rejected', count: rejectedCount, color: 'text-rose-700 bg-rose-50' },
              { id: 'ALL', label: 'All', count: requests.length, color: 'text-slate-700 bg-slate-50' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : tab.color}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Section & Type */}
          <div className="flex items-center space-x-2">
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                placeholder="Search student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              <option value="ALL">All Sections</option>
              {sectionsList.map((sec) => (
                <option key={sec} value={sec}>Sec {sec}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              <option value="ALL">All Types</option>
              <option value="ON_DUTY">On-Duty</option>
              <option value="APPROVED_LEAVE">Approved Leave</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4 text-center">Sec</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date & Period</th>
                <th className="py-3 px-4">Reason / Event</th>
                <th className="py-3 px-4 text-center">Current Raw</th>
                <th className="py-3 px-4 text-center">Adjusted</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400">
                    No requests found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isOd = req.requestType === 'ON_DUTY';
                  const dateStr = req.startDate ? new Date(req.startDate).toISOString().split('T')[0] : 'N/A';
                  const impact = req.student?.attendanceImpact;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {req.student?.name || 'Student'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {req.student?.rollNumber || req.student?.user?.identifier}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {req.student?.section || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOd ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {isOd ? 'OD' : 'LEAVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {dateStr} (P{req.startPeriod}{req.startPeriod !== req.endPeriod ? `-${req.endPeriod}` : ''})
                      </td>
                      <td className="py-3 px-4 max-w-[170px]">
                        <div className="font-semibold text-slate-900 truncate">{req.eventName || req.reason}</div>
                        <div className="text-[10px] text-slate-500 truncate">{req.description || req.reason}</div>
                      </td>
                      {/* Attendance Impact Columns */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-slate-900">
                          {impact?.raw?.percentage ?? '—'}%
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {impact?.raw?.attended}/{impact?.raw?.total}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${
                          impact && impact.projectedAdjusted?.percentage > impact.raw?.percentage
                            ? 'text-emerald-700'
                            : 'text-indigo-700'
                        }`}>
                          {impact?.projectedAdjusted?.percentage ?? '—'}%
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {impact?.raw?.attended}/{impact?.projectedAdjusted?.effectiveTotal} eff
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setViewModalOpen(true);
                            }}
                            title="View Full Details"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
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
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
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

      {/* View Details Modal with Impact Preview */}
      {viewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Request Particulars & Attendance Impact</h2>
              </div>
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedRequest(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Student Name</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedRequest.student?.name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Registration No</span>
                  <p className="font-mono font-bold text-slate-800">{selectedRequest.student?.rollNumber}</p>
                </div>
              </div>

              {/* Attendance Impact Card */}
              {selectedRequest.student?.attendanceImpact && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                      Attendance Impact Analysis
                    </span>
                    <span className="text-[10px] text-indigo-700 font-semibold">
                      {selectedRequest.student.attendanceImpact.projectedAdjusted?.approvedExemptions || 0} periods currently exempted
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded-lg border border-indigo-100">
                      <span className="text-[10px] text-slate-500 font-bold block">CURRENT RAW</span>
                      <span className="text-lg font-black text-slate-900">
                        {selectedRequest.student.attendanceImpact.raw?.percentage}%
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {selectedRequest.student.attendanceImpact.raw?.attended} of {selectedRequest.student.attendanceImpact.raw?.total} classes
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-100">
                      <span className="text-[10px] text-indigo-600 font-bold block">ADJUSTED ATTENDANCE</span>
                      <span className="text-lg font-black text-indigo-700">
                        {selectedRequest.student.attendanceImpact.projectedAdjusted?.percentage}%
                      </span>
                      <p className="text-[10px] text-indigo-500">
                        {selectedRequest.student.attendanceImpact.raw?.attended} of {selectedRequest.student.attendanceImpact.projectedAdjusted?.effectiveTotal} effective
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Event / Activity</span>
                <p className="font-bold text-slate-900">{selectedRequest.eventName || 'N/A'}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Official Reason</span>
                <p className="text-slate-700">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.description && (
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Description</span>
                  <p className="text-slate-600 bg-slate-50 p-2 rounded-lg">{selectedRequest.description}</p>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-rose-800">
                  <span className="text-[10px] font-bold uppercase">Rejection Reason:</span>
                  <p className="mt-0.5">{selectedRequest.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review (Approve/Reject) Modal */}
      {reviewAction && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                {reviewAction === 'APPROVE' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <h2 className="text-base font-bold text-slate-900">
                  {reviewAction === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setReviewAction(null);
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReview} className="space-y-4 text-xs">
              <p className="text-slate-600">
                Are you sure you want to{' '}
                <span className="font-bold uppercase text-slate-900">{reviewAction}</span> the request for{' '}
                <span className="font-semibold text-slate-900">{selectedRequest.student?.name}</span> ({selectedRequest.student?.rollNumber})?
              </p>

              {reviewAction === 'APPROVE' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 text-[11px]">
                  <strong>HOD Sanction:</strong> Approving will exempt missed periods from student's adjusted attendance denominator. Raw records remain preserved.
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="State reason for department-level rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setReviewAction(null);
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
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
    </div>
  );
};

export default HodOdLeavePage;
