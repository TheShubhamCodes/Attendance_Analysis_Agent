import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Trash2,
  RotateCcw,
  AlertOctagon,
  Eye,
  Search,
  Users,
  GraduationCap,
  Calendar,
  UserCheck,
  Building2,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export const DeletedRecordsPage = () => {
  const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' | 'students'
  const [facultyRecords, setFacultyRecords] = useState([]);
  const [studentRecords, setStudentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [viewItem, setViewItem] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const [restoreTarget, setRestoreTarget] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [permanentTarget, setPermanentTarget] = useState(null);
  const [showPermanentModal, setShowPermanentModal] = useState(false);
  const [permanentConfirmText, setPermanentConfirmText] = useState('');
  const [purging, setPurging] = useState(false);

  const fetchDeletedRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/hod/deleted-records');
      if (res.data?.success) {
        setFacultyRecords(res.data.data.faculty || []);
        setStudentRecords(res.data.data.students || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deleted records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedRecords();
  }, []);

  // Filter lists by search query
  const filteredFaculty = facultyRecords.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      f.name?.toLowerCase().includes(q) ||
      f.employeeId?.toLowerCase().includes(q) ||
      f.email?.toLowerCase().includes(q) ||
      f.designation?.toLowerCase().includes(q)
    );
  });

  const filteredStudents = studentRecords.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name?.toLowerCase().includes(q) ||
      s.registrationNumber?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.section?.toLowerCase().includes(q)
    );
  });

  // RESTORE HANDLERS
  const handleOpenRestore = (item, type) => {
    setRestoreTarget({ ...item, type });
    setError('');
    setShowRestoreModal(true);
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    setError('');
    try {
      const res = await api.post('/hod/deleted-records/restore', {
        type: restoreTarget.type === 'faculty' ? 'FACULTY' : 'STUDENT',
        id: restoreTarget.id,
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'Record successfully restored.');
        setShowRestoreModal(false);
        setRestoreTarget(null);
        fetchDeletedRecords();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not restore record.');
    } finally {
      setRestoring(false);
    }
  };

  // PERMANENT DELETE HANDLERS
  const handleOpenPermanent = (item, type) => {
    setPermanentTarget({ ...item, type });
    setPermanentConfirmText('');
    setError('');
    setShowPermanentModal(true);
  };

  const handleConfirmPermanent = async () => {
    if (!permanentTarget) return;
    if (permanentConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm permanent purge.');
      return;
    }

    setPurging(true);
    setError('');
    try {
      const res = await api.delete('/hod/deleted-records/permanent', {
        data: {
          type: permanentTarget.type === 'faculty' ? 'FACULTY' : 'STUDENT',
          id: permanentTarget.id,
        },
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'Record permanently deleted.');
        setShowPermanentModal(false);
        setPermanentTarget(null);
        fetchDeletedRecords();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not permanently delete record.');
    } finally {
      setPurging(false);
    }
  };

  // VIEW DETAILS HANDLER
  const handleOpenView = (item, type) => {
    setViewItem({ ...item, type });
    setShowViewModal(true);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Trash2 className="w-5 h-5 text-rose-600" />
            <span>Deleted Records & Trash Archive</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of soft-deleted faculty and student records. Records here are excluded from normal management, logins, and attendance rosters while historical data is fully preserved.
          </p>
        </div>

        <button
          onClick={fetchDeletedRecords}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Archive</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="p-0.5 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1 font-medium">{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="p-0.5 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setActiveTab('faculty');
              setError('');
            }}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'faculty'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Deleted Faculty ({facultyRecords.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('students');
              setError('');
            }}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Deleted Students ({studentRecords.length})</span>
          </button>
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={`Search deleted ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* TAB 1: DELETED FACULTY TABLE */}
      {activeTab === 'faculty' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3">Faculty Name & Email</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Deleted By</th>
                  <th className="px-4 py-3">Deleted Date</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFaculty.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{f.employeeId}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{f.name}</div>
                      <div className="text-[11px] text-slate-400">{f.email}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{f.designation}</td>
                    <td className="px-4 py-3 font-medium text-slate-600">{f.department}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium text-[11px]">
                      {f.deletedBy || 'HOD'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {formatDate(f.deletedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px] max-w-xs truncate">
                      <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
                        {f.deletionReason || 'Removed by HOD'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenView(f, 'faculty')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRestore(f, 'faculty')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-semibold cursor-pointer inline-flex items-center space-x-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPermanent(f, 'faculty')}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-xs font-semibold cursor-pointer"
                          title="Permanently remove"
                        >
                          Purge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredFaculty.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      <Trash2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <div className="font-semibold text-slate-600">No deleted faculty found</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Trash archive is clear. Active faculty are safely managed in Faculty Directory.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DELETED STUDENTS TABLE */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Registration No</th>
                  <th className="px-4 py-3">Student Name & Email</th>
                  <th className="px-4 py-3 text-center">Sem / Sec</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Deleted By</th>
                  <th className="px-4 py-3">Deleted Date</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{s.registrationNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-400">{s.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                        Sem {s.semester} • Sec {s.section}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-600">{s.department}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium text-[11px]">
                      {s.deletedBy || 'HOD'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {formatDate(s.deletedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px] max-w-xs truncate">
                      <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
                        {s.deletionReason || 'Removed by HOD'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenView(s, 'student')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRestore(s, 'student')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-semibold cursor-pointer inline-flex items-center space-x-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPermanent(s, 'student')}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-xs font-semibold cursor-pointer"
                          title="Permanently remove"
                        >
                          Purge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      <Trash2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <div className="font-semibold text-slate-600">No deleted students found</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Trash archive is clear. Active students are safely enrolled in Student Management.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: VIEW DELETED RECORD AUDIT PROFILE                */}
      {/* ========================================================= */}
      {showViewModal && viewItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Deleted {viewItem.type === 'faculty' ? 'Faculty' : 'Student'} Archive Details
                  </h2>
                  <p className="text-[11px] text-slate-500">Soft-deleted record audit metadata</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewItem(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{viewItem.name}</h3>
                <p className="text-xs text-indigo-600 font-medium">
                  {viewItem.type === 'faculty' ? viewItem.designation : `Student - Sem ${viewItem.semester} Sec ${viewItem.section}`}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  ID: {viewItem.type === 'faculty' ? viewItem.employeeId : viewItem.registrationNumber}
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                DELETED
              </span>
            </div>

            {/* Deletion Audit Card */}
            <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-900 uppercase">Deleted At:</span>
                <span className="font-mono text-slate-800">{formatDate(viewItem.deletedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-900 uppercase">Deleted By:</span>
                <span className="font-medium text-slate-800">{viewItem.deletedBy || 'HOD'}</span>
              </div>
              <div className="border-t border-rose-200/60 pt-2">
                <span className="text-[10px] font-bold text-rose-900 uppercase block mb-0.5">Reason:</span>
                <p className="text-slate-700 italic bg-white/70 p-2 rounded border border-rose-100">
                  {viewItem.deletionReason || 'No specific reason recorded.'}
                </p>
              </div>
            </div>

            {/* Historical Safety Guarantee */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-800">
              ✓ Historical attendance records, academic sessions, and audit entries associated with this account remain safely preserved in PostgreSQL.
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  handleOpenRestore(viewItem, viewItem.type);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Record</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewItem(null);
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RESTORE CONFIRMATION DIALOG                       */}
      {/* ========================================================= */}
      {showRestoreModal && restoreTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Restore {restoreTarget.type === 'faculty' ? 'Faculty Member' : 'Student'}?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are restoring <strong>{restoreTarget.name}</strong> (
                  <span className="font-mono font-bold">
                    {restoreTarget.type === 'faculty'
                      ? restoreTarget.employeeId
                      : restoreTarget.registrationNumber}
                  </span>
                  ) back to Active status.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-800">What will happen:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Account will be returned to Active status immediately.</li>
                <li>Will reappear in normal directory, rosters, and dashboard counts.</li>
                <li>Login access to the portal will be re-enabled.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreTarget(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {restoring ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: PERMANENT PURGE CONFIRMATION (STRONG WARNING)   */}
      {/* ========================================================= */}
      {showPermanentModal && permanentTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">
                  Permanently Purge Record?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Target: <strong>{permanentTarget.name}</strong> (
                  <span className="font-mono">
                    {permanentTarget.type === 'faculty'
                      ? permanentTarget.employeeId
                      : permanentTarget.registrationNumber}
                  </span>
                  ).
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-800">
              <p className="font-bold flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>IRREVERSIBLE ACTION</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Permanently deleting this record will purge the account from PostgreSQL. If the record has foreign key references (e.g. historical attendance), you will be prevented from corrupting audit integrity.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                placeholder="Type DELETE"
                value={permanentConfirmText}
                onChange={(e) => setPermanentConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPermanentModal(false);
                  setPermanentTarget(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmPermanent}
                disabled={purging || permanentConfirmText !== 'DELETE'}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {purging ? 'Purging...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedRecordsPage;
