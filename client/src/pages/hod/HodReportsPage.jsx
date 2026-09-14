import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Filter,
  Calendar,
  Layers,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const HodReportsPage = () => {
  const [reportType, setReportType] = useState('department_attendance');
  const [section, setSection] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reportTypes = [
    { id: 'department_attendance', label: '1. Department Attendance Summary Report' },
    { id: 'section_attendance', label: '2. Section-Wise Student Attendance Report' },
    { id: 'defaulter', label: '3. Attendance Defaulter Report (< 75%)' },
    { id: 'faculty_attendance', label: '4. Faculty Attendance Submission & Activity Report' },
    { id: 'audit_log', label: '5. Attendance Correction & Modification Audit Trail' },
  ];

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/hod/reports', {
        params: {
          reportType,
          section,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });

      if (res.data?.success) {
        setReportData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate report from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, section, startDate, endDate]);

  const exportToCsv = () => {
    if (!reportData || !reportData.data || reportData.data.length === 0) return;

    const headers = reportData.columns || Object.keys(reportData.data[0]);
    const csvRows = [];

    // Header row
    csvRows.push(headers.join(','));

    // Data rows
    reportData.data.forEach((row) => {
      const values = headers.map((header) => {
        const val = row[header] !== undefined ? row[header] : '';
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>Academic & Attendance Reports Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time compliance analytics and exportable reports generated directly from PostgreSQL records.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={exportToCsv}
            disabled={!reportData || !reportData.data || reportData.data.length === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter and Report Configuration Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Report Type Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Report Category *
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            >
              {reportTypes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Section */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Section Scope
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Department Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          {/* 3. Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 4. End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Report Table Display */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Report Title Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {reportData?.reportTitle || 'Department Report'}
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {reportData?.data?.length || 0} Records Returned
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
            Querying PostgreSQL database and generating report table...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600">{error}</div>
        ) : reportData?.data && reportData.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  {reportData.columns.map((col) => (
                    <th key={col} className="px-4 py-3">
                      {col.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    {reportData.columns.map((col) => {
                      const val = row[col];
                      const isPct = ('' + val).includes('%');
                      return (
                        <td
                          key={col}
                          className={`px-4 py-3 ${
                            col === 'registrationNumber' || col === 'employeeId' || col === 'courseCode'
                              ? 'font-mono font-bold text-slate-900'
                              : isPct
                              ? 'font-mono font-bold text-indigo-700'
                              : ''
                          }`}
                        >
                          {val !== undefined ? '' + val : 'N/A'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">
            No report data available for the specified dates and parameters.
          </div>
        )}
      </div>
    </div>
  );
};

export default HodReportsPage;
