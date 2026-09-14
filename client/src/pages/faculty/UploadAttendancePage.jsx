import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Clock,
  BookOpen,
  Users,
  Check,
  X,
  Download,
  RefreshCw,
  ArrowRight,
  Sparkles,
  History,
  Info,
  ShieldCheck,
  FileText,
  UserCheck,
} from 'lucide-react';

export const UploadAttendancePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form selections
  const [formMeta, setFormMeta] = useState(null);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedYear, setSelectedYear] = useState('3');
  const [selectedSemester, setSelectedSemester] = useState('5');
  const [selectedPeriod, setSelectedPeriod] = useState('1');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Workflow State
  // 1 = Form & File, 2 = Validating, 3 = Validation Result (Failed or Succeeded), 4 = Confirmed & Saved
  const [stage, setStage] = useState(1);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Loading & Error States
  const [initialLoading, setInitialLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [pageError, setPageError] = useState('');

  // Period label helper
  const periodTimes = {
    '1': '08:15 - 09:05',
    '2': '09:05 - 09:55',
    '3': '10:10 - 11:00',
    '4': '11:00 - 11:50',
    '5': '12:40 - 01:30',
    '6': '01:30 - 02:20',
    '7': '02:30 - 03:20',
    '8': '03:20 - 04:10',
  };

  // Load Form Metadata (Authorized departments, courses, sections)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await api.get('/faculty/classes/form-meta');
        if (res.data?.success) {
          const meta = res.data.data;
          setFormMeta(meta);

          if (meta.departments?.length > 0) {
            setSelectedDeptId(meta.departments[0].id);
          }
          if (meta.courses?.length > 0) {
            setSelectedCourseId(meta.courses[0].id);
            if (meta.courses[0].semester) {
              setSelectedSemester(meta.courses[0].semester.toString());
              setSelectedYear(Math.ceil(meta.courses[0].semester / 2).toString());
            }
          }
          if (meta.sections?.length > 0) {
            setSelectedSection(meta.sections[0]);
          }
        }
      } catch (err) {
        setPageError(err.response?.data?.message || 'Could not load faculty academic metadata.');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchMeta();
  }, []);

  // Update Year automatically when Semester changes
  const handleSemesterChange = (newSem) => {
    setSelectedSemester(newSem);
    const calculatedYear = Math.ceil(parseInt(newSem, 10) / 2);
    if (calculatedYear >= 1 && calculatedYear <= 4) {
      setSelectedYear(calculatedYear.toString());
    }
  };

  // Available courses filtered by department
  const availableCourses = formMeta?.courses?.filter((c) => {
    if (selectedDeptId && c.departmentId !== selectedDeptId) return false;
    return true;
  }) || [];

  // Available sections based on selected course
  const availableSections = formMeta?.assignments
    ? [
        ...new Set(
          formMeta.assignments
            .filter((a) => !selectedCourseId || a.courseId === selectedCourseId)
            .map((a) => a.section)
        ),
      ]
    : formMeta?.sections || ['A', 'B'];

  // Handle File Selection
  const handleFileChange = (file) => {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      alert('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setSelectedFile(file);
    setValidationResult(null);
    setPageError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      setFileBase64(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Handle Sample Template Download
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    setPageError('');
    try {
      const query = new URLSearchParams({
        departmentId: selectedDeptId || '',
        section: selectedSection || '',
        courseId: selectedCourseId || '',
        year: selectedYear || '',
        semester: selectedSemester || '',
      }).toString();

      const response = await api.get(`/faculty/attendance/upload/template?${query}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Attendance_Template_${selectedSection || 'Sample'}_${selectedDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setPageError('Failed to download Excel template. Please try again.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Trigger Validation (All-or-Nothing check)
  const handleValidate = async () => {
    setPageError('');
    if (!selectedFile || !fileBase64) {
      setPageError('Please select an Excel file to upload.');
      return;
    }

    if (!selectedDeptId || !selectedCourseId || !selectedSection || !selectedPeriod || !selectedDate) {
      setPageError('Please select all academic details (Subject, Section, Period, Date).');
      return;
    }

    setValidating(true);
    try {
      const payload = {
        fileData: fileBase64,
        academicDetails: {
          departmentId: selectedDeptId,
          section: selectedSection,
          year: selectedYear,
          semester: selectedSemester,
          courseId: selectedCourseId,
          date: selectedDate,
          period: selectedPeriod,
        },
      };

      const res = await api.post('/faculty/attendance/upload/validate', payload);
      setValidationResult(res.data.data);
      setStage(3); // Result Stage (Valid)
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.data) {
        // Validation failed under All-or-Nothing policy
        setValidationResult(err.response.data.data);
        setStage(3); // Result Stage (Invalid)
      } else {
        setPageError(err.response?.data?.message || 'Validation request failed. Please check network or file format.');
      }
    } finally {
      setValidating(false);
    }
  };

  // Confirm & Import (Atomic Transaction)
  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.isValid || !validationResult.preview) {
      return;
    }

    setImporting(true);
    setPageError('');

    try {
      const payload = {
        academicDetails: {
          departmentId: selectedDeptId,
          section: selectedSection,
          year: selectedYear,
          semester: selectedSemester,
          courseId: selectedCourseId,
          date: selectedDate,
          period: selectedPeriod,
        },
        validatedRecords: validationResult.preview,
      };

      const res = await api.post('/faculty/attendance/upload/confirm', payload);
      if (res.data?.success) {
        setImportResult(res.data.data);
        setStage(4); // Success Stage
      }
    } catch (err) {
      setPageError(err.response?.data?.message || 'Database import failed. Transaction rolled back.');
    } finally {
      setImporting(false);
    }
  };

  // Reset workflow to upload another session
  const handleReset = () => {
    setSelectedFile(null);
    setFileBase64('');
    setValidationResult(null);
    setImportResult(null);
    setPageError('');
    setStage(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (initialLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <LoadingSpinner message="Loading academic details..." />
      </div>
    );
  }

  const selectedCourseObj = formMeta?.courses?.find((c) => c.id === selectedCourseId);
  const selectedDeptObj = formMeta?.departments?.find((d) => d.id === selectedDeptId);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
            <span>Faculty ERP</span>
            <span>/</span>
            <span>Attendance</span>
            <span>/</span>
            <span>Upload</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1 flex items-center space-x-3">
            <Upload className="w-7 h-7 text-blue-600" />
            <span>Upload Attendance</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Import Excel attendance (.xlsx / .xls) with strict Student Master validation and atomic database import.
          </p>
        </div>

        {/* Authenticated Faculty Badge */}
        <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              {user?.profile?.name || user?.identifier}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              ID: {user?.profile?.employeeId || user?.identifier} • Faculty
            </p>
          </div>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
          <div
            className={`flex items-center space-x-2 p-2 rounded-xl transition-all ${
              stage === 1
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : stage > 1
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                stage > 1 ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
              }`}
            >
              {stage > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </div>
            <span className="hidden sm:inline">Academic Details</span>
          </div>

          <div
            className={`flex items-center space-x-2 p-2 rounded-xl transition-all ${
              stage === 1 && selectedFile
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : stage > 1
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                stage > 1 ? 'bg-emerald-600 text-white' : selectedFile ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {stage > 1 ? <Check className="w-3.5 h-3.5" /> : '2'}
            </div>
            <span className="hidden sm:inline">Upload Excel</span>
          </div>

          <div
            className={`flex items-center space-x-2 p-2 rounded-xl transition-all ${
              stage === 3
                ? validationResult?.isValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : stage > 3
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                stage === 3 && !validationResult?.isValid
                  ? 'bg-rose-600 text-white'
                  : stage >= 3
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {stage === 3 && !validationResult?.isValid ? <X className="w-3.5 h-3.5" /> : stage > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
            </div>
            <span className="hidden sm:inline">Validation</span>
          </div>

          <div
            className={`flex items-center space-x-2 p-2 rounded-xl transition-all ${
              stage === 4
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'text-slate-400'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                stage === 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {stage === 4 ? <Check className="w-3.5 h-3.5" /> : '4'}
            </div>
            <span className="hidden sm:inline">Import Success</span>
          </div>
        </div>
      </div>

      {/* Global Page Error Banner */}
      {pageError && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-start space-x-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p className="text-xs mt-0.5">{pageError}</p>
          </div>
          <button onClick={() => setPageError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STAGE 1 & 2: SELECTION & EXCEL UPLOAD */}
      {stage <= 2 && (
        <div className="space-y-6">
          {/* STEP 1: Academic Details Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center space-x-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 1: Select Academic Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Department *
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {formMeta?.departments?.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.code} - {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject (Course) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Subject / Course *
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    const newCourseId = e.target.value;
                    setSelectedCourseId(newCourseId);
                    const courseObj = formMeta?.courses?.find((c) => c.id === newCourseId);
                    if (courseObj?.semester) {
                      handleSemesterChange(courseObj.semester.toString());
                    }
                  }}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {availableCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Section *
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Year *
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="1">Year 1 (Freshman)</option>
                  <option value="2">Year 2 (Sophomore)</option>
                  <option value="3">Year 3 (Junior)</option>
                  <option value="4">Year 4 (Senior)</option>
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Semester *
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => handleSemesterChange(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Period */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Period *
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                    <option key={p} value={p}>
                      Period {p} ({periodTimes[p]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty Info Display */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Faculty (Instructor)
                </label>
                <div className="text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5 text-slate-700 dark:text-slate-300 font-medium truncate">
                  {user?.profile?.name || user?.identifier}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Excel Upload Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Step 2: Upload Excel File
                </h2>
              </div>

              {/* Download Sample Button */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="flex items-center justify-center space-x-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/80 px-3.5 py-2 rounded-xl transition-colors"
              >
                {downloadingTemplate ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download Sample Excel</span>
              </button>
            </div>

            {/* Structure Guideline Alert */}
            <div className="mb-5 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start space-x-3 text-xs text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Required Excel Format:
                </p>
                <p>
                  Column Headers:{' '}
                  <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                    Registration Number
                  </span>{' '}
                  |{' '}
                  <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                    Student Name
                  </span>{' '}
                  |{' '}
                  <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                    Attendance
                  </span>
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Attendance must strictly be <span className="font-semibold text-emerald-600">Present</span> or{' '}
                  <span className="font-semibold text-rose-600">Absent</span>. Registration Number is the primary identifier.
                </p>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                  : selectedFile
                  ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for validation
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                      Click to choose a different file
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Drag and drop your attendance Excel spreadsheet here
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Supports .xlsx and .xls formats
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all"
                  >
                    Choose Excel File
                  </button>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">All-or-Nothing Import:</span> Every row is verified against Student Master before any data is saved.
              </p>

              <button
                type="button"
                onClick={handleValidate}
                disabled={!selectedFile || validating}
                className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  !selectedFile || validating
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                }`}
              >
                {validating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating Against Database...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Validate Attendance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: VALIDATION RESULT SCREEN */}
      {stage === 3 && validationResult && (
        <div className="space-y-6">
          {/* CASE A: VALIDATION FAILED (ALL-OR-NOTHING REJECTION) */}
          {!validationResult.isValid && (
            <div className="space-y-6">
              {/* Prominent Rejection Banner */}
              <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-black text-rose-900 dark:text-rose-200">
                        ❌ Attendance Upload Rejected
                      </h2>
                      <div className="flex items-center space-x-2 text-xs font-bold">
                        <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                          {validationResult.totalRecords} records checked
                        </span>
                        <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg">
                          {validationResult.validCount} valid
                        </span>
                        <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-lg">
                          {validationResult.invalidCount} invalid
                        </span>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-rose-800 dark:text-rose-300 mt-2">
                      Attendance has NOT been saved.
                    </p>
                    <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5 leading-relaxed">
                      Under the strict All-or-Nothing policy, the entire upload is rejected if even one record fails validation. Please review the errors below, correct the Excel file, and upload again.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Report Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span>Validation Error Report ({validationResult.errors?.length || 0} issues)</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Row numbers correspond to your Excel spreadsheet rows.
                    </p>
                  </div>

                  <button
                    onClick={() => setStage(1)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Upload Corrected Excel</span>
                  </button>
                </div>

                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase tracking-wider sticky top-0 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-4 w-28">Excel Row</th>
                        <th className="py-3 px-4 w-44">Registration No.</th>
                        <th className="py-3 px-4 w-48">Student Name</th>
                        <th className="py-3 px-4">Reason / Validation Failure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {validationResult.errors?.map((err, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-rose-50/30 dark:hover:bg-rose-950/10 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-400">
                              Row {err.excelRow}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {err.registrationNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {err.studentName}
                          </td>
                          <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-medium">
                            <div className="flex items-center space-x-1.5">
                              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{err.error}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => setStage(1)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center space-x-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Upload Corrected File</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CASE B: VALIDATION SUCCEEDED (READY FOR CONFIRMATION & IMPORT) */}
          {validationResult.isValid && (
            <div className="space-y-6">
              {/* Validation Succeeded Banner */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                        ✅ Validation Successful
                      </h2>
                      <span className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 rounded-full">
                        0 Errors Detected
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mt-1.5">
                      {validationResult.validCount}/{validationResult.totalRecords} student records matched successfully against Student Master.
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Attendance is ready to be imported into the database. Please review the preview table below and confirm.
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendance Session Details Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Subject & Section</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-1 truncate">
                    {selectedCourseObj?.courseCode} ({selectedSection})
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{selectedCourseObj?.courseName}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Date & Period</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                    {selectedDate}
                  </p>
                  <p className="text-[11px] text-slate-500">Period {selectedPeriod} ({periodTimes[selectedPeriod]})</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Present Count</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {validationResult.presentCount}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {validationResult.totalRecords > 0
                      ? Math.round((validationResult.presentCount / validationResult.totalRecords) * 100)
                      : 0}
                    % attendance
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase">Absent Count</p>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {validationResult.absentCount}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Total: {validationResult.totalRecords} students
                  </p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Attendance Preview ({validationResult.preview?.length || 0} Students)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Verified and ready for atomic import.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    All-or-Nothing Commit
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase tracking-wider sticky top-0 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-4 w-20">#</th>
                        <th className="py-3 px-4 w-44">Registration No.</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4 w-28">Section</th>
                        <th className="py-3 px-4 w-36 text-center">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {validationResult.preview?.map((item, idx) => (
                        <tr
                          key={item.studentId || idx}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {item.registrationNumber}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {item.studentName}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                            Section {item.section}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {item.status === 'PRESENT' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <Check className="w-3 h-3 mr-1" />
                                Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <X className="w-3 h-3 mr-1" />
                                Absent
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Confirm & Cancel Buttons */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStage(1)}
                    disabled={importing}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={importing}
                    className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving To Database...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm & Import Attendance</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STAGE 4: IMPORT SUCCESSFUL SCREEN */}
      {stage === 4 && importResult && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              ✅ Attendance Uploaded Successfully
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              All student records have been permanently saved in the database as an atomic transaction.
            </p>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Marked</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {importResult.totalStudents}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Present</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {importResult.presentCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Absent</p>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {importResult.absentCount}
              </p>
            </div>
          </div>

          {/* Session Details */}
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-left">
            <p>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Date:</span> {importResult.academicDetails?.date}
            </p>
            <p>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Period:</span> Period {importResult.academicDetails?.period}
            </p>
            <p>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Subject:</span> {importResult.academicDetails?.courseCode} - {importResult.academicDetails?.courseName}
            </p>
            <p>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Section:</span> Section {importResult.academicDetails?.section}
            </p>
          </div>

          {/* Action navigation buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Another Session</span>
            </button>

            <button
              onClick={() => navigate('/faculty/attendance/history')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center space-x-2"
            >
              <History className="w-4 h-4" />
              <span>View in Attendance History</span>
            </button>

            <button
              onClick={() => navigate('/faculty/agent')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition-colors flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI Agent</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadAttendancePage;
