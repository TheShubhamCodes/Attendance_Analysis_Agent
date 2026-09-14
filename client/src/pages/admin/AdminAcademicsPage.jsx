import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Layers,
  Building2,
  Calendar,
  BookOpen,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  Briefcase,
} from 'lucide-react';

export const AdminAcademicsPage = () => {
  const [activeTab, setActiveTab] = useState('departments'); // 'departments', 'sections', 'subjects'

  // Data
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  // Forms
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [secForm, setSecForm] = useState({ departmentId: '', name: 'C', year: '2', semester: '4', capacity: '60' });
  const [subjForm, setSubjForm] = useState({ courseCode: '', courseName: '', departmentId: '', credits: '3', semester: '5', year: '3' });

  const [message, setMessage] = useState({ text: '', isError: false });
  const [submitting, setSubmitting] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [deptRes, secRes, subjRes] = await Promise.all([
        api.get('/admin/departments'),
        api.get('/admin/sections'),
        api.get('/admin/subjects'),
      ]);
      if (deptRes.data?.success) setDepartments(deptRes.data.data);
      if (secRes.data?.success) setSections(secRes.data.data);
      if (subjRes.data?.success) setSubjects(subjRes.data.data);
    } catch (err) {
      console.error('Failed to load academics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/admin/departments', deptForm);
      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        setShowDeptModal(false);
        setDeptForm({ name: '', code: '' });
        fetchAllData();
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Failed to create department.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/admin/sections', secForm);
      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        setShowSectionModal(false);
        fetchAllData();
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Failed to create section.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/admin/subjects', subjForm);
      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        setShowSubjectModal(false);
        setSubjForm({ courseCode: '', courseName: '', departmentId: '', credits: '3', semester: '5', year: '3' });
        fetchAllData();
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Failed to create subject.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-400" />
            Academic Structure Management
          </h1>
          <p className="text-xs text-slate-400">
            Define departments, configure class sections, and maintain institutional course curriculums.
          </p>
        </div>

        {/* Action Button depending on tab */}
        <div>
          {activeTab === 'departments' && (
            <button
              onClick={() => setShowDeptModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Department</span>
            </button>
          )}
          {activeTab === 'sections' && (
            <button
              onClick={() => setShowSectionModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Section</span>
            </button>
          )}
          {activeTab === 'subjects' && (
            <button
              onClick={() => setShowSubjectModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Subject / Course</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Alerts */}
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

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'departments'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sections')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'sections'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Class Sections ({sections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'subjects'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curriculum Subjects ({subjects.length})</span>
        </button>
      </div>

      {/* TAB 1: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-800 text-purple-300">
                  {dept.code}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-white">{dept.name}</h2>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">UUID: {dept.id.slice(0, 8)}...</p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
                <div className="p-2 bg-slate-950 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Students</span>
                  <span className="text-sm font-bold text-white">{dept._count?.students || 0}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Faculty</span>
                  <span className="text-sm font-bold text-white">{dept._count?.staff || 0}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Courses</span>
                  <span className="text-sm font-bold text-white">{dept._count?.courses || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: SECTIONS */}
      {activeTab === 'sections' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Section Name</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Academic Year</th>
                <th className="py-3.5 px-4">Semester</th>
                <th className="py-3.5 px-4">Enrolled Students</th>
                <th className="py-3.5 px-4">Max Capacity</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sections.map((sec) => (
                <tr key={sec.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white">Section {sec.name}</td>
                  <td className="py-3 px-4 font-semibold text-purple-300">{sec.department?.name} ({sec.department?.code})</td>
                  <td className="py-3 px-4 text-slate-400">Year {sec.year}</td>
                  <td className="py-3 px-4 text-slate-400">Semester {sec.semester}</td>
                  <td className="py-3 px-4 font-bold text-emerald-400">{sec.enrolledStudentsCount || 0} students</td>
                  <td className="py-3 px-4 text-slate-400">{sec.capacity} seats</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-bold uppercase">
                      {sec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: SUBJECTS */}
      {activeTab === 'subjects' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Course Code</th>
                <th className="py-3.5 px-4">Course Name</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Semester</th>
                <th className="py-3.5 px-4">Credits</th>
                <th className="py-3.5 px-4">Assigned Teaching Faculty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {subjects.map((subj) => (
                <tr key={subj.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-purple-300">{subj.courseCode}</td>
                  <td className="py-3 px-4 font-semibold text-white">{subj.courseName}</td>
                  <td className="py-3 px-4 text-slate-400">{subj.department?.code}</td>
                  <td className="py-3 px-4 text-slate-400">Sem {subj.semester}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{subj.credits} Credits</td>
                  <td className="py-3 px-4 text-slate-300">
                    {subj.subjectAssignments && subj.subjectAssignments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {subj.subjectAssignments.map((a) => (
                          <span
                            key={a.faculty.id}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-200"
                          >
                            {a.faculty.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-600 italic">Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE DEPARTMENT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Add Academic Department
              </h3>
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDept} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Mechanical Engineering"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  placeholder="e.g. MECH or AIDS"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono uppercase"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SECTION MODAL */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Add Academic Class Section
              </h3>
              <button onClick={() => setShowSectionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSection} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department</label>
                <select
                  required
                  value={secForm.departmentId}
                  onChange={(e) => setSecForm({ ...secForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Section Identifier</label>
                  <input
                    type="text"
                    required
                    value={secForm.name}
                    onChange={(e) => setSecForm({ ...secForm, name: e.target.value })}
                    placeholder="e.g. C or D"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Year</label>
                  <select
                    value={secForm.year}
                    onChange={(e) => setSecForm({ ...secForm, year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUBJECT MODAL */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Add Curriculum Subject
              </h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Department</label>
                <select
                  required
                  value={subjForm.departmentId}
                  onChange={(e) => setSubjForm({ ...subjForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={subjForm.courseCode}
                    onChange={(e) => setSubjForm({ ...subjForm, courseCode: e.target.value })}
                    placeholder="e.g. CS304"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Credits</label>
                  <input
                    type="number"
                    value={subjForm.credits}
                    onChange={(e) => setSubjForm({ ...subjForm, credits: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={subjForm.courseName}
                  onChange={(e) => setSubjForm({ ...subjForm, courseName: e.target.value })}
                  placeholder="e.g. Design and Analysis of Algorithms"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAcademicsPage;
