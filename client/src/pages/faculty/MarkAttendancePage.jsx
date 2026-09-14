import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  ClipboardCheck,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

export const MarkAttendancePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Form selections
  const [formMeta, setFormMeta] = useState(null);
  const [selectedDeptId, setSelectedDeptId] = useState(searchParams.get('deptId') || '');
  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');
  const [selectedSection, setSelectedSection] = useState(searchParams.get('section') || '');
  const [selectedSemester, setSelectedSemester] = useState(searchParams.get('semester') || '5');
  const [selectedPeriod, setSelectedPeriod] = useState('1');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Workflow step: 1 = Form Selection, 2 = Student Checkbox Grid
  const [step, setStep] = useState(1);

  // Student list & attendance state
  const [allStudents, setAllStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { [studentId]: boolean } true = Present, false = Absent
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load Form Metadata (Authorized departments, courses, sections)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await api.get('/faculty/classes/form-meta');
        if (res.data?.success) {
          const meta = res.data.data;
          setFormMeta(meta);

          if (!selectedDeptId && meta.departments.length > 0) {
            setSelectedDeptId(meta.departments[0].id);
          }
          if (!selectedCourseId && meta.courses.length > 0) {
            setSelectedCourseId(meta.courses[0].id);
          }
          if (!selectedSection && meta.sections.length > 0) {
            setSelectedSection(meta.sections[0]);
          }
          if (!selectedSemester && meta.semesters.length > 0) {
            setSelectedSemester(meta.semesters[0].toString());
          }
        }
      } catch (err) {
        setErrorMessage(err.response?.data?.message || 'Could not load form metadata.');
      } finally {
        setLoading(false);
      }
    };
    fetchMeta();
  }, []);

  // Filter available courses based on selected department and section
  const availableCourses = formMeta?.courses?.filter((c) => {
    if (selectedDeptId && c.departmentId !== selectedDeptId) return false;
    return true;
  }) || [];

  // Filter available sections based on selected course
  const availableSections = formMeta?.assignments
    ? [
        ...new Set(
          formMeta.assignments
            .filter((a) => (!selectedCourseId || a.courseId === selectedCourseId))
            .map((a) => a.section)
        ),
      ]
    : formMeta?.sections || [];

  // Handle [ Continue ] -> Load ALL Section Students
  const handleLoadStudents = async () => {
    setErrorMessage('');
    setDuplicateWarning('');
    setSuccessMessage('');

    if (!selectedDeptId || !selectedCourseId || !selectedSection || !selectedPeriod || !selectedDate) {
      setErrorMessage('Please complete all class session fields before proceeding.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(
        `/faculty/attendance/students?departmentId=${selectedDeptId}&section=${selectedSection}&courseId=${selectedCourseId}&semester=${selectedSemester}&limit=all`
      );

      if (res.data?.success) {
        const studentList = res.data.data.students || [];
        setAllStudents(studentList);
        setCurrentPage(1);

        // Default all students across the entire section to PRESENT (Checked) as is standard in university attendance
        const initialMap = {};
        studentList.forEach((s) => {
          initialMap[s.id] = true;
        });
        setAttendanceMap(initialMap);
        setStep(2);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to fetch registered students.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle individual student checkbox
  const toggleAttendance = (studentId) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  // Select All (Mark All Present in entire section)
  const handleSelectAll = () => {
    const updated = {};
    allStudents.forEach((s) => {
      updated[s.id] = true;
    });
    setAttendanceMap(updated);
  };

  // Clear All (Mark All Absent in entire section)
  const handleClearAll = () => {
    const updated = {};
    allStudents.forEach((s) => {
      updated[s.id] = false;
    });
    setAttendanceMap(updated);
  };

  // Calculate live counters across ALL section students
  const totalStudentsCount = allStudents.length;
  const presentCount = allStudents.filter((s) => attendanceMap[s.id] === true).length;
  const absentCount = totalStudentsCount - presentCount;

  // Pagination calculation for UI (up to 50 students per page view)
  const totalPages = Math.ceil(allStudents.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleStudents = allStudents.slice(startIndex, startIndex + PAGE_SIZE);

  // Selected Course Object
  const currentCourse = formMeta?.courses?.find((c) => c.id === selectedCourseId);

  // Submit Attendance Handler (processes ALL students across ALL pages)
  const handleSubmitAttendance = async () => {
    setShowConfirmModal(false);
    setErrorMessage('');
    setDuplicateWarning('');
    setSubmitting(true);

    const attendanceList = allStudents.map((s) => ({
      studentId: s.id,
      status: attendanceMap[s.id] ? 'PRESENT' : 'ABSENT',
    }));

    try {
      const res = await api.post('/faculty/attendance', {
        courseId: selectedCourseId,
        section: selectedSection,
        semester: parseInt(selectedSemester, 10),
        period: parseInt(selectedPeriod, 10),
        date: selectedDate,
        attendanceList,
      });

      if (res.data?.success) {
        setSuccessMessage(
          `Attendance successfully submitted for ${currentCourse?.courseCode || 'Course'}, Section ${selectedSection}, Period ${selectedPeriod}. (Total: ${attendanceList.length}, Present: ${res.data.data.present}, Absent: ${res.data.data.absent})`
        );
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setDuplicateWarning(err.response?.data?.message || 'Attendance already submitted for this session.');
      } else {
        setErrorMessage(err.response?.data?.message || 'Failed to submit attendance.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !formMeta) {
    return <LoadingSpinner text="Loading authorized courses and departments..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
            <ClipboardCheck className="w-4 h-4" />
            <span>Attendance Registry</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Mark Official Class Attendance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record subject-wise daily period attendance with instant Present/Absent counters.
          </p>
        </div>

        {step === 2 && (
          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Change Session Details</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {duplicateWarning && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex flex-col space-y-2">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span className="font-semibold">{duplicateWarning}</span>
          </div>
          <div className="pl-6">
            <button
              onClick={() =>
                navigate(
                  `/faculty/attendance/edit?courseId=${selectedCourseId}&section=${selectedSection}&date=${selectedDate}&period=${selectedPeriod}`
                )
              }
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs inline-flex items-center space-x-1"
            >
              <span>Go to Edit Attendance (OTP Verification)</span>
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start space-x-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="font-bold text-sm">Attendance Submitted Successfully</p>
            <p className="mt-0.5">{successMessage}</p>
            <div className="mt-3 flex space-x-3">
              <button
                onClick={() =>
                  navigate(
                    `/faculty/attendance/history?section=${selectedSection}&courseId=${selectedCourseId}`
                  )
                }
                className="px-3 py-1 bg-emerald-700 text-white rounded font-semibold text-xs hover:bg-emerald-800"
              >
                View in History
              </button>
              <button
                onClick={() => {
                  setSuccessMessage('');
                  setStep(1);
                }}
                className="px-3 py-1 bg-white border border-emerald-300 text-emerald-800 rounded font-semibold text-xs hover:bg-emerald-50"
              >
                Mark Another Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: SESSION SELECTION FORM */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-3xl">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 mb-5">
            Select Class & Session Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Department
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {formMeta?.departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject / Course */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
              >
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <option key={p} value={p}>
                    Period {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => handleLoadStudents()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center space-x-2"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: UNIVERSITY STANDARD REGISTRATION-NUMBER + CHECKBOX GRID */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Active Session Summary & Live Counters Sticky Bar */}
          <div className="sticky top-0 z-20 bg-slate-900 text-white border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Session Info */}
            <div>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                Marking Attendance For
              </span>
              <h3 className="text-sm font-black">
                {currentCourse?.courseCode} ({currentCourse?.courseName}) • Section {selectedSection}
              </h3>
              <p className="text-xs text-slate-300">
                Period {selectedPeriod} • Date: {selectedDate}
              </p>
            </div>

            {/* Live Counters */}
            <div className="flex items-center space-x-3 bg-slate-800/90 px-4 py-2 rounded-lg border border-slate-700">
              <div className="text-center px-2">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Total</span>
                <span className="text-base font-extrabold text-white">{totalStudentsCount}</span>
              </div>
              <div className="h-6 w-px bg-slate-700"></div>
              <div className="text-center px-2">
                <span className="text-[10px] uppercase text-emerald-400 font-semibold block">Present</span>
                <span className="text-base font-extrabold text-emerald-400">{presentCount}</span>
              </div>
              <div className="h-6 w-px bg-slate-700"></div>
              <div className="text-center px-2">
                <span className="text-[10px] uppercase text-rose-400 font-semibold block">Absent</span>
                <span className="text-base font-extrabold text-rose-400">{absentCount}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Clear All
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(true)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-extrabold shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Attendance'}
              </button>
            </div>
          </div>

          {/* ATTENDANCE MULTI-COLUMN GRID (CONCEPTUAL UNIVERSITY ERP) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="text-xs text-slate-600">
                Displaying <strong>{visibleStudents.length}</strong> of <strong>{allStudents.length}</strong> students in Section {selectedSection} (Checked = Present, Unchecked = Absent).
              </div>
              <div className="text-xs font-mono text-slate-500">
                Page {currentPage} of {totalPages}
              </div>
            </div>

            {allStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No registered students found in Section {selectedSection}.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                {visibleStudents.map((student) => {
                  const isPresent = attendanceMap[student.id] === true;
                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleAttendance(student.id)}
                      className={`flex items-center space-x-2.5 p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                        isPresent
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400 font-medium'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isPresent}
                        onChange={() => {}} // Handled by container click
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer pointer-events-none"
                      />
                      <span className="font-mono tracking-tight truncate text-[11px]">
                        {student.registrationNumber}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination if section contains > 50 registered students */}
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Total Students: {allStudents.length} (Displaying up to 50 per page &bull; All students submitted together)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 text-blue-600 mb-3">
              <ClipboardCheck className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Confirm Attendance Submission</h3>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Submit attendance for <strong>{currentCourse?.courseCode}</strong>, Section{' '}
              <strong>{selectedSection}</strong>, Period <strong>{selectedPeriod}</strong> on{' '}
              <strong>{selectedDate}</strong>?
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-5 text-xs grid grid-cols-3 text-center">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total</span>
                <span className="font-bold text-slate-900 text-sm">{totalStudentsCount}</span>
              </div>
              <div>
                <span className="text-emerald-600 block text-[10px] uppercase font-semibold">Present</span>
                <span className="font-bold text-emerald-700 text-sm">{presentCount}</span>
              </div>
              <div>
                <span className="text-rose-600 block text-[10px] uppercase font-semibold">Absent</span>
                <span className="font-bold text-rose-700 text-sm">{absentCount}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitAttendance}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
              >
                Yes, Submit Attendance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkAttendancePage;
