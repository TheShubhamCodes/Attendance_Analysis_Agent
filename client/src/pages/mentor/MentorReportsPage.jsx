import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Users,
  AlertTriangle,
  HeartHandshake,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react';

export const MentorReportsPage = () => {
  const [reportType, setReportType] = useState('ATTENDANCE');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = async (type) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/mentor/reports?type=${type}`);
      if (res.data?.success) {
        setReportData(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to generate report.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error generating report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(reportType);
  }, [reportType]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.records || reportData.records.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    const keys = Object.keys(reportData.records[0]);
    csvContent += keys.join(',') + '\r\n';

    reportData.records.forEach((row) => {
      const values = keys.map((k) => `"${row[k] || ''}"`);
      csvContent += values.join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mentor_${reportType.toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportTabs = [
    { id: 'ATTENDANCE', label: 'Assigned Attendance Report', icon: Users },
    { id: 'AT_RISK', label: 'At-Risk Students Report', icon: AlertTriangle },
    { id: 'SHORTAGE', label: 'Attendance Shortage (<75%)', icon: AlertTriangle },
    { id: 'TRENDS', label: 'Attendance Trend Report', icon: TrendingUp },
    { id: 'INTERVENTIONS', label: 'Interventions Report', icon: HeartHandshake },
    { id: 'EFFECTIVENESS', label: 'Intervention Effectiveness', icon: CheckCircle },
    { id: 'FOLLOW_UP', label: 'Pending Follow-Ups', icon: Clock },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-600" />
            <span>Mentor Academic Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scoped reporting on attendance, risk models, and counseling effectiveness for assigned mentees.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!reportData || !reportData.records || reportData.records.length === 0}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportType(tab.id)}
              className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Compiling report data...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      ) : !reportData || !reportData.records || reportData.records.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No records found for this report
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            There are currently no matching records under this category for your assigned mentees.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {reportData.reportTitle || 'Report'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Generated on {new Date().toLocaleString()} • {reportData.records.length} records
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  {Object.keys(reportData.records[0]).map((col) => (
                    <th key={col} className="px-5 py-3.5">
                      {col.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportData.records.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    {Object.keys(row).map((col) => {
                      const val = row[col];
                      return (
                        <td key={col} className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                          {val !== null && val !== undefined ? String(val) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorReportsPage;
