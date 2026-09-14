import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Briefcase,
  Search,
  Plus,
  BookOpen,
  Layers,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';

export const AdminFacultyPage = () => {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Assign Subject Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignSection, setAssignSection] = useState('A');
  const [assignSemester, setAssignSemester] = useState('5');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedDeptId) params.append('departmentId', selectedDeptId);

      const [facRes, deptRes, subjRes] = await Promise.all([
        api.get(`/admin/faculty?${params.toString()}`),
        api.get('/admin/departments'),
        api.get('/admin/subjects'),
      ]);

      if (facRes.data?.success) setFaculty(facRes.data.data);
      if (deptRes.data?.success) setDepartments(deptRes.data.data);
      if (subjRes.data?.success) setSubjects(subjRes.data.data);
    } catch (err) {
      console.error('Failed to load faculty data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDeptId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const openAssignModal = (f) => {
    setSelectedFaculty(f);
    setAssignCourseId('');
    setAssignSection('A');
    setAssignSemester('5');
    setShowAssignModal(true);
  };

  const handleAssignSubject = async (e) => {
    e.preventDefault();
    if (!selectedFaculty || !assignCourseId) return;

    setSubmitting(true);
    setMessage({ text: '', isError: false });
    try {
      const res = await api.post('/admin/faculty/assign', {
        facultyId: selectedFaculty.id,
        courseId: assignCourseId,
        section: assignSection,
        semester: parseInt(assignSemester, 10),
      });

      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        setShowAssignModal(false);
        fetchData();
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to assign subject.',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this course assignment?')) return;

    try {
      const res = await api.delete(`/admin/faculty/assignments/${assignmentId}`);
      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        fetchData();
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to remove assignment.',
        isError: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-purple-400" />
            Faculty Management & Subject Assignments
          </h1>
          <p className="text-xs text-slate-400">
            View teaching faculty, assign courses and class sections, and manage departmental responsibilities.
          </p>
        </div>
      </div>

      {/* Global Alert Notification */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            message.isError
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', isError: false })}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Department Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by faculty name or employee ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </form>

        <select
          value={selectedDeptId}
          onChange={(e) => setSelectedDeptId(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>
      </div>

      {/* Faculty Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading faculty roster...
        </div>
      ) : faculty.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/40 border border-slate-800 rounded-2xl">
          No faculty members found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {faculty.map((f) => (
            <div
              key={f.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white">{f.name}</h2>
                    <p className="text-xs text-purple-300 font-medium">{f.designation}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">ID: {f.employeeId}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800 text-indigo-300 font-bold uppercase">
                    {f.departmentCode}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <p>Email: {f.email}</p>
                  {f.mobileNumber && <p>Contact: {f.mobileNumber}</p>}
                </div>

                {/* Assigned Sections */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Assigned Sections:
                  </span>
                  {f.assignedSections.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">None</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {f.assignedSections.map((sec) => (
                        <span
                          key={sec}
                          className="px-2 py-0.5 rounded bg-purple-950/50 border border-purple-800 text-purple-300 text-[10px] font-bold"
                        >
                          Sec {sec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assigned Subjects */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Teaching Subjects:
                  </span>
                  {f.assignedSubjects.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">No courses assigned yet.</span>
                  ) : (
                    <div className="space-y-1.5">
                      {f.assignedSubjects.map((s) => (
                        <div
                          key={s.assignmentId}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-slate-200">{s.courseCode}</span>
                            <span className="text-slate-400 ml-1">({s.courseName})</span>
                            <span className="text-purple-400 font-mono ml-1.5 text-[10px]">Sec {s.section}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveAssignment(s.assignmentId)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Remove Subject Assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={() => openAssignModal(f)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Assign Course / Section</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ASSIGN SUBJECT MODAL */}
      {showAssignModal && selectedFaculty && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Assign Subject to {selectedFaculty.name}
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubject} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Subject / Course</label>
                <select
                  required
                  value={assignCourseId}
                  onChange={(e) => setAssignCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value="">-- Choose Course --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.courseCode} - {s.courseName} ({s.department?.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Section</label>
                  <select
                    value={assignSection}
                    onChange={(e) => setAssignSection(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Semester</label>
                  <select
                    value={assignSemester}
                    onChange={(e) => setAssignSemester(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  >
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !assignCourseId}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFacultyPage;
