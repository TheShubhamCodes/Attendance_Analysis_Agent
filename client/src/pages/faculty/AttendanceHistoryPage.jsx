import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  History,
  Calendar,
  Filter,
  Users,
  Eye,
  Edit3,
  X,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

export const AttendanceHistoryPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filters
  const [formMeta, setFormMeta] = useState(null);
  const [selectedSection, setSelectedSection] = useState(searchParams.get('section') || 'ALL');
  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || 'ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'weekly' | 'monthly'

  // History session records
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Session student details modal
  const [selectedSessionModal, setSelectedSessionModal] = useState(null);
  const [sessionStudents, setSessionStudents] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const handleExportMasterExcel = async () => {
    if (selectedSection === 'ALL') {
      alert('Please select a specific section (e.g. Section A) to export the Section Master Attendance Excel sheet.');
      return;
    }
    setExportingExcel(true);
    try {
      let url = `/faculty/attendance/export-excel?section=${encodeURIComponent(selectedSection)}`;
      if (selectedCourseId !== 'ALL') url += `&courseId=${encodeURIComponent(selectedCourseId)}`;
      if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Attendance_Report_Sec${selectedSection}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Excel export error:', err);
      alert(err.response?.data?.message || 'Failed to download Excel export.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Load Form Metadata
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await api.get('/faculty/classes/form-meta');
        if (res.data?.success) {
          setFormMeta(res.data.data);
        }
      } catch (err) {
        console.error('Error loading form meta:', err);
      }
    };
    fetchMeta();
  }, []);

  // Fetch History Sessions
  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      let query = `/faculty/attendance/history?viewMode=${viewMode}`;
      if (selectedSection !== 'ALL') query += `&section=${selectedSection}`;
      if (selectedCourseId !== 'ALL') query += `&courseId=${selectedCourseId}`;
      if (startDate && endDate) query += `&startDate=${startDate}&endDate=${endDate}`;

      const res = await api.get(query);
      if (res.data?.success) {
        setSessions(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attendance history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedSection, selectedCourseId, viewMode]);

  // Open session detail modal
  const openSessionDetails = async (session) => {
    setSelectedSessionModal(session);
    setModalLoading(true);
    try {
      const res = await api.get(
        `/faculty/attendance/session-students?courseId=${session.courseId}&section=${session.section}&date=${session.date}&period=${session.period}`
      );
      if (res.data?.success) {
        setSessionStudents(res.data.data);
      }
    } catch (err) {
      console.error('Error loading session students:', err);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            <span>Attendance Log</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Class Attendance History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit recorded class sessions, attendance proportions, and individual student statuses.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
          {['daily', 'weekly', 'monthly'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                viewMode === mode
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode} View
            </button>
          ))}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center space-x-1.5 text-slate-500 font-semibold uppercase text-[10px]">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Section Filter */}
        <div className="min-w-[130px]">
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          >
            <option value="ALL">All Sections</option>
            {formMeta?.sections?.map((s) => (
              <option key={s} value={s}>
                Section {s}
              </option>
            ))}
          </select>
        </div>

        {/* Course Filter */}
        <div className="min-w-[160px]">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          >
            <option value="ALL">All Subjects</option>
            {formMeta?.courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.courseCode} - {c.courseName}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="flex items-center space-x-1.5">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700"
            placeholder="From Date"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700"
            placeholder="To Date"
          />
          <button
            onClick={fetchHistory}
            className="px-3 py-1.5 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900"
          >
            Apply
          </button>
          <button
            onClick={handleExportMasterExcel}
            disabled={exportingExcel || selectedSection === 'ALL'}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedSection === 'ALL' ? 'Select a specific section to export' : 'Export Section Master Sheet (.xlsx)'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{exportingExcel ? 'Exporting...' : 'Export Master Excel'}</span>
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner text="Retrieving attendance history logs..." />
          </div>
        ) : error ? (
          <div className="p-6 text-xs text-rose-700">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No attendance records found matching the active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Present</th>
                  <th className="py-3 px-4">Absent</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {sessions.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.date}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono font-bold">
                        Period {s.period}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{s.courseCode}</span>
                        <span className="text-[11px] text-slate-500 truncate block">
                          {s.courseName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold">Sec {s.section}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-700 font-bold font-mono">{s.presentCount}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-rose-700 font-bold font-mono">{s.absentCount}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.totalCount}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-mono font-bold ${
                            s.attendancePercentage >= 75 ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {s.attendancePercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openSessionDetails(s)}
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                        title="View Individual Student Statuses"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/faculty/attendance/edit?courseId=${s.courseId}&section=${s.section}&date=${s.date}&period=${s.period}`
                          )
                        }
                        className="inline-flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                        title="Edit Session (OTP Protected)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: VIEW INDIVIDUAL STUDENT STATUSES */}
      {selectedSessionModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedSessionModal.courseCode} • Section {selectedSessionModal.section}
                </h3>
                <p className="text-xs text-slate-500">
                  Period {selectedSessionModal.period} • Date: {selectedSessionModal.date}
                </p>
              </div>

              <button
                onClick={() => setSelectedSessionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-slate-700">
                  Student Registration Numbers & Status
                </span>
                <div className="space-x-3 font-semibold">
                  <span className="text-emerald-700">
                    {sessionStudents.filter((s) => s.status === 'PRESENT').length} Present
                  </span>
                  <span>•</span>
                  <span className="text-rose-700">
                    {sessionStudents.filter((s) => s.status === 'ABSENT').length} Absent
                  </span>
                </div>
              </div>

              {modalLoading ? (
                <div className="py-12">
                  <LoadingSpinner text="Loading session records..." />
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-1">
                  {sessionStudents.map((s) => {
                    const isPresent = s.status === 'PRESENT';
                    return (
                      <div
                        key={s.attendanceId}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                          isPresent
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 font-medium'
                            : 'bg-rose-50/60 border-rose-200 text-rose-950 font-medium'
                        }`}
                      >
                        <span className="font-mono font-bold text-[11px]">
                          {s.registrationNumber}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            isPresent
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-rose-200 text-rose-900'
                          }`}
                        >
                          {isPresent ? 'P' : 'A'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <button
                onClick={() => {
                  const sess = selectedSessionModal;
                  setSelectedSessionModal(null);
                  navigate(
                    `/faculty/attendance/edit?courseId=${sess.courseId}&section=${sess.section}&date=${sess.date}&period=${sess.period}`
                  );
                }}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold flex items-center space-x-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit this session (OTP)</span>
              </button>

              <button
                onClick={() => setSelectedSessionModal(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistoryPage;
