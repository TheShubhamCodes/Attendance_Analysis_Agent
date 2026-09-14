import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Award,
  Calendar,
  Clock,
  PlusCircle,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  Info,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Ban
} from 'lucide-react';

export const StudentOdLeavePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [requests, setRequests] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);

  // Filter tab: ALL, PENDING, APPROVED, REJECTED
  const [activeTab, setActiveTab] = useState('ALL');

  // Modal state for new request
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    requestType: 'ON_DUTY', // or 'APPROVED_LEAVE'
    date: new Date().toISOString().split('T')[0],
    startPeriod: 1,
    endPeriod: 1,
    subjectId: '',
    eventName: '',
    reason: '',
    description: '',
    documentUrl: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [odRes, attRes] = await Promise.all([
        api.get('/student/od-leave'),
        api.get('/student/attendance')
      ]);

      if (odRes.data?.success) {
        setRequests(odRes.data.data.requests || []);
        setAttendanceStats(odRes.data.data.attendanceSummary || null);
      }
      if (attRes.data?.success) {
        setEnrolledSubjects(attRes.data.data.subjects || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch OD/Leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: (name === 'startPeriod' || name === 'endPeriod') ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      if (formData.endPeriod < formData.startPeriod) {
        setError('End Period cannot be smaller than Start Period.');
        setSubmitting(false);
        return;
      }

      const payload = {
        requestType: formData.requestType,
        startDate: formData.date,
        endDate: formData.date,
        startPeriod: formData.startPeriod,
        endPeriod: formData.endPeriod,
        subjectIds: formData.subjectId ? [formData.subjectId] : [],
        eventName: formData.eventName,
        reason: formData.reason,
        description: formData.description,
        documentUrl: formData.documentUrl
      };

      const res = await api.post('/student/od-leave', payload);
      if (res.data?.success) {
        setSuccessMsg('OD/Leave request submitted successfully. It is now Pending review.');
        setModalOpen(false);
        // Reset form
        setFormData({
          requestType: 'ON_DUTY',
          date: new Date().toISOString().split('T')[0],
          startPeriod: 1,
          endPeriod: 1,
          subjectId: '',
          eventName: '',
          reason: '',
          description: '',
          documentUrl: ''
        });
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit OD/Leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this pending request?')) return;
    try {
      setCancellingId(requestId);
      setError('');
      const res = await api.delete(`/student/od-leave/${requestId}`);
      if (res.data?.success) {
        setSuccessMsg('Request cancelled successfully.');
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel request.');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'ALL') return true;
    return r.status === activeTab;
  });

  if (loading && requests.length === 0) {
    return <LoadingSpinner text="Loading OD & Approved Leave requests..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-700 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-brand-600" />
            <span>Attendance Exemption & Leave Portal</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">On-Duty (OD) & Approved Leave</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Submit official requests for university representation, tournaments, institutional duties, or medical leaves. Approved requests are excluded from the attendance denominator.
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setSuccessMsg('');
            setModalOpen(true);
          }}
          className="px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New OD / Leave Request</span>
        </button>
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

      {/* Dual Attendance Metrics Strip */}
      {attendanceStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Raw Attendance */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>RAW ATTENDANCE</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">Unmodified</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{attendanceStats.raw?.percentage ?? 0}%</span>
              <span className="text-xs text-slate-500">
                ({attendanceStats.raw?.classesAttended ?? 0}/{attendanceStats.raw?.totalClasses ?? 0} Held)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Based on raw physical present/absent entries marked by faculty.
            </p>
          </div>

          {/* Adjusted Attendance */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-brand-50/50 border border-indigo-200/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-indigo-700 font-semibold mb-1">
              <span>ADJUSTED ATTENDANCE</span>
              <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold">Official</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-indigo-900">{attendanceStats.adjusted?.percentage ?? 0}%</span>
              <span className="text-xs text-indigo-700 font-medium">
                ({attendanceStats.raw?.classesAttended ?? 0}/{attendanceStats.adjusted?.effectiveTotal ?? 0} Effective)
              </span>
            </div>
            <p className="text-[11px] text-indigo-600/80 mt-2">
              Excludes approved OD & Leave periods from the denominator.
            </p>
          </div>

          {/* Approved OD */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>APPROVED ON-DUTY</span>
              <Award className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black text-blue-700">{attendanceStats.adjusted?.approvedOdCount ?? 0}</span>
              <span className="text-xs text-slate-500">periods exempted</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Institutional representation and sanctioned activities.
            </p>
          </div>

          {/* Approved Leave */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>APPROVED LEAVE</span>
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black text-purple-700">{attendanceStats.adjusted?.approvedLeaveCount ?? 0}</span>
              <span className="text-xs text-slate-500">periods exempted</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Formal medical or academic leave approved by authority.
            </p>
          </div>
        </div>
      )}

      {/* Policy Notice Box */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Important Attendance Exemption Policy:</span> Submitting an OD or Leave request marks it as <span className="font-semibold text-amber-800">PENDING</span> and does not alter attendance. Once approved by Faculty, HOD, or Academic Admin, the corresponding missed periods are exempted from the adjusted attendance denominator. Raw records remain preserved for audit integrity.
        </div>
      </div>

      {/* Tabs & Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Status Tabs */}
        <div className="border-b border-slate-200 px-4 flex space-x-4">
          {[
            { id: 'ALL', label: 'All Requests' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'CANCELLED', label: 'Cancelled' }
          ].map((tab) => {
            const count = requests.filter((r) => (tab.id === 'ALL' ? true : r.status === tab.id)).length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
                  isActive
                    ? 'border-brand-700 text-brand-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-brand-100 text-brand-800 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Request List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Periods</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Event / Reason</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Reviewer Remark</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No requests found under this category.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isOd = req.requestType === 'ON_DUTY';
                  const dateStr = req.startDate ? new Date(req.startDate).toISOString().split('T')[0] : 'N/A';
                  const submittedStr = req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : 'N/A';
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOd ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {isOd ? 'ON-DUTY' : 'APPROVED LEAVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{dateStr}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          {req.startPeriod === req.endPeriod
                            ? `Period ${req.startPeriod}`
                            : `Periods ${req.startPeriod} - ${req.endPeriod}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {req.subject ? `${req.subject.code} - ${req.subject.name}` : 'General / Multiple'}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{req.eventName || req.reason}</div>
                        <div className="text-[11px] text-slate-500 truncate">{req.description || req.reason}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{submittedStr}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
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
                      <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs">
                        {req.status === 'REJECTED' && req.rejectionReason ? (
                          <span className="text-rose-600 font-medium">Reason: {req.rejectionReason}</span>
                        ) : req.status === 'APPROVED' ? (
                          <span className="text-emerald-700">
                            Approved by {req.reviewerRole || 'Authority'}
                            {req.reviewedAt && ` on ${new Date(req.reviewedAt).toLocaleDateString()}`}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Awaiting evaluation</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {req.status === 'PENDING' ? (
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            disabled={cancellingId === req.id}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50"
                          >
                            {cancellingId === req.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-brand-700" />
                <h2 className="text-base font-bold text-slate-900">Create OD / Leave Request</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Type Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Request Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, requestType: 'ON_DUTY' }))}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      formData.requestType === 'ON_DUTY'
                        ? 'border-brand-700 bg-brand-50 text-brand-900 ring-1 ring-brand-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    On Duty (OD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, requestType: 'APPROVED_LEAVE' }))}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      formData.requestType === 'APPROVED_LEAVE'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Approved Leave
                  </button>
                </div>
              </div>

              {/* Date & Period Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Period (1-8) *</label>
                  <select
                    name="startPeriod"
                    value={formData.startPeriod}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-700"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>Period {p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Period (1-8) *</label>
                  <select
                    name="endPeriod"
                    value={formData.endPeriod}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-700"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>Period {p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject Selection (Optional/Course Specific) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Applicable Subject (Optional)</label>
                <select
                  name="subjectId"
                  value={formData.subjectId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-700"
                >
                  <option value="">All Subjects for these periods / General</option>
                  {enrolledSubjects.map((s) => (
                    <option key={s.courseId} value={s.courseId}>
                      {s.courseCode} - {s.courseName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event / Activity Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Event / Activity Name *
                </label>
                <input
                  type="text"
                  name="eventName"
                  required
                  placeholder="e.g. University Cricket Tournament / Hackathon / Medical Appointment"
                  value={formData.eventName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-700"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Reason *</label>
                <input
                  type="text"
                  name="reason"
                  required
                  placeholder="e.g. Representing the institution at inter-university tournament"
                  value={formData.reason}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-700"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Provide supporting context or institutional sanction details..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-700"
                />
              </div>

              {/* Supporting Document link / note */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supporting Document URL / Reference (Optional)
                </label>
                <input
                  type="text"
                  name="documentUrl"
                  placeholder="e.g. https://drive.google.com/... or Sanction Order No."
                  value={formData.documentUrl}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-700"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentOdLeavePage;
