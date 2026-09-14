import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  ClipboardCheck,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Building2,
  UserCheck,
  Info,
  ShieldCheck,
} from 'lucide-react';

export const AttendanceMonitoringPage = () => {
  const [data, setData] = useState({ metrics: {}, sessions: [] });
  const [meta, setMeta] = useState({ courses: [], faculty: [], sections: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [facultyFilter, setFacultyFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState('daily');

  // Drilldown expanded session keys
  const [expandedSessions, setExpandedSessions] = useState(new Set());

  const loadAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      const [metaRes, monitorRes] = await Promise.all([
        api.get('/hod/faculty/form-meta'),
        api.get('/hod/attendance/monitor', {
          params: {
            section: sectionFilter,
            courseId: courseFilter,
            facultyId: facultyFilter,
            date: dateFilter || undefined,
            viewMode,
          },
        }),
      ]);

      if (metaRes.data?.success) setMeta(metaRes.data.data);
      if (monitorRes.data?.success) setData(monitorRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load department attendance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [sectionFilter, courseFilter, facultyFilter, dateFilter, viewMode]);

  const toggleExpand = (sessionKey) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionKey)) next.delete(sessionKey);
      else next.add(sessionKey);
      return next;
    });
  };

  const { metrics = {}, sessions = [] } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            <span>Department Attendance Monitoring</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-dimensional attendance tracking across sections, courses, and faculty sessions with deep drill-down.
          </p>
        </div>

        <Link
          to="/hod/attendance/corrections"
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Review Correction Requests</span>
        </Link>
      </div>

      {/* Audit Policy Notice Alert */}
      <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-start space-x-3 text-xs text-indigo-900">
        <Info className="w-4 h-4 flex-shrink-0 text-indigo-600 mt-0.5" />
        <div>
          <span className="font-bold">HOD Direct Modification Restriction: </span>
          In accordance with institutional compliance guidelines, HODs cannot silently edit attendance records directly. All modifications require formal requests submitted by faculty and approved via the{' '}
          <Link to="/hod/attendance/corrections" className="underline font-bold text-indigo-800">
            Attendance Corrections Workflow
          </Link>.
        </div>
      </div>

      {/* Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Class Sessions</span>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.totalSessions || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Recorded periods</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Present Marks</span>
          <p className="mt-2 text-2xl font-black text-emerald-600">{metrics.totalPresent || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Student attendances</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Absences</span>
          <p className="mt-2 text-2xl font-black text-rose-600">{metrics.totalAbsent || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Absence instances</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Attendance</span>
          <p
            className={`mt-2 text-2xl font-black ${
              (metrics.averagePercentage || 0) >= 75
                ? 'text-emerald-600'
                : (metrics.averagePercentage || 0) >= 65
                ? 'text-amber-600'
                : 'text-rose-600'
            }`}
          >
            {metrics.averagePercentage || 0}%
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Department aggregate</p>
        </div>
      </div>

      {/* Multi-Filters & View Mode Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" />
            Filter:
          </span>

          {/* Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-bold"
          >
            <option value="ALL">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>

          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
          >
            <option value="ALL">All Subjects</option>
            {meta.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.courseCode} — {c.courseName}
              </option>
            ))}
          </select>

          {/* Faculty Filter */}
          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
          >
            <option value="ALL">All Faculty</option>
            {meta.faculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {/* Date Picker */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
          />

          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-indigo-600 hover:underline"
            >
              Clear Date
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
          {['daily', 'weekly', 'monthly'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider capitalize transition-colors ${
                viewMode === mode
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Class Sessions List with Drilldown */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 animate-pulse">
            Loading department attendance sessions...
          </div>
        ) : sessions.length > 0 ? (
          sessions.map((s) => {
            const isExpanded = expandedSessions.has(s.sessionKey);
            return (
              <div
                key={s.sessionKey}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
              >
                {/* Session Header Bar */}
                <div
                  onClick={() => toggleExpand(s.sessionKey)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center font-bold text-indigo-800 flex-shrink-0">
                      <span className="text-[9px] uppercase tracking-wider font-semibold">Period</span>
                      <span className="text-sm leading-tight">{s.period}</span>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{s.courseCode}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs text-slate-700 font-medium">{s.courseName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Sec {s.section}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center font-mono">
                          <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                          {s.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center text-slate-600 font-medium">
                          <UserCheck className="w-3 h-3 mr-1 text-slate-400" />
                          {s.facultyName} ({s.facultyEmployeeId})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-emerald-700 font-semibold font-mono">
                          {s.presentCount} Present
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-xs text-rose-700 font-semibold font-mono">
                          {s.absentCount} Absent
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold ${
                          s.percentage >= 75
                            ? 'text-emerald-600'
                            : s.percentage >= 65
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {s.percentage}% Attendance
                      </span>
                    </div>

                    <div className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-indigo-600' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Drilldown: Expanded Student Attendance Roster */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/70">
                    <div className="mb-2.5 flex items-center justify-between">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Session Student Roster ({s.students?.length || 0} students recorded):
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Session ID: {s.sessionKey}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                      {s.students &&
                        s.students.map((stu) => (
                          <div
                            key={stu.attendanceId}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                              stu.status === 'PRESENT'
                                ? 'bg-white border-emerald-200 text-slate-800'
                                : stu.status === 'ON_DUTY'
                                ? 'bg-sky-50 border-sky-200 text-sky-900'
                                : 'bg-rose-50/80 border-rose-200 text-rose-900'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-mono font-bold block text-[11px]">
                                {stu.registrationNumber}
                              </span>
                              <span className="truncate text-[11px] text-slate-600 block">
                                {stu.name}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                stu.status === 'PRESENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : stu.status === 'ON_DUTY'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {stu.status}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            No attendance records found matching the specified filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceMonitoringPage;
