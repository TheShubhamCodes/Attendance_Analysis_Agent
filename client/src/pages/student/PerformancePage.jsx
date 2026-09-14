import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { GraduationCap, Award, BookOpen, TrendingUp, Search, Lock } from 'lucide-react';

export const PerformancePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await api.get('/student/performance');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not fetch academic performance records.');
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  if (loading) return <LoadingSpinner text="Retrieving examination grades..." />;

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700 text-sm">
        <p>{error || 'An error occurred while loading performance details.'}</p>
      </div>
    );
  }

  const { overallAverage, performanceTrend, subjects } = data;

  const chartData = subjects.map((s) => ({
    name: s.courseCode,
    fullName: s.courseName,
    Internal1: s.internal1 || 0,
    Internal2: s.internal2 || 0,
    Assignment: s.assignment || 0,
    MidTerm: s.midTerm || 0,
    Average: s.averagePercentage,
  }));

  const filteredSubjects = subjects.filter(
    (s) =>
      s.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-800 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Official Examination Records</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Academic Performance & Grades</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal assessments, assignments, and mid-term evaluation scores
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Official Evaluation Records</span>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Cumulative Academic Average
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {overallAverage}%
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              Grade Point: {(overallAverage / 10).toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Weighted average across all accredited courses</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Best Performing Course
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-xl font-bold text-slate-900 truncate">
              {subjects.reduce((max, s) => (s.averagePercentage > max.averagePercentage ? s : max), subjects[0])?.courseName || 'DBMS'}
            </span>
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            {subjects.reduce((max, s) => (s.averagePercentage > max.averagePercentage ? s : max), subjects[0])?.averagePercentage}% average
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Continuous Evaluation Trend
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-xl font-bold text-slate-900 flex items-center text-emerald-600">
              <TrendingUp className="w-5 h-5 mr-1" /> Upward Trajectory
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Consistent improvement from Internal 1 to Assignments</p>
        </div>
      </div>

      {/* Assessment Comparison Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="mb-4 pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Subject-wise Assessment Breakdown</h2>
          <p className="text-xs text-slate-500">Comparative marks across internal tests, assignments, and mid-term exam</p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} />
              <Tooltip
                formatter={(val, name) => [`${val} marks`, name]}
                contentStyle={{
                  backgroundColor: '#0f2744',
                  borderColor: '#1e3a8a',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Internal1" name="Internal 1" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Internal2" name="Internal 2" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Assignment" name="Assignment" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="MidTerm" name="Mid Term Exam" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Marks Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">Comprehensive Course Grade Registry</h2>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-900"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4 text-center">Internal 1 (100)</th>
                <th className="py-3.5 px-4 text-center">Internal 2 (100)</th>
                <th className="py-3.5 px-4 text-center">Assignment (100)</th>
                <th className="py-3.5 px-4 text-center">Mid Term (100)</th>
                <th className="py-3.5 px-4 text-center">Semester Exam</th>
                <th className="py-3.5 px-4 text-right">Weighted Average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.map((subj) => (
                <tr key={subj.courseId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-brand-950 block">{subj.courseCode}</span>
                    <span className="font-semibold text-slate-800">{subj.courseName}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                    {subj.internal1 !== null ? `${subj.internal1}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                    {subj.internal2 !== null ? `${subj.internal2}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                    {subj.assignment !== null ? `${subj.assignment}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                    {subj.midTerm !== null ? `${subj.midTerm}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                    Scheduled
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-mono font-extrabold text-sm text-brand-950">
                      {subj.averagePercentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformancePage;
