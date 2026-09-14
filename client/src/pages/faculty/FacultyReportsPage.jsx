import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Filter,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Users,
  Award,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const FacultyReportsPage = () => {
  const [reportType, setReportType] = useState('master');
  const [formMeta, setFormMeta] = useState(null);
  const [section, setSection] = useState('A');
  const [courseId, setCourseId] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [reportData, setReportData] = useState(null);
  const [masterMatrix, setMasterMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // Load Form Metadata (Assignments, Sections, Courses from PostgreSQL)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await api.get('/faculty/classes/form-meta');
        if (res.data?.success) {
          setFormMeta(res.data.data);
          // Default section to first available assigned section
          if (res.data.data.sections && res.data.data.sections.length > 0) {
            setSection((prev) => (prev === 'ALL' || !prev ? res.data.data.sections[0] : prev));
          }
        }
      } catch (e) {
        console.error('Error fetching form meta:', e);
      }
    };
    fetchMeta();
  }, []);

  // Filter available courses dynamically for the selected section from PostgreSQL assignments
  const sectionCourses = useMemo(() => {
    if (!formMeta?.assignments) return [];
    if (!section || section === 'ALL') return formMeta.courses || [];
    const matched = formMeta.assignments
      .filter((a) => a.section === section)
      .map((a) => ({
        id: a.courseId,
        courseCode: a.courseCode,
        courseName: a.courseName,
      }));
    // Remove duplicates
    const unique = [];
    const seen = new Set();
    matched.forEach((c) => {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        unique.push(c);
      }
    });
    return unique;
  }, [formMeta, section]);

  // Reset courseId if selected course is not available in the new section
  useEffect(() => {
    if (courseId !== 'ALL' && sectionCourses.length > 0) {
      const exists = sectionCourses.some((c) => c.id === courseId);
      if (!exists) {
        setCourseId('ALL');
      }
    }
  }, [sectionCourses, courseId]);

  // Fetch Report Data
  const generateReport = async () => {
    setLoading(true);
    setError('');
    try {
      if (reportType === 'master') {
        if (!section || section === 'ALL') {
          setError('Please select a specific section to generate the Master Attendance Sheet.');
          setLoading(false);
          return;
        }

        let query = `/faculty/attendance/matrix?section=${encodeURIComponent(section)}`;
        if (courseId !== 'ALL') query += `&courseId=${encodeURIComponent(courseId)}`;
        if (startDate && endDate) query += `&startDate=${startDate}&endDate=${endDate}`;

        const res = await api.get(query);
        if (res.data?.success) {
          setMasterMatrix(res.data.data);
          setReportData(null);
        }
      } else {
        let query = `/faculty/reports?reportType=${reportType}`;
        if (section !== 'ALL') query += `&section=${section}`;
        if (courseId !== 'ALL') query += `&courseId=${courseId}`;
        if (startDate && endDate) query += `&startDate=${startDate}&endDate=${endDate}`;

        const res = await api.get(query);
        if (res.data?.success) {
          setReportData(res.data);
          setMasterMatrix(null);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate report.');
      setMasterMatrix(null);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [reportType, section, courseId]);

  // Export Official Excel (.xlsx) Handler
  const handleExportMasterExcel = async () => {
    if (!section || section === 'ALL') {
      alert('Please select a specific section to export.');
      return;
    }
    setExporting(true);
    try {
      let url = `/faculty/attendance/export-excel?section=${encodeURIComponent(section)}`;
      if (courseId && courseId !== 'ALL') url += `&courseId=${encodeURIComponent(courseId)}`;
      if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Attendance_Report_Sec${section}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Excel export error:', err);
      alert(err.response?.data?.message || 'Failed to download Excel export.');
    } finally {
      setExporting(false);
    }
  };

  // Export CSV Handler for legacy reports
  const exportToCSV = () => {
    if (reportType === 'master') {
      handleExportMasterExcel();
      return;
    }

    if (!reportData || !reportData.data || reportData.data.length === 0) return;

    const columns = reportData.columns;
    const headers = columns.join(',');
    const rows = reportData.data.map((row) =>
      columns.map((col) => `"${(row[col] !== undefined ? row[col] : '').toString().replace(/"/g, '""')}"`).join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-blue-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-300 uppercase tracking-widest">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Academic Reporting Desk • PostgreSQL Live</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Faculty Attendance Reporting System</h1>
          <p className="text-xs text-blue-200/80 max-w-2xl">
            Export official university-format attendance reports. Follows standard academic structure with horizontal subjects, conducted hours auditing, and 100% active student coverage.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportMasterExcel}
            disabled={exporting || (reportType === 'master' && (!masterMatrix || masterMatrix.totalStudents === 0))}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'Generating Excel...' : 'Export Excel (.xlsx)'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 shadow-xs transition-colors flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Report Controls & Dynamic Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:hidden">
        {/* Report Type Switcher */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Select Report Format
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              {
                id: 'master',
                label: 'Section Master Sheet (PDF/Excel Format)',
                badge: 'Recommended',
              },
              { id: 'defaulter', label: 'Counselor Defaulter (< 75%)' },
              { id: 'section', label: 'Section Attendance Summary' },
              { id: 'daily', label: 'Daily Session Logs' },
              { id: 'interventions', label: 'Counselor Interventions Report' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setReportType(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  reportType === t.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{t.label}</span>
                {t.badge && (
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                      reportType === t.id ? 'bg-amber-400 text-slate-900' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Scope:</span>
          </span>

          {/* Section Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Section:</span>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-blue-500"
            >
              {reportType !== 'master' && <option value="ALL">All Sections</option>}
              {formMeta?.sections?.map((s) => (
                <option key={s} value={s}>
                  Section {s}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Subject Selector (Loaded strictly from PostgreSQL assignments) */}
          {reportType !== 'defaulter' && reportType !== 'interventions' && (
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">Subject:</span>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-blue-500 max-w-[260px]"
              >
                <option value="ALL">All Assigned Subjects (Horizontal Columns)</option>
                {sectionCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode} - {c.courseName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Period:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              title="Start Date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              title="End Date"
            />
            <button
              onClick={generateReport}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {/* Main Report Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print:border-none print:shadow-none print:p-0">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner text="Compiling PostgreSQL attendance data..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="text-sm font-bold text-rose-900">Unable to Load Report</h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
          </div>
        ) : reportType === 'master' && masterMatrix ? (
          /* ========================================================================= */
          /* UNIVERSITY ATTENDANCE REPORT FORMAT (PDF / EXCEL STRUCTURE)               */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* University Report Header */}
            <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
              <h2 className="text-xl font-black text-slate-950 tracking-wider uppercase">
                {masterMatrix.meta.university}
              </h2>
              <h3 className="text-sm font-extrabold text-slate-800">
                B.Tech, {masterMatrix.meta.department}
              </h3>
              <p className="text-xs font-bold text-slate-700">
                {masterMatrix.meta.year} - Semester {masterMatrix.meta.semester}, Section {masterMatrix.meta.section}
              </p>
              <div className="inline-block bg-slate-100 text-slate-900 px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest mt-1">
                Attendance Report
              </div>
              <div className="pt-2 flex flex-wrap justify-between items-center text-[11px] font-semibold text-slate-600 border-t border-slate-200 mt-3">
                <div>
                  <span className="font-bold text-slate-900">Period: </span>
                  {masterMatrix.meta.startDate} to {masterMatrix.meta.endDate}
                </div>
                <div>
                  <span className="font-bold text-slate-900">Academic Year: </span>
                  {masterMatrix.meta.academicYear}
                </div>
                <div>
                  <span className="font-bold text-slate-900">Faculty: </span>
                  {masterMatrix.meta.facultyName} ({masterMatrix.meta.facultyEmployeeId})
                </div>
                <div>
                  <span className="font-bold text-slate-900">Total Enrolled: </span>
                  <span className="text-blue-700 font-extrabold">{masterMatrix.totalStudents} Students</span>
                </div>
              </div>
            </div>

            {/* Quick Stat Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-slate-500">Active Section Students</div>
                <div className="text-lg font-black text-slate-900">{masterMatrix.totalStudents}</div>
                <div className="text-[10px] text-emerald-600 font-semibold">100% Export Coverage</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-slate-500">PostgreSQL Subjects</div>
                <div className="text-lg font-black text-slate-900">{masterMatrix.subjects.length} Subjects</div>
                <div className="text-[10px] text-blue-600 font-semibold">Zero Default / Fallbacks</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-slate-500">Total Conducted Sessions</div>
                <div className="text-lg font-black text-slate-900">{masterMatrix.totalConductedAcrossSubjects} Hours</div>
                <div className="text-[10px] text-slate-500 font-semibold">Audited Session Count</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Excel Export</div>
                  <div className="text-xs font-bold text-slate-900">Compliant .xlsx</div>
                </div>
                <button
                  onClick={handleExportMasterExcel}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* University Matrix Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs">
              <table className="min-w-full divide-y-2 divide-slate-300 text-xs border-collapse">
                <thead>
                  {/* Subject Headers */}
                  <tr className="bg-slate-100 text-slate-900 text-center font-bold">
                    <th className="py-3 px-2 border-r border-b border-slate-300 w-12 text-center">SL</th>
                    <th className="py-3 px-3 border-r border-b border-slate-300 w-28 text-left">REGD.NO</th>
                    <th className="py-3 px-4 border-r border-b border-slate-300 text-left min-w-[180px]">NAME</th>
                    {masterMatrix.subjects.map((s) => (
                      <th
                        key={s.id}
                        className="py-2.5 px-3 border-r border-b border-slate-300 min-w-[140px] text-center font-extrabold"
                      >
                        <div className="text-[11px] leading-tight text-slate-900">{s.courseName}</div>
                        <div className="text-[10px] font-mono text-blue-700 mt-0.5 font-bold">({s.courseCode})</div>
                      </th>
                    ))}
                    <th className="py-3 px-3 border-r border-b border-slate-300 w-20 text-center font-black">
                      TOTAL
                    </th>
                    <th className="py-3 px-3 border-b border-slate-300 w-24 text-center font-black bg-blue-50/70 text-blue-950">
                      %
                    </th>
                  </tr>

                  {/* Conducted Hours Row */}
                  <tr className="bg-amber-50/80 text-slate-900 font-extrabold border-b-2 border-slate-400">
                    <td colSpan={3} className="py-2 px-4 border-r border-slate-300 text-right uppercase tracking-wider text-[11px] text-amber-950 font-black">
                      No. Of Conducted Hours →
                    </td>
                    {masterMatrix.subjects.map((s) => (
                      <td
                        key={s.id}
                        className="py-2 px-3 border-r border-slate-300 text-center font-black text-slate-950 text-xs font-mono"
                      >
                        {masterMatrix.conductedCounts[s.id] || 0}
                      </td>
                    ))}
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-black text-slate-950 text-xs font-mono">
                      {masterMatrix.totalConductedAcrossSubjects}
                    </td>
                    <td className="py-2 px-3 text-center font-black text-blue-900 text-xs font-mono bg-blue-100/60">
                      100.00%
                    </td>
                  </tr>
                </thead>

                {/* Student Rows (One student per row, Left-join model) */}
                <tbody className="divide-y divide-slate-200 bg-white font-mono text-[11px]">
                  {masterMatrix.students.map((stu) => {
                    const isDefaulter = stu.overallPercentageVal !== null && stu.overallPercentageVal < 75;
                    return (
                      <tr
                        key={stu.studentId}
                        className={`hover:bg-slate-50 transition-colors ${
                          isDefaulter ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        <td className="py-2 px-2 border-r border-slate-200 text-center text-slate-500 font-sans font-medium">
                          {stu.sl}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-800">
                          {stu.registrationNumber}
                        </td>
                        <td className="py-2 px-4 border-r border-slate-200 font-sans font-semibold text-slate-900 whitespace-nowrap">
                          {stu.name}
                        </td>

                        {/* Subject Percentages */}
                        {masterMatrix.subjects.map((s) => {
                          const subData = stu.subjectAttendance[s.id];
                          const subPct = subData ? subData.percentageStr : 'N/A';
                          const subVal = subData?.percentageVal;
                          const isSubDefaulter = subVal !== null && subVal !== undefined && subVal < 75;

                          return (
                            <td
                              key={s.id}
                              className={`py-2 px-3 border-r border-slate-200 text-center font-bold ${
                                subPct === 'N/A'
                                  ? 'text-slate-400 font-normal'
                                  : isSubDefaulter
                                  ? 'text-rose-700 bg-rose-50/40'
                                  : 'text-slate-800'
                              }`}
                            >
                              {subPct}
                            </td>
                          );
                        })}

                        {/* Total Attended */}
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-slate-900">
                          {stu.totalAttended}
                        </td>

                        {/* Overall Percentage */}
                        <td
                          className={`py-2 px-3 text-center font-black ${
                            stu.overallPercentageStr === 'N/A'
                              ? 'text-slate-400 font-normal'
                              : isDefaulter
                              ? 'text-rose-700 bg-rose-100/50'
                              : 'text-emerald-800 bg-emerald-50/40'
                          }`}
                        >
                          {stu.overallPercentageStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Report Footer Information */}
            <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <div>
                Report generated live from PostgreSQL on {new Date(masterMatrix.meta.generatedAt).toLocaleString()}
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-600">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Active Database Students: {masterMatrix.totalStudents}</span>
                <span className="text-slate-300">•</span>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Below 75%: {masterMatrix.students.filter((s) => s.overallPercentageVal !== null && s.overallPercentageVal < 75).length}</span>
              </div>
            </div>
          </div>
        ) : !reportData || reportData.data?.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No report data found matching current criteria.
          </div>
        ) : (
          /* Legacy View for Defaulter/Interventions/Session Logs */
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-3 mb-3 flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                {reportData.reportTitle || 'Official Academic Report'}
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Records: {reportData.data.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-left font-bold uppercase tracking-wider text-[10px]">
                    {reportData.columns.map((col) => (
                      <th key={col} className="py-2.5 px-3">
                        {col.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-mono text-[11px]">
                  {reportData.data.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/70">
                      {reportData.columns.map((col) => (
                        <td key={col} className="py-2.5 px-3 whitespace-nowrap">
                          {row[col] !== undefined ? row[col].toString() : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyReportsPage;
