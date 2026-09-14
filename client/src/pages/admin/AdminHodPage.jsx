import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  UserCheck,
  Building2,
  Shield,
  ArrowRightLeft,
  History,
  AlertTriangle,
  CheckCircle2,
  UserX,
  Clock,
  X,
  RefreshCw,
} from 'lucide-react';

export const AdminHodPage = () => {
  const [departmentsData, setDepartmentsData] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'history'

  // Change HOD Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [reason, setReason] = useState('Administrative rotation');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hodRes, histRes] = await Promise.all([
        api.get('/admin/hod'),
        api.get('/admin/hod/history'),
      ]);
      if (hodRes.data?.success) setDepartmentsData(hodRes.data.data);
      if (histRes.data?.success) setHistory(histRes.data.data);
    } catch (err) {
      console.error('Failed to load HOD management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openChangeModal = (dept) => {
    setSelectedDept(dept);
    setSelectedFacultyId('');
    setReason('Administrative rotation');
    setShowModal(true);
  };

  const handleAssignHod = async (e) => {
    e.preventDefault();
    if (!selectedDept || !selectedFacultyId) return;

    setSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const res = await api.post('/admin/hod/assign', {
        departmentId: selectedDept.departmentId,
        facultyId: selectedFacultyId,
        reason,
      });

      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to reassign HOD.',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveHod = async (dept) => {
    if (!dept.currentHod) return;
    if (!window.confirm(`Are you sure you want to remove ${dept.currentHod.name} as HOD? Role will be adjusted to Faculty and historical records will be preserved.`)) {
      return;
    }

    try {
      const res = await api.post('/admin/hod/remove', {
        departmentId: dept.departmentId,
        facultyId: dept.currentHod.id,
        reason: 'Relieved by central administration',
      });
      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        fetchData();
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Failed to remove HOD.', isError: true });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-purple-400" />
            Head of Department (HOD) Management
          </h1>
          <p className="text-xs text-slate-400">
            View active HOD appointments, assign faculty leaders, and review complete transition audit logs.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'current'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active HODs
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Appointment History
          </button>
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

      {/* TAB 1: CURRENT HOD ROSTER */}
      {activeTab === 'current' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departmentsData.map((dept) => {
            const hasHod = Boolean(dept.currentHod);
            return (
              <div
                key={dept.departmentId}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">{dept.departmentName}</h2>
                        <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">
                          CODE: {dept.departmentCode}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        hasHod
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {hasHod ? 'HOD Assigned' : 'HOD Vacant'}
                    </span>
                  </div>

                  {/* Current HOD details card */}
                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Current Department Head
                    </span>
                    {hasHod ? (
                      <div>
                        <p className="text-sm font-black text-white">{dept.currentHod.name}</p>
                        <p className="text-xs text-indigo-300 font-medium">{dept.currentHod.designation}</p>
                        <div className="pt-2 text-[11px] text-slate-400 font-mono space-y-0.5">
                          <p>Employee ID: {dept.currentHod.employeeId}</p>
                          <p>Email: {dept.currentHod.email}</p>
                          {dept.currentHod.mobileNumber && <p>Contact: {dept.currentHod.mobileNumber}</p>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-400/80 italic py-2">
                        No HOD currently assigned to this department.
                      </p>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">{dept.availableFaculty.length}</span> eligible faculty members in this department
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-5 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openChangeModal(dept)}
                    className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-purple-600/20"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{hasHod ? 'Change HOD' : 'Assign HOD'}</span>
                  </button>

                  {hasHod && (
                    <button
                      onClick={() => handleRemoveHod(dept)}
                      title="Relieve HOD to Faculty"
                      className="p-2 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 rounded-xl transition-colors border border-slate-700"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: HOD APPOINTMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Historical HOD Appointment Ledger</h2>
          </div>
          <p className="text-xs text-slate-400">
            Audit-backed timeline of HOD appointments. Note: When an HOD is rotated, all previous historical attendance, approvals, and report records are permanently preserved.
          </p>

          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No HOD rotation history recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {history.map((record) => (
                <div key={record.id} className="py-3.5 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">{record.faculty.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-purple-300">
                        {record.faculty.employeeId}
                      </span>
                      <span className="text-xs text-indigo-400 font-semibold">
                        • {record.department.name} ({record.department.code})
                      </span>
                    </div>
                    {record.notes && (
                      <p className="text-[11px] text-slate-400 italic">Reason: {record.notes}</p>
                    )}
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Appointed: {new Date(record.startDate).toLocaleDateString()}
                      {record.endDate && ` • Relieved: ${new Date(record.endDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      record.status === 'ACTIVE'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHANGE HOD MODAL */}
      {showModal && selectedDept && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                Assign HOD for {selectedDept.departmentCode}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDept.currentHod && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current HOD:</span>
                <span className="font-bold text-white">{selectedDept.currentHod.name}</span> will be rotated back to Senior Faculty. All historical records, attendance submissions, and audit trails will remain 100% intact.
              </div>
            )}

            <form onSubmit={handleAssignHod} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select New HOD from Faculty</label>
                <select
                  required
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value="">-- Choose Faculty Member --</option>
                  {selectedDept.availableFaculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.employeeId} - {f.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Reason / Order Reference</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Annual academic rotation order #2026-44"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedFacultyId}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? 'Appointing...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHodPage;
