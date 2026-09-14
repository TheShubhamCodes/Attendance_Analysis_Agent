import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Coffee,
  Utensils,
  Sparkles,
  Info,
  Layers,
  Printer,
  FileText,
  CheckCircle2,
  Lock,
  Users,
} from 'lucide-react';

export const TimetablePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [activeSection, setActiveSection] = useState('A');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [showOfficialSheet, setShowOfficialSheet] = useState(false);

  useEffect(() => {
    fetchTimetable();
  }, [activeSection, selectedWardId]);

  const fetchTimetable = async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/timetable/my-routine';
      const params = [];
      if (activeSection) params.push(`section=${activeSection}`);
      if (selectedWardId) params.push(`studentId=${selectedWardId}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setData(res.data.data);
        if (res.data.data.activeSection) {
          setActiveSection(res.data.data.activeSection);
        }
        if (res.data.data.activeWard && !selectedWardId) {
          setSelectedWardId(res.data.data.activeWard.id);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load timetable schedule.');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionSwitch = async (sec) => {
    if (sec === activeSection) return;
    setActiveSection(sec);
  };

  const handleWardSwitch = (wardId) => {
    setSelectedWardId(wardId);
    const foundWard = data?.wards?.find((w) => w.id === wardId);
    if (foundWard?.section) {
      setActiveSection(foundWard.section.trim().toUpperCase());
    }
  };

  const getSlotTypeBadge = (type) => {
    switch (type) {
      case 'Practical':
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Tutorial':
      case 'Numerical':
        return 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Activity':
        return 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Free':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      default:
        return 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  if (loading && !data) {
    return <LoadingSpinner text="Loading official weekly academic routine..." />;
  }

  if (error && !data) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-rose-700 dark:text-rose-300 text-xs">
        <p className="font-bold">Unable to display timetable</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  const routine = data?.routine || {};
  const periods = data?.periods || [];
  const days = data?.days || [];
  const catalog = data?.subjectCatalog || {};
  const canSwitchSection = Boolean(data?.canSwitchSection);
  const authorizedSections = data?.authorizedSections || ['A'];
  const wards = data?.wards || [];
  const isStudent = data?.role === 'STUDENT';
  const isParent = data?.role === 'PARENT';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Academic Schedule • Department of Computer Science</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-3">
            <span>Weekly College Time Table</span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              Section {activeSection}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official class routine for Semester 5 (Academic Year 2026–2027). View-only schedule.
          </p>
        </div>

        {/* View Controls & Print */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
          <button
            type="button"
            onClick={() => setShowOfficialSheet(!showOfficialSheet)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>{showOfficialSheet ? 'Show Interactive Table' : 'Official Routine View'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
            title="Print Routine"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Role-Based Section / Ward Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Section Selection (HOD / Multi-Section Faculty) */}
        {canSwitchSection ? (
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Section:
            </span>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              {['A', 'B'].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleSectionSwitch(sec)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeSection === sec
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Section {sec} Routine
                </button>
              ))}
            </div>
          </div>
        ) : isStudent ? (
          /* Student: strictly locked to own section with lock icon */
          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <Lock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Assigned Section: <strong>Section {activeSection}</strong></span>
            </span>
            <span className="text-[11px] text-slate-400">
              (Students view their registered section routine only)
            </span>
          </div>
        ) : isParent ? (
          /* Parent: multiple ward selector or single ward indicator */
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Linked Student:</span>
            </span>
            {wards.length > 1 ? (
              <select
                value={selectedWardId}
                onChange={(e) => handleWardSwitch(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.registrationNumber}) — Section {w.section}
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold text-xs">
                {data?.activeWard?.name || 'Child'} (Section {activeSection})
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Section {activeSection} Routine
          </div>
        )}

        {/* Right Info Pill */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Monday to Saturday • 8:15 AM to 4:00 PM</span>
        </div>
      </div>

      {/* Main Interactive Timetable Grid */}
      {!showOfficialSheet ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Mobile scroll hint */}
          <div className="sm:hidden px-4 py-2 bg-brand-50 dark:bg-brand-950/40 border-b border-brand-100 dark:border-brand-900/60 text-[11px] text-brand-700 dark:text-brand-300 flex items-center justify-between">
            <span>← Scroll horizontally to view all periods →</span>
            <Clock className="w-3.5 h-3.5 text-brand-600" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[1150px]">
              {/* Period Headers */}
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <th className="p-3.5 w-28 text-center sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700">
                    Day / Period
                  </th>
                  {periods.map((p, idx) => {
                    if (p.isBreak) {
                      return (
                        <th
                          key={idx}
                          className="p-2.5 w-20 text-center bg-amber-50/70 dark:bg-amber-950/30 border-r border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400 font-extrabold"
                        >
                          <div className="flex flex-col items-center justify-center">
                            {p.periodId === 'BREAK1' ? (
                              <Coffee className="w-3.5 h-3.5 mb-0.5 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <Utensils className="w-3.5 h-3.5 mb-0.5 text-amber-600 dark:text-amber-400" />
                            )}
                            <span>{p.periodId === 'BREAK1' ? 'BREAK' : 'LUNCH'}</span>
                            <span className="text-[9px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                              {p.timeSlot}
                            </span>
                          </div>
                        </th>
                      );
                    }
                    return (
                      <th
                        key={idx}
                        className="p-3 text-center border-r border-slate-200 dark:border-slate-700 min-w-[100px]"
                      >
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          P{p.periodNumber}
                        </div>
                        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {p.timeSlot}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Day Rows */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {days.map((day) => {
                  const daySlots = routine[day] || [];
                  return (
                    <tr
                      key={day}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Day Label */}
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 text-center sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-10">
                        {day}
                      </td>

                      {/* Day Slots */}
                      {daySlots.map((slot, sIdx) => {
                        // Morning or Lunch Break
                        if (slot.isBreak) {
                          return (
                            <td
                              key={sIdx}
                              className="p-2 text-center bg-amber-50/40 dark:bg-amber-950/20 border-r border-slate-200/80 dark:border-slate-800"
                            >
                              <div className="flex flex-col items-center justify-center text-[10px] text-amber-700/80 dark:text-amber-400/80 font-bold uppercase tracking-wider">
                                <span>{slot.name === 'Morning Break' ? 'TEA' : 'LUNCH'}</span>
                              </div>
                            </td>
                          );
                        }

                        // Project / Experiential Learning (Period 8)
                        if (slot.code === 'PROJECT') {
                          return (
                            <td
                              key={sIdx}
                              className="p-2.5 border-r border-slate-200/80 dark:border-slate-800 bg-purple-50/30 dark:bg-purple-950/15"
                            >
                              <div className="p-2 rounded-xl bg-purple-100/70 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 text-center h-full flex flex-col justify-center">
                                <div className="flex items-center justify-center space-x-1 text-[10px] font-extrabold text-purple-700 dark:text-purple-300 uppercase leading-tight">
                                  <Sparkles className="w-3 h-3 flex-shrink-0" />
                                  <span>PROJECT / SELF LEARNING</span>
                                </div>
                                <span className="text-[9px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                                  Experiential Learning
                                </span>
                              </div>
                            </td>
                          );
                        }

                        // No Regular Class (e.g. Saturday afternoon Section B)
                        if (slot.code === 'NO REGULAR CLASS') {
                          return (
                            <td
                              key={sIdx}
                              className="p-2.5 border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30"
                            >
                              <div className="p-2 rounded-xl text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                No Regular Class
                              </div>
                            </td>
                          );
                        }

                        // Standard Subject Slot
                        return (
                          <td
                            key={sIdx}
                            className="p-2.5 border-r border-slate-200/80 dark:border-slate-800"
                          >
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-brand-400 dark:hover:border-brand-600 transition-all flex flex-col justify-between space-y-1.5 h-full">
                              {/* Subject Code & Type */}
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-black text-sm text-slate-900 dark:text-slate-100 tracking-tight">
                                  {slot.code}
                                </span>
                                {slot.type && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getSlotTypeBadge(
                                      slot.type
                                    )}`}
                                  >
                                    {slot.type.slice(0, 1)}
                                  </span>
                                )}
                              </div>

                              {/* Subject Full Name Subtitle */}
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[110px]">
                                {slot.name}
                              </p>

                              {/* Room Tag */}
                              {slot.room ? (
                                <div className="inline-flex items-center space-x-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                  <MapPin className="w-2.5 h-2.5 text-brand-500" />
                                  <span>{slot.room}</span>
                                </div>
                              ) : (
                                <div className="h-3.5"></div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Official Routine Sheet View (Recreating the Official Physical Sheet Layout) */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Department of Computer Science & Engineering
            </h2>
            <p className="text-sm font-bold text-brand-600 dark:text-brand-400 mt-0.5">
              Official Class Routine — 5th Semester (Section {activeSection})
            </p>
            <p className="text-xs text-slate-400">Academic Year: 2026–2027 • Effective Routine</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse border border-slate-300 dark:border-slate-700 min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                  <th className="border border-slate-300 dark:border-slate-700 p-2.5">DAY</th>
                  <th className="border border-slate-300 dark:border-slate-700 p-2.5">8:15–9:05</th>
                  <th className="border border-slate-300 dark:border-slate-700 p-2.5">9:05–9:55</th>
                  <th className="border border-slate-300 dark:border-slate-700 p-2.5">9:55–10:45</th>
                  <th className="border border-slate-300 dark:border-slate-700 p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-extrabold">
                    10:45–11:00
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 p-2.5">11:00–11:50</th>
                  <th className="border border-slate-300 dark:border-slate-700 p-2.5">11:50–12:40</th>
                  <th className="border border-slate-300 dark:border-slate-700 p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-extrabold">
                    12:40–1:30
                  </th>
                  <th className="border border-slate-300 dark:border-slate-700 p-2.5">1:30–2:20</th>
                  <th className="border border-slate-300 dark:border-slate-700 p-2.5">2:20–3:10</th>
                  <th className="border border-slate-300 dark:border-slate-700 p-2.5">3:10–4:00</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => {
                  const slots = routine[day] || [];
                  return (
                    <tr key={day} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="border border-slate-300 dark:border-slate-700 p-2.5 font-bold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {day}
                      </td>
                      {slots.map((s, idx) => (
                        <td
                          key={idx}
                          className={`border border-slate-300 dark:border-slate-700 p-2 font-medium ${
                            s.isBreak ? 'bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 font-bold' : ''
                          }`}
                        >
                          {s.isBreak ? (
                            'BREAK'
                          ) : s.code === 'PROJECT' ? (
                            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                              PROJECT
                            </span>
                          ) : (
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {s.code}
                              </span>{' '}
                              {s.type === 'Tutorial' && '(T)'}
                              {s.type === 'Lecture' && '(L)'}
                              {s.type === 'Practical' && '(P)'}
                              {s.type === 'Numerical' && '(N)'}
                              {s.room && (
                                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                  {s.room}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subject Abbreviations & Full Names Legend */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <BookOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Course Abbreviations & Subject Catalog
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(catalog).map(([code, item]) => (
            <div
              key={code}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs flex items-start space-x-2.5"
            >
              <div className="w-10 h-8 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-300 font-black text-xs flex items-center justify-center flex-shrink-0">
                {code}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                <p className="text-[10px] text-slate-400">{item.defaultType} Course</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimetablePage;
