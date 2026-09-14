import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Edit3,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Save,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

export const EditAttendancePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selection state
  const [formMeta, setFormMeta] = useState(null);
  const [courseId, setCourseId] = useState(searchParams.get('courseId') || '');
  const [section, setSection] = useState(searchParams.get('section') || '');
  const [date, setDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState(searchParams.get('period') || '1');

  // Flow status: 'SELECT' | 'OTP_REQUESTED' | 'EDIT_UNLOCKED' | 'SUCCESS'
  const [flowState, setFlowState] = useState('SELECT');

  // OTP state
  const [verificationId, setVerificationId] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes

  // Attendance modification state
  const [sessionRecords, setSessionRecords] = useState([]);
  const [reason, setReason] = useState('');
  const [submittingChanges, setSubmittingChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  // Load Form Metadata
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await api.get('/faculty/classes/form-meta');
        if (res.data?.success) {
          setFormMeta(res.data.data);
          if (!courseId && res.data.data.courses.length > 0) {
            setCourseId(res.data.data.courses[0].id);
          }
          if (!section && res.data.data.sections.length > 0) {
            setSection(res.data.data.sections[0]);
          }
        }
      } catch (err) {
        setErrorMessage(err.response?.data?.message || 'Could not load course options.');
      }
    };
    fetchMeta();
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    let timer = null;
    if (flowState === 'OTP_REQUESTED' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [flowState, countdown]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setOtpLoading(true);

    try {
      const res = await api.post('/faculty/attendance/request-edit-otp', {
        courseId,
        section,
        date,
        period,
      });

      if (res.data?.success) {
        setVerificationId(res.data.data.verificationId);
        setMaskedMobile(res.data.data.mobileMasked || '');
        setDevOtpHint(res.data.data.devOtpHint || '');
        setCountdown(300);
        setFlowState('OTP_REQUESTED');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to request verification OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!otpInput || otpInput.trim().length < 6) {
      setErrorMessage('Please enter the full 6-digit verification OTP.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await api.post('/faculty/attendance/verify-otp', {
        verificationId,
        otp: otpInput.trim(),
      });

      if (res.data?.success) {
        // Load session attendance records for editing
        const recordsRes = await api.get(
          `/faculty/attendance/session-students?courseId=${courseId}&section=${section}&date=${date}&period=${period}`
        );

        if (recordsRes.data?.success) {
          if (recordsRes.data.data.length === 0) {
            setErrorMessage('No attendance records found for this specific date and period session.');
            setFlowState('SELECT');
          } else {
            setSessionRecords(recordsRes.data.data);
            setFlowState('EDIT_UNLOCKED');
          }
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Toggle status for a student record in the edit list
  const toggleStudentStatus = (attendanceId) => {
    setSessionRecords((prev) =>
      prev.map((r) =>
        r.attendanceId === attendanceId
          ? { ...r, status: r.status === 'PRESENT' ? 'ABSENT' : 'PRESENT' }
          : r
      )
    );
  };

  // Step 3: Submit modified attendance with mandatory audit reason
  const handleSubmitEdits = async () => {
    setErrorMessage('');

    if (!reason || reason.trim().length < 5) {
      setErrorMessage('A valid reason for modifying the official attendance record is mandatory (minimum 5 characters).');
      return;
    }

    setSubmittingChanges(true);
    try {
      const updates = sessionRecords.map((r) => ({
        attendanceId: r.attendanceId,
        newStatus: r.status,
      }));

      const res = await api.put('/faculty/attendance/edit', {
        verificationId,
        reason: reason.trim(),
        updates,
      });

      if (res.data?.success) {
        setSuccessInfo({
          message: res.data.message,
          modifiedCount: res.data.data?.modifiedCount || 0,
        });
        setFlowState('SUCCESS');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Could not save attendance updates.');
    } finally {
      setSubmittingChanges(false);
    }
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const currentCourse = formMeta?.courses?.find((c) => c.id === courseId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Secure Attendance Audit Flow</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Edit Attendance Records</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Attendance edits require two-factor authorization via your registered mobile number and are logged in the university audit trail.
          </p>
        </div>

        {flowState !== 'SELECT' && flowState !== 'SUCCESS' && (
          <button
            onClick={() => setFlowState('SELECT')}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-3 py-1.5 bg-slate-100 rounded-lg"
          >
            Cancel / Select Another Session
          </button>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: SELECT SESSION TO EDIT */}
      {flowState === 'SELECT' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 mb-4">
            Select Class Session to Edit
          </h2>

          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Subject
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  {formMeta?.courses?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Section
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                >
                  {formMeta?.sections?.map((s) => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Period
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                    <option key={p} value={p}>
                      Period {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>An OTP will be dispatched to your registered phone number.</span>
              </span>

              <button
                type="submit"
                disabled={otpLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {otpLoading ? (
                  <span>Requesting OTP...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Request OTP to Edit</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: OTP VERIFICATION SCREEN */}
      {flowState === 'OTP_REQUESTED' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-md mx-auto">
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Security Verification Required</h2>
            <p className="text-xs text-slate-500 mt-1">
              An authentication OTP was dispatched to your registered mobile number{' '}
              <strong className="text-slate-800 font-mono">{maskedMobile || 'ending in ****'}</strong>.
            </p>
          </div>

          {/* Development Mode Helper Box */}
          {devOtpHint && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <div className="flex items-center space-x-1.5 font-bold mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Development OTP Mode Active</span>
              </div>
              <p className="text-[11px] text-amber-700">
                In local development without carrier SMS, your OTP is:{' '}
                <strong className="font-mono text-sm tracking-widest text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                  {devOtpHint}
                </strong>
              </p>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-widest font-mono text-xl py-2.5 px-4 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Expires in: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                </span>
              </span>

              <button
                type="button"
                onClick={handleRequestOtp}
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                Resend OTP
              </button>
            </div>

            <button
              type="submit"
              disabled={otpLoading || otpInput.length < 6}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors disabled:opacity-50"
            >
              {otpLoading ? 'Verifying...' : 'Verify OTP & Unlock Records'}
            </button>
          </form>
        </div>
      )}

      {/* STEP 3: UNLOCKED ATTENDANCE GRID + MANDATORY REASON */}
      {flowState === 'EDIT_UNLOCKED' && (
        <div className="space-y-5">
          {/* Session details banner */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] text-blue-700 uppercase font-bold tracking-wider">
                Editing Authorized via OTP
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {currentCourse?.courseCode} • Section {section} • Period {period}
              </h3>
              <p className="text-slate-600">Date: {date}</p>
            </div>

            <div className="flex items-center space-x-3 text-xs bg-white px-3 py-1.5 rounded-lg border border-blue-200 font-semibold">
              <span className="text-emerald-700 font-bold">
                {sessionRecords.filter((r) => r.status === 'PRESENT').length} Present
              </span>
              <span>•</span>
              <span className="text-rose-700 font-bold">
                {sessionRecords.filter((r) => r.status === 'ABSENT').length} Absent
              </span>
            </div>
          </div>

          {/* Student attendance list */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Toggle Student Attendance Status (Click to switch Present / Absent)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sessionRecords.map((record) => {
                const isPresent = record.status === 'PRESENT';
                return (
                  <div
                    key={record.attendanceId}
                    onClick={() => toggleStudentStatus(record.attendanceId)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer select-none transition-all flex items-center justify-between ${
                      isPresent
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 font-semibold'
                        : 'bg-rose-50/80 border-rose-300 text-rose-900 font-semibold'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-bold block">{record.registrationNumber}</span>
                      <span className="text-[11px] font-normal text-slate-600 truncate block">
                        {record.name}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isPresent ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {isPresent ? 'Present' : 'Absent'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Mandatory Reason for Change */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Mandatory Reason for Official Attendance Modification <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Student submitted approved medical certificate / Rectified biometric timing discrepancy"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                This reason will be permanently attached to the university attendance audit log alongside your faculty employee ID.
              </p>
            </div>

            {/* Submit Edit Button */}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={submittingChanges || reason.trim().length < 5}
                onClick={handleSubmitEdits}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {submittingChanges ? (
                  <span>Saving Audit Logs...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Log Attendance Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS CONFIRMATION */}
      {flowState === 'SUCCESS' && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-center max-w-lg mx-auto">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Attendance Changes Recorded</h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {successInfo?.message || 'Attendance records updated successfully.'}
          </p>

          <div className="mt-6 flex justify-center space-x-3">
            <button
              onClick={() =>
                navigate(`/faculty/attendance/history?section=${section}&courseId=${courseId}`)
              }
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              View Attendance History
            </button>
            <button
              onClick={() => {
                setFlowState('SELECT');
                setReason('');
                setSessionRecords([]);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              Edit Another Class
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditAttendancePage;
