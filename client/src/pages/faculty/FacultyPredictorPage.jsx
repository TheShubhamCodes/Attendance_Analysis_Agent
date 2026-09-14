import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Info,
  Sliders,
  Users,
  Layers,
} from 'lucide-react';

export const FacultyPredictorPage = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedScope, setSelectedScope] = useState('OVERALL'); // 'OVERALL' or courseId

  // Simulation inputs
  const [targetPercentage, setTargetPercentage] = useState(75);
  const [upcomingClasses, setUpcomingClasses] = useState(15);
  const [simulateN, setSimulateN] = useState(5);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch counselor students with real attendance
  useEffect(() => {
    const fetchPredictorData = async () => {
      try {
        const res = await api.get('/faculty/predictor');
        if (res.data?.success) {
          const list = res.data.data || [];
          setStudents(list);
          if (list.length > 0) {
            setSelectedStudentId(list[0].id);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load predictor data.');
      } finally {
        setLoading(false);
      }
    };
    fetchPredictorData();
  }, []);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Determine active P (attended) and T (total)
  let currentP = 0;
  let currentT = 0;

  if (selectedStudent) {
    if (selectedScope === 'OVERALL') {
      currentP = selectedStudent.overall.presentClasses;
      currentT = selectedStudent.overall.totalClasses;
    } else {
      const subj = selectedStudent.subjects.find((sub) => sub.courseId === selectedScope);
      if (subj) {
        currentP = subj.presentClasses;
        currentT = subj.totalClasses;
      }
    }
  }

  // Current Percentage
  const currentPercentage =
    currentT > 0 ? Math.round((currentP / currentT) * 1000) / 10 : 100;

  // Mathematical formula calculations:
  // (P + x) / (T + U) >= Target => x >= Target*(T + U) - P
  const targetRatio = targetPercentage / 100;
  const U = Math.max(1, parseInt(upcomingClasses || 1, 10));
  const T = Math.max(1, currentT);
  const P = Math.max(0, currentP);

  const exactClassesNeeded = targetRatio * (T + U) - P;
  const classesNeededToAttend = Math.ceil(exactClassesNeeded);

  // Maximum achievable percentage if student attends all U upcoming classes
  const maxAchievable = Math.round(((P + U) / (T + U)) * 1000) / 10;

  // Is achievable within upcoming classes?
  const isAchievableWithinUpcoming = classesNeededToAttend <= U;

  // If impossible within U, minimum consecutive classes needed overall:
  // (P + k) / (T + k) >= Target => k >= (Target*T - P) / (1 - Target)
  let minConsecutiveTotal = 0;
  if (!isAchievableWithinUpcoming && targetRatio < 1) {
    minConsecutiveTotal = Math.ceil((targetRatio * T - P) / (1 - targetRatio));
  }

  // Simulation: Attend next N classes
  const N = Math.min(U, Math.max(1, parseInt(simulateN || 1, 10)));
  const percentageIfAttendN = Math.round(((P + N) / (T + N)) * 1000) / 10;

  // Simulation: Miss next N classes
  const percentageIfMissN = Math.round((P / (T + N)) * 1000) / 10;

  if (loading) return <LoadingSpinner text="Initializing attendance prediction engine..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
            <Calculator className="w-4 h-4" />
            <span>Mathematical Recovery Simulator</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Counselor Student Attendance Predictor
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulate recovery trajectories and calculate the exact number of future periods a counselor student must attend to reach good standing.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-blue-50 text-blue-900 border border-blue-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Real PostgreSQL Attendance Data</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Selection & Parameters */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Simulation Setup</span>
          </h2>

          {/* Student Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Counselor Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setSelectedScope('OVERALL');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.registrationNumber} - {s.name} ({s.overall.percentage}%)
                </option>
              ))}
            </select>
          </div>

          {/* Course Scope Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Course Scope
            </label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="OVERALL">Overall Attendance (All Subjects Combined)</option>
              {selectedStudent?.subjects.map((sub) => (
                <option key={sub.courseId} value={sub.courseId}>
                  {sub.courseCode} - {sub.courseName} ({sub.percentage}%)
                </option>
              ))}
            </select>
          </div>

          {/* Target Attendance % */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Target Threshold
              </label>
              <span className="font-mono font-bold text-xs text-blue-700">{targetPercentage}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={targetPercentage}
              onChange={(e) => setTargetPercentage(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Upcoming Classes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Scheduled Future Classes (U)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={upcomingClasses}
              onChange={(e) => setUpcomingClasses(Math.max(1, parseInt(e.target.value || 1, 10)))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-800"
            />
          </div>

          {/* Immediate Simulation N */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Simulate Next N Classes (N)
            </label>
            <input
              type="number"
              min="1"
              max={upcomingClasses}
              value={simulateN}
              onChange={(e) => setSimulateN(Math.max(1, parseInt(e.target.value || 1, 10)))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* Right 2 Columns: Mathematical Simulation Results */}
        <div className="lg:col-span-2 space-y-5">
          {/* Current Standing Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Student</span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedStudent?.name} ({selectedStudent?.registrationNumber})
                </h3>
                <p className="text-xs text-slate-500">
                  Section {selectedStudent?.section} • Department of {selectedStudent?.department}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Current Attendance</span>
                <p
                  className={`text-2xl font-black font-mono ${
                    currentPercentage >= 75
                      ? 'text-emerald-600'
                      : currentPercentage >= 65
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                >
                  {currentPercentage}%
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {currentP} / {currentT} periods
                </p>
              </div>
            </div>

            {/* Target Recovery Calculation Result */}
            <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 ${
                    isAchievableWithinUpcoming
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {isAchievableWithinUpcoming ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Required Attendance To Reach {targetPercentage}% Threshold
                  </h4>

                  {isAchievableWithinUpcoming ? (
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      The student must attend at least{' '}
                      <strong className="text-blue-700 font-mono text-sm">
                        {Math.max(0, classesNeededToAttend)}
                      </strong>{' '}
                      out of the next <strong>{upcomingClasses}</strong> upcoming classes to achieve or exceed{' '}
                      <strong>{targetPercentage}%</strong> attendance.
                    </p>
                  ) : (
                    <div className="mt-1 space-y-1 text-xs text-rose-700">
                      <p>
                        Mathematically impossible within the next {upcomingClasses} classes. Even if the student attends all {upcomingClasses} periods, their maximum achievable attendance will be{' '}
                        <strong>{maxAchievable}%</strong>.
                      </p>
                      {minConsecutiveTotal > 0 && (
                        <p className="text-slate-700 font-medium">
                          The student requires a minimum of{' '}
                          <strong className="text-blue-700 font-mono text-sm">{minConsecutiveTotal}</strong>{' '}
                          consecutive attended periods in total to recover to {targetPercentage}%.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 font-mono text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                    Formula: (P + x) / (T + U) ≥ Target → ({currentP} + x) / ({currentT} + {U}) ≥{' '}
                    {targetRatio}
                  </div>
                </div>
              </div>
            </div>

            {/* Trajectory Scenarios */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scenario 1: Attend Next N */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Scenario: Attends Next {N} Classes</span>
                </div>
                <p className="text-xl font-black text-emerald-900 font-mono">
                  {percentageIfAttendN}%
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Trajectory gain of +{Math.max(0, Math.round((percentageIfAttendN - currentPercentage) * 10) / 10)}%
                </p>
              </div>

              {/* Scenario 2: Miss Next N */}
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl">
                <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Scenario: Misses Next {N} Classes</span>
                </div>
                <p className="text-xl font-black text-rose-900 font-mono">
                  {percentageIfMissN}%
                </p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Trajectory drop of -{Math.max(0, Math.round((currentPercentage - percentageIfMissN) * 10) / 10)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyPredictorPage;
