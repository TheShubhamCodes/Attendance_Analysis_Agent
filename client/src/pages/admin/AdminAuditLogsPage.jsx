import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  FileText,
  Search,
  Filter,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
} from 'lucide-react';

export const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchAuditLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
      });
      if (actionFilter) params.append('action', actionFilter);
      if (targetTypeFilter) params.append('targetType', targetTypeFilter);
      if (search) params.append('search', search);

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      if (res.data?.success) {
        setLogs(res.data.data.logs);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(1);
  }, [actionFilter, targetTypeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAuditLogs(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-400" />
            System Audit Logs & Governance Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Immutable chronicle of administrative interventions, HOD rotations, manual attendance edits, and user state changes.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search details, target names, or actions..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="">All Actions</option>
            <option value="HOD_CHANGED">HOD_CHANGED</option>
            <option value="ATTENDANCE_MODIFIED">ATTENDANCE_MODIFIED</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="USER_STATUS_CHANGED">USER_STATUS_CHANGED</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="FACULTY_ASSIGNMENT_CHANGED">FACULTY_ASSIGNMENT_CHANGED</option>
            <option value="PARENT_STUDENT_LINKED">PARENT_STUDENT_LINKED</option>
            <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
          </select>

          <button
            onClick={() => fetchAuditLogs(pagination.page)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Record</th>
                <th className="py-3.5 px-4">Actor Role</th>
                <th className="py-3.5 px-4">Audit Payload & Changes</th>
                <th className="py-3.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No audit records match the selected filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  let parsedDetails = null;
                  try {
                    parsedDetails = JSON.parse(log.details);
                  } catch (e) {
                    parsedDetails = { raw: log.details };
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase ${
                            log.action === 'ATTENDANCE_MODIFIED'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                              : log.action === 'HOD_CHANGED'
                              ? 'bg-purple-950/60 text-purple-300 border border-purple-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {log.targetName || log.targetType}
                        <span className="text-slate-500 text-[10px] font-mono block">
                          Type: {log.targetType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-purple-300">
                        {log.actorRole}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-md">
                        {parsedDetails ? (
                          <div className="space-y-0.5 text-[11px]">
                            {parsedDetails.previous && (
                              <p>
                                <span className="text-slate-500">Previous:</span>{' '}
                                <span className="text-rose-400 font-bold">{parsedDetails.previous}</span>
                              </p>
                            )}
                            {parsedDetails.changedTo && (
                              <p>
                                <span className="text-slate-500">Changed To:</span>{' '}
                                <span className="text-emerald-400 font-bold">{parsedDetails.changedTo}</span>
                              </p>
                            )}
                            {parsedDetails.reason && (
                              <p className="italic text-slate-400">"{parsedDetails.reason}"</p>
                            )}
                            {parsedDetails.modifiedBy && (
                              <p className="text-[10px] text-slate-500">By: {parsedDetails.modifiedBy}</p>
                            )}
                            {parsedDetails.newHod && (
                              <p className="text-indigo-300 font-semibold">
                                New HOD: {parsedDetails.newHod} (Prev: {parsedDetails.previousHod})
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No details</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {logs.length} of {pagination.total} audit records
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchAuditLogs(pagination.page - 1)}
              className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-300">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchAuditLogs(pagination.page + 1)}
              className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditLogsPage;
