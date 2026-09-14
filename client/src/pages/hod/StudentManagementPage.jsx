import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import {
  GraduationCap,
  Search,
  Filter,
  UserPlus,
  FileUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Phone,
  Mail,
  Building2,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  FileText,
  Edit,
  CheckCircle,
} from 'lucide-react';

export const StudentManagementPage = () => {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sectionCounts, setSectionCounts] = useState([]);
  const [totalActiveStudents, setTotalActiveStudents] = useState(0);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Student Edit and Deactivate Modals State
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState({
    id: '',
    registrationNumber: '',
    name: '',
    email: '',
    mobileNumber: '',
    section: 'A',
    year: 5,
    parentName: '',
    parentMobile: '',
    parentEmail: '',
  });
  const [savingStudentEdit, setSavingStudentEdit] = useState(false);

  const [showDeactivateStudentModal, setShowDeactivateStudentModal] = useState(false);
  const [deactivateStudentTarget, setDeactivateStudentTarget] = useState(null);
  const [studentDeleteReason, setStudentDeleteReason] = useState('');
  const [deactivatingStudent, setDeactivatingStudent] = useState(false);

  // Individual Add Form State
  const [individualForm, setIndividualForm] = useState({
    registrationNumber: '',
    name: '',
    email: '',
    section: 'A',
    year: 5,
    mobileNumber: '',
    parentName: '',
    parentMobile: '',
    parentEmail: '',
  });
  const [addingStudent, setAddingStudent] = useState(false);

  // Bulk Import State
  const [importCsvText, setImportCsvText] = useState('');
  const [validatingImport, setValidatingImport] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'paste'
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileParsing, setFileParsing] = useState(false);
  const fileInputRef = useRef(null);

  const fetchStudents = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: pagination.limit,
        search: searchQuery,
        section: sectionFilter,
        semester: semesterFilter,
        riskStatus: riskFilter,
        status: statusFilter,
      });

      const res = await api.get(`/hod/students?${queryParams.toString()}`);
      if (res.data?.success) {
        setStudents(res.data.data.students);
        setPagination(res.data.data.pagination);
        if (res.data.data.sectionCounts) {
          setSectionCounts(res.data.data.sectionCounts);
        }
        if (typeof res.data.data.totalActiveStudents === 'number') {
          setTotalActiveStudents(res.data.data.totalActiveStudents);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not fetch student records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(1);
  }, [searchQuery, sectionFilter, semesterFilter, riskFilter, statusFilter]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchStudents(newPage);
    }
  };

  const handleAddIndividual = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setAddingStudent(true);

    try {
      const res = await api.post('/hod/students', individualForm);
      if (res.data?.success) {
        setSuccessMessage(res.data.message);
        setShowAddModal(false);
        setIndividualForm({
          registrationNumber: '',
          name: '',
          email: '',
          section: 'A',
          year: 5,
          mobileNumber: '',
          parentName: '',
          parentMobile: '',
          parentEmail: '',
        });
        fetchStudents(1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add student.');
    } finally {
      setAddingStudent(false);
    }
  };

  const parseCsvLine = (text) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"' || c === "'") {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result.map((s) => s.replace(/^["']|["']$/g, ''));
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const processFile = (file) => {
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.txt');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCsv && !isExcel) {
      setError('Please select a valid CSV (.csv) or Excel (.xlsx, .xls) file.');
      return;
    }

    setFileParsing(true);
    setError('');
    setSelectedFile(file);
    setValidationResult(null);

    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            setError('The Excel file contains no readable sheets.');
            setFileParsing(false);
            return;
          }
          const worksheet = workbook.Sheets[firstSheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          if (!csv || !csv.trim()) {
            setError('The selected Excel sheet appears to be empty.');
            setFileParsing(false);
            return;
          }
          setImportCsvText(csv.trim());
          setFileParsing(false);
        } catch (err) {
          console.error('Error parsing Excel file:', err);
          setError('Could not parse Excel file. Please ensure it is valid.');
          setFileParsing(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file from disk.');
        setFileParsing(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          if (!text || !text.trim()) {
            setError('The selected CSV file appears to be empty.');
            setFileParsing(false);
            return;
          }
          setImportCsvText(text.trim());
          setFileParsing(false);
        } catch (err) {
          console.error('Error reading CSV file:', err);
          setError('Failed to read CSV file.');
          setFileParsing(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file from disk.');
        setFileParsing(false);
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setImportCsvText('');
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCsvValidation = async () => {
    if (!importCsvText.trim()) {
      setError('Please select a file or paste CSV rows first.');
      return;
    }

    setValidatingImport(true);
    setValidationResult(null);
    setError('');

    try {
      // Parse CSV lines
      const lines = importCsvText.trim().split(/\r?\n/);
      const rows = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Skip header line if detected
        if (
          i === 0 &&
          (line.toLowerCase().includes('registration') ||
            line.toLowerCase().includes('regno') ||
            line.toLowerCase().includes('reg_no') ||
            line.toLowerCase().includes('student name') ||
            line.toLowerCase().includes('student id'))
        ) {
          continue;
        }

        const parts = parseCsvLine(line);
        if (parts.length >= 2 && parts[0]) {
          rows.push({
            registrationNumber: parts[0] || '',
            name: parts[1] || '',
            email: parts[2] || '',
            section: (parts[3] || 'A').toUpperCase(),
            year: parseInt(parts[4] || '5', 10) || 5,
            mobileNumber: parts[5] || '',
            parentName: parts[6] || '',
            parentMobile: parts[7] || '',
            parentEmail: parts[8] || '',
          });
        }
      }

      if (rows.length === 0) {
        setError('No valid student rows found in the provided data.');
        setValidatingImport(false);
        return;
      }

      const res = await api.post('/hod/students/bulk-validate', { students: rows });
      if (res.data?.success) {
        setValidationResult(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'CSV validation failed.');
    } finally {
      setValidatingImport(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.validCount === 0) return;

    setImporting(true);
    setError('');

    try {
      const recordsToImport = validationResult.validRows || validationResult.validPreview || [];
      const res = await api.post('/hod/students/bulk-import', {
        students: recordsToImport,
      });

      if (res.data?.success) {
        const importedTotal = res.data.data?.importedCount || recordsToImport.length;
        const summaryObj = res.data.data?.sectionSummary;
        let summaryText = '';
        if (summaryObj && Object.keys(summaryObj).length > 0) {
          summaryText = ' • ' + Object.entries(summaryObj).map(([sec, count]) => `Section ${sec}: ${count}`).join(', ');
        }
        setSuccessMessage(`Total students imported: ${importedTotal}${summaryText}`);
        setShowImportModal(false);
        handleRemoveFile();
        fetchStudents(1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete import.');
    } finally {
      setImporting(false);
    }
  };

  const openStudentDetail = async (id) => {
    setSelectedStudentId(id);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/hod/students/${id}`);
      if (res.data?.success) {
        setStudentDetail(res.data.data);
      }
    } catch (err) {
      setError('Could not load student profile.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenEditStudent = async (student) => {
    setError('');
    setEditStudentForm({
      id: student.id,
      registrationNumber: student.registrationNumber,
      name: student.name,
      email: student.email,
      mobileNumber: student.mobileNumber || '',
      section: student.section || 'A',
      year: student.semester || 5,
      parentName: '',
      parentMobile: '',
      parentEmail: '',
    });
    setShowEditStudentModal(true);

    try {
      const res = await api.get(`/hod/students/${student.id}`);
      if (res.data?.success && res.data.data?.profile) {
        const p = res.data.data.profile;
        setEditStudentForm((prev) => ({
          ...prev,
          mobileNumber: p.mobileNumber || '',
          parentName: p.parentName !== 'N/A' ? p.parentName : '',
          parentMobile: p.parentMobile !== 'N/A' ? p.parentMobile : '',
          parentEmail: p.parentEmail !== 'N/A' ? p.parentEmail : '',
        }));
      }
    } catch (err) {
      console.warn('Could not fetch detailed parent profile', err);
    }
  };

  const handleSaveStudentEdit = async (e) => {
    e.preventDefault();
    setError('');
    if (!editStudentForm.name.trim() || !editStudentForm.email.trim()) {
      setError('Student Name and Email are required.');
      return;
    }

    setSavingStudentEdit(true);
    try {
      const res = await api.put(`/hod/students/${editStudentForm.id}`, {
        name: editStudentForm.name,
        email: editStudentForm.email,
        mobileNumber: editStudentForm.mobileNumber,
        section: editStudentForm.section,
        year: editStudentForm.year,
        parentName: editStudentForm.parentName,
        parentMobile: editStudentForm.parentMobile,
        parentEmail: editStudentForm.parentEmail,
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'Student profile updated successfully.');
        setShowEditStudentModal(false);
        fetchStudents(pagination.page);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update student.');
    } finally {
      setSavingStudentEdit(false);
    }
  };

  const handleOpenDeactivateStudent = (student) => {
    setDeactivateStudentTarget(student);
    setStudentDeleteReason('');
    setError('');
    setShowDeactivateStudentModal(true);
  };

  const handleConfirmDeactivateStudent = async () => {
    if (!deactivateStudentTarget) return;
    setDeactivatingStudent(true);
    setError('');

    try {
      const res = await api.delete(`/hod/students/${deactivateStudentTarget.id}`, {
        data: { reason: studentDeleteReason || 'Removed by HOD' },
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'Student moved to Deleted Records / Trash.');
        setShowDeactivateStudentModal(false);
        setDeactivateStudentTarget(null);
        fetchStudents(pagination.page);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete student.');
    } finally {
      setDeactivatingStudent(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'registrationNumber,name,email,section,semester,mobileNumber,parentName,parentMobile,parentEmail\n' +
      '24CSE301,Harish Kumar,harish.24cse301@university.edu,A,5,9840112211,R. Kumar,9840112212,kumar.parent@gmail.com\n' +
      '24CSE302,Deepa Srinivasan,deepa.24cse302@university.edu,A,5,9840112213,S. Srinivasan,9840112214,srinivasan.p@gmail.com\n' +
      '24CSE303,Manoj Varma,manoj.24cse303@university.edu,B,5,9840112215,K. Varma,9840112216,varma.parent@gmail.com';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_bulk_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <span>Department Student Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage enrolled students, monitor real-time subject attendance, track risk levels, and perform CSV bulk imports.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FileUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bulk Import (CSV / Excel)</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
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

      {/* Dynamic Section Count Badges Bar (Source of Truth from PostgreSQL) */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
          Sections:
        </span>
        <button
          type="button"
          onClick={() => setSectionFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            sectionFilter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All Sections ({totalActiveStudents} Students)
        </button>
        {sectionCounts.map((sc) => (
          <button
            key={sc.section}
            type="button"
            onClick={() => setSectionFilter(sc.section)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sectionFilter === sc.section
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Section {sc.section} — {sc.count} Students
          </button>
        ))}
      </div>

      {/* Search & Multi-Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search by registration number, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dynamic Section Filter */}
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold"
          >
            <option value="ALL">All Sections ({totalActiveStudents} Students)</option>
            {sectionCounts.map((sc) => (
              <option key={sc.section} value={sc.section}>
                Section {sc.section} — {sc.count} Students
              </option>
            ))}
          </select>

          {/* Semester Filter */}
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold"
          >
            <option value="ALL">All Attendance Statuses</option>
            <option value="GOOD">Good (&ge;75%)</option>
            <option value="WARNING">Warning (65-74.9%)</option>
            <option value="AT_RISK">At Risk (&lt;65%)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Students</option>
            <option value="INACTIVE">Inactive / Deactivated</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Registration No</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3 text-center">Section</th>
                <th className="px-4 py-3 text-center">Semester</th>
                <th className="px-4 py-3 text-center">Attendance %</th>
                <th className="px-4 py-3 text-center">Risk Status</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Assigned Counselor</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    {s.registrationNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700 font-mono">
                    {s.section}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-medium">{s.semester}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-mono font-bold text-xs ${
                        s.attendancePercentage >= 75
                          ? 'text-emerald-600'
                          : s.attendancePercentage >= 65
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {s.attendancePercentage}%
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {s.attendedClasses}/{s.totalClasses}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        s.riskStatus === 'GOOD'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : s.riskStatus === 'WARNING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {s.riskStatus === 'GOOD' ? 'Good' : s.riskStatus === 'WARNING' ? 'Warning' : 'At Risk'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {s.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.counselor ? (
                      <div>
                        <div className="font-semibold text-slate-800">{s.counselor.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.counselor.employeeId}</div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Not Assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => openStudentDetail(s.id)}
                        className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                        title="View Profile"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditStudent(s)}
                        className="inline-flex items-center space-x-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                        title="Edit Student Profile"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDeactivateStudent(s)}
                        className="inline-flex items-center space-x-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                        title="Delete Student (Move to Trash)"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {students.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold text-slate-600">No students found</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">No student records found in this department matching the specified filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="font-mono font-bold px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. ADD INDIVIDUAL STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Add Individual Student</h2>
                  <p className="text-[11px] text-slate-500">Department locked to your authenticated HOD scope.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddIndividual} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Registration No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24CSE501"
                    value={individualForm.registrationNumber}
                    onChange={(e) => setIndividualForm({ ...individualForm, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ananya Rao"
                    value={individualForm.name}
                    onChange={(e) => setIndividualForm({ ...individualForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Student Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ananya@university.edu"
                    value={individualForm.email}
                    onChange={(e) => setIndividualForm({ ...individualForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="9840112233"
                    value={individualForm.mobileNumber}
                    onChange={(e) => setIndividualForm({ ...individualForm, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Section *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A"
                    value={individualForm.section}
                    onChange={(e) => setIndividualForm({ ...individualForm, section: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Semester *
                  </label>
                  <select
                    value={individualForm.year}
                    onChange={(e) => setIndividualForm({ ...individualForm, year: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guardian Info */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Parent / Guardian Details
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Parent Name"
                    value={individualForm.parentName}
                    onChange={(e) => setIndividualForm({ ...individualForm, parentName: e.target.value })}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                  />
                  <input
                    type="tel"
                    placeholder="Parent Mobile"
                    value={individualForm.parentMobile}
                    onChange={(e) => setIndividualForm({ ...individualForm, parentMobile: e.target.value })}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                  />
                  <input
                    type="email"
                    placeholder="Parent Email"
                    value={individualForm.parentEmail}
                    onChange={(e) => setIndividualForm({ ...individualForm, parentEmail: e.target.value })}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStudent}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {addingStudent ? 'Saving Student...' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. BULK CSV / EXCEL IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <FileUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Bulk Import Students</h2>
                  <p className="text-[11px] text-slate-500">
                    Upload CSV or Excel file &rarr; Validate duplicates &rarr; Preview &rarr; Insert to PostgreSQL.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  handleRemoveFile();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Banner */}
            <div className="flex items-center justify-between p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs">
              <div className="text-indigo-950">
                <span className="font-bold">Need the correct column format?</span> Download the official template.
              </div>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV Template</span>
              </button>
            </div>

            {/* Mode Selector Tabs: Upload File vs Paste Text */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  uploadMode === 'file'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload File (CSV / Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('paste')}
                className={`flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  uploadMode === 'paste'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste CSV Text</span>
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls, .txt, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* TAB 1: FILE UPLOAD (DRAG & DROP / BROWSE) */}
            {uploadMode === 'file' && (
              <div className="space-y-3">
                {!selectedFile ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
                      dragActive
                        ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                        : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100/80 text-indigo-600 flex items-center justify-center mb-3 shadow-xs">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 mb-1">
                      Click to choose a file or drag and drop here
                    </p>
                    <p className="text-[11px] text-slate-500 mb-3.5">
                      Supports CSV (.csv), Excel (.xlsx, .xls), or Text (.txt) up to 10MB
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors pointer-events-none"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Browse Files</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 truncate max-w-sm">
                            {selectedFile.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                            <span>{formatFileSize(selectedFile.size)}</span>
                            <span>&bull;</span>
                            {fileParsing ? (
                              <span className="text-amber-600 font-medium">Reading file contents...</span>
                            ) : (
                              <span className="text-emerald-700 font-medium">
                                Ready for validation ({importCsvText ? importCsvText.split('\n').filter((l) => l.trim()).length : 0} rows found)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          Change File
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {importCsvText && (
                      <div className="pt-2 border-t border-slate-200/80">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                          <span>Data Preview (first lines):</span>
                          <button
                            type="button"
                            onClick={() => setUploadMode('paste')}
                            className="text-indigo-600 hover:underline cursor-pointer"
                          >
                            Edit as Raw Text &rarr;
                          </button>
                        </div>
                        <pre className="p-2.5 bg-slate-900 text-slate-100 text-[11px] font-mono rounded-lg overflow-x-auto max-h-24">
                          {importCsvText.split('\n').slice(0, 4).join('\n')}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RAW TEXTAREA (PASTE CSV) */}
            {uploadMode === 'paste' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Paste CSV Records or Paste CSV Contents:
                </label>
                <textarea
                  rows={6}
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder="registrationNumber,name,email,section,semester,mobileNumber,parentName,parentMobile,parentEmail&#10;24CSE601,Rohan Mehta,rohan.24cse601@university.edu,A,5,9840112255,S. Mehta,9840112256,smehta@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
                ></textarea>
                <p className="text-[11px] text-slate-500 mt-1">
                  Header row is optional. Required: Registration No, Name, Email, Section, Semester.
                </p>
              </div>
            )}

            {/* Validate Button (Before validation is run) */}
            {!validationResult && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCsvValidation}
                  disabled={validatingImport || fileParsing || !importCsvText.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{validatingImport ? 'Validating against Database...' : 'Validate Student Records'}</span>
                </button>
              </div>
            )}

            {/* Validation Feedback & Preview */}
            {validationResult && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-4 text-xs font-medium">
                    <span>Total Rows: <strong>{validationResult.totalRecords}</strong></span>
                    <span className="text-emerald-700">Valid: <strong>{validationResult.validCount}</strong></span>
                    <span className="text-rose-700">Invalid/Duplicate: <strong>{validationResult.invalidCount}</strong></span>
                  </div>
                  <button
                    onClick={() => setValidationResult(null)}
                    className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Modify / Re-validate
                  </button>
                </div>

                {/* Section Breakdown to Import */}
                {validationResult.validRows && validationResult.validRows.length > 0 && (() => {
                  const secDist = {};
                  validationResult.validRows.forEach((r) => {
                    const s = (r.section || 'A').toUpperCase();
                    secDist[s] = (secDist[s] || 0) + 1;
                  });
                  return (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs space-y-1.5">
                      <span className="font-bold text-indigo-950 block">Section Breakdown in Import Data:</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(secDist).map(([sec, count]) => (
                          <span key={sec} className="px-2.5 py-1 bg-white border border-indigo-200 rounded-md font-bold text-indigo-700 shadow-2xs">
                            Section {sec}: {count} students
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Errors List */}
                {validationResult.errors && validationResult.errors.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1.5 max-h-36 overflow-y-auto">
                    <p className="font-bold text-rose-900">Flagged Errors / Duplicate Records:</p>
                    {validationResult.errors.map((err, idx) => (
                      <div key={idx} className="text-rose-700">
                        Row {err.row} ({err.registrationNumber}): {err.reasons.join('; ')}
                      </div>
                    ))}
                  </div>
                )}

                {/* Valid Preview Table */}
                {validationResult.validPreview && validationResult.validPreview.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-1">
                      Ready to Insert Preview ({validationResult.validPreview.length} shown of {validationResult.validCount} valid):
                    </p>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-[11px] text-slate-600">
                        <thead className="bg-slate-100 text-slate-500 sticky top-0">
                          <tr>
                            <th className="p-2">Reg No</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Sec</th>
                            <th className="p-2">Sem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {validationResult.validPreview.map((v, i) => (
                            <tr key={i}>
                              <td className="p-2 font-mono font-bold">{v.registrationNumber}</td>
                              <td className="p-2">{v.name}</td>
                              <td className="p-2">{v.email}</td>
                              <td className="p-2 font-bold">{v.section}</td>
                              <td className="p-2">{v.year}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Confirm Import Button */}
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      handleRemoveFile();
                    }}
                    className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={importing || validationResult.validCount === 0}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {importing
                      ? 'Inserting into Database...'
                      : `Confirm & Import ${validationResult.validCount} Students`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. STUDENT PROFILE DRAWER / MODAL */}
      {selectedStudentId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Student Academic Profile & Attendance Detail</span>
              </h2>
              <button
                onClick={() => {
                  setSelectedStudentId(null);
                  setStudentDetail(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
                Loading complete student attendance profile from PostgreSQL...
              </div>
            ) : studentDetail ? (
              <div className="space-y-4 text-xs">
                {/* Profile Banner */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono font-bold text-slate-900 text-base">
                        {studentDetail.profile.registrationNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Sec {studentDetail.profile.section} • Sem {studentDetail.profile.year}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{studentDetail.profile.name}</p>
                    <p className="text-slate-500 text-[11px]">{studentDetail.profile.email}</p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-2xl font-black font-mono ${
                        studentDetail.metrics.overallPercentage >= 75
                          ? 'text-emerald-600'
                          : studentDetail.metrics.overallPercentage >= 65
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {studentDetail.metrics.overallPercentage}%
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {studentDetail.metrics.attendedClasses} of {studentDetail.metrics.totalClasses} classes
                    </p>
                  </div>
                </div>

                {/* Assigned Counselor & Parent Contacts */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Counselor</span>
                    {studentDetail.counselor ? (
                      <div className="mt-1">
                        <p className="font-bold text-slate-900">{studentDetail.counselor.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{studentDetail.counselor.employeeId}</p>
                        <p className="text-[11px] text-indigo-600">{studentDetail.counselor.email}</p>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic mt-1">No faculty counselor assigned</p>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Parent / Guardian Contact</span>
                    <div className="mt-1">
                      <p className="font-bold text-slate-900">{studentDetail.profile.parentName}</p>
                      <p className="text-[11px] text-slate-600">{studentDetail.profile.parentMobile}</p>
                      <p className="text-[11px] text-slate-500 truncate">{studentDetail.profile.parentEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Subject-Wise Attendance Breakdown */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Subject-Wise Attendance Breakdown</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="p-2.5">Subject</th>
                          <th className="p-2.5 text-center">Classes Attended</th>
                          <th className="p-2.5 text-center">Total Classes</th>
                          <th className="p-2.5 text-right">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentDetail.subjectBreakdown.map((sb, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-medium">
                              <span className="font-mono font-bold mr-1.5">{sb.courseCode}</span>
                              <span className="text-slate-600">{sb.courseName}</span>
                            </td>
                            <td className="p-2.5 text-center font-mono">{sb.attended}</td>
                            <td className="p-2.5 text-center font-mono">{sb.total}</td>
                            <td className="p-2.5 text-right">
                              <span
                                className={`font-mono font-bold ${
                                  sb.percentage >= 75
                                    ? 'text-emerald-600'
                                    : sb.percentage >= 65
                                    ? 'text-amber-600'
                                    : 'text-rose-600'
                                }`}
                              >
                                {sb.percentage}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Interventions Log */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Interventions & Counseling History</h3>
                  {studentDetail.interventions && studentDetail.interventions.length > 0 ? (
                    <div className="space-y-2">
                      {studentDetail.interventions.map((i) => (
                        <div key={i.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-900">{i.type}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{i.date}</span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5">{i.description}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span>Counselor: {i.counselorName}</span>
                            <span className="font-bold text-slate-700 uppercase">{i.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px]">No formal counseling interventions recorded yet.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 4. EDIT STUDENT MODAL */}
      {showEditStudentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Edit Student Academic Record</h2>
                  <p className="text-[11px] text-slate-500">
                    Update academic details and parent contact. Registration number & department remain locked.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditStudentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Registration No (Read-Only)
                  </label>
                  <input
                    type="text"
                    value={editStudentForm.registrationNumber}
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Department (Locked)
                  </label>
                  <input
                    type="text"
                    value="HOD Department"
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editStudentForm.name}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Student Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editStudentForm.email}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Student Mobile
                  </label>
                  <input
                    type="text"
                    value={editStudentForm.mobileNumber}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, mobileNumber: e.target.value })}
                    placeholder="9840112233"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A"
                    value={editStudentForm.section}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, section: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-bold font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Semester
                  </label>
                  <select
                    value={editStudentForm.year}
                    onChange={(e) =>
                      setEditStudentForm({ ...editStudentForm, year: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-800 mb-2">Parent / Guardian Contact Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Parent Name
                    </label>
                    <input
                      type="text"
                      value={editStudentForm.parentName}
                      onChange={(e) => setEditStudentForm({ ...editStudentForm, parentName: e.target.value })}
                      placeholder="Parent Name"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Parent Mobile
                    </label>
                    <input
                      type="text"
                      value={editStudentForm.parentMobile}
                      onChange={(e) =>
                        setEditStudentForm({ ...editStudentForm, parentMobile: e.target.value })
                      }
                      placeholder="9840112244"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditStudentModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStudentEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {savingStudentEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MOVE TO DELETED RECORDS / TRASH CONFIRMATION */}
      {showDeactivateStudentModal && deactivateStudentTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Student (Move to Trash)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Student: <strong>{deactivateStudentTarget.name}</strong> (Reg No:{' '}
                  <span className="font-mono font-bold">{deactivateStudentTarget.registrationNumber}</span>).
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2 text-xs text-slate-700">
              <p className="font-bold text-rose-900">What happens after deletion:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                <li>Student immediately disappears from Student Management, faculty rosters, attendance entry, and dashboard counts.</li>
                <li>Student login access will be blocked immediately.</li>
                <li className="font-semibold text-emerald-700">
                  ✓ All historical attendance records and counselor sessions remain 100% preserved.
                </li>
                <li>Record moves to <strong>Deleted Records / Trash</strong> where you can restore it anytime.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Deletion (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Transferred, graduated, duplicate registration"
                value={studentDeleteReason}
                onChange={(e) => setStudentDeleteReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeactivateStudentModal(false);
                  setDeactivateStudentTarget(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeactivateStudent}
                disabled={deactivatingStudent}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deactivatingStudent ? 'Moving to Trash...' : 'Delete & Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagementPage;
