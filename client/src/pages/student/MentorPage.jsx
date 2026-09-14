import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Users,
  Mail,
  MapPin,
  Calendar,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
} from 'lucide-react';

export const MentorPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Meeting Request Form
  const [reason, setReason] = useState('Academic Performance Guidance');
  const [preferredDate, setPreferredDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState({ text: '', isError: false });

  useEffect(() => {
    fetchMentorData();
  }, []);

  const fetchMentorData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/mentor');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not fetch mentor details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setSubmissionFeedback({ text: '', isError: false });

    if (!reason || !preferredDate || !message.trim()) {
      setSubmissionFeedback({
        text: 'Please complete the reason, preferred date, and message.',
        isError: true,
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/student/mentor/meeting-request', {
        reason,
        preferredDate,
        message,
      });

      if (res.data?.success) {
        setSubmissionFeedback({
          text: 'Meeting request successfully submitted to your mentor.',
          isError: false,
        });
        setMessage('');
        setPreferredDate('');
        fetchMentorData(); // Refresh list
      }
    } catch (err) {
      setSubmissionFeedback({
        text: err.response?.data?.message || 'Failed to submit meeting request.',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Connecting to mentor registry..." />;

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700 text-sm">
        <p>{error || 'An error occurred while loading mentor connection.'}</p>
      </div>
    );
  }

  const { mentor, meetingRequests } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-brand-800 uppercase tracking-wider mb-1">
          <Users className="w-4 h-4" />
          <span>Faculty Advisory System</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Assigned Faculty Mentor</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Dedicated academic guidance counselor and intervention supervisor
        </p>
      </div>

      {/* Mentor Profile Card */}
      {mentor ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-full bg-brand-900 text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
              {mentor.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">{mentor.name}</h2>
                <span className="text-[11px] font-semibold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                  {mentor.staffRole}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Department of {mentor.department?.name || 'Computer Science & Engineering'}
              </p>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
                <div className="flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`mailto:${mentor.email}`} className="text-brand-800 hover:underline">
                    {mentor.email}
                  </a>
                </div>
                {mentor.cabinLocation && (
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{mentor.cabinLocation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 max-w-xs">
            <span className="font-semibold text-slate-800 block mb-1">Advisory Hours:</span>
            <span>Monday & Wednesday, 2:00 PM – 4:30 PM. For emergency academic leaves, submit requests below.</span>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 text-xs">
          No faculty mentor is currently linked to your student profile. Please contact the Head of Department.
        </div>
      )}

      {/* Two Column Grid: Request Meeting Form and Previous Requests History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Mentor Meeting Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
            <MessageSquare className="w-4 h-4 text-brand-900" />
            <h3 className="text-sm font-bold text-slate-900">Request Mentor Consultation</h3>
          </div>

          {submissionFeedback.text && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs flex items-start space-x-2 ${
                submissionFeedback.isError
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {submissionFeedback.isError ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{submissionFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consultation Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-900"
              >
                <option value="Attendance Recovery Plan">Attendance Recovery Plan</option>
                <option value="Academic Performance Guidance">Academic Performance Guidance</option>
                <option value="Internal Assessment Review">Internal Assessment Review</option>
                <option value="Personal / Medical Circumstances">Personal / Medical Circumstances</option>
                <option value="Career & Elective Advice">Career & Elective Advice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Meeting Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brief Context / Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows="4"
                required
                placeholder="Explain the specific issue or topic you would like to discuss..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-900"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting || !mentor}
              className="w-full py-2.5 px-4 bg-brand-900 hover:bg-brand-950 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 disabled:opacity-60 transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Meeting Request'}</span>
            </button>
          </form>
        </div>

        {/* Previous Consultation Requests */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Consultation History & Status</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {meetingRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No previous meeting requests recorded.
              </div>
            ) : (
              meetingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{req.reason}</h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Preferred Date: {new Date(req.preferredDate).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded border border-slate-100">
                    "{req.message}"
                  </p>
                  <div className="text-[10px] text-slate-400 text-right">
                    Submitted: {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorPage;
