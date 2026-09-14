import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Search, UserCheck, Shield, BookOpen, Filter, CheckCircle2, AlertTriangle } from 'lucide-react';

export const FacultyStudentSearchPage = () => {
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('ALL');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      let url = `/faculty/students/search?query=${encodeURIComponent(query)}`;
      if (section !== 'ALL') url += `&section=${section}`;
      const res = await api.get(url);
      if (res.data?.success) {
        setStudents(res.data.data);
        if (res.data.data.length > 0 && !selectedStudent) {
          setSelectedStudent(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [section]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
          <Search className="w-4 h-4" />
          <span>Faculty Read-Only Directory</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Student Profile Search</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Limited academic search restricted to your authorized classes and counselor cohort. Personal details are withheld under university privacy policy.
        </p>

        {/* Search Bar Form */}
        <form onSubmit={handleSearch} className="mt-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student registration number or name..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          </div>

          {/* Section Filter ONLY per requirements */}
          <div className="w-40">
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="ALL">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Results View: Left List, Right Profile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden max-h-[600px] flex flex-col">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between">
            <span>Authorized Students</span>
            <span className="font-mono text-slate-500">{students.length} found</span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {loading ? (
              <div className="p-8">
                <LoadingSpinner text="Searching directory..." />
              </div>
            ) : students.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No matching students found in authorized sections.
              </div>
            ) : (
              students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`p-3.5 cursor-pointer text-xs transition-colors ${
                    selectedStudent?.id === student.id
                      ? 'bg-blue-50/90 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">
                      {student.registrationNumber}
                    </span>
                    <span
                      className={`font-bold font-mono ${
                        student.overallAttendance >= 75 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {student.overallAttendance}%
                    </span>
                  </div>
                  <p className="text-slate-800 font-medium truncate mt-0.5">{student.name}</p>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                    <span>Sec {student.section}</span>
                    <span>•</span>
                    <span>Year {student.year}</span>
                    {student.isCounselorAssigned && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600 font-bold">Counselor</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 2-Columns: Limited Academic Student Profile Card */}
        <div className="md:col-span-2">
          {selectedStudent ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
              {/* Profile Card Header */}
              <div className="flex items-start justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-lg">
                    {selectedStudent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-slate-900">{selectedStudent.name}</h2>
                      {selectedStudent.isCounselorAssigned && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                          Counselor Cohort
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Registration: {selectedStudent.registrationNumber}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Attendance Status
                  </span>
                  <span
                    className={`text-xl font-black font-mono ${
                      selectedStudent.overallAttendance >= 75
                        ? 'text-emerald-600'
                        : selectedStudent.overallAttendance >= 65
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {selectedStudent.overallAttendance}%
                  </span>
                </div>
              </div>

              {/* Limited Academic Overview */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Academic Placement
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
                    <span className="font-bold text-slate-800">{selectedStudent.departmentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Section</span>
                    <span className="font-bold text-slate-800 font-mono">Section {selectedStudent.section}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Year</span>
                    <span className="font-bold text-slate-800">Year {selectedStudent.year} (Sem 5)</span>
                  </div>
                </div>
              </div>

              {/* Attendance Standing Details */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Compliance & Standing
                </h3>
                <div
                  className={`p-4 rounded-xl border text-xs flex items-start space-x-3 ${
                    selectedStudent.overallAttendance >= 75
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : selectedStudent.overallAttendance >= 65
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-rose-50/70 border-rose-200 text-rose-900'
                  }`}
                >
                  {selectedStudent.overallAttendance >= 75 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">
                      {selectedStudent.overallAttendance >= 75
                        ? 'Good Standing (Eligible for Examinations)'
                        : selectedStudent.overallAttendance >= 65
                        ? 'Defaulter Advisory (Under Examination Debarment Risk)'
                        : 'Severe Attendance Deficit (High Risk / Debarred)'}
                    </p>
                    <p className="mt-1 leading-relaxed text-[11px] opacity-90">
                      Overall attendance is evaluated across all official subject periods registered in the active semester curriculum.
                    </p>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>
                  University Privacy Protocol: Personal guardian mobile numbers, residential addresses, and private contact records are restricted to Administrative Exam Section deans.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs">
              Select a student from the directory search list to preview academic placement and attendance standing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyStudentSearchPage;
