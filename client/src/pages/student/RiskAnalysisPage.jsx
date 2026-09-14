import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Activity,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Info,
  Calendar,
  Users,
  Layers,
} from 'lucide-react';

export const RiskAnalysisPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRisk = async () => {
      try {
        const res = await api.get('/student/risk');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not perform risk analysis.');
      } finally {
        setLoading(false);
      }
    };
    fetchRisk();
  }, []);

  if (loading) return <LoadingSpinner text="Evaluating academic risk vectors..." />;

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700 text-sm">
        <p>{error || 'An error occurred while computing the risk analysis report.'}</p>
      </div>
    );
  }

  const {
    level,
    score,
    overallAttendancePercentage,
    overallAcademicPercentage,
    reasons,
    recommendedActions,
    engineType,
    modelDisclaimer,
    subjectStats,
  } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-800 uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Academic Early Warning Intelligence</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">AI Risk Analysis & Diagnostic Report</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Holistic assessment of attendance trajectory, consecutive evaluations, and subject vulnerability
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>{engineType}</span>
        </div>
      </div>

      {/* Primary Classification Banner */}
      <div
        className={`border rounded-xl p-6 shadow-xs ${
          level === 'HIGH'
            ? 'bg-rose-50/70 border-rose-300'
            : level === 'MEDIUM'
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-emerald-50/70 border-emerald-300'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold shadow-sm ${
                level === 'HIGH' ? 'bg-rose-600' : level === 'MEDIUM' ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
            >
              {level === 'HIGH' ? (
                <AlertOctagon className="w-7 h-7" />
              ) : level === 'MEDIUM' ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <CheckCircle2 className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Current Classification:
                </span>
                <span
                  className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full ${
                    level === 'HIGH'
                      ? 'bg-rose-200/80 text-rose-900'
                      : level === 'MEDIUM'
                      ? 'bg-amber-200/80 text-amber-900'
                      : 'bg-emerald-200/80 text-emerald-900'
                  }`}
                >
                  {level === 'HIGH' ? 'HIGH RISK' : level === 'MEDIUM' ? 'MEDIUM RISK' : 'LOW RISK'}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {level === 'HIGH'
                  ? 'Immediate Academic Intervention Required'
                  : level === 'MEDIUM'
                  ? 'Borderline Standing — Proactive Action Recommended'
                  : 'Satisfactory Standing — Good Compliance'}
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Evaluated against university criteria across 4 core factors: Cumulative attendance, weekly trajectory stability, continuous assessment marks, and unexcused absence frequency.
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-300/50 sm:pl-6">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Risk Vulnerability Index
            </span>
            <span className="text-3xl font-black font-mono text-slate-900">{score}</span>
            <span className="text-xs text-slate-500 font-mono"> / 100</span>
          </div>
        </div>
      </div>

      {/* Two Column Breakdown: Reasons (WHY) and Recommended Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reasons Section ("WHY") */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Diagnostic Breakdown ("Why")</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Triggered Factors</span>
          </div>

          <ul className="space-y-3">
            {reasons.map((reason, idx) => (
              <li
                key={idx}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 flex items-start space-x-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 flex-shrink-0"></div>
                <span className="leading-relaxed font-medium">{reason}</span>
              </li>
            ))}
          </ul>

          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Overall Attendance: <strong className="text-slate-800">{overallAttendancePercentage}%</strong></span>
            <span>Academic Average: <strong className="text-slate-800">{overallAcademicPercentage}%</strong></span>
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-brand-700" />
              <span>Recommended Action Plan</span>
            </h3>
            <span className="text-[11px] text-brand-800 font-semibold">Priority Roadmap</span>
          </div>

          <ul className="space-y-3">
            {recommendedActions.map((action, idx) => (
              <li
                key={idx}
                className="p-3 bg-brand-50/50 rounded-lg border border-brand-100 text-xs text-brand-950 flex items-start space-x-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-brand-700 mt-1.5 flex-shrink-0"></div>
                <span className="leading-relaxed font-medium">{action}</span>
              </li>
            ))}
          </ul>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <Link
              to="/student/mentor"
              className="flex-1 py-2 px-3 bg-brand-900 hover:bg-brand-950 text-white rounded-lg text-xs font-semibold text-center transition-colors flex items-center justify-center space-x-1"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              <span>Schedule Mentor Guidance</span>
            </Link>
            <Link
              to="/student/attendance-predictor"
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
            >
              Simulate Recovery
            </Link>
          </div>
        </div>
      </div>

      {/* Subject-Wise Risk Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 pb-3 border-b border-slate-100">
          Course-Level Vulnerability Assessment
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjectStats.map((subj) => (
            <div
              key={subj.courseId}
              className={`p-4 rounded-xl border ${
                subj.status === 'HIGH_RISK'
                  ? 'bg-rose-50/40 border-rose-200'
                  : subj.status === 'WARNING'
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-emerald-50/40 border-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-brand-950">{subj.courseCode}</span>
                <StatusBadge status={subj.status} />
              </div>
              <h4 className="text-xs font-bold text-slate-900 truncate" title={subj.courseName}>
                {subj.courseName}
              </h4>
              <div className="mt-3 flex items-baseline justify-between text-xs">
                <span className="text-2xl font-extrabold text-slate-900">{subj.percentage}%</span>
                <span className="text-[11px] text-slate-500">
                  {subj.present}/{subj.total} classes
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Machine Learning Architecture Transparency Disclaimer */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-3">
        <Info className="w-5 h-5 text-brand-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-800">Engine Transparency Statement:</p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            {modelDisclaimer} The backend rule engine executes transparent multi-factor scoring against official university thresholds. The architecture is ready to interface with trained machine learning predictive models in future releases.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiskAnalysisPage;
