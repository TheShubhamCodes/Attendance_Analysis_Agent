import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import {
  Users,
  UserPlus,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit,
  GraduationCap,
  BookOpen,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  LayoutGrid,
  List,
  AlertTriangle,
  Building2,
  CheckCircle,
  Key,
  Lock,
} from 'lucide-react';

export const FacultyManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'list';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [facultyList, setFacultyList] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [meta, setMeta] = useState({
    courses: [],
    faculty: [],
    allFaculty: [],
    departments: [],
    sections: [],
    semesters: [],
    academicYears: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters for Faculty List
  const [searchQuery, setSearchQuery] = useState('');
  const [designationFilter, setDesignationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // ==========================================
  // MODALS STATE
  // ==========================================

  // 1. Add New Faculty Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    employeeId: '',
    email: '',
    password: '',
    mobileNumber: '',
    designation: 'Assistant Professor',
    departmentId: '',
    status: 'ACTIVE',
  });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [creatingFaculty, setCreatingFaculty] = useState(false);
  const [addError, setAddError] = useState('');

  // 2. Edit Faculty Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    employeeId: '',
    name: '',
    email: '',
    mobileNumber: '',
    designation: 'Assistant Professor',
    departmentId: '',
    cabinLocation: '',
    status: 'ACTIVE',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // 3. Reset Faculty Password Modal State
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // 4. View Faculty Profile Modal State
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);

  // 5. Deactivate / Reactivate Modal State
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // 6. Delete / Move to Trash Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  // 7. Assignment View & Edit Modals State
  const [showViewAssignmentModal, setShowViewAssignmentModal] = useState(false);
  const [viewAssignmentTarget, setViewAssignmentTarget] = useState(null);

  const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(false);
  const [editAssignmentForm, setEditAssignmentForm] = useState({
    id: '',
    facultyName: '',
    employeeId: '',
    courseCode: '',
    courseName: '',
    courseId: '',
    section: 'A',
    semester: 5,
    academicYear: '2026-2027',
    status: 'ACTIVE',
  });
  const [savingAssignmentEdit, setSavingAssignmentEdit] = useState(false);

  // ==========================================
  // ASSIGNMENT TAB STATE (2-STEP WORKFLOW)
  // ==========================================
  const [assignStep, setAssignStep] = useState(1);
  const [selectedFacultyForAssign, setSelectedFacultyForAssign] = useState(null);
  const [facultySearchTerm, setFacultySearchTerm] = useState('');
  const [assignmentData, setAssignmentData] = useState({
    departmentId: '',
    semester: 5,
    section: 'A',
    courseId: '',
    academicYear: '2026-2027',
  });
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Filters for Faculty Assignments Table
  const [filterFaculty, setFilterFaculty] = useState('ALL');
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');

  // Sync tab with URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setError('');
    setSuccessMessage('');
  };

  // Load All Initial Data
  const loadData = async () => {
    setLoading(true);
    try {
      setError('');
      const [facRes, metaRes, assignRes] = await Promise.all([
        api.get(
          `/hod/faculty?query=${encodeURIComponent(searchQuery)}&designation=${designationFilter}&status=${statusFilter}${
            departmentFilter !== 'ALL' ? `&departmentId=${departmentFilter}` : ''
          }`
        ),
        api.get('/hod/faculty/form-meta'),
        api.get('/hod/faculty/assignments'),
      ]);

      if (facRes.data?.success) setFacultyList(facRes.data.data);
      if (metaRes.data?.success) {
        const metaData = metaRes.data.data;
        setMeta(metaData);

        // Prepopulate default department for Add Modal
        if (!addForm.departmentId && metaData.departments?.length > 0) {
          setAddForm((prev) => ({
            ...prev,
            departmentId: metaData.departments[0].id,
          }));
        }

        // Prepopulate default assignment department and course
        if (!assignmentData.departmentId && metaData.departments?.length > 0) {
          const firstDeptId = metaData.departments[0].id;
          const firstCourse = metaData.courses.find(
            (c) => c.department?.id === firstDeptId && c.semester === 5
          ) || metaData.courses[0];

          setAssignmentData((prev) => ({
            ...prev,
            departmentId: firstDeptId,
            courseId: firstCourse?.id || '',
          }));
        }
      }
      if (assignRes.data?.success) setAssignments(assignRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load faculty data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, designationFilter, statusFilter, departmentFilter]);

  // ==========================================
  // HANDLERS: ADD NEW FACULTY
  // ==========================================

  const handleOpenAddModal = () => {
    setAddError('');
    setAddForm({
      name: '',
      employeeId: '',
      email: '',
      password: '',
      mobileNumber: '',
      designation: 'Assistant Professor',
      departmentId: meta.departments?.[0]?.id || '',
      status: 'ACTIVE',
    });
    setShowAddModal(true);
  };

  const handleAddFacultySubmit = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!addForm.name.trim()) {
      setAddError('Full Name is required.');
      return;
    }
    if (!addForm.employeeId.trim()) {
      setAddError('Employee ID is required.');
      return;
    }
    if (!addForm.email.trim()) {
      setAddError('Official Email is required.');
      return;
    }
    if (!addForm.password) {
      setAddError('Password is required.');
      return;
    }
    if (addForm.password.length < 6) {
      setAddError('Password must be at least 6 characters long.');
      return;
    }

    setCreatingFaculty(true);
    try {
      const res = await api.post('/hod/faculty', {
        name: addForm.name.trim(),
        employeeId: addForm.employeeId.trim().toUpperCase(),
        email: addForm.email.trim().toLowerCase(),
        password: addForm.password,
        mobileNumber: addForm.mobileNumber.trim(),
        designation: addForm.designation,
        departmentId: addForm.departmentId || meta.departments?.[0]?.id,
        status: addForm.status,
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message || `Faculty member ${addForm.name} created successfully!`);
        setShowAddModal(false);
        loadData();
      }
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to create faculty member. Please verify the details.');
    } finally {
      setCreatingFaculty(false);
    }
  };

  // ==========================================
  // HANDLERS: EDIT FACULTY & RESET PASSWORD
  // ==========================================

  const handleOpenEdit = (faculty) => {
    setEditForm({
      id: faculty.id,
      employeeId: faculty.employeeId,
      name: faculty.name,
      email: faculty.email,
      mobileNumber: faculty.mobileNumber === 'N/A' ? '' : faculty.mobileNumber || '',
      designation: faculty.designation,
      departmentId: faculty.departmentId || meta.departments?.[0]?.id || '',
      cabinLocation: faculty.cabinLocation === 'N/A' ? '' : faculty.cabinLocation || '',
      status: faculty.status || 'ACTIVE',
    });
    setError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setError('');
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setError('Faculty Name and Email are required.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.put(`/hod/faculty/${editForm.id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        mobileNumber: editForm.mobileNumber.trim(),
        designation: editForm.designation,
        departmentId: editForm.departmentId,
        cabinLocation: editForm.cabinLocation.trim(),
        status: editForm.status,
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'Faculty profile updated successfully.');
        setShowEditModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update faculty profile.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenResetPassword = (faculty) => {
    setResetTarget(faculty);
    setNewPassword('');
    setShowResetPasswordModal(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await api.post(`/hod/faculty/${resetTarget.id}/reset-password`, {
        newPassword,
      });
      if (res.data?.success) {
        setSuccessMessage(res.data.message || `Password for ${resetTarget.name} has been reset.`);
        setShowResetPasswordModal(false);
        setResetTarget(null);
        setNewPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset faculty password.');
    } finally {
      setResettingPassword(false);
    }
  };

  // ==========================================
  // HANDLERS: VIEW, DEACTIVATE, DELETE
  // ==========================================

  const handleOpenView = async (faculty) => {
    try {
      const res = await api.get(`/hod/faculty/${faculty.id}`);
      if (res.data?.success) {
        setViewTarget(res.data.data);
      } else {
        setViewTarget(faculty);
      }
    } catch {
      setViewTarget(faculty);
    }
    setShowViewModal(true);
  };

  const handleOpenDeactivate = (faculty) => {
    setDeactivateTarget(faculty);
    setError('');
    setShowDeactivateModal(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    setError('');

    const newStatus = deactivateTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.patch(`/hod/faculty/${deactivateTarget.id}/status`, {
        status: newStatus,
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message);
        setShowDeactivateModal(false);
        setDeactivateTarget(null);
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change faculty status.');
    } finally {
      setDeactivating(false);
    }
  };

  const handleOpenDelete = (faculty) => {
    setDeleteTarget(faculty);
    setDeleteReason('');
    setError('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      const res = await api.delete(`/hod/faculty/${deleteTarget.id}`, {
        data: { reason: deleteReason || 'Removed by HOD' },
      });
      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'Faculty member moved to Deleted Records / Trash.');
        setShowDeleteModal(false);
        setDeleteTarget(null);
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete faculty member.');
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================
  // 2-STEP FACULTY ASSIGNMENT WORKFLOW
  // ==========================================

  const allRegisteredFaculty = meta.allFaculty && meta.allFaculty.length > 0
    ? meta.allFaculty
    : facultyList;

  const filteredRegisteredFaculty = allRegisteredFaculty.filter((f) => {
    const term = facultySearchTerm.toLowerCase();
    return (
      f.name.toLowerCase().includes(term) ||
      f.employeeId.toLowerCase().includes(term) ||
      (f.email && f.email.toLowerCase().includes(term))
    );
  });

  const handleSelectFacultyForAssign = (faculty) => {
    setSelectedFacultyForAssign(faculty);
    setAssignError('');
    // Align department with faculty department if available
    const facDeptId = faculty.departmentId || faculty.department?.id || assignmentData.departmentId;
    const semCourses = meta.courses.filter(
      (c) => (!facDeptId || c.department?.id === facDeptId) && c.semester === Number(assignmentData.semester)
    );

    setAssignmentData((prev) => ({
      ...prev,
      departmentId: facDeptId || prev.departmentId,
      courseId: semCourses[0]?.id || meta.courses[0]?.id || '',
    }));
    setAssignStep(2);
  };

  const handleAssignDepartmentChange = (deptId) => {
    const availableCourses = meta.courses.filter(
      (c) => c.department?.id === deptId && c.semester === Number(assignmentData.semester)
    );
    setAssignmentData((prev) => ({
      ...prev,
      departmentId: deptId,
      courseId: availableCourses[0]?.id || '',
    }));
  };

  const handleAssignSemesterChange = (sem) => {
    const semNum = Number(sem);
    const availableCourses = meta.courses.filter(
      (c) =>
        (!assignmentData.departmentId || c.department?.id === assignmentData.departmentId) &&
        c.semester === semNum
    );
    setAssignmentData((prev) => ({
      ...prev,
      semester: semNum,
      courseId: availableCourses[0]?.id || '',
    }));
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setAssignError('');
    setSuccessMessage('');

    if (!selectedFacultyForAssign) {
      setAssignError('Please select a faculty member first (Step 1).');
      return;
    }

    if (!assignmentData.courseId || !assignmentData.section || !assignmentData.semester) {
      setAssignError('Please select Department, Semester, Section, and Subject/Course.');
      return;
    }

    setSubmittingAssignment(true);
    try {
      const res = await api.post('/hod/faculty/assign', {
        facultyId: selectedFacultyForAssign.id,
        employeeId: selectedFacultyForAssign.employeeId,
        departmentId: assignmentData.departmentId,
        courseId: assignmentData.courseId,
        section: assignmentData.section,
        semester: assignmentData.semester,
        academicYear: assignmentData.academicYear,
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'Faculty assigned successfully.');
        setSelectedFacultyForAssign(null);
        setAssignStep(1);
        loadData();
        setTimeout(() => handleTabChange('assignments'), 1200);
      }
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Could not assign faculty. Please verify details.');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const prefillAssignForFaculty = (faculty) => {
    handleSelectFacultyForAssign(faculty);
    handleTabChange('assign');
  };

  // ==========================================
  // HANDLERS: ASSIGNMENTS VIEW, EDIT, UNASSIGN
  // ==========================================

  const handleOpenViewAssignment = (assignment) => {
    setViewAssignmentTarget(assignment);
    setShowViewAssignmentModal(true);
  };

  const handleOpenEditAssignment = (assignment) => {
    setEditAssignmentForm({
      id: assignment.id,
      facultyName: assignment.facultyName,
      employeeId: assignment.employeeId,
      courseCode: assignment.courseCode,
      courseName: assignment.courseName,
      courseId: assignment.courseId,
      section: assignment.section,
      semester: assignment.semester,
      academicYear: assignment.academicYear || '2026-2027',
      status: assignment.status || 'ACTIVE',
    });
    setError('');
    setShowEditAssignmentModal(true);
  };

  const handleEditAssignmentSubmit = async (e) => {
    e.preventDefault();
    setSavingAssignmentEdit(true);
    setError('');
    try {
      const res = await api.put(`/faculty-assignments/${editAssignmentForm.id}`, {
        courseId: editAssignmentForm.courseId,
        section: editAssignmentForm.section,
        semester: editAssignmentForm.semester,
        academicYear: editAssignmentForm.academicYear,
        status: editAssignmentForm.status,
      });

      if (res.data?.success) {
        setSuccessMessage('Assignment updated successfully.');
        setShowEditAssignmentModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update assignment.');
    } finally {
      setSavingAssignmentEdit(false);
    }
  };

  const handleDeleteAssignment = async (id, facultyName, courseCode, section) => {
    if (
      !window.confirm(
        `Remove assignment of ${facultyName} for ${courseCode} (Section ${section})?\n\nNote: This only removes the teaching relationship; it will NOT delete the faculty account.`
      )
    ) {
      return;
    }

    try {
      const res = await api.delete(`/faculty-assignments/${id}`);
      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'Assignment unassigned successfully.');
        setAssignments((prev) => prev.filter((a) => a.id !== id));
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove assignment.');
    }
  };

  // Filtered Assignments List
  const filteredAssignments = assignments.filter((a) => {
    const matchFac = filterFaculty === 'ALL' || a.facultyId === filterFaculty;
    const matchCourse = filterCourse === 'ALL' || a.courseId === filterCourse;
    const matchSec = filterSection === 'ALL' || a.section === filterSection;
    return matchFac && matchCourse && matchSec;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <span>Faculty Management & Course Assignments</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Register new faculty members, manage appointments, allocate multi-class schedules, and review departmental teaching allocations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New Faculty</span>
          </button>

          <button
            onClick={() => handleTabChange('assign')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>Assign Faculty</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
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
        <nav className="flex space-x-6">
          <button
            onClick={() => handleTabChange('list')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 cursor-pointer ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Faculty Directory ({facultyList.length})</span>
          </button>

          <button
            onClick={() => handleTabChange('assign')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 cursor-pointer ${
              activeTab === 'assign'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign Faculty</span>
          </button>

          <button
            onClick={() => handleTabChange('assignments')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 cursor-pointer ${
              activeTab === 'assignments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Faculty Assignments ({assignments.length})</span>
          </button>
        </nav>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: FACULTY DIRECTORY                                  */}
      {/* ========================================================= */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Search by faculty name, employee ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Designation Filter */}
              <div className="flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={designationFilter}
                  onChange={(e) => setDesignationFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Designations</option>
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Lecturer">Lecturer</option>
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Faculty</option>
                <option value="INACTIVE">Inactive / Deactivated</option>
              </select>

              {/* View Mode Toggle: Grid vs Table */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 1: GRID CARDS */}
          {viewMode === 'grid' && (
            facultyList.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700">No faculty members found</h3>
                <p className="text-xs text-slate-400 mt-0.5">Click "+ Add New Faculty" above to register a faculty member.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {facultyList.map((f) => (
                  <div
                    key={f.id}
                    className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                      f.status === 'INACTIVE'
                        ? 'border-slate-200 bg-slate-50/50 opacity-80'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm ${
                              f.status === 'INACTIVE'
                                ? 'bg-slate-100 text-slate-500 border-slate-300'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            {f.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{f.name}</h3>
                            <p className="text-[11px] text-slate-500 font-mono font-bold">{f.employeeId}</p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            f.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {f.status}
                        </span>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <p className="flex items-center text-slate-700 font-medium">
                          <Briefcase className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          <span>{f.designation}</span>
                        </p>
                        <p className="flex items-center text-indigo-700 font-medium">
                          <Building2 className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                          <span>{f.department || 'Computer Science & Engineering'}</span>
                        </p>
                        <p className="flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          <span className="truncate">{f.email}</span>
                        </p>
                        <p className="flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          <span>{f.mobileNumber}</span>
                        </p>
                      </div>

                      {/* Assignments Summary Badges */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                          <span>Assigned Classes:</span>
                          <span className="font-mono font-bold text-indigo-600">{f.assignedSubjectsCount}</span>
                        </div>

                        {f.assignments && f.assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {f.assignments.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {a.courseCode} ({a.section})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No classes currently assigned.</p>
                        )}
                      </div>
                    </div>

                    {/* Actions Section */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenView(f)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="View Faculty Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(f)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Edit Faculty Details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenResetPassword(f)}
                          className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg transition-colors cursor-pointer"
                          title="Change Faculty Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDeactivate(f)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            f.status === 'INACTIVE'
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                          }`}
                          title={f.status === 'INACTIVE' ? 'Reactivate Faculty' : 'Deactivate Faculty'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{f.status === 'INACTIVE' ? 'Reactivate' : 'Delete'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => prefillAssignForFaculty(f)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Assign class to this faculty"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* VIEW 2: DENSE TABLE */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Faculty Name</th>
                      <th className="px-4 py-3">Designation</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3 text-center">Classes</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facultyList.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{f.employeeId}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{f.name}</div>
                          <div className="text-[11px] text-slate-400">{f.email}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{f.designation}</td>
                        <td className="px-4 py-3 font-medium text-indigo-700">{f.department}</td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          <div>{f.mobileNumber}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-mono font-bold text-indigo-600">{f.assignedSubjectsCount}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              f.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {f.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleOpenView(f)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleOpenEdit(f)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleOpenResetPassword(f)}
                              className="p-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-md cursor-pointer"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(f)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-xs font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {facultyList.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <div className="font-semibold text-slate-600">No faculty found</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">Click "+ Add New Faculty" to create an account.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: REDESIGNED 2-STEP FACULTY ASSIGNMENT WORKFLOW       */}
      {/* ========================================================= */}
      {activeTab === 'assign' && (
        <div className="max-w-3xl bg-white rounded-xl border border-slate-200 p-6 shadow-xs mx-auto space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <span>Assign Faculty to Course & Section</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select a registered faculty member and allocate their departmental teaching assignment (Subject, Semester, Section).
            </p>
          </div>

          {assignError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{assignError}</span>
            </div>
          )}

          {/* Stepper Header */}
          <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-4">
            <div
              onClick={() => setAssignStep(1)}
              className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                assignStep === 1
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Step 1</div>
              <div className="text-xs">Select Faculty Member</div>
              {selectedFacultyForAssign && (
                <div className="text-[11px] font-mono text-indigo-700 mt-0.5 truncate">
                  ✓ {selectedFacultyForAssign.name} ({selectedFacultyForAssign.employeeId})
                </div>
              )}
            </div>

            <div
              onClick={() => selectedFacultyForAssign && setAssignStep(2)}
              className={`p-3 rounded-lg transition-colors border ${
                !selectedFacultyForAssign
                  ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                  : assignStep === 2
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold cursor-pointer'
                  : 'bg-slate-50 border-slate-200 text-slate-600 cursor-pointer'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Step 2</div>
              <div className="text-xs">Academic Assignment Scope</div>
              {selectedFacultyForAssign && (
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Sem {assignmentData.semester} • Sec {assignmentData.section}
                </div>
              )}
            </div>
          </div>

          {/* STEP 1: SELECT FACULTY */}
          {assignStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Search and Select Registered Faculty Member
                </label>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Faculty not registered? Add New Faculty</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type to filter registered faculty by name, employee ID, or email..."
                  value={facultySearchTerm}
                  onChange={(e) => setFacultySearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>

              {/* Faculty List selection box */}
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                {filteredRegisteredFaculty.map((fac) => {
                  const isSelected = selectedFacultyForAssign?.id === fac.id;
                  return (
                    <div
                      key={fac.id}
                      onClick={() => handleSelectFacultyForAssign(fac)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/80 border-l-4 border-indigo-600'
                          : 'hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {fac.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{fac.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {fac.employeeId} • {fac.designation} • {fac.department?.code || fac.department?.name || 'CSE'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            fac.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {fac.status || 'ACTIVE'}
                        </span>
                        <button
                          type="button"
                          className={`px-3 py-1 rounded-md text-xs font-semibold ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {isSelected ? 'Selected ✓' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredRegisteredFaculty.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No faculty found matching "{facultySearchTerm}".{' '}
                    <button
                      onClick={handleOpenAddModal}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Click here to add new faculty.
                    </button>
                  </div>
                )}
              </div>

              {selectedFacultyForAssign && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setAssignStep(2)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Continue to Academic Scope</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ACADEMIC ASSIGNMENT */}
          {assignStep === 2 && selectedFacultyForAssign && (
            <form onSubmit={handleAssignSubmit} className="space-y-5">
              {/* Selected Faculty Details Card */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {selectedFacultyForAssign.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedFacultyForAssign.name}</h3>
                    <div className="text-xs text-slate-600 mt-0.5 space-x-2">
                      <span className="font-mono font-bold text-indigo-700">EMP ID: {selectedFacultyForAssign.employeeId}</span>
                      <span>•</span>
                      <span>{selectedFacultyForAssign.designation}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-800">
                        {selectedFacultyForAssign.department?.name || selectedFacultyForAssign.department || 'CSE'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAssignStep(1)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  Change Faculty
                </button>
              </div>

              {/* Assignment Scope Form */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Select Academic Assignment
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Department */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Department <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={assignmentData.departmentId}
                      onChange={(e) => handleAssignDepartmentChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold"
                      required
                    >
                      {meta.departments?.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Semester */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Semester <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={assignmentData.semester}
                      onChange={(e) => handleAssignSemesterChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold"
                      required
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Section */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Section <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={assignmentData.section}
                      onChange={(e) => setAssignmentData({ ...assignmentData, section: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-bold"
                      required
                    >
                      {(meta.sections && meta.sections.length > 0 ? meta.sections : ['A', 'B', 'C']).map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject / Course */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subject / Course (Semester {assignmentData.semester}) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={assignmentData.courseId}
                    onChange={(e) => setAssignmentData({ ...assignmentData, courseId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
                    required
                  >
                    <option value="">-- Select Subject --</option>
                    {meta.courses
                      ?.filter(
                        (c) =>
                          (!assignmentData.departmentId || c.department?.id === assignmentData.departmentId) &&
                          c.semester === Number(assignmentData.semester)
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.courseCode} - {c.courseName} (Year {c.year}, Sem {c.semester}, {c.credits} Credits)
                        </option>
                      ))}
                  </select>
                  {meta.courses?.filter(
                    (c) =>
                      (!assignmentData.departmentId || c.department?.id === assignmentData.departmentId) &&
                      c.semester === Number(assignmentData.semester)
                  ).length === 0 && (
                    <span className="text-[11px] text-amber-600 mt-1 block">
                      No subjects registered for Semester {assignmentData.semester} in selected department.
                    </span>
                  )}
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Academic Year <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={assignmentData.academicYear}
                    onChange={(e) => setAssignmentData({ ...assignmentData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                    required
                  >
                    {['2026-2027', '2025-2026'].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAssignStep(1)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ← Back to Step 1
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => handleTabChange('list')}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingAssignment}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{submittingAssignment ? 'Assigning Faculty...' : 'Assign Faculty'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ALL FACULTY ASSIGNMENTS TABLE                      */}
      {/* ========================================================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {/* Assignment Filters */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
            <div className="text-xs font-bold text-slate-700">
              Departmental Teaching Assignments ({filteredAssignments.length})
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterFaculty}
                onChange={(e) => setFilterFaculty(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Faculty</option>
                {allRegisteredFaculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.employeeId})
                  </option>
                ))}
              </select>

              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Courses</option>
                {meta.courses?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode} - {c.courseName}
                  </option>
                ))}
              </select>

              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                <option value="ALL">All Sections</option>
                {(meta.sections && meta.sections.length > 0 ? meta.sections : ['A', 'B', 'C']).map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignments Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Faculty Member</th>
                    <th className="px-4 py-3">Subject / Course</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-center">Semester</th>
                    <th className="px-4 py-3 text-center">Section</th>
                    <th className="px-4 py-3 text-center">Academic Year</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{a.facultyName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {a.employeeId} • {a.designation}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 font-mono">{a.courseCode}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{a.courseName}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-indigo-700">
                        {a.departmentCode || a.department || 'CSE'}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-medium">{a.semester}</td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-700">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 font-mono">
                          {a.section}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600">{a.academicYear}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenViewAssignment(a)}
                            title="View Assignment Details"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditAssignment(a)}
                            title="Edit Assignment"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(a.id, a.facultyName, a.courseCode, a.section)}
                            title="Remove / Unassign"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredAssignments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        No faculty assignments found matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD NEW FACULTY                                    */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Add New Faculty Member</h2>
                  <p className="text-[11px] text-slate-500">
                    Create a new faculty account with secure credentials for portal login.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddFacultySubmit} className="space-y-3.5">
              {/* Full Name & Employee ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Alan Turing"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Employee ID (emp_id) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FAC010"
                    value={addForm.employeeId}
                    onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. alan.turing@university.edu"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={addForm.mobileNumber}
                    onChange={(e) => setAddForm({ ...addForm, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter secure initial password (min 6 chars)"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Password will be securely hashed with bcrypt before storing. Never stored in plain text.
                </p>
              </div>

              {/* Designation & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Designation <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.designation}
                    onChange={(e) => setAddForm({ ...addForm, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Lecturer">Lecturer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.departmentId}
                    onChange={(e) => setAddForm({ ...addForm, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold"
                    required
                  >
                    {meta.departments?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addForm.status}
                  onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-bold"
                  required
                >
                  <option value="ACTIVE">ACTIVE (Can log in & be assigned)</option>
                  <option value="INACTIVE">INACTIVE (Deactivated / Blocked)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFaculty}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center space-x-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{creatingFaculty ? 'Creating Faculty...' : 'Create Faculty Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT FACULTY PROFILE                               */}
      {/* ========================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Edit Faculty Profile</h2>
                  <p className="text-[11px] text-slate-500">
                    Update faculty personal, academic, and status records.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Employee ID (Locked)
                  </label>
                  <input
                    type="text"
                    value={editForm.employeeId}
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.mobileNumber}
                    onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Designation
                  </label>
                  <select
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Lecturer">Lecturer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Department
                  </label>
                  <select
                    value={editForm.departmentId}
                    onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    {meta.departments?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {savingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RESET FACULTY PASSWORD                             */}
      {/* ========================================================= */}
      {showResetPasswordModal && resetTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Change Password</h2>
                  <p className="text-[11px] text-slate-500">
                    Set a new password for <strong>{resetTarget.name}</strong> ({resetTarget.employeeId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {resettingPassword ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VIEW FACULTY PROFILE                               */}
      {/* ========================================================= */}
      {showViewModal && viewTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Faculty Academic Profile</h2>
                  <p className="text-[11px] text-slate-500">Official database faculty record</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewTarget(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                  {viewTarget.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{viewTarget.name}</h3>
                  <p className="text-xs text-indigo-600 font-semibold">{viewTarget.designation}</p>
                  <p className="text-[11px] text-slate-500 font-mono font-bold">EMP ID: {viewTarget.employeeId}</p>
                </div>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  viewTarget.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {viewTarget.status}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {viewTarget.department || viewTarget.departmentCode || 'CSE'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Official Email</span>
                <p className="font-mono text-slate-800 truncate mt-0.5">{viewTarget.email}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                <p className="font-mono text-slate-800 mt-0.5">{viewTarget.mobileNumber || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Classes</span>
                <p className="font-bold text-indigo-600 mt-0.5">
                  {viewTarget.assignedSubjectsCount || 0} Assigned Classes
                </p>
              </div>
            </div>

            {/* Assigned Courses Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2">
                Assigned Teaching Classes ({viewTarget.assignments?.length || 0})
              </h4>
              {viewTarget.assignments && viewTarget.assignments.length > 0 ? (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {viewTarget.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-indigo-600">{a.courseCode}</span>{' '}
                        <span className="text-slate-700 font-medium">— {a.courseName}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Sec {a.section} • Sem {a.semester}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No classes currently assigned.</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  handleOpenEdit(viewTarget);
                }}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Edit Faculty
              </button>
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VIEW ASSIGNMENT DETAILS                            */}
      {/* ========================================================= */}
      {showViewAssignmentModal && viewAssignmentTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Teaching Assignment Details</h2>
                  <p className="text-[11px] text-slate-500">Official academic allocation record</p>
                </div>
              </div>
              <button
                onClick={() => setShowViewAssignmentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Faculty Member</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{viewAssignmentTarget.facultyName}</div>
                <div className="text-slate-500 font-mono">{viewAssignmentTarget.employeeId} • {viewAssignmentTarget.designation}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Course / Subject</span>
                <div className="font-bold text-indigo-600 text-sm font-mono mt-0.5">{viewAssignmentTarget.courseCode}</div>
                <div className="text-slate-700 font-medium">{viewAssignmentTarget.courseName}</div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Semester</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{viewAssignmentTarget.semester}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Section</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm">{viewAssignmentTarget.section}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Academic Year</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{viewAssignmentTarget.academicYear}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Department</span>
                  <span className="font-semibold text-slate-800">{viewAssignmentTarget.department || 'CSE'}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {viewAssignmentTarget.status}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowViewAssignmentModal(false);
                  handleOpenEditAssignment(viewAssignmentTarget);
                }}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Edit Assignment
              </button>
              <button
                type="button"
                onClick={() => setShowViewAssignmentModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT ASSIGNMENT                                    */}
      {/* ========================================================= */}
      {showEditAssignmentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Edit Teaching Assignment</h2>
                  <p className="text-[11px] text-slate-500">
                    {editAssignmentForm.facultyName} ({editAssignmentForm.employeeId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditAssignmentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditAssignmentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Subject / Course
                </label>
                <select
                  value={editAssignmentForm.courseId}
                  onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, courseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                >
                  {meta.courses?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseCode} - {c.courseName} (Sem {c.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Semester
                  </label>
                  <select
                    value={editAssignmentForm.semester}
                    onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, semester: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Section
                  </label>
                  <select
                    value={editAssignmentForm.section}
                    onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, section: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    {['A', 'B', 'C'].map((s) => (
                      <option key={s} value={s}>
                        Section {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Academic Year
                  </label>
                  <select
                    value={editAssignmentForm.academicYear}
                    onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, academicYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                  >
                    {['2026-2027', '2025-2026'].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={editAssignmentForm.status}
                    onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditAssignmentModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAssignmentEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {savingAssignmentEdit ? 'Saving...' : 'Update Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SAFE DEACTIVATE CONFIRMATION                       */}
      {/* ========================================================= */}
      {showDeactivateModal && deactivateTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start space-x-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  deactivateTarget.status === 'ACTIVE'
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {deactivateTarget.status === 'ACTIVE' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {deactivateTarget.status === 'ACTIVE' ? 'Deactivate Faculty Member?' : 'Reactivate Faculty Member?'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are about to {deactivateTarget.status === 'ACTIVE' ? 'deactivate' : 'reactivate'}{' '}
                  <strong>{deactivateTarget.name}</strong> (Employee ID: <span className="font-mono">{deactivateTarget.employeeId}</span>).
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-800">Operational Impact:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                {deactivateTarget.status === 'ACTIVE' ? (
                  <>
                    <li>Faculty member will be strictly blocked from logging into the portal.</li>
                    <li>Active course assignments will be placed on inactive hold.</li>
                    <li className="font-semibold text-emerald-700">
                      ✓ Historical attendance and class records remain completely intact.
                    </li>
                  </>
                ) : (
                  <>
                    <li>Faculty member's account will be restored to Active status.</li>
                    <li>Faculty will be able to log in and access authorized classes.</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeactivateModal(false);
                  setDeactivateTarget(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={deactivating}
                className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${
                  deactivateTarget.status === 'ACTIVE'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {deactivating
                  ? 'Updating Status...'
                  : deactivateTarget.status === 'ACTIVE'
                  ? 'Confirm Deactivation'
                  : 'Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MOVE TO TRASH / DELETE                             */}
      {/* ========================================================= */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Faculty Member (Move to Trash)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are about to delete <strong>{deleteTarget.name}</strong> (Employee ID: <span className="font-mono font-bold">{deleteTarget.employeeId}</span>).
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2 text-xs text-slate-700">
              <p className="font-bold text-rose-900">What happens after deletion:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                <li>Faculty member immediately disappears from directory and active dropdowns.</li>
                <li>Faculty login is blocked.</li>
                <li className="font-semibold text-emerald-700">
                  ✓ Historical attendance records are safely preserved.
                </li>
                <li>Record moves to Deleted Records / Trash where you can restore it anytime.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Deletion (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Contract ended, transferred, duplicate record"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deleting ? 'Moving to Trash...' : 'Delete & Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyManagementPage;
