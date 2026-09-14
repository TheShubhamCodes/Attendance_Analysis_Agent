import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  X,
  AlertCircle,
  Building2,
  Info,
} from 'lucide-react';

export const AdminTimetablePage = () => {
  const [section, setSection] = useState('A');
  const [semester, setSemester] = useState('5');
  const [routine, setRoutine] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [slotForm, setSlotForm] = useState({
    dayOfWeek: 'MONDAY',
    periodNumber: '1',
    subjectCode: '',
    subjectName: '',
    courseId: '',
    facultyId: '',
    startTime: '08:15',
    endTime: '09:05',
    room: 'N306',
    subjectType: 'Lecture',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [routRes, subjRes, facRes] = await Promise.all([
        api.get(`/admin/timetable?section=${section}&semester=${semester}`),
        api.get('/admin/subjects'),
        api.get('/admin/faculty'),
      ]);

      if (routRes.data?.success) setRoutine(routRes.data.data);
      if (subjRes.data?.success) setSubjects(subjRes.data.data);
      if (facRes.data?.success) setFaculty(facRes.data.data);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [section, semester]);

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const selectedSubj = subjects.find((s) => s.id === slotForm.courseId);
      const res = await api.post('/admin/timetable', {
        section,
        semester: parseInt(semester, 10),
        dayOfWeek: slotForm.dayOfWeek,
        periodNumber: parseInt(slotForm.periodNumber, 10),
        courseId: slotForm.courseId,
        facultyId: slotForm.facultyId || null,
        subjectCode: selectedSubj ? selectedSubj.courseCode : slotForm.subjectCode,
        subjectName: selectedSubj ? selectedSubj.courseName : slotForm.subjectName,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        room: slotForm.room,
        subjectType: slotForm.subjectType,
      });

      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to save timetable slot.',
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Delete this timetable slot?')) return;
    try {
      const res = await api.delete(`/admin/timetable/${id}`);
      if (res.data?.success) {
        setMessage({ text: res.data.message, isError: false });
        fetchData();
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Failed to delete slot.', isError: true });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-400" />
            Timetable Routine Management
          </h1>
          <p className="text-xs text-slate-400">
            Institutional schedule grid. Completely separate from attendance marking logic (no automated lockouts).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Schedule Slot</span>
          </button>
        </div>
      </div>

      {/* Critical Architecture Notice */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-start space-x-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block">Decoupled Architectural Boundary:</span>
          This timetable feature is strictly for viewing and configuring class routine schedules. Attendance marking remains 100% manual and unconstrained by the current period or clock.
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

      {/* Section & Semester Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-400">Section:</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
          >
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-400">Semester:</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
          >
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
            <option value="5">Semester 5</option>
            <option value="6">Semester 6</option>
            <option value="7">Semester 7</option>
            <option value="8">Semester 8</option>
          </select>
        </div>
      </div>

      {/* Routine Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        <div className="min-w-[760px] space-y-4">
          {days.map((day) => {
            const daySlots = routine.filter((r) => r.dayOfWeek === day);
            return (
              <div key={day} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
                    {day}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {daySlots.length} scheduled periods
                  </span>
                </div>

                {daySlots.length === 0 ? (
                  <p className="text-xs text-slate-600 italic py-2">No classes scheduled.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-xs">
                    {periods.map((pNum) => {
                      const slot = daySlots.find((s) => s.periodNumber === pNum);
                      if (!slot) {
                        return (
                          <div
                            key={pNum}
                            className="p-2 rounded-lg border border-dashed border-slate-800/80 text-center text-slate-600 text-[10px]"
                          >
                            P{pNum} Free
                          </div>
                        );
                      }
                      return (
                        <div
                          key={slot.id}
                          className="p-2 rounded-lg bg-slate-900 border border-purple-900/40 hover:border-purple-600 transition-colors flex flex-col justify-between group relative"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-purple-300 text-[10px]">
                                P{slot.periodNumber}
                              </span>
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="text-slate-600 hover:text-rose-400 p-0.5"
                                title="Remove Slot"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="font-bold text-white text-[11px] truncate mt-0.5">
                              {slot.subjectCode}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">{slot.room || 'Room TBA'}</p>
                          </div>
                          <p className="text-[9px] text-slate-500 truncate mt-1">
                            {slot.faculty?.name?.split(' ')?.[0] || 'Faculty'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE SLOT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Add Routine Slot (Sec {section})
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Day of Week</label>
                  <select
                    value={slotForm.dayOfWeek}
                    onChange={(e) => setSlotForm({ ...slotForm, dayOfWeek: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Period Number</label>
                  <select
                    value={slotForm.periodNumber}
                    onChange={(e) => setSlotForm({ ...slotForm, periodNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold"
                  >
                    {periods.map((p) => (
                      <option key={p} value={p}>
                        Period {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Course / Subject</label>
                <select
                  required
                  value={slotForm.courseId}
                  onChange={(e) => setSlotForm({ ...slotForm, courseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.courseCode} - {s.courseName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Assigned Faculty (Optional)</label>
                <select
                  value={slotForm.facultyId}
                  onChange={(e) => setSlotForm({ ...slotForm, facultyId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value="">-- None / Select Faculty --</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Room / Lab</label>
                  <input
                    type="text"
                    value={slotForm.room}
                    onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })}
                    placeholder="e.g. N306"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Type</label>
                  <select
                    value={slotForm.subjectType}
                    onChange={(e) => setSlotForm({ ...slotForm, subjectType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Practical">Practical</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Activity">Activity</option>
                  </select>
                </div>
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
                  disabled={submitting || !slotForm.courseId}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTimetablePage;
