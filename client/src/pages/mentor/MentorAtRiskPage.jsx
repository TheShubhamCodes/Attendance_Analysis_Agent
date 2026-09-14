import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  AlertTriangle,
  AlertOctagon,
  TrendingDown,
  TrendingUp,
  Minus,
  HeartHandshake,
  ChevronRight,
  Sparkles,
  Search,
} from 'lucide-react';

export const MentorAtRiskPage = () => {
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');

  useEffect(() => {
    const fetchAtRisk = async () => {
      try {
        setLoading(true);
        const res = await api.get('/mentor/at-risk');
        if (res.data?.success) {
          setAtRiskStudents(res.data.data.atRiskStudents || []);
        } else {
          setError(res.data?.message || 'Failed to fetch at-risk students.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Server error loading at-risk students.');
      } finally {
        setLoading(false);
      }
    };
    fetchAtRisk();
  }, []);

  const filtered = atRiskStudents.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchQ =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.registrationNumber.toLowerCase().includes(q);
    if (!matchQ) return false;

    if (levelFilter === 'HIGH_RISK') return s.riskLevel === 'HIGH_RISK';
    if (levelFilter === 'MEDIUM_RISK') return s.riskLevel === 'MEDIUM_RISK';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span>At-Risk Students</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Mentees predicted to breach the 75% statutory threshold based on Agent trajectory regression analysis.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/mentor/agent"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Consult Agent</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or registration no..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['ALL', 'HIGH_RISK', 'MEDIUM_RISK'].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevelFilter(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                levelFilter === l
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {l === 'ALL' ? 'All At-Risk' : l === 'HIGH_RISK' ? 'High Risk Only' : 'Medium Risk Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Evaluating trajectory models...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <AlertOctagon className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No at-risk students identified
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All your assigned mentees are currently maintaining satisfactory attendance trajectories above 75%.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => {
            const isHighRisk = s.riskLevel === 'HIGH_RISK';
            return (
              <div
                key={s.id}
                className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs space-y-3 transition-all ${
                  isHighRisk
                    ? 'border-rose-200 dark:border-rose-900/60 hover:border-rose-300'
                    : 'border-amber-200 dark:border-amber-900/60 hover:border-amber-300'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          isHighRisk
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                        }`}
                      >
                        {s.riskLevel.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Sec {s.section}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {s.name}
                    </h3>
                    <div className="text-xs text-slate-400 font-mono">{s.registrationNumber}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                      {s.currentAttendance}%
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Projected: <span className="font-bold text-slate-700 dark:text-slate-300">{s.projectedAttendance}%</span>
                    </div>
                  </div>
                </div>

                {/* Trend & Reason */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Trajectory:</span>
                    <span className="font-semibold flex items-center space-x-1">
                      {s.trend === 'DECLINING' ? (
                        <span className="text-rose-600 flex items-center space-x-1">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Declining Momentum</span>
                        </span>
                      ) : s.trend === 'IMPROVING' ? (
                        <span className="text-emerald-600 flex items-center space-x-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Improving</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center space-x-1">
                          <Minus className="w-3.5 h-3.5" />
                          <span>Stable</span>
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Evaluation: </span>
                    {s.riskReason || 'Attendance deficit observed'}
                  </div>
                </div>

                {/* Recommended Action */}
                <div className="p-3 bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 rounded-xl text-xs text-teal-900 dark:text-teal-300">
                  <span className="font-bold">Recommended Intervention: </span>
                  <span>{s.recommendedAction}</span>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    {s.departmentName}
                  </span>
                  <Link
                    to={`/mentor/students/${s.id}`}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400"
                  >
                    <span>Record Intervention</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MentorAtRiskPage;
