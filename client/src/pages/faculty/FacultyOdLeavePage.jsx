import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  AlertCircle,
  X,
  FileText,
  Calendar,
  User,
  ShieldCheck,
  Check
} from 'lucide-react';

export const FacultyOdLeavePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [requests, setRequests] = useState([]);

  // Filter tab
  const [activeTab, setActiveTab] = useState('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
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
      const res = await api.get('/faculty/od-leave');
      if (res.data?.success) {
        setRequests(res.data.data.requests || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load OD / Leave requests.');
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
      const res = await api.put(`/faculty/od-leave/${selectedRequest.id}/review`, {
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
      setError(err.response?.data?.message || 'Failed to process request review.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesTab = activeTab === 'ALL' ? true : r.status === activeTab;
    const matchesType = typeFilter === 'ALL' ? true : r.requestType === typeFilter;
    const sTerm = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      r.student?.name?.toLowerCase().includes(sTerm) ||
      r.student?.rollNumber?.toLowerCase().includes(sTerm) ||
      r.student?.user?.identifier?.toLowerCase().includes(sTerm) ||
      r.eventName?.toLowerCase().includes(sTerm) ||
      r.reason?.toLowerCase().includes(sTerm);

    return matchesTab && matchesType && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  if (loading && requests.length === 0) {
    return <LoadingSpinner text="Fetching assigned students' OD and Leave requests..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-blue-600" />
            <span>Faculty Approval Workflows</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Student OD & Leave Requests</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review and adjudicate On-Duty sanctions and Approved Leaves for students in your authorized classes and sections.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-600">Pending Review:</span>
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
                    ? 'bg-blue-600 text-white shadow-xs'
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

          {/* Search & Request Type */}
          <div className="flex items-center space-x-3">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search student or event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Types</option>
              <option value="ON_DUTY">On-Duty</option>
              <option value="APPROVED_LEAVE">Approved Leave</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4 text-center">Section</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Period</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Reason / Event</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-8 text-center text-slate-400">
                    No requests found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isOd = req.requestType === 'ON_DUTY';
                  const dateStr = req.startDate ? new Date(req.startDate).toISOString().split('T')[0] : 'N/A';
                  const submittedStr = req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : 'N/A';

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
                          {isOd ? 'ON-DUTY' : 'APPROVED LEAVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800">{dateStr}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">
                        {req.startPeriod === req.endPeriod
                          ? `P${req.startPeriod}`
                          : `P${req.startPeriod}-P${req.endPeriod}`}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-[120px] truncate">
                        {req.subject ? `${req.subject.code}` : 'General'}
                      </td>
                      <td className="py-3 px-4 max-w-[180px]">
                        <div className="font-semibold text-slate-900 truncate">{req.eventName || req.reason}</div>
                        <div className="text-[10px] text-slate-500 truncate">{req.description || req.reason}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{submittedStr}</td>
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
                            title="View Details"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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

      {/* View Details Modal */}
      {viewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Request Particulars</h2>
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
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Department & Section</span>
                  <p className="font-medium text-slate-700">{selectedRequest.student?.department} - Sec {selectedRequest.student?.section}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Request Type</span>
                  <p className="font-bold text-blue-700">{selectedRequest.requestType}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Date & Periods</span>
                <p className="font-semibold text-slate-800">
                  {new Date(selectedRequest.startDate).toISOString().split('T')[0]} | Periods {selectedRequest.startPeriod} to {selectedRequest.endPeriod}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Event / Activity</span>
                <p className="font-bold text-slate-900">{selectedRequest.eventName || 'N/A'}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Reason</span>
                <p className="text-slate-700">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.description && (
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Description / Details</span>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg">{selectedRequest.description}</p>
                </div>
              )}

              {selectedRequest.documentUrl && (
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Supporting Document</span>
                  <a
                    href={selectedRequest.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-blue-600 hover:underline truncate mt-0.5"
                  >
                    {selectedRequest.documentUrl}
                  </a>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800">
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
                <span className="font-semibold text-slate-900">{selectedRequest.student?.name}</span> ({selectedRequest.student?.rollNumber}) on{' '}
                <span className="font-semibold text-slate-900">
                  {new Date(selectedRequest.startDate).toISOString().split('T')[0]} (Periods {selectedRequest.startPeriod}-{selectedRequest.endPeriod})
                </span>
                ?
              </p>

              {reviewAction === 'APPROVE' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 text-[11px]">
                  <strong>Effect on Attendance:</strong> Approving this request will exempt the corresponding periods from the student's adjusted attendance denominator. Raw records will remain unchanged.
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide official rationale for rejection (e.g. Incomplete documentation, event not approved)..."
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

export default FacultyOdLeavePage;
