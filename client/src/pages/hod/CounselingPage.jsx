import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import {
  HeartHandshake,
  AlertTriangle,
  ShieldCheck,
  Users,
  Search,
  Filter,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  X,
  Phone,
  Calendar,
  Building2,
  Trash2,
} from 'lucide-react';

export const CounselingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'counselors';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Counselors Overview State
  const [counselorsData, setCounselorsData] = useState({ counselors: [], metrics: {} });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [assigning, setAssigning] = useState(false);

  // 2. At-Risk Students State
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [counselorFilter, setCounselorFilter] = useState('ALL');

  // 3. Interventions State
  const [interventions, setInterventions] = useState([]);
  const [interventionStatusFilter, setInterventionStatusFilter] = useState('ALL');

  // Sync tab with URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setError('');
    setSuccessMessage('');
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'counselors') {
        const res = await api.get('/hod/counseling/overview');
        if (res.data?.success) setCounselorsData(res.data.data);
      } else if (activeTab === 'at-risk') {
        const res = await api.get('/hod/counseling/at-risk', {
          params: {
            riskLevel: riskFilter,
            section: sectionFilter,
            counselorId: counselorFilter,
          },
        });
        if (res.data?.success) setAtRiskStudents(res.data.data);
      } else if (activeTab === 'interventions') {
        const res = await api.get('/hod/counseling/interventions', {
          params: {
            status: interventionStatusFilter,
          },
        });
        if (res.data?.success) setInterventions(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load counseling data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, riskFilter, sectionFilter, counselorFilter, interventionStatusFilter]);

  const openAssignModal = async (facultyId = '') => {
    setSelectedFacultyId(facultyId);
    setSelectedStudentIds(new Set());
    setShowAssignModal(true);

    try {
      // Fetch department students for selection
      const res = await api.get('/hod/students?limit=100');
      if (res.data?.success) {
        setUnassignedStudents(res.data.data.students);
      }
    } catch (err) {
      setError('Could not fetch students for counselor allocation.');
    }
  };

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFacultyId || selectedStudentIds.size === 0) {
      setError('Please select a faculty counselor and at least one student.');
      return;
    }

    setAssigning(true);
    setError('');
    try {
      const res = await api.post('/hod/counseling/assign', {
        facultyId: selectedFacultyId,
        studentIds: Array.from(selectedStudentIds),
        academicYear: '2026-2027',
        semester: 5,
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message);
        setShowAssignModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign students to counselor.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <HeartHandshake className="w-5 h-5 text-indigo-600" />
            <span>Counseling, At-Risk Monitoring & Interventions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage counselor allocations, identify students below statutory attendance thresholds, and track remediation interventions.
          </p>
        </div>

        {activeTab === 'counselors' && (
          <button
            onClick={() => openAssignModal()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign Counselor Students</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => handleTabChange('counselors')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'counselors'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Counselor Management</span>
          </button>

          <button
            onClick={() => handleTabChange('at-risk')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'at-risk'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>At-Risk Students</span>
          </button>

          <button
            onClick={() => handleTabChange('interventions')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'interventions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Interventions Log</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: COUNSELOR MANAGEMENT */}
      {activeTab === 'counselors' && (
        <div className="space-y-4">
          {/* Overview Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Counselors
              </span>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {counselorsData.metrics?.totalCounselors || 0}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Faculty mentors</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Assigned Students
              </span>
              <p className="mt-2 text-2xl font-black text-indigo-600">
                {counselorsData.metrics?.totalAssignedStudents || 0}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Active mentees</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Unassigned Students
              </span>
              <p className="mt-2 text-2xl font-black text-amber-600">
                {counselorsData.metrics?.totalUnassignedStudents || 0}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Needs counselor</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Interventions Active
              </span>
              <p className="mt-2 text-2xl font-black text-purple-600">
                {counselorsData.metrics?.pendingInterventions || 0}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Pending/In-Progress</p>
            </div>
          </div>

          {/* Counselor Faculty Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {counselorsData.counselors?.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-sm">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                        <p className="text-[11px] text-slate-500 font-mono">{c.employeeId}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Assigned Mentees
                      </span>
                      <span className="text-base font-black text-slate-900">
                        {c.assignedStudentCount} Students
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        At-Risk Mentees
                      </span>
                      <span
                        className={`text-base font-black ${
                          c.atRiskStudentsCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {c.atRiskStudentsCount} Students
                      </span>
                    </div>
                  </div>

                  {/* Student list snippet */}
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Sample Mentees:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {c.students?.slice(0, 6).map((stu) => (
                        <span
                          key={stu.id}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono"
                        >
                          {stu.registrationNumber} ({stu.section})
                        </span>
                      ))}
                      {c.students?.length > 6 && (
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded text-[10px]">
                          +{c.students.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => openAssignModal(c.id)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Assign More</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: AT-RISK STUDENTS */}
      {activeTab === 'at-risk' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                <Filter className="w-3.5 h-3.5 mr-1" />
                Filter Risk:
              </span>

              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-bold"
              >
                <option value="ALL">All Under 75% Threshold</option>
                <option value="HIGH">High Risk (&lt; 50%)</option>
                <option value="MEDIUM">Medium Risk (50% - 64.9%)</option>
                <option value="WARNING">Warning (65% - 74.9%)</option>
              </select>

              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-bold"
              >
                <option value="ALL">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>

            <span className="text-xs text-slate-500 font-mono">
              Found {atRiskStudents.length} students requiring intervention
            </span>
          </div>

          {/* At-Risk Students Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Registration No</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3 text-center">Section</th>
                    <th className="px-4 py-3 text-center">Attendance %</th>
                    <th className="px-4 py-3 text-center">Risk Level</th>
                    <th className="px-4 py-3">Assigned Counselor</th>
                    <th className="px-4 py-3">Last Intervention</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {atRiskStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {s.registrationNumber}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                      <td className="px-4 py-3 text-center font-bold font-mono">{s.section}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            s.attendancePercentage < 50
                              ? 'text-rose-700'
                              : s.attendancePercentage < 65
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {s.attendancePercentage}%
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {s.attendedClasses}/{s.totalClasses} classes
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            s.riskLevel === 'HIGH'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : s.riskLevel === 'MEDIUM'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {s.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.counselor ? (
                          <div>
                            <div className="font-semibold text-slate-800">{s.counselor.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {s.counselor.employeeId}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.lastIntervention ? (
                          <div>
                            <span className="font-bold text-slate-800 text-[11px]">
                              {s.lastIntervention.type}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {s.lastIntervention.date} ({s.lastIntervention.status})
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-semibold">
                            Pending First Session
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/hod/students?search=${s.registrationNumber}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profile</span>
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {atRiskStudents.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        No students found matching the selected risk filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INTERVENTIONS LOG */}
      {activeTab === 'interventions' && (
        <div className="space-y-4">
          {/* Status Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center">
                <Filter className="w-3.5 h-3.5 mr-1" />
                Intervention Status:
              </span>
              {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setInterventionStatusFilter(st)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
                    interventionStatusFilter === st
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 font-mono">
              {interventions.length} Total Department Interventions
            </span>
          </div>

          {/* Interventions Cards */}
          <div className="space-y-3">
            {interventions.map((i) => (
              <div
                key={i.id}
                className={`bg-white rounded-xl border p-4 shadow-xs transition-colors ${
                  i.isOverdue ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {i.type.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{i.studentName}</span>
                    <span className="font-mono text-slate-400 text-xs">({i.registrationNumber})</span>
                    <span className="text-slate-400 text-xs">•</span>
                    <span className="text-xs font-mono font-bold text-slate-700">Sec {i.section}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {i.isOverdue && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                        Overdue Follow-up
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        i.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : i.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {i.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {i.description}
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                  <span>
                    Counselor:{' '}
                    <strong className="text-slate-700 font-semibold">
                      {i.counselorName} ({i.counselorEmployeeId})
                    </strong>
                  </span>
                  <div className="flex items-center space-x-3 font-mono">
                    <span>Session Date: {i.date}</span>
                    <span>•</span>
                    <span>Follow-Up Due: {i.followUpDate}</span>
                  </div>
                </div>
              </div>
            ))}

            {interventions.length === 0 && !loading && (
              <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                No counseling interventions recorded with status: {interventionStatusFilter}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ASSIGN COUNSELOR MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Assign Counselor Students</h2>
                  <p className="text-[11px] text-slate-500">
                    Allocate department students to a designated faculty mentor for counseling.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              {/* Select Faculty Counselor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Designate Faculty Counselor *
                </label>
                <select
                  required
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Faculty Counselor --</option>
                  {counselorsData.counselors?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.employeeId}) — currently has {f.assignedStudentCount} mentees
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Multi-Select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Select Students ({selectedStudentIds.size} selected) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentIds.size === unassignedStudents.length) {
                        setSelectedStudentIds(new Set());
                      } else {
                        setSelectedStudentIds(new Set(unassignedStudents.map((s) => s.id)));
                      }
                    }}
                    className="text-xs text-indigo-600 hover:underline font-semibold"
                  >
                    {selectedStudentIds.size === unassignedStudents.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
                  {unassignedStudents.map((s) => (
                    <label
                      key={s.id}
                      className="p-2 flex items-center justify-between hover:bg-slate-50 rounded cursor-pointer text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(s.id)}
                          onChange={() => toggleStudentSelection(s.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <div>
                          <span className="font-mono font-bold text-slate-900">
                            {s.registrationNumber}
                          </span>{' '}
                          — {s.name}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">Sec {s.section}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || selectedStudentIds.size === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {assigning ? 'Allocating...' : `Assign ${selectedStudentIds.size} Students`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounselingPage;
