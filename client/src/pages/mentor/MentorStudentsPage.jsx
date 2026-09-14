import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Search,
  Filter,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  HeartHandshake,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const MentorStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await api.get('/mentor/students');
        if (res.data?.success) {
          setStudents(res.data.data.students || []);
        } else {
          setError(res.data?.message || 'Failed to fetch assigned students.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Server error loading students.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // 1. Text search by name or registration number
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.registrationNumber.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // 2. Filter classification
      if (selectedFilter === 'BELOW_75') return s.overallAttendance < 75;
      if (selectedFilter === 'HIGH_RISK') return s.riskLevel === 'HIGH_RISK' || s.riskLevel === 'CRITICAL' || s.riskLevel === 'HIGH';
      if (selectedFilter === 'MEDIUM_RISK') return s.riskLevel === 'MEDIUM_RISK' || s.riskLevel === 'MEDIUM';
      if (selectedFilter === 'LOW_RISK') return s.riskLevel === 'LOW_RISK' || s.riskLevel === 'LOW';
      if (selectedFilter === 'IMPROVING') return s.trend === 'IMPROVING';
      if (selectedFilter === 'DECLINING') return s.trend === 'DECLINING';
      if (selectedFilter === 'INTERVENTION_REQUIRED') return s.interventionRequired === true || s.overallAttendance < 75;

      return true;
    });
  }, [students, searchTerm, selectedFilter]);

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'HIGH_RISK':
      case 'HIGH':
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400">
            High Risk
          </span>
        );
      case 'MEDIUM_RISK':
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
            Medium Risk
          </span>
        );
      case 'LOW_RISK':
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-400">
            Low Risk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
            Safe
          </span>
        );
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'IMPROVING') {
      return (
        <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Improving</span>
        </span>
      );
    }
    if (trend === 'DECLINING') {
      return (
        <span className="inline-flex items-center space-x-1 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Declining</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 text-slate-500 text-xs font-semibold">
        <Minus className="w-3.5 h-3.5" />
        <span>Stable</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span>My Assigned Students</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Displaying only students officially assigned to your mentorship cohort ({students.length} students total).
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or reg number..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Mentees' },
            { id: 'BELOW_75', label: '< 75% Attendance' },
            { id: 'HIGH_RISK', label: 'High Risk' },
            { id: 'MEDIUM_RISK', label: 'Medium Risk' },
            { id: 'LOW_RISK', label: 'Low Risk' },
            { id: 'IMPROVING', label: 'Improving' },
            { id: 'DECLINING', label: 'Declining' },
            { id: 'INTERVENTION_REQUIRED', label: 'Intervention Required' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedFilter === f.id
                  ? 'bg-teal-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Loading student attendance records...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No matching assigned students found
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {students.length === 0
              ? 'No students are currently assigned to you.'
              : 'Try clearing your search query or selecting another filter.'}
          </p>
        </div>
      ) : (
        /* Students Table */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Registration No.</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-4 py-3.5">Sec / Year</th>
                  <th className="px-5 py-3.5 text-center">Attendance</th>
                  <th className="px-4 py-3.5 text-center">Risk Level</th>
                  <th className="px-4 py-3.5 text-center">Trend</th>
                  <th className="px-5 py-3.5">Intervention Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((s) => {
                  const isShortage = s.overallAttendance < 75;
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                        {s.registrationNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                        <div className="text-[11px] text-slate-400">{s.departmentName}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        Sec {s.section} • Year {s.year} (Sem {s.semester})
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div
                          className={`text-sm font-black ${
                            isShortage
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {s.overallAttendance}%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {s.adjustedAttendance !== s.overallAttendance && (
                            <span>Adj: {s.adjustedAttendance}%</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {getRiskBadge(s.riskLevel)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {getTrendIcon(s.trend)}
                      </td>
                      <td className="px-5 py-3.5">
                        {s.lastIntervention ? (
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {s.lastIntervention.type.replace('_', ' ')}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {new Date(s.lastIntervention.date).toLocaleDateString()} • {s.lastIntervention.status.replace('_', ' ')}
                            </div>
                          </div>
                        ) : s.interventionRequired ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                            <HeartHandshake className="w-3 h-3" />
                            <span>Action Required</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None recorded</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/mentor/students/${s.id}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-400 font-bold text-xs transition-colors"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-right text-xs text-slate-500">
            Showing {filteredStudents.length} of {students.length} assigned mentees
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorStudentsPage;
