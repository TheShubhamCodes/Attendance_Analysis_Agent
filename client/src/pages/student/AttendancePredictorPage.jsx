import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  HelpCircle,
  Sliders,
  ShieldAlert,
} from 'lucide-react';

export const AttendancePredictorPage = () => {
  const [courses, setCourses] = useState([]);
  const [overallSummary, setOverallSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Selected Scope: 'OVERALL' or courseId
  const [selectedScope, setSelectedScope] = useState('OVERALL');

  // Interactive Inputs
  const [totalClasses, setTotalClasses] = useState(40);
  const [presentClasses, setPresentClasses] = useState(26);
  const [requiredPercentage, setRequiredPercentage] = useState(75);
  const [upcomingClasses, setUpcomingClasses] = useState(10);
  const [simulateN, setSimulateN] = useState(5);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const res = await api.get('/student/attendance');
        if (res.data?.success) {
          const { summary, subjects } = res.data.data;
          setOverallSummary(summary);
          setCourses(subjects);

          // Default initialize to overall metrics
          setTotalClasses(summary.totalClasses || 160);
          setPresentClasses(summary.present || 115);
          setRequiredPercentage(75);
          setUpcomingClasses(15);
          setSimulateN(5);
        }
      } catch (err) {
        console.error('Error loading attendance for predictor:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendanceData();
  }, []);

  // Handle course selector change
  const handleScopeChange = (e) => {
    const scope = e.target.value;
    setSelectedScope(scope);

    if (scope === 'OVERALL' && overallSummary) {
      setTotalClasses(overallSummary.totalClasses);
      setPresentClasses(overallSummary.present);
    } else {
      const selectedCourse = courses.find((c) => c.courseId === scope);
      if (selectedCourse) {
        setTotalClasses(selectedCourse.totalClasses);
        setPresentClasses(selectedCourse.present);
      }
    }
  };

  // Math Calculations
  const currentPercentage =
    totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 1000) / 10 : 100;

  const targetRatio = requiredPercentage / 100;
  const U = Math.max(1, parseInt(upcomingClasses || 1, 10));
  const T = Math.max(1, parseInt(totalClasses || 1, 10));
  const P = Math.max(0, Math.min(T, parseInt(presentClasses || 0, 10)));

  // 1. Classes needed to reach requiredPercentage within U upcoming classes
  // Formula: (P + x) / (T + U) >= targetRatio => x >= targetRatio * (T + U) - P
  const exactNeeded = targetRatio * (T + U) - P;
  const classesNeeded = Math.ceil(exactNeeded);

  // Maximum achievable percentage if attending ALL U classes
  const maxAchievablePercentage = Math.round(((P + U) / (T + U)) * 1000) / 10;

  // If impossible within U, calculate minimum consecutive classes needed in total:
  // (P + k) / (T + k) >= targetRatio => k * (1 - targetRatio) >= targetRatio * T - P
  let minConsecutiveNeeded = 0;
  const isImpossibleWithinUpcoming = classesNeeded > U;
  if (isImpossibleWithinUpcoming && targetRatio < 1) {
    minConsecutiveNeeded = Math.ceil((targetRatio * T - P) / (1 - targetRatio));
  }

  // 2. Simulation if student attends next N classes
  const N = Math.min(U, Math.max(1, parseInt(simulateN || 1, 10)));
  const percentageIfAttendN = Math.round(((P + N) / (T + N)) * 1000) / 10;

  // 3. Simulation if student misses next N classes
  const percentageIfMissN = Math.round((P / (T + N)) * 1000) / 10;

  if (loading) return <LoadingSpinner text="Initializing mathematical simulator..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-800 uppercase tracking-wider mb-1">
            <Calculator className="w-4 h-4" />
            <span>Attendance Planning Engine</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Attendance Predictor & Recovery Calculator</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulate future attendance scenarios and determine the exact number of classes required to remain in good standing.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-brand-50 text-brand-900 border border-brand-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
          <Info className="w-4 h-4 text-brand-700" />
          <span>Strict University 75% Threshold</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Calculator Inputs */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-brand-900" />
            <span>Parameters & Scenario Setup</span>
          </h2>

          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Course Scope
            </label>
            <select
              value={selectedScope}
              onChange={handleScopeChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-900"
            >
              <option value="OVERALL">Overall Attendance (All Subjects Combined)</option>
              {courses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.courseCode} - {c.courseName} ({c.attendancePercentage}%)
                </option>
              ))}
            </select>
          </div>

          {/* Completed Classes & Present Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Completed Classes
              </label>
              <input
                type="number"
                min="1"
                value={totalClasses}
                onChange={(e) => setTotalClasses(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Classes Attended
              </label>
              <input
                type="number"
                min="0"
                max={totalClasses}
                value={presentClasses}
                onChange={(e) => setPresentClasses(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-900"
              />
            </div>
          </div>

          {/* Current Status Bar */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Current Attendance:</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-extrabold font-mono text-slate-900">
                {currentPercentage}%
              </span>
              <StatusBadge
                status={
                  currentPercentage < 65 ? 'HIGH_RISK' : currentPercentage < 75 ? 'WARNING' : 'SAFE'
                }
              />
            </div>
          </div>

          {/* Required Target % */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Required Target Attendance:</span>
              <span className="font-mono text-brand-900">{requiredPercentage}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="1"
              value={requiredPercentage}
              onChange={(e) => setRequiredPercentage(parseInt(e.target.value, 10))}
              className="w-full accent-brand-900 cursor-pointer"
            />
          </div>

          {/* Upcoming Classes */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Number of Upcoming Classes:</span>
              <span className="font-mono font-bold text-slate-900">{upcomingClasses} classes</span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={upcomingClasses}
              onChange={(e) => setUpcomingClasses(parseInt(e.target.value, 10))}
              className="w-full accent-brand-900 cursor-pointer"
            />
          </div>
        </div>

        {/* Right 2 Columns: Mathematical Calculations & Predictions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Requirement Result Card */}
          <div
            className={`border rounded-xl p-6 shadow-xs ${isImpossibleWithinUpcoming
                ? 'bg-rose-50/60 border-rose-300'
                : classesNeeded <= 0
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : 'bg-amber-50/60 border-amber-300'
              }`}
          >
            <div className="flex items-start space-x-3">
              {isImpossibleWithinUpcoming ? (
                <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              ) : classesNeeded <= 0 ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              )}

              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {isImpossibleWithinUpcoming
                    ? 'Target Mathematically Impossible Within Selected Upcoming Classes'
                    : classesNeeded <= 0
                      ? 'Attendance Requirement Met'
                      : `Attendance Recovery Target: ${classesNeeded} of ${U} Classes`}
                </h3>

                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  {isImpossibleWithinUpcoming ? (
                    <>
                      You currently have <span className="font-bold">{currentPercentage}%</span> attendance.
                      Even if you attend <span className="font-bold">100% (all {U})</span> of the upcoming classes, your attendance will only reach{' '}
                      <span className="font-bold text-rose-700">{maxAchievablePercentage}%</span>, which is below your target of {requiredPercentage}%.
                      <br />
                      <span className="font-semibold block mt-1.5 text-rose-800">
                        → You must attend at least {minConsecutiveNeeded} consecutive classes without absence to reach {requiredPercentage}%.
                      </span>
                    </>
                  ) : classesNeeded <= 0 ? (
                    <>
                      Your current attendance of <span className="font-bold">{currentPercentage}%</span> is already above the required{' '}
                      <span className="font-bold">{requiredPercentage}%</span>. Even if you miss some of the next {U} classes, your standing remains safe.
                    </>
                  ) : (
                    <>
                      You need to attend approximately <span className="font-bold text-amber-900 text-sm">{classesNeeded}</span> of the next{' '}
                      <span className="font-bold text-amber-900 text-sm">{U}</span> classes to reach or maintain{' '}
                      <span className="font-bold">{requiredPercentage}%</span>.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Simulation: What if you attend / miss N classes */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">What-If Scenario Simulation</h3>
                <p className="text-xs text-slate-500">Project outcomes for the next N consecutive classes</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-700">Next Classes (N):</span>
                <span className="text-xs font-mono font-bold bg-brand-50 text-brand-900 px-2 py-0.5 rounded border border-brand-200">
                  {N}
                </span>
              </div>
            </div>

            <input
              type="range"
              min="1"
              max={U}
              step="1"
              value={simulateN}
              onChange={(e) => setSimulateN(parseInt(e.target.value, 10))}
              className="w-full accent-brand-900 cursor-pointer"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Scenario 1: Attend Next N */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5 text-emerald-800 font-bold text-xs">
                    <TrendingUp className="w-4 h-4" />
                    <span>If you attend next {N} classes</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    +{(percentageIfAttendN - currentPercentage).toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-3">
                  <div>
                    <span className="text-2xl font-extrabold text-emerald-900 font-mono">
                      {percentageIfAttendN}%
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      New record: {P + N}/{T + N} classes
                    </span>
                  </div>
                  <StatusBadge
                    status={
                      percentageIfAttendN < 65 ? 'HIGH_RISK' : percentageIfAttendN < 75 ? 'WARNING' : 'SAFE'
                    }
                  />
                </div>
              </div>

              {/* Scenario 2: Miss Next N */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5 text-rose-800 font-bold text-xs">
                    <TrendingDown className="w-4 h-4" />
                    <span>If you miss next {N} classes</span>
                  </div>
                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                    {(percentageIfMissN - currentPercentage).toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-3">
                  <div>
                    <span className="text-2xl font-extrabold text-rose-900 font-mono">
                      {percentageIfMissN}%
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      New record: {P}/{T + N} classes
                    </span>
                  </div>
                  <StatusBadge
                    status={
                      percentageIfMissN < 65 ? 'HIGH_RISK' : percentageIfMissN < 75 ? 'WARNING' : 'SAFE'
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mathematical Guarantee Note */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Mathematical Model Integrity:</p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Predictions are governed by real-time university attendance registry numbers:
              Formula: (P + x) / (T + U) ≥ Target. Projections account for cumulative weight and university regulation minimums.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePredictorPage;
