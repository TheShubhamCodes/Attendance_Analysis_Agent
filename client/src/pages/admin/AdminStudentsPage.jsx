import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  GraduationCap,
  Search,
  Filter,
  Eye,
  X,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  HeartHandshake,
} from 'lucide-react';

export const AdminStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [departments, setDepartments] = useState([]);

  // Student Profile Drawer
  const [activeStudent, setActiveStudent] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      if (res.data?.success) setDepartments(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudents = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
      });
      if (search) params.append('search', search);
      if (selectedDeptId) params.append('departmentId', selectedDeptId);
      if (selectedSection) params.append('section', selectedSection);
      if (selectedYear) params.append('year', selectedYear);

      const res = await api.get(`/admin/students?${params.toString()}`);
      if (res.data?.success) {
        setStudents(res.data.data.students);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchStudents(1);
  }, [selectedDeptId, selectedSection, selectedYear]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents(1);
  };

  const openStudentDrawer = async (studentId) => {
    setLoadingProfile(true);
    setActiveStudent(null);
    try {
      const res = await api.get(`/admin/students/${studentId}`);
      if (res.data?.success) {
        setActiveStudent(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load student detail:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-purple-400" />
            Student Directory & Profiles
          </h1>
          <p className="text-xs text-slate-400">
            Search by registration number or name, filter cohorts by section and year, and inspect academic attendance summaries.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by registration number (e.g. 23CSE101) or student name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <button
            onClick={() => fetchStudents(pagination.page)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Reg Number</th>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Year / Sec</th>
                <th className="py-3.5 px-4">Attendance %</th>
                <th className="py-3.5 px-4">Sessions</th>
                <th className="py-3.5 px-4">Parent Linked</th>
                <th className="py-3.5 px-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No students match the criteria.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-300">{s.registrationNumber}</td>
                    <td className="py-3 px-4 font-semibold text-white">{s.name}</td>
                    <td className="py-3 px-4 text-slate-400">{s.departmentCode}</td>
                    <td className="py-3 px-4 text-slate-300">
                      Yr {s.year} • Sec {s.section}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
                          s.attendancePercentage < 75
                            ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
                            : 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                        }`}
                      >
                        {s.attendancePercentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {s.presentClasses} / {s.totalClasses}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {s.parent ? (
                        <span className="text-emerald-400 font-semibold">{s.parent.name}</span>
                      ) : (
                        <span className="text-slate-600 italic">Not Linked</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openStudentDrawer(s.id)}
                        className="p-1.5 bg-slate-800 hover:bg-purple-900/50 hover:text-purple-300 text-slate-300 rounded-lg transition-colors inline-flex items-center space-x-1"
                        title="View Profile Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {students.length} of {pagination.total} students
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchStudents(pagination.page - 1)}
              className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-300">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchStudents(pagination.page + 1)}
              className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* STUDENT PROFILE MODAL / DRAWER */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{activeStudent.name}</h3>
                  <p className="text-xs text-purple-300 font-mono">
                    REG: {activeStudent.registrationNumber} • {activeStudent.department?.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveStudent(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attendance Performance Pill */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Overall Attendance</span>
                <span
                  className={`text-xl font-black ${
                    activeStudent.stats?.percentage < 75 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {activeStudent.stats?.percentage}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Attended Sessions</span>
                <span className="text-xl font-black text-white">
                  {activeStudent.stats?.presentAttendance} / {activeStudent.stats?.totalAttendance}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Risk Status</span>
                <span
                  className={`text-xs font-black uppercase inline-block mt-1 px-2 py-0.5 rounded ${
                    activeStudent.stats?.isAtRisk
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {activeStudent.stats?.isAtRisk ? 'At Risk (<75%)' : 'Good Standing'}
                </span>
              </div>
            </div>

            {/* Contact & Mentor info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Contact Information</span>
                <p className="text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  {activeStudent.email}
                </p>
                {activeStudent.mobileNumber && (
                  <p className="text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-purple-400" />
                    {activeStudent.mobileNumber}
                  </p>
                )}
                <p className="text-slate-400">
                  Year {activeStudent.year} • Section {activeStudent.section}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Assigned Faculty Mentor</span>
                {activeStudent.mentor ? (
                  <div>
                    <p className="font-bold text-white">{activeStudent.mentor.name}</p>
                    <p className="text-slate-400">{activeStudent.mentor.designation}</p>
                    <p className="text-[11px] text-slate-500 font-mono">ID: {activeStudent.mentor.employeeId}</p>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No faculty mentor currently assigned.</p>
                )}
              </div>
            </div>

            {/* Linked Parent Information */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Parent Relationship</span>
              {activeStudent.parent ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{activeStudent.parent.name}</p>
                    <p className="text-slate-400">
                      Mobile: {activeStudent.parent.mobile} • Email: {activeStudent.parent.email}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-pink-950/60 border border-pink-800 text-pink-300 font-bold uppercase">
                    Linked
                  </span>
                </div>
              ) : (
                <p className="text-slate-500 italic">No parent account linked yet.</p>
              )}
            </div>

            {/* Recent Attendance Entries */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Recent Attendance Sessions ({activeStudent.attendanceRecords?.length || 0})
              </span>
              <div className="divide-y divide-slate-800/60 max-h-40 overflow-y-auto text-xs">
                {activeStudent.attendanceRecords?.map((att) => (
                  <div key={att.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-300">{att.course?.courseCode}</span>
                      <span className="text-slate-500 ml-1.5">
                        {new Date(att.date).toLocaleDateString()} • Period {att.period}
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        att.status === 'PRESENT'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {att.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentsPage;
