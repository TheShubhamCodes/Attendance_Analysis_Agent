import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  AlertTriangle,
  ShieldAlert,
  Filter,
  Users,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const FacultyAtRiskPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Filters
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState(searchParams.get('riskLevel') || 'ALL');
  const [minAtt, setMinAtt] = useState('');
  const [maxAtt, setMaxAtt] = useState('');

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAtRisk = async () => {
    setLoading(true);
    setError('');
    try {
      let query = `/faculty/at-risk?riskLevel=${selectedRiskLevel}`;
      if (selectedSection !== 'ALL') query += `&section=${selectedSection}`;
      if (minAtt) query += `&minAttendance=${minAtt}`;
      if (maxAtt) query += `&maxAttendance=${maxAtt}`;

      const res = await api.get(query);
      if (res.data?.success) {
        setStudents(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load at-risk students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtRisk();
  }, [selectedRiskLevel, selectedSection]);

  // Extract unique sections
  const sections = ['ALL', 'A', 'B'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-rose-800 uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Academic Early Warning System</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Counselor At-Risk Student Monitoring</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Students strictly under your counseling assignment who are currently breaching or nearing university attendance thresholds.
          </p>
        </div>

        <button
          onClick={() => navigate('/faculty/interventions')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Manage Interventions</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center space-x-1.5 text-slate-500 font-semibold uppercase text-[10px]">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter Cohort:</span>
        </div>

        {/* Risk Level Filter */}
        <select
          value={selectedRiskLevel}
          onChange={(e) => setSelectedRiskLevel(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
        >
          <option value="ALL">All Defaulters (&lt; 75%)</option>
          <option value="HIGH_RISK">High Risk Only (&lt; 65%)</option>
          <option value="WARNING">Warning Defaulters (65% - 75%)</option>
        </select>

        {/* Section Filter */}
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium font-mono"
        >
          <option value="ALL">All Sections</option>
          <option value="A">Section A</option>
          <option value="B">Section B</option>
        </select>

        {/* Attendance Range */}
        <div className="flex items-center space-x-1.5">
          <input
            type="number"
            placeholder="Min %"
            value={minAtt}
            onChange={(e) => setMinAtt(e.target.value)}
            className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-center"
          />
          <span className="text-slate-400">-</span>
          <input
            type="number"
            placeholder="Max %"
            value={maxAtt}
            onChange={(e) => setMaxAtt(e.target.value)}
            className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-center"
          />
          <button
            onClick={fetchAtRisk}
            className="px-3 py-1.5 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner text="Analyzing counselor student attendance records..." />
          </div>
        ) : error ? (
          <div className="p-6 text-xs text-rose-700">{error}</div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
            <p className="font-bold text-slate-800">No At-Risk Students Found</p>
            <p className="text-slate-400 mt-1">All students in the selected filter maintain satisfactory attendance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Reg. Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Overall Attendance</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Deficit Subjects (&lt; 75%)</th>
                  <th className="py-3 px-4">Recommended Counselor Action</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {students.map((student) => {
                  const isHighRisk = student.riskLevel === 'HIGH_RISK';
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {student.registrationNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{student.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {student.presentClasses} / {student.totalClasses} classes attended
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono font-bold">
                          Sec {student.section}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-mono font-extrabold ${
                              isHighRisk ? 'text-rose-600' : 'text-amber-600'
                            }`}
                          >
                            {student.overallAttendance}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isHighRisk ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, student.overallAttendance)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isHighRisk ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            High Risk (&lt; 65%)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            Warning (&lt; 75%)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {student.lowAttendanceSubjects.length === 0 ? (
                          <span className="text-slate-400">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {student.lowAttendanceSubjects.map((subj, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-mono border border-slate-200"
                                title={`${subj.courseName}: ${subj.percentage}%`}
                              >
                                {subj.courseCode} ({subj.percentage}%)
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs leading-tight">
                        {student.suggestedAction}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            navigate(
                              `/faculty/interventions?studentId=${student.id}&studentName=${encodeURIComponent(
                                student.name
                              )}`
                            )
                          }
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold"
                        >
                          Intervene
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyAtRiskPage;
