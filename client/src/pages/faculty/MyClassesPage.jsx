import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Layers, Users, BookOpen, ClipboardCheck, History, ArrowRight, ShieldCheck } from 'lucide-react';

export const MyClassesPage = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/faculty/classes');
        if (res.data?.success) {
          setClasses(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load assigned classes.');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  if (loading) return <LoadingSpinner text="Loading assigned courses and sections..." />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Curriculum & Workload</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">My Assigned Classes & Sections</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official teaching assignments authorized by the Academic Dean and Department HOD.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/faculty/attendance/history')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <History className="w-3.5 h-3.5" />
            <span>Attendance History</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls) => (
          <div
            key={cls.assignmentId}
            className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold font-mono text-xs rounded-lg border border-blue-200">
                  {cls.courseCode}
                </span>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-full">
                  Sec {cls.section}
                </span>
              </div>

              {/* Course Title */}
              <div className="mt-3">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {cls.courseName}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{cls.departmentName}</p>
              </div>

              {/* Class Metadata */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Semester</span>
                  <span className="font-bold text-slate-800">Sem {cls.semester}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Credits</span>
                  <span className="font-bold text-slate-800">{cls.credits} Credits</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Academic Year</span>
                  <span className="font-bold text-slate-800">{cls.academicYear}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Enrolled Students</span>
                  <span className="font-bold text-blue-700 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{cls.enrolledStudentsCount} Registered</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() =>
                  navigate(
                    `/faculty/attendance/history?section=${cls.section}&courseId=${cls.courseId}`
                  )
                }
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                View History
              </button>

              <button
                onClick={() =>
                  navigate(
                    `/faculty/attendance/mark?courseId=${cls.courseId}&section=${cls.section}&semester=${cls.semester}&deptId=${cls.departmentId}`
                  )
                }
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Mark Attendance</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyClassesPage;
